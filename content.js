
(() => {
  // Prevent duplicate listeners if the script is loaded again.
  if (window.__personalAutofillLoaded) return;
  window.__personalAutofillLoaded = true;

  console.log("Personal Details Autofill loaded:", location.href);

  function getFieldLabel(field) {
    const labels = Array.from(field.labels || []).map(label => label.innerText).join(" ");
    return [field.name, field.id, field.placeholder, field.autocomplete, field.getAttribute("aria-label"), field.title, labels].filter(Boolean).join(" ").toLowerCase();
  }

  function isVisible(field) {
    return field.getClientRects().length > 0 && !field.disabled && !field.readOnly && field.type !== "hidden";
  }

  // Detect relevant form fields and show the floating panel.
  function detectForm() {
    if (document.getElementById("personal-autofill-panel") || window.__autofillPanelDismissed) return;

    const fields = [...document.querySelectorAll("input, textarea, select")].filter(isVisible);
    const keywords = ["name", "address", "birth", "dob", "phone", "mobile", "contact", "location"];
    const found = fields.some(field => {
      const label = getFieldLabel(field);
      return !label.includes("company") && keywords.some(word => label.includes(word));
    });

    if (found) showAutofillPanel();
  }

  // Build the floating panel inside the webpage.
  function showAutofillPanel() {
    const panel = document.createElement("div");
    panel.id = "personal-autofill-panel";

    Object.assign(panel.style, {
      position: "fixed", right: "20px", bottom: "20px", zIndex: "2147483647",
      background: "#fff", color: "#222", padding: "16px", width: "250px",
      border: "1px solid #ccc", borderRadius: "8px",
      boxShadow: "0 2px 12px #999", font: "14px Arial"
    });

    panel.innerHTML = `<b>Personal Details Autofill</b>
      <button id="autofill-close" style="float:right">×</button>
      <br><br><select id="autofill-profile" style="width:100%">
      <option value="">Select a profile</option></select>
      <br><br><button id="autofill-fill" disabled>Autofill</button>
      <p id="autofill-status"></p>`;

    document.body.appendChild(panel);

    const select = panel.querySelector("#autofill-profile");
    const button = panel.querySelector("#autofill-fill");
    const status = panel.querySelector("#autofill-status");

    panel.querySelector("#autofill-close").onclick = () => {
      window.__autofillPanelDismissed = true;
      panel.remove();
    };

    // Request profile data from background.js.
    chrome.runtime.sendMessage({ action: "GET_PROFILES" }, response => {
      if (chrome.runtime.lastError || !response?.success) {
        status.textContent = response?.error || "Could not load profiles.";
        return;
      }

      response.profiles.forEach((person, index) => {
        const option = document.createElement("option");
        option.value = index;
        option.textContent = `${person.firstName} ${person.lastName}`.trim();
        select.appendChild(option);
      });

      select.onchange = () => button.disabled = select.value === "";
      button.onclick = () => {
        const result = autofillProfile(response.profiles[Number(select.value)]);
        status.textContent = `${result.filled} fields filled; ${result.skipped} skipped.`;
      };
    });
  }

  // Set a field's value and notify the website.
  function fillField(field, value) {
    if (!value || !isVisible(field) || field.value.trim() !== "") return false;

    if (field.tagName === "SELECT") {
      const option = [...field.options].find(option =>
        option.value.toLowerCase() === value.toLowerCase() ||
        option.text.trim().toLowerCase() === value.toLowerCase()
      );
      if (!option) return false;
      field.value = option.value;
    } else {
      // Use the native setter to support many React-controlled fields.
      let prototype = Object.getPrototypeOf(field);
      let descriptor;

      while (prototype && !descriptor) {
        descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
        prototype = Object.getPrototypeOf(prototype);
      }

      if (descriptor?.set) descriptor.set.call(field, value);
      else field.value = value;
    }

    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function autofillProfile(person) {
    const fields = [...document.querySelectorAll("input, textarea, select")].filter(isVisible);
    const used = new Set();
    let filled = 0, skipped = 0;

    function matchField(keywords, value) {
      const field = fields.find(field => {
        const label = getFieldLabel(field);
        return !used.has(field) && !label.includes("company") && keywords.some(word => label.includes(word));
      });

      if (!field || !fillField(field, value)) skipped++;
      else {
        used.add(field);
        filled++;
      }
    }

    // Match a full-name field before separate first and last names.
    const fullName = fields.find(field => /full.?name|your.?name/.test(getFieldLabel(field)) && !getFieldLabel(field).includes("company"));
    if (fullName) {
      if (fillField(fullName, `${person.firstName} ${person.lastName}`.trim())) {
        used.add(fullName);
        filled++;
      }
    }

    matchField(["first name", "firstname", "given-name"], person.firstName);
    matchField(["last name", "lastname", "family-name", "surname"], person.lastName);

    // Support forms with separate address lines.
    const addressParts = (person.address || "").split(",");
    const address1 = addressParts[0]?.trim() || "";
    const address2 = addressParts.slice(1).join(",").trim();
    const hasAddress1 = fields.some(field => /address[- ]?line[- ]?1|addressline1|address1/.test(getFieldLabel(field)));

    if (hasAddress1) {
      matchField(["address line 1", "addressline1", "address1"], address1);
      if (address2) matchField(["address line 2", "addressline2", "address2"], address2);
    } else {
      matchField(["street address", "street-address", "address"], person.address);
    }

    matchField(["date of birth", "dateofbirth", "birth date", "dob", "bday"], person.dob);
    matchField(["phone", "mobile", "telephone", "tel", "contact number"], person.phone);

    return { filled, skipped };
  }

  // Support Autofill from the original extension popup.
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "AUTOFILL_PROFILE") {
      try {
        sendResponse({ success: true, ...autofillProfile(message.person) });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    }
  });

  // Detect forms added after the page initially loads.
  new MutationObserver(detectForm).observe(document.documentElement, {
    childList: true, subtree: true
  });

  detectForm();
})();
