
(() => {
  if (window.__personalAutofillLoaded) return;
  window.__personalAutofillLoaded = true;

  // Identify a field using its name, ID, placeholder, autocomplete and label.
  function getLabel(field) {
    const label = field.labels ? [...field.labels].map(item => item.textContent).join(" ") : "";
    return `${field.name} ${field.id} ${field.placeholder} ${field.getAttribute("aria-label")} ${field.getAttribute("autocomplete")} ${field.getAttribute("title")} ${label}`.toLowerCase();
  }

  // Skip hidden, disabled and read-only fields.
  function isVisible(field) {
    return field.getClientRects().length > 0 && !field.disabled && !field.readOnly && field.type !== "hidden";
  }

  // Detect personal-detail fields and show the floating panel.
  function detectForm() {
    if (document.getElementById("personal-autofill-panel") || window.__autofillPanelDismissed) return;

    const fields = [...document.querySelectorAll("input, textarea, select")].filter(isVisible);
    const found = fields.some(field => /name|address|birth|dob|phone|mobile|contact/.test(getLabel(field)) && !getLabel(field).includes("company"));

    if (found) showPanel();
  }

  // Create the floating panel.
  function showPanel() {
    const panel = document.createElement("div");
    panel.id = "personal-autofill-panel";
    panel.style.cssText = "position:fixed;right:20px;bottom:20px;z-index:999999;background:white;color:black;padding:15px;border:1px solid #ccc;border-radius:8px;width:270px;box-shadow:0 2px 10px #aaa;font:14px Arial";

    panel.innerHTML = `<b>Personal Details Autofill</b>
      <button id="close" style="float:right">×</button>
      <p id="status">Loading profiles...</p>
      <select id="profile" style="width:100%"><option value="">Select a profile</option></select>
      <div id="details"></div>
      <br><button id="refresh">Refresh Data</button>
      <button id="fill" disabled>Autofill</button>
      <p id="result"></p>`;

    document.body.appendChild(panel);

    const select = panel.querySelector("#profile");
    const status = panel.querySelector("#status");
    const details = panel.querySelector("#details");
    const fillButton = panel.querySelector("#fill");
    const refreshButton = panel.querySelector("#refresh");
    const result = panel.querySelector("#result");
    let profiles = [];

    panel.querySelector("#close").onclick = () => {
      window.__autofillPanelDismissed = true;
      panel.remove();
    };

    function showDetails() {
      const person = profiles[Number(select.value)];
      details.textContent = "";

      if (!person || select.value === "") {
        fillButton.disabled = true;
        return;
      }

      [["First Name", person.firstName], ["Last Name", person.lastName], ["Address", person.address], ["Date of Birth", person.dob], ["Contact Number", person.phone]].forEach(([label, value]) => {
        const line = document.createElement("p");
        line.textContent = `${label}: ${value || "-"}`;
        details.appendChild(line);
      });

      fillButton.disabled = false;
    }

    // Request profiles from background.js.
    function loadProfiles(refresh = false) {
      status.textContent = "Loading profiles...";
      result.textContent = "";
      refreshButton.disabled = true;
      fillButton.disabled = true;

      chrome.runtime.sendMessage({ action: "GET_PROFILES", refresh }, response => {
        refreshButton.disabled = false;

        if (chrome.runtime.lastError || !response?.success) {
          status.textContent = response?.error || "Could not load profiles.";
          return;
        }

        profiles = response.profiles || [];
        select.innerHTML = '<option value="">Select a profile</option>';

        profiles.forEach((person, index) => {
          select.add(new Option(`${person.firstName} ${person.lastName}`.trim(), index));
        });

        status.textContent = profiles.length ? `${profiles.length} profiles loaded.` : "No profiles found in the Sheet.";
        showDetails();
      });
    }

    select.onchange = showDetails;
    refreshButton.onclick = () => loadProfiles(true);

    fillButton.onclick = () => {
      const person = profiles[Number(select.value)];
      if (!person || select.value === "") return;

      const outcome = autofill(person);
      result.textContent = `${outcome.filled} fields filled; ${outcome.skipped} skipped.`;
    };

    loadProfiles();
  }

  // Convert common Sheet date formats into YYYY-MM-DD.
  function formatDate(value) {
    if (!value) return "";

    const input = String(value).trim();
    let year, month, day;
    let match;

    if ((match = input.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) {
      [, year, month, day] = match;
    } else if ((match = input.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/))) {
      [, day, month, year] = match;
    } else {
      return "";
    }

    year = Number(year);
    month = Number(month);
    day = Number(day);

    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return "";

    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  // Fill matching fields without overwriting existing values.
  function autofill(person) {
    const fields = [...document.querySelectorAll("input, textarea, select")].filter(isVisible);
    const used = new Set();
    let filled = 0, skipped = 0;

    function fillField(keywords, value, convert = false) {
      const field = fields.find(field => {
        const label = getLabel(field);
        return !used.has(field) && !label.includes("company") && keywords.some(word => label.includes(word));
      });

      if (!field || !value || field.value.trim() !== "") {
        skipped++;
        return;
      }

      let finalValue = value;

      if (convert && field.type === "date") {
        finalValue = formatDate(value);
        if (!finalValue) {
          skipped++;
          return;
        }
      }

      if (field.type === "date" && !convert) {
        finalValue = formatDate(value);
        if (!finalValue) {
          skipped++;
          return;
        }
      }

      if (field.tagName === "SELECT" && ![...field.options].some(option => option.value === String(finalValue))) {
        skipped++;
        return;
      }

      const prototype = field.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : field.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

      if (setter) setter.call(field, finalValue);
      else field.value = finalValue;

      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.dispatchEvent(new Event("change", { bubbles: true }));
      used.add(field);
      filled++;
    }

    // First and last names.
    fillField(["first name", "firstname", "given-name", "givenname"], person.firstName);
    fillField(["last name", "lastname", "surname", "family-name", "familyname"], person.lastName);
    fillField(["full name", "fullname"], `${person.firstName} ${person.lastName}`);

    // Address: split into lines only when the form provides separate address fields.
    const addressParts = (person.address || "").split(",");
    const address1 = addressParts[0]?.trim() || "";
    const address2 = addressParts.slice(1).join(",").trim();
    const hasAddress1 = fields.some(field => /address.?line.?1|addressline1|address1/.test(getLabel(field)));

    if (hasAddress1) {
      fillField(["address line 1", "addressline1", "address1"], address1);
      if (address2) fillField(["address line 2", "addressline2", "address2"], address2);
    } else {
      fillField(["street-address", "street address", "address"], person.address);
    }

    // Date of birth: convert the Sheet value when filling date inputs.
    fillField(["date of birth", "birth date", "birthdate", "dob"], person.dob, true);

    // Contact number.
    fillField(["phone", "mobile", "contact", "tel"], person.phone);

    return { filled, skipped };
  }

  // Support autofill from the extension toolbar popup.
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "AUTOFILL_PROFILE") {
      sendResponse({ success: true, ...autofill(message.person) });
    }
  });

  // Detect forms added dynamically to the page.
  new MutationObserver(detectForm).observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  detectForm();
})();
