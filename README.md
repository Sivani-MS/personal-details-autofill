## Google Sheets Personal Details Autofill

# 1. Project Description
This Chrome extension automatically fills personal details into web forms using data from Google Sheets. It supports profile selection and helps reduce manual data entry.

# 2. Technologies Used
- HTML
- CSS
- JavaScript
- Chrome Extension Manifest V3
- Google Sheets (published CSV data)

# 3. Features
- Loads personal profiles from Google Sheets.
- Displays the selected person's details.
- Fills matching form fields automatically.
- Supports First Name, Last Name, Address, Date of Birth, and Contact Number.
- Refreshes profile data when the Sheet is updated.
- Preserves fields that already contain values.
- Skips hidden, disabled, and read-only fields.
- Avoids filling the Company Name field with a person's name.
- Displays success and error messages.

# 4. Project Files
- manifest.json -- extension configuration and permissions.
- popup.html --extension popup structure.
- style.css -- popup styling.
- popup.js -- loads Sheet data, displays profiles, and handles user actions.
- content.js -- identifies form fields and fills eligible fields.
- test-form-1.html -- first test form.
- test-form-2.html --second test form.

## 5. Setup Instructions
1. Download or extract the project folder.
2. Open Google Chrome and visit `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the `personal-details-autofill` project folder.
6. If testing local HTML files, enable **Allow access to file URLs** in the extension details.

## 6. Google Sheets Setup
1. Create a Google Sheet with these column headers:
   - First Name
   - Last Name
   - Address
   - Date of Birth
   - Contact Number
2. Add profile data below the headers.
3. Publish the Sheet as CSV.
4. Copy the published CSV URL into the `SHEET_URL` constant in `popup.js`.
5. Click **Refresh Data** in the extension to load the profiles.

**Important:** Use dummy data for testing. Published Sheet data may be accessible to anyone with the published link.

## 7. How to Use
1. Open a webpage containing a form.
2. Click the extension icon.
3. Click **Refresh Data** to load the latest profiles.
4. Select a person from the dropdown.
5. Review the displayed details.
6. Click **Autofill Form**.
7. Check the filled fields and the result message.

## 8. Testing
The extension was tested with two local HTML forms and five dummy profiles. Tests covered profile selection, autofill, existing values, hidden and read-only fields, disabled fields, Company Name protection, Sheet updates, connection failure, date validation, and profile switching.

Refer to `Test Results.txt` for the recorded test outcomes.

## 9. Limitations
- The extension recognizes fields using their names, IDs, placeholders, autocomplete attributes, and labels. Unusual form layouts may require additional matching rules.
- It works only on webpages where Chrome permits script injection.
- Published Google Sheets data should contain test data or other information suitable for public access.

## 10. AI Assistance
AI assistance was used to help develop and explain the code, troubleshoot errors, and prepare test documentation. The code was manually tested using local HTML forms.
