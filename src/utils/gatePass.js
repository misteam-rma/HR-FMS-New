const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwGN0L4CqcZdhgie3l94KGGjWHqaL_cHRgwtw1CCUZy6yqpF5lFlFNBbO10dEm7BNK6FQ/exec";

export const DEFAULT_HOD_NAMES = ['Deepak', 'Vikas', 'Dharam', 'Pratap', 'Aubhav'];

export const normalizeGatePassStatus = (value) => {
  const status = value?.toString().trim().toLowerCase() || 'pending';

  if (status === 'approved') return 'approved';
  if (status === 'rejected') return 'rejected';
  if (status === 'closed') return 'closed';
  return 'pending';
};

const splitVisitDetails = (value) => {
  const text = value?.toString().trim() || '';
  const separatorIndex = text.indexOf(' - ');

  if (separatorIndex === -1) {
    return {
      visitPlace: text,
      visitReason: '',
    };
  }

  return {
    visitPlace: text.slice(0, separatorIndex),
    visitReason: text.slice(separatorIndex + 3),
  };
};

export const parseGatePassRows = (rows = []) =>
  rows.slice(1).map((row) => {
    const { visitPlace, visitReason } = splitVisitDetails(row[5]);

    return {
      timestamp: row[0] || '',
      serialNo: row[1]?.toString() || '',
      employeeId: row[2]?.toString() || '',
      employeeName: row[3]?.toString() || '',
      department: row[4]?.toString() || '',
      visitDetails: row[5]?.toString() || '',
      visitPlace,
      visitReason,
      departureTime: row[6] || '',
      arrivalTime: row[7] || '',
      hodName: row[8]?.toString() || '',
      whatsappNumber: row[9]?.toString() || '',
      gatePassImage: row[10]?.toString() || '',
      status: normalizeGatePassStatus(row[11]),
    };
  });

export const parseSheetDate = (value) => {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  const text = value.toString().trim();
  const nativeDate = new Date(text);
  if (!Number.isNaN(nativeDate.getTime())) {
    return nativeDate;
  }

  const [datePart, timePart = '00:00:00'] = text.split(' ');
  const dateSegments = datePart.split(/[/-]/).map((segment) => parseInt(segment, 10));
  if (dateSegments.length !== 3 || dateSegments.some(Number.isNaN)) {
    return null;
  }

  let day;
  let month;
  let year;

  if (dateSegments[0] > 12) {
    [day, month, year] = dateSegments;
  } else if (dateSegments[1] > 12) {
    [month, day, year] = dateSegments;
  } else {
    [day, month, year] = dateSegments;
  }

  if (year < 100) {
    year += 2000;
  }

  const [hours = 0, minutes = 0, seconds = 0] = timePart.split(':').map((segment) => parseInt(segment, 10) || 0);
  const parsed = new Date(year, month - 1, day, hours, minutes, seconds);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatTimestampForSheet = (date = new Date()) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

export const formatDateForSheet = (value) => {
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export const formatDisplayDate = (value, fallback = '-') => {
  const parsed = parseSheetDate(value);
  if (!parsed) {
    return value || fallback;
  }

  return parsed.toLocaleDateString('en-GB');
};

export const formatDisplayDateTime = (value, fallback = '-') => {
  const parsed = parseSheetDate(value);
  if (!parsed) {
    return value || fallback;
  }

  return parsed.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const isSameDay = (left, right = new Date()) => {
  if (!left) return false;
  return (
    left.getDate() === right.getDate() &&
    left.getMonth() === right.getMonth() &&
    left.getFullYear() === right.getFullYear()
  );
};

export const isSameMonth = (left, right = new Date()) => {
  if (!left) return false;
  return left.getMonth() === right.getMonth() && left.getFullYear() === right.getFullYear();
};

export const getNextSerialNo = (entries = []) => {
  const maxSerial = entries.reduce((max, entry) => {
    const current = parseInt(entry.serialNo, 10);
    return Number.isNaN(current) ? max : Math.max(max, current);
  }, 0);

  return String(maxSerial + 1);
};

export const fetchGatePassEntries = async () => {
  const response = await fetch(`${SCRIPT_URL}?sheet=Gate%20Pass&action=fetch`);
  const result = await response.json();

  if (!result.success) {
    throw new Error('Failed to load gate pass data');
  }

  return parseGatePassRows(result.data || []);
};

export const fetchGatePassSheetRows = async () => {
  const response = await fetch(`${SCRIPT_URL}?sheet=Gate%20Pass&action=fetch`);
  const result = await response.json();

  if (!result.success) {
    throw new Error('Failed to load gate pass data');
  }

  return result.data || [];
};

export const fetchGatePassEmployees = async () => {
  const response = await fetch(`${SCRIPT_URL}?sheet=JOINING&action=fetch`);
  const result = await response.json();

  if (!result.success) {
    throw new Error('Failed to load employee data');
  }

  return (result.data || [])
    .slice(1)
    .map((row) => ({
      id: row[1] || '',
      name: row[2] || '',
      department: row[20] || '',
      whatsappNumber: row[11] || '',
    }))
    .filter((employee) => employee.id && employee.name);
};

export const fetchGatePassHodNames = async () => {
  const response = await fetch(`${SCRIPT_URL}?sheet=Master&action=fetch`);
  const result = await response.json();

  if (!result.success) {
    return DEFAULT_HOD_NAMES;
  }

  const names = (result.data || [])
    .slice(1)
    .map((row) => row[0])
    .filter(Boolean);

  return names.length ? names : DEFAULT_HOD_NAMES;
};

export const uploadGatePassImage = async (file) => {
  const base64Data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });

  const response = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      action: 'uploadFile',
      base64Data,
      fileName: file.name,
      mimeType: file.type,
      folderId: import.meta.env.VITE_GOOGLE_DRIVE_GATEPASS_FOLDER_ID,
    }),
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to upload image');
  }

  return result.fileUrl;
};

export const createGatePassRequest = async (formData, entries = []) => {
  const imageUrl = formData.gatePassImage ? await uploadGatePassImage(formData.gatePassImage) : '';
  const serialNo = getNextSerialNo(entries);
  const rowData = [
    formatTimestampForSheet(new Date()),
    serialNo,
    formData.employeeId,
    formData.employeeName,
    formData.department,
    `${formData.visitPlace} - ${formData.visitReason}`,
    formatDateForSheet(formData.departureTime),
    formatDateForSheet(formData.arrivalTime),
    formData.hodName,
    formData.whatsappNumber,
    imageUrl,
    'pending',
  ];

  const response = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      action: 'insert',
      sheetName: 'Gate Pass',
      rowData: JSON.stringify(rowData),
    }),
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to submit gate pass request');
  }

  return { serialNo, imageUrl };
};

export const updateGatePassStatus = async (serialNo, status) => {
  const rows = await fetchGatePassSheetRows();
  const rowIndex = rows.findIndex((row) => row[1]?.toString() === serialNo?.toString());

  if (rowIndex === -1) {
    throw new Error('Could not find the selected gate pass in the sheet');
  }

  const response = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      action: 'updateCell',
      sheetName: 'Gate Pass',
      rowIndex: String(rowIndex + 1),
      columnIndex: '12',
      value: normalizeGatePassStatus(status),
    }),
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to update gate pass status');
  }
};
