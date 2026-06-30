import React, { useState, useEffect } from 'react';
import { Search, Clock, CheckCircle2, XCircle, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';

const LeaveApproval = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [approvedLeaves, setApprovedLeaves] = useState([]);
  const [rejectedLeaves, setRejectedLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [actionInProgress, setActionInProgress] = useState(null);
  const [editableDates, setEditableDates] = useState({ from: "", to: "" });
  const [hodNames, setHodNames] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("all");

  // Calculate leave statistics
  const calculateLeaveStats = () => {
    const currentYear = new Date().getFullYear();

    // Filter leaves based on selected employee
    const relevantLeaves =
      selectedEmployee === "all"
        ? approvedLeaves
        : approvedLeaves.filter(
          (leave) => leave.employeeName === selectedEmployee
        );

    // Calculate approved leaves for current year
    const casualLeaveTaken = relevantLeaves
      .filter((leave) => {
        const leaveYear = new Date(
          leave.startDate.split("/").reverse().join("-")
        ).getFullYear();
        return (
          leave.leaveType &&
          leave.leaveType.toLowerCase().includes("casual") &&
          leaveYear === currentYear
        );
      })
      .reduce((sum, leave) => sum + leave.days, 0);

    const earnedLeaveTaken = relevantLeaves
      .filter((leave) => {
        const leaveYear = new Date(
          leave.startDate.split("/").reverse().join("-")
        ).getFullYear();
        return (
          leave.leaveType &&
          leave.leaveType.toLowerCase().includes("earned") &&
          leaveYear === currentYear
        );
      })
      .reduce((sum, leave) => sum + leave.days, 0);

    const sickLeaveTaken = relevantLeaves
      .filter((leave) => {
        const leaveYear = new Date(
          leave.startDate.split("/").reverse().join("-")
        ).getFullYear();
        return (
          leave.leaveType &&
          leave.leaveType.toLowerCase().includes("sick") &&
          leaveYear === currentYear
        );
      })
      .reduce((sum, leave) => sum + leave.days, 0);

    const restrictedHolidayTaken = relevantLeaves
      .filter((leave) => {
        const leaveYear = new Date(
          leave.startDate.split("/").reverse().join("-")
        ).getFullYear();
        return (
          leave.leaveType &&
          leave.leaveType.toLowerCase().includes("restricted") &&
          leaveYear === currentYear
        );
      })
      .reduce((sum, leave) => sum + leave.days, 0);

    const totalLeave =
      casualLeaveTaken +
      earnedLeaveTaken +
      sickLeaveTaken +
      restrictedHolidayTaken;

    return {
      casualLeave: casualLeaveTaken,
      earnedLeave: earnedLeaveTaken,
      sickLeave: sickLeaveTaken,
      restrictedHoliday: restrictedHolidayTaken,
      totalLeave: totalLeave,
    };
  };

  const leaveStats = calculateLeaveStats();

  // Get unique employee names for dropdown
  const uniqueEmployeeNames = [
    "all",
    ...new Set([
      ...pendingLeaves.map((leave) => leave.employeeName),
      ...approvedLeaves.map((leave) => leave.employeeName),
      ...rejectedLeaves.map((leave) => leave.employeeName),
    ]),
  ].filter(name => name && name !== "all");

  useEffect(() => {
    fetchLeaveData();
  }, []);

  const handleCheckboxChange = (leaveId, rowData) => {
    if (selectedRow?.serialNo === leaveId) {
      setSelectedRow(null);
      setEditableDates({ from: "", to: "" });
    } else {
      // Convert MM/DD/YYYY to YYYY-MM-DD for date input
      const formatForInput = (dateStr) => {
        if (!dateStr) return "";
        if (dateStr.includes("/")) {
          const [month, day, year] = dateStr.split("/");
          return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        }
        return dateStr;
      };

      setSelectedRow(rowData);
      setEditableDates({
        from: formatForInput(rowData.startDate),
        to: formatForInput(rowData.endDate),
      });
    }
  };

  const handleDateChange = (field, value) => {
    setEditableDates((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Calculate days between dates
  const calculateDays = (startDateStr, endDateStr) => {
    if (!startDateStr || !endDateStr) return 0;

    let startDate, endDate;

    // Handle different date formats
    if (startDateStr.includes("/")) {
      const [startDay, startMonth, startYear] = startDateStr
        .split("/")
        .map(Number);
      startDate = new Date(startYear, startMonth - 1, startDay);
    } else {
      startDate = new Date(startDateStr);
    }

    if (endDateStr.includes("/")) {
      const [endDay, endMonth, endYear] = endDateStr.split("/").map(Number);
      endDate = new Date(endYear, endMonth - 1, endDay);
    } else {
      endDate = new Date(endDateStr);
    }

    const diffTime = endDate - startDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const formatDOB = (dateString) => {
    if (!dateString) return "";

    // If it's already in MM/DD/YYYY format, return as-is
    if (dateString.includes("/") && dateString.split("/")[0].length <= 2) {
      const parts = dateString.split("/");
      if (parts.length === 3) {
        const [first, second, third] = parts;
        // Check if it's already in MM/DD/YYYY format (first part <= 12)
        if (first <= 12 && second <= 31) {
          return dateString;
        }
        // If it's in DD/MM/YYYY format, convert to MM/DD/YYYY
        if (second <= 12 && first <= 31) {
          return `${second.padStart(2, "0")}/${first.padStart(2, "0")}/${third}`;
        }
      }
    }

    // Convert from YYYY-MM-DD to MM/DD/YYYY
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString; // Return as-is if not a valid date
    }

    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const year = date.getFullYear();

    return `${month}/${day}/${year}`;
  };

  const handleLeaveAction = async (action) => {
    if (!selectedRow) {
      toast.error("Please select a leave request");
      return;
    }

    setActionInProgress(action);
    setLoading(true);

    try {
      const fullDataResponse = await fetch(
        `${"https://script.google.com/macros/s/AKfycbwGN0L4CqcZdhgie3l94KGGjWHqaL_cHRgwtw1CCUZy6yqpF5lFlFNBbO10dEm7BNK6FQ/exec"}?sheet=Leave Management&action=fetch`
      );

      if (!fullDataResponse.ok) {
        throw new Error(`HTTP error! status: ${fullDataResponse.status}`);
      }

      const fullDataResult = await fullDataResponse.json();
      const allData = fullDataResult.data || fullDataResult;

      // Find the row index by matching Column B (serial number) and Column C (employee ID)
      const rowIndex = allData.findIndex(
        (row, idx) =>
          idx > 0 && // Skip header row
          row[1]?.toString().trim() ===
          selectedRow.serialNo?.toString().trim() &&
          row[2]?.toString().trim() ===
          selectedRow.employeeId?.toString().trim()
      );

      if (rowIndex === -1) {
        throw new Error(
          `Leave request not found for employee ${selectedRow.employeeId}`
        );
      }

      const today = new Date();
      const day = String(today.getDate()).padStart(2, "0");
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const year = today.getFullYear();
      const formattedDate = `${day}/${month}/${year}`;

      // Prepare only the columns we want to update
      const updateData = {
        sheetName: "Leave Management",
        action: "updateCell", // Change to updateCell action
        rowIndex: rowIndex + 1, // Add 1 because Google Sheets rows are 1-indexed
      };

      // Update Column A (timestamp)
      const timestampPayload = {
        ...updateData,
        columnIndex: 1, // Column A
        value: formattedDate
      };

      const timestampResponse = await fetch(
        "https://script.google.com/macros/s/AKfycbwGN0L4CqcZdhgie3l94KGGjWHqaL_cHRgwtw1CCUZy6yqpF5lFlFNBbO10dEm7BNK6FQ/exec",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams(timestampPayload).toString(),
        }
      );

      const timestampResult = await timestampResponse.json();
      if (!timestampResult.success) {
        throw new Error("Failed to update timestamp");
      }

      // Update Column E (start date) if changed
      if (editableDates.from && editableDates.from !== selectedRow.startDate) {
        const startDatePayload = {
          ...updateData,
          columnIndex: 5, // Column E
          value: formatDOB(editableDates.from)
        };

        const startDateResponse = await fetch(
          "https://script.google.com/macros/s/AKfycbwGN0L4CqcZdhgie3l94KGGjWHqaL_cHRgwtw1CCUZy6yqpF5lFlFNBbO10dEm7BNK6FQ/exec",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams(startDatePayload).toString(),
          }
        );

        const startDateResult = await startDateResponse.json();
        if (!startDateResult.success) {
          throw new Error("Failed to update start date");
        }
      }

      // Update Column F (end date) if changed
      if (editableDates.to && editableDates.to !== selectedRow.endDate) {
        const endDatePayload = {
          ...updateData,
          columnIndex: 6, // Column F
          value: formatDOB(editableDates.to)
        };

        const endDateResponse = await fetch(
          "https://script.google.com/macros/s/AKfycbwGN0L4CqcZdhgie3l94KGGjWHqaL_cHRgwtw1CCUZy6yqpF5lFlFNBbO10dEm7BNK6FQ/exec",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams(endDatePayload).toString(),
          }
        );

        const endDateResult = await endDateResponse.json();
        if (!endDateResult.success) {
          throw new Error("Failed to update end date");
        }
      }

      // Update Column M (HOD approval status)
      const approvalPayload = {
        ...updateData,
        columnIndex: 13, // Column M
        value: action === "accept" ? "approved" : "rejected"
      };

      const approvalResponse = await fetch(
        "https://script.google.com/macros/s/AKfycbwGN0L4CqcZdhgie3l94KGGjWHqaL_cHRgwtw1CCUZy6yqpF5lFlFNBbO10dEm7BNK6FQ/exec",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams(approvalPayload).toString(),
        }
      );

      const approvalResult = await approvalResponse.json();
      if (!approvalResult.success) {
        throw new Error("Failed to update approval status");
      }

      toast.success(
        `Leave ${action === "accept" ? "approved" : "rejected"} for ${selectedRow.employeeName || "employee"
        }`
      );
      fetchLeaveData();
      setSelectedRow(null);
      setEditableDates({ from: "", to: "" });

    } catch (error) {
      console.error("Update error:", error);
      toast.error(`Failed to ${action} leave: ${error.message}`);
    } finally {
      setLoading(false);
      setActionInProgress(null);
    }
  };

  const fetchLeaveData = async () => {
    setLoading(true);
    setTableLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${"https://script.google.com/macros/s/AKfycbwGN0L4CqcZdhgie3l94KGGjWHqaL_cHRgwtw1CCUZy6yqpF5lFlFNBbO10dEm7BNK6FQ/exec"}?sheet=Leave Management&action=fetch`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch leave data");
      }

      const rawData = result.data || result;

      if (!Array.isArray(rawData)) {
        throw new Error("Expected array data not received");
      }

      const dataRows = rawData.length > 1 ? rawData.slice(1) : [];

      const processedData = dataRows.map((row) => ({
        timestamp: row[0] || "",
        serialNo: row[1] || "",
        employeeId: row[2] || "",
        employeeName: row[3] || "",
        startDate: row[4] || "",
        endDate: row[5] || "",
        remark: row[6] || "",
        days: row[13],
        status: row[7],
        leaveType: row[8],
        hodName: row[9] || "",
        department: row[10] || "",
        substitute: row[11] || "",
        hodApproval: row[12] || "", // Column M - HOD Approval Status
      }));

      // Filter leaves where HOD approval is pending
      setPendingLeaves(
        processedData.filter(
          (leave) => leave.hodApproval?.toString().toLowerCase() === "pending"
        )
      );

      // Filter leaves where HOD approval is approved
      setApprovedLeaves(
        processedData.filter(
          (leave) => leave.hodApproval?.toString().toLowerCase() === "approved"
        )
      );

      // Filter leaves where HOD approval is rejected
      setRejectedLeaves(
        processedData.filter(
          (leave) => leave.hodApproval?.toString().toLowerCase() === "rejected"
        )
      );
    } catch (error) {
      console.error("Error fetching leave data:", error);
      setError(error.message);
      toast.error(`Failed to load leave data: ${error.message}`);
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";

    // Handle MM/DD/YYYY format and convert to DD/MM/YYYY
    if (dateString.includes("/")) {
      const parts = dateString.split("/");
      if (parts.length === 3) {
        const [month, day, year] = parts;
        return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
      }
    }

    // Fallback for other date formats
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? dateString : date.toLocaleDateString();
  };

  const filteredPendingLeaves = pendingLeaves.filter((item) => {
    const matchesSearch =
      item.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEmployee =
      selectedEmployee === "all" || item.employeeName === selectedEmployee;
    return matchesSearch && matchesEmployee;
  });

  const filteredRejectedLeaves = rejectedLeaves.filter((item) => {
    const matchesSearch =
      item.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEmployee =
      selectedEmployee === "all" || item.employeeName === selectedEmployee;
    return matchesSearch && matchesEmployee;
  });

  const filteredApprovedLeaves = approvedLeaves.filter((item) => {
    const matchesSearch =
      item.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEmployee =
      selectedEmployee === "all" || item.employeeName === selectedEmployee;
    return matchesSearch && matchesEmployee;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 font-outfit">
      
      {/* Header Container */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Leave Approvals</h1>
           <p className="text-slate-500 text-sm font-medium">HOD Dashboard for managing leave requests</p>
        </div>
      </div>

      {/* Modern Leave Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[
          { label: "Casual", taken: leaveStats.casualLeave, total: 6, color: "indigo" },
          { label: "Earned", taken: leaveStats.earnedLeave, total: 12, color: "emerald" },
          { label: "Sick", taken: leaveStats.sickLeave, total: 6, color: "rose" },
          { label: "Restricted", taken: leaveStats.restrictedHoliday, total: 2, color: "amber" }
        ].map((stat) => (
          <div key={stat.label} className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm transition-all hover:shadow-md">
            <p className={`text-[11px] font-bold text-slate-400 uppercase tracking-widest`}>{stat.label}</p>
            <div className="flex items-end gap-1 mt-2 mb-3">
              <span className={`text-3xl font-black text-${stat.color}-600 leading-none`}>{stat.taken || 0}</span>
              <span className="text-sm text-slate-300 font-bold mb-1">/ {stat.total}</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
               <div 
                className={`h-full bg-${stat.color}-500 rounded-full transition-all`} 
                style={{ width: `${Math.min(100, ((stat.taken || 0) / stat.total) * 100)}%` }}
              ></div>
            </div>
          </div>
        ))}
        <div className="bg-slate-900 p-5 rounded-3xl shadow-lg shadow-slate-200 col-span-2 md:col-span-4 lg:col-span-1 flex flex-col justify-center">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Total Approved</p>
          <p className="text-4xl font-black text-white mt-1">{leaveStats.totalLeave || 0}</p>
          <p className="text-[10px] text-slate-500 font-bold mt-3 uppercase tracking-widest">Current Year</p>
        </div>
      </div>

      {/* Unified Filter Toolbar */}
      <div className="bg-white/60 backdrop-blur-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 rounded-3xl border border-slate-200/60 shadow-sm">
         <div className="flex p-1.5 bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200 shadow-sm w-full md:w-auto overflow-x-auto no-scrollbar">
            {[
              { id: "pending", label: "Pending", count: pendingLeaves.length, icon: Clock, activeColor: 'bg-indigo-600 text-white shadow-lg shadow-indigo-100', inactiveColor: 'text-slate-500 hover:text-slate-700' },
              { id: "approved", label: "Approved", count: approvedLeaves.length, icon: CheckCircle2, activeColor: 'bg-emerald-600 text-white shadow-lg shadow-emerald-100', inactiveColor: 'text-slate-500 hover:text-slate-700' },
              { id: "rejected", label: "Rejected", count: rejectedLeaves.length, icon: XCircle, activeColor: 'bg-rose-600 text-white shadow-lg shadow-rose-100', inactiveColor: 'text-slate-500 hover:text-slate-700' }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                    activeTab === tab.id ? tab.activeColor : tab.inactiveColor
                  }`}
                >
                  <Icon size={16} /> {tab.label} ({tab.count})
                </button>
              )
            })}
         </div>

         <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
             <div className="relative w-full md:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search name or ID..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-400"
                />
             </div>
             <select 
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full md:w-auto px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm"
              >
                <option value="all">All Employees</option>
                {uniqueEmployeeNames.map(name => (
                  <option key={name} value={name}>{name.toUpperCase()}</option>
                ))}
              </select>
         </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          {tableLoading ? (
            <div className="p-12 flex items-center justify-center min-h-[300px]">
               <LoadingSpinner message="Synchronizing leave requests..." />
            </div>
          ) : error ? (
            <div className="p-12 text-center min-h-[300px] flex flex-col justify-center items-center">
              <p className="text-rose-500 text-sm font-bold mb-3">{error}</p>
              <button onClick={fetchLeaveData} className="px-5 py-2.5 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-100 transition-colors uppercase tracking-widest shadow-sm">Retry Request</button>
            </div>
          ) : (
            <>
              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto min-h-[530px] max-h-[calc(105vh-280px)] overflow-y-auto">
                 <table className="w-full text-left border-collapse min-w-[1000px]">
                     <thead className="bg-slate-50/50 sticky top-0 z-10 backdrop-blur-sm">
                       <tr>
                          {activeTab === "pending" && <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/60 w-12">Select</th>}
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/60">Employee</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/60">Dates</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/60">Type & Reason</th>
                          {activeTab === "pending" ? (
                             <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/60 text-right">Action</th>
                          ) : (
                             <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/60 text-right">Status</th>
                          )}
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {(() => {
                           const displayData = activeTab === "pending" ? filteredPendingLeaves : activeTab === "approved" ? filteredApprovedLeaves : filteredRejectedLeaves;
                           if (displayData.length === 0) {
                              return (
                                 <tr>
                                   <td colSpan={activeTab === "pending" ? 5 : 4} className="px-6 py-20 text-center">
                                      <p className="text-sm font-bold text-slate-400">No {activeTab} requests found.</p>
                                   </td>
                                 </tr>
                              );
                           }

                           return displayData.map((item, index) => (
                              <tr key={index} className={`hover:bg-slate-50/80 transition-colors group ${selectedRow?.serialNo === item.serialNo ? 'bg-indigo-50/30' : ''}`}>
                                  {activeTab === "pending" && (
                                    <td className="px-6 py-4">
                                        <input
                                          type="checkbox"
                                          checked={selectedRow?.serialNo === item.serialNo}
                                          onChange={() => handleCheckboxChange(item.serialNo, item)}
                                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded shadow-sm cursor-pointer accent-indigo-600"
                                        />
                                    </td>
                                  )}
                                  <td className="px-6 py-4">
                                     <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${activeTab === 'pending' ? 'bg-indigo-100 text-indigo-600' : activeTab === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                            {item.employeeName?.charAt(0)}
                                        </div>
                                        <div>
                                            <p className={`text-sm font-bold ${selectedRow?.serialNo === item.serialNo ? 'text-indigo-600' : 'text-slate-900 group-hover:text-indigo-600'} transition-colors`}>{item.employeeName}</p>
                                            <p className="text-[11px] font-medium text-slate-400">{item.employeeId} • {item.department}</p>
                                        </div>
                                     </div>
                                  </td>
                                  <td className="px-6 py-4">
                                     {activeTab === "pending" && selectedRow?.serialNo === item.serialNo ? (
                                        <div className="flex items-center gap-2">
                                           <input type="date" value={editableDates.from} onChange={(e) => handleDateChange("from", e.target.value)} className="bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5 text-[11px] font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none text-slate-700 shadow-sm" />
                                           <span className="text-slate-300 font-bold">→</span>
                                           <input type="date" value={editableDates.to} onChange={(e) => handleDateChange("to", e.target.value)} className="bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5 text-[11px] font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none text-slate-700 shadow-sm" />
                                        </div>
                                     ) : (
                                        <div className="flex flex-col gap-1">
                                            <div className="text-xs font-bold text-slate-700">
                                                {formatDate(item.startDate)} <span className="text-slate-300 mx-1">→</span> {formatDate(item.endDate)}
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full inline-block w-fit">{item.days} Days Total</span>
                                        </div>
                                     )}
                                  </td>
                                  <td className="px-6 py-4">
                                     <div className="space-y-1.5">
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-widest shadow-sm ${item.leaveType?.includes('Casual') ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {item.leaveType}
                                        </span>
                                        <p className="text-xs font-medium text-slate-500 max-w-[250px] italic">"{item.remark}"</p>
                                        {item.substitute && <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">Sub: {item.substitute}</p>}
                                     </div>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                     {activeTab === "pending" ? (
                                        <div className="flex items-center justify-end gap-2">
                                           <button
                                             onClick={() => handleLeaveAction("accept")}
                                             disabled={!selectedRow || selectedRow.serialNo !== item.serialNo || loading}
                                             className={`px-4 py-2 border border-emerald-200 bg-emerald-50 text-emerald-700 rounded-xl text-[11px] font-bold hover:bg-emerald-600 hover:text-white transition-all shadow-sm flex items-center justify-center min-w-[80px] uppercase tracking-widest ${(!selectedRow || selectedRow.serialNo !== item.serialNo || loading) ? "opacity-50 cursor-not-allowed" : ""}`}
                                           >
                                              {loading && selectedRow?.serialNo === item.serialNo && actionInProgress === "accept" ? "Wait..." : "Approve"}
                                           </button>
                                           <button
                                             onClick={() => handleLeaveAction("rejected")}
                                             disabled={selectedRow?.serialNo !== item.serialNo || loading}
                                             className={`px-4 py-2 border border-rose-200 bg-rose-50 text-rose-700 rounded-xl text-[11px] font-bold hover:bg-rose-600 hover:text-white transition-all shadow-sm flex items-center justify-center min-w-[80px] uppercase tracking-widest ${(selectedRow?.serialNo !== item.serialNo || loading) ? "opacity-50 cursor-not-allowed" : ""}`}
                                           >
                                              {loading && selectedRow?.serialNo === item.serialNo && actionInProgress === "rejected" ? "Wait..." : "Reject"}
                                           </button>
                                        </div>
                                     ) : (
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm ${activeTab === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                            {activeTab}
                                        </span>
                                     )}
                                  </td>
                              </tr>
                           ))
                        })()}
                     </tbody>
                 </table>
              </div>

              {/* Mobile View */}
              <div className="md:hidden divide-y divide-slate-100 bg-slate-50 min-h-[500px]">
                 {(() => {
                    const displayData = activeTab === "pending" ? filteredPendingLeaves : activeTab === "approved" ? filteredApprovedLeaves : filteredRejectedLeaves;
                    if (displayData.length === 0) {
                        return (
                          <div className="p-12 text-center text-slate-400">
                             <p className="text-sm font-bold">No {activeTab} requests found</p>
                          </div>
                        );
                    }

                    return displayData.map((item, index) => (
                        <div key={index} className={`p-4 bg-white hover:bg-slate-50 transition-colors ${selectedRow?.serialNo === item.serialNo ? 'ring-2 ring-indigo-500/20' : ''}`}>
                             <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                   {activeTab === "pending" && (
                                     <input
                                        type="checkbox"
                                        checked={selectedRow?.serialNo === item.serialNo}
                                        onChange={() => handleCheckboxChange(item.serialNo, item)}
                                        className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded shadow-sm cursor-pointer accent-indigo-600 mr-1"
                                     />
                                   )}
                                   <div>
                                       <p className="text-sm font-bold text-slate-900">{item.employeeName}</p>
                                       <p className="text-[11px] font-bold text-slate-400">{item.employeeId} • {item.department}</p>
                                   </div>
                                </div>
                                {activeTab === "pending" ? (
                                   <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-sm ${item.leaveType?.includes('Casual') ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                      {item.leaveType}
                                   </span>
                                ) : (
                                   <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded shadow-sm ${activeTab === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                      {activeTab}
                                   </span>
                                )}
                             </div>

                             <div className="bg-slate-50 rounded-xl p-3 space-y-2 mb-3 border border-slate-100">
                                 {activeTab === "pending" && selectedRow?.serialNo === item.serialNo ? (
                                    <div className="flex items-center gap-2 mb-1 justify-between">
                                        <div className="flex flex-col gap-1 w-full">
                                            <label className="text-[9px] font-bold text-indigo-500 uppercase">From</label>
                                            <input type="date" value={editableDates.from} onChange={(e) => handleDateChange("from", e.target.value)} className="bg-white border border-indigo-200 rounded p-1.5 text-[11px] font-bold focus:ring-1 focus:ring-indigo-500" />
                                        </div>
                                        <div className="flex flex-col gap-1 w-full">
                                            <label className="text-[9px] font-bold text-indigo-500 uppercase">To</label>
                                            <input type="date" value={editableDates.to} onChange={(e) => handleDateChange("to", e.target.value)} className="bg-white border border-indigo-200 rounded p-1.5 text-[11px] font-bold focus:ring-1 focus:ring-indigo-500" />
                                        </div>
                                    </div>
                                 ) : (
                                    <div className="flex items-center justify-between text-[11px] font-bold">
                                        <span className="text-slate-500 flex items-center gap-1.5"><Calendar size={12}/> {formatDate(item.startDate)} <span className="text-slate-300">→</span> {formatDate(item.endDate)}</span>
                                        <span className="text-slate-900 bg-white px-1.5 py-0.5 rounded shadow-sm border border-slate-200">{item.days} Days</span>
                                    </div>
                                 )}
                                 <p className="text-xs font-medium text-slate-600 line-clamp-2 italic pt-1border-t border-slate-200/60 mt-2">"{item.remark}"</p>
                             </div>

                             {activeTab === "pending" && selectedRow?.serialNo === item.serialNo && (
                                <div className="flex gap-2 mt-2 pt-1">
                                    <button
                                      onClick={() => handleLeaveAction("accept")}
                                      disabled={loading}
                                      className="flex-1 py-2.5 bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-50"
                                    >
                                       {loading && actionInProgress === "accept" ? "Wait..." : "Approve"}
                                    </button>
                                    <button
                                      onClick={() => handleLeaveAction("rejected")}
                                      disabled={loading}
                                      className="flex-1 py-2.5 bg-rose-100 text-rose-700 rounded-xl text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-rose-600 hover:text-white transition-all disabled:opacity-50"
                                    >
                                       {loading && actionInProgress === "rejected" ? "Wait..." : "Reject"}
                                    </button>
                                </div>
                             )}
                        </div>
                    ))
                 })()}
              </div>
            </>
          )}
      </div>
    </div>
  );
};

export default LeaveApproval;