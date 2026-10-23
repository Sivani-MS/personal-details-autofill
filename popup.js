
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSfWMw-TwRoJSZFuDpWhREh2gO8P0zbXxbbD-FQONLisg7p3tS79OdhL_urTYWjqJrOZy-pQJeDYsMr/pub?gid=0&single=true&output=csv";
const refreshBtn = document.getElementById("refreshBtn");
const profileSelect = document.getElementById("profileSelect");
const status = document.getElementById("status");

let profiles = [];

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '"' && text[i + 1] === '"' && quoted) {
      cell += '"';
      i++;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell.trim());
      if (row.some(value => value !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell.trim());
  if (row.some(value => value !== "")) rows.push(row);

  return rows;
}

async function loadProfiles() {
  status.textContent = "Loading profiles...";
  refreshBtn.disabled = true;

  try {
    const response = await fetch(SHEET_URL);
    if (!response.ok) throw new Error("Could not access the Google Sheet.");

    const rows = parseCSV(await response.text());
    if (rows.length < 2) throw new Error("No profiles found in the Sheet.");

    const headers = rows[0].map(header => header.toLowerCase().trim());
    const required = ["first name", "last name", "address", "date of birth", "contact number"];

    if (!required.every(header => headers.includes(header))) {
      throw new Error("Check that the Sheet has all five required column headers.");
    }

    profiles = rows.slice(1).map(row => {
      const get = header => row[headers.indexOf(header)] || "";
      return {
        firstName: get("first name"),
        lastName: get("last name"),
        address: get("address"),
        dob: get("date of birth"),
        phone: get("contact number")
      };
    }).filter(person => person.firstName || person.lastName);

    profileSelect.innerHTML = '<option value="">Select a person</option>';

    profiles.forEach((person, index) => {
      const option = document.createElement("option");
      option.value = index;
      option.textContent = `${person.firstName} ${person.lastName}`.trim();
      profileSelect.appendChild(option);
    });

    status.textContent = profiles.length
      ? `${profiles.length} profiles loaded successfully.`
      : "No profiles found. Check your Sheet.";

    showDetails();
  } catch (error) {
    status.textContent = `Error: ${error.message}`;
  } finally {
    refreshBtn.disabled = false;
  }
}
function searchProfiles() {
  const search = searchInput.value.toLowerCase();
  const filtered = profiles.filter(person =>
    `${person.firstName} ${person.lastName}`.toLowerCase().includes(search)
  );

  profileSelect.innerHTML = '<option value="">Select a person</option>';

  filtered.forEach(person => {
    const index = profiles.indexOf(person);
    const option = document.createElement("option");
    option.value = index;
    option.textContent = `${person.firstName} ${person.lastName}`.trim();
    profileSelect.appendChild(option);
  });

  showDetails();
}
function showDetails() {
  const person = profiles[Number(profileSelect.value)];

  document.getElementById("firstName").textContent = person?.firstName || "-";
  document.getElementById("lastName").textContent = person?.lastName || "-";
  document.getElementById("address").textContent = person?.address || "-";
  document.getElementById("dob").textContent = person?.dob || "-";
  document.getElementById("phone").textContent = person?.phone || "-";
}

refreshBtn.addEventListener("click", loadProfiles);
profileSelect.addEventListener("change", showDetails);


const fillBtn = document.getElementById("fillBtn");
const result = document.getElementById("result");

fillBtn.addEventListener("click", async () => {
  const person = profiles[Number(profileSelect.value)];

  if (!person || profileSelect.value === "") {
    result.textContent = "Please select a person first.";
    return;
  }

  result.textContent = "Filling form...";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

   if (!tab?.id || (!tab.url?.startsWith("http") && !tab.url?.startsWith("file:"))) {
  throw new Error("Open a webpage with a form first.");
}

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    });

    const response = await chrome.tabs.sendMessage(tab.id, {
      action: "AUTOFILL_PROFILE",
      person
    });

    if (!response?.success) throw new Error(response?.error || "Autofill failed.");

    result.textContent = `${response.filled} fields filled; ${response.skipped} fields skipped.`;
  } catch (error) {
    result.textContent = `Error: ${error.message}`;
  }
});

