import React, { useState, useEffect } from "react";
import { 
  Search, Users, Calendar, Filter, Clock, CheckCircle2, 
  XCircle, AlertCircle, ChevronRight, FileText, ChevronDown, 
  Check, History, Download, MapPin, List, BarChart3
} from "lucide-react";
import LoadingSpinner from "../../components/LoadingSpinner";
import toast from "react-hot-toast";

// Professional Dummy Monthly History (Jan - Apr 2024)
const Attendance = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [activeTab, setActiveTab] = useState("all"); 
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const [filterMonth, setFilterMonth] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [tableLoading, setTableLoading] = useState(false);

  const fetchAttendanceData = async () => {
    setTableLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=Attendance&action=fetch`);
      const result = await response.json();
      const rawData = result.data || result;

      if (Array.isArray(rawData) && rawData.length > 1) {
        // Aggregation logic
        const groups = {}; // Key: empId + monthYear
        
        rawData.slice(1).forEach(row => {
          const empId = row[2]?.toString().trim();
          const name = row[4]?.toString().trim();
          const dept = row[5]?.toString().trim();
          const dateStr = row[11]?.toString().trim(); // DD/MM/YYYY
          const timeStr = row[12]?.toString().trim(); // HH:MM:SS
          
          if (!empId || !dateStr) return;

          const parts = dateStr.split('/');
          if (parts.length < 3) return;
          const month = new Date(parts[2], parts[1]-1, 1).toLocaleString('default', { month: 'long' });
          const year = parts[2];
          const key = `${empId}-${month}-${year}`;

          if (!groups[key]) {
            groups[key] = {
              year, month, empId, name, department: dept,
              punchDaysSet: new Set(),
              lateDays: 0,
              punchesPerDay: {}, // date -> count
              lastPunch: timeStr,
              totalWorking: 26,
              holidays: 4
            };
          }

          const g = groups[key];
          g.punchDaysSet.add(dateStr);
          
          // Late logic: Assuming in-punch if it's the first punch of the day
          if (!g.punchesPerDay[dateStr]) {
            g.punchesPerDay[dateStr] = 0;
            if (timeStr > "09:30:00") g.lateDays++;
          }
          g.punchesPerDay[dateStr]++;
          
          // Keep track of latest punch
          if (timeStr > g.lastPunch) g.lastPunch = timeStr;
        });

        const aggregated = Object.values(groups).map(g => {
          const punchDays = g.punchDaysSet.size;
          const punchMiss = Object.values(g.punchesPerDay).filter(count => count === 1).length;
          const absents = Math.max(0, g.totalWorking - punchDays);
          
          return {
            ...g,
            punchDays,
            absents,
            punchMiss,
            status: absents > 2 || punchMiss > 3 ? "Under Review" : "Verified",
            lateAllowed: 2,
            lateNotAllowed: Math.max(0, g.lateDays - 2)
          };
        });

        setAttendanceData(aggregated.reverse());
      }
    } catch (err) {
      console.error("fetchAttendanceData Error:", err);
      toast.error("Failed to sync attendance data");
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, filterMonth, searchTerm, filterDepartment]);

  const filteredData = attendanceData.filter(item => {
    if (activeTab === "pending" && item.status !== "Under Review") return false;
    const matchesSearch = !searchTerm || item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.empId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = !filterDepartment || item.department === filterDepartment;
    const matchesMonth = !filterMonth || item.month === filterMonth;
    return matchesSearch && matchesDept && matchesMonth;
  });

  const departments = [...new Set(attendanceData.map(d => d.department))].sort();
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderPaginationNav = () => (
    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px w-full justify-center sm:w-auto">
      <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="relative inline-flex items-center px-1.5 py-1 rounded-l-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50">
        <ChevronRight className="h-4 w-4 rotate-180" />
      </button>
      {[...Array(Math.max(1, Math.min(5, totalPages)))].map((_, i) => (
        <button key={i} onClick={() => paginate(i+1)} className={`relative inline-flex items-center px-4 py-2 border text-[11px] font-bold ${currentPage === (i+1) ? "z-10 bg-indigo-50 border-indigo-500 text-indigo-600 shadow-sm" : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"}`}>
          {i + 1}
        </button>
      ))}
      <button onClick={() => paginate(currentPage + 1)} disabled={currentPage >= totalPages} className="relative inline-flex items-center px-1.5 py-1 rounded-r-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50">
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );

  return (
    <div className="max-w-full mx-auto px-1 sm:px-2 lg:px-4 py-4 space-y-4 md:space-y-6 pb-20 md:pb-8 font-outfit">
      
      {/* 🧩 Header Section - Call Tracker Parity */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Tab Switcher - Call Tracker SPEC */}
        <div className="flex bg-gray-100 p-1 rounded-lg w-fit">
           <button 
             onClick={() => { setActiveTab("all"); setCurrentPage(1); }} 
             className={`flex items-center gap-2 py-1 px-4 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all duration-200 ${activeTab === 'all' ? 'bg-white text-indigo-600 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
           >
             <BarChart3 size={13} />
             <span>All History ({filteredData.length})</span>
           </button>
           <button 
             onClick={() => { setActiveTab("pending"); setCurrentPage(1); }} 
             className={`flex items-center gap-2 py-1 px-4 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all duration-200 ${activeTab === 'pending' ? 'bg-white text-indigo-600 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
           >
             <History size={13} />
             <span>Under Review</span>
           </button>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {/* Search bar */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
            <input 
               type="text" 
               placeholder="Search calls..." 
               value={searchTerm} 
               onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
               className="pl-9 pr-4 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full text-[13px] shadow-sm bg-white"
            />
          </div>

          <div className="grid grid-cols-2 lg:flex lg:items-center gap-2">
             {/* Department Filter */}
             <div className="relative">
               <div onClick={() => setIsDeptDropdownOpen(!isDeptDropdownOpen)} className="flex items-center gap-2 h-8 px-3 border border-gray-200 rounded bg-white text-[11px] text-gray-700 font-medium cursor-pointer hover:border-indigo-400 transition shadow-sm">
                 <Filter size={11} className="text-gray-400" />
                 <span className="truncate">{filterDepartment || "All Dept"}</span>
                 <ChevronDown size={12} className={`ml-1 text-gray-400 transition-transform ${isDeptDropdownOpen ? 'rotate-180' : ''}`} />
               </div>
               {isDeptDropdownOpen && (
                 <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50 overflow-hidden py-1">
                    <div onClick={() => { setFilterDepartment(""); setIsDeptDropdownOpen(false); setCurrentPage(1); }} className="px-3 py-1.5 text-[11px] font-normal cursor-pointer hover:bg-gray-50">All Departments</div>
                    {departments.map(d => (
                       <div key={d} onClick={() => { setFilterDepartment(d); setIsDeptDropdownOpen(false); setCurrentPage(1); }} className="px-3 py-1.5 text-[11px] font-normal cursor-pointer hover:bg-gray-50 flex items-center justify-between">
                         {d}
                         {filterDepartment === d && <Check size={11} className="text-indigo-500" />}
                       </div>
                    ))}
                 </div>
               )}
             </div>

             {/* Select Month */}
             <select 
                value={filterMonth} 
                onChange={(e) => { setFilterMonth(e.target.value); setCurrentPage(1); }} 
                className="h-8 px-2 border border-gray-200 rounded bg-white text-[11px] text-gray-700 font-medium outline-none shadow-sm hover:border-indigo-400 transition"
             >
                <option value="">All Months</option>
                {["January", "February", "March", "April"].map(m => (
                  <option key={m} value={m}>{m.toUpperCase()}</option>
                ))}
             </select>
          </div>
        </div>
      </div>

      {/* 📊 Main Table Content Area - Call Tracker Absolute Mirroring */}
      <div className="overflow-hidden border border-gray-200 rounded-lg bg-white min-h-[530px] flex flex-col">
        {tableLoading ? (
           <div className="flex-1 flex items-center justify-center p-12">
             <LoadingSpinner message="Auditing monthly..." minHeight="450px" />
           </div>
        ) : (
          <>
            <div className="max-h-[calc(105vh-280px)] min-h-[530px] overflow-y-auto scrollbar-hide">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Employee Name</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Employee ID</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Analytics Month</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Net Present</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Total Absents</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Late Marks</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Late (N)</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Miss Punch</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-24 text-center">
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">No history recorded.</p>
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-700 font-normal uppercase">
                           {item.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 font-normal uppercase">#{item.empId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 font-normal uppercase tracking-tight">{item.month} {item.year}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-emerald-600 font-normal">{item.punchDays} Days</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 font-normal">{item.absents}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 font-normal">{item.lateDays}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 font-normal">{item.lateNotAllowed}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 font-normal">{item.punchMiss}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                           <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium ${item.status === 'Verified' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                             {item.status}
                           </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* 📑 Footer Pagination - Call Tracker Mirror */}
            <div className="px-4 py-3 bg-white border-t border-gray-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6 flex-wrap">
                <p className="text-[13px] text-gray-600 font-medium tracking-wide">
                  Showing <span className="font-bold text-gray-900">{filteredData.length > 0 ? indexOfFirstItem + 1 : 0}</span> to <span className="font-bold text-gray-900">{Math.min(indexOfLastItem, filteredData.length)}</span> of <span className="font-bold text-gray-900">{filteredData.length}</span> records
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
    </div>
  );
};

export default Attendance;