# Chrome Extension – Test Results

## 1. Project Overview
The extension retrieves personal details from a published Google Sheet and uses them to autofill matching fields on a webpage.

## 2. Test Cases

| Test No. | Test Case | Expected Result | Actual Result |
|---|---|---|---|
| 1 | Load profiles using Refresh Data | Profiles load from Google Sheets | Passed |
| 2 | Select a person | Selected person's details appear | Passed |
| 3 | Fill a form with matching fields | Matching empty fields are filled | Passed |
| 4 | Test different field names | Recognized fields are filled where possible | Passed |
| 5 | Test hidden fields | Hidden fields remain unchanged | Passed |
| 6 | Test read-only fields | Read-only fields remain unchanged | Passed |
| 7 | Test disabled fields | Disabled fields remain unchanged | Passed |
| 8 | Test fields that already contain values | Existing values remain unchanged | Passed |
| 9 | Test missing personal details | Missing values are not entered | Passed |
| 10 | Test invalid date of birth | Invalid date is skipped | Passed |
| 11 | Test a company-name field | A person's name is not entered into the company field | Passed |

## 3. Conclusion
The Chrome extension was tested using sample HTML forms. The tested features worked as expected for the test cases listed above.