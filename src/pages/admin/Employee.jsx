import React, { useEffect, useState } from "react";
import { Filter, Search, Clock, CheckCircle, ImageIcon, User, Briefcase, MapPin, Phone, Layout, History, ChevronDown, Check, Calendar, ArrowRight, ClipboardCheck, X } from "lucide-react";
import { toast } from "react-hot-toast";
import LoadingSpinner from "../../components/LoadingSpinner";

const Employee = () => {
  const [activeTab, setActiveTab] = useState("joining");
  const [searchTerm, setSearchTerm] = useState("");
  const [joiningData, setJoiningData] = useState([]);
  const [leavingData, setLeavingData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState(null);

  // New filtering and pagination states
  const [filterDepartment, setFilterDepartment] = useState('');
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const formatDOB = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? dateString : date.toLocaleDateString('en-GB');
  };

  const fetchJoiningData = async () => {
    setTableLoading(true);
    try {
      // 1. Fetch LEAVING data first to use for lookup
      const leavingResponse = await fetch(`${"https://script.google.com/macros/s/AKfycbwGN0L4CqcZdhgie3l94KGGjWHqaL_cHRgwtw1CCUZy6yqpF5lFlFNBbO10dEm7BNK6FQ/exec"}?sheet=LEAVING&action=fetch`);
      const leavingResult = await leavingResponse.json();
      const leavingRaw = leavingResult.success ? (leavingResult.data || leavingResult) : [];
      const leavingMap = {};
      
      if (leavingRaw.length > 6) {
        leavingRaw.slice(6).forEach(row => {
          const id = row[1]?.toString().trim();
          if (id) {
            leavingMap[id] = {
              fatherName: row[7] || "",      // Column H
              workingLocation: row[9] || "", // Column J
            };
          }
        });
      }

      // 2. Fetch JOINING data
      const response = await fetch(`${"https://script.google.com/macros/s/AKfycbwGN0L4CqcZdhgie3l94KGGjWHqaL_cHRgwtw1CCUZy6yqpF5lFlFNBbO10dEm7BNK6FQ/exec"}?sheet=JOINING&action=fetch`);
      const result = await response.json();
      if (result.success) {
        const rawData = result.data || result;
        const dataRows = rawData.length > 6 ? rawData.slice(6) : [];
        const processed = dataRows.map((row) => {
          const empId = row[1] || "";
          const leavingInfo = leavingMap[empId] || {};
          
          return {
            employeeId: empId,
            candidateName: row[2] || "",
            name: row[6] || "", // Compatibility
            fatherName: leavingInfo.fatherName || "", // From LEAVING H
            dateOfJoining: row[19] || "",
            designation: row[5] || "",
            aadharPhoto: row[16] || "",
            candidatePhoto: row[25] || "",
            address: row[8] || "",
            dateOfBirth: row[9] || "",
            gender: row[7] || "", // From JOINING H
            mobileNo: row[9] || "",
            familyNo: row[12] || "",
            relationshipWithFamily: row[13] || "",
            accountNo: row[14] || "",
            ifsc: row[15] || "",
            branch: row[16] || "",
            passbook: row[17] || "",
            emailId: row[10] || "",
            department: row[4] || "",
            unit: row[39] || "",
            plannedDate: row[31] || "",
            actual: row[32] || "",
            dateOfLeaving: row[31] || "",    // Column D
            workingLocation: leavingInfo.workingLocation || "", // From LEAVING J
            enquiryNo: row[2] || "",       // Column W
            indentType: row[3] || "",      // Column X
            reasonOfLeaving: row[32] || "",
          };
        });
        const active = processed.filter(emp => !emp.plannedDate || emp.plannedDate.toString().trim() === '');
        const left = processed.filter(emp => emp.plannedDate && emp.plannedDate.toString().trim() !== '');
        
        setJoiningData(active);
        setLeavingData(left);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load active directory");
    } finally {
      setTableLoading(false);
    }
  };

  const fetchLeavingData = async () => {
    try {
      const response = await fetch(`${"https://script.google.com/macros/s/AKfycbwGN0L4CqcZdhgie3l94KGGjWHqaL_cHRgwtw1CCUZy6yqpF5lFlFNBbO10dEm7BNK6FQ/exec"}?sheet=LEAVING&action=fetch`);
      const result = await response.json();
      if (result.success) {
        const rawData = result.data || result;
        const dataRows = rawData.length > 6 ? rawData.slice(6) : [];
        const processed = dataRows.map((row) => ({
          employeeId: row[1] || "",
          name: row[2] || "",
          dateOfJoining: row[8] || "",
          dateOfLeaving: row[3] || "",
          mobileNo: row[4] || "",
          fatherName: row[7] || "", // Column H
          designation: row[10] || "",
          salary: row[11] || "",
          reasonOfLeaving: row[5] || "",
          plannedDate: row[12] || "",
          department: row[11] || "",
          enquiryNo: row[22] || "",       // Column W
          indentType: row[23] || "",      // Column X
          workingLocation: row[9] || "",  // Column J
        }));
        const leaving = processed.filter(emp => emp.plannedDate);
        setLeavingData(leaving);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchJoiningData();
  }, []);

  // Unique departments for filtering
  const uniqueDepartments = [...new Set([...joiningData, ...leavingData].map(item => item.department).filter(Boolean))].sort();

  // Unified Filtering Logic
  const filteredJoiningData = joiningData.filter(item => {
    const matchesSearch = !searchTerm ||
      item.candidateName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDept = !filterDepartment || item.department === filterDepartment;
    
    let matchesDate = true;
    if (filterDate && item.dateOfJoining) {
      try {
        const itemDate = new Date(item.dateOfJoining);
        const searchDate = new Date(filterDate);
        matchesDate = itemDate.getFullYear() === searchDate.getFullYear() &&
          itemDate.getMonth() === searchDate.getMonth() &&
          itemDate.getDate() === searchDate.getDate();
      } catch (e) { matchesDate = true; }
    }
    return matchesSearch && matchesDept && matchesDate;
  });

  const filteredLeavingData = leavingData.filter(item => {
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
  const activeItems = activeTab === "joining" ? filteredJoiningData : filteredLeavingData;
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
          <h1 className="hidden md:block text-2xl font-bold text-gray-800 tracking-tight">Workforce Directory</h1>

          {/* Segmented Tab Control */}
          <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 shadow-sm self-start sm:self-center">
            <button
              onClick={() => { setActiveTab("joining"); setCurrentPage(1); }}
              className={`flex items-center gap-2 py-1.5 px-4 text-[11px] font-black uppercase tracking-wider rounded-md transition-all duration-200 ${activeTab === "joining"
                  ? "bg-white text-indigo-600 shadow-sm border border-gray-200"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
            >
              <CheckCircle size={13} strokeWidth={3} />
              <span>Active ({filteredJoiningData.length})</span>
            </button>
            <button
              onClick={() => { setActiveTab("leaving"); setCurrentPage(1); }}
              className={`flex items-center gap-2 py-1.5 px-4 text-[11px] font-black uppercase tracking-wider rounded-md transition-all duration-200 ${activeTab === "leaving"
                  ? "bg-white text-rose-600 shadow-sm border border-gray-200"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
            >
              <Clock size={13} strokeWidth={3} />
              <span>Left ({filteredLeavingData.length})</span>
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
                placeholder="Search records..."
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
            <LoadingSpinner message="Retrieving workforce directory..." minHeight="450px" />
          </div>
        ) : (
          <>
            <div className="flex-1 flex flex-col">
              {/* Desktop Table View */}
              <div className="hidden md:flex flex-col border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm flex-1">
                <div className="max-h-[calc(105vh-280px)] min-h-[530px] overflow-auto scrollbar-hide">
                  <table className="w-max min-w-full divide-y divide-gray-200 text-left">
                    <thead className="bg-gray-50 sticky top-0 z-20">
                      {activeTab === "joining" ? (
                        <tr>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap sticky left-0 z-30 bg-gray-50 shadow-sm border-r border-gray-200">ID</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Name</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Person Name</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Gender</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Enquiry No</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Indent Type</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Designation</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Department</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Joined Date</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Mobile No</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Email ID</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Aadhar</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Photo</th>
                        </tr>
                      ) : (
                        <tr>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap sticky left-0 z-30 bg-gray-50 shadow-sm border-r border-gray-200">ID</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Name</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Gender</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Enquiry No</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Indent Type</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Father Name</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Designation</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Department</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Work Location</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Reason</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Joined Date</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Left Date</th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Mobile Number</th>
                        </tr>
                      )}
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {currentItems.length === 0 ? (
                        <tr>
                          <td colSpan="13" className="px-4 py-32 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                             No workforce records found.
                          </td>
                        </tr>
                      ) : activeTab === "joining" ? (
                        currentItems.map((emp, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                            <td className="px-6 py-4 whitespace-nowrap sticky left-0 z-10 bg-white/95 backdrop-blur group-hover:bg-gray-50/95 border-r border-gray-100 shadow-sm transition-colors text-center">
                               <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">#{emp.employeeId}</p>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-xs font-bold text-gray-900 uppercase">
                               {emp.candidateName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-xs font-bold text-indigo-600 uppercase">
                               {emp.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-xs font-bold text-gray-500 uppercase">
                               {emp.gender || "—"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-xs font-bold text-blue-600 uppercase">
                               {emp.enquiryNo || "—"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-[10px] font-black text-gray-500 uppercase">
                               {emp.indentType || "—"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-xs font-bold text-gray-700 uppercase">
                               {emp.designation}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-[10px] font-black text-gray-500 uppercase tracking-tighter">
                               {emp.department}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-xs font-bold text-gray-600">
                              {formatDOB(emp.dateOfJoining)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-xs font-bold text-gray-700">
                              {emp.mobileNo}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-xs text-gray-400 font-medium">
                              {emp.emailId || "—"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                {emp.aadharPhoto ? (
                                  <a href={emp.aadharPhoto} target="_blank" rel="noopener noreferrer" className="p-1 px-3 bg-gray-50 text-gray-700 border border-gray-200 rounded text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm">VIEW</a>
                                ) : "—"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                {emp.candidatePhoto ? (
                                  <a href={emp.candidatePhoto} target="_blank" rel="noopener noreferrer" className="p-1 px-3 bg-gray-50 text-gray-700 border border-gray-200 rounded text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm">VIEW</a>
                                ) : "—"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        currentItems.map((emp, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                           <td className="px-6 py-4 whitespace-nowrap sticky left-0 z-10 bg-white/95 backdrop-blur group-hover:bg-gray-50/95 border-r border-gray-100 shadow-sm transition-colors text-center text-[10px] font-black text-rose-500 uppercase tracking-widest">
                               #{emp.employeeId}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-xs font-bold text-gray-900 uppercase">
                               {emp.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-xs font-bold text-gray-500 uppercase">
                               {emp.gender || "—"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-xs font-bold text-blue-600 uppercase">
                               {emp.enquiryNo || "—"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-[10px] font-black text-gray-500 uppercase">
                               {emp.indentType || "—"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-xs font-medium text-gray-600 uppercase">
                               {emp.fatherName || "—"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-xs font-bold text-gray-700 uppercase">
                               {emp.designation}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-[10px] font-black text-gray-500 uppercase tracking-tighter">
                               {emp.department}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-[10px] font-bold text-indigo-600 uppercase">
                                {emp.workingLocation || "—"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                <p className="text-[10px] text-rose-400 font-bold italic tracking-tighter truncate max-w-[150px]">"{emp.reasonOfLeaving}"</p>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-xs font-medium text-gray-400 uppercase">
                               {formatDOB(emp.dateOfJoining)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-xs font-bold text-rose-600 bg-rose-50/20">
                              {formatDOB(emp.dateOfLeaving)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-xs font-bold text-gray-700 italic">
                               {emp.mobileNo}
                            </td>
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
                    <div className="flex flex-col items-center justify-center py-24 text-gray-500 text-xs font-bold uppercase tracking-widest border-2 border-dashed border-gray-200 rounded-xl">No records found.</div>
                  ) : activeTab === "joining" ? (
                    currentItems.map((emp, idx) => (
                      <div key={idx} className="bg-white rounded-lg shadow-sm border border-gray-200 p-2.5 space-y-2">
                        <div className="flex justify-between items-center bg-gray-50 -mx-2.5 -mt-2.5 p-2 px-3 rounded-t-lg border-b border-gray-100 mb-1">
                          <span className="font-bold text-indigo-600 text-xs tracking-tight">#{emp.employeeId}</span>
                          <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded">ACTIVE</span>
                        </div>
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-gray-900 text-sm tracking-tight leading-none">{emp.candidateName}</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mt-1.5">{emp.designation}</p>
                          </div>
                          <div className="flex gap-1.5">
                            {emp.aadharPhoto && <a href={emp.aadharPhoto} target="_blank" rel="noopener noreferrer" className="p-1 px-2.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded text-[9px] font-black uppercase">ID</a>}
                            {emp.candidatePhoto && <a href={emp.candidatePhoto} target="_blank" rel="noopener noreferrer" className="p-1 px-2.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded text-[9px] font-black uppercase">PIC</a>}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-50">
                          <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Department</p>
                            <p className="text-xs font-bold text-gray-700 truncate">{emp.department}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Joined Date</p>
                            <p className="text-xs font-bold text-gray-700">{formatDOB(emp.dateOfJoining)}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    currentItems.map((emp, idx) => (
                      <div key={idx} className="bg-white rounded-lg shadow-sm border border-gray-200 p-2.5 space-y-2">
                        <div className="flex justify-between items-center bg-gray-50 -mx-2.5 -mt-2.5 p-2 px-3 rounded-t-lg border-b border-gray-100 mb-1">
                          <span className="font-bold text-rose-600 text-xs tracking-tight">#{emp.employeeId}</span>
                          <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest bg-rose-50 px-2 py-0.5 rounded">LEFT</span>
                        </div>
                        <div>
                           <h3 className="font-bold text-gray-900 text-sm tracking-tight">{emp.name}</h3>
                           <p className="text-[11px] font-bold text-rose-500 italic mt-0.5 truncate">"{emp.reasonOfLeaving}"</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-50">
                           <div>
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Designation</p>
                              <p className="text-xs font-bold text-gray-700">{emp.designation}</p>
                           </div>
                           <div className="text-right">
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Left Date</p>
                              <p className="text-xs font-bold text-rose-600">{formatDOB(emp.dateOfLeaving)}</p>
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
    </div>
  );
};

export default Employee;
