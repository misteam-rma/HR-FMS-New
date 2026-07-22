import React, { useState, useEffect } from 'react';
import { Search, Clock, CheckCircle, X, Upload, Share, FileText, Mail, Calendar, Filter, ChevronDown, Check, History } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';

const Joining = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [showJoiningModal, setShowJoiningModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [tableLoading, setTableLoading] = useState(false);
  const [joiningData, setJoiningData] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [teamHeadList, setTeamHeadList] = useState([]);

  // Pagination states (Synced with CallTracker.jsx)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [filterDepartment, setFilterDepartment] = useState('');
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const [filterDate, setFilterDate] = useState('');

  const [shareFormData, setShareFormData] = useState({
    recipientName: '',
    recipientEmail: '',
    subject: 'Candidate Joining Details',
    message: '',
  });

  const GOOGLE_DRIVE_FOLDER_ID = import.meta.env.VITE_GOOGLE_DRIVE_ENQUIRY_FOLDER_ID;
  const API_URL = "https://script.google.com/macros/s/AKfycbwGN0L4CqcZdhgie3l94KGGjWHqaL_cHRgwtw1CCUZy6yqpF5lFlFNBbO10dEm7BNK6FQ/exec";

  const [joiningFormData, setJoiningFormData] = useState({
    nameAsPerAadhar: '',
    fatherHusbandName: '',
    dateOfJoining: '',
    designation: '',
    currentAddress: '',
    dobAsPerAadhar: '',
    gender: '',
    mobileNo: '',
    familyMobileNo: '',
    relationshipWithFamily: '',
    currentBankAc: '',
    ifscCode: '',
    branchName: '',
    personalEmail: '',
    highestQualification: '',
    department: '',
    equipment: '',
    aadharCardNo: '',
    aadharFrontPhoto: null,
    candidatePhoto: null,
    bankPassbookPhoto: null,
    resumeCopy: '',
    candidateEnquiryNo: '',
    indentType: '',
    emergencyContactName: '',
    teamHead: '',
    registrationUnder: '',
    bankName: '',
    studentIdCardPhoto: null,
    resumeCopyFile: null,
    reportingTo: '',
    panCardPhoto: null,
  });


  // ──────────────────────────────────────
  //  Helper: get current server timestamp
  // ──────────────────────────────────────
  const fetchServerTimestamp = async () => {
    try {
      const res = await fetch(`${API_URL}?action=ping`);
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
    // Fallback – still better than wrong year
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
      const [enquiryResponse, followUpResponse, joiningHistoryResponse, masterResponse] = await Promise.all([
        fetch(`${"https://script.google.com/macros/s/AKfycbwGN0L4CqcZdhgie3l94KGGjWHqaL_cHRgwtw1CCUZy6yqpF5lFlFNBbO10dEm7BNK6FQ/exec"}?sheet=ENQUIRY&action=fetch`),
        fetch(`${"https://script.google.com/macros/s/AKfycbwGN0L4CqcZdhgie3l94KGGjWHqaL_cHRgwtw1CCUZy6yqpF5lFlFNBbO10dEm7BNK6FQ/exec"}?sheet=Follow - Up&action=fetch`),
        fetch(`${"https://script.google.com/macros/s/AKfycbwGN0L4CqcZdhgie3l94KGGjWHqaL_cHRgwtw1CCUZy6yqpF5lFlFNBbO10dEm7BNK6FQ/exec"}?sheet=JOINING&action=fetch`),
        fetch(`${"https://script.google.com/macros/s/AKfycbwGN0L4CqcZdhgie3l94KGGjWHqaL_cHRgwtw1CCUZy6yqpF5lFlFNBbO10dEm7BNK6FQ/exec"}?sheet=Master&action=fetch`),
      ]);
      const [enquiryResult, followUpResult, joiningHistoryResult, masterResult] = await Promise.all([
        enquiryResponse.json(),
        followUpResponse.json(),
        joiningHistoryResponse.json(),
        masterResponse.json()
      ]);

      if (enquiryResult.success && followUpResult.success) {
        const enquiryHeaders = enquiryResult.data[5];
        const dataRows = enquiryResult.data.slice(6);

        const getIndex = (colName) => enquiryHeaders.indexOf(colName);

        const allProcessed = dataRows.map(row => ({
          id: row[getIndex("Timestamp")] || row[0] || "",
          indentNo: row[getIndex("Indent Number")] || row[1] || "",
          candidateEnquiryNo: row[getIndex("Candidate Enquiry Number")] || row[2] || "",
          applyingForPost: row[getIndex("Applying For the Post")] || row[4] || "",
          candidateName: row[getIndex("Candidate Name")] || row[6] || "",
          candidateDOB: row[getIndex("DOB")] || row[7] || "",
          candidatePhone: row[getIndex("Candidate Phone Number")] || row[8] || "",
          candidateEmail: row[getIndex("Candidate Email")] || row[9] || "",
          previousCompany: row[getIndex("Previous Company Name")] || row[10] || "",
          jobExperience: row[getIndex("Job Experience")] || row[11] || "",
          department: row[getIndex("Department")] || row[5] || "",
          previousPosition: row[getIndex("Previous Position")] || row[12] || "",
          reasonForLeaving: row[getIndex("Reason Of Leaving")] || row[13] || "",
          maritalStatus: row[getIndex("Marital Status")] || row[14] || "",
          lastSalary: row[getIndex("Last Salary Drawn")] || row[15] || "",
          candidatePhoto: row[getIndex("Candidate Photo")] || row[16] || "",
          referenceBy: row[getIndex("Reference By")] || row[17] || "",
          presentAddress: row[getIndex("Present Address")] || row[18] || "",
          aadharNo: row[getIndex("Aadhar Number")] || row[19] || "",
          candidateResume: row[getIndex("Resume Copy")] || row[20] || "",
          plannedJoining: row[27] || "", // Column AB
          actualJoining: row[28] || "",  // Column AC
          indentType: row[3] || "",      // Column D
          gender: row[17] || "",         // Column R (Index 17)
        }));

        // Pending: AB filled, AC empty
        const pending = allProcessed
          .filter(item => item.plannedJoining && item.plannedJoining.toString().trim() !== "")
          .filter(item => !item.actualJoining || item.actualJoining.toString().trim() === "");

        setJoiningData(pending);

        // Process JOINING sheet for History
        if (joiningHistoryResult.success && joiningHistoryResult.data) {
          const historyRows = joiningHistoryResult.data.slice(1);
          const processedHistory = historyRows
            .filter(row => row[1] && row[1].toString().trim().startsWith("RMA-"))
            .map(row => ({
              joiningId: row[1] || "",
              enquiryNo: row[2] || "",
              indentType: row[3] || "",
              department: row[4] || "",
              designation: row[5] || "", // F: Post
              nameAsPerAadhar: row[6] || "",
              gender: row[7] || "",
              dob: row[8] || "",
              mobileNo: row[9] || "", // J: Phone Number
              email: row[10] || "", // K: Personal Email-Id
              emergencyName: row[11] || "", // L: Emergency Contact Person Name
              familyMobileNo: row[12] || "", // M: Emergency Contact Person Number
              relationship: row[13] || "", // N: Relationship
              qualification: row[14] || "", // O: Highest Qualification
              aadharNo: row[15] || "", // P: Aadhar Number
              aadharPhoto: row[16] || "", // Q: Aadhar Photo
              permanentAddress: row[17] || "", // R: Permanent Address
              currentAddress: row[18] || "", // S: Current Address
              dateOfJoining: row[19] || "", // T: Date Of Joining
              teamHead: row[20] || "", // U: Team Head
              registrationUnder: row[21] || "", // V: Registration Under
              bankName: row[22] || "", // W: Name of the Bank
              bankAc: row[23] || "", // X: Current Bank A.C No.
              ifsc: row[24] || "", // Y: Ifsc Code
              candidatePhoto: row[25] || "", // Z: Candidate's Photo Password Size
              bankPassbook: row[26] || "", // AA: Photo Of Bank Passbook
              panPhoto: row[27] || "", // AB: Upload Valid PAN Identity Proof
              studentIdPhoto: row[28] || "", // AC: Upload Student Identity Card(Artical)
              resume: row[29] || "", // AD: Resume Copy
              reportingTo: row[30] || "", // AE: Reporting To
              timestamp: row[0] || "",
            }));
          setHistoryData(processedHistory);
        }

        // Process Master sheet for Team Head List (Column D / Index 3)
        if (masterResult.success && masterResult.data) {
          const masterRows = masterResult.data.slice(1);
          const teamHeads = [...new Set(masterRows.map(row => row[3]).filter(Boolean))].sort();
          setTeamHeadList(teamHeads);
        }
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err.message);
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  useEffect(() => { fetchJoiningData(); }, []);

  // Filter logic (matching CallTracker)
  const filteredPendingData = joiningData.filter(item => {
    const matchesSearch = !searchTerm ||
      item.candidateName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.applyingForPost?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.candidateEnquiryNo?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = !filterDepartment || item.department === filterDepartment;
    return matchesSearch && matchesDept;
  });

  const filteredHistoryData = historyData.filter(item => {
    const matchesSearch = !searchTerm ||
      item.nameAsPerAadhar?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.designation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.enquiryNo?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = !filterDepartment || item.department === filterDepartment;
    return matchesSearch && matchesDept;
  });

  // Unique departments for filter
  const uniqueDepartments = [...new Set([...joiningData, ...historyData].map(item => item.department).filter(Boolean))].sort();

  // Unified Pagination logic
  const activeData = activeTab === 'pending' ? filteredPendingData : filteredHistoryData;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = activeData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(activeData.length / itemsPerPage);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Pagination navigation renderer (matching CallTracker.jsx)
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

      {[...Array(Math.max(1, totalPages))].map((_, i) => {
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
        } else if ((pageNum === currentPage - 2 && pageNum > 1) || (pageNum === currentPage + 2 && pageNum < totalPages)) {
          return <span key={pageNum} className="relative inline-flex items-center px-2 py-1 sm:px-3 sm:py-1 border border-gray-300 bg-white text-xs sm:text-sm font-medium text-gray-700">...</span>;
        }
        return null;
      })}

      <button
        onClick={() => paginate(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="relative inline-flex items-center px-1.5 py-1 sm:px-2 sm:py-1 rounded-r-md border border-gray-300 bg-white text-xs sm:text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="sr-only">Next</span>
        <svg className="h-4 w-4 sm:h-4 sm:w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      </button>
    </nav>
  );

  // Convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  // Upload file to Google Drive
  const uploadFileToGoogleDrive = async (file, type, candidateId) => {
    try {
      const base64Data = await fileToBase64(file);
      
      const folderIdsToTry = [];
      const afterJoiningId = import.meta.env.VITE_GOOGLE_DRIVE_AFTER_JOINING_FOLDER_ID;
      const enquiryId = import.meta.env.VITE_GOOGLE_DRIVE_ENQUIRY_FOLDER_ID;
      const photoId = import.meta.env.VITE_GOOGLE_DRIVE_PHOTO_FOLDER_ID;

      if (type === 'photo' && photoId) folderIdsToTry.push(photoId);
      if (enquiryId) folderIdsToTry.push(enquiryId);
      if (afterJoiningId) folderIdsToTry.push(afterJoiningId);
      if (photoId && !folderIdsToTry.includes(photoId)) folderIdsToTry.push(photoId);

      let lastError = null;

      for (const folderId of folderIdsToTry) {
        let attempts = 0;
        while (attempts < 2) {
          try {
            console.log(`Uploading file to folderId: ${folderId} (Attempt ${attempts + 1})`);
            const response = await fetch(API_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                action: 'uploadFile',
                base64Data: base64Data,
                fileName: `${candidateId}_${type}_${file.name}`,
                mimeType: file.type,
                folderId: folderId
              }),
            });

            const result = await response.json();
            if (result.success) return result.fileUrl;
            
            lastError = new Error(result.error || 'File upload failed');
          } catch (err) {
            lastError = err;
          }
          attempts++;
          if (attempts < 2) {
            console.log(`Retrying file upload to folderId: ${folderId}`);
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
        }
      }
      
      throw lastError || new Error("Failed to upload file to Google Drive");
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  // Generate next Joining ID
  const generateJoiningId = () => {
    // Use the already‑fetched history (all rows from the JOINING sheet)
    const usedIds = historyData
      .map(item => item.joiningId)
      .filter(Boolean);

    let maxNum = 0;
    usedIds.forEach(id => {
      const match = id.match(/RMA-(\d+)/);   // match your desired format
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });

    return `RMA-${String(maxNum + 1).padStart(3, '0')}`;
  };

  // Submit joining data to JOINING sheet
  const handleJoiningSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      const now = new Date();

const pad = (num) => String(num).padStart(2, '0');

const timestamp = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      const joiningId = generateJoiningId();

      // Upload files if provided
      let aadharPhotoUrl = '';
      let candidatePhotoUrl = selectedItem.candidatePhoto || '';
      let bankPassbookUrl = '';
      let studentIdCardUrl = '';
      let panCardUrl = '';
      let resumeUrl = selectedItem.candidateResume || '';

      const toastId = toast.loading('Starting document uploads...');

      if (joiningFormData.aadharFrontPhoto) {
        toast.loading('Uploading Aadhar photo...', { id: toastId });
        aadharPhotoUrl = await uploadFileToGoogleDrive(joiningFormData.aadharFrontPhoto, 'aadhar', joiningId);
      }
      if (joiningFormData.candidatePhoto) {
        toast.loading('Uploading candidate photo...', { id: toastId });
        candidatePhotoUrl = await uploadFileToGoogleDrive(joiningFormData.candidatePhoto, 'photo', joiningId);
      }
      if (joiningFormData.bankPassbookPhoto) {
        toast.loading('Uploading bank passbook...', { id: toastId });
        bankPassbookUrl = await uploadFileToGoogleDrive(joiningFormData.bankPassbookPhoto, 'passbook', joiningId);
      }
      if (joiningFormData.studentIdCardPhoto) {
        toast.loading('Uploading student ID card...', { id: toastId });
        studentIdCardUrl = await uploadFileToGoogleDrive(joiningFormData.studentIdCardPhoto, 'student_id', joiningId);
      }
      if (joiningFormData.resumeCopyFile) {
        toast.loading('Uploading resume copy...', { id: toastId });
        resumeUrl = await uploadFileToGoogleDrive(joiningFormData.resumeCopyFile, 'resume', joiningId);
      }
      if (joiningFormData.panCardPhoto) {
        toast.loading('Uploading PAN identity proof...', { id: toastId });
        panCardUrl = await uploadFileToGoogleDrive(joiningFormData.panCardPhoto, 'pan', joiningId);
      }
      
      toast.loading('Submitting form data...', { id: toastId });

      // Build row data matching JOINING sheet columns A-AE
      const rowData = new Array(31).fill("");
      rowData[0] = timestamp;                                          // A: Timestamp
      rowData[1] = joiningId;                                          // B: Joining ID
      rowData[2] = joiningFormData.candidateEnquiryNo || selectedItem.candidateEnquiryNo || ""; // C: Enquire Number
      rowData[3] = joiningFormData.indentType || selectedItem.indentType || "";                 // D: Indent Type
      rowData[4] = joiningFormData.department || selectedItem.department || "";                 // E: Department
      rowData[5] = joiningFormData.designation || selectedItem.applyingForPost || "";           // F: Post
      rowData[6] = joiningFormData.nameAsPerAadhar || selectedItem.candidateName || "";         // G: Name As Per Aadhar
      rowData[7] = joiningFormData.gender || "";                                                // H: Gender
      rowData[8] = joiningFormData.dobAsPerAadhar || selectedItem.candidateDOB || "";           // I: Date Of Birth
      rowData[9] = joiningFormData.mobileNo || selectedItem.candidatePhone || "";               // J: Phone Number
      rowData[10] = joiningFormData.personalEmail || selectedItem.candidateEmail || "";         // K: Personal Email-Id
      rowData[11] = joiningFormData.emergencyContactName || "";                                 // L: Emergency Contact Person Name
      rowData[12] = joiningFormData.familyMobileNo || "";                                       // M: Emergency Contact Person Number
      rowData[13] = joiningFormData.relationshipWithFamily || "";                               // N: Relationship With Emergency Contact Person
      rowData[14] = joiningFormData.highestQualification || "";                                 // O: Highest Qualification
      rowData[15] = joiningFormData.aadharCardNo || selectedItem.aadharNo || "";                // P: Aadhar Number
      rowData[16] = aadharPhotoUrl || "";                                                       // Q: Aadhar Photo
      rowData[17] = joiningFormData.currentAddress || selectedItem.presentAddress || "";        // R: Permanent Address
      rowData[18] = joiningFormData.currentAddress || selectedItem.presentAddress || "";        // S: Current Address
      rowData[19] = joiningFormData.dateOfJoining || "";                                        // T: Date Of Joining
      rowData[20] = joiningFormData.teamHead || "";                                             // U: Team Head
      rowData[21] = joiningFormData.registrationUnder || "";                                     // V: Registration Under
      rowData[22] = joiningFormData.bankName || "";                                             // W: Name of the Bank
      rowData[23] = joiningFormData.currentBankAc || "";                                        // X: Current Bank A.C No.
      rowData[24] = joiningFormData.ifscCode || "";                                             // Y: Ifsc Code
      rowData[25] = candidatePhotoUrl || "";                                                    // Z: Candidate's Photo Password Size
      rowData[26] = bankPassbookUrl || "";                                                      // AA: Photo Of Bank Passbook
      rowData[27] = panCardUrl || "";                                           // AB: Upload Valid PAN Identity Proof
      rowData[28] = studentIdCardUrl || "";                                                     // AC: Upload Student Identity Card(Artical)
      rowData[29] = resumeUrl || "";                                                            // AD: Resume Copy
      rowData[30] = joiningFormData.reportingTo || "";                                          // AE: Reporting To

      // Post to JOINING sheet
      const params = new URLSearchParams();
      params.append('sheetName', 'JOINING');
      params.append('action', 'insert');
      params.append('rowData', JSON.stringify(rowData));

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Server returned unsuccessful response');

      // ALSO: Sync Current Date Stamp back to ENQUIRY sheet Column AB (Index 27, Col 28)
      try {
        const enqFetchResp = await fetch(`${API_URL}?sheet=ENQUIRY&action=fetch`);
        const enqDataRes = await enqFetchResp.json();
        if (enqDataRes.success && enqDataRes.data) {
          const rows = enqDataRes.data;
          let targetRowIndex = -1;
          const searchId = (joiningFormData.candidateEnquiryNo || selectedItem.candidateEnquiryNo || "").toString().trim().toLowerCase();

          if (searchId) {
            // Match primarily by Candidate Enquiry Number (Index 2 / Column C)
            for (let i = 6; i < rows.length; i++) {
              const rowEnqNo = (rows[i][2] || "").toString().trim().toLowerCase();
              if (rowEnqNo === searchId) {
                targetRowIndex = i + 1;
                break;
              }
            }
          }

          // Fallback to Indent Number (Index 1) if Enquiry Number match fails
          if (targetRowIndex === -1 && selectedItem.indentNo) {
            const searchIndent = selectedItem.indentNo.toString().trim().toLowerCase();
            for (let i = 6; i < rows.length; i++) {
              const rowIndent = (rows[i][1] || "").toString().trim().toLowerCase();
              if (rowIndent === searchIndent) {
                targetRowIndex = i + 1;
                break;
              }
            }
          }

          if (targetRowIndex !== -1) {
            // Update Column AB (Index 28)
            // await fetch(API_URL, {
            //   method: 'POST',
            //   headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            //   body: new URLSearchParams({
            //     sheetName: 'ENQUIRY',
            //     action: 'updateCell',
            //     rowIndex: targetRowIndex.toString(),
            //     columnIndex: '28', 
            //     value: timestamp
            //   })
            // });

            // Update Column AC (Index 29)
            await fetch(API_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                sheetName: 'ENQUIRY',
                action: 'updateCell',
                rowIndex: targetRowIndex.toString(),
                columnIndex: '29', 
                value: timestamp
              })
            });
          }
        }
      } catch (enqError) {
        console.warn('Silent failure on ENQUIRY date stamp sync:', enqError);
      }

      // Send Welcome Email
      try {
        const toEmail = joiningFormData.personalEmail || selectedItem?.candidateEmail;
        const empName = joiningFormData.nameAsPerAadhar || selectedItem?.candidateName || 'Employee';
        if (toEmail) {
          await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              action: 'shareViaEmail',
              recipientEmail: toEmail,
              subject: 'Joining Registration Successfully Submitted',
              message: `Dear ${empName},\n\nYour joining registration form has been successfully submitted.\n\nWelcome to the team!\n\nBest Regards,\nHR Team`,
              documents: JSON.stringify([])
            })
          });
        }
      } catch (emailErr) {
        console.warn('Failed to send joining registration email:', emailErr);
      }

      toast.dismiss(toastId);
      toast.success(`Employee ${joiningFormData.nameAsPerAadhar || selectedItem.candidateName} registered successfully!`);
      setShowJoiningModal(false);
      setSelectedItem(null);
      fetchJoiningData(); // Refresh data
    } catch (error) {
      console.error('Joining submit error:', error);
      toast.dismiss(toastId);
      toast.error(`Failed to register: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoiningClick = (item) => {
    setSelectedItem(item);
    setJoiningFormData({
      nameAsPerAadhar: item.candidateName || '',
      fatherHusbandName: '',
      dateOfJoining: '',
      designation: item.applyingForPost || '',
      currentAddress: item.presentAddress || '',
      dobAsPerAadhar: item.candidateDOB || '',
      gender: item.gender || '',
      mobileNo: item.candidatePhone || '',
      familyMobileNo: '',
      relationshipWithFamily: '',
      currentBankAc: '',
      ifscCode: '',
      branchName: '',
      personalEmail: item.candidateEmail || '',
      highestQualification: '',
      department: item.department || '',
      equipment: '',
      aadharCardNo: item.aadharNo || '',
      aadharFrontPhoto: null,
      candidatePhoto: null,
      bankPassbookPhoto: null,
      resumeCopy: item.candidateResume || '',
      candidateEnquiryNo: item.candidateEnquiryNo || '',
      indentType: item.indentType || '',
      emergencyContactName: '',
      teamHead: '',
      registrationUnder: '',
      bankName: '',
      studentIdCardPhoto: null,
      resumeCopyFile: null,
      reportingTo: '',
      panCardPhoto: null,
    });
    setShowJoiningModal(true);
  };

  const handleShareSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    const toastId = toast.loading('Sending invitation email...');
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'shareViaEmail',
          recipientEmail: shareFormData.recipientEmail,
          subject: shareFormData.subject,
          message: shareFormData.message,
          documents: JSON.stringify([])
        }),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to send email');

      toast.success('Invitation email sent successfully!', { id: toastId });
      setShowShareModal(false);
    } catch (error) {
      console.error('Share error:', error);
      toast.error(`Error: ${error.message}`, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const handleShareClick = (item) => {
    setSelectedItem(item);
    const joinLink = `${window.location.origin}/joining-form?enquiry=${encodeURIComponent(item.candidateEnquiryNo)}`;
    setShareFormData({
      recipientName: item.candidateName || '',
      recipientEmail: item.candidateEmail || '',
      subject: `Onboarding & Joining Form: ${item.candidateName}`,
      message: `Dear ${item.candidateName || 'Candidate'},\n\nWelcome to the team! Please fill and submit your joining registration details using the link below:\n\nJoining Form Link:\n${joinLink}\n\nOnce submitted, your onboarding registration will be automatically processed.\n\nBest Regards,\nHR Team`
    });
    setShowShareModal(true);
  };

  return (
    <div className="space-y-3 md:pb-4 mb-4">
      {/* Unified "One Filter" Dashboard Toolbar (matching CallTracker.jsx) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 md:gap-4 mb-2">
        <div className="flex items-center gap-4">
          <h1 className="hidden md:block text-2xl font-bold text-gray-800">Onboarding & Joining</h1>

          {/* Segmented Tab Control (Standardized Layout) */}
          <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 shadow-sm self-start sm:self-center">
            <button
              onClick={() => { setActiveTab('pending'); setCurrentPage(1); }}
              className={`flex items-center gap-2 py-1 px-4 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all duration-200 ${activeTab === 'pending'
                ? "bg-white text-indigo-600 shadow-sm border border-gray-200"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
            >
              <Clock size={13} />
              <span>Pending ({filteredPendingData.length})</span>
            </button>
            <button
              onClick={() => { setActiveTab('history'); setCurrentPage(1); }}
              className={`flex items-center gap-2 py-1 px-4 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all duration-200 ${activeTab === 'history'
                ? "bg-white text-indigo-600 shadow-sm border border-gray-200"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
            >
              <History size={13} />
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
                placeholder="Search candidates..."
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

      {/* Unified Main Content Container (Synced with Indent.jsx) */}
      <div className="overflow-hidden border border-gray-200 rounded-lg bg-white min-h-[530px] flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <LoadingSpinner message="Retrieving joining records..." minHeight="450px" />
          </div>
        ) : (
          <>
            {/* Pending Section - Direct render without tab switching */}
            <div className="flex-1 flex flex-col">
              {/* Desktop View (Table + Footer combined) */}
              <div className="hidden md:flex flex-col border border-gray-200 rounded-lg bg-white overflow-hidden">
                <div className="max-h-[calc(105vh-280px)] min-h-[530px] overflow-y-auto scrollbar-hide">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      {activeTab === 'pending' ? (
                        <tr>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Action</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Indent Number</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Indent Type</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Candidate Enquiry Number</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Applying For the Post</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Candidate Name</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">DOB</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Candidate Phone Number</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Candidate Email</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Previous Company Name</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Job Experience</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Department</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Previous Position</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Reason Of Leaving</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Marital Status</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Last Salary Drawn</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Candidate Photo</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Present Address</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Aadhar Number</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Resume Copy</th>
                        </tr>
                      ) : (
                        <tr>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
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
                          {/* <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Registration Under</th> */}
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Name of the Bank</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Current Bank A.C No.</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Ifsc Code</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Candidate's Photo Password Size</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Photo Of Bank Passbook</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Upload Valid PAN Identity Proof</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Upload Student Identity Card(Artical)</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Resume Copy</th>
                          {/* <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Reporting To</th> */}
                        </tr>
                      )}
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {tableLoading ? (
                        <tr>
                          <td colSpan={activeTab === 'pending' ? 20 : 31} className="px-4 py-1">
                            <LoadingSpinner message="Syncing joining queue..." minHeight="300px" />
                          </td>
                        </tr>
                      ) : error ? (
                        <tr>
                          <td colSpan={activeTab === 'pending' ? 20 : 31} className="px-4 py-12 text-center">
                            <p className="text-rose-500 text-xs font-bold mb-2">Error: {error}</p>
                            <button onClick={fetchJoiningData} className="px-3 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded text-xs font-bold shadow-sm">Retry</button>
                          </td>
                        </tr>
                      ) : activeTab === 'pending' ? (
                        currentItems.length === 0 ? (
                          <tr>
                            <td colSpan={activeTab === 'pending' ? 20 : 31} className="px-4 py-24 text-center">
                              <div className="flex flex-col items-center justify-center space-y-2">
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">No candidates awaiting onboarding.</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          currentItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handleJoiningClick(item)}
                                    className="bg-indigo-600 text-white px-3 py-1 rounded-md text-xs hover:bg-indigo-700 transition-all shadow-sm active:scale-95"
                                  >
                                    Join
                                  </button>
                                  <button
                                    onClick={() => handleShareClick(item)}
                                    className="bg-emerald-500 text-white p-1.5 rounded-md hover:bg-emerald-600 transition-all shadow-sm active:scale-95 flex items-center justify-center"
                                    title="Share Onboarding"
                                  >
                                    <Share size={12} />
                                  </button>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.indentNo}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-indigo-600">{item.indentType || "—"}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.candidateEnquiryNo}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.applyingForPost}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.candidateName}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.candidateDOB}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.candidatePhone}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.candidateEmail}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.previousCompany || "-"}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.jobExperience}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.department}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.previousPosition}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 max-w-[150px] truncate" title={item.reasonForLeaving}>{item.reasonForLeaving}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.maritalStatus}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.lastSalary}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                {item.candidatePhoto ? (
                                  <a href={item.candidatePhoto} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-900 text-sm">View</a>
                                ) : <span className="text-gray-400 text-sm">—</span>}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 max-w-[200px] truncate" title={item.presentAddress}>{item.presentAddress}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.aadharNo}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                {item.candidateResume ? (
                                  <a href={item.candidateResume} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-900 text-sm">View</a>
                                ) : <span className="text-gray-400 text-sm">—</span>}
                              </td>
                            </tr>
                          ))
                        )
                      ) : (
                        // History Tab Body
                        currentItems.length === 0 ? (
                          <tr>
                            <td colSpan="31" className="px-4 py-24 text-center">
                              <div className="flex flex-col items-center justify-center space-y-2">
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">No joining history found.</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          currentItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <div className="flex items-center justify-center">
                                  <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md">
                                    <CheckCircle size={14} />
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-900">{item.joiningId}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.enquiryNo}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-indigo-600">{item.indentType || "—"}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.department}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.designation}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900">{item.nameAsPerAadhar}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.gender}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.dob}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.mobileNo}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.email}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.emergencyName}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.familyMobileNo}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.relationship}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.qualification}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.aadharNo}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                {item.aadharPhoto ? (
                                  <a href={item.aadharPhoto} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-sm">View</a>
                                ) : <span className="text-gray-400 text-sm">—</span>}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 max-w-[200px] truncate" title={item.permanentAddress}>{item.permanentAddress}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 max-w-[200px] truncate" title={item.currentAddress}>{item.currentAddress}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-emerald-600">{item.dateOfJoining}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.teamHead}</td>
                              {/* <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.registrationUnder}</td> */}
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.bankName}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.bankAc}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.ifsc}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                {item.candidatePhoto ? (
                                  <a href={item.candidatePhoto} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-sm">View</a>
                                ) : <span className="text-gray-400 text-sm">—</span>}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                {item.bankPassbook ? (
                                  <a href={item.bankPassbook} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-sm">View</a>
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
                                {item.resume ? (
                                  <a href={item.resume} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-sm">View</a>
                                ) : <span className="text-gray-400 text-sm">—</span>}
                              </td>
                              {/* <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.reportingTo}</td> */}
                            </tr>
                          ))
                        )
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
                    <div className="flex items-center gap-2 h-5">
                      <label className="text-[13px] text-gray-500 font-medium whitespace-nowrap">Rows per page:</label>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="text-xs bg-transparent font-medium text-gray-700 outline-none cursor-pointer"
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

              {/* Mobile Card View with Embedded Pagination */}
              <div className="md:hidden flex flex-col h-[calc(100vh-240px)]">
                <div className="flex-1 p-2 space-y-3 overflow-y-auto scrollbar-hide">
                  {currentItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24">
                      <p className="text-gray-500 text-lg">No {activeTab === 'pending' ? 'pending' : 'history'} candidates found.</p>
                    </div>
                  ) : (
                    currentItems.map((item, index) => (
                      <div key={item.id || index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-2.5 space-y-1.5">
                        {/* Top Bar */}
                        <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-indigo-600 text-sm">#{item.candidateEnquiryNo || item.enquiryNo}</span>
                            <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 font-medium uppercase tracking-wider">{item.department}</span>
                          </div>
                          {activeTab === 'pending' ? (
                            <button
                              onClick={() => handleJoiningClick(item)}
                              className="px-3 py-1 bg-indigo-600 text-white rounded text-xs font-bold shadow-sm active:scale-95 transition-transform"
                            >
                              Join
                            </button>
                          ) : (
                            <div className="p-1 bg-emerald-50 text-emerald-600 rounded">
                              <CheckCircle size={14} />
                            </div>
                          )}
                        </div>

                        {/* Info Rows */}
                        <div>
                          <div className="text-sm font-bold text-gray-800 tracking-tight">{item.candidateName || item.nameAsPerAadhar}</div>
                          <div className="text-xs text-gray-600 mt-0.5"><span className="text-gray-400">Post:</span> {item.applyingForPost || item.designation} | <span className="text-gray-400">Type:</span> <span className="font-bold text-indigo-600">{item.indentType || "—"}</span></div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                          <div>
                            <span className="block text-gray-400 text-[10px] uppercase">Phone</span>
                            <span className="font-medium text-gray-700">{item.candidatePhone || item.mobileNo}</span>
                          </div>
                          <div>
                            <span className="block text-gray-400 text-[10px] uppercase">{activeTab === 'pending' ? 'Exp' : 'Joined'}</span>
                            <span className="font-medium text-gray-700">{activeTab === 'pending' ? (item.jobExperience || "Fresher") : item.dateOfJoining}</span>
                          </div>
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
          </>
        )}
      </div>

      {/* Modern Joining Modal */}
      {showJoiningModal && selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in duration-300">
            <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                  <FileText className="text-white" size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">Joining Registration</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Finalizing profile for {selectedItem.candidateName}</p>
                </div>
              </div>
              <button onClick={() => setShowJoiningModal(false)} className="p-1.5 hover:bg-slate-200 rounded-full transition-colors">
                <X size={18} className="text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleJoiningSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-hide">
              {/* Personal Information */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-widest pl-1 border-l-4 border-blue-600">Personal Information</h4>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Name As Per Aadhar *</label>
                    <input type="text" required value={joiningFormData.nameAsPerAadhar} onChange={(e) => setJoiningFormData({ ...joiningFormData, nameAsPerAadhar: e.target.value })} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Father / Husband Name *</label>
                    <input type="text" required value={joiningFormData.fatherHusbandName} onChange={(e) => setJoiningFormData({ ...joiningFormData, fatherHusbandName: e.target.value })} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">DOB As Per Aadhar</label>
                    <input type="text" value={joiningFormData.dobAsPerAadhar} onChange={(e) => setJoiningFormData({ ...joiningFormData, dobAsPerAadhar: e.target.value })} className="w-full px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Gender *</label>
                    <select required value={joiningFormData.gender} onChange={(e) => setJoiningFormData({ ...joiningFormData, gender: e.target.value })} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none">
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Mobile No.</label>
                    <input type="text" value={joiningFormData.mobileNo} onChange={(e) => setJoiningFormData({ ...joiningFormData, mobileNo: e.target.value })} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Family Mobile No.</label>
                    <input type="text" value={joiningFormData.familyMobileNo} onChange={(e) => setJoiningFormData({ ...joiningFormData, familyMobileNo: e.target.value })} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Relationship With Family</label>
                    <input type="text" value={joiningFormData.relationshipWithFamily} onChange={(e) => setJoiningFormData({ ...joiningFormData, relationshipWithFamily: e.target.value })} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Personal Email-Id</label>
                    <input type="email" value={joiningFormData.personalEmail} onChange={(e) => setJoiningFormData({ ...joiningFormData, personalEmail: e.target.value })} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-1 col-span-2 lg:col-span-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Current Address</label>
                    <input type="text" value={joiningFormData.currentAddress} onChange={(e) => setJoiningFormData({ ...joiningFormData, currentAddress: e.target.value })} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Emergency Contact Person Name</label>
                    <input type="text" value={joiningFormData.emergencyContactName} onChange={(e) => setJoiningFormData({ ...joiningFormData, emergencyContactName: e.target.value })} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                </div>
              </div>

              {/* Deployment Details */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-widest pl-1 border-l-4 border-blue-600">Deployment Details</h4>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Date Of Joining *</label>
                    <input type="date" required value={joiningFormData.dateOfJoining} onChange={(e) => setJoiningFormData({ ...joiningFormData, dateOfJoining: e.target.value })} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Designation</label>
                    <input type="text" value={joiningFormData.designation} onChange={(e) => setJoiningFormData({ ...joiningFormData, designation: e.target.value })} className="w-full px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Department</label>
                    <input type="text" value={joiningFormData.department} onChange={(e) => setJoiningFormData({ ...joiningFormData, department: e.target.value })} className="w-full px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Highest Qualification</label>
                    <input type="text" value={joiningFormData.highestQualification} onChange={(e) => setJoiningFormData({ ...joiningFormData, highestQualification: e.target.value })} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Equipment</label>
                    <input type="text" value={joiningFormData.equipment} onChange={(e) => setJoiningFormData({ ...joiningFormData, equipment: e.target.value })} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Indent Type</label>
                    <input type="text" readOnly value={joiningFormData.indentType} className="w-full px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-500 cursor-not-allowed font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Enquiry Number</label>
                    <input type="text" readOnly value={joiningFormData.candidateEnquiryNo} className="w-full px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-500 cursor-not-allowed font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Team Head</label>
                    <select 
                      value={joiningFormData.teamHead} 
                      onChange={(e) => setJoiningFormData({ ...joiningFormData, teamHead: e.target.value })} 
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    >
                      <option value="">Select Team Head</option>
                      {teamHeadList.map((name, i) => (
                        <option key={i} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                  {/* <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Registration Under</label>
                    <input type="text" value={joiningFormData.registrationUnder} onChange={(e) => setJoiningFormData({ ...joiningFormData, registrationUnder: e.target.value })} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Reporting To</label>
                    <input type="text" value={joiningFormData.reportingTo} onChange={(e) => setJoiningFormData({ ...joiningFormData, reportingTo: e.target.value })} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                  </div> */}
                </div>
              </div>

              {/* Financial Information */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-widest pl-1 border-l-4 border-blue-600">Financial Information</h4>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Current Bank A.C No.</label>
                    <input type="text" value={joiningFormData.currentBankAc} onChange={(e) => setJoiningFormData({ ...joiningFormData, currentBankAc: e.target.value })} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">IFSC Code</label>
                    <input type="text" value={joiningFormData.ifscCode} onChange={(e) => setJoiningFormData({ ...joiningFormData, ifscCode: e.target.value })} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Branch Name</label>
                    <input type="text" value={joiningFormData.branchName} onChange={(e) => setJoiningFormData({ ...joiningFormData, branchName: e.target.value })} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Aadhar Card No.</label>
                    <input type="text" value={joiningFormData.aadharCardNo} onChange={(e) => setJoiningFormData({ ...joiningFormData, aadharCardNo: e.target.value })} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Name of the Bank</label>
                    <input type="text" value={joiningFormData.bankName} onChange={(e) => setJoiningFormData({ ...joiningFormData, bankName: e.target.value })} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                </div>
              </div>

              {/* Document Uploads */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-widest pl-1 border-l-4 border-blue-600">Document Uploads</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Aadhar Frontside Photo</label>
                    <label className="flex items-center gap-2 p-2 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                      <Upload size={14} className="text-slate-400" />
                      <span className="text-[11px] text-slate-600 truncate">{joiningFormData.aadharFrontPhoto?.name || 'Choose file...'}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => setJoiningFormData({ ...joiningFormData, aadharFrontPhoto: e.target.files[0] })} />
                    </label>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Candidate's Photo</label>
                    <label className="flex items-center gap-2 p-2 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                      <Upload size={14} className="text-slate-400" />
                      <span className="text-[11px] text-slate-600 truncate">{joiningFormData.candidatePhoto?.name || 'Choose file...'}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => setJoiningFormData({ ...joiningFormData, candidatePhoto: e.target.files[0] })} />
                    </label>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Bank Passbook Photo</label>
                    <label className="flex items-center gap-2 p-2 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                      <Upload size={14} className="text-slate-400" />
                      <span className="text-[11px] text-slate-600 truncate">{joiningFormData.bankPassbookPhoto?.name || 'Choose file...'}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => setJoiningFormData({ ...joiningFormData, bankPassbookPhoto: e.target.files[0] })} />
                    </label>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Student Identity Card (Artical)</label>
                    <label className="flex items-center gap-2 p-2 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                      <Upload size={14} className="text-slate-400" />
                      <span className="text-[11px] text-slate-600 truncate">{joiningFormData.studentIdCardPhoto?.name || 'Choose file...'}</span>
                      <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setJoiningFormData({ ...joiningFormData, studentIdCardPhoto: e.target.files[0] })} />
                    </label>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Resume Copy</label>
                    <label className="flex items-center gap-2 p-2 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                      <Upload size={14} className="text-slate-400" />
                      <span className="text-[11px] text-slate-600 truncate">{joiningFormData.resumeCopyFile?.name || 'Choose file...'}</span>
                      <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => setJoiningFormData({ ...joiningFormData, resumeCopyFile: e.target.files[0] })} />
                    </label>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Valid PAN Identity Proof</label>
                    <label className="flex items-center gap-2 p-2 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                      <Upload size={14} className="text-slate-400" />
                      <span className="text-[11px] text-slate-600 truncate">{joiningFormData.panCardPhoto?.name || 'Choose file...'}</span>
                      <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setJoiningFormData({ ...joiningFormData, panCardPhoto: e.target.files[0] })} />
                    </label>
                  </div>
                </div>
              </div>
            </form>

            <div className="p-4 px-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowJoiningModal(false)}
                className="px-5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleJoiningSubmit}
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 rounded-lg text-xs font-bold text-white hover:bg-blue-700 transition-all shadow-md shadow-blue-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting ? (
                  <><Clock size={12} className="animate-spin" /> Submitting...</>
                ) : (
                  'Register Employee'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <Mail className="text-white" size={18} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Share Onboarding</h3>
              </div>
              <button onClick={() => setShowShareModal(false)} className="p-1 hover:bg-slate-100 rounded-full">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recipient Name</label>
                <input
                  type="text"
                  value={shareFormData.recipientName}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  readOnly
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Address</label>
                <input
                  type="email"
                  value={shareFormData.recipientEmail}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Personal Message</label>
                <textarea
                  rows={4}
                  value={shareFormData.message}
                  onChange={(e) => setShareFormData(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Attached Form Link</label>
                <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl text-xs flex items-center justify-between gap-2">
                  <a
                    href={`${window.location.origin}/joining-form?enquiry=${encodeURIComponent(selectedItem.candidateEnquiryNo)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 font-medium hover:underline truncate flex-1"
                  >
                    {`${window.location.origin}/joining-form?enquiry=${selectedItem.candidateEnquiryNo}`}
                  </a>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 rounded-b-3xl flex justify-end gap-3">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-5 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
              >
                Discard
              </button>
              <button
                onClick={handleShareSubmit}
                disabled={submitting}
                className="px-6 py-2 bg-emerald-500 rounded-xl text-xs font-bold text-white hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting ? (
                  <><Clock size={12} className="animate-spin" /> Sending...</>
                ) : (
                  'Send Invite'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Joining;
