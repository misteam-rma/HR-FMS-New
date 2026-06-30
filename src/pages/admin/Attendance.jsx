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
      const response = await fetch(`${"https://script.google.com/macros/s/AKfycbwGN0L4CqcZdhgie3l94KGGjWHqaL_cHRgwtw1CCUZy6yqpF5lFlFNBbO10dEm7BNK6FQ/exec"}?sheet=Monthly Report&action=fetch`);
      const result = await response.json();
      const rawData = result.data || result;

      if (Array.isArray(rawData) && rawData.length > 0) {
        // Dynamic Header Detection
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(rawData.length, 10); i++) {
          if (rawData[i] && rawData[i].some(cell => cell && cell.toString().toLowerCase().includes('month'))) {
            headerRowIndex = i;
            break;
          }
        }

        const headers = rawData[headerRowIndex].map(h => h?.toString().trim() || '');
        const dataRows = rawData.slice(headerRowIndex + 1);

        const aggregated = dataRows
          .filter(row => row.some(cell => cell && cell.toString().trim() !== '')) // Skip blank rows
          .map((row, index) => {
          const obj = {};
          headers.forEach((header, colIndex) => {
            const key = header.toLowerCase().replace(/\s+/g, '');
            obj[key] = row[colIndex] !== undefined && row[colIndex] !== null ? row[colIndex].toString().trim() : '';
          });

          // Mapping based on "Monthly Report" structure
          return {
            year: obj['year'] || new Date().getFullYear(),
            month: obj['monthname'] || obj['month'] || obj['analyticsmonth'] || '',
            empId: obj['empid'] || obj['employeecode'] || '',
            name: obj['name'] || obj['employeename'] || '',
            department: obj['department'] || '',
            totalDays: obj['dayinmonth'] || '30',
            punchDays: obj['totalpresent'] || obj['present'] || obj['netpresent'] || obj['punchdays'] || '0',
            absents: obj['totalabsent'] || obj['absents'] || obj['totalabsents'] || '0',
            lateDays: obj['late'] || obj['latemarks'] || '0',
            lateNotAllowed: obj['laten'] || obj['late(n)'] || '0',
            punchMiss: obj['miss'] || obj['misspunch'] || '0',
            status: obj['status'] || 'Verified'
          };
        });

        setAttendanceData(aggregated);
      }
    } catch (err) {
      console.error("fetchAttendanceData Error:", err);
      toast.error("Failed to sync monthly report");
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
    const matchesSearch = !searchTerm || item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.empId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesName = !filterDepartment || item.name === filterDepartment;
    const matchesMonth = !filterMonth || item.month === filterMonth;
    return matchesSearch && matchesName && matchesMonth;
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
        <ChevronRight className="h-4 w-4 rotate-180" size={14} />
      </button>
      {[...Array(Math.max(1, Math.min(5, totalPages)))].map((_, i) => (
        <button key={i} onClick={() => paginate(i+1)} className={`relative inline-flex items-center px-3 py-1.5 border text-[11px] font-bold ${currentPage === (i+1) ? "z-10 bg-indigo-50 border-indigo-500 text-indigo-600 shadow-sm" : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"}`}>
          {i + 1}
        </button>
      ))}
      <button onClick={() => paginate(currentPage + 1)} disabled={currentPage >= totalPages} className="relative inline-flex items-center px-1.5 py-1 rounded-r-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50">
        <ChevronRight className="h-4 w-4" size={14} />
      </button>
    </nav>
  );

  return (
    <div className="max-w-full mx-auto px-1 sm:px-2 lg:px-4 py-4 space-y-4 md:space-y-6 pb-20 md:pb-8 font-outfit">
      
      {/* 🧩 Header Section - Call Tracker Parity */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Tab Switcher - Call Tracker SPEC */}
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-gray-800">Monthly Attendance</h1>
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
             {/* Name Filter */}
             <div className="relative">
               <div onClick={() => setIsDeptDropdownOpen(!isDeptDropdownOpen)} className="flex items-center gap-2 h-8 px-3 border border-gray-200 rounded bg-white text-[11px] text-gray-700 font-medium cursor-pointer hover:border-indigo-400 transition shadow-sm">
                 <Filter size={11} className="text-gray-400" />
                 <span className="truncate">{filterDepartment || "All Names"}</span>
                 <ChevronDown size={12} className={`ml-1 text-gray-400 transition-transform ${isDeptDropdownOpen ? 'rotate-180' : ''}`} />
               </div>
               {isDeptDropdownOpen && (
                 <div className="absolute top-full right-0 mt-1 w-48 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1 scrollbar-hide">
                    <div onClick={() => { setFilterDepartment(""); setIsDeptDropdownOpen(false); setCurrentPage(1); }} className="px-3 py-1.5 text-[11px] font-normal cursor-pointer hover:bg-gray-50">All Names</div>
                    {[...new Set(attendanceData.map(d => d.name))].sort().map(name => (
                       <div key={name} onClick={() => { setFilterDepartment(name); setIsDeptDropdownOpen(false); setCurrentPage(1); }} className="px-3 py-1.5 text-[11px] font-normal cursor-pointer hover:bg-gray-50 flex items-center justify-between">
                         {name}
                         {filterDepartment === name && <Check size={11} className="text-indigo-500" />}
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
                {["January", "February", "March", "April", "May", "June", "July"].map(m => (
                  <option key={m} value={m}>{m.toUpperCase()}</option>
                ))}
             </select>
          </div>
        </div>
      </div>

      {/* 📊 Main Content Area */}
      <div className="overflow-hidden border border-gray-200 rounded-lg bg-white min-h-[530px] flex flex-col shadow-sm">
        {tableLoading ? (
           <div className="flex-1 flex items-center justify-center p-12">
             <LoadingSpinner message="Auditing monthly..." minHeight="450px" />
           </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <div className="max-h-[calc(105vh-280px)] min-h-[530px] overflow-y-auto scrollbar-hide">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Employee Name</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Employee ID</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Analytics Month</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Net Present</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Total Absents</th>
                      {/* <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Late Marks</th> */}
                      {/* <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Late (N)</th> */}
                      {/* <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Miss Punch</th> */}
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
                          {/* <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 font-normal">{item.lateDays}</td> */}
                          {/* <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 font-normal">{item.lateNotAllowed}</td> */}
                          {/* <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 font-normal">{item.punchMiss}</td> */}
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

              {/* Desktop Pagination */}
              <div className="px-4 py-3 bg-white border-t border-gray-200 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-6 flex-wrap">
                  <p className="text-[13px] text-gray-600 font-medium tracking-wide">
                    Showing <span className="font-bold text-gray-900">{filteredData.length > 0 ? indexOfFirstItem + 1 : 0}</span> to <span className="font-bold text-gray-900">{Math.min(indexOfLastItem, filteredData.length)}</span> of <span className="font-bold text-gray-900">{filteredData.length}</span> records
                  </p>
                  <div className="flex items-center gap-2 h-5">
                    <label className="text-[13px] text-gray-500 font-medium whitespace-nowrap">Rows per page:</label>
                    <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="text-xs bg-transparent font-medium text-gray-700 outline-none cursor-pointer shadow-none">
                      {[15, 30, 50, 100].map(val => <option key={val} value={val}>{val}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex items-center w-auto justify-end">
                  {renderPaginationNav()}
                </div>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden flex flex-col h-[calc(105vh-320px)] bg-slate-50">
                <div className="flex-1 p-2 space-y-3 overflow-y-auto scrollbar-hide">
                  {currentItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                      <p className="text-gray-400 text-xs font-bold uppercase tracking-widest italic">No monthly logs</p>
                    </div>
                  ) : (
                    currentItems.map((item, idx) => (
                      <div key={idx} className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-4 space-y-3 active:bg-slate-50 transition-colors">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[13px] font-black text-slate-800 uppercase tracking-tight">{item.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">#{item.empId}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            item.status === 'Verified' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'
                          }`}>
                            {item.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                          <div className="space-y-0.5">
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Present Days</p>
                             <p className="text-[11px] font-bold text-emerald-600">{item.punchDays} Days</p>
                          </div>
                          <div className="space-y-0.5 text-right">
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Month</p>
                             <p className="text-[11px] font-bold text-slate-700 uppercase">{item.month} '{item.year?.toString().slice(-2)}</p>
                          </div>
                        </div>

                        <div className="flex justify-between items-center px-2 pt-1">
                          <div className="space-y-0.5">
                             <p className="text-[8px] font-black text-slate-400 uppercase">Total Absents</p>
                             <p className="text-[11px] font-bold text-slate-600">{item.absents}</p>
                          </div>
                          <div className="text-right">
                             <p className="text-[8px] font-black text-slate-400 uppercase">Status</p>
                             <p className={`text-[10px] font-bold ${item.status === 'Verified' ? 'text-indigo-600' : 'text-amber-600'}`}>{item.status}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="border-t border-gray-200 bg-white px-2 py-3 flex justify-center sticky bottom-0">
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