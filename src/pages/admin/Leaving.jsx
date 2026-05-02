import React, { useState, useEffect } from 'react';
import { Filter, Search, Clock, CheckCircle, X, User, Briefcase, Calendar, AlertCircle, ArrowRight, Layout, History, ChevronDown, Check, MoreHorizontal, LogOut, Share2, Download, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';

// Helper Component for Document/Photo Links
const PhotoCell = ({ url, label }) => {
  if (!url || url === '' || url === 'N/A') return <span className="text-gray-400 text-[10px] font-bold tracking-wider opacity-60">N/A</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center px-2.5 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-wider rounded border border-indigo-200 hover:bg-indigo-100 hover:text-indigo-700 transition-colors"
    >
      View
    </a>
  );
};

const Leaving = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [pendingData, setPendingData] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    dateOfLeaving: '',
    mobileNumber: '',
    reasonOfLeaving: '',
    firmName: '',
    fatherName: '',
    dateOfJoining: '',
    workLocation: '',
    designation: '',
    department: ''
  });

  // New filtering and pagination states
  const [filterDepartment, setFilterDepartment] = useState('');
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

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
    return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${enforcedYear} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  };

  const fetchJoiningData = async () => {
    setTableLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=JOINING&action=fetch`);
      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        console.error("fetchJoiningData Parse Error. Raw:", text);
        throw new Error("Invalid JOINING data format");
      }

      if (result.success) {
        const rawData = result.data || result;
        const headers = rawData[5];
        const getIndex = (headerName) => {
          const index = headers.findIndex(
            (h) => h && h.toString().trim().toLowerCase() === headerName.toLowerCase()
          );
          return index;
        };
        const leavingDateIdx = getIndex("Date of Leaving") !== -1 ? getIndex("Date of Leaving") : getIndex("Leaving Date");

        const dataRows = rawData.length > 6 ? rawData.slice(6) : [];

        const processedPending = dataRows
        .filter(row => {
  const colAF = row[31]; // Column AF

  // ✅ Pending = AF is EMPTY
  return !colAF || colAF.toString().trim() === '';
})

          .map((row, index) => ({
            rowIndex: index + 7,
            employeeNo: row[1] || '',
            enquiryNo: row[2] || '',
            indentType: row[3] || '',
            department: row[4] || '',
            designation: row[5] || '',
            candidateName: row[6] || '',
            gender: row[7] || '',
            dob: row[8] || '',
            mobileNo: row[9] || '',
            personalEmail: row[10] || '',
            emergencyName: row[11] || '',
            familyMobileNo: row[12] || '',
            relationship: row[13] || '',
            qualification: row[14] || '',
            aadharCardNo: row[15] || '',
            aadharPhoto: row[16] || '',
            permanentAddress: row[17] || '',
            currentAddress: row[18] || '',
            dateOfJoining: row[19] || '',
            teamHead: row[20] || '',
            registrationUnder: row[21] || '',
            bankName: row[22] || '',
            bankAccount: row[23] || '',
            ifscCode: row[24] || '',
            candidatePhoto: row[25] || '',
            bankPassbookPhoto: row[26] || '',
            panPhoto: row[27] || '',
            studentIdPhoto: row[28] || '',
            resumeCopy: row[29] || '',
            reportingTo: row[30] || '',
            fatherName: getIndex("Father / Husband name") !== -1 ? row[getIndex("Father / Husband name")] : '',
            equipment: getIndex("Equipment") !== -1 ? row[getIndex("Equipment")] : '',
            firmName: getIndex("Firm Name") !== -1 ? row[getIndex("Firm Name")] : '',
            workingLocation: getIndex("Working Location") !== -1 ? row[getIndex("Working Location")] : '',
            leavingDate: leavingDateIdx !== -1 ? row[leavingDateIdx] : '',
          }));

        setPendingData(processedPending);


const processedHistory = dataRows
  .filter(row => {
    const colAF = row[31]; // AF

    // History = AF filled
    return colAF && colAF.toString().trim() !== '';
  })
  .map((row, index) => ({
    rowIndex: index + 7,
    employeeId: row[1] || '',
    enquiryNo: row[2] || '',
    indentType: row[3] || '',
    name: row[6] || '',
    department: row[4] || '',
    designation: row[5] || '',
    dateOfJoining: row[19] || '',
    mobileNo: row[9] || '',
    leavingDate: row[31] || '',
    reasonOfLeaving: 'Exit Processed',
    firmName: getIndex("Firm Name") !== -1 ? row[getIndex("Firm Name")] : '',
    fatherName: getIndex("Father / Husband name") !== -1 ? row[getIndex("Father / Husband name")] : '',
    workingLocation: getIndex("Working Location") !== -1 ? row[getIndex("Working Location")] : '',
  }));

setHistoryData(prev => {
  const existingIds = new Set(prev.map(p => p.employeeId));
  const filteredNew = processedHistory.filter(p => !existingIds.has(p.employeeId));
  return [...prev, ...filteredNew];
});

      }
    } catch (err) {
      console.error("fetchJoiningData Error:", err);
      setError(err.message);
    } finally {
      setTableLoading(false);
    }
  };

  const fetchLeavingData = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=LEAVING&action=fetch`);
      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        console.error("fetchLeavingData Parse Error. Raw:", text);
        return;
      }

      if (result.success) {
        const rawData = result.data || result;
        const dataRows = rawData.length > 6 ? rawData.slice(6) : [];
        const processed = dataRows.map(row => ({
          employeeId: row[1] || '',
          name: row[2] || '',
          dateOfLeaving: row[3] || '',
          mobileNo: row[4] || '',
          reasonOfLeaving: row[5] || '',
          firmName: row[6] || '',
          fatherName: row[7] || '',
          dateOfJoining: row[8] || '',
          workingLocation: row[9] || '',
          designation: row[10] || '',
          department: row[11] || '',
          enquiryNo: row[22] || '',
          indentType: row[23] || '',
        }));
        
        setHistoryData(prev => {
          // Priority: LEAVING sheet data should replace JOINING sheet data for the same ID
          const otherData = prev.filter(p => !processed.find(newP => newP.employeeId === p.employeeId));
          return [...otherData, ...processed];
        });
      }
    } catch (err) { console.error("fetchLeavingData Error:", err); }
  };

  useEffect(() => { fetchJoiningData(); fetchLeavingData(); }, []);

  // Reset page on tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  // Unique departments for filtering
  const allDepartments = [
    ...new Set([
      ...pendingData.map(i => i.department),
      ...historyData.map(i => i.department)
    ])
  ].filter(Boolean).sort();

  const filterData = (data) => {
    return data.filter(item => {
      const matchesSearch =
        (item.candidateName || item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.employeeNo || item.employeeId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.designation || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.department || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.aadharNo || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDept = !filterDepartment || item.department === filterDepartment;

      // Basic date matching (checks if date string includes filter string)
      const matchesDate = !filterDate ||
        (item.dateOfJoining && item.dateOfJoining.includes(filterDate)) ||
        (item.dateOfLeaving && item.dateOfLeaving.includes(filterDate));

      return matchesSearch && matchesDept && matchesDate;
    });
  };

  const displayPendingFiltered = filterData(pendingData);
  const displayHistoryFiltered = filterData(historyData);

  const currentItems = activeTab === 'pending' ? displayPendingFiltered : displayHistoryFiltered;

  // Pagination logic
  const totalPages = Math.ceil(currentItems.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedItems = currentItems.slice(indexOfFirstItem, indexOfLastItem);

  const handleLeavingClick = (item) => {
    setSelectedItem(item);
    setFormData({
      dateOfLeaving: '',
      reasonOfLeaving: '',
      mobileNumber: item.mobileNo || '',
      firmName: item.firmName || '',
      fatherName: item.fatherName || '',
      dateOfJoining: item.dateOfJoining || '',
      workLocation: item.workingLocation || '',
      designation: item.designation || '',
      department: item.department || ''
    });
    setShowModal(true);
  };

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    // window.scrollTo({ top: 0, behavior: 'smooth' }); // Optional, kept for parity if desired
  };

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
              className={`relative inline-flex items-center px-3 py-1 sm:px-3.5 sm:py-1.5 border text-xs sm:text-sm font-medium ${currentPage === pageNum ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}`}
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

  const getCurrentTimestamp = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const enforcedYear = now.getFullYear() === 2028 ? 2026 : now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${enforcedYear} ${hours}:${minutes}:${seconds}`;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!formData.dateOfLeaving || !formData.reasonOfLeaving) {
      toast.error("Please fill all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const timestamp = await fetchServerTimestamp();

      // Construct rowData array to match Sheet Columns A to L
 const rowData = [
  timestamp,                                       // A (0)
  selectedItem.employeeNo || '',                    // B (1)
  (selectedItem.candidateName || selectedItem.name) || '', // C (2)
  formData.dateOfLeaving || '',                    // D (3)
  formData.mobileNumber || '',                      // E (4)
  formData.reasonOfLeaving || '',                  // F (5)
  formData.firmName || '',                         // G (6)
  formData.fatherName || '',                       // H (7)
  formData.dateOfJoining || '',                    // I (8)
  formData.workLocation || '',                     // J (9)
  formData.designation || '',                       // K (10)
  formData.department || '',                        // L (11)

  '', '', '', '', '', '', '', '', '', '',  // M to V (12–21)

  selectedItem.enquiryNo || '',           // W (22) ✅
  selectedItem.indentType || ''           // X (23) ✅
];

      console.log("Submitting Exit RowData:", rowData);

      // 1. Insert into LEAVING sheet using rowData format
      const leavingResponse = await fetch(import.meta.env.VITE_APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'insert',
          sheetName: 'LEAVING',
          rowData: JSON.stringify(rowData)
        })
      });

      const responseText = await leavingResponse.text();
      let leavingResult;

      try {
        leavingResult = JSON.parse(responseText);
      } catch (e) {
        console.error("Critical: handleSubmit Parse Error. Raw Server Response:", responseText);
        // Robust fallback: if response includes success indicators, treat as success
        if (responseText.toLowerCase().includes("success") || responseText.trim().toLowerCase() === "ok") {
          leavingResult = { success: true };
        } else {
          throw new Error(`Server Response Error: ${responseText.substring(0, 50)}...`);
        }
      }

      if (leavingResult && leavingResult.success) {

        toast.success("Employee processed for exit successfully");
        setShowModal(false);
        await fetchJoiningData();
        await fetchLeavingData();
      } else {
        throw new Error((leavingResult && leavingResult.error) || "Failed to process exit");
      }
    } catch (err) {
      console.error("handleSubmit Caught Error:", err);
      toast.error(err.message || "An error occurred during submission");
    } finally {
      setTimeout(() => setSubmitting(false), 500);
    }
  };



  return (
    <div className="space-y-3 md:pb-4 mb-4">
      {/* Unified "One Filter" Dashboard Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 md:gap-4 mb-2">
        <div className="flex items-center gap-4">
          <h1 className="hidden md:block text-2xl font-bold text-gray-800">Off-boarding</h1>

          {/* Segmented Tab Control (Integrated into Filter Row) */}
          <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 shadow-sm self-start sm:self-center">
            <button
              onClick={() => { setActiveTab("pending"); setCurrentPage(1); }}
              className={`flex items-center gap-2 py-1 px-4 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all duration-200 ${activeTab === "pending"
                ? "bg-white text-indigo-600 shadow-sm border border-gray-200"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
            >
              <Clock size={13} />
              <span>Pending ({displayPendingFiltered.length})</span>
            </button>
            <button
              onClick={() => { setActiveTab("history"); setCurrentPage(1); }}
              className={`flex items-center gap-2 py-1 px-4 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all duration-200 ${activeTab === "history"
                ? "bg-white text-indigo-600 shadow-sm border border-gray-200"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
            >
              <History size={13} />
              <span>History ({displayHistoryFiltered.length})</span>
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
                placeholder="Search by name, ID or post..."
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
                    {allDepartments.map((dept, index) => (
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
                  className="w-full bg-transparent focus:outline-none text-[11px] font-medium cursor-pointer uppercase"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Unified Main Content Container */}
      <div className="overflow-hidden border border-gray-200 rounded-lg bg-white min-h-[530px] flex flex-col">
        {tableLoading ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <LoadingSpinner message="Retrieving exit records..." minHeight="450px" />
          </div>
        ) : (
          <>
            {activeTab === "pending" && (
              <div className="flex-1 flex flex-col">
                {/* Desktop View (Table + Footer combined) */}
                <div className="hidden md:flex flex-col border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm">
                  <div className="max-h-[calc(105vh-280px)] min-h-[530px] overflow-auto scrollbar-hide">
                    <table className="w-max min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0 z-20">
                        <tr>
                          <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap sticky left-0 z-30 bg-gray-100/90 backdrop-blur shadow-sm border-r border-gray-200">Action</th>
                          <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap sticky left-[125px] z-30 bg-gray-100/90 backdrop-blur shadow-sm border-r border-gray-200">Joining ID</th>
                          <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Enquiry No.</th>
                          <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Indent Type</th>
                          <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Name As Per Aadhar</th>
                          {/* <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Father / Husband name</th> */}
                          <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Date Of Joining</th>
                          <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Designation</th>
                          <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Aadhar Frontside</th>
                          <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Candidate Photo</th>
                          <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Current Address</th>
                          <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">DOB (Aadhar)</th>
                          <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Gender</th>
                          <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Mobile No.</th>
                          <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Family Mobile</th>
                          <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Relationship</th>
                          <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Bank A.C No.</th>
                          <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">IFSC Code</th>
                          {/* <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Branch Name</th> */}
                          <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Bank Passbook</th>
                          <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Personal Email</th>
                          <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Qualification</th>
                          <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Department</th>
                          {/* <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Equipment</th> */}
                          <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Aadhar Card No</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {paginatedItems.length === 0 ? (
                          <tr>
                            <td colSpan="25" className="px-4 py-24 text-center">
                              <div className="flex flex-col items-center justify-center space-y-2">
                                <LogOut size={40} className="text-gray-200" />
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest text-center">No pending exits found.</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          paginatedItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                              <td className="px-6 py-4 whitespace-nowrap text-center sticky left-0 z-10 bg-white/95 backdrop-blur group-hover:bg-gray-50/95 border-r border-gray-100 shadow-sm transition-colors">
                                <button
                                  onClick={() => handleLeavingClick(item)}
                                  className="bg-rose-600 text-white px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider hover:bg-rose-700 transition-all shadow-md active:scale-95 flex items-center gap-2 mx-auto"
                                >
                                  Process Exit
                                  <ArrowRight size={10} />
                                </button>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 font-medium sticky left-[125px] z-10 bg-white/95 backdrop-blur group-hover:bg-gray-50/95 border-r border-gray-100 shadow-sm transition-colors">{item.employeeNo}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-indigo-600 font-bold">{item.enquiryNo || 'N/A'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-[10px] font-bold uppercase tracking-wider">{item.indentType || 'N/A'}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900 font-bold">{item.candidateName}</td>
                              {/* <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-600">{item.fatherName}</td> */}
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.dateOfJoining}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                                <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold uppercase">{item.designation}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <PhotoCell url={item.aadharPhoto} label="Aadhar" />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <PhotoCell url={item.candidatePhoto} label="Candidate" />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 max-w-[150px] truncate" title={item.currentAddress}>{item.currentAddress}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.dob}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.gender}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-700 font-bold">{item.mobileNo}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.familyMobileNo}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.relationship}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 font-mono tracking-tighter">{item.bankAccount}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 font-mono">{item.ifscCode}</td>
                              {/* <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.branchName}</td> */}
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <PhotoCell url={item.bankPassbookPhoto} label="Passbook" />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-indigo-500 font-medium lowercase tracking-tighter">{item.personalEmail}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.qualification}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-700 font-bold tracking-tight">{item.department}</td>
                              {/* <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 tracking-tighter">{item.equipment}</td> */}
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-700 font-bold font-mono">{item.aadharCardNo}</td>
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
                        Showing <span className="font-bold text-gray-900">{currentItems.length > 0 ? indexOfFirstItem + 1 : 0}</span> to <span className="font-bold text-gray-900">{Math.min(indexOfLastItem, currentItems.length)}</span> of <span className="font-bold text-gray-900">{currentItems.length}</span> records
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
                    {paginatedItems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-24">
                        <p className="text-gray-500 text-lg">No pending exits found.</p>
                      </div>
                    ) : (
                      paginatedItems.map((item, index) => (
                        <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-2.5 space-y-1.5">
                          {/* Top Bar */}
                          <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-indigo-600 text-sm">#{item.employeeNo}</span>
                              <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 font-medium uppercase tracking-wider">{item.department || 'N/A'}</span>
                              {item.indentType && <span className="text-[10px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">{item.indentType}</span>}
                              {item.enquiryNo && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold tracking-tighter">Eq: {item.enquiryNo}</span>}
                            </div>
                            <button
                              onClick={() => handleLeavingClick(item)}
                              className="px-3 py-1 bg-rose-600 text-white rounded text-[10px] font-black uppercase tracking-wider shadow-sm active:scale-95"
                            >
                              Process Exit
                            </button>
                          </div>

                          {/* Info Rows */}
                          <div>
                            <div className="text-sm font-bold text-gray-800 tracking-tight">{item.candidateName}</div>
                            <div className="text-xs text-gray-600 mt-0.5"><span className="text-gray-400">Post:</span> {item.designation}</div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                            <div>
                              <span className="block text-gray-400 text-[10px] uppercase tracking-tighter">Joined/Phone</span>
                              <span className="font-medium text-gray-700 block text-[10px] truncate">{item.dateOfJoining}</span>
                              <span className="font-medium text-gray-700 block text-[10px]">{item.mobileNo || "N/A"}</span>
                            </div>
                            <div>
                              <span className="block text-gray-400 text-[10px] uppercase tracking-tighter">Gender/Aadhar</span>
                              <span className="font-medium text-gray-700 block text-[10px]">{item.gender || "N/A"}</span>
                              <span className="font-medium text-gray-700 block text-[10px]">{item.aadharNo || "N/A"}</span>
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
            )}

            {activeTab === "history" && (
              <div className="flex-1 flex flex-col">
                {/* Desktop View (Table + Footer combined) */}
                <div className="hidden md:flex flex-col border border-gray-200 rounded-lg bg-white overflow-hidden">
                  <div className="max-h-[calc(100vh-280px)] min-h-[500px] overflow-y-auto scrollbar-hide">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Emp ID</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Name</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Leaving Date</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Mobile Number</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Reason</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Firm Name</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Father Name</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Joining Date</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Work Location</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Designation</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Department</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {paginatedItems.length === 0 ? (
                          <tr>
                            <td colSpan="11" className="px-4 py-24 text-center">
                              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">No history recorded.</p>
                            </td>
                          </tr>
                        ) : (
                          paginatedItems.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 font-medium">{item.employeeId}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900 font-bold">{item.name}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-rose-600 font-bold">{item.dateOfLeaving}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.mobileNo || item.mobileNumber || 'N/A'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.reasonOfLeaving}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.firmName}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.fatherName}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.dateOfJoining}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.workingLocation || item.workLocation}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.designation}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.department}</td>
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
                        Showing <span className="font-bold text-gray-900">{currentItems.length > 0 ? indexOfFirstItem + 1 : 0}</span> to <span className="font-bold text-gray-900">{Math.min(indexOfLastItem, currentItems.length)}</span> of <span className="font-bold text-gray-900">{currentItems.length}</span> records
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

                {/* Mobile History View */}
                <div className="md:hidden flex flex-col h-[calc(105vh-240px)]">
                  <div className="flex-1 p-2 space-y-3 overflow-y-auto scrollbar-hide">
                    {paginatedItems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-24">
                        <p className="text-gray-500 text-lg">No history found.</p>
                      </div>
                    ) : (
                      paginatedItems.map((item, index) => (
                        <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-2.5 space-y-2">
                          <div className="flex justify-between items-center bg-gray-50 -mx-2.5 -mt-2.5 p-2 px-3 rounded-t-lg border-b border-gray-100 mb-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-indigo-600 text-xs tracking-tight">#{item.employeeId}</span>
                              {item.indentType && <span className="text-[9px] bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">{item.indentType}</span>}
                              {item.enquiryNo && <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold tracking-tighter">Eq: {item.enquiryNo}</span>}
                            </div>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-red-100 text-red-700">
                              Exit Processed
                            </span>
                          </div>

                          <div className="flex justify-between items-start pt-1">
                            <div className="text-sm font-bold text-gray-900 leading-tight">Reason:</div>
                            <div className="text-[11px] text-gray-600 font-medium text-right max-w-[60%]">"{item.reasonOfLeaving || '-'}"</div>
                          </div>

                          <div className="flex justify-between items-start pt-1">
                            <div className="text-xs text-gray-500">Name:</div>
                            <div className="text-[11px] text-gray-800 font-bold">{item.name}</div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-400 border-t border-gray-50 pt-2">
                            <div>
                              <span className="block uppercase">Joined</span>
                              <span className="font-medium text-gray-600">{item.dateOfJoining}</span>
                            </div>
                            <div className="flex flex-col items-start gap-1 text-[10px] font-black">
                              <span className="block uppercase">Left</span>
                              <span className="text-rose-600 font-medium">{item.dateOfLeaving}</span>
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
            )}
          </>
        )}
      </div>

      {/* Exit Modal Refactored (Compact & Premium) */}
      {showModal && selectedItem && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4 backdrop-blur-sm bg-black/20 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-8 overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-rose-50/20">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertCircle size={20} />
                <h3 className="text-base font-black text-gray-800 tracking-tight">Process Employee Exit</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 shadow-sm">
                  <User size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-800 leading-none">{selectedItem.candidateName || selectedItem.name}</h4>
                  <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest mt-1">{selectedItem.employeeNo || selectedItem.employeeId}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5 bg-gray-50/50 border border-gray-100 p-3 rounded-xl">
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Mobile Number</label>
                    <input
                      type="text"
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all text-gray-600"
                      value={formData.mobileNumber}
                      onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Firm Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all text-gray-600"
                      value={formData.firmName}
                      onChange={(e) => setFormData({ ...formData, firmName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Father Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all text-gray-600"
                      value={formData.fatherName}
                      onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Date Of Joining</label>
                    <input
                      type="text"
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all text-gray-600"
                      value={formData.dateOfJoining}
                      onChange={(e) => setFormData({ ...formData, dateOfJoining: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Work Location</label>
                    <input
                      type="text"
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all text-gray-600"
                      value={formData.workLocation}
                      onChange={(e) => setFormData({ ...formData, workLocation: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Designation</label>
                    <input
                      type="text"
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all text-gray-600"
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Department</label>
                    <input
                      type="text"
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all text-gray-600"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Last Working Day *</label>
                  <div className="relative">
                    <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      required
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:ring-4 focus:ring-rose-50 focus:border-rose-500 outline-none transition-all uppercase"
                      value={formData.dateOfLeaving}
                      onChange={(e) => setFormData({ ...formData, dateOfLeaving: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Primary Reason *</label>
                  <div className="relative">
                    <AlertCircle size={13} className="absolute left-3 top-3 text-gray-400" />
                    <textarea
                      required
                      rows={2}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:ring-4 focus:ring-rose-50 focus:border-rose-500 outline-none transition-all resize-none placeholder:text-gray-300 placeholder:font-medium"
                      placeholder="e.g. Resigned for better opportunity..."
                      value={formData.reasonOfLeaving}
                      onChange={(e) => setFormData({ ...formData, reasonOfLeaving: e.target.value })}
                    />
                  </div>
                </div>

                <div className="p-2.5 bg-rose-50/50 rounded-xl border border-rose-100 flex items-start gap-2.5">
                  <AlertCircle size={14} className="text-rose-600 shrink-0 mt-0.5" />
                  <p className="text-[9px] font-bold text-rose-700 leading-normal italic">
                    Note: Processing this exit will archive all records. Ensure all assets have been recovered.
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 bg-white border border-gray-300 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 shadow-lg shadow-rose-100 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  {submitting ? (
                    <Clock size={12} className="animate-spin" />
                  ) : (
                    <LogOut size={12} />
                  )}
                  {submitting ? 'Archiving...' : 'Confirm Exit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaving;
