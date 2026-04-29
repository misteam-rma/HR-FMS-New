import React, { useState, useEffect } from 'react';
import { Search, Clock, CheckCircle, X, Upload, History, ChevronDown, Check, Calendar, Filter, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';

const CallTracker = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [followUpData, setFollowUpData] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    candidateSays: '',
    status: '',
    nextDate: ''
  });
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [enquiryData, setEnquiryData] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [error, setError] = useState(null);

  // New filtering and pagination states (Synced with FindEnquiry.jsx)
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const fetchEnquiryData = async () => {
    setLoading(true);
    setTableLoading(true);
    setError(null);

    try {
      const [enquiryResponse, followUpResponse] = await Promise.all([
        fetch(
          `${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=ENQUIRY&action=fetch`
        ),
        fetch(
          `${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=Follow - Up&action=fetch`
        ),
      ]);

      if (!enquiryResponse.ok || !followUpResponse.ok) {
        throw new Error(
          `HTTP error! status: ${enquiryResponse.status} or ${followUpResponse.status}`
        );
      }

      const [enquiryResult, followUpResult] = await Promise.all([
        enquiryResponse.json(),
        followUpResponse.json(),
      ]);

      if (
        !enquiryResult.success ||
        !enquiryResult.data ||
        enquiryResult.data.length < 7
      ) {
        throw new Error(
          enquiryResult.error || "Not enough rows in enquiry sheet data"
        );
      }

      // Process enquiry data
      const enquiryHeaders = enquiryResult.data[5].map((h) => h.trim());
      const enquiryDataFromRow7 = enquiryResult.data.slice(6);

      const getIndex = (headerName) =>
        enquiryHeaders.findIndex((h) => h === headerName);

      const processedEnquiryData = enquiryDataFromRow7
        .filter((row) => {
          const planned = row[21]; // Column V
          const actual = row[22];  // Column W
          return planned && planned.toString().trim() !== '' && 
                 (!actual || actual.toString().trim() === "");
        })
        .map((row) => ({
          id: row[0] || Math.random().toString(),
          indentNo: row[1] || "",
          candidateEnquiryNo: row[2] || "",
          indentType: row[3] || "",
          applyingForPost: row[4] || "",
          department: row[5] || "",
          candidateName: row[6] || "",
          candidateDOB: row[7] || "",
          candidatePhone: row[8] || "",
          candidateEmail: row[9] || "",
          previousCompany: row[10] || "",
          jobExperience: row[11] || "",
          previousPosition: row[12] || "",
          reasonForLeaving: row[13] || "",
          maritalStatus: row[14] || "",
          lastSalary: row[15] || "",
          candidatePhoto: row[16] || "",
          gender: row[17] || "",
          presentAddress: row[18] || "",
          aadharNo: row[19] || "",
          candidateResume: row[20] || "",
        }));

      setEnquiryData(processedEnquiryData);


    } catch (error) {
      console.error("Error fetching data:", error);
      setError(error.message);
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  const fetchFollowUpData = async () => {
    setLoading(true);
    setTableLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=Follow - Up&action=fetch`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Raw API response:', result);

      if (!result.success) {
        throw new Error(result.error || 'Google Script returned an error');
      }

      // Handle both array formats (direct data or result.data)
      const rawData = result.data || result;

      if (!Array.isArray(rawData)) {
        throw new Error('Expected array data not received');
      }

      // Process data - skip header row if present
      const dataRows = rawData.length > 0 && Array.isArray(rawData[0]) ? rawData.slice(1) : rawData;

      const processedData = dataRows.map(row => ({
        timestamp: row[0] || '',       // Column A (index 0) - Timestamp
        enquiryNo: row[1] || '',       // Column B (index 1) - Enquiry No
        status: row[2] || '',          // Column C (index 2) - Status
        candidateSays: row[3] || '',   // Column D (index 3) - Candidates Says
        nextDate: row[4] || ''         // Column E (index 4) - Next Date
      }));

      console.log('Processed follow-up data:', processedData);
      setHistoryData(processedData);

    } catch (error) {
      console.error('Error in fetchFollowUpData:', error);
      setError(error.message);
      toast.error(`Failed to load follow-ups: ${error.message}`);
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiryData();
    fetchFollowUpData();
  }, []);

  const pendingData = enquiryData;

  const handleCallClick = (item) => {
    setSelectedItem(item);
    setFormData({
      candidateSays: '',
      status: '',
      nextDate: ''
    });
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };


  const postToSheet = async (rowData) => {
    const URL = import.meta.env.VITE_APPS_SCRIPT_URL;

    try {
      console.log('Attempting to post:', {
        sheetName: 'Follow - Up',
        rowData: rowData
      });

      const params = new URLSearchParams();
      params.append('sheetName', 'Follow - Up');
      params.append('action', 'insert');
      params.append('rowData', JSON.stringify(rowData));

      const response = await fetch(URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Server response:', data);

      if (!data.success) {
        throw new Error(data.error || 'Server returned unsuccessful response');
      }

      return data;
    } catch (error) {
      console.error('Full error details:', {
        error: error.message,
        stack: error.stack,
        rowData: rowData,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to update sheet: ${error.message}`);
    }
  };

  const updateEnquirySheet = async (enquiryNo) => {
    const URL = import.meta.env.VITE_APPS_SCRIPT_URL;

    try {
      console.log('Attempting to update ENQUIRY sheet for:', enquiryNo);

      // First, fetch the ENQUIRY sheet data to find the correct row
      const fetchResponse = await fetch(
        `${URL}?sheet=ENQUIRY&action=fetch`
      );

      if (!fetchResponse.ok) {
        throw new Error(`HTTP error! status: ${fetchResponse.status}`);
      }

      const fetchResult = await fetchResponse.json();

      if (!fetchResult.success || !fetchResult.data) {
        throw new Error('Failed to fetch ENQUIRY sheet data');
      }

      // Find the row with matching enquiry number (Column C is index 2)
      let targetRowIndex = -1;
      const sheetData = fetchResult.data;

      for (let i = 0; i < sheetData.length; i++) {
        if (sheetData[i][2] === enquiryNo) { // Column C (index 2)
          targetRowIndex = i + 1; // Convert to 1-based index for Google Sheets
          break;
        }
      }

      if (targetRowIndex === -1) {
        throw new Error(`Enquiry number ${enquiryNo} not found in ENQUIRY sheet`);
      }

      console.log(`Found enquiry ${enquiryNo} at row ${targetRowIndex}`);

      // Format current date and time as 9/21/2020 14:21:19
      const now = new Date();
      const month = now.getMonth() + 1; // getMonth() returns 0-11
      const day = now.getDate();
      const year = now.getFullYear();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();

      const formattedDateTime = `${month}/${day}/${year} ${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

      // Now update the specific cell using updateCell action
      const params = new URLSearchParams();
      params.append('sheetName', 'ENQUIRY');
      params.append('action', 'updateCell');
      params.append('rowIndex', targetRowIndex.toString());

      // params.append('columnIndex', '27'); // Column AA is index 27 (1-based)
      params.append('value', formattedDateTime);

      const response = await fetch(URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('ENQUIRY sheet update response:', data);

      if (!data.success) {
        throw new Error(data.error || 'Failed to update ENQUIRY sheet');
      }

      return data;
    } catch (error) {
      console.error('Error updating ENQUIRY sheet:', {
        error: error.message,
        stack: error.stack,
        enquiryNo: enquiryNo,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to update ENQUIRY sheet: ${error.message}`);
    }
  };

  // utils/dateFormatter.js
  const formatDateTime = (isoString) => {
    const d = new Date(isoString);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  const formatDOB = (dateString) => {
    if (!dateString) return '';

    // Handle different date formats that might come from the input
    let date;

    // If it's already a Date object
    if (dateString instanceof Date) {
      date = dateString;
    }
    // If it's in the format "1/11/2021" (mm/dd/yyyy or dd/mm/yyyy)
    else if (typeof dateString === 'string' && dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        if (parseInt(parts[0]) > 12) {
          date = new Date(parts[2], parts[1] - 1, parts[0]);
        } else {
          date = new Date(parts[2], parts[0] - 1, parts[1]);
        }
      }
    }
    else {
      date = new Date(dateString);
    }

    if (isNaN(date.getTime())) {
      return dateString;
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    if (!formData.candidateSays || !formData.status) {
      toast.error('Please fill all required fields');
      setSubmitting(false);
      return;
    }

    try {
      // For ALL statuses including Joining, submit to Follow-Up sheet first
      // const now = new Date();
      // const formattedTimestamp = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const formattedTimestamp = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;

      let formattedNextDate = '';
      if (formData.nextDate) {
        const parts = formData.nextDate.split('-');
        if (parts.length === 3) {
          const y = parts[0];
          const m = parseInt(parts[1]);
          const d = parseInt(parts[2]);
          formattedNextDate = `${m}/${d}/${y} 00:00:00`;
        } else {
          const nextDateObj = new Date(formData.nextDate);
          if (!isNaN(nextDateObj.getTime())) {
            formattedNextDate = `${nextDateObj.getMonth() + 1}/${nextDateObj.getDate()}/${nextDateObj.getFullYear()} 00:00:00`;
          } else {
            formattedNextDate = formData.nextDate;
          }
        }
      }

      const rowData = [
        formattedTimestamp,
        selectedItem.candidateEnquiryNo || '',
        formData.status,
        formData.candidateSays,
        formattedNextDate || '',
      ];

      await postToSheet(rowData);

      // If status is "Joining", also update the ENQUIRY sheet
      // if (formData.status === 'Joining') {
      //   await updateEnquirySheet(selectedItem.candidateEnquiryNo);
      // }

      toast.success('Update successful!');
      setShowModal(false);
      fetchEnquiryData();
      fetchFollowUpData();

    } catch (error) {
      console.error('Submission failed:', error);
      toast.error(`Failed to update: ${error.message}`);
      if (error.message.includes('appendRow')) {
        toast('Please verify the "Follow-Up" sheet exists', {
          icon: 'ℹ️',
          duration: 8000
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPendingData = pendingData.filter(item => {
    // Search filter
    const matchesSearch = !searchTerm ||
      item.candidateName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.candidateEnquiryNo?.toLowerCase().includes(searchTerm.toLowerCase());

    // Department filter
    const matchesDept = !filterDepartment || item.department === filterDepartment;

    // Date filter
    let matchesDate = true;
    if (filterDate && item.id) { // id stores Timestamp Column A
      try {
        const itemDate = new Date(item.id);
        const searchDate = new Date(filterDate);
        matchesDate = itemDate.getFullYear() === searchDate.getFullYear() &&
          itemDate.getMonth() === searchDate.getMonth() &&
          itemDate.getDate() === searchDate.getDate();
      } catch (e) {
        matchesDate = true;
      }
    }

    return matchesSearch && matchesDept && matchesDate;
  });

  const filteredHistoryData = historyData.filter(item => {
    // Search filter
    const matchesSearch = !searchTerm ||
      item.enquiryNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.candidateSays?.toLowerCase().includes(searchTerm.toLowerCase());

    // Date filter (History uses item.timestamp or item.timestamp from Column A)
    let matchesDate = true;
    if (filterDate && item.timestamp) {
      try {
        // Handle dd/mm/yyyy hh:mm:ss format seen in History
        const [dPart] = item.timestamp.split(' ');
        const [d, m, y] = dPart.split('/');
        const itemDate = new Date(`${y}-${m}-${d}`);
        const searchDate = new Date(filterDate);
        matchesDate = itemDate.getFullYear() === searchDate.getFullYear() &&
          itemDate.getMonth() === searchDate.getMonth() &&
          itemDate.getDate() === searchDate.getDate();
      } catch (e) {
        matchesDate = true;
      }
    }

    return matchesSearch && matchesDate;
  });

  // Unique departments for filter
  const uniqueDepartments = [...new Set(enquiryData.map(item => item.department).filter(Boolean))].sort();

  // Unified Pagination logic
  const activeData = activeTab === "pending" ? filteredPendingData : filteredHistoryData;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = activeData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(activeData.length / itemsPerPage);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };  // Pagination navigation renderer matching Indent.jsx
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

  return (
    <div className="space-y-3 md:pb-4 mb-4">
      {/* Unified "One Filter" Dashboard Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 md:gap-4 mb-2">
        <div className="flex items-center gap-4">
          <h1 className="hidden md:block text-2xl font-bold text-gray-800">Call Tracker</h1>

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
              <span>Pending ({filteredPendingData.length})</span>
            </button>
            <button
              onClick={() => { setActiveTab("history"); setCurrentPage(1); }}
              className={`flex items-center gap-2 py-1 px-4 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all duration-200 ${activeTab === "history"
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
                placeholder="Search calls..."
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
            <LoadingSpinner message="Retrieving call records..." minHeight="450px" />
          </div>
        ) : (
          <>
            {activeTab === "pending" && (
              <div className="flex-1 flex flex-col">
                {/* Desktop View (Table + Footer combined) */}
                <div className="hidden md:flex flex-col border border-gray-200 rounded-lg bg-white overflow-hidden">
                  <div className="max-h-[calc(105vh-280px)] min-h-[530px] overflow-y-auto scrollbar-hide">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Action</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Indent Number</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Enquiry Number</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Indent Type</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Post</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Department</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Name</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">DOB</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Phone Number</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Email</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Previous Company Name</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Job Experience</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Previous Position</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Reason Of Leaving</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Marital Status</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Last Salary Drawn</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Candidate Photo</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Gender</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Present Address</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Aadhar Number</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Resume Copy</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {tableLoading ? (
                          <tr>
                            <td colSpan="21" className="px-4 py-1">
                              <LoadingSpinner message="Scanning calls..." minHeight="300px" />
                            </td>
                          </tr>
                        ) : error ? (
                          <tr>
                            <td colSpan="21" className="px-4 py-12 text-center">
                              <p className="text-rose-500 text-xs font-bold mb-2">Error: {error}</p>
                              <button onClick={fetchEnquiryData} className="px-3 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded text-xs font-bold shadow-sm">Retry</button>
                            </td>
                          </tr>
                        ) : currentItems.length === 0 ? (
                          <tr>
                            <td colSpan="21" className="px-4 py-24 text-center">
                              <div className="flex flex-col items-center justify-center space-y-2">
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">No pending calls found.</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          currentItems.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <button
                                  onClick={() => handleCallClick(item)}
                                  className="bg-indigo-600 text-white px-3 py-1 rounded-md text-xs hover:bg-indigo-700 transition-all shadow-sm active:scale-95"
                                >
                                  Call
                                </button>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.indentNo}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.candidateEnquiryNo}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-indigo-600">{item.indentType || "—"}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.applyingForPost}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 uppercase">{item.department}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.candidateName}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.candidateDOB}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.candidatePhone}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 lowercase">{item.candidateEmail}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.previousCompany || "-"}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.jobExperience}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.previousPosition}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 max-w-[150px] truncate" title={item.reasonForLeaving}>{item.reasonForLeaving}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.maritalStatus}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 font-medium">{item.lastSalary}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                {item.candidatePhoto ? (
                                  <a href={item.candidatePhoto} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-900 text-sm">View</a>
                                ) : <span className="text-gray-400 text-sm">—</span>}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.gender || "—"}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 max-w-[200px] truncate" title={item.presentAddress}>{item.presentAddress}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.aadharNo}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                {item.candidateResume ? (
                                  <a href={item.candidateResume} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-900 text-sm">View</a>
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
                        <p className="text-gray-500 text-lg">No pending calls found.</p>
                      </div>
                    ) : (
                      currentItems.map((item, index) => (
                        <div key={item.id || index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-2.5 space-y-1.5">
                          {/* Top Bar */}
                          <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-indigo-600 text-sm">#{item.candidateEnquiryNo}</span>
                              <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 font-medium uppercase tracking-wider">{item.department}</span>
                            </div>
                            <button
                              onClick={() => handleCallClick(item)}
                              className="px-3 py-1 bg-indigo-600 text-white rounded text-xs font-bold shadow-sm active:scale-95 transition-transform"
                            >
                              Call
                            </button>
                          </div>

                          {/* Info Rows */}
                          <div>
                            <div className="text-sm font-bold text-gray-800 tracking-tight">{item.candidateName}</div>
                            <div className="text-xs text-gray-600 mt-0.5"><span className="text-gray-400">Post:</span> {item.applyingForPost}</div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                            <div>
                              <span className="block text-gray-400 text-[10px] uppercase">Phone</span>
                              <span className="font-medium text-gray-700">{item.candidatePhone}</span>
                            </div>
                            <div>
                              <span className="block text-gray-400 text-[10px] uppercase">Exp</span>
                              <span className="font-medium text-gray-700">{item.jobExperience || "Fresher"}</span>
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
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Enq No.</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Candidate Response</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Next Action</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {currentItems.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="px-4 py-24 text-center">
                              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">No history recorded.</p>
                            </td>
                          </tr>
                        ) : (
                          currentItems.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.enquiryNo}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span
                                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.status === "Joining"
                                    ? "bg-green-100 text-green-800"
                                    : item.status === "Reject"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-indigo-100 text-indigo-800"
                                    }`}
                                >
                                  {item.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500 max-w-sm truncate" title={item.candidateSays}>{item.candidateSays}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.nextDate || "-"}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{item.timestamp || "-"}</td>
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
                    {currentItems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-24">
                        <p className="text-gray-500 text-lg">No history found.</p>
                      </div>
                    ) : (
                      currentItems.map((item, index) => (
                        <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-2.5 space-y-2">
                          <div className="flex justify-between items-center bg-gray-50 -mx-2.5 -mt-2.5 p-2 px-3 rounded-t-lg border-b border-gray-100 mb-1">
                            <span className="font-bold text-indigo-600 text-xs tracking-tight">#{item.enquiryNo}</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${item.status === "Joining"
                                ? "bg-green-100 text-green-700"
                                : item.status === "Reject"
                                  ? "bg-red-100 text-red-700"
                                  : item.status === "On Hold" || item.status === "Hold"
                                    ? "bg-amber-100 text-amber-700"
                                    : item.status === "Interview"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-indigo-100 text-indigo-700"
                                }`}
                            >
                              {item.status}
                            </span>
                          </div>

                          <div className="flex justify-between items-start pt-1">
                            <div className="text-sm font-bold text-gray-900 leading-tight">Response:</div>
                            <div className="text-[11px] text-gray-600 font-medium text-right max-w-[60%]">{item.candidateSays || '-'}</div>
                          </div>

                          <div className="flex justify-between items-start">
                            <div className="text-xs text-gray-500">Next Action:</div>
                            <div className="text-xs text-indigo-600 font-medium">{item.nextDate || '-'}</div>
                          </div>

                          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 border-t border-gray-50 pt-2">
                            <Clock size={10} />
                            <span>{item.timestamp}</span>
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

      {/* Call Modal - Ultra-Compact Redesign */}
      {showModal && selectedItem && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4 backdrop-blur-sm bg-black/20">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Process Call</h3>
                <p className="text-xs text-gray-500 mt-0.5">Enquiry: {selectedItem.candidateEnquiryNo}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50/50 p-2 rounded-md border border-gray-100">
                  <label className="block text-[10px] font-bold text-gray-700 mb-0.5">Candidate</label>
                  <div className="text-xs font-bold text-indigo-600 truncate">{selectedItem.candidateName}</div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 mb-0.5">Status*</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded px-2.5 py-1 text-xs focus:ring-1 focus:ring-indigo-500 bg-white"
                    required
                  >
                    <option value="">Select Status</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Interview">Interview</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Joining">Joining</option>
                    <option value="Reject">Reject</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-700 mb-0.5">
                  {formData.status === "On Hold" ? "Reason For Hold*" :
                      formData.status === "Joining" ? "Joining Commitment*" :
                        formData.status === "Reject" ? "Rejection Reason*" :
                          "Candidate Response*"}
                </label>
                <textarea
                  name="candidateSays"
                  value={formData.candidateSays}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full border border-gray-300 rounded px-2.5 py-1 text-xs focus:ring-1 focus:ring-indigo-500 bg-white"
                  placeholder="Enter details here..."
                  required
                />
              </div>

              {formData.status && !["Joining", "Reject"].includes(formData.status) && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                  <label className="block text-[10px] font-bold text-gray-700 mb-0.5">
                    {formData.status === "Interview" ? "Schedule Date*" : "Recall Date*"}
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                    <input
                      type="date"
                      name="nextDate"
                      value={formData.nextDate}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded pl-9 pr-2.5 py-1 text-xs focus:ring-1 focus:ring-indigo-500 bg-white"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-1.5 border border-gray-300 rounded text-xs text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm"
                  disabled={submitting}
                >
                  {submitting ? (
                    <div className="flex items-center gap-2">
                      <svg className="animate-spin h-3 w-3 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Updating...</span>
                    </div>
                  ) : "Update Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallTracker;
