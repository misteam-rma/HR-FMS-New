import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  DoorClosed,
  Image as ImageIcon,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  createGatePassRequest,
  fetchGatePassEmployees,
  fetchGatePassEntries,
  fetchGatePassHodNames,
  formatDisplayDate,
  formatDisplayDateTime,
  normalizeGatePassStatus,
  updateGatePassStatus,
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

const statusMeta = {
  pending: {
    label: 'Pending',
    badge: 'bg-amber-100 text-amber-700',
    tab: 'Pending Review',
    icon: Clock,
  },
  approved: {
    label: 'Approved',
    badge: 'bg-emerald-100 text-emerald-700',
    tab: 'Active Passes',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Rejected',
    badge: 'bg-rose-100 text-rose-700',
    tab: 'Rejected',
    icon: XCircle,
  },
  closed: {
    label: 'Closed',
    badge: 'bg-slate-200 text-slate-700',
    tab: 'History',
    icon: DoorClosed,
  },
};

const tabOrder = ['pending', 'approved', 'rejected', 'closed'];

const GatePass = () => {
  const [entries, setEntries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [hodNames, setHodNames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionSerialNo, setActionSerialNo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('All');
  const [selectedHod, setSelectedHod] = useState('All');
  const [activeTab, setActiveTab] = useState('pending');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  const loadPageData = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const [gatePassEntries, employeeList, hodList] = await Promise.all([
        fetchGatePassEntries(),
        fetchGatePassEmployees(),
        fetchGatePassHodNames(),
      ]);

      setEntries(gatePassEntries);
      setEmployees(employeeList);
      setHodNames(hodList);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to load gate pass data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPageData();
  }, []);

  const groupedEntries = useMemo(() => {
    const groups = {
      pending: [],
      approved: [],
      rejected: [],
      closed: [],
    };

    entries.forEach((entry) => {
      groups[normalizeGatePassStatus(entry.status)].push(entry);
    });

    return groups;
  }, [entries]);

  const currentEntries = groupedEntries[activeTab] || [];
  const employeeOptions = useMemo(
    () => ['All', ...new Set(entries.map((entry) => entry.employeeName).filter(Boolean))],
    [entries],
  );
  const hodOptions = useMemo(
    () => ['All', ...new Set(entries.map((entry) => entry.hodName).filter(Boolean))],
    [entries],
  );

  const filteredEntries = useMemo(
    () =>
      currentEntries.filter((entry) => {
        const query = searchTerm.trim().toLowerCase();
        const matchesSearch =
          !query ||
          entry.employeeName.toLowerCase().includes(query) ||
          entry.employeeId.toLowerCase().includes(query) ||
          entry.visitPlace.toLowerCase().includes(query);

        const matchesEmployee = selectedEmployee === 'All' || entry.employeeName === selectedEmployee;
        const matchesHod = selectedHod === 'All' || entry.hodName === selectedHod;

        return matchesSearch && matchesEmployee && matchesHod;
      }),
    [currentEntries, searchTerm, selectedEmployee, selectedHod],
  );

  const selectEmployee = (employeeName) => {
    const employee = employees.find((item) => item.name === employeeName);
    setFormData((prev) => ({
      ...prev,
      employeeName,
      employeeId: employee?.id || '',
      department: employee?.department || '',
      whatsappNumber: employee?.whatsappNumber || '',
    }));
  };

  const handleInputChange = (event) => {
    const { name, value, files } = event.target;

    if (name === 'employeeName') {
      selectEmployee(value);
      return;
    }

    if (name === 'gatePassImage') {
      setFormData((prev) => ({ ...prev, gatePassImage: files?.[0] || null }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetModal = () => {
    setFormData(emptyForm);
    setShowModal(false);
  };

  const handleCreateRequest = async (event) => {
    event.preventDefault();

    if (
      !formData.employeeName ||
      !formData.visitPlace ||
      !formData.visitReason ||
      !formData.departureTime ||
      !formData.arrivalTime ||
      !formData.hodName ||
      !formData.whatsappNumber
    ) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      setSubmitting(true);
      await createGatePassRequest(formData, entries);
      toast.success('Gate pass request created successfully');
      resetModal();
      await loadPageData(false);
      setActiveTab('pending');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to create gate pass request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusAction = async (serialNo, status) => {
    try {
      setActionSerialNo(`${serialNo}:${status}`);
      await updateGatePassStatus(serialNo, status);
      toast.success(
        status === 'approved'
          ? 'Gate pass approved successfully'
          : status === 'rejected'
            ? 'Gate pass rejected successfully'
            : 'Gate pass closed successfully',
      );
      await loadPageData(false);
      if (status === 'closed') {
        setActiveTab('closed');
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to update gate pass status');
    } finally {
      setActionSerialNo('');
    }
  };

  const renderActionButtons = (entry) => {
    if (activeTab === 'pending') {
      return (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleStatusAction(entry.serialNo, 'rejected')}
            disabled={Boolean(actionSerialNo)}
            className="px-3 py-2 rounded-xl border border-rose-200 text-rose-600 text-xs font-bold hover:bg-rose-50 transition-all disabled:opacity-50"
          >
            Reject
          </button>
          <button
            onClick={() => handleStatusAction(entry.serialNo, 'approved')}
            disabled={Boolean(actionSerialNo)}
            className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            {actionSerialNo === `${entry.serialNo}:approved` ? 'Approving...' : 'Approve'}
          </button>
        </div>
      );
    }

    if (activeTab === 'approved') {
      return (
        <button
          onClick={() => handleStatusAction(entry.serialNo, 'closed')}
          disabled={Boolean(actionSerialNo)}
          className="px-3 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-900 transition-all disabled:opacity-50"
        >
          {actionSerialNo === `${entry.serialNo}:closed` ? 'Closing...' : 'Close Pass'}
        </button>
      );
    }

    return <span className="text-xs font-semibold text-slate-400">No action</span>;
  };

  if (loading) {
    return <LoadingSpinner message="Loading gate pass management..." minHeight="320px" />;
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900">Gate Pass Management</h1>
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-bold">Request, approve and close</p>
            </div>

            <div className="hidden sm:block h-8 w-px bg-slate-200" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {tabOrder.map((tabKey) => {
                const meta = statusMeta[tabKey];
                const Icon = meta.icon;

                return (
                  <button
                    key={tabKey}
                    onClick={() => setActiveTab(tabKey)}
                    className={`px-4 py-2 rounded-2xl border text-left transition-all ${
                      activeTab === tabKey
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide">
                      <Icon size={14} />
                      {meta.tab}
                    </div>
                    <div className="mt-1 text-base font-extrabold">{groupedEntries[tabKey].length}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => loadPageData(false)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shadow-lg shadow-indigo-100"
            >
              <Plus size={16} />
              New Request
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_180px_180px] gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by employee, ID or place..."
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <select
            value={selectedEmployee}
            onChange={(event) => setSelectedEmployee(event.target.value)}
            className="px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {employeeOptions.map((option) => (
              <option key={option} value={option}>
                {option === 'All' ? 'All Employees' : option}
              </option>
            ))}
          </select>

          <select
            value={selectedHod}
            onChange={(event) => setSelectedHod(event.target.value)}
            className="px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {hodOptions.map((option) => (
              <option key={option} value={option}>
                {option === 'All' ? 'All HODs' : option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="hidden lg:block bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Action</th>
                <th className="px-5 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Pass ID</th>
                <th className="px-5 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Employee</th>
                <th className="px-5 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Visit Details</th>
                <th className="px-5 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Timing</th>
                <th className="px-5 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-14 text-center text-slate-400">
                    No gate pass records found for this filter.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={`${entry.serialNo}-${entry.status}`} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4">{renderActionButtons(entry)}</td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold">{entry.serialNo}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{entry.employeeName}</p>
                        <p className="text-xs text-slate-500">{entry.employeeId} | {entry.department || 'Department N/A'}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-slate-700">{entry.visitPlace || '-'}</p>
                      <p className="text-xs text-slate-500">{entry.visitReason || entry.hodName || '-'}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-xs font-semibold text-slate-700">Out: {formatDisplayDate(entry.departureTime)}</p>
                      <p className="text-xs text-slate-500">Return: {formatDisplayDate(entry.arrivalTime)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-2">
                        <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${statusMeta[entry.status].badge}`}>
                          {statusMeta[entry.status].label}
                        </span>
                        {entry.gatePassImage ? (
                          <a
                            href={entry.gatePassImage}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                          >
                            <ImageIcon size={12} />
                            View image
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

      <div className="lg:hidden space-y-3">
        {filteredEntries.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-10 text-center text-slate-400">
            No gate pass records found.
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <div key={`${entry.serialNo}-${entry.status}`} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold">{entry.serialNo}</span>
                <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${statusMeta[entry.status].badge}`}>
                  {statusMeta[entry.status].label}
                </span>
              </div>

              <div>
                <p className="text-sm font-bold text-slate-800">{entry.employeeName}</p>
                <p className="text-xs text-slate-500">{entry.employeeId} | {entry.department || 'Department N/A'}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="font-bold text-slate-500 uppercase tracking-wide">Place</p>
                  <p className="text-slate-700">{entry.visitPlace || '-'}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-500 uppercase tracking-wide">HOD</p>
                  <p className="text-slate-700">{entry.hodName || '-'}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-500 uppercase tracking-wide">Out</p>
                  <p className="text-slate-700">{formatDisplayDate(entry.departureTime)}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-500 uppercase tracking-wide">Return</p>
                  <p className="text-slate-700">{formatDisplayDate(entry.arrivalTime)}</p>
                </div>
              </div>

              {entry.gatePassImage ? (
                <a
                  href={entry.gatePassImage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-indigo-600 font-semibold"
                >
                  <ImageIcon size={14} />
                  View gate pass image
                </a>
              ) : null}

              <div>{renderActionButtons(entry)}</div>
            </div>
          ))
        )}
      </div>

      {showModal ? (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Create Gate Pass</h2>
                <p className="text-xs uppercase tracking-[0.18em] font-bold text-slate-500">Admin request entry</p>
              </div>
              <button
                onClick={resetModal}
                className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Employee</label>
                  <select
                    name="employeeName"
                    value={formData.employeeName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  >
                    <option value="">Select employee</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.name}>
                        {employee.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">HOD Name</label>
                  <select
                    name="hodName"
                    value={formData.hodName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  >
                    <option value="">Select HOD</option>
                    {hodNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Visit Place</label>
                  <input
                    name="visitPlace"
                    value={formData.visitPlace}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Reason</label>
                  <input
                    name="visitReason"
                    value={formData.visitReason}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Departure Date</label>
                  <input
                    type="date"
                    name="departureTime"
                    value={formData.departureTime}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Return Date</label>
                  <input
                    type="date"
                    name="arrivalTime"
                    value={formData.arrivalTime}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">WhatsApp Number</label>
                  <input
                    name="whatsappNumber"
                    value={formData.whatsappNumber}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Image</label>
                  <input
                    type="file"
                    name="gatePassImage"
                    onChange={handleInputChange}
                    accept="image/*"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={resetModal}
                  className="px-5 py-3 rounded-2xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-3 rounded-2xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-60"
                >
                  {submitting ? 'Submitting...' : 'Create Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default GatePass;
