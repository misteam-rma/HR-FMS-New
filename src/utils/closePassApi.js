const SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

/**
 * Fetch all gate passes (visitors) for closure
 */
export const fetchGatePassesApi = async () => {
  try {
    const response = await fetch(`${SCRIPT_URL}?action=fetch&sheet=Request Visit`);
    const result = await response.json();

    if (result.success && Array.isArray(result.data) && result.data.length > 5) {
      const headers = result.data[5];
      const dataRows = result.data.slice(6);

      const mappedPasses = dataRows.map((row, index) => {
        let obj = { id: index + 7, rowIndex: index + 7 }; // Store row index for updates (6 header rows + 1 for 1-based index = +7)
        headers.forEach((header, i) => {
          const headerName = header.toString().trim();
          const key = headerName.toLowerCase().replace(/\s+/g, '_');
          obj[key] = row[i];

          const headerLower = headerName.toLowerCase();

          if (headerLower === 'visitor name') obj.visitor_name = row[i];
          if (headerLower === 'mobile number') obj.mobile_number = row[i];
          if (headerLower === 'serial no.') obj.serial_no = row[i];
          if (headerLower === 'person to meet') obj.person_to_meet = row[i];
          if (headerLower === 'purpose of visit') obj.purpose_of_visit = row[i];
          if (headerLower === 'time of entry') obj.time_of_entry = row[i];
          if (headerLower === 'visitor photo') obj.visitor_photo = row[i];
          if (headerLower === 'status') obj.status = row[i];
        });

        // Map Column O (index 14) and Column P (index 15) explicitly
        obj.colO = row[14] || '';
        obj.colP = row[15] || '';

        return obj;
      });

      return { success: true, data: { data: mappedPasses } };
    }
    return { success: false, data: { data: [] } };
  } catch (error) {
    console.error("Error fetching gate passes:", error);
    return { success: false, data: { data: [] } };
  }
};

/**
 * Close a gate pass by updating the "Actual 2" column (Out Time)
 */
export const closeGatePassApi = async (id) => {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { hour12: false });

  const timeFormData = new URLSearchParams();
  timeFormData.append('action', 'updateCell');
  timeFormData.append('sheetName', 'Request Visit');
  timeFormData.append('rowIndex', id);
  timeFormData.append('columnIndex', '16'); // "Actual 2" is column P (16)
  timeFormData.append('value', timeStr);

  const statusFormData = new URLSearchParams();
  statusFormData.append('action', 'updateCell');
  statusFormData.append('sheetName', 'Request Visit');
  statusFormData.append('rowIndex', id);
  statusFormData.append('columnIndex', '18'); // Status is column R (18)
  statusFormData.append('value', 'CLOSED');

  try {
    const [timeResponse, statusResponse] = await Promise.all([
      fetch(SCRIPT_URL, {
        method: 'POST',
        body: timeFormData
      }),
      fetch(SCRIPT_URL, {
        method: 'POST',
        body: statusFormData
      })
    ]);
    return await statusResponse.json();
  } catch (error) {
    console.error("Error closing gate pass:", error);
    throw error;
  }
};
