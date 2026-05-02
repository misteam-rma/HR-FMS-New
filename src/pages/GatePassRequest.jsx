import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Camera,
  CheckCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  DoorClosed,
  FileText,
  Image as ImageIcon,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  User,
  UserCheck,
  XCircle,
  Filter,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { getStoredUser } from '../utils/auth';
import {
  createGatePassRequest,
  fetchGatePassEmployees,
  fetchGatePassEntries,
  fetchGatePassHodNames,
  formatDisplayDate,
  isSameDay,
  isSameMonth,
  parseSheetDate,
} from '../utils/gatePass';

const emptyForm = {
  employeeId: '',
  employeeName: '',
  department: '',
  visitPlace: '',
  visitReason: '',
  departureTime: '',
  arrivalTime: '',
  hodName: '',
  whatsappNumber: '',
  gatePassImage: null,
};

const tabMeta = {
  pending: { label: 'Pending', badge: 'bg-amber-50 text-amber-600 border-amber-100' },
  approved: { label: 'Approved', badge: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
  rejected: { label: 'Rejected', badge: 'bg-rose-50 text-rose-600 border-rose-100' },
  closed: { label: 'Closed', badge: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
};

const tabOrder = ['pending', 'approved', 'rejected', 'closed'];

const GatePassRequest = () => {
  const user = getStoredUser() || {};
  const currentUserName = user.Name || '';
  const currentEmployeeId = localStorage.getItem('employeeId') || user.Code || '';

  const [entries, setEntries] = useState([]);
  const [employeeRecord, setEmployeeRecord] = useState(null);
  const [hodNames, setHodNames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [formData, setFormData] = useState({
    ...emptyForm,
    employeeId: currentEmployeeId,
    employeeName: currentUserName,
  });
  const [toastState, setToastState] = useState({ show: false, message: '', type: 'success' });

  const loadUserData = async () => {
    try {
      setLoading(true);

      const [gatePassEntries, employees, hodList] = await Promise.all([
        fetchGatePassEntries(),
        fetchGatePassEmployees(),
        fetchGatePassHodNames(),
      ]);

      setEntries(gatePassEntries);
      setHodNames(hodList);

      const matchedEmployee = employees.find(
        (employee) =>
          employee.id?.toString().trim().toLowerCase() === currentEmployeeId.toString().trim().toLowerCase() ||
          employee.name?.toString().trim().toLowerCase() === currentUserName.toString().trim().toLowerCase(),
      );

      if (matchedEmployee) {
        setEmployeeRecord(matchedEmployee);
        setFormData((prev) => ({
          ...prev,
          employeeId: matchedEmployee.id,
          employeeName: matchedEmployee.name,
          department: matchedEmployee.department,
          whatsappNumber: matchedEmployee.whatsappNumber,
        }));
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to load gate pass data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUserName) {
      loadUserData();
    } else {
      setLoading(false);
    }
  }, [currentEmployeeId, currentUserName]);

  const userEntries = useMemo(
    () =>
      entries.filter((entry) => {
        const sameName =
          entry.employeeName.toString().trim().toLowerCase() === currentUserName.toString().trim().toLowerCase();
        const sameId =
          currentEmployeeId &&
          entry.employeeId.toString().trim().toLowerCase() === currentEmployeeId.toString().trim().toLowerCase();

        return sameName || sameId;
      }),
    [currentEmployeeId, currentUserName, entries],
  );

  const groupedEntries = useMemo(
    () =>
      userEntries.reduce(
        (groups, entry) => {
          groups[entry.status].push(entry);
          return groups;
        },
        { pending: [], approved: [], rejected: [], closed: [] },
      ),
    [userEntries],
  );

  const currentEntries = groupedEntries[activeTab] || [];
  const filteredEntries = useMemo(
    () =>
      currentEntries.filter((entry) => {
        const query = searchTerm.trim().toLowerCase();
        if (!query) return true;

        return (
          entry.serialNo.toLowerCase().includes(query) ||
          entry.visitPlace.toLowerCase().includes(query) ||
          entry.hodName.toLowerCase().includes(query)
        );
      }),
    [currentEntries, searchTerm],
  );

  const todayRequests = useMemo(
    () => userEntries.filter((entry) => isSameDay(parseSheetDate(entry.timestamp))),
    [userEntries],
  );
  const monthlyRequestCount = useMemo(
    () => userEntries.filter((entry) => isSameMonth(parseSheetDate(entry.timestamp))).length,
    [userEntries],
  );
  const canSubmitRequest = todayRequests.length === 0;

  const handleInputChange = (event) => {
    const { name, value, files } = event.target;

    if (name === 'gatePassImage') {
      setFormData((prev) => ({ ...prev, gatePassImage: files?.[0] || null }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const showLocalToast = (message, type = 'success') => {
    setToastState({ show: true, message, type });
    window.setTimeout(() => {
      setToastState({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  const resetForm = () => {
    setShowModal(false);
    setFormData({
      ...emptyForm,
      employeeId: employeeRecord?.id || currentEmployeeId,
      employeeName: employeeRecord?.name || currentUserName,
      department: employeeRecord?.department || '',
      whatsappNumber: employeeRecord?.whatsappNumber || '',
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (monthlyRequestCount >= 3) {
      toast.error('You have reached the monthly limit of 3 gate pass requests');
      return;
    }

    if (!canSubmitRequest) {
      toast.error('You have already submitted a gate pass request today');
      return;
    }

    if (
      !formData.employeeName ||
      !formData.visitPlace ||
      !formData.visitReason ||
      !formData.departureTime ||
      !formData.arrivalTime ||
      !formData.hodName
    ) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      setSubmitting(true);
      await createGatePassRequest(formData, entries);
      toast.success('Gate pass request submitted successfully');
      showLocalToast('Gate pass request submitted successfully', 'success');
      resetForm();
      await loadUserData();
      setActiveTab('pending');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to submit gate pass request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading your gate pass requests..." minHeight="320px" />;
  }

  return (
    <div className="space-y-6 font-outfit animate-in fade-in duration-500 pb-10">
      {/* Header Container */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600 border border-indigo-100">
            <FileText size={28} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">My Gate Pass</h1>
            <div className="flex gap-4 mt-1">
                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 uppercase tracking-widest border-r border-slate-200 pr-4">
                    <Calendar size={12} className="text-indigo-500" /> Month: {monthlyRequestCount}/3
                </span>
                <span className={`text-[11px] font-bold flex items-center gap-1 uppercase tracking-widest ${todayRequests.length ? 'text-rose-500' : 'text-emerald-500'}`}>
                    <Clock size={12} /> Today: {todayRequests.length ? 'Limit Reached' : 'Available'}
                </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          disabled={!canSubmitRequest || monthlyRequestCount >= 3}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50"
        >
          <Plus size={18} />
          New Request
        </button>
      </div>

      {/* Content Container */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Table Header: Tabs Left, Search Right */}
        <div className="p-4 bg-slate-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200">
          {/* Tabs Left */}
          <div className="flex p-1 bg-slate-100/50 rounded-xl border border-slate-200/60">
            {tabOrder.map((tabKey) => (
              <button
                key={tabKey}
                onClick={() => setActiveTab(tabKey)}
                className={`px-6 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-2 ${
                  activeTab === tabKey
                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tabMeta[tabKey].label}
                <span className={`px-2 py-0.5 rounded-md text-[10px] ${activeTab === tabKey ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                  {groupedEntries[tabKey].length}
                </span>
              </button>
            ))}
          </div>

          {/* Search & Refresh Right */}
          <div className="flex items-center gap-3">
            <div className="relative group flex-1 lg:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by pass ID, place..."
                className="w-full lg:w-72 pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            <button 
                onClick={loadUserData}
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
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Pass ID</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Visit Details</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Timing</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">HOD / Contact</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-40">
                        <DoorClosed size={48} className="text-slate-300" />
                        <div>
                            <p className="text-sm font-bold text-slate-600 uppercase tracking-widest">No Requests Found</p>
                            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">There are no records in this category at the moment.</p>
                        </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={`${entry.serialNo}-${entry.status}`} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                        <span className="text-[11px] font-black text-slate-400">#{entry.serialNo}</span>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1">
                            <Calendar size={10} /> {formatDisplayDate(entry.timestamp)}
                        </p>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-slate-800">{entry.visitPlace || '-'}</p>
                      <p className="text-[11px] text-slate-500 mt-1 italic leading-relaxed">"{entry.visitReason || '-'}"</p>
                    </td>
                    <td className="px-8 py-5">
                      <div className="text-[11px] space-y-1 font-bold">
                        <p className="text-slate-700 flex items-center gap-2">
                            <Clock size={14} className="text-rose-500" /> OUT: {formatDisplayDate(entry.departureTime)}
                        </p>
                        <p className="text-slate-500 flex items-center gap-2">
                            <RefreshCw size={14} className="text-indigo-400" /> RTN: {formatDisplayDate(entry.arrivalTime)}
                        </p>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-slate-800">{entry.hodName || '-'}</p>
                      <p className="text-[11px] text-slate-500 flex items-center gap-2 mt-1 font-medium">
                        <Phone size={12} className="text-indigo-400" /> {entry.whatsappNumber || '-'}
                      </p>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex flex-col items-end gap-2">
                        <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${tabMeta[entry.status].badge}`}>
                          {tabMeta[entry.status].label}
                        </span>
                        {entry.gatePassImage ? (
                          <a
                            href={entry.gatePassImage}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 hover:text-indigo-900 transition-colors"
                          >
                            <ImageIcon size={12} />
                            VIEW IMAGE
                          </a>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal - Aligned with HR system style */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-white rounded-3xl shadow-2xl relative animate-in zoom-in-95 duration-300 border border-slate-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
                <div className="flex items-center gap-4">
                    <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600">
                        <Plus size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">New Gate Pass Request</h2>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Submit request for approval</p>
                    </div>
                </div>
                <button 
                    onClick={resetForm}
                    className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all border border-slate-100 shadow-sm"
                >
                    <X size={20} />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Image Section */}
                <div className="lg:col-span-5 space-y-4">
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Camera size={14} /> Document Upload
                    </label>
                    <div className="relative aspect-[4/3] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border-4 border-white ring-1 ring-slate-100 group">
                        {formData.gatePassImage ? (
                            <>
                                <img src={URL.createObjectURL(formData.gatePassImage)} alt="Preview" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <label className="cursor-pointer px-8 py-3 bg-white rounded-2xl font-bold text-sm text-slate-900 shadow-2xl hover:scale-105 transition-all">
                                        Change Image
                                        <input type="file" name="gatePassImage" onChange={handleInputChange} accept="image/*" className="hidden" />
                                    </label>
                                </div>
                            </>
                        ) : (
                            <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800 transition-colors bg-slate-800 text-white/40">
                                <ImageIcon size={36} className="text-white/20" />
                                <p className="mt-3 text-xs font-bold uppercase tracking-widest">Select Pass Image</p>
                                <input type="file" name="gatePassImage" onChange={handleInputChange} accept="image/*" className="hidden" />
                            </label>
                        )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium italic text-center px-4">Upload a clear photo of the handwritten or printed gate pass document.</p>
                </div>

                {/* Form Fields Section */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">Employee ID</label>
                            <input type="text" value={formData.employeeId} readOnly className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-400 outline-none" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">Department</label>
                            <input type="text" value={formData.department} readOnly className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-400 outline-none" />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">HOD Name*</label>
                        <div className="relative group">
                            <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                            <select
                                name="hodName"
                                value={formData.hodName}
                                onChange={handleInputChange}
                                className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none text-sm font-bold appearance-none cursor-pointer"
                                required
                            >
                                <option value="">SELECT HOD</option>
                                {hodNames.map((name) => <option key={name} value={name}>{name}</option>)}
                            </select>
                            <ChevronRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">Place of Visit*</label>
                            <div className="relative group">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                                <input type="text" name="visitPlace" value={formData.visitPlace} onChange={handleInputChange} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none text-sm font-semibold" placeholder="Destination" required />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">Purpose*</label>
                            <div className="relative group">
                                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                                <input type="text" name="visitReason" value={formData.visitReason} onChange={handleInputChange} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none text-sm font-semibold" placeholder="Reason" required />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">Departure Date*</label>
                            <input type="date" name="departureTime" value={formData.departureTime} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 transition-all outline-none text-sm font-bold" required />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">Return Date*</label>
                            <input type="date" name="arrivalTime" value={formData.arrivalTime} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 transition-all outline-none text-sm font-bold" required />
                        </div>
                    </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-slate-100">
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                    * Mandatory Fields
                </div>
                <div className="flex gap-4 w-full sm:w-auto">
                  <button type="button" onClick={resetForm} className="flex-1 sm:flex-none px-10 py-3.5 bg-slate-50 text-slate-500 rounded-2xl font-bold text-sm hover:bg-slate-100 transition-all active:scale-95 border border-slate-200">
                    Discard
                  </button>
                  <button type="submit" disabled={submitting || monthlyRequestCount >= 3 || !canSubmitRequest} className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-12 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:scale-105 transition-all active:scale-95 disabled:opacity-50">
                    {submitting ? <RefreshCw className="animate-spin" size={18} /> : <Send size={18} />}
                    {submitting ? "Submitting..." : "Submit Request"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {toastState.show && (
        <div className="fixed top-8 right-8 z-[100] animate-in fade-in slide-in-from-top-6 duration-300">
          <div className={`px-8 py-4 rounded-2xl shadow-2xl text-white font-bold text-sm flex items-center gap-4 ${
            toastState.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
          }`}>
            {toastState.type === 'success' ? <CheckCircle size={22} /> : <XCircle size={22} />}
            <span>{toastState.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default GatePassRequest;
