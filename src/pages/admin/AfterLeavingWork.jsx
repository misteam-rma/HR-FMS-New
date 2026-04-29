import React, { useState, useEffect } from 'react';
import { Search, Clock, CheckCircle, X, User, Briefcase, Calendar, AlertCircle, ArrowRight, Layout, History, ChevronDown, Check, MoreHorizontal, LogOut, Share2, Download, Phone, ClipboardCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';

const AfterLeavingWork = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [pendingData, setPendingData] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    resignationLetterReceived: false,
    resignationAcceptance: false,
    handoverAssetsIdVisitingCard: false,
    cancellationEmailBiometric: false,
    finalReleaseDate: '',
    removeBenefitEnrollment: false,
    noDues: false,
  });

  // New filtering and pagination states
  const [filterDepartment, setFilterDepartment] = useState('');
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const fetchLeavingData = async () => {
    setLoading(true);
    setTableLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=LEAVING&action=fetch`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data from LEAVING sheet');
      }

      const rawData = result.data || result;

      if (!Array.isArray(rawData)) {
        throw new Error('Expected array data not received');
      }

      // Process data starting from row 7 (index 6) - skip headers
      const dataRows = rawData.length > 6 ? rawData.slice(6) : [];

      const processedData = dataRows.map(row => ({
        timestamp: row[0] || '',
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
        plannedDate: row[12] || '',
        actual: row[13] || '',
        resignationLetterReceived: row[15] || '',
        resignationAcceptance: row[16] || '',
        handoverAssetsIdVisitingCard: row[17] || '',
        cancellationEmailBiometric: row[18] || '',
        finalReleaseDate: row[19] || '',
        removeBenefitEnrollment: row[20] || '',
        noDues: row[21] || ''
      }));

      const pendingTasks = processedData.filter(
        task => task.plannedDate && !task.actual
      );
      setPendingData(pendingTasks);

      const historyTasks = processedData.filter(
        task => task.plannedDate && task.actual
      );
      setHistoryData(historyTasks);

    } catch (error) {
      console.error('Error fetching leaving data:', error);
      setError(error.message);
      toast.error(`Failed to load leaving data: ${error.message}`);
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchLeavingData();
  }, []);

  const handleAfterLeavingClick = async (item) => {
    setFormData({
      resignationLetterReceived: false,
      resignationAcceptance: false,
      handoverAssetsIdVisitingCard: false,
      cancellationEmailBiometric: false,
      finalReleaseDate: '',
      removeBenefitEnrollment: false,
      noDues: false
    });

    setSelectedItem(item);
    setShowModal(true);
    setLoading(true);

    try {
      const fullDataResponse = await fetch(
        `${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=LEAVING&action=fetch`
      );

      if (!fullDataResponse.ok) {
        throw new Error(`HTTP error! status: ${fullDataResponse.status}`);
      }

      const fullDataResult = await fullDataResponse.json();
      const allData = fullDataResult.data || fullDataResult;

      let headerRowIndex = allData.findIndex(row =>
        row.some(cell => cell?.toString().trim().toLowerCase().includes('employee id'))
      );
      if (headerRowIndex === -1) headerRowIndex = 4;

      const headers = allData[headerRowIndex].map(h => h?.toString().trim());

      // Find Employee ID column index
      const employeeIdIndex = headers.findIndex(h => h?.toLowerCase() === "employee id");
      if (employeeIdIndex === -1) {
        throw new Error("Could not find 'Employee ID' column");
      }

      // Find the employee row index
      const rowIndex = allData.findIndex((row, idx) =>
        idx > headerRowIndex &&
        row[employeeIdIndex]?.toString().trim() === item.employeeId?.toString().trim()
      );

      if (rowIndex === -1) {
        throw new Error(`Employee ${item.employeeId} not found in LEAVING sheet`);
      }

      // Get current values from the sheet
      // Final Release Date is now at column T (index 19)
      const finalReleaseDateValue = allData[rowIndex][19] || "";

      // Format the date for the input field (YYYY-MM-DD format)
      let formattedDate = "";
      if (finalReleaseDateValue) {
        // Try to parse the date if it's in a different format
        const dateParts = finalReleaseDateValue.toString().split('/');
        if (dateParts.length === 3) {
          // Assuming DD/MM/YYYY format
          const day = dateParts[0].padStart(2, '0');
          const month = dateParts[1].padStart(2, '0');
          const year = dateParts[2];
          formattedDate = `${year}-${month}-${day}`;
        } else {
          // Try to parse as a Date object if it's in a different format
          const dateObj = new Date(finalReleaseDateValue);
          if (!isNaN(dateObj.getTime())) {
            formattedDate = dateObj.toISOString().split('T')[0];
          }
        }
      }

      const currentValues = {
        resignationLetterReceived:
          allData[rowIndex][15]?.toString().trim().toLowerCase() === "yes",
        resignationAcceptance:
          allData[rowIndex][16]?.toString().trim().toLowerCase() === "yes",
        handoverAssetsIdVisitingCard:
          allData[rowIndex][17]?.toString().trim().toLowerCase() === "yes",
        cancellationEmailBiometric:
          allData[rowIndex][18]?.toString().trim().toLowerCase() === "yes",
        finalReleaseDate: formattedDate,
        removeBenefitEnrollment:
          allData[rowIndex][20]?.toString().trim().toLowerCase() === "yes",
        noDues:
          allData[rowIndex][21]?.toString().trim().toLowerCase() === "yes"
      };

      setFormData(currentValues);
    } catch (error) {
      console.error('Error fetching current values:', error);
      // Keep the default reset values if there's an error
      toast.error("Failed to load current values");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (name) => {
    setFormData(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSubmitting(true);

    if (!selectedItem.employeeId || !selectedItem.name) {
      toast.error('Please fill all required fields');
      setSubmitting(false);
      return;
    }

    try {
      // 1. First fetch the current data
      const fullDataResponse = await fetch(
        `${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=LEAVING&action=fetch`
      );
      if (!fullDataResponse.ok) {
        throw new Error(`HTTP error! status: ${fullDataResponse.status}`);
      }

      const fullDataResult = await fullDataResponse.json();
      const allData = fullDataResult.data || fullDataResult;

      // Find header row in LEAVING sheet
      let headerRowIndex = allData.findIndex(row =>
        row.some(cell => cell?.toString().trim().toLowerCase().includes('employee id'))
      );
      if (headerRowIndex === -1) headerRowIndex = 4;

      const headers = allData[headerRowIndex].map(h => h?.toString().trim());

      // Find Employee ID column index
      const employeeIdIndex = headers.findIndex(h => h?.toLowerCase() === "employee id");
      if (employeeIdIndex === -1) {
        throw new Error("Could not find 'Employee ID' column");
      }

      // Find the employee row index
      const rowIndex = allData.findIndex((row, idx) =>
        idx > headerRowIndex &&
        row[employeeIdIndex]?.toString().trim() === selectedItem.employeeId?.toString().trim()
      );
      if (rowIndex === -1) throw new Error(`Employee ${selectedItem.employeeId} not found in LEAVING sheet`);

      // Create current date for actual date (Column N)
      const now = new Date();
      const enforcedYear = now.getFullYear() === 2028 ? 2026 : now.getFullYear();
      const currentDateFormatted = enforcedYear + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0');

      // Check if all conditions are met
      const allConditionsMet =
        formData.resignationLetterReceived &&
        formData.resignationAcceptance &&
        formData.handoverAssetsIdVisitingCard &&
        formData.cancellationEmailBiometric &&
        formData.removeBenefitEnrollment &&
        formData.noDues &&
        formData.finalReleaseDate;

      const updatePromises = [];

      // Only update actual date (Column N) if all conditions are met
      if (allConditionsMet) {
        updatePromises.push(
          fetch(
            import.meta.env.VITE_APPS_SCRIPT_URL,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                sheetName: "LEAVING",
                action: "updateCell",
                rowIndex: (rowIndex + 1).toString(),
                columnIndex: "14", // Column N (Actual date)
                value: currentDateFormatted, // Send as YYYY-MM-DD format
              }).toString(),
            }
          )
        );
      }

      // Update Final Release Date (Column T) - always update if provided
      if (formData.finalReleaseDate) {
        updatePromises.push(
          fetch(
            import.meta.env.VITE_APPS_SCRIPT_URL,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                sheetName: "LEAVING",
                action: "updateCell",
                rowIndex: (rowIndex + 1).toString(),
                columnIndex: "20", // Column T (Final Release Date)
                value: formData.finalReleaseDate, // Send as YYYY-MM-DD format
              }).toString(),
            }
          )
        );
      }

      // Update checklist columns (these remain as Yes/No strings)
      const fields = [
        { value: formData.resignationLetterReceived ? "Yes" : "No", offset: 15 },
        { value: formData.resignationAcceptance ? "Yes" : "No", offset: 16 },
        { value: formData.handoverAssetsIdVisitingCard ? "Yes" : "No", offset: 17 },
        { value: formData.cancellationEmailBiometric ? "Yes" : "No", offset: 18 },
        { value: formData.removeBenefitEnrollment ? "Yes" : "No", offset: 20 },
        { value: formData.noDues ? "Yes" : "No", offset: 21 }
      ];

      // Add all other field updates
      fields.forEach((field) => {
        updatePromises.push(
          fetch(
            import.meta.env.VITE_APPS_SCRIPT_URL,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                sheetName: "LEAVING",
                action: "updateCell",
                rowIndex: (rowIndex + 1).toString(),
                columnIndex: (field.offset + 1).toString(),
                value: field.value,
              }).toString(),
            }
          )
        );
      });

      const responses = await Promise.all(updatePromises);
      const results = await Promise.all(responses.map((r) => r.json()));

      const hasError = results.some((result) => !result.success);
      if (hasError) {
        console.error("Some cell updates failed:", results);
        throw new Error("Some cell updates failed");
      }

      if (allConditionsMet) {
        toast.success("All conditions met! Actual date updated successfully.");
      } else {
        toast.success(
          "Conditions updated successfully. Actual date will be updated when all conditions are met."
        );
      }

      setShowModal(false);
      fetchLeavingData();
    } catch (error) {
      console.error('Update error:', error);
      toast.error(`Update failed: ${error.message}`);
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  const formatDOB = (dateString) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString; // Return as-is if not a valid date
    }

    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  };

  // Unique departments for filtering
  const uniqueDepartments = [...new Set([...pendingData, ...historyData].map(item => item.department).filter(Boolean))].sort();

  // Unified Filtering Logic
  const filteredPendingData = pendingData.filter(item => {
    const matchesSearch = !searchTerm ||
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDept = !filterDepartment || item.department === filterDepartment;
    
    let matchesDate = true;
    if (filterDate && item.dateOfLeaving) {
      try {
        const itemDate = new Date(item.dateOfLeaving);
        const searchDate = new Date(filterDate);
        matchesDate = itemDate.getFullYear() === searchDate.getFullYear() &&
          itemDate.getMonth() === searchDate.getMonth() &&
          itemDate.getDate() === searchDate.getDate();
      } catch (e) { matchesDate = true; }
    }
    return matchesSearch && matchesDept && matchesDate;
  });

  const filteredHistoryData = historyData.filter(item => {
    const matchesSearch = !searchTerm ||
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDept = !filterDepartment || item.department === filterDepartment;
    
    let matchesDate = true;
    if (filterDate && item.dateOfLeaving) {
      try {
        const itemDate = new Date(item.dateOfLeaving);
        const searchDate = new Date(filterDate);
        matchesDate = itemDate.getFullYear() === searchDate.getFullYear() &&
          itemDate.getMonth() === searchDate.getMonth() &&
          itemDate.getDate() === searchDate.getDate();
      } catch (e) { matchesDate = true; }
    }
    return matchesSearch && matchesDept && matchesDate;
  });

  // Unified Pagination logic
  const activeItems = activeTab === "pending" ? filteredPendingData : filteredHistoryData;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = activeItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(activeItems.length / itemsPerPage);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    <div className="space-y-3 md:pb-4 mb-4 font-outfit">
      {/* Unified "One Filter" Dashboard Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 md:gap-4 mb-2">
        <div className="flex items-center gap-4">
          <h1 className="hidden md:block text-2xl font-bold text-gray-800 tracking-tight">After Separation</h1>

          {/* Segmented Tab Control (Integrated into Filter Row) */}
          <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 shadow-sm self-start sm:self-center">
            <button
              onClick={() => { setActiveTab("pending"); setCurrentPage(1); }}
              className={`flex items-center gap-2 py-1.5 px-4 text-[11px] font-black uppercase tracking-wider rounded-md transition-all duration-200 ${activeTab === "pending"
                  ? "bg-white text-indigo-600 shadow-sm border border-gray-200"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
            >
              <Clock size={13} strokeWidth={3} />
              <span>Pending Task ({filteredPendingData.length})</span>
            </button>
            <button
              onClick={() => { setActiveTab("history"); setCurrentPage(1); }}
              className={`flex items-center gap-2 py-1.5 px-4 text-[11px] font-black uppercase tracking-wider rounded-md transition-all duration-200 ${activeTab === "history"
                  ? "bg-white text-indigo-600 shadow-sm border border-gray-200"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
            >
              <History size={13} strokeWidth={3} />
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
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full text-xs sm:text-sm shadow-sm transition-all font-medium uppercase"
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
                <Layout size={12} className="text-gray-400 shrink-0" />
                <span className="truncate font-bold uppercase">{filterDepartment || "All Dept"}</span>
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
                  onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-transparent focus:outline-none text-[11px] font-bold cursor-pointer uppercase"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Unified Main Content Container */}
      <div className="overflow-hidden border border-gray-200 rounded-lg bg-white min-h-[530px] flex flex-col shadow-sm">
        {tableLoading ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <LoadingSpinner message="Retrieving separation task list..." minHeight="450px" />
          </div>
        ) : (
          <>
            <div className="flex-1 flex flex-col">
              {/* Desktop View */}
              <div className="hidden md:flex flex-col border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm flex-1">
                <div className="max-h-[calc(105vh-280px)] min-h-[530px] overflow-auto scrollbar-hide">
                  <table className="w-max min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-20">
                      {activeTab === "pending" ? (
                        <tr>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap sticky left-0 z-30 bg-gray-50 shadow-sm border-r border-gray-200">Action</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap sticky left-[110px] z-30 bg-gray-50 shadow-sm border-r border-gray-200">EMP ID</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Name</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Date Of Leaving</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Mobile Number</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Reason Of Leaving</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Firm Name</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Father Name</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Date Of Joining</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Work Location</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Designation</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Department</th>
                        </tr>
                      ) : (
                        <tr>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap sticky left-0 z-30 bg-gray-50 shadow-sm border-r border-gray-200">Action</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap sticky left-[110px] z-30 bg-gray-50 shadow-sm border-r border-gray-200">EMP ID</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Name</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Resignation Letter</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Resignation Acceptance</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Assets & ID Handover</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Cancellation Bio/Email</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Release Date</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Benefit Removal</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">No Dues</th>
                        </tr>
                      )}
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {currentItems.length === 0 ? (
                        <tr>
                          <td colSpan="12" className="px-4 py-32 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                             No separation records found.
                          </td>
                        </tr>
                      ) : (
                        currentItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                            <td className="px-6 py-4 whitespace-nowrap text-center sticky left-0 z-10 bg-white/95 backdrop-blur group-hover:bg-gray-50/95 border-r border-gray-100 shadow-sm transition-colors">
                              <button
                                onClick={() => handleAfterLeavingClick(item)}
                                className="bg-indigo-600 text-white px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-sm active:scale-95"
                              >
                                {activeTab === "pending" ? "Process" : "Review"}
                              </button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-[11px] text-gray-500 font-black sticky left-[110px] z-10 bg-white/95 backdrop-blur group-hover:bg-gray-50/95 border-r border-gray-100 shadow-sm transition-colors">{item.employeeId}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900 font-bold tracking-tight">{item.name}</td>
                            {activeTab === "pending" ? (
                              <>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-xs text-gray-600 font-bold">{item.dateOfLeaving || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-xs text-gray-600 font-bold">{item.mobileNo || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-[10px] text-rose-500 font-black uppercase tracking-tighter truncate max-w-[200px]" title={item.reasonOfLeaving}>{item.reasonOfLeaving || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-xs text-gray-600 font-bold">{item.firmName || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-xs text-gray-600 font-bold">{item.fatherName || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-xs text-gray-500 font-medium">{item.dateOfJoining || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-xs text-gray-600 font-bold">{item.workingLocation || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-[10px] font-black uppercase tracking-wide text-indigo-700">{item.designation || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-xs text-gray-700 font-bold">{item.department || '-'}</td>
                              </>
                            ) : (
                              <>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-xs text-gray-600 font-bold">{item.resignationLetterReceived || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-xs text-gray-600 font-bold">{item.resignationAcceptance || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-xs text-gray-600 font-bold">{item.handoverAssetsIdVisitingCard || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-xs text-gray-600 font-bold">{item.cancellationEmailBiometric || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-xs text-gray-600 font-bold">{item.finalReleaseDate || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-xs text-gray-600 font-bold">{item.removeBenefitEnrollment || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-xs text-gray-600 font-bold">{item.noDues || '-'}</td>
                              </>
                            )}
                            {activeTab === "history" && (
                              <td className="px-6 py-4 whitespace-nowrap text-center text-xs text-green-600 font-bold">
                                {item.actual ? new Date(item.actual).toLocaleDateString('en-GB') : '-'}
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile View */}
              <div className="md:hidden flex flex-col h-[calc(100vh-240px)]">
                <div className="flex-1 p-2 space-y-3 overflow-y-auto scrollbar-hide bg-gray-50">
                  {currentItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-gray-500 text-xs font-bold uppercase tracking-widest">No separation records found.</div>
                  ) : (
                    currentItems.map((item, index) => (
                      <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-2.5 space-y-2">
                        <div className="flex justify-between items-center bg-gray-50 -mx-2.5 -mt-2.5 p-2 px-3 rounded-t-lg border-b border-gray-100 mb-1">
                          <span className="font-bold text-indigo-600 text-xs tracking-tight">#{item.employeeId}</span>
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded">{item.department}</span>
                        </div>
                        
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-gray-900 text-sm tracking-tight leading-tight">{item.name}</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mt-0.5">{item.designation}</p>
                          </div>
                          <button
                            onClick={() => handleAfterLeavingClick(item)}
                            className="bg-indigo-600 text-white px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest shadow-sm active:scale-90 transition-transform"
                          >
                             Process
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-50">
                          <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Left On</p>
                            <p className="text-xs font-bold text-gray-700">{item.dateOfLeaving ? new Date(item.dateOfLeaving).toLocaleDateString('en-GB') : '-'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Status</p>
                            <p className="text-xs font-bold text-indigo-600 truncate uppercase">{activeTab}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="border-t border-gray-300 bg-white px-2 py-2 flex justify-center sticky bottom-0 z-30">
                  {renderPaginationNav()}
                </div>
              </div>
            </div>

            {/* Pagination Footer */}
            <div className="hidden md:flex px-4 py-3 bg-white border-t border-gray-200 items-center justify-between gap-4">
              <div className="flex items-center gap-6 flex-wrap">
                <p className="text-[13px] text-gray-600 font-medium tracking-wide">
                  Showing <span className="font-bold text-gray-900">{activeItems.length > 0 ? indexOfFirstItem + 1 : 0}</span> to <span className="font-bold text-gray-900">{Math.min(indexOfLastItem, activeItems.length)}</span> of <span className="font-bold text-gray-900">{activeItems.length}</span> records
                </p>
                <div className="flex items-center gap-2 h-5">
                  <label className="text-[13px] text-gray-500 font-medium whitespace-nowrap">Rows per page:</label>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="text-xs bg-transparent font-bold text-gray-700 outline-none cursor-pointer border-none focus:ring-0"
                  >
                    {[15, 30, 50, 100].map(val => <option key={val} value={val}>{val}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center w-auto justify-end">
                {renderPaginationNav()}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal - Standardized Premium Design */}
      {showModal && selectedItem && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex flex-col">
                <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight leading-none">Exit Checklist</h3>
                <span className="text-[10px] font-bold text-indigo-500 mt-1 uppercase tracking-widest">ID: #{selectedItem.employeeId} | {selectedItem.name}</span>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-all text-gray-400">
                <X size={20} strokeWidth={3} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 space-y-5">
              <div className="space-y-4">
                <div className="space-y-1.5 px-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Final Release Date*</label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                    <input
                      type="date"
                      name="finalReleaseDate"
                      value={formData.finalReleaseDate}
                      onChange={handleInputChange}
                      className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 bg-gray-50 focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="bg-amber-50/30 rounded-xl border border-amber-100/50 p-4 space-y-3">
                  <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1 flex items-center gap-2">
                    <ClipboardCheck size={12} strokeWidth={3} />
                    Mandatory Approvals
                  </h4>

                  <div className="grid grid-cols-1 gap-2.5">
                    {[
                      { key: 'resignationLetterReceived', label: 'Resignation Letter' },
                      { key: 'resignationAcceptance', label: 'Acceptance Letter' },
                      { key: 'handoverAssetsIdVisitingCard', label: 'Asset Handover' },
                      { key: 'cancellationEmailBiometric', label: 'ID Cancellation' },
                      { key: 'removeBenefitEnrollment', label: 'Benefit Removal' },
                      { key: 'noDues', label: 'No Dues Cert' }
                    ].map((item) => (
                      <div 
                        key={item.key} 
                        onClick={() => handleCheckboxChange(item.key)}
                        className={`flex items-center justify-between p-2.5 px-3 rounded-lg border transition-all cursor-pointer ${formData[item.key] ? 'bg-indigo-600 border-indigo-700 text-white shadow-md' : 'bg-white border-gray-200 text-gray-500 hover:border-indigo-300'}`}
                      >
                        <span className="text-[11px] font-black uppercase tracking-tight">{item.label}</span>
                        <div className={`w-4 h-4 rounded flex items-center justify-center ${formData[item.key] ? 'text-white' : 'border border-gray-200'}`}>
                          {formData[item.key] && <Check size={12} strokeWidth={4} />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-[11px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex-[2] bg-indigo-600 text-white px-6 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 active:scale-95 ${submitting ? 'opacity-70' : ''}`}
                >
                  {submitting ? "Processing..." : "Complete Exit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AfterLeavingWork;