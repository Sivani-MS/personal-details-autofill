
(() => {
  if (window.__personalAutofillLoaded) return;
  window.__personalAutofillLoaded = true;

  // Find the text that identifies a form field.
  function getLabel(field) {
    return `${field.name} ${field.id} ${field.placeholder} ${field.getAttribute("aria-label")}`.toLowerCase();
  }

  // Check whether a field can be filled.
  function isVisible(field) {
    return field.getClientRects().length > 0 && !field.disabled && !field.readOnly && field.type !== "hidden";
  }

  // Detect personal-detail fields.
  function detectForm() {
    if (document.getElementById("personal-autofill-panel") || window.__autofillPanelDismissed) return;

    const fields = [...document.querySelectorAll("input, textarea, select")].filter(isVisible);
    const found = fields.some(field => /name|address|birth|dob|phone|mobile|contact/.test(getLabel(field)) && !getLabel(field).includes("company"));

    if (found) showPanel();
  }

  // Create the floating popup.
  function showPanel() {
    const panel = document.createElement("div");
    panel.id = "personal-autofill-panel";
    panel.style.cssText = "position:fixed;right:20px;bottom:20px;z-index:999999;background:white;color:black;padding:15px;border:1px solid #ccc;border-radius:8px;width:250px;box-shadow:0 2px 10px #aaa;font:14px Arial";

    panel.innerHTML = `<b>Personal Details Autofill</b>
      <button id="close">×</button><br><br>
      <select id="profile" style="width:100%"><option value="">Select a profile</option></select>
      <br><br><button id="fill" disabled>Autofill</button><p id="status"></p>`;

    document.body.appendChild(panel);

    const select = panel.querySelector("#profile");
    const button = panel.querySelector("#fill");
    const status = panel.querySelector("#status");

    panel.querySelector("#close").onclick = () => {
      window.__autofillPanelDismissed = true;
      panel.remove();
    };

    // Get profiles from background.js.
    chrome.runtime.sendMessage({ action: "GET_PROFILES" }, response => {
      if (chrome.runtime.lastError || !response?.success) {
        status.textContent = response?.error || "Could not load profiles.";
        return;
      }

      response.profiles.forEach((person, index) => {
        select.add(new Option(`${person.firstName} ${person.lastName}`, index));
      });

      select.onchange = () => button.disabled = select.value === "";
      button.onclick = () => {
        const result = autofill(response.profiles[Number(select.value)]);
        status.textContent = `${result.filled} fields filled; ${result.skipped} skipped.`;
      };
    });
  }

  // Fill matching empty fields.
  function autofill(person) {
    const fields = [...document.querySelectorAll("input, textarea, select")].filter(isVisible);
    const used = new Set();
    let filled = 0, skipped = 0;

    function fillField(keywords, value) {
      const field = fields.find(field => !used.has(field) && !getLabel(field).includes("company") && keywords.some(word => getLabel(field).includes(word)));

      if (!field || !value || field.value.trim() !== "") {
        skipped++;
        return;
      }

      field.value = value;
      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.dispatchEvent(new Event("change", { bubbles: true }));
      used.add(field);
      filled++;
    }

    fillField(["first name", "firstname"], person.firstName);
    fillField(["last name", "lastname", "surname"], person.lastName);
    fillField(["full name"], `${person.firstName} ${person.lastName}`);
    const addressParts = (person.address || "").split(",");
const address1 = addressParts[0]?.trim() || "";
const address2 = addressParts.slice(1).join(",").trim();

const hasAddress1 = fields.some(field =>
  /address.?line.?1|addressline1|address1/.test(getLabel(field))
);

if (hasAddress1) {
  fillField(["address line 1", "addressline1", "address1"], address1);
  if (address2) fillField(["address line 2", "addressline2", "address2"], address2);
} else {
  fillField(["address"], person.address);
}
    fillField(["date of birth", "birth date", "dob"], person.dob);
    fillField(["phone", "mobile", "contact"], person.phone);

    return { filled, skipped };
  }

  // Support autofill from the original toolbar popup.
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "AUTOFILL_PROFILE") {
      sendResponse({ success: true, ...autofill(message.person) });
    }
  });

  // Check for forms when the page changes.
  new MutationObserver(detectForm).observe(document.documentElement, {
    childList: true, subtree: true
  });

  detectForm();
})();
