
console.log("Autofill loaded:", location.href);

function getFieldLabel(field) {
  const labels = Array.from(field.labels || []).map(label => label.innerText).join(" ");
  return [field.name, field.id, field.placeholder, field.autocomplete, field.getAttribute("aria-label"), field.title, labels].filter(Boolean).join(" ").toLowerCase();
}

function isVisible(field) {
  return field.getClientRects().length > 0 && !field.disabled && !field.readOnly && field.type !== "hidden";
}

// Detect relevant fields and show the floating panel automatically.
function detectForm() {
  if (document.getElementById("personal-autofill-panel") || window.__autofillPanelDismissed) return;

  const fields = [...document.querySelectorAll("input, textarea, select")].filter(isVisible);
  const keywords = ["name", "address", "birth", "dob", "phone", "mobile", "contact", "location"];
  const relevant = fields.filter(field => keywords.some(word => getFieldLabel(field).includes(word)) && !getFieldLabel(field).includes("company"));

  if (relevant.length) showAutofillPanel();
}

// Create a small floating panel inside the webpage.
function showAutofillPanel() {
  const panel = document.createElement("div");
  panel.id = "personal-autofill-panel";
  Object.assign(panel.style, { position: "fixed", right: "20px", bottom: "20px", zIndex: "999999", background: "white", padding: "16px", border: "1px solid #ccc", borderRadius: "8px", boxShadow: "0 2px 10px #aaa", color: "#222" });

  panel.innerHTML = `<b>Personal Details Autofill</b><button id="autofill-close" style="float:right">×</button><br><br><select id="autofill-profile"><option value="">Select profile</option></select><br><br><button id="autofill-fill" disabled>Autofill</button><p id="autofill-status"></p>`;
  document.body.appendChild(panel);

  // Close the panel and prevent it from reopening on this page.
  panel.querySelector("#autofill-close").onclick = () => {
    window.__autofillPanelDismissed = true;
    panel.remove();
  };

  const select = panel.querySelector("#autofill-profile");
  const button = panel.querySelector("#autofill-fill");
  const status = panel.querySelector("#autofill-status");

  // Load profiles from Google Sheets through background.js.
  chrome.runtime.sendMessage({ action: "GET_PROFILES" }, response => {
    if (chrome.runtime.lastError || !response?.success) {
      status.textContent = "Could not load profiles.";
      return;
    }

    response.profiles.forEach((person, index) => {
      const option = document.createElement("option");
      option.value = index;
      option.textContent = `${person.firstName} ${person.lastName}`;
      select.appendChild(option);
    });

    select.onchange = () => button.disabled = select.value === "";
    button.onclick = () => {
      const result = autofillProfile(response.profiles[select.value]);
      status.textContent = `Filled ${result.filled}; skipped ${result.skipped}.`;
    };
  });
}

// Set values and notify websites that use JavaScript frameworks.
function fillField(field, value) {
  if (!value || !isVisible(field) || field.value.trim() !== "") return false;

  if (field.tagName === "SELECT") {
    const option = [...field.options].find(option => option.value.toLowerCase() === value.toLowerCase() || option.text.trim().toLowerCase() === value.toLowerCase());
    if (!option) return false;
    field.value = option.value;
  } else {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(field), "value")?.set;
    if (setter) setter.call(field, value);
    else field.value = value;
  }

  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function autofillProfile(person) {
  const fields = [...document.querySelectorAll("input, textarea, select")].filter(isVisible);
  let filled = 0, skipped = 0;
  const used = new Set();

  function matchField(keywords, value) {
    const field = fields.find(field => !used.has(field) && keywords.some(word => getFieldLabel(field).includes(word)) && !getFieldLabel(field).includes("company"));
    if (!field || !fillField(field, value)) skipped++;
    else { used.add(field); filled++; }
  }

  // Match full name fields first.
  const fullName = fields.find(field => /full.?name|your.?name/.test(getFieldLabel(field)) && !getFieldLabel(field).includes("company"));
  if (fullName && fillField(fullName, `${person.firstName} ${person.lastName}`)) {
    used.add(fullName);
    filled++;
  }

  matchField(["first name", "firstname", "given-name"], person.firstName);
  matchField(["last name", "lastname", "family-name", "surname"], person.lastName);
  matchField(["street address", "address"], person.address);
  matchField(["date of birth", "dateofbirth", "birth date", "dob", "bday"], person.dob);
  matchField(["phone", "mobile", "telephone", "tel", "contact number"], person.phone);

  return { filled, skipped };
}

// Keep the original toolbar-popup workflow working.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "AUTOFILL_PROFILE") {
    try {
      sendResponse({ success: true, ...autofillProfile(message.person) });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }
});

// Detect forms that appear later, such as dynamically loaded application forms.
new MutationObserver(detectForm).observe(document.documentElement, { childList: true, subtree: true });
detectForm();
