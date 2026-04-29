import React, { useState, useEffect } from 'react';
import { 
  Search, X, Plus, Calendar, User, Briefcase, CheckCircle2, 
  XCircle, Clock, Filter, ChevronRight, FileText, Download, 
  ChevronLeft, History, Check, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import useAuthStore from '../../store/authStore';

const LeaveManagement = () => {
  const user = useAuthStore(state => state.user);
  const isAdmin = user?.Admin?.trim().toLowerCase() === 'yes';

  const [searchTerm, setSearchTerm] = useState("");
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [approvedLeaves, setApprovedLeaves] = useState([]);
  const [rejectedLeaves, setRejectedLeaves] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [showModal, setShowModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [employeeList, setEmployeeList] = useState([]);
  const [formData, setFormData] = useState({
    employeeId: "",
    employeeName: "",
    employeeCode: "",
    employeeType: "",
    department: "",
    leaveType: "Casual Leave",
    reason: "",
    startDate: "",
    endDate: "",
    approveBy: "",
    planned1: "",
    remarks: ""
  });

  const fetchLeaveData = async () => {
    setTableLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=Leave Management&action=fetch`);
      const result = await response.json();
      if (result.success && result.data) {
        const dataRows = result.data.slice(6).filter(row => row[2] && row[2].toString().trim() !== "");
        const processed = dataRows.map((row, idx) => ({
          timestamp: row[0],
          serialNo: row[1],
          employeeId: row[2],
          employeeName: row[3],
          employeeCode: row[4],
          employeeType: row[5],
          department: row[6],
          leaveType: row[7],
          reason: row[8],
          startDate: row[9],
          endDate: row[10],
          approveBy: row[11],
          planned1: row[12],
          actual1: row[13],
          status: row[14],
          remarks: row[15],
          rowIndex: idx + 7
        }));

        const finalData = isAdmin ? processed : processed.filter(l => l.employeeId?.toString() === user?.Code?.toString());
        const pending = finalData.filter(l => (!l.actual1 || l.actual1.toString().trim() === ""));
        const history = finalData.filter(l => (l.actual1 && l.actual1.toString().trim() !== ""));

        setPendingLeaves(pending);
        setApprovedLeaves(history);
      }
    } catch (err) { 
      console.error(err); 
      toast.error("Failed to fetch leave data");
    } finally { 
      setTableLoading(false); 
    }
  };

  const fetchEmployeeList = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=USER&action=fetch`);
      const result = await response.json();
      console.log("User Data Fetched:", result);
      const rawData = result.data || result;
      
      if (Array.isArray(rawData) && rawData.length > 0) {
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(rawData.length, 10); i++) {
          const row = rawData[i];
          if (row && row.some(cell => cell && cell.toString().toLowerCase().includes('code'))) {
            headerRowIndex = i;
            break;
          }
        }

        const dataRows = rawData.slice(headerRowIndex + 1);
        const list = dataRows.map(row => ({
          id: row[6]?.toString().trim() || '',   // Col G
          name: row[2]?.toString().trim() || '', // Col C
          type: row[3]?.toString().trim() || '', // Col D
          dept: row[10]?.toString().trim() || '' // Col K
        })).filter(e => e.id && e.id !== "Code" && e.id !== "Employee Code");
        
        setEmployeeList(list);
      }
    } catch (err) { 
      console.error("Employee fetch error:", err); 
    }
  };

  useEffect(() => { 
    fetchLeaveData(); 
    fetchEmployeeList();
  }, []);

  const handleEmployeeSelect = (eId) => {
    const emp = employeeList.find(e => e.id === eId);
    if (emp) {
      setFormData(prev => ({
        ...prev,
        employeeId: emp.id,
        employeeName: emp.name,
        employeeCode: emp.id,
        employeeType: emp.type,
        department: emp.dept
      }));
    } else {
      setFormData(prev => ({ ...prev, employeeId: eId }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.startDate || !formData.endDate) {
      toast.error("Please fill required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const nextSerial = (pendingLeaves.length + approvedLeaves.length + 1);
      const submissionData = [
        new Date().toLocaleString(), // A: Timestamp
        nextSerial,                  // B: SerialNo
        formData.employeeId,         // C: Employe ID
        formData.employeeName,       // D: Employee Name
        formData.employeeCode,       // E: Employee Code
        formData.employeeType,       // F: Employee Type
        formData.department,         // G: Department
        formData.leaveType,          // H: Leave Type
        formData.reason,             // I: Reason For Leave
        formData.startDate,          // J: Leave Date Start
        formData.endDate,            // K: Leave Date End
        formData.approveBy,          // L: Approve BY
        "",                          // M: Planned 1 (Set to NULL as requested)
        "",                          // N: Actual 1 (Empty)
        "Pending",                   // O: Status
        formData.remarks             // P: Remarks
      ];

      const response = await fetch(import.meta.env.VITE_APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'insert',
          sheetName: 'Leave Management',
          rowData: JSON.stringify(submissionData)
        })
      });

      const res = await response.json();
      console.log("Submission Response:", res);
      
      if (res.success) {
        toast.success("Leave request submitted successfully!");
        setShowModal(false);
        setFormData({
          employeeId: "", employeeName: "", employeeCode: "", employeeType: "",
          department: "", leaveType: "Casual Leave", reason: "",
          startDate: "", endDate: "", approveBy: "", planned1: "", remarks: ""
        });
        fetchLeaveData();
      } else {
        throw new Error(res.message || "Unknown server error");
      }
    } catch (err) {
      console.error("Submission Error:", err);
      toast.error("Submission failed: " + (err.message || "Network error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActionClick = (item) => {
    setSelectedLeave(item);
    setFormData({
      ...item,
      actual1: item.actual1 || "",
      status: item.status || "Pending",
      remarks: item.remarks || ""
    });
    setShowActionModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const submissionData = [
        selectedLeave.timestamp,     // A
        selectedLeave.serialNo,      // B
        selectedLeave.employeeId,    // C
        selectedLeave.employeeName,  // D
        selectedLeave.employeeCode,  // E
        selectedLeave.employeeType,  // F
        selectedLeave.department,    // G
        selectedLeave.leaveType,     // H
        selectedLeave.reason,        // I
        selectedLeave.startDate,     // J
        selectedLeave.endDate,       // K
        selectedLeave.approveBy,     // L
        "",                          // M (Set to NULL as requested)
        new Date().toLocaleString(), // N: Actual 1 (Timestamp on Action)
        formData.status,             // O: Status
        selectedLeave.remarks        // P: Keep existing remarks
      ];

      const response = await fetch(import.meta.env.VITE_APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'update',
          sheetName: 'Leave Management',
          rowIndex: selectedLeave.rowIndex,
          rowData: JSON.stringify(submissionData)
        })
      });

      const res = await response.json();
      if (res.success) {
        toast.success("Record updated successfully!");
        setShowActionModal(false);
        fetchLeaveData();
      } else {
        throw new Error(res.message || "Update failed");
      }
    } catch (err) {
      toast.error("Update failed: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDisplayLeaves = () => {
    const leaves = activeTab === 'pending' ? pendingLeaves : approvedLeaves;
    return leaves.filter(l => 
        (l.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) || l.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  const activeData = getDisplayLeaves();
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = activeData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(activeData.length / itemsPerPage);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAction = async (action) => {
    toast.loading(`Processing ${action}...`);
    setTimeout(() => {
        toast.dismiss();
        toast.success(`Leave ${action}ed successfully!`);
        fetchLeaveData();
    }, 1500);
  };

  const renderPaginationNav = () => (
    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px w-full justify-center sm:w-auto" aria-label="Pagination">
      <button
        onClick={() => paginate(currentPage - 1)}
        disabled={currentPage === 1}
        className="relative inline-flex items-center px-1.5 py-1 sm:px-2 sm:py-1 rounded-l-md border border-gray-300 bg-white text-xs sm:text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ChevronLeft size={16} />
      </button>

      {[...Array(Math.max(1, totalPages))].map((_, i) => {
        const pageNum = i + 1;
        if (pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)) {
          return (
            <button
              key={pageNum}
              onClick={() => paginate(pageNum)}
              className={`relative inline-flex items-center px-2.5 py-1 sm:px-3 sm:py-1 border text-[11px] font-bold ${currentPage === pageNum ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600 shadow-sm' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}`}
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
        <ChevronRight size={16} />
      </button>
    </nav>
  );

  return (
    <div className="max-w-full mx-auto px-1 sm:px-2 lg:px-4 py-4 space-y-4 md:space-y-6 pb-20 md:pb-8 font-outfit">
      
      {/* 🧩 Header Section - Call Tracker Absolute Parity */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 md:gap-4 mb-2">
        <div className="flex items-center gap-4">
          <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 shadow-sm self-start sm:self-center">
            <button
              onClick={() => { setActiveTab("pending"); setCurrentPage(1); }}
              className={`flex items-center gap-2 py-1 px-4 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all duration-200 ${activeTab === "pending" ? "bg-white text-indigo-600 shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
            >
              <Clock size={13} />
              <span>Pending</span>
            </button>
            <button
              onClick={() => { setActiveTab("approved"); setCurrentPage(1); }}
              className={`flex items-center gap-2 py-1 px-4 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all duration-200 ${activeTab === "approved" ? "bg-white text-indigo-600 shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
            >
              <History size={13} />
              <span>History</span>
            </button>
          </div>
        </div>

        {/* Unified Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
            <input 
               type="text" 
               placeholder="Search requests..." 
               value={searchTerm} 
               onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
               className="pl-9 pr-4 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full text-[13px] shadow-sm bg-white"
            />
          </div>

          <button 
             onClick={() => setShowModal(true)}
             className="h-8 px-4 bg-indigo-600 text-white rounded text-[11px] font-bold uppercase tracking-widest hover:bg-indigo-700 transition flex items-center gap-2 shadow-sm active:scale-95"
          >
             <Plus size={14} />
             New Request
          </button>
        </div>
      </div>

      {/* 📊 Main Table Content Area - Call Tracker Absolute RECONSTRUCTION */}
      <div className="overflow-hidden border border-gray-200 rounded-lg bg-white min-h-[530px] flex flex-col">
        {tableLoading ? (
           <div className="flex-1 flex items-center justify-center p-12">
             <LoadingSpinner message="Retrieving leave database..." minHeight="450px" />
           </div>
        ) : (
          <>
            {/* Desktop View */}
            <div className="hidden md:block max-h-[calc(105vh-280px)] min-h-[530px] overflow-y-auto scrollbar-hide">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    {isAdmin && <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Action</th>}
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Employee Name</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Employee ID</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Code</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Dept</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Type</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Start Date</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">End Date</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap text-right">Approve By</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-4 py-24 text-center">
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">No matching records found.</p>
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                        {isAdmin && (
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <button onClick={() => handleActionClick(item)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors">
                                <FileText size={16} />
                            </button>
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-700 font-normal uppercase">{item.employeeName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 font-normal uppercase tracking-tight">#{item.employeeId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 font-normal uppercase tracking-tight">{item.employeeCode}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 font-normal uppercase">{item.department}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                           <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-widest ${item.leaveType?.includes('Casual') ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                               {item.leaveType}
                           </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 font-normal">{item.startDate}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 font-normal">{item.endDate}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-700 font-normal uppercase pr-6">{item.approveBy}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View - Absolute Call Tracker Parity */}
            <div className="md:hidden flex flex-col h-[calc(100vh-240px)]">
              <div className="flex-1 p-2 space-y-3 overflow-y-auto scrollbar-hide">
                {currentItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24">
                     <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">No entries found.</p>
                  </div>
                ) : (
                  currentItems.map((item, index) => (
                    <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-2.5 space-y-1.5">
                      <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                         <div className="flex items-center gap-2">
                            <span className="font-bold text-indigo-600 text-sm">#{item.employeeId}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest ${item.leaveType?.includes('Casual') ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{item.leaveType}</span>
                         </div>
                         <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400">{item.employeeCode}</span>
                            {isAdmin && (
                               <button onClick={() => handleActionClick(item)} className="p-1 text-indigo-600 bg-indigo-50 rounded shadow-sm">
                                  <FileText size={14} />
                               </button>
                            )}
                         </div>
                      </div>
                      <div>
                         <div className="text-sm font-bold text-gray-800 tracking-tight uppercase leading-none mb-1">{item.employeeName}</div>
                         <p className="text-[11px] text-gray-400 italic line-clamp-1">{item.department}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-gray-50">
                         <div>
                            <span className="block text-gray-400 text-[10px] uppercase">Dates</span>
                            <span className="font-medium text-gray-700">{item.startDate} - {item.endDate}</span>
                         </div>
                         <div className="text-right">
                            <span className="block text-gray-400 text-[10px] uppercase">Approve By</span>
                            <span className="font-medium text-gray-700 uppercase">{item.approveBy}</span>
                         </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-gray-300 bg-white px-2 py-2 flex justify-center sticky bottom-0 z-20">
                 {renderPaginationNav()}
              </div>
            </div>

            {/* 📑 Desktop Footer Pagination - Call Tracker Mirror */}
            <div className="hidden md:flex px-4 py-3 bg-white border-t border-gray-200 flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6 flex-wrap">
                <p className="text-[13px] text-gray-600 font-medium tracking-wide">
                  Showing <span className="font-bold text-gray-900">{activeData.length > 0 ? indexOfFirstItem + 1 : 0}</span> to <span className="font-bold text-gray-900">{Math.min(indexOfLastItem, activeData.length)}</span> of <span className="font-bold text-gray-900">{activeData.length}</span> records
                </p>
                <div className="flex items-center gap-2 h-5">
                  <label className="text-[13px] text-gray-500 font-medium whitespace-nowrap">Rows per page:</label>
                  <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="text-xs bg-transparent font-medium text-gray-700 outline-none cursor-pointer">
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

      {/* Modern Request Modal - Absolute Refinement */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl animate-in zoom-in duration-300 overflow-hidden border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                            <FileText size={16} />
                        </div>
                        <h3 className="text-base font-bold text-gray-900 tracking-tight uppercase">New Request Entry</h3>
                    </div>
                    <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Employee ID</label>
                            <select 
                                value={formData.employeeId}
                                onChange={(e) => handleEmployeeSelect(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded text-[13px] font-medium outline-none focus:ring-1 focus:ring-indigo-500 transition shadow-sm"
                            >
                                <option value="">Select Employee</option>
                                {employeeList.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.id} - {emp.name} ({emp.type})</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Leave Type</label>
                            <select 
                                value={formData.leaveType}
                                onChange={(e) => setFormData({...formData, leaveType: e.target.value})}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded text-[13px] font-medium outline-none focus:ring-1 focus:ring-indigo-500 transition shadow-sm"
                            >
                                <option>Casual Leave</option>
                                <option>Earned Leave</option>
                                <option>Sick Leave</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Start Date</label>
                            <input 
                                type="date" 
                                value={formData.startDate}
                                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded text-[13px] font-medium outline-none focus:ring-1 focus:ring-indigo-500 transition shadow-sm" 
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">End Date</label>
                            <input 
                                type="date" 
                                value={formData.endDate}
                                onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded text-[13px] font-medium outline-none focus:ring-1 focus:ring-indigo-500 transition shadow-sm" 
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Approve By</label>
                            <input 
                                type="text" 
                                value={formData.approveBy}
                                onChange={(e) => setFormData({...formData, approveBy: e.target.value})}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded text-[13px] font-medium outline-none focus:ring-1 focus:ring-indigo-500 transition shadow-sm" 
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Reason / Remarks</label>
                        <textarea 
                            rows={3} 
                            value={formData.reason}
                            onChange={(e) => setFormData({...formData, reason: e.target.value})}
                            placeholder="Provide specific absence details..." 
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded text-[13px] font-medium focus:ring-1 focus:ring-indigo-500 outline-none resize-none transition-all placeholder:text-gray-300 shadow-sm" 
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-gray-50">
                        <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2 text-[11px] font-bold text-gray-500 hover:bg-gray-100 rounded transition-all uppercase tracking-widest focus:outline-none">Cancel</button>
                        <button 
                            disabled={isSubmitting}
                            className="px-8 py-2 bg-slate-900 text-white text-[11px] font-bold rounded hover:bg-slate-800 shadow-md shadow-slate-100 transition-all uppercase tracking-widest active:scale-95 disabled:opacity-50"
                        >
                            {isSubmitting ? "Submitting..." : "Register Request"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
      {/* Action Modal */}
      {showActionModal && selectedLeave && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg animate-in zoom-in duration-300 overflow-hidden border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                    <h3 className="text-base font-bold text-gray-900 tracking-tight uppercase">Update Leave Status</h3>
                    <button onClick={() => setShowActionModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleUpdate} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                       <div>
                          <span className="block text-[10px] text-gray-400 uppercase font-bold">Employee</span>
                          <span className="text-sm font-medium text-gray-700">{selectedLeave.employeeName}</span>
                       </div>
                       <div>
                          <span className="block text-[10px] text-gray-400 uppercase font-bold">Leave Type</span>
                          <span className="text-sm font-medium text-gray-700">{selectedLeave.leaveType}</span>
                       </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Status</label>
                        <select 
                            value={formData.status}
                            onChange={(e) => setFormData({...formData, status: e.target.value})}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded text-[13px] font-medium outline-none focus:ring-1 focus:ring-indigo-500 transition shadow-sm"
                        >
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="Reject">Reject</option>
                        </select>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-gray-50">
                        <button type="button" onClick={() => setShowActionModal(false)} className="px-5 py-2 text-[11px] font-bold text-gray-500 hover:bg-gray-100 rounded transition uppercase tracking-widest">Cancel</button>
                        <button 
                            disabled={isSubmitting}
                            className="px-8 py-2 bg-indigo-600 text-white text-[11px] font-bold rounded hover:bg-indigo-700 shadow-md transition uppercase tracking-widest disabled:opacity-50"
                        >
                            {isSubmitting ? "Updating..." : "Update Record"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default LeaveManagement;