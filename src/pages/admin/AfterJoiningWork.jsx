import React, { useState, useEffect } from 'react';
import { Filter, Search, Clock, CheckCircle, X, Calendar, ChevronDown, Check, ChevronUp, Upload } from 'lucide-react';
import useDataStore from '../../store/dataStore';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';

const AfterJoiningWork = () => {
  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [pendingData, setPendingData] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [filterDepartment, setFilterDepartment] = useState("");
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const [filterDate, setFilterDate] = useState("");

  // Pagination State (Synced with CallTracker.jsx)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [uploadStage, setUploadStage] = useState("");

  const [formData, setFormData] = useState({
    checkSalarySlipResume: false,
    checkSalarySlipResumeImage: null,
    checkSalarySlipResumeImageUrl: "",
    offerLetterReceived: false,
    offerLetterImage: null,
    offerLetterImageUrl: "",
    welcomeMeeting: false,
    welcomeMeetingImage: null,
    welcomeMeetingImageUrl: "",
    biometricAccess: false,
    punchCode: "",
    idCode: "",
    idPin: "",
    idPassword: "",
    officialEmailId: false,
    emailId: "",
    emailPassword: "",
    assignAssets: false,
    laptop: "",
    laptopCompanyName: "",
    laptopImei: "",
    laptopModelNumber: "",
    mobile: "",
    mobileName: "",
    mobileImei: "",
    mobileModelName: "",
    vehicle: "",
    vehicleName: "",
    vehicleNumber: "",
    other: "",
    simCompanyName: "",
    simNumber: "",
    manualImage: null,
    manualImageUrl: "",
    pfEsic: false,
    pfEsicImage: null,
    pfEsicImageUrl: "",
    companyDirectory: false,
    assets: [],
  });

  // Google Drive folder ID for storing images
  const DRIVE_FOLDER_ID = import.meta.env.VITE_GOOGLE_DRIVE_AFTER_JOINING_FOLDER_ID;

  // Helper: get current server timestamp
  const fetchServerTimestamp = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_APPS_SCRIPT_URL}?action=ping`);
      const data = await res.json();
      if (data.success && data.serverTime) {
        let serverTimeStr = data.serverTime;
        if (serverTimeStr && serverTimeStr.includes('2028')) {
          serverTimeStr = serverTimeStr.replace('2028', '2026');
        }
        return serverTimeStr;
      }
    } catch (err) {
      console.warn('Failed to fetch server time, falling back to local', err);
    }
    const now = new Date();
    const pad = (num) => String(num).padStart(2, '0');
    const enforcedYear = now.getFullYear() === 2028 ? 2026 : now.getFullYear();
    return `${pad(now.getMonth() + 1)}/${pad(now.getDate())}/${enforcedYear} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  };

  const fetchJoiningData = async () => {
    setLoading(true);
    setTableLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=JOINING&action=fetch`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("Raw JOINING API response:", result);

      if (!result.success) {
        throw new Error(
          result.error || "Failed to fetch data from JOINING sheet"
        );
      }

      const rawData = result.data || result;

      if (!Array.isArray(rawData)) {
        throw new Error("Expected array data not received");
      }

      const headers = rawData[5];
      const dataRows = rawData.length > 6 ? rawData.slice(6) : [];

      const getIndex = (headerName) => {
        const index = headers.findIndex(
          (h) =>
            h && h.toString().trim().toLowerCase() === headerName.toLowerCase()
        );
        return index;
      };

      const processedData = dataRows.map((row) => ({
        // Explicit mapping for Pending Table (Columns B-AE)
        joiningNo: row[1] || "",
        enquiryNo: row[2] || "",
        indentType: row[3] || "",
        department: row[4] || "",
        designation: row[5] || "", // Post
        candidateName: row[6] || "", // Name As Per Aadhar
        gender: row[7] || "",
        bodAsPerAadhar: row[8] || "", // Date Of Birth
        mobileNo: row[9] || "", // Phone Number
        email: row[10] || "", // Personal Email-Id
        emergencyName: row[11] || "", // Emergency Contact Person Name
        familyMobileNo: row[12] || "", // Emergency Contact Person Number
        relationWithFamily: row[13] || "", // Relationship With Emergency Contact Person
        qualification: row[14] || "", // Highest Qualification
        aadharNo: row[15] || "", // Aadhar Number
        aadharPhoto: row[16] || "", // Aadhar Photo
        addressAsPerAadhar: row[17] || "", // Permanent Address
        currentAddress: row[18] || "", // Current Address
        dateOfJoining: row[19] || "", // Date Of Joining
        teamHead: row[20] || "",
        registrationUnder: row[21] || "",
        bankName: row[22] || "",
        accountNo: row[23] || "", // Current Bank A.C No.
        ifscCode: row[24] || "",
        candidatePhoto: row[25] || "", // Candidate's Photo Password Size
        passbookPhoto: row[26] || "", // Photo Of Bank Passbook
        panPhoto: row[27] || "",
        studentIdPhoto: row[28] || "",
        resumeCopy: row[29] || "",
        reportingTo: row[30] || "",

        // State properties preserved for compatibility
        timestamp: row[getIndex("Timestamp")] || "",
        joiningPlace: row[getIndex("Joining Place")] || "",
        fatherName: row[getIndex("Father / Husband name")] || "",
        panCard: row[getIndex("Pan card")] || "",
        pfId: row[getIndex("Past Pf Id No. (If Any)")] || "",
        branchName: row[getIndex("Branch Name")] || "",
        esicNo: row[getIndex("ESIC No (IF Any)")] || "",
        pfEligible: row[getIndex("PF Eligible")] || "",
        esicEligible: row[getIndex("ESIC Eligible")] || "",
        companyName: row[getIndex("Joining Company Name")] || "",
        emailToBeIssue: row[getIndex("Email ID To Be Issue")] || "",
        issueMobile: row[getIndex("Issue Mobile")] || "",
        issueLaptop: row[getIndex("Issue Laptop")] || "",
        modeOfAttendance: row[getIndex("Mode Of Attendance")] || "",
        quaficationPhoto: row[getIndex("Quafication Photo")] || "",
        paymentMode: row[getIndex("Payment Mode")] || "",
        salarySlip: row[getIndex("Salary Slip")] || "",
        plannedDate: getIndex("Planned Date") !== -1 ? row[getIndex("Planned Date")] : row[33] || "",
        actual: getIndex("Actual") !== -1 ? row[getIndex("Actual")] : row[34] || "",
        checkSalarySlipResume: row[getIndex("Check Salary Slip & Resume Copy")] || row[29] || "",
        offerLetterReceived: row[getIndex("Offer Letter Received")] || row[30] || "",
        welcomeMeeting: row[getIndex("Welcome Meeting")] || row[31] || "",
        biometricAccess: row[getIndex("ID / Password")] || row[32] || "",
        officialEmailId: row[getIndex("Official Email ID")] || row[33] || "",
        assignAssets: row[getIndex("Assign Assets")] || row[34] || "",
        pfEsic: row[getIndex("PF / ESIC")] || row[35] || "",
        companyDirectory: row[getIndex("Company Directory")] || row[36] || "",
      }));

      const pendingTasks = processedData.filter(
        (task) => task.joiningNo && task.plannedDate && !task.actual
      );
      console.log("Processed joining data:", processedData);
      setPendingData(pendingTasks);

      try {
        const assetsResponse = await fetch(
          `${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=Assets&action=fetch`
        );
        if (assetsResponse.ok) {
          const assetsResult = await assetsResponse.json();
          if (assetsResult.success) {
            const rawAssetsData = assetsResult.data || assetsResult;
            if (Array.isArray(rawAssetsData) && rawAssetsData.length > 0) {
              let assetsHeaderIndex = rawAssetsData.findIndex((row) =>
                row.some((cell) =>
                  cell?.toString().trim().toLowerCase().includes("employee id")
                )
              );
              if (assetsHeaderIndex === -1) assetsHeaderIndex = 0;

              const assetsRows = rawAssetsData.slice(assetsHeaderIndex + 1);

              const processedHistory = assetsRows.map((row) => ({
                timestamp: row[0] || "",
                joiningNo: row[1] || "",
                employeeId: row[1] || "",
                employeeType: row[2] || "",
                candidateName: row[3] || "",
                emailId: row[4] || "",
                emailPassword: row[5] || "",
                laptopCompanyName: row[6] || "",
                laptopModelNumber: row[7] || "",
                laptopImei: row[8] || "",
                mobileName: row[9] || "",
                mobileModelName: row[10] || "",
                mobileImei: row[11] || "",
                vehicleName: row[12] || "",
                vehicleNumber: row[13] || "",
                simCompanyName: row[14] || "",
                simNumber: row[15] || "",
                idCode: row[16] || "",
                idPin: row[17] || "",
                idPassword: row[18] || "",
                offerLetterImageUrl: row[19] || "",
                welcomeMeetingImageUrl: row[20] || "",
                pfEsicImageUrl: row[21] || "",
                
                // Maintain mapping for dynamic lookups
                designation: row[2] || "",
                dateOfJoining: row[0] || ""
              }));

              setHistoryData(processedHistory.filter(item => item.employeeId));
            }
          }
        }
      } catch (assetsError) {
        console.error("Failed to fetch Assets history:", assetsError);
      }
    } catch (error) {
      console.error("Error fetching joining data:", error);
      setError(error.message);
      toast.error(`Failed to load joining data: ${error.message}`);
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  // Fetch previous assets data from Assets sheet
  const fetchAssetsData = async (employeeId) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=Assets&action=fetch`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        return null;
      }

      const data = result.data || result;
      if (!Array.isArray(data) || data.length < 2) {
        return null;
      }

      // Find the row with matching employee ID (column B, index 1)
      const matchingRow = data.find((row, index) => {
        if (index === 0) return false; // Skip header row
        return row[1]?.toString().trim() === employeeId?.toString().trim();
      });

      if (matchingRow) {
        return {
          emailId: matchingRow[4] || "",
          emailPassword: matchingRow[5] || "",
          laptopCompanyName: matchingRow[6] || "",
          laptopModelNumber: matchingRow[7] || "",
          laptopImei: matchingRow[8] || "",
          mobileName: matchingRow[9] || "",
          mobileModelName: matchingRow[10] || "",
          mobileImei: matchingRow[11] || "",
          vehicleName: matchingRow[12] || "",
          vehicleNumber: matchingRow[13] || "",
          simCompanyName: matchingRow[14] || "",
          simNumber: matchingRow[15] || "",
          idCode: matchingRow[16] || "",
          idPin: matchingRow[17] || "",
          idPassword: matchingRow[18] || "",
          offerLetterImageUrl: matchingRow[19] || "",
          welcomeMeetingImageUrl: matchingRow[20] || "",
          pfEsicImageUrl: matchingRow[21] || "",
          checkSalarySlipResumeImageUrl: matchingRow[22] || "",
          manualImageUrl: matchingRow[23] || "",
          
          // Support backward structural safety
          laptop: matchingRow[6] || "",
          mobile: matchingRow[9] || "",
          vehicle: matchingRow[12] || "",
          other: matchingRow[14] || "",
          punchCode: matchingRow[16] || "",
        };
      }

      return null;
    } catch (error) {
      console.error("Error fetching assets data:", error);
      return null;
    }
  };


  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  // Upload image to Google Drive
  const uploadImageToDrive = async (file, fileName) => {
    const primaryFolderId = import.meta.env.VITE_GOOGLE_DRIVE_AFTER_JOINING_FOLDER_ID;
    const enquiryId = import.meta.env.VITE_GOOGLE_DRIVE_ENQUIRY_FOLDER_ID;
    const photoId = import.meta.env.VITE_GOOGLE_DRIVE_PHOTO_FOLDER_ID;
    
    const foldersToTry = [];
    if (primaryFolderId) foldersToTry.push(primaryFolderId);
    if (enquiryId && !foldersToTry.includes(enquiryId)) foldersToTry.push(enquiryId);
    if (photoId && !foldersToTry.includes(photoId)) foldersToTry.push(photoId);
    if (DRIVE_FOLDER_ID && !foldersToTry.includes(DRIVE_FOLDER_ID)) foldersToTry.push(DRIVE_FOLDER_ID);

    let lastError = null;
    
    for (const folderId of foldersToTry) {
      let attempts = 0;
      while (attempts < 2) {
        try {
          const base64Data = await fileToBase64(file);
          console.log(`Uploading file with folderId: ${folderId} (Attempt ${attempts + 1})`);
          
          const response = await fetch(
            import.meta.env.VITE_APPS_SCRIPT_URL,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                action: "uploadFile",
                base64Data: base64Data,
                fileName: fileName,
                mimeType: file.type,
                folderId: folderId,
              }),
            }
          );

          const result = await response.json();
          if (result.success) {
            return result.fileUrl;
          } else {
            lastError = new Error(result.error || "Upload failed");
          }
        } catch (error) {
          lastError = error;
        }
        attempts++;
        if (attempts < 2) {
          console.log(`Retrying file upload to folderId: ${folderId}`);
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
    }

    console.error("Error uploading file to all designated folders:", lastError);
    throw lastError || new Error("Failed to upload file to Google Drive");
  };

  useEffect(() => {
    fetchJoiningData();
  }, []);

  const handleAfterJoiningClick = async (item) => {
    // Reset form data first
    setFormData({
      checkSalarySlipResume: false,
      checkSalarySlipResumeImage: null,
      checkSalarySlipResumeImageUrl: "",
      offerLetterReceived: false,
      welcomeMeeting: false,
      biometricAccess: false,
      punchCode: "", // Initialize punch code
      officialEmailId: false,
      emailId: "",
      emailPassword: "",
      assignAssets: false,
      laptop: "",
      mobile: "",
      vehicle: "",
      other: "",
      manualImage: null,
      manualImageUrl: "",
      pfEsic: false,
      companyDirectory: false,
      assets: [],
    });

    setSelectedItem(item);
    setShowModal(true);
    setLoading(true);

    try {
      // Fetch previous assets data first
      const assetsData = await fetchAssetsData(item.joiningNo);

      const currentValues = {
        checkSalarySlipResume: false,
        offerLetterReceived: false,
        welcomeMeeting: false,
        biometricAccess: false,
        officialEmailId: false,
        assignAssets: false,
        pfEsic: false,
        companyDirectory: false,
      };

      // Merge with assets data if available
      const parseAssetDetail = (str, key) => {
        if (!str) return "";
        const regex = new RegExp(`${key}:\\s*([^,]+)`);
        const match = str.match(regex);
        return match ? match[1].trim() : "";
      };

      const laptopStr = assetsData?.laptop || "";
      const mobileStr = assetsData?.mobile || "";
      const vehicleStr = assetsData?.vehicle || "";
      const otherStr = assetsData?.other || "";

      const punchStr = assetsData?.punchCode || "";

      const finalFormData = {
        ...currentValues,
        punchCode: punchStr,
        idCode: assetsData?.idCode || parseAssetDetail(punchStr, "Code") || (punchStr.includes(":") ? "" : punchStr),
        idPin: assetsData?.idPin || parseAssetDetail(punchStr, "PIN"),
        idPassword: assetsData?.idPassword || parseAssetDetail(punchStr, "Password"),
        emailId: assetsData?.emailId || "",
        emailPassword: assetsData?.emailPassword || "",
        laptop: laptopStr,
        laptopCompanyName: assetsData?.laptopCompanyName || parseAssetDetail(laptopStr, "Company") || (laptopStr.includes(":") ? "" : laptopStr),
        laptopImei: assetsData?.laptopImei || parseAssetDetail(laptopStr, "IMEI"),
        laptopModelNumber: assetsData?.laptopModelNumber || parseAssetDetail(laptopStr, "Model"),
        mobile: mobileStr,
        mobileName: assetsData?.mobileName || parseAssetDetail(mobileStr, "Name") || (mobileStr.includes(":") ? "" : mobileStr),
        mobileImei: assetsData?.mobileImei || parseAssetDetail(mobileStr, "IMEI"),
        mobileModelName: assetsData?.mobileModelName || parseAssetDetail(mobileStr, "Model"),
        vehicle: vehicleStr,
        vehicleName: assetsData?.vehicleName || parseAssetDetail(vehicleStr, "Name") || (vehicleStr.includes(":") ? "" : vehicleStr),
        vehicleNumber: assetsData?.vehicleNumber || parseAssetDetail(vehicleStr, "Number"),
        other: otherStr,
        simCompanyName: assetsData?.simCompanyName || parseAssetDetail(otherStr, "Company") || (otherStr.includes(":") ? "" : otherStr),
        simNumber: assetsData?.simNumber || parseAssetDetail(otherStr, "SIM"),
        manualImageUrl: assetsData?.manualImageUrl || "",
        offerLetterImageUrl: assetsData?.offerLetterImageUrl || "",
        welcomeMeetingImageUrl: assetsData?.welcomeMeetingImageUrl || "",
        pfEsicImageUrl: assetsData?.pfEsicImageUrl || "",
        checkSalarySlipResumeImageUrl: assetsData?.checkSalarySlipResumeImageUrl || "",
        manualImage: null,
        checkSalarySlipResumeImage: null,
        offerLetterImage: null,
        welcomeMeetingImage: null,
        pfEsicImage: null,
        assets: [],
      };

      setFormData(prev => ({
        ...prev,
        ...finalFormData
      }));

    } catch (error) {
      console.error("Error fetching current values:", error);
      // Keep the default reset values if there's an error
      toast.error("Failed to load current values");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (name) => {
    setFormData((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageUpload = (e, fieldName) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setFormData((prev) => ({
        ...prev,
        [fieldName]: file,
      }));
    }
  };

  // Save assets data to Assets sheet
  const saveAssetsData = async (employeeId, employeeName, assetsData) => {
    try {
      const timestamp = await fetchServerTimestamp();

      const rowData = [
        timestamp,                      // Column A
        employeeId,                     // Column B
        assetsData.employeeType || "", // Column C
        employeeName,                   // Column D
        assetsData.emailId || "",       // Column E
        assetsData.emailPassword || "", // Column F
        assetsData.laptopCompanyName || "", // Column G
        assetsData.laptopModelNumber || "", // Column H
        assetsData.laptopImei || "",        // Column I
        assetsData.mobileName || "",        // Column J
        assetsData.mobileModelName || "",   // Column K
        assetsData.mobileImei || "",        // Column L
        assetsData.vehicleName || "",       // Column M
        assetsData.vehicleNumber || "",     // Column N
        assetsData.simCompanyName || "",    // Column O
        assetsData.simNumber || "",         // Column P
        assetsData.idCode || "",            // Column Q
        assetsData.idPin || "",             // Column R
        assetsData.idPassword || "",        // Column S
        assetsData.offerLetterImageUrl || "", // Column T
        assetsData.welcomeMeetingImageUrl || "", // Column U
        assetsData.pfEsicImageUrl || "",      // Column V
        assetsData.checkSalarySlipResumeImageUrl || "", // Column W
        assetsData.manualImageUrl || ""                 // Column X
      ];

      // First, check if record exists
      const existingData = await fetchAssetsData(employeeId);

      if (existingData) {
        // Update existing record - find the row and update it
        const fetchResponse = await fetch(
          `${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=Assets&action=fetch`
        );
        const result = await fetchResponse.json();
        const data = result.data || result;

        const rowIndex = data.findIndex((row, index) => {
          if (index === 0) return false; // Skip header
          return row[1]?.toString().trim() === employeeId?.toString().trim();
        });

        if (rowIndex !== -1) {
          // Update existing row
          const response = await fetch(
            import.meta.env.VITE_APPS_SCRIPT_URL,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                sheetName: "Assets",
                action: "update",
                rowIndex: (rowIndex + 1).toString(),
                rowData: JSON.stringify(rowData),
              }).toString(),
            }
          );
          return await response.json();
        }
      }

      // Insert new record
      const response = await fetch(
        import.meta.env.VITE_APPS_SCRIPT_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            sheetName: "Assets",
            action: "insert",
            rowData: JSON.stringify(rowData),
          }).toString(),
        }
      );

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to save assets data: ${error.message}`);
    }
  };

  // Save data to USER sheet
  const saveUserData = async (selectedItem, formData) => {
    try {
      // Generate timestamp in M/D/YYYY H:mm:ss format
     const now = new Date();

const pad = (num) => String(num).padStart(2, '0');

const timestamp = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      // Fetch current USER sheet to determine next Serial No
      const fetchResponse = await fetch(`${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=USER&action=fetch`);
      const result = await fetchResponse.json();
      const existingData = result.success ? (result.data || result) : [];
      
      // Find max serial number from existing data (looking for SN-XXX format)
      let maxNum = 0;
      if (Array.isArray(existingData) && existingData.length > 1) {
          // Skip header row (USER sheet has 1 header row at index 0)
          const rows = existingData.slice(1);
          rows.forEach(row => {
              const snString = row[1]?.toString() || ""; // Serial no is index 1 (Column B)
              const match = snString.match(/SN-(\d+)/);
              if (match) {
                  const num = parseInt(match[1], 10);
                  if (num > maxNum) maxNum = num;
              } else {
                  // Fallback for simple numeric SNs
                  const num = parseInt(snString, 10);
                  if (!isNaN(num) && num > maxNum) maxNum = num;
              }
          });
      }
      const nextSerial = `SN-${String(maxNum + 1).padStart(3, '0')}`;

      const rowData = [
        timestamp,                              // 1. Col A - Timestamp
        nextSerial,                             // 2. Col B - Serial no
        selectedItem.candidateName || "",       // 3. Col C - Name
        selectedItem.indentType || "",          // 4. Col D - Employee Type
        selectedItem.mobileNo || "",            // 5. Col E - Phone No
        formData.emailId || "",                 // 6. Col F - Gmail
        formData.idCode || "",                  // 7. Col G - Code
        formData.idPin || "",                   // 8. Col H - PIN
        formData.idPassword || "",              // 9. Col I - Password
        selectedItem.indentType || "",          // 10. Col J - Role (Same as Col D)
        selectedItem.department || "",          // 11. Col K - Department
        "user"                                  // 12. Col L - Admin Status
      ];

      await fetch(
        import.meta.env.VITE_APPS_SCRIPT_URL,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            sheetName: "USER",
            action: "insert",
            rowData: JSON.stringify(rowData),
          }).toString(),
        }
      );
    } catch (error) {
      console.error("Error saving to USER sheet:", error);
      // We don't throw here to ensure the main onboarding process continues even if USER sheet sync fails
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSubmitting(true);

    if (!selectedItem.joiningNo || !selectedItem.candidateName) {
      toast.error("Please fill all required fields");
      setSubmitting(false);
      return;
    }

    try {
      const toastId = toast.loading('Preparing documents for secure upload...');

      // Upload manual image if new file selected (only for company directory)
      // Upload images if new files selected
      let manualImageUrl = formData.manualImageUrl;
      let offerLetterImageUrl = formData.offerLetterImageUrl;
      let welcomeMeetingImageUrl = formData.welcomeMeetingImageUrl;
      let pfEsicImageUrl = formData.pfEsicImageUrl;
      let checkSalarySlipResumeImageUrl = formData.checkSalarySlipResumeImageUrl;

      setUploadStage("Preparing documents for secure upload...");
      if (formData.checkSalarySlipResumeImage) {
        try {
          toast.loading("Uploading Salary Slip / Resume document to Google Drive...", { id: toastId });
          setUploadStage("Uploading Salary Slip / Resume document to Google Drive...");
          checkSalarySlipResumeImageUrl = await uploadImageToDrive(
            formData.checkSalarySlipResumeImage,
            `${selectedItem.joiningNo}_salaryslipresume_${Date.now()}.${formData.checkSalarySlipResumeImage.name.split('.').pop()}`
          );
        } catch (error) {
          toast.error(`Failed to upload Salary Slip / Resume image: ${error.message}`);
          throw error;
        }
      }

      if (formData.manualImage) {
        try {
          toast.loading("Uploading Company Directory manual to Google Drive...", { id: toastId });
          setUploadStage("Uploading Company Directory manual to Google Drive...");
          manualImageUrl = await uploadImageToDrive(
            formData.manualImage,
            `${selectedItem.joiningNo}_manual_${Date.now()}.${formData.manualImage.name.split('.').pop()}`
          );
        } catch (error) {
          toast.dismiss(toastId);
          toast.error(`Failed to upload manual image: ${error.message}`);
          throw error;
        }
      }

      if (formData.offerLetterImage) {
        try {
          toast.loading("Uploading Offer Letter document to Google Drive...", { id: toastId });
          setUploadStage("Uploading Offer Letter document to Google Drive...");
          offerLetterImageUrl = await uploadImageToDrive(
            formData.offerLetterImage,
            `${selectedItem.joiningNo}_offerletter_${Date.now()}.${formData.offerLetterImage.name.split('.').pop()}`
          );
        } catch (error) {
          toast.dismiss(toastId);
          toast.error(`Failed to upload offer letter image: ${error.message}`);
          throw error;
        }
      }

      if (formData.welcomeMeetingImage) {
        try {
          toast.loading("Uploading Welcome Meeting photo to Google Drive...", { id: toastId });
          setUploadStage("Uploading Welcome Meeting photo to Google Drive...");
          welcomeMeetingImageUrl = await uploadImageToDrive(
            formData.welcomeMeetingImage,
            `${selectedItem.joiningNo}_welcomemeeting_${Date.now()}.${formData.welcomeMeetingImage.name.split('.').pop()}`
          );
        } catch (error) {
          toast.dismiss(toastId);
          toast.error(`Failed to upload welcome meeting image: ${error.message}`);
          throw error;
        }
      }

      if (formData.pfEsicImage) {
        try {
          toast.loading("Uploading PF/ESIC proof to Google Drive...", { id: toastId });
          setUploadStage("Uploading PF/ESIC proof to Google Drive...");
          pfEsicImageUrl = await uploadImageToDrive(
            formData.pfEsicImage,
            `${selectedItem.joiningNo}_pfesic_${Date.now()}.${formData.pfEsicImage.name.split('.').pop()}`
          );
        } catch (error) {
          toast.dismiss(toastId);
          toast.error(`Failed to upload PF/ESIC image: ${error.message}`);
          throw error;
        }
      }

      // Save assets data
      toast.loading("Saving asset allocations and document links...", { id: toastId });
      setUploadStage("Saving asset allocations and document links...");
      await saveAssetsData(selectedItem.joiningNo, selectedItem.candidateName, {
        employeeType: selectedItem.indentType || "",
        emailId: formData.emailId,
        emailPassword: formData.emailPassword,
        laptopCompanyName: formData.laptopCompanyName,
        laptopModelNumber: formData.laptopModelNumber,
        laptopImei: formData.laptopImei,
        mobileName: formData.mobileName,
        mobileModelName: formData.mobileModelName,
        mobileImei: formData.mobileImei,
        vehicleName: formData.vehicleName,
        vehicleNumber: formData.vehicleNumber,
        simCompanyName: formData.simCompanyName,
        simNumber: formData.simNumber,
        idCode: formData.idCode,
        idPin: formData.idPin,
        idPassword: formData.idPassword,
        offerLetterImageUrl: offerLetterImageUrl,
        welcomeMeetingImageUrl: welcomeMeetingImageUrl,
        pfEsicImageUrl: pfEsicImageUrl,
        checkSalarySlipResumeImageUrl: checkSalarySlipResumeImageUrl,
        manualImageUrl: manualImageUrl
      });

      // Save User credentials to USER sheet
      setUploadStage("Synchronizing user credentials with secure database...");
      await saveUserData(selectedItem, formData);

      // Continue with existing logic for updating JOINING sheet
      const fullDataResponse = await fetch(
        `${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=JOINING&action=fetch`
      );
      if (!fullDataResponse.ok) {
        throw new Error(`HTTP error! status: ${fullDataResponse.status}`);
      }

      const fullDataResult = await fullDataResponse.json();
      const allData = fullDataResult.data || fullDataResult;
      let headerRowIndex = allData.findIndex((row) =>
        row.some((cell) =>
          cell?.toString().trim().toLowerCase().includes("joining id")
        )
      );
      if (headerRowIndex === -1) headerRowIndex = 5;

      const headers = allData[headerRowIndex].map((h) => h?.toString().trim());
      const employeeIdIndex = headers.findIndex(
        (h) => h?.toLowerCase() === "joining id"
      );
      if (employeeIdIndex === -1) {
        throw new Error("Could not find 'Joining ID' column");
      }

      const rowIndex = allData.findIndex(
        (row, idx) =>
          idx > headerRowIndex &&
          row[employeeIdIndex]?.toString().trim() ===
          selectedItem.joiningNo?.toString().trim()
      );
      if (rowIndex === -1)
        throw new Error(`Employee ${selectedItem.joiningNo} not found`);

      const now = new Date();
      const enforcedYear = now.getFullYear() === 2028 ? 2026 : now.getFullYear();
      const pad = (num) => String(num).padStart(2, '0');
      
      // Format for display: DD/MM/YYYY
      const formattedTimestamp = `${now.getDate()}/${now.getMonth() + 1
        }/${enforcedYear}`;

      // Create full actual timestamp including time for industrial standards
      const actualTimestamp = `${pad(now.getMonth() + 1)}/${pad(now.getDate())}/${enforcedYear} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      const allFieldsYes =
        formData.checkSalarySlipResume &&
        formData.offerLetterReceived &&
        formData.welcomeMeeting &&
        formData.biometricAccess &&
        formData.officialEmailId &&
        formData.assignAssets &&
        formData.pfEsic &&
        formData.companyDirectory;

      const getColIndex = (name) => {
        const idx = headers.findIndex(
          (h) => h && h.toString().trim().toLowerCase() === name.toLowerCase()
        );
        return idx;
      };

      const colActual = getColIndex("Actual") !== -1 ? getColIndex("Actual") : 34; // Fallback to Column AI (index 34)
      
      const updatePromises = [];

      const updateCol = (colIdx, val) => {
        if (colIdx === -1 || colIdx === 33) return; // Column AH (index 33) is restricted from submission
        updatePromises.push(
          fetch(
            import.meta.env.VITE_APPS_SCRIPT_URL,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                sheetName: "JOINING",
                action: "updateCell",
                rowIndex: (rowIndex + 1).toString(),
                columnIndex: (colIdx + 1).toString(),
                value: val,
              }).toString(),
            }
          )
        );
      };

      // 1. Update Actual Timestamp when submitting data successfully from the form
      updateCol(colActual, actualTimestamp);

      // 2. Map checklist items dynamically
      const checklistFields = [
        { name: "Check Salary Slip & Resume Copy", value: formData.checkSalarySlipResume ? "Yes" : "No", fallbackIdx: 29 },
        { name: "Offer Letter Received", value: formData.offerLetterReceived ? "Yes" : "No", fallbackIdx: 30 },
        { name: "Welcome Meeting", value: formData.welcomeMeeting ? "Yes" : "No", fallbackIdx: 31 },
        { name: "ID / Password", value: formData.biometricAccess ? "Yes" : "No", fallbackIdx: 32 },
        { name: "Official Email ID", value: formData.officialEmailId ? "Yes" : "No", fallbackIdx: 33 },
        { name: "Assign Assets", value: formData.assignAssets ? "Yes" : "No", fallbackIdx: 34 },
        { name: "PF / ESIC", value: formData.pfEsic ? "Yes" : "No", fallbackIdx: 35 },
        { name: "Company Directory", value: formData.companyDirectory ? "Yes" : "No", fallbackIdx: 36 }
      ];

      checklistFields.forEach((field) => {
        let finalIdx = getColIndex(field.name);
        if (finalIdx === -1) {
          finalIdx = field.fallbackIdx;
        }
        updateCol(finalIdx, field.value);
      });

      setUploadStage("Updating JOINING sheet onboarding checklist milestones...");
      const responses = await Promise.all(updatePromises);
      const results = await Promise.all(responses.map((r) => r.json()));

      const hasError = results.some((result) => !result.success);
      if (hasError) {
        console.error("Some cell updates failed:", results);
        throw new Error("Some cell updates failed");
      }

      toast.dismiss(toastId);

      if (allFieldsYes) {
        toast.success("All conditions met! Data saved and actual date updated successfully.");
      } else {
        toast.success(
          "Data saved successfully. Actual date will be updated when all conditions are met."
        );
      }

      setShowModal(false);
      fetchJoiningData();
    } catch (error) {
      console.error("Update error:", error);
      toast.dismiss(toastId);
      toast.error(`Update failed: ${error.message}`);
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };


  const formatDOB = (dateString) => {
    if (!dateString) return "";

    // Handle the format "2021-11-01"
    if (dateString.includes('-')) {
      const parts = dateString.split('-');
      if (parts.length === 3) {
        const day = parts[2];
        const month = parts[1];
        const year = parts[0].slice(-2); // Get last 2 digits of year
        return `${day}/${month}/${year}`;
      }
    }

    // Fallback for other formats
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }

    const day = date.getDate();
    const month = date.getMonth() + 1; // Months are 0-indexed, so add 1
    const year = date.getFullYear().toString().slice(-2);

    return `${day}/${month}/${year}`;
  };

  const uniqueDepartments = Array.from(
    new Set(
      [...pendingData, ...historyData]
        .map((item) => item.department)
        .filter((dept) => dept && typeof dept === 'string' && dept.trim() !== "")
    )
  ).sort();

  // Combined Filter logic synced with CallTracker.jsx
  const filterRecords = (data) => {
    return data.filter((item) => {
      const matchesSearch =
        item.candidateName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.joiningNo?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDepartment = !filterDepartment || item.department === filterDepartment;

      let matchesDate = true;
      if (filterDate) {
        // Handle various date formats (e.g. 01/11/2021 or 2021-11-01)
        const getFormattedDate = (dateStr) => {
          if (!dateStr) return "";
          if (dateStr.includes('/')) {
            const [d, m, y] = dateStr.split(' ')[0].split('/');
            return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
          }
          try {
            return new Date(dateStr).toISOString().split('T')[0];
          } catch (e) {
            return "";
          }
        };
        const itemDate = getFormattedDate(item.dateOfJoining);
        matchesDate = itemDate === filterDate;
      }

      return matchesSearch && matchesDepartment && matchesDate;
    });
  };

  const filteredPendingData = filterRecords(pendingData);
  const filteredHistoryData = filterRecords(historyData);

  // Pagination Logic (Synced with CallTracker.jsx)
  const activeData = activeTab === "pending" ? filteredPendingData : filteredHistoryData;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = activeData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(activeData.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const renderPaginationNav = () => (
    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px w-full justify-center sm:w-auto" aria-label="Pagination">
      <button
        onClick={() => paginate(currentPage - 1)}
        disabled={currentPage === 1}
        className="relative inline-flex items-center px-1.5 py-1 sm:px-2 sm:py-1 rounded-l-md border border-gray-300 bg-white text-xs sm:text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="sr-only">Previous</span>
        <svg className="h-4 w-4 sm:h-4 sm:w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </button>

      {[...Array(totalPages)].map((_, i) => {
        const pageNum = i + 1;
        if (pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)) {
          return (
            <button
              key={pageNum}
              onClick={() => paginate(pageNum)}
              className={`relative inline-flex items-center px-2.5 py-1 sm:px-3 sm:py-1 border text-xs sm:text-sm font-medium ${currentPage === pageNum ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}`}
            >
              {pageNum}
            </button>
          );
        }
        if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
          return <span key={pageNum} className="relative inline-flex items-center px-2 py-1 border border-gray-300 bg-white text-xs sm:text-sm font-medium text-gray-700">...</span>;
        }
        return null;
      })}

      <button
        onClick={() => paginate(currentPage + 1)}
        disabled={currentPage === totalPages || totalPages === 0}
        className="relative inline-flex items-center px-1.5 py-1 sm:px-2 sm:py-1 rounded-r-md border border-gray-300 bg-white text-xs sm:text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="sr-only">Next</span>
        <svg className="h-4 w-4 sm:h-4 sm:w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      </button>
    </nav>
  );

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Fullscreen Data Submission Overlay */}
      {submitting && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[9999] flex flex-col items-center justify-center text-white">
          <div className="relative p-8 max-w-md w-full mx-4 bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl flex flex-col items-center text-center space-y-6">
            <div className="w-16 h-16 relative flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500/30 border-t-indigo-400 animate-spin"></div>
              <Upload size={28} className="text-indigo-300 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold tracking-wide text-white">Uploading Documents</h3>
              <p className="text-xs text-slate-300 leading-relaxed font-medium min-h-[36px]">
                {uploadStage || "Executing secure onboarding synchronization..."}
              </p>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden border border-white/5">
              <div className="h-full bg-indigo-500 rounded-full animate-pulse" style={{ width: '75%' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Header & Segmented Control */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 md:gap-4 mb-2">
        <div className="flex items-center gap-4">
          <h1 className="hidden md:block text-2xl font-bold text-gray-800 tracking-tight">After Joining Work</h1>

          {/* Segmented Tab Control (Standardized Layout) */}
          <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 shadow-sm self-start sm:self-center">
            <button
              onClick={() => { setActiveTab("pending"); setCurrentPage(1); }}
              className={`flex items-center gap-2 py-1.5 px-4 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all ${activeTab === "pending"
                ? "bg-white text-indigo-600 shadow-sm border border-gray-200"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                }`}
            >
              <Clock size={13} />
              <span>Pending ({filteredPendingData.length})</span>
            </button>
            <button
              onClick={() => { setActiveTab("history"); setCurrentPage(1); }}
              className={`flex items-center gap-2 py-1.5 px-4 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all ${activeTab === "history"
                ? "bg-white text-indigo-600 shadow-sm border border-gray-200"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                }`}
            >
              <CheckCircle size={13} />
              <span>History ({filteredHistoryData.length})</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full lg:w-auto">
          {/* Search Section */}
          <div className="flex flex-row items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search candidates/ID..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full text-xs sm:text-sm shadow-sm transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 lg:flex lg:items-center gap-2 w-full sm:w-auto">
            {/* Department Filter */}
            <div className="relative col-span-1 min-w-[140px]">
              <div
                onClick={() => setIsDeptDropdownOpen(!isDeptDropdownOpen)}
                className="flex items-center gap-2 h-9 px-3 border border-gray-300 rounded bg-white text-xs text-gray-700 cursor-pointer hover:border-indigo-500 transition shadow-sm relative overflow-hidden"
              >
                <Filter size={12} className="text-gray-400 shrink-0" />
                <span className="truncate font-medium">{filterDepartment || "All Dept"}</span>
                <ChevronDown size={14} className={`ml-auto text-gray-400 transition-transform ${isDeptDropdownOpen ? 'rotate-180' : ''}`} />
              </div>

              {isDeptDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDeptDropdownOpen(false)}></div>
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden py-1 max-h-48 overflow-y-auto ring-1 ring-black ring-opacity-5">
                    <div
                      onClick={() => { setFilterDepartment(''); setIsDeptDropdownOpen(false); setCurrentPage(1); }}
                      className={`px-3 py-2 text-xs cursor-pointer flex items-center justify-between transition-colors ${!filterDepartment ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      All Departments
                      {!filterDepartment && <Check size={12} className="text-indigo-500" />}
                    </div>
                    {uniqueDepartments.map((dept, index) => (
                      <div
                        key={index}
                        onClick={() => { setFilterDepartment(dept); setIsDeptDropdownOpen(false); setCurrentPage(1); }}
                        className={`px-3 py-2 text-xs cursor-pointer flex items-center justify-between transition-colors ${filterDepartment === dept ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                      >
                        {dept}
                        {filterDepartment === dept && <Check size={12} className="text-indigo-500" />}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Date Filter */}
            <div className="relative col-span-1">
              <div className="flex items-center gap-2 h-9 px-3 border border-gray-300 rounded bg-white text-xs text-gray-700 relative overflow-hidden shadow-sm hover:border-indigo-500 transition">
                <Calendar size={12} className="text-gray-400 shrink-0" />
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => {
                    setFilterDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-transparent focus:outline-none text-[11px] font-medium cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Unified Main Content Container (Synced with CallTracker.jsx) */}
      <div className="overflow-hidden border border-gray-200 rounded-lg bg-white min-h-[530px] flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-12 text-center">
            <LoadingSpinner message="Retrieving joining records..." minHeight="450px" />
          </div>
        ) : (
          <>
            {activeTab === "pending" && (
              <div className="flex-1 flex flex-col">
                {/* Desktop View (Table + Footer combined) */}
                <div className="hidden md:flex flex-col bg-white overflow-hidden">
                  <div className="max-h-[calc(105vh-280px)] min-h-[530px] overflow-y-auto scrollbar-hide">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Action</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Joining ID</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Enquire Number</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Indent Type</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Department</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Post</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Name As Per Aadhar</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Gender</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Date Of Birth</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Phone Number</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Personal Email-Id</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Emergency Contact Person Name</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Emergency Contact Person Number</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Relationship With Emergency Contact Person</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Highest Qualification</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Aadhar Number</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Aadhar Photo</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Permanent Address</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Current Address</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Date Of Joining</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Team Head</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Registration Under</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Name of the Bank</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Current Bank A.C No.</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Ifsc Code</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Candidate's Photo Password Size</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Photo Of Bank Passbook</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Upload Valid PAN Identity Proof</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Upload Student Identity Card(Artical)</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Resume Copy</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Reporting To</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {tableLoading ? (
                          <tr>
                            <td colSpan="31" className="px-4 py-1">
                              <LoadingSpinner message="Scanning records..." minHeight="300px" />
                            </td>
                          </tr>
                        ) : error ? (
                          <tr>
                            <td colSpan="31" className="px-4 py-12 text-center">
                              <p className="text-rose-500 text-xs font-bold mb-2">Error: {error}</p>
                              <button onClick={fetchJoiningData} className="px-3 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded text-xs font-bold shadow-sm">Retry</button>
                            </td>
                          </tr>
                        ) : currentItems.length === 0 ? (
                          <tr>
                            <td colSpan="31" className="px-4 py-24 text-center">
                              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest leading-loose">No pending work found.</p>
                            </td>
                          </tr>
                        ) : (
                          currentItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <button
                                  onClick={() => handleAfterJoiningClick(item)}
                                  className="bg-indigo-600 text-white px-3 py-1 rounded-md text-xs hover:bg-indigo-700 transition-all shadow-sm active:scale-95 font-bold"
                                >
                                  Process
                                </button>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-900">{item.joiningNo}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.enquiryNo}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-indigo-600">{item.indentType || "—"}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.department}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.designation}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900">{item.candidateName}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.gender}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{formatDOB(item.bodAsPerAadhar)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.mobileNo}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.email}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.emergencyName}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.familyMobileNo}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.relationWithFamily}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.qualification}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.aadharNo}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                {item.aadharPhoto ? (
                                  <a href={item.aadharPhoto} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-sm">View</a>
                                ) : <span className="text-gray-400 text-sm">—</span>}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 max-w-[200px] truncate" title={item.addressAsPerAadhar}>{item.addressAsPerAadhar}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 max-w-[200px] truncate" title={item.currentAddress}>{item.currentAddress}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-emerald-600">{formatDOB(item.dateOfJoining)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.teamHead}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.registrationUnder}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.bankName}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.accountNo}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.ifscCode}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                {item.candidatePhoto ? (
                                  <a href={item.candidatePhoto} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-sm">View</a>
                                ) : <span className="text-gray-400 text-sm">—</span>}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                {item.passbookPhoto ? (
                                  <a href={item.passbookPhoto} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-sm">View</a>
                                ) : <span className="text-gray-400 text-sm">—</span>}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                {item.panPhoto ? (
                                  <a href={item.panPhoto} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-sm">View</a>
                                ) : <span className="text-gray-400 text-sm">—</span>}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                {item.studentIdPhoto ? (
                                  <a href={item.studentIdPhoto} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-sm">View</a>
                                ) : <span className="text-gray-400 text-sm">—</span>}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                {item.resumeCopy ? (
                                  <a href={item.resumeCopy} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-sm">View</a>
                                ) : <span className="text-gray-400 text-sm">—</span>}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.reportingTo}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Desktop Pagination Footer */}
                  <div className="px-4 py-3 bg-white border-t border-gray-200 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-6 flex-wrap">
                      <p className="text-[13px] text-gray-600 font-medium tracking-wide">
                        Showing <span className="font-bold text-gray-900">{activeData.length > 0 ? indexOfFirstItem + 1 : 0}</span> to <span className="font-bold text-gray-900">{Math.min(indexOfLastItem, activeData.length)}</span> of <span className="font-bold text-gray-900">{activeData.length}</span> records
                      </p>
                      <div className="flex items-center gap-2 h-5 text-gray-400">
                        <label className="text-[12px] font-bold uppercase tracking-widest whitespace-nowrap">Rows:</label>
                        <select
                          value={itemsPerPage}
                          onChange={(e) => {
                            setItemsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                          }}
                          className="text-xs bg-transparent font-bold text-indigo-600 outline-none cursor-pointer"
                        >
                          {[15, 30, 50, 100].map((val) => (
                            <option key={val} value={val}>{val}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center w-auto justify-end">
                      {renderPaginationNav()}
                    </div>
                  </div>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden flex flex-col h-[calc(100vh-240px)]">
                  <div className="flex-1 p-2 space-y-3 overflow-y-auto scrollbar-hide">
                    {currentItems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-24">
                        <p className="text-gray-500 text-lg">No pending work found.</p>
                      </div>
                    ) : (
                      currentItems.map((item, index) => (
                        <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-2.5 space-y-1.5 hover:border-indigo-200 transition-colors">
                          <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-indigo-600 text-sm">#{item.joiningNo}</span>
                              <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 font-medium uppercase tracking-wider">{item.department}</span>
                            </div>
                            <button
                              onClick={() => handleAfterJoiningClick(item)}
                              className="px-3 py-1 bg-indigo-600 text-white rounded text-xs font-bold shadow-sm active:scale-95 transition-transform"
                            >
                              Process
                            </button>
                          </div>
                          <div>
                            <div className="text-sm font-bold text-gray-800 tracking-tight">{item.candidateName}</div>
                            <div className="text-xs text-gray-600 mt-0.5 tracking-tight font-medium">Designation: {item.designation}</div>
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-gray-400 pt-1 border-t border-gray-50 mt-1">
                            <span>Joining: {formatDOB(item.dateOfJoining)}</span>
                            <span className="truncate max-w-[120px]">{item.fatherName}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="border-t border-gray-300 bg-white px-2 py-2 flex justify-center sticky bottom-0">
                    {renderPaginationNav()}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "history" && (
              <div className="flex-1 flex flex-col">
                {/* Desktop History View */}
                <div className="hidden md:flex flex-col bg-white overflow-hidden">
                  <div className="max-h-[calc(105vh-280px)] min-h-[530px] overflow-y-auto scrollbar-hide">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Timestamp</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Employee ID</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Employee Type</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Employee Name</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Email ID</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Email Password</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Laptop Name</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Laptop Model Number</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Laptop IMEI</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Mobile</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Mobile Model Number</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">IMEI Number</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Vehicle Name</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Vehicle Number</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">SIM Name</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">SIM Number</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Code</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">PIN</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Password</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Offer Letter Image</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Welcome Meeting Image</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">PF/ESIC Images</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {currentItems.length === 0 ? (
                          <tr>
                            <td colSpan="22" className="px-4 py-24 text-center">
                              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest leading-loose">No history found.</p>
                            </td>
                          </tr>
                        ) : (
                          currentItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.timestamp}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-900">{item.employeeId}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-indigo-600">{item.employeeType || "—"}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900">{item.candidateName}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.emailId || "—"}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.emailPassword || "—"}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.laptopCompanyName || "—"}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.laptopModelNumber || "—"}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.laptopImei || "—"}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.mobileName || "—"}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.mobileModelName || "—"}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.mobileImei || "—"}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.vehicleName || "—"}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.vehicleNumber || "—"}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.simCompanyName || "—"}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.simNumber || "—"}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.idCode || "—"}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.idPin || "—"}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.idPassword || "—"}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                {item.offerLetterImageUrl ? (
                                  <a href={item.offerLetterImageUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-sm font-medium">View</a>
                                ) : <span className="text-gray-400 text-sm">—</span>}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                {item.welcomeMeetingImageUrl ? (
                                  <a href={item.welcomeMeetingImageUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-sm font-medium">View</a>
                                ) : <span className="text-gray-400 text-sm">—</span>}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                {item.pfEsicImageUrl ? (
                                  <a href={item.pfEsicImageUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-sm font-medium">View</a>
                                ) : <span className="text-gray-400 text-sm">—</span>}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Desktop Pagination Footer */}
                  <div className="px-4 py-3 bg-white border-t border-gray-200 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-6 flex-wrap">
                      <p className="text-[13px] text-gray-600 font-medium tracking-wide">
                        Showing <span className="font-bold text-gray-900">{activeData.length > 0 ? indexOfFirstItem + 1 : 0}</span> to <span className="font-bold text-gray-900">{Math.min(indexOfLastItem, activeData.length)}</span> of <span className="font-bold text-gray-900">{activeData.length}</span> records
                      </p>
                    </div>
                    <div className="flex items-center w-auto justify-end">
                      {renderPaginationNav()}
                    </div>
                  </div>
                </div>

                {/* Mobile History View */}
                <div className="md:hidden flex flex-col h-[calc(100vh-240px)]">
                  <div className="flex-1 p-2 space-y-3 overflow-y-auto scrollbar-hide">
                    {currentItems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-24">
                        <p className="text-gray-500 text-lg">No history found.</p>
                      </div>
                    ) : (
                      currentItems.map((item, index) => (
                        <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-2.5 space-y-1.5">
                          <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                            <span className="font-bold text-indigo-600 text-sm">#{item.joiningNo}</span>
                            <span className="bg-green-100 text-green-800 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Completed</span>
                          </div>
                          <div>
                            <div className="text-sm font-bold text-gray-800 tracking-tight">{item.candidateName}</div>
                            <div className="text-xs text-gray-600 mt-0.5 tracking-tight font-medium">{item.designation}</div>
                          </div>
                          <div className="text-[10px] text-gray-400 pt-1 border-t border-gray-50">
                            Joining: {formatDOB(item.dateOfJoining)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="border-t border-gray-300 bg-white px-2 py-2 flex justify-center sticky bottom-0">
                    {renderPaginationNav()}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Checklist Modal - Premium Redesign */}
      {showModal && selectedItem && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4 backdrop-blur-sm bg-black/20 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8 overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200 relative">
            {submitting && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
                <div className="bg-white/90 border border-gray-100/50 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center space-y-6 backdrop-filter">
                  <div className="relative flex items-center justify-center">
                    <div className="absolute animate-ping rounded-full h-16 w-16 border-2 border-indigo-400/30 opacity-75"></div>
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-lg font-bold text-gray-800 tracking-tight">Processing Onboarding Workflow</h4>
                    <p className="text-xs text-gray-400 font-semibold tracking-widest uppercase">Appscript & Drive Pipeline</p>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200/50">
                    <p className="text-xs font-bold text-indigo-600 animate-pulse min-h-[16px]">{uploadStage}</p>
                  </div>
                  
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-700" 
                      style={{ 
                        width: uploadStage.includes('Uploading') ? '40%' : 
                               uploadStage.includes('Saving asset') ? '75%' : 
                               uploadStage.includes('Updating JOINING') ? '90%' : '15%' 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-800 tracking-tight">
                After Joining Work Checklist
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <form
              onSubmit={handleSubmit}
              className="p-6 space-y-4 max-h-[80vh] overflow-y-auto"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Joining ID
                  </label>
                  <input
                    type="text"
                    value={selectedItem.joiningNo}
                    disabled
                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={selectedItem.candidateName}
                    disabled
                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-500"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-md font-medium text-gray-500">
                  Checklist Items
                </h4>

                {/* Check Salary Slip & Resume */}
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="checkSalarySlipResume"
                      checked={formData.checkSalarySlipResume}
                      onChange={() =>
                        handleCheckboxChange("checkSalarySlipResume")
                      }
                      className="h-4 w-4 text-gray-500 focus:ring-blue-500 border-gray-300 rounded bg-white"
                    />
                    <label
                      htmlFor="checkSalarySlipResume"
                      className="ml-2 text-sm text-gray-500"
                    >
                      Check Salary Slip & Resume Copy
                    </label>
                  </div>

                  {formData.checkSalarySlipResume && (
                    <div className="mt-2 ml-6 p-3 bg-gray-50 rounded-md">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-500">
                          Salary Slip / Resume Document
                        </label>
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <input
                              type="file"
                              id="checkSalarySlipResumeImage"
                              accept="image/*,.pdf,.doc,.docx"
                              onChange={(e) =>
                                handleImageUpload(e, "checkSalarySlipResumeImage")
                              }
                              onClick={(e) => {
                                e.target.value = null;
                              }}
                              className="hidden"
                            />
                            <label
                              htmlFor="checkSalarySlipResumeImage"
                              className="cursor-pointer bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 flex items-center"
                            >
                              <svg
                                className="w-4 h-4 mr-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                ></path>
                              </svg>
                              {formData.checkSalarySlipResumeImage
                                ? "Change Document"
                                : formData.checkSalarySlipResumeImageUrl
                                  ? "Replace Document"
                                  : "Upload Document"}
                            </label>
                          </div>
                          {formData.checkSalarySlipResumeImageUrl &&
                            !formData.checkSalarySlipResumeImage && (
                              <div className="mt-2">
                                {formData.checkSalarySlipResumeImageUrl.toLowerCase().match(/\.(pdf|doc|docx)$/i) ? (
                                  <a 
                                    href={formData.checkSalarySlipResumeImageUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline text-sm font-medium flex items-center"
                                  >
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                                    View Uploaded Document
                                  </a>
                                ) : (
                                  <img
                                    src={formData.checkSalarySlipResumeImageUrl}
                                    alt="Salary Slip / Resume"
                                    className="h-32 w-full object-contain rounded border"
                                    onError={(e) => {
                                      e.target.style.display = "none";
                                      e.target.nextSibling.style.display = "block"; // Show fallback link if image fails to load
                                    }}
                                  />
                                )}
                                <a 
                                  href={formData.checkSalarySlipResumeImageUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline text-sm font-medium hidden mt-2"
                                >
                                  View Uploaded Document
                                </a>
                                <p className="text-xs text-gray-500 mt-1">
                                  Current document
                                </p>
                              </div>
                            )}
                          {formData.checkSalarySlipResumeImage && (
                            <div className="mt-2">
                              {formData.checkSalarySlipResumeImage.type.startsWith('image/') ? (
                                <img
                                  src={URL.createObjectURL(formData.checkSalarySlipResumeImage)}
                                  alt="New Preview"
                                  className="h-32 w-full object-contain rounded border"
                                />
                              ) : (
                                <div className="flex items-center justify-center h-32 w-full bg-gray-100 rounded border text-gray-500 flex-col">
                                  <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                  <span className="text-sm font-medium text-center px-4 truncate w-full">{formData.checkSalarySlipResumeImage.name}</span>
                                </div>
                              )}
                              <p className="text-xs text-green-600 mt-1 flex items-center">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                New document selected
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Offer Letter Received with image upload */}
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="offerLetterReceived"
                      checked={formData.offerLetterReceived}
                      onChange={() =>
                        handleCheckboxChange("offerLetterReceived")
                      }
                      className="h-4 w-4 text-gray-500 focus:ring-blue-500 border-gray-300 rounded bg-white"
                    />
                    <label
                      htmlFor="offerLetterReceived"
                      className="ml-2 text-sm text-gray-500"
                    >
                      Offer Letter Received
                    </label>
                  </div>

                  {formData.offerLetterReceived && (
                    <div className="mt-2 ml-6 p-3 bg-gray-50 rounded-md">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-500">
                          Offer Letter Document
                        </label>
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <input
                              type="file"
                              id="offerLetterImage"
                              accept="image/*,.pdf,.doc,.docx"
                              onChange={(e) =>
                                handleImageUpload(e, "offerLetterImage")
                              }
                              onClick={(e) => {
                                e.target.value = null;
                              }}
                              className="hidden"
                            />
                            <label
                              htmlFor="offerLetterImage"
                              className="cursor-pointer bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 flex items-center"
                            >
                              <svg
                                className="w-4 h-4 mr-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                ></path>
                              </svg>
                              {formData.offerLetterImage
                                ? "Change Document"
                                : formData.offerLetterImageUrl
                                  ? "Replace Document"
                                  : "Upload Document"}
                            </label>
                          </div>
                          {formData.offerLetterImageUrl &&
                            !formData.offerLetterImage && (
                              <div className="mt-2">
                                {formData.offerLetterImageUrl.toLowerCase().match(/\.(pdf|doc|docx)$/i) ? (
                                  <a 
                                    href={formData.offerLetterImageUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline text-sm font-medium flex items-center"
                                  >
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                                    View Uploaded Document
                                  </a>
                                ) : (
                                  <img
                                    src={formData.offerLetterImageUrl}
                                    alt="Offer Letter"
                                    className="h-32 w-full object-contain rounded border"
                                    onError={(e) => {
                                      e.target.style.display = "none";
                                      e.target.nextSibling.style.display = "block";
                                    }}
                                  />
                                )}
                                <a 
                                  href={formData.offerLetterImageUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline text-sm font-medium hidden mt-2"
                                >
                                  View Uploaded Document
                                </a>
                                <p className="text-xs text-gray-500 mt-1">
                                  Current offer letter document
                                </p>
                              </div>
                            )}
                          {formData.offerLetterImage && (
                            <div className="mt-2">
                              {formData.offerLetterImage.type.startsWith('image/') ? (
                                <img
                                  src={URL.createObjectURL(formData.offerLetterImage)}
                                  alt="New Preview"
                                  className="h-32 w-full object-contain rounded border"
                                />
                              ) : (
                                <div className="flex items-center justify-center h-32 w-full bg-gray-100 rounded border text-gray-500 flex-col">
                                  <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                  <span className="text-sm font-medium text-center px-4 truncate w-full">{formData.offerLetterImage.name}</span>
                                </div>
                              )}
                              <p className="text-xs text-green-600 mt-1 flex items-center">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                New document selected
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Welcome Meeting with image upload */}
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="welcomeMeeting"
                      checked={formData.welcomeMeeting}
                      onChange={() => handleCheckboxChange("welcomeMeeting")}
                      className="h-4 w-4 text-gray-500 focus:ring-blue-500 border-gray-300 rounded bg-white"
                    />
                    <label
                      htmlFor="welcomeMeeting"
                      className="ml-2 text-sm text-gray-500"
                    >
                      Welcome Meeting
                    </label>
                  </div>

                  {formData.welcomeMeeting && (
                    <div className="mt-2 ml-6 p-3 bg-gray-50 rounded-md">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-500">
                          Welcome Meeting Photo
                        </label>
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <input
                              type="file"
                              id="welcomeMeetingImage"
                              accept="image/*,.pdf,.doc,.docx"
                              onChange={(e) =>
                                handleImageUpload(e, "welcomeMeetingImage")
                              }
                              onClick={(e) => {
                                e.target.value = null;
                              }}
                              className="hidden"
                            />
                            <label
                              htmlFor="welcomeMeetingImage"
                              className="cursor-pointer bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 flex items-center"
                            >
                              <svg
                                className="w-4 h-4 mr-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                ></path>
                              </svg>
                              {formData.welcomeMeetingImage
                                ? "Change Photo"
                                : formData.welcomeMeetingImageUrl
                                  ? "Replace Photo"
                                  : "Upload Photo"}
                            </label>
                          </div>
                          {formData.welcomeMeetingImageUrl &&
                            !formData.welcomeMeetingImage && (
                              <div className="mt-2">
                                {formData.welcomeMeetingImageUrl.toLowerCase().match(/\.(pdf|doc|docx)$/i) ? (
                                  <a 
                                    href={formData.welcomeMeetingImageUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline text-sm font-medium flex items-center"
                                  >
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                                    View Uploaded Photo/Document
                                  </a>
                                ) : (
                                  <img
                                    src={formData.welcomeMeetingImageUrl}
                                    alt="Welcome Meeting"
                                    className="h-32 w-full object-contain rounded border"
                                    onError={(e) => {
                                      e.target.style.display = "none";
                                      e.target.nextSibling.style.display = "block";
                                    }}
                                  />
                                )}
                                <a 
                                  href={formData.welcomeMeetingImageUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline text-sm font-medium hidden mt-2"
                                >
                                  View Uploaded Photo/Document
                                </a>
                                <p className="text-xs text-gray-500 mt-1">
                                  Current welcome meeting photo
                                </p>
                              </div>
                            )}
                          {formData.welcomeMeetingImage && (
                            <div className="mt-2">
                              {formData.welcomeMeetingImage.type.startsWith('image/') ? (
                                <img
                                  src={URL.createObjectURL(formData.welcomeMeetingImage)}
                                  alt="New Preview"
                                  className="h-32 w-full object-contain rounded border"
                                />
                              ) : (
                                <div className="flex items-center justify-center h-32 w-full bg-gray-100 rounded border text-gray-500 flex-col">
                                  <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                  <span className="text-sm font-medium text-center px-4 truncate w-full">{formData.welcomeMeetingImage.name}</span>
                                </div>
                              )}
                              <p className="text-xs text-green-600 mt-1 flex items-center">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                New photo selected
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Biometric Access */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="biometricAccess"
                    checked={formData.biometricAccess}
                    onChange={() => handleCheckboxChange("biometricAccess")}
                    className="h-4 w-4 text-gray-500 focus:ring-blue-500 border-gray-300 rounded bg-white"
                  />
                  <label
                    htmlFor="biometricAccess"
                    className="ml-2 text-sm text-gray-500"
                  >
                    ID / Password
                  </label>
                </div>

                {formData.biometricAccess && (
                  <div className="mt-2 ml-6 p-3 bg-gray-50 rounded-md">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-medium text-gray-500 mb-1">
                          Code
                        </label>
                        <input
                          type="text"
                          name="idCode"
                          value={formData.idCode}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          placeholder="Enter code"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-500 mb-1">
                          PIN
                        </label>
                        <input
                          type="text"
                          name="idPin"
                          value={formData.idPin}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          placeholder="Enter PIN"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-500 mb-1">
                          Password
                        </label>
                        <input
                          type="text"
                          name="idPassword"
                          value={formData.idPassword}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          placeholder="Enter password"
                        />
                      </div>
                    </div>
                  </div>
                )}
                {/* Official Email ID Section */}
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="officialEmailId"
                      checked={formData.officialEmailId}
                      onChange={() => handleCheckboxChange("officialEmailId")}
                      className="h-4 w-4 text-gray-500 focus:ring-blue-500 border-gray-300 rounded bg-white"
                    />
                    <label
                      htmlFor="officialEmailId"
                      className="ml-2 text-sm text-gray-500"
                    >
                      Official Email ID
                    </label>
                  </div>

                  {formData.officialEmailId && (
                    <div className="mt-2 ml-6 grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-gray-50 rounded-md">
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Email ID
                        </label>
                        <input
                          type="text"
                          name="emailId"
                          value={formData.emailId}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          placeholder="Enter email ID"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Password
                        </label>
                        <input
                          type="password"
                          name="emailPassword"
                          value={formData.emailPassword}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          placeholder="Enter password"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="assignAssets"
                    checked={formData.assignAssets}
                    onChange={() => handleCheckboxChange("assignAssets")}
                    className="h-4 w-4 text-gray-500 focus:ring-blue-500 border-gray-300 rounded bg-white"
                  />
                  <label
                    htmlFor="assignAssets"
                    className="ml-2 text-sm text-gray-500"
                  >
                    Assign Assets
                  </label>
                </div>
                {formData.assignAssets && (
                  <div className="mt-2 ml-6 space-y-4 p-3 bg-gray-50 rounded-md">
                    {/* Laptop Section */}
                    <div className="border-b border-gray-200 pb-3 last:border-none last:pb-0">
                      <label className="block text-xs font-bold text-gray-700 mb-2">Laptop Details</label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 mb-1">Laptop Company Name</label>
                          <input
                            type="text"
                            name="laptopCompanyName"
                            value={formData.laptopCompanyName}
                            onChange={handleInputChange}
                            className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            placeholder="e.g. Dell, HP"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 mb-1">IMEI Number</label>
                          <input
                            type="text"
                            name="laptopImei"
                            value={formData.laptopImei}
                            onChange={handleInputChange}
                            className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            placeholder="Enter IMEI/Serial"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 mb-1">Model Number</label>
                          <input
                            type="text"
                            name="laptopModelNumber"
                            value={formData.laptopModelNumber}
                            onChange={handleInputChange}
                            className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            placeholder="e.g. Latitude 5420"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Mobile Section */}
                    <div className="border-b border-gray-200 pb-3 last:border-none last:pb-0">
                      <label className="block text-xs font-bold text-gray-700 mb-2">Mobile Details</label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 mb-1">Mobile Name</label>
                          <input
                            type="text"
                            name="mobileName"
                            value={formData.mobileName}
                            onChange={handleInputChange}
                            className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            placeholder="e.g. Samsung"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 mb-1">IMEI Number</label>
                          <input
                            type="text"
                            name="mobileImei"
                            value={formData.mobileImei}
                            onChange={handleInputChange}
                            className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            placeholder="Enter IMEI"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 mb-1">Model Name</label>
                          <input
                            type="text"
                            name="mobileModelName"
                            value={formData.mobileModelName}
                            onChange={handleInputChange}
                            className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            placeholder="e.g. A54 5G"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Vehicle Section */}
                    <div className="border-b border-gray-200 pb-3 last:border-none last:pb-0">
                      <label className="block text-xs font-bold text-gray-700 mb-2">Vehicle Details</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 mb-1">Vehicle Name</label>
                          <input
                            type="text"
                            name="vehicleName"
                            value={formData.vehicleName}
                            onChange={handleInputChange}
                            className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            placeholder="e.g. Honda Activa"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 mb-1">Vehicle Number</label>
                          <input
                            type="text"
                            name="vehicleNumber"
                            value={formData.vehicleNumber}
                            onChange={handleInputChange}
                            className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            placeholder="e.g. DL 10 AB 1234"
                          />
                        </div>
                      </div>
                    </div>

                    {/* SIM Section */}
                    <div className="pb-3 last:border-none last:pb-0">
                      <label className="block text-xs font-bold text-gray-700 mb-2">SIM Details</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 mb-1">Company Name</label>
                          <input
                            type="text"
                            name="simCompanyName"
                            value={formData.simCompanyName}
                            onChange={handleInputChange}
                            className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            placeholder="e.g. Airtel, Jio"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 mb-1">SIM Number</label>
                          <input
                            type="text"
                            name="simNumber"
                            value={formData.simNumber}
                            onChange={handleInputChange}
                            className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            placeholder="Enter SIM Number"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {/* PF / ESIC with image upload */}
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="pfEsic"
                      checked={formData.pfEsic}
                      onChange={() => handleCheckboxChange("pfEsic")}
                      className="h-4 w-4 text-gray-500 focus:ring-blue-500 border-gray-300 rounded bg-white"
                    />
                    <label
                      htmlFor="pfEsic"
                      className="ml-2 text-sm text-gray-500"
                    >
                      PF / ESIC
                    </label>
                  </div>

                  {formData.pfEsic && (
                    <div className="mt-2 ml-6 p-3 bg-gray-50 rounded-md">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-500">
                          PF / ESIC Document
                        </label>
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <input
                              type="file"
                              id="pfEsicImage"
                              accept="image/*,.pdf,.doc,.docx"
                              onChange={(e) =>
                                handleImageUpload(e, "pfEsicImage")
                              }
                              onClick={(e) => {
                                e.target.value = null;
                              }}
                              className="hidden"
                            />
                            <label
                              htmlFor="pfEsicImage"
                              className="cursor-pointer bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 flex items-center"
                            >
                              <svg
                                className="w-4 h-4 mr-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                ></path>
                              </svg>
                              {formData.pfEsicImage
                                ? "Change Document"
                                : formData.pfEsicImageUrl
                                  ? "Replace Document"
                                  : "Upload Document"}
                            </label>
                          </div>
                          {formData.pfEsicImageUrl && !formData.pfEsicImage && (
                            <div className="mt-2">
                              {formData.pfEsicImageUrl.toLowerCase().match(/\.(pdf|doc|docx)$/i) ? (
                                  <a 
                                    href={formData.pfEsicImageUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline text-sm font-medium flex items-center"
                                  >
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                                    View Uploaded Document
                                  </a>
                                ) : (
                                  <img
                                    src={formData.pfEsicImageUrl}
                                    alt="PF/ESIC"
                                    className="h-32 w-full object-contain rounded border"
                                    onError={(e) => {
                                      e.target.style.display = "none";
                                      e.target.nextSibling.style.display = "block";
                                    }}
                                  />
                                )}
                                <a 
                                  href={formData.pfEsicImageUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline text-sm font-medium hidden mt-2"
                                >
                                  View Uploaded Document
                                </a>
                              <p className="text-xs text-gray-500 mt-1">
                                Current PF/ESIC document
                              </p>
                            </div>
                          )}
                          {formData.pfEsicImage && (
                            <div className="mt-2">
                              {formData.pfEsicImage.type.startsWith('image/') ? (
                                <img
                                  src={URL.createObjectURL(formData.pfEsicImage)}
                                  alt="New Preview"
                                  className="h-32 w-full object-contain rounded border"
                                />
                              ) : (
                                <div className="flex items-center justify-center h-32 w-full bg-gray-100 rounded border text-gray-500 flex-col">
                                  <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                  <span className="text-sm font-medium text-center px-4 truncate w-full">{formData.pfEsicImage.name}</span>
                                </div>
                              )}
                              <p className="text-xs text-green-600 mt-1 flex items-center">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                New document selected
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {/* Company Directory section removed */}
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-500 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-white bg-indigo-700 rounded-md hover:bg-indigo-800 min-h-[42px] flex items-center justify-center ${submitting ? "opacity-90 cursor-not-allowed" : ""
                    }`}
                  disabled={submitting}
                >
                  {submitting ? (
                    <div className="flex items-center">
                      <svg
                        className="animate-spin h-4 w-4 text-white mr-2"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <span>Submitting...</span>
                    </div>
                  ) : (
                    "Submit"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AfterJoiningWork;