
function fillField(field, value) {
  if (!value || field.disabled || field.readOnly) return false;
  if (field.type === "hidden" || field.value.trim() !== "") return false;
  if (field.getClientRects().length === 0) return false;

  field.value = value;
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function getFieldLabel(field) {
  const labels = Array.from(field.labels || []).map(label => label.innerText).join(" ");
  return `${field.name} ${field.id} ${field.placeholder} ${field.autocomplete} ${labels}`.toLowerCase();
}

function autofillProfile(person) {
  const fields = Array.from(document.querySelectorAll("input, textarea, select"));
  let filled = 0;
  let skipped = 0;
  const used = new Set();

  function matchField(keywords, value) {
    const field = fields.find(field => {
      if (used.has(field)) return false;
      const label = getFieldLabel(field);
      return keywords.some(keyword => label.includes(keyword));
    });

    if (!field || !value) {
      skipped++;
      return;
    }

    used.add(field);
    if (fillField(field, value)) filled++;
    else skipped++;
  }

  // Check company fields first so a person's name is not entered there.
  fields.forEach(field => {
    if (getFieldLabel(field).includes("company")) used.add(field);
  });

  matchField(["first name", "firstname", "given-name"], person.firstName);
  matchField(["last name", "lastname", "family-name", "surname"], person.lastName);

  
const addressParts = person.address.split(",");
const address1 = addressParts[0]?.trim() || "";
const address2 = addressParts.slice(1).join(",").trim();

const hasAddressLine1 = fields.some(field =>
  /address[- ]?line[- ]?1|addressline1|address1/.test(getFieldLabel(field))
);

if (hasAddressLine1) {
  matchField(["address line 1", "addressline1", "address-line1", "address1"], address1);
  matchField(["address line 2", "addressline2", "address-line2", "address2"], address2);
} else {
  matchField(["street address", "street-address", "address"], person.address);
}

  if (person.dob && /^\d{4}-\d{2}-\d{2}$/.test(person.dob) && !isNaN(Date.parse(person.dob)) && new Date(person.dob).toISOString().startsWith(person.dob)) {
  matchField(["date of birth", "dateofbirth", "birth date", "dob", "bday"], person.dob);
} else {
  skipped++;
}
  matchField(["phone", "mobile", "telephone", "tel", "contact number"], person.phone);

  return { filled, skipped };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "AUTOFILL_PROFILE") {
    try {
      const result = autofillProfile(message.person);
      sendResponse({ success: true, ...result });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }
});
