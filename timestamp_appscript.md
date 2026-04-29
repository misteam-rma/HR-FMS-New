# Professional Timestamp Logic for Google Sheets Integration

This document outlines the standardized approach for generating timestamps that are natively recognized as "Real Dates" by Google Sheets and Google Apps Script within the HR FMS portal.

## The Standard Format
To ensure that dates are not treated as plain strings and are correctly sortable/filterable in the spreadsheet, use the `M/D/YYYY H:mm:ss` format.

### Why this format?
1. **Apps Script Native Parsing**: Google Apps Script's `new Date()` constructor reliably parses this format into a proper `Date` object on the server side.
2. **Spreadsheet Compatibility**: Google Sheets automatically recognizes this pattern as a `DateTime` value, allowing for chronological sorting and formula calculations.
3. **ISO Avoidance**: Prevents the use of ISO 8601 (`YYYY-MM-DDTHH:mm:ss.sssZ`) which can cause timezone offset issues (the "Z" problem) in spreadsheet environments.

## Implementation Snippet

```javascript
/**
 * Generates a professional timestamp compatible with Google Sheets
 * Fetches server time to prevent client clock discrepancies.
 * Format: MM/DD/YYYY HH:mm:ss
 */
let now = new Date();
try {
  // Fetch server time to avoid client clock discrepancies
  const timeResp = await fetch(`${API_URL}?action=ping`);
  const serverDate = timeResp.headers.get('Date');
  if (serverDate) {
    now = new Date(serverDate);
  }
} catch (e) {
  console.warn('Failed to sync server time, using local clock:', e);
}

const pad = (num) => String(num).padStart(2, '0');
const timestamp = `${pad(now.getMonth() + 1)}/${pad(now.getDate())}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

// Usage in rowData or updateCell
// rowData[0] = timestamp;
// params.append('value', timestamp);
```

## Best Practices
- **Consistency**: Use this exact manual formatting instead of `toLocaleString()`, as `toLocaleString()` is browser-dependent and may change based on the user's OS settings.
- **Precision**: Always pad minutes and seconds with a leading zero to maintain a consistent length and readability.
- **Server Sync**: When updating a cell (e.g., Column AB in ENQUIRY), use this same `timestamp` logic to mark the "Actual Date" of action.

## Reference Examples
- **CallTracker.jsx**: See `updateEnquirySheet` function.
- **Joining.jsx**: See `handleJoiningSubmit` function.
