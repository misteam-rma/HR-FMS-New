const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwGN0L4CqcZdhgie3l94KGGjWHqaL_cHRgwtw1CCUZy6yqpF5lFlFNBbO10dEm7BNK6FQ/exec";

/**
 * Fetch all visits for approval
 */
export const fetchVisitsForApprovalApi = async () => {
  try {
    const response = await fetch(`${SCRIPT_URL}?action=fetch&sheet=Request Visit`);
    const result = await response.json();

    if (result.success && Array.isArray(result.data) && result.data.length > 5) {
      const headers = result.data[5];
      const dataRows = result.data.slice(6);

      const mappedVisits = dataRows.map((row, index) => {
        let obj = { rowIndex: index + 7 }; // Store row index for updates (6 header rows + 1 for 1-based index = +7)
        headers.forEach((header, i) => {
          const headerName = header.toString().trim();
          const key = headerName.toLowerCase().replace(/\s+/g, '_');
          obj[key] = row[i];

          const headerLower = headerName.toLowerCase();

          // Map exactly to the sheet headers shown in the screenshot
          if (headerLower === 'visitor name') obj.visitorName = row[i];
          if (headerLower === 'mobile number') obj.mobileNumber = row[i];
          if (headerLower === 'serial no.') obj.serialNo = row[i];
          if (headerLower === 'person to meet') obj.personToMeet = row[i];
          if (headerLower === 'purpose of visit') obj.purposeOfVisit = row[i];
          if (headerLower === 'time of entry') obj.timeOfEntry = row[i];
          if (headerLower === 'visitor photo') obj.photo = row[i];
          if (headerLower === 'status') obj.status = row[i];

          // Explicitly map Column F (index 5) to photo
          if (i === 5) obj.photo = row[i];

          if (headerLower === 'timestamp') {
            obj.timestamp = row[i];
            if (row[i] && row[i].includes(',')) {
              obj.dateOfVisit = row[i].split(',')[0].trim();
            } else {
              obj.dateOfVisit = row[i];
            }
          }

          // Map Column K, L, N (Status) and S (User Code) explicitly
          obj.colK = row[10] || '';
          obj.colL = row[11] || '';
          obj.status = row[13] || '';
          obj.userCode = row[18] || '';
        });
        return obj;
      });

      return { success: true, visits: mappedVisits };
    }
    return { success: false, visits: [] };
  } catch (error) {
    console.error("Error fetching visits:", error);
    return { success: false, visits: [] };
  }
};

/**
 * Create a new visit request
 */
export const createVisitRequestApi = async (data) => {
  // 1. Upload photo to Google Drive first
  let photoUrl = "";
  if (data.photoFile) {
    try {
      const base64Photo = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(data.photoFile);
      });

      const folderId = import.meta.env.VITE_GOOGLE_DRIVE_VISITOR_PHOTO_FOLDER_ID;
      const uploadFormData = new URLSearchParams();
      uploadFormData.append('action', 'uploadFile');
      uploadFormData.append('base64Data', base64Photo);
      uploadFormData.append('fileName', `Visitor_${data.visitorName}_${Date.now()}.jpg`);
      uploadFormData.append('mimeType', 'image/jpeg');
      uploadFormData.append('folderId', folderId || "");

      const uploadResponse = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: uploadFormData
      });

      const uploadResult = await uploadResponse.json();
      if (uploadResult.success && uploadResult.fileUrl) {
        const fileId = uploadResult.fileUrl.split('id=')[1];
        photoUrl = fileId
          ? `https://drive.google.com/file/d/${fileId}/view?usp=sharing`
          : uploadResult.fileUrl;
      } else {
        // Fallback to base64 if upload fails
        photoUrl = base64Photo;
      }
    } catch (err) {
      console.error("Error uploading visitor photo:", err);
      // Fallback to base64 on error
      try {
        const base64Photo = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(data.photoFile);
        });
        photoUrl = base64Photo;
      } catch (e) { }
    }
  }

  // Row structure (A to S): Timestamp, Serial No., visitor Name, Mobile Number, Email Address, Visitor Photo, Person To Meet, Purpose of Visit, Time of Entry, Visitor Address, [K], L, [M], N, [O], [P], [Q], [R], User Code (S)
  const rowData = new Array(19).fill("");
  rowData[0] = new Date().toLocaleString('en-IN'); // A: Timestamp
  rowData[1] = data.serialNo || "";                // B: Serial No.
  rowData[2] = data.visitorName || "";             // C: visitor Name
  rowData[3] = data.mobileNumber || "";            // D: Mobile Number
  rowData[4] = data.email || "";                   // E: Email Address
  rowData[5] = photoUrl || "";                     // F: Visitor Photo (Drive URL)
  rowData[6] = data.personToMeet || "";            // G: Person To Meet
  rowData[7] = data.purposeOfVisit || "";          // H: Purpose of Visit
  rowData[8] = data.timeOfEntry || "";             // I: Time of Entry
  rowData[9] = data.visitorAddress || "";          // J: Visitor Address
  rowData[11] = "";                                // L: Actual Submit
  rowData[13] = "";                                // N: Status
  rowData[18] = data.userCode || "";               // S: User Code

  const formData = new URLSearchParams();
  formData.append('action', 'insert');
  formData.append('sheetName', 'Request Visit');
  formData.append('rowData', JSON.stringify(rowData));

  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: formData
    });
    return await response.json();
  } catch (error) {
    console.error("Error creating visit:", error);
    throw error;
  }
};

export const updateVisitStatusApi = async (rowIndex, status) => {
  const currentTimestamp = new Date().toLocaleString('en-IN');

  const timeFormData = new URLSearchParams();
  timeFormData.append('action', 'updateCell');
  timeFormData.append('sheetName', 'Request Visit');
  timeFormData.append('rowIndex', rowIndex);

  // Submit approval/rejection timestamp to Column L (12)
  timeFormData.append('columnIndex', '12');
  timeFormData.append('value', currentTimestamp);

  const statusFormData = new URLSearchParams();
  statusFormData.append('action', 'updateCell');
  statusFormData.append('sheetName', 'Request Visit');
  statusFormData.append('rowIndex', rowIndex);
  statusFormData.append('columnIndex', '14'); // Status is column N (14)
  statusFormData.append('value', status);

  try {
    const [statusResponse, timeResponse] = await Promise.all([
      fetch(SCRIPT_URL, {
        method: 'POST',
        body: statusFormData
      }),
      fetch(SCRIPT_URL, {
        method: 'POST',
        body: timeFormData
      })
    ]);

    return await statusResponse.json();
  } catch (error) {
    console.error("Error updating visit status:", error);
    throw error;
  }
};

/**
 * Fetch visitor by mobile
 */
export const fetchVisitorByMobileApi = async (mobile) => {
  try {
    const response = await fetch(`${SCRIPT_URL}?action=fetch&sheet=Request Visit`);
    const result = await response.json();

    if (result.success && Array.isArray(result.data) && result.data.length > 5) {
      const headers = result.data[5];
      const mobileIndex = headers.findIndex(h => h.toString().toLowerCase().includes('mobile'));

      const foundRow = result.data.slice(6).reverse().find(row => row[mobileIndex] === mobile);

      if (foundRow) {
        const visitorData = {};
        headers.forEach((header, i) => {
          const headerName = header.toString().trim();
          const headerLower = headerName.toLowerCase();
          if (headerLower === 'visitor name') visitorData.visitorName = foundRow[i];
          if (headerLower === 'mobile number') visitorData.mobileNumber = foundRow[i];
          if (headerLower === 'visitor address') visitorData.visitorAddress = foundRow[i];
          if (headerLower === 'purpose of visit') visitorData.purposeOfVisit = foundRow[i];
          if (headerLower === 'person to meet') visitorData.personToMeet = foundRow[i];
        });

        return { success: true, found: true, data: visitorData };
      }
    }
    return { success: true, found: false };
  } catch (error) {
    return { success: false, found: false };
  }
};
