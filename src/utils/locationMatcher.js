const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwGN0L4CqcZdhgie3l94KGGjWHqaL_cHRgwtw1CCUZy6yqpF5lFlFNBbO10dEm7BNK6FQ/exec";

/**
 * Calculates distance between two latitude/longitude pairs in meters using the Haversine formula.
 */
export const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const p1 = parseFloat(lat1);
  const p2 = parseFloat(lon1);
  const q1 = parseFloat(lat2);
  const q2 = parseFloat(lon2);

  if (isNaN(p1) || isNaN(p2) || isNaN(q1) || isNaN(q2)) {
    return Infinity;
  }

  const R = 6371000; // Radius of Earth in meters
  const rad = Math.PI / 180;
  const dLat = (q1 - p1) * rad;
  const dLon = (q2 - p2) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(p1 * rad) * Math.cos(q1 * rad) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Fetches company location master entries from the Master sheet.
 * Master sheet columns: Name of the Company(O) -> Col 14, Latitude(P) -> Col 15, Longitude(Q) -> Col 16
 */
export const fetchMasterCompanies = async () => {
  try {
    const response = await fetch(`${SCRIPT_URL}?sheet=Master&action=fetch`);
    if (!response.ok) return [];

    const result = await response.json();
    if (!result.success || !Array.isArray(result.data)) return [];

    const rawData = result.data;
    if (rawData.length < 2) return [];

    // Default indices based on specification: O = 14, P = 15, Q = 16
    let companyIdx = 14;
    let latIdx = 15;
    let lngIdx = 16;

    // Check header row for dynamic indices if available
    for (let i = 0; i < Math.min(rawData.length, 5); i++) {
      const row = rawData[i];
      if (row && Array.isArray(row)) {
        const cI = row.findIndex(cell => cell && cell.toString().toLowerCase().includes('company'));
        const laI = row.findIndex(cell => cell && cell.toString().toLowerCase().includes('latitude'));
        const loI = row.findIndex(cell => cell && cell.toString().toLowerCase().includes('longitude'));
        if (cI !== -1 && laI !== -1 && loI !== -1) {
          companyIdx = cI;
          latIdx = laI;
          lngIdx = loI;
          break;
        }
      }
    }

    return rawData.slice(1).map(row => ({
      name: row[companyIdx]?.toString().trim() || '',
      latitude: parseFloat(row[latIdx]),
      longitude: parseFloat(row[lngIdx])
    })).filter(c => !isNaN(c.latitude) && !isNaN(c.longitude));
  } catch (err) {
    console.error("Error fetching master companies:", err);
    return [];
  }
};

/**
 * Evaluates whether submitted latitude/longitude matches company location in master sheet (within ~200m).
 * Returns "Location Matched" if within 200 meters, otherwise "Location Not Matched".
 */
export const evaluateLocationMatch = (submittedLat, submittedLng, companyName = '', masterCompanies = []) => {
  if (!submittedLat || !submittedLng || !Array.isArray(masterCompanies) || masterCompanies.length === 0) {
    return "Location Not Matched";
  }

  const sLat = parseFloat(submittedLat);
  const sLng = parseFloat(submittedLng);
  if (isNaN(sLat) || isNaN(sLng)) return "Location Not Matched";

  // Filter company locations matching companyName if specified
  let targetCompanies = masterCompanies;
  if (companyName && companyName.trim() !== '') {
    const term = companyName.trim().toLowerCase();
    const matched = masterCompanies.filter(c => 
      c.name.toLowerCase().includes(term) || term.includes(c.name.toLowerCase())
    );
    if (matched.length > 0) {
      targetCompanies = matched;
    }
  }

  // Check if submitted location is within 200m of any target company location
  for (const company of targetCompanies) {
    const dist = calculateDistanceMeters(sLat, sLng, company.latitude, company.longitude);
    if (dist <= 200) {
      return "Location Matched";
    }
  }

  return "Location Not Matched";
};
