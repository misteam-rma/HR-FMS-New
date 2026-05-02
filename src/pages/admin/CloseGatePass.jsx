import { useState, useEffect, useCallback, useRef } from "react"
import {
  CheckCircle2,
  DoorClosed,
  DoorOpen,
  RefreshCw,
  Phone,
  UserCheck,
  Search,
  Clock,
  AlertCircle,
  Bell,
  Filter
} from "lucide-react"
import { fetchGatePassesApi, closeGatePassApi } from "../../utils/closePassApi";

const CloseGatePass = () => {
  const [activeTab, setActiveTab] = useState("requests")
  const [pendingGatePasses, setPendingGatePasses] = useState([])
  const [historyGatePasses, setHistoryGatePasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState({ show: false, message: "", type: "" })
  const [closingPasses, setClosingPasses] = useState(new Set())
  const previousApprovedRef = useRef(null)

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");

  const fetchGatePassData = useCallback(async (isPolling = false) => {
    try {
      if (!isPolling) setLoading(true);

      const res = await fetchGatePassesApi();
      if (!res.success) throw new Error("Fetch failed");
      
      const rows = res.data.data;

      // Pending: colO is not null AND colP is null
      const pending = rows.filter(v => {
        const hasO = v.colO && v.colO.trim() !== '';
        const hasP = v.colP && v.colP.trim() !== '';
        return hasO && !hasP;
      });

      // History: Both colO and colP are not null
      const history = rows.filter(v => {
        const hasO = v.colO && v.colO.trim() !== '';
        const hasP = v.colP && v.colP.trim() !== '';
        return hasO && hasP;
      });

      // Check for new approved passes
      const currentApprovedCount = pending.length;
      
      if (isPolling && previousApprovedRef.current !== null && currentApprovedCount > previousApprovedRef.current) {
         showToast("A new gate pass is ready for closure!", "info");
      }

      previousApprovedRef.current = currentApprovedCount;

      setPendingGatePasses(pending);
      setHistoryGatePasses(history);

    } catch (err) {
      if (!isPolling) showToast("Failed to load gate passes", "error");
      setPendingGatePasses([]);
      setHistoryGatePasses([]);
    } finally {
      if (!isPolling) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGatePassData();
    const intervalId = setInterval(() => {
        fetchGatePassData(true);
    }, 15000); // Polling every 15s

    return () => clearInterval(intervalId);
  }, [fetchGatePassData])

  const showToast = (message, type) => {
    setToast({ show: true, message, type })
    setTimeout(() => {
      setToast({ show: false, message: "", type: "" })
    }, 4000)
  }

  const handleCloseGatePass = async (id) => {
    setClosingPasses(prev => new Set([...prev, id]));

    try {
      await closeGatePassApi(id);
      showToast("Gate pass closed successfully", "success");
      fetchGatePassData();
    } catch (err) {
      showToast("Failed to close gate pass", "error");
    } finally {
      setClosingPasses(prev => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
    }
  };

  const currentData = activeTab === "requests" ? pendingGatePasses : historyGatePasses

  const formatTime = (time) => {
    if (!time) return "N/A";
    try {
      if (time.includes(':')) return time;
      return new Date(`1970-01-01T${time}`).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (e) {
      return time;
    }
  };

  const availableFilters = ["All", ...new Set(currentData.map(v => v.person_to_meet).filter(Boolean))];

  const filteredData = currentData.filter(v => {
      const matchesSearch = 
          v.visitor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.mobile_number?.includes(searchTerm) ||
          v.serial_no?.toString().includes(searchTerm);
      
      const matchesPerson = selectedFilter === "All" || v.person_to_meet === selectedFilter;

      return matchesSearch && matchesPerson;
  });

  // Reset filters when tab changes
  useEffect(() => {
      setSelectedFilter("All");
      setSearchTerm("");
  }, [activeTab]);

  return (
    <div className="space-y-6 font-outfit animate-in fade-in duration-500 pb-10">
        {/* Page Header */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
                <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600 border border-indigo-100">
                    <DoorClosed size={28} />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-900 leading-tight">Gate Pass Closure</h1>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Monitor & Exit Management</p>
                </div>
            </div>

            {/* Optional Top Action Button if needed, omitting for now to match exactly */}
        </div>

        {/* Content Table Section */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            {/* Table Header / Controls */}
            <div className="p-4 bg-slate-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200">
                {/* Tabs Left */}
                <div className="flex p-1 bg-slate-100/50 rounded-xl border border-slate-200/60">
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={`px-6 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-2 ${
                            activeTab === 'requests'
                                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <Clock size={14} />
                        Pending Requests
                        <span className={`px-2 py-0.5 rounded-md text-[10px] ${activeTab === 'requests' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                            {pendingGatePasses.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-6 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-2 ${
                            activeTab === 'history'
                                ? 'bg-white text-emerald-600 shadow-sm border border-slate-200'
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <CheckCircle2 size={14} />
                        History Log
                        <span className={`px-2 py-0.5 rounded-md text-[10px] ${activeTab === 'history' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                            {historyGatePasses.length}
                        </span>
                    </button>
                </div>

                {/* Search and Filters Right */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-white border border-slate-200 rounded-xl transition-all">
                        <Filter size={14} className="text-slate-400" />
                        <select 
                            value={selectedFilter}
                            onChange={(e) => setSelectedFilter(e.target.value)}
                            className="bg-transparent text-xs font-bold text-slate-600 border-none outline-none cursor-pointer focus:ring-0"
                        >
                            <option value="All">All Staff</option>
                            {availableFilters.filter(f => f !== "All").map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </div>

                    <div className="relative group flex-1 lg:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by name or mobile..."
                            className="w-full lg:w-72 pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>
                    <button 
                        onClick={() => fetchGatePassData()}
                        className="p-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-sm active:scale-95"
                        title="Refresh Data"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Table Body */}
            <div className="overflow-x-auto min-h-[400px]">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead className="bg-slate-50/50 sticky top-0 z-10">
                        <tr>
                            <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Actions</th>
                            <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">S.No</th>
                            <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Visitor Details</th>
                            <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Visit Info</th>
                            <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Timing</th>
                            <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading && !pendingGatePasses.length && !historyGatePasses.length ? (
                            <tr>
                                <td colSpan="6" className="px-8 py-20 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent"></div>
                                        <span className="text-slate-400 font-bold text-sm">Loading gate passes...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredData.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-8 py-20 text-center">
                                    <div className="flex flex-col items-center gap-4 opacity-40">
                                        <AlertCircle size={48} className="text-slate-300" />
                                        <div>
                                            <p className="text-sm font-bold text-slate-600 uppercase tracking-widest">No Records Found</p>
                                            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">There are no {activeTab} passes for the current filter.</p>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredData.map((gatePass) => {
                                const isClosing = closingPasses.has(gatePass.id);
                                
                                return (
                                    <tr key={gatePass.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-5">
                                            {activeTab === 'requests' ? (
                                                <button
                                                    onClick={() => handleCloseGatePass(gatePass.id)}
                                                    disabled={isClosing}
                                                    className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                                                        isClosing
                                                          ? "bg-slate-100 text-slate-400"
                                                          : "bg-rose-500 text-white shadow-lg shadow-rose-100 hover:bg-rose-600 active:scale-95"
                                                      }`}
                                                >
                                                    {isClosing ? <RefreshCw size={14} className="animate-spin" /> : <DoorClosed size={14} />}
                                                    {isClosing ? "Closing..." : "Close Pass"}
                                                </button>
                                            ) : (
                                                <span className={`inline-flex px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border bg-emerald-50 text-emerald-600 border-emerald-100`}>
                                                    CLOSED
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="text-[11px] font-black text-slate-400">#{gatePass.serial_no || gatePass.id}</span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="h-11 w-11 rounded-xl bg-slate-100 border-2 border-white ring-1 ring-slate-200 overflow-hidden flex items-center justify-center">
                                                    {gatePass.visitor_photo ? (
                                                        <img src={gatePass.visitor_photo} className="h-full w-full object-cover" alt="Visitor" />
                                                    ) : (
                                                        <UserCheck size={18} className="text-slate-300" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 text-sm">{gatePass.visitor_name}</p>
                                                    <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                                                        <Phone size={12} className="text-indigo-400" /> {gatePass.mobile_number}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <p className="text-xs font-bold text-slate-700">To: {gatePass.person_to_meet}</p>
                                            <p className="text-[11px] text-slate-500 mt-1 italic leading-relaxed truncate max-w-[200px]">"{gatePass.purpose_of_visit}"</p>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="text-[11px] space-y-1 font-bold">
                                                <p className="text-indigo-500 flex items-center gap-2">
                                                    <DoorOpen size={14} /> In: {formatTime(gatePass.time_of_entry)}
                                                </p>
                                                {gatePass.colP && gatePass.colP.trim() !== '' && (
                                                    <p className="text-rose-500 flex items-center gap-2">
                                                        <DoorClosed size={14} /> Out: {formatTime(gatePass.colP)}
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                                activeTab === 'history' 
                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                                    : 'bg-amber-50 text-amber-600 border-amber-100'
                                            }`}>
                                                {activeTab === 'history' ? 'COMPLETED' : 'AWAITING EXIT'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {toast.show && (
            <div className="fixed top-8 right-8 z-[100] animate-in fade-in slide-in-from-top-6 duration-300">
                <div className={`flex items-center gap-3 px-8 py-4 rounded-2xl shadow-2xl text-white font-bold text-sm ${
                    toast.type === "success" ? "bg-emerald-500" :
                    toast.type === "error" ? "bg-rose-500" : "bg-indigo-500"
                }`}>
                    <Bell size={20} />
                    <span>{toast.message}</span>
                </div>
            </div>
        )}
    </div>
  )
}

export default CloseGatePass;
