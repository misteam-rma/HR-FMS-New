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

    const getDriveDirectLink = (url) => {
        if (!url || !url.includes('drive.google.com')) return url;
        const fileId = url.match(/\/d\/([^\/]+)/)?.[1] || url.match(/id=([^\&]+)/)?.[1];
        return fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000` : url;
    };

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
            showToast("Gate pass verified successfully", "success");
            fetchGatePassData();
        } catch (err) {
            showToast("Failed to verify gate pass", "error");
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
                        <h1 className="text-xl font-bold text-slate-900 leading-tight">Gate Pass Verification</h1>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Security & Exit Clearance</p>
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
                            className={`px-6 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-2 ${activeTab === 'requests'
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
                            className={`px-6 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-2 ${activeTab === 'history'
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
                {/* Table Body - Desktop */}
                <div className="hidden md:block overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead className="bg-slate-50/50 sticky top-0 z-10">
                            <tr className="border-b border-slate-100">
                                <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">S.No</th>
                                <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Photo</th>
                                <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Visitor Name</th>
                                <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Mobile</th>
                                <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Person to Meet</th>
                                <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Purpose</th>
                                <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">In Time</th>
                                <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Out Time</th>
                                <th className="px-6 py-4 text-center text-[11px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                {activeTab === 'requests' && <th className="px-6 py-4 text-center text-[11px] font-black text-slate-400 uppercase tracking-widest">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && !pendingGatePasses.length && !historyGatePasses.length ? (
                                <tr>
                                    <td colSpan={activeTab === 'requests' ? 10 : 9} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent"></div>
                                            <span className="text-slate-400 font-bold text-sm">Loading gate passes...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={activeTab === 'requests' ? 10 : 9} className="px-8 py-20 text-center">
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
                                filteredData.map((gatePass, idx) => {
                                    const isClosing = closingPasses.has(gatePass.id);

                                    return (
                                        <tr key={gatePass.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-5">
                                                <span className="text-[11px] font-black text-slate-400">#{gatePass.serial_no || gatePass.id}</span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="h-11 w-11 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shadow-sm">
                                                    {gatePass.visitor_photo ? (
                                                        <img 
                                                          src={getDriveDirectLink(gatePass.visitor_photo)} 
                                                          className="h-full w-full object-cover" 
                                                          alt="Visitor" 
                                                          loading="lazy"
                                                          onError={(e) => { e.target.src = "/user.png"; }}
                                                        />
                                                    ) : (
                                                        <UserCheck size={18} className="text-slate-300" />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <p className="font-bold text-slate-800 text-sm whitespace-nowrap">{gatePass.visitor_name}</p>
                                            </td>
                                            <td className="px-6 py-5">
                                                <p className="text-[11px] text-slate-600 font-bold flex items-center gap-2">
                                                    <Phone size={12} className="text-indigo-400" /> {gatePass.mobile_number}
                                                </p>
                                            </td>
                                            <td className="px-6 py-5">
                                                <p className="text-[11px] text-slate-800 font-bold whitespace-nowrap">To: {gatePass.person_to_meet}</p>
                                            </td>
                                            <td className="px-6 py-5">
                                                <p className="text-[10px] text-slate-500 italic max-w-[150px] truncate leading-relaxed">"{gatePass.purpose_of_visit}"</p>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2 text-[11px] text-indigo-600 font-bold whitespace-nowrap">
                                                    <DoorOpen size={14} /> {formatTime(gatePass.time_of_entry)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2 text-[11px] text-rose-500 font-bold whitespace-nowrap">
                                                    <DoorClosed size={14} /> {gatePass.colP ? formatTime(gatePass.colP) : '---'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${activeTab === 'history'
                                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                        : 'bg-amber-50 text-amber-600 border-amber-100'
                                                    }`}>
                                                    {activeTab === 'history' ? 'COMPLETED' : 'AWAITING EXIT'}
                                                </span>
                                            </td>
                                            {activeTab === 'requests' && (
                                                <td className="px-6 py-5">
                                                    <div className="flex justify-center">
                                                        <button
                                                            onClick={() => handleCloseGatePass(gatePass.id)}
                                                            disabled={isClosing}
                                                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isClosing
                                                                    ? "bg-slate-100 text-slate-400 border border-slate-200"
                                                                    : "bg-rose-500 text-white shadow-md shadow-rose-100 hover:bg-rose-600 active:scale-95"
                                                                }`}
                                                        >
                                                            {isClosing ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                                            {isClosing ? "Verifying..." : "Verify Exit"}
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-slate-100 bg-white">
                    {loading && !pendingGatePasses.length && !historyGatePasses.length ? (
                        <div className="p-10 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mx-auto mb-3"></div>
                            <span className="text-slate-400 font-bold text-sm uppercase tracking-widest">Loading...</span>
                        </div>
                    ) : filteredData.length === 0 ? (
                        <div className="p-10 text-center opacity-40">
                            <AlertCircle size={40} className="mx-auto text-slate-300 mb-3" />
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">No Records Found</p>
                        </div>
                    ) : (
                        filteredData.map((gatePass) => {
                            const isClosing = closingPasses.has(gatePass.id);
                            return (
                                <div key={gatePass.id} className="p-5 space-y-4 active:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="h-14 w-14 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shadow-sm">
                                                {gatePass.visitor_photo ? (
                                                    <img 
                                                        src={getDriveDirectLink(gatePass.visitor_photo)} 
                                                        className="h-full w-full object-cover" 
                                                        alt="Visitor" 
                                                        loading="lazy"
                                                        onError={(e) => { e.target.src = "/user.png"; }}
                                                    />
                                                ) : (
                                                    <UserCheck size={20} className="text-slate-300" />
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <p className="font-bold text-slate-900 text-[15px] leading-tight">{gatePass.visitor_name}</p>
                                                <div className="flex items-center gap-2 text-indigo-500">
                                                    <Phone size={12} />
                                                    <span className="text-[11px] font-black tracking-widest">{gatePass.mobile_number}</span>
                                                </div>
                                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">#{gatePass.serial_no || gatePass.id}</p>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase border ${activeTab === 'history'
                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                : 'bg-amber-50 text-amber-600 border-amber-100'
                                            }`}>
                                            {activeTab === 'history' ? 'CLOSED' : 'PENDING'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Meeting With</p>
                                            <p className="text-[11px] font-bold text-slate-700 truncate">{gatePass.person_to_meet}</p>
                                        </div>
                                        <div className="space-y-1 text-right">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Entry Time</p>
                                            <p className="text-[11px] font-bold text-indigo-600">{formatTime(gatePass.time_of_entry)}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-[11px] text-slate-500 italic leading-relaxed">"{gatePass.purpose_of_visit}"</p>
                                        {gatePass.colP && (
                                            <div className="flex items-center gap-2 text-rose-500">
                                                <DoorClosed size={12} />
                                                <span className="text-[11px] font-black uppercase tracking-widest">Exit: {formatTime(gatePass.colP)}</span>
                                            </div>
                                        )}
                                    </div>

                                    {activeTab === 'requests' ? (
                                        <button
                                            onClick={() => handleCloseGatePass(gatePass.id)}
                                            disabled={isClosing}
                                            className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 ${isClosing
                                                    ? "bg-slate-100 text-slate-400 border border-slate-200"
                                                    : "bg-rose-500 text-white shadow-rose-100 hover:bg-rose-600 active:scale-95"
                                                }`}
                                        >
                                            {isClosing ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                            {isClosing ? "Verifying..." : "Verify Exit"}
                                        </button>
                                    ) : (
                                        <div className="flex items-center justify-center gap-2 text-emerald-600 bg-emerald-50 py-3 rounded-xl border border-emerald-100">
                                            <CheckCircle2 size={14} />
                                            <span className="text-[10px] font-black tracking-widest uppercase italic">Cleared at {formatTime(gatePass.colP)}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {toast.show && (
                <div className="fixed top-8 right-8 z-[100] animate-in fade-in slide-in-from-top-6 duration-300">
                    <div className={`flex items-center gap-3 px-8 py-4 rounded-2xl shadow-2xl text-white font-bold text-sm ${toast.type === "success" ? "bg-emerald-500" :
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
