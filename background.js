
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSfWMw-TwRoJSZFuDpWhREh2gO8P0zbXxbbD-FQONLisg7p3tS79OdhL_urTYWjqJrOZy-pQJeDYsMr/pub?gid=0&single=true&output=csv";

// Convert CSV text into rows, including quoted values.
function parseCSV(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '"' && text[i + 1] === '"' && quoted) {
      cell += '"';
      i++;
    } else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

// Send profile data when the floating panel requests it.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action !== "GET_PROFILES") return;

  fetch(SHEET_URL)
    .then(response => {
      if (!response.ok) throw new Error("Could not access Google Sheets.");
      return response.text();
    })
    .then(text => {
      const rows = parseCSV(text);
      if (rows.length < 2) throw new Error("No profiles found in the Sheet.");

      const headers = rows[0].map(header => header.replace(/^\uFEFF/, "").toLowerCase().trim());
      const required = ["first name", "last name", "address", "date of birth", "contact number"];

      if (!required.every(header => headers.includes(header))) {
        throw new Error("Check the Sheet column names.");
      }

      const profiles = rows.slice(1).map(row => {
        const get = name => row[headers.indexOf(name)] || "";
        return {
          firstName: get("first name"),
          lastName: get("last name"),
          address: get("address"),
          dob: get("date of birth"),
          phone: get("contact number")
        };
      }).filter(person => person.firstName || person.lastName);

      sendResponse({ success: true, profiles });
    })
    .catch(error => sendResponse({ success: false, error: error.message }));

  return true;
});
