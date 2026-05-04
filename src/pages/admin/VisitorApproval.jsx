import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    CheckCircle2,
    Clock,
    Search,
    User,
    Phone,
    MapPin,
    Calendar,
    RefreshCw,
    AlertCircle,
    CheckCircle,
    XCircle,
    ShieldCheck,
    Plus,
    Filter,
    X,
    FileText,
    Image as ImageIcon,
    UserCheck
} from 'lucide-react';
import { fetchVisitsForApprovalApi, updateVisitStatusApi } from '../../utils/visitorApi';
import VisitorEntry from './VisitorEntry';
import { getStoredUser, isAdminUser } from '../../utils/auth';

const VisitorApproval = () => {
    const user = getStoredUser();
    const isAdmin = isAdminUser(user);
    const [visits, setVisits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('requests');
    const [showFormModal, setShowFormModal] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(null);
    const [toast, setToast] = useState({ show: false, message: '', type: '' });
    const [previewImage, setPreviewImage] = useState(null);

    const getDriveDirectLink = (url) => {
        if (!url || !url.includes('drive.google.com')) return url;
        const fileId = url.match(/\/d\/([^\/]+)/)?.[1] || url.match(/id=([^\&]+)/)?.[1];
        // Using thumbnail service which is often more reliable for direct display
        return fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000` : url;
    };

    const fetchAllData = useCallback(async (isPolling = false) => {
        if (!isPolling) setLoading(true);
        try {
            const res = await fetchVisitsForApprovalApi();
            if (res.success) {
                setVisits(res.visits);
            }
        } catch (error) {
            console.error("Error fetching visits:", error);
        } finally {
            if (!isPolling) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllData();
        const interval = setInterval(() => fetchAllData(true), 30000);
        return () => clearInterval(interval);
    }, [fetchAllData]);

    const handleStatusUpdate = async (rowIndex, newStatus) => {
        setUpdatingStatus(rowIndex);
        try {
            const res = await updateVisitStatusApi(rowIndex, newStatus);
            if (res.success) {
                showToast(`Request ${newStatus} successfully`, 'success');
                fetchAllData(true);
            } else {
                showToast('Failed to update status', 'error');
            }
        } catch (error) {
            showToast('Connection error', 'error');
        } finally {
            setUpdatingStatus(null);
        }
    };

    const showToast = (message, type) => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
    };

    const filteredVisits = useMemo(() => {
        const data = visits.filter(v => {
            // Role-based access check
            if (!isAdmin) {
                const isRequestedByMe = v.userCode && user?.Code && v.userCode.toString().trim() === user.Code.toString().trim();
                const isMeetingMe = (v.personToMeet === user?.Name || v.personToMeet === user?.Username);
                const isMyVisitorName = v.visitorName && user?.Name && v.visitorName.toString().trim().toLowerCase() === user.Name.toString().trim().toLowerCase();

                if (!isRequestedByMe && !isMeetingMe && !isMyVisitorName) {
                    return false;
                }
            }

            const hasHistory = (v.colK && v.colK.trim() !== '') && (v.colL && v.colL.trim() !== '');
            if (activeTab === 'requests') {
                return !hasHistory;
            }
            return hasHistory;
        });

        if (!searchTerm) return data;

        return data.filter(v =>
            v.visitorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.mobileNumber?.includes(searchTerm)
        );
    }, [visits, activeTab, searchTerm, user, isAdmin]);

    const stats = useMemo(() => {
        const roleFilteredVisits = visits.filter(v => {
            if (!isAdmin) {
                const isRequestedByMe = v.userCode && user?.Code && v.userCode.toString().trim() === user.Code.toString().trim();
                const isMeetingMe = (v.personToMeet === user?.Name || v.personToMeet === user?.Username);
                const isMyVisitorName = v.visitorName && user?.Name && v.visitorName.toString().trim().toLowerCase() === user.Name.toString().trim().toLowerCase();

                return isRequestedByMe || isMeetingMe || isMyVisitorName;
            }
            return true;
        });

        return {
            pending: roleFilteredVisits.filter(v => {
                const hasHistory = (v.colK && v.colK.trim() !== '') && (v.colL && v.colL.trim() !== '');
                return !hasHistory;
            }).length,
            history: roleFilteredVisits.filter(v => {
                const hasHistory = (v.colK && v.colK.trim() !== '') && (v.colL && v.colL.trim() !== '');
                return hasHistory;
            }).length
        };
    }, [visits, isAdmin, user]);

    return (
        <div className="space-y-6 font-outfit animate-in fade-in duration-500 pb-10">
            {/* Page Header */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600 border border-indigo-100">
                        <ShieldCheck size={28} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 leading-tight">Visitor Approval</h1>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Manage and approve visitor entry requests</p>
                    </div>
                </div>

                <button
                    onClick={() => setShowFormModal(true)}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95"
                >
                    <Plus size={18} />
                    Request Form
                </button>
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
                                {stats.pending}
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
                                {stats.history}
                            </span>
                        </button>
                    </div>

                    {/* Search Right */}
                    <div className="flex items-center gap-3">
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
                            onClick={() => fetchAllData()}
                            className="p-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-sm active:scale-95"
                            title="Refresh Data"
                        >
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Table Body - Desktop */}
                <div className="hidden md:block overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead className="bg-slate-50/50 sticky top-0 z-10">
                            <tr>
                                {isAdmin && activeTab === 'requests' && <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Actions</th>}
                                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">S.No</th>
                                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Visitor Name</th>
                                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Mobile No</th>
                                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Person To Meet</th>
                                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Purpose</th>
                                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Date</th>
                                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Time</th>
                                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && !visits.length ? (
                                <tr>
                                    <td colSpan={isAdmin && activeTab === 'requests' ? 9 : 8} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent"></div>
                                            <span className="text-slate-400 font-bold text-sm">Syncing visitor requests...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredVisits.length === 0 ? (
                                <tr>
                                    <td colSpan={isAdmin && activeTab === 'requests' ? 9 : 8} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4 opacity-40">
                                            <AlertCircle size={48} className="text-slate-300" />
                                            <div>
                                                <p className="text-sm font-bold text-slate-600 uppercase tracking-widest">No Records Found</p>
                                                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">There are no requests in this category at the moment.</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredVisits.map((visit) => (
                                    <tr key={visit.rowIndex} className="hover:bg-slate-50/50 transition-colors group">
                                        {isAdmin && activeTab === 'requests' && (
                                            <td className="px-8 py-5">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleStatusUpdate(visit.rowIndex, 'APPROVED')}
                                                        disabled={updatingStatus === visit.rowIndex}
                                                        className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-[11px] font-bold hover:bg-emerald-600 shadow-md shadow-emerald-100 transition-all active:scale-95 disabled:opacity-50"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusUpdate(visit.rowIndex, 'REJECTED')}
                                                        disabled={updatingStatus === visit.rowIndex}
                                                        className="px-4 py-2 bg-rose-500 text-white rounded-lg text-[11px] font-bold hover:bg-rose-600 shadow-md shadow-rose-100 transition-all active:scale-95 disabled:opacity-50"
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                        <td className="px-8 py-5">
                                            <span className="text-[11px] font-black text-slate-400">#{visit.serialNo || visit.rowIndex}</span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="h-11 w-11 rounded-xl bg-slate-100 border-2 border-white ring-1 ring-slate-200 overflow-hidden flex items-center justify-center">
                                                    {visit.photo ? (
                                                        <img
                                                            src={getDriveDirectLink(visit.photo)}
                                                            className="h-full w-full object-cover cursor-pointer hover:scale-110 transition-transform"
                                                            alt="Visitor"
                                                            onClick={() => setPreviewImage(getDriveDirectLink(visit.photo))}
                                                        />
                                                    ) : (
                                                        <User size={18} className="text-slate-300" />
                                                    )}
                                                </div>
                                                <p className="font-bold text-slate-800 text-sm whitespace-nowrap">{visit.visitorName}</p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <p className="text-[11px] text-slate-600 font-bold flex items-center gap-2">
                                                <Phone size={12} className="text-indigo-400" /> {visit.mobileNumber}
                                            </p>
                                        </td>
                                        <td className="px-8 py-5">
                                            <p className="text-xs font-bold text-slate-700 whitespace-nowrap">{visit.personToMeet}</p>
                                        </td>
                                        <td className="px-8 py-5">
                                            <p className="text-[11px] text-slate-500 italic leading-relaxed min-w-[150px]">"{visit.purposeOfVisit}"</p>
                                        </td>
                                        <td className="px-8 py-5">
                                            <p className="text-[11px] font-bold text-slate-700 flex items-center gap-2 whitespace-nowrap">
                                                <Calendar size={14} className="text-indigo-500" /> {visit.dateOfVisit}
                                            </p>
                                        </td>
                                        <td className="px-8 py-5">
                                            <p className="text-[11px] font-bold text-slate-500 flex items-center gap-2 whitespace-nowrap">
                                                <Clock size={14} className="text-indigo-400" /> {visit.timeOfEntry}
                                            </p>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${(visit.status || '').toUpperCase() === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                    (visit.status || '').toUpperCase() === 'REJECTED' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                        'bg-amber-50 text-amber-600 border-amber-100'
                                                }`}>
                                                {(visit.status || '').toUpperCase() === 'APPROVED' ? 'Approved' :
                                                    (visit.status || '').toUpperCase() === 'REJECTED' ? 'Rejected' : 'Pending'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-100 bg-white">
                {loading ? (
                    <div className="p-10 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mx-auto mb-3"></div>
                        <span className="text-slate-400 font-bold text-sm uppercase tracking-widest italic">Syncing...</span>
                    </div>
                ) : filteredVisits.length === 0 ? (
                    <div className="p-10 text-center opacity-40">
                        <Search size={32} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">No Requests</p>
                    </div>
                ) : (
                    filteredVisits.map((visit, idx) => (
                    <div key={idx} className="p-5 space-y-4 active:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div 
                                    className="h-14 w-14 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shadow-sm"
                                    onClick={() => setPreviewImage(getDriveDirectLink(visit.photo))}
                                >
                                    {visit.photo ? (
                                        <img 
                                            src={getDriveDirectLink(visit.photo)} 
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
                                    <p className="font-bold text-slate-900 text-[15px] leading-tight">{visit.visitorName}</p>
                                    <div className="flex items-center gap-2 text-indigo-500">
                                        <Phone size={12} />
                                        <span className="text-[11px] font-black tracking-widest">{visit.mobileNumber}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">#{visit.serialNo || visit.rowIndex}</p>
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase border ${(visit.status || '').toUpperCase() === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                    (visit.status || '').toUpperCase() === 'REJECTED' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                        'bg-amber-50 text-amber-600 border-amber-100'
                                }`}>
                                {(visit.status || '').toUpperCase() || 'PENDING'}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Staff Member</p>
                                <div className="flex items-center gap-2 text-slate-700">
                                    <User size={12} className="text-indigo-400" />
                                    <p className="text-[11px] font-bold truncate">{visit.personToMeet}</p>
                                </div>
                            </div>
                            <div className="space-y-1 text-right">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Timing</p>
                                <div className="flex items-center justify-end gap-2 text-slate-700">
                                    <Clock size={12} className="text-indigo-400" />
                                    <p className="text-[11px] font-bold">{visit.timeOfEntry}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Calendar size={12} className="text-slate-400" />
                                <span className="text-[11px] font-bold text-slate-500">{visit.dateOfVisit}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 italic leading-relaxed">"{visit.purposeOfVisit}"</p>
                        </div>

                        {isAdmin && activeTab === 'requests' && (
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => handleStatusUpdate(visit.rowIndex, 'APPROVED')}
                                    disabled={updatingStatus === visit.rowIndex}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-100 active:scale-95 disabled:opacity-50"
                                >
                                    {updatingStatus === visit.rowIndex ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                    Approve
                                </button>
                                <button
                                    onClick={() => handleStatusUpdate(visit.rowIndex, 'REJECTED')}
                                    disabled={updatingStatus === visit.rowIndex}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-rose-100 active:scale-95 disabled:opacity-50"
                                >
                                    {updatingStatus === visit.rowIndex ? <RefreshCw size={14} className="animate-spin" /> : <XCircle size={14} />}
                                    Reject
                                </button>
                            </div>
                        )}
                    </div>
                ))
            )}
            </div>

            {/* Photo Preview Modal */}
            {previewImage && (
                <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
                    <div className="relative max-w-lg w-full bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setPreviewImage(null)}
                            className="absolute top-4 right-4 p-2 bg-white/80 hover:bg-white rounded-full text-slate-900 shadow-lg z-10"
                        >
                            <X size={20} />
                        </button>
                        <div className="p-2">
                            <img src={previewImage} alt="Visitor Preview" className="w-full h-auto rounded-2xl" />
                        </div>
                    </div>
                </div>
            )}

            {/* Modal - Aligned with HR system style */}
            {showFormModal && (
                <div className="fixed inset-0 z-[60] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-white rounded-3xl shadow-2xl relative animate-in zoom-in-95 duration-300 border border-slate-200">
                        <button
                            onClick={() => setShowFormModal(false)}
                            className="absolute top-6 right-6 p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all z-[70] border border-slate-200 shadow-sm"
                        >
                            <X size={20} />
                        </button>
                        <VisitorEntry isModal={true} onClose={() => setShowFormModal(false)} onRefresh={fetchAllData} />
                    </div>
                </div>
            )}

            {/* Premium Toast Notifications */}
            {toast.show && (
                <div className="fixed top-8 right-8 z-[100] animate-in fade-in slide-in-from-top-6 duration-300">
                    <div className={`px-6 py-4 rounded-2xl shadow-2xl text-white font-bold text-sm flex items-center gap-4 ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}>
                        {toast.type === 'success' ? <CheckCircle size={22} /> : <XCircle size={22} />}
                        <span>{toast.message}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VisitorApproval;
