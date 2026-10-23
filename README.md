# Google Sheets Personal Details Autofill

## 1. Project Description

This Chrome extension automatically detects relevant form fields on webpages and helps users fill personal details using profiles stored in Google Sheets. It provides a floating autofill popup for quick access while retaining the original extension popup for manual autofill.

## 2. Technologies Used

- HTML
- CSS
- JavaScript
- Chrome Extension Manifest V3
- Google Sheets (published CSV data)
- Chrome Extension APIs

## 3. Features

- Loads five dummy profiles from Google Sheets.
- Automatically detects relevant personal-detail fields on webpages.
- Displays a floating autofill popup when relevant fields are detected.
- Allows users to select a profile and autofill matching fields.
- Retains the original toolbar popup for manual autofill.
- Supports First Name, Last Name, Address, Date of Birth, and Contact Number.
- Identifies fields using names, IDs, placeholders, labels, and other field attributes.
- Detects form fields added dynamically to webpages.
- Preserves fields that already contain values.
- Skips hidden, disabled, and read-only fields.
- Avoids filling Company Name fields with a person's name.
- Refreshes profile data when the Google Sheet is updated.
- Displays status and error messages.

## 4. Project Files

- `manifest.json` — Extension configuration, permissions, and content-script settings.
- `popup.html` — Structure of the original extension popup.
- `style.css` — Styling for the extension popup.
- `popup.js` — Loads Sheet data, displays profiles, and handles manual autofill.
- `content.js` — Detects form fields, displays the floating popup, and fills eligible fields.
- `background.js` — Fetches and processes profile data from Google Sheets.
- `test-form-1.html` — First local test form.
- `test-form-2.html` — Second local test form.
- `Test Results.md` — Recorded test outcomes.
- `README.md` — Project documentation.

## 5. Setup Instructions

1. Download or extract the project folder.
2. Open Google Chrome and visit `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the `personal-details-autofill` project folder.
6. If testing local HTML files, enable **Allow access to file URLs** in the extension details.
7. Reload the extension and refresh the webpage after making code changes.

## 6. Google Sheets Setup

1. Create a Google Sheet with these column headers:
   - First Name
   - Last Name
   - Address
   - Date of Birth
   - Contact Number
2. Add profile data below the headers.
3. Publish the Sheet as CSV.
4. Copy the published CSV URL into the `SHEET_URL` constant in `background.js`. If the original popup fetches the Sheet directly, configure its URL in `popup.js` as well.
5. Reload the extension and refresh the profile data.


## 7. How to Use

### Automatic Autofill

1. Open a webpage containing a relevant form.
2. Wait for the extension to detect the form fields.
3. Select a person from the floating popup.
4. Click **Autofill**.
5. Review the filled fields.

### Manual Autofill

1. Click the extension icon in Chrome.
2. Click **Refresh Data** to load the latest profiles.
3. Select a person from the dropdown.
4. Review the displayed details.
5. Click **Autofill Form**.
6. Check the filled fields and result message.

## 8. Testing

The extension was tested using two local HTML forms and five dummy profiles. Tests covered profile selection, autofill, existing values, hidden and read-only fields, disabled fields, Company Name protection, Sheet updates, connection failure, date validation, and profile switching.

Automatic form detection and the floating popup should also be tested on webpages with different form layouts.

Refer to `Test Results.md` for the recorded test outcomes.

## 9. Limitations

- Unusual field names and layouts may require additional matching rules.
- Some websites use custom form controls that may not work with standard autofill logic.
- The extension works only on webpages where Chrome permits content scripts to run.
- Dynamic forms may require additional detection handling.
- Published Google Sheets data should contain only information suitable for public access.

## 10. AI Assistance

AI assistance was used to develop the code. The implementation was manually tested using local HTML forms. Further testing may be needed across different websites and form layouts.