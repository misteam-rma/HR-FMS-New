import React, { useState, useEffect } from 'react';
import { FileText, Plus, X, CheckCircle, RefreshCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';

const NOC = () => {
  const rawUser = localStorage.getItem("user");
  const user = rawUser ? JSON.parse(rawUser) : {};

  const [tableLoading, setTableLoading] = useState(false);
  const [nocData, setNocData] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedNoc, setSelectedNoc] = useState(null);
  const [approvalStatus, setApprovalStatus] = useState('');
  const [approving, setApproving] = useState(false);

  const [formData, setFormData] = useState({
    code: user.Code || '',
    name: user.Name || '',
    teamHead: '',
    teamHeadEmail: '',
    dateOfJoining: '',
    regUnder: '',
    completionDate: '',
    experience: '',
    totalLeaveTaken: '',
    articleEmail: '',
  });

  const fetchNocData = async () => {
    setTableLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=108 NOC&action=fetch`);
      const result = await response.json();
      const rawData = result.data || result;

      if (!Array.isArray(rawData) || rawData.length < 2) {
        setNocData([]);
        return;
      }

      let headerRowIndex = 0;
      for (let i = 0; i < Math.min(rawData.length, 10); i++) {
        const row = rawData[i];
        if (row && row.some(cell => cell && cell.toString().toLowerCase().includes('serial no'))) {
          headerRowIndex = i;
          break;
        }
      }

      const headers = rawData[headerRowIndex];
      const dataRows = rawData.slice(headerRowIndex + 1);
      const getIndex = (name) => headers.findIndex(h => h?.toString().trim().toLowerCase().includes(name.toLowerCase()));

      const tsIdx = getIndex('Timestamp');
      const snIdx = getIndex('Serial No');
      const codeIdx = getIndex('Code');
      const nameIdx = getIndex('Name');
      const teamIdx = getIndex('Team Head');
      const teamEmailIdx = getIndex('Team Head Email');
      const dojIdx = getIndex('Date of Joining');
      const regIdx = getIndex('Reg Under');
      const compIdx = getIndex('Completion Date');
      const expIdx = getIndex('Experiance');
      const leaveIdx = getIndex('Total Leave');
      const artEmailIdx = getIndex('Article Email');
      const statusIdx = getIndex('Status');

      const processedData = dataRows
        .filter(row => Array.isArray(row) && row.some(cell => cell && cell.toString().trim() !== ''))
        .map((row, idx) => {
          const colStatus = row[15] ? row[15].toString().trim() : ''; // Col P - Status
          return {
            timestamp: tsIdx !== -1 ? row[tsIdx] : '',
            serialNo: snIdx !== -1 ? row[snIdx] : '',
            code: codeIdx !== -1 ? row[codeIdx] : '',
            name: nameIdx !== -1 ? row[nameIdx] : '',
            teamHead: teamIdx !== -1 ? row[teamIdx] : '',
            teamHeadEmail: teamEmailIdx !== -1 ? row[teamEmailIdx] : '',
            dateOfJoining: dojIdx !== -1 ? row[dojIdx] : '',
            regUnder: regIdx !== -1 ? row[regIdx] : '',
            completionDate: compIdx !== -1 ? row[compIdx] : '',
            experience: expIdx !== -1 ? row[expIdx] : '',
            totalLeaveTaken: leaveIdx !== -1 ? row[leaveIdx] : '',
            articleEmail: artEmailIdx !== -1 ? row[artEmailIdx] : '',
            status: colStatus,
            statusDate: row[16] ? row[16].toString().trim() : '', // Col Q - Status Date
            rowIndex: headerRowIndex + 1 + idx + 1,
            isPending: colStatus === '',
            isHistory: colStatus !== ''
          };
        });

      let finalData = processedData;
      if (user.Admin?.toLowerCase() !== 'yes') {
        finalData = processedData.filter(item =>
          item.name && item.name.toLowerCase() === (user.Name || '').toLowerCase()
        );
      }
      setNocData(finalData.reverse());
    } catch (error) {
      console.error('Error fetching NOC data:', error);
      toast.error('Could not load NOC history');
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => { fetchNocData(); }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.dateOfJoining) {
      toast.error('Please fill all required fields');
      return;
    }
    setSubmitting(true);
    const loadingToast = toast.loading('Submitting NOC request...');

    try {
      // Get next serial number
      const fetchResponse = await fetch(`${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=108 NOC&action=fetch`);
      const result = await fetchResponse.json();
      const existingData = result.data || result;

      let maxNum = 0;
      if (Array.isArray(existingData) && existingData.length > 0) {
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(existingData.length, 10); i++) {
          const row = existingData[i];
          if (row && row.some(cell => cell && cell.toString().toLowerCase().includes('serial no'))) {
            headerRowIndex = i;
            break;
          }
        }
        const headers = existingData[headerRowIndex];
        const snIdx = headers.findIndex(h => h?.toString().trim().toLowerCase().includes('serial no'));
        const rows = existingData.slice(headerRowIndex + 1)
          .filter(row => Array.isArray(row) && row.some(cell => cell && cell.toString().trim() !== ''));
        rows.forEach(row => {
          const snString = (snIdx !== -1 ? row[snIdx] : row[1])?.toString() || '';
          const match = snString.match(/NOC-(\d+)/) || snString.match(/(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        });
      }
      const nextSerial = `NOC-${String(maxNum + 1).padStart(3, '0')}`;

      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const timestamp = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      const rowData = [
        timestamp,              // A - Timestamp
        nextSerial,             // B - Serial No
        formData.code,          // C - Code
        formData.name,          // D - Name
        formData.teamHead,      // E - Team Head
        formData.teamHeadEmail, // F - Team Head Email
        formData.dateOfJoining, // G - Date of Joining
        formData.regUnder,      // H - Reg Under
        formData.completionDate,// I - Completion Date
        formData.experience,    // J - Experiance
        formData.totalLeaveTaken, // K - Total Leave Taken
        formData.articleEmail,  // L - Article Email
        "",                     // M - Status (blank)
      ];

      const insertRes = await fetch(import.meta.env.VITE_APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ action: "insert", sheetName: "108 NOC", rowData: JSON.stringify(rowData) })
      });
      const insertResult = await insertRes.json();

      if (insertResult.success) {
        toast.success('NOC request submitted successfully!', { id: loadingToast });
        setShowForm(false);
        setFormData({ code: user.Code || '', name: user.Name || '', teamHead: '', teamHeadEmail: '', dateOfJoining: '', regUnder: '', completionDate: '', experience: '', totalLeaveTaken: '', articleEmail: '' });
        fetchNocData();
      } else {
        throw new Error(insertResult.error || 'Submission failed');
      }
    } catch (error) {
      toast.error(error.message || 'Submission failed', { id: loadingToast });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprovalSubmit = async (e) => {
    e.preventDefault();
    if (!approvalStatus || !selectedNoc) { toast.error('Missing approval data'); return; }
    setApproving(true);
    const loadingToast = toast.loading(`Submitting ${approvalStatus}...`);

    try {
      const fetchResponse = await fetch(`${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=108 NOC&action=fetch`);
      const result = await fetchResponse.json();
      const allData = result.data || result;
      const rowIndex = selectedNoc.rowIndex;
      const currentRow = allData[rowIndex - 1];
      if (!currentRow) throw new Error("Could not find the row to update");

      while (currentRow.length < 17) currentRow.push("");

      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const actualTimestamp = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      currentRow[12] = "";              // M - blank
      currentRow[13] = actualTimestamp; // N - Actual
      currentRow[14] = "";              // O - blank
      currentRow[15] = approvalStatus;  // P - Status
      currentRow[16] = actualTimestamp; // Q - Status Date

      const res = await fetch(import.meta.env.VITE_APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ action: "update", sheetName: "108 NOC", rowIndex, rowData: JSON.stringify(currentRow) })
      });

      const responseText = await res.text();
      let updateResult;
      try { updateResult = JSON.parse(responseText); } catch (e) { updateResult = { success: responseText.toLowerCase().includes('success') || responseText === "" }; }

      if (updateResult.success || responseText.toLowerCase().includes('success')) {
        toast.success(`NOC ${approvalStatus} successfully!`, { id: loadingToast });
        setShowApprovalModal(false);
        setApprovalStatus('');
        setSelectedNoc(null);
        fetchNocData();
      } else {
        throw new Error(updateResult.error || "Failed to update status");
      }
    } catch (error) {
      toast.error(error.message || 'Error updating status', { id: loadingToast });
    } finally {
      setApproving(false);
    }
  };

  const filteredData = nocData.filter(item => {
    if (activeTab === 'pending') return item.isPending;
    if (activeTab === 'history') return item.isHistory;
    return true;
  });

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <FileText size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">108 NOC</h1>
            <p className="text-sm text-gray-500">No Objection Certificate Requests</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchNocData} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">
            <RefreshCcw size={15} /> Refresh
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
            <Plus size={16} /> New Request
          </button>
        </div>
      </div>

      {/* Submit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">New NOC Request</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                <input name="code" value={formData.code} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Employee Code" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                <input name="name" value={formData.name} onChange={handleChange} required className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Full Name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Team Head</label>
                <input name="teamHead" value={formData.teamHead} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Team Head Name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Team Head Email</label>
                <input type="email" name="teamHeadEmail" value={formData.teamHeadEmail} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="teamhead@email.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Joining <span className="text-red-500">*</span></label>
                <input type="date" name="dateOfJoining" value={formData.dateOfJoining} onChange={handleChange} required className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reg. Under</label>
                <input name="regUnder" value={formData.regUnder} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Reporting Manager" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Completion Date</label>
                <input type="date" name="completionDate" value={formData.completionDate} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Experience</label>
                <input name="experience" value={formData.experience} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. 1 year" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Leave Taken</label>
                <input type="number" name="totalLeaveTaken" value={formData.totalLeaveTaken} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. 6" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Article Email</label>
                <input type="email" name="articleEmail" value={formData.articleEmail} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="article@email.com" />
              </div>
              <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                  {submitting ? <><RefreshCcw size={14} className="animate-spin" /> Submitting...</> : <><CheckCircle size={14} /> Submit</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approval Modal (Admin only) */}
      {showApprovalModal && selectedNoc && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Review NOC Request</h2>
              <button onClick={() => { setShowApprovalModal(false); setApprovalStatus(''); }} className="p-2 rounded-lg hover:bg-gray-100"><X size={20} /></button>
            </div>
            <form onSubmit={handleApprovalSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="font-medium text-gray-600">Name:</span><p className="text-gray-900">{selectedNoc.name}</p></div>
                <div><span className="font-medium text-gray-600">Code:</span><p className="text-gray-900">{selectedNoc.code}</p></div>
                <div><span className="font-medium text-gray-600">Team Head:</span><p className="text-gray-900">{selectedNoc.teamHead}</p></div>
                <div><span className="font-medium text-gray-600">Team Head Email:</span><p className="text-gray-900">{selectedNoc.teamHeadEmail}</p></div>
                <div><span className="font-medium text-gray-600">Date of Joining:</span><p className="text-gray-900">{selectedNoc.dateOfJoining}</p></div>
                <div><span className="font-medium text-gray-600">Reg. Under:</span><p className="text-gray-900">{selectedNoc.regUnder}</p></div>
                <div><span className="font-medium text-gray-600">Completion Date:</span><p className="text-gray-900">{selectedNoc.completionDate}</p></div>
                <div><span className="font-medium text-gray-600">Experience:</span><p className="text-gray-900">{selectedNoc.experience}</p></div>
                <div><span className="font-medium text-gray-600">Total Leave:</span><p className="text-gray-900">{selectedNoc.totalLeaveTaken}</p></div>
                <div><span className="font-medium text-gray-600">Article Email:</span><p className="text-gray-900">{selectedNoc.articleEmail}</p></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status <span className="text-red-500">*</span></label>
                <select value={approvalStatus} onChange={(e) => setApprovalStatus(e.target.value)} required className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select Status</option>
                  <option value="Approved">Approved</option>
                  <option value="Reject">Reject</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowApprovalModal(false); setApprovalStatus(''); }} className="px-5 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={approving} className="px-5 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                  {approving ? <><RefreshCcw size={14} className="animate-spin" /> Saving...</> : <><CheckCircle size={14} /> Save</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-100 px-6 pt-4">
          <div className="flex gap-1">
            {['pending', 'history'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors capitalize ${activeTab === tab ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
                {tab === 'pending' ? 'Pending NOC' : 'History'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {tableLoading ? (
            <div className="flex justify-center py-16"><LoadingSpinner /></div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <FileText size={40} className="mx-auto mb-3 opacity-30" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No records found</h3>
              <p className="text-gray-500">There are no {activeTab} NOC records yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {user.Admin?.toLowerCase() === 'yes' && activeTab === 'pending' && (
                      <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase text-center sticky left-0 bg-gray-50 z-10">Action</th>
                    )}
                    {activeTab === 'history' && (
                      <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase text-center sticky left-0 bg-gray-50 z-10">Status</th>
                    )}
                    {activeTab === 'history' && (
                      <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Status Date</th>
                    )}
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Sr.</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Serial No</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Date</th>
                    {user.Admin?.toLowerCase() === 'yes' && <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Name</th>}
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Code</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Team Head</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Team Head Email</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">DOJ</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Reg Under</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Completion Date</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Experience</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Total Leave</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Article Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredData.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      {user.Admin?.toLowerCase() === 'yes' && activeTab === 'pending' && (
                        <td className="px-4 py-3 text-sm text-center sticky left-0 bg-white group-hover:bg-gray-50">
                          <button onClick={() => { setSelectedNoc(item); setShowApprovalModal(true); }}
                            className="px-3 py-1 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700">
                            Review
                          </button>
                        </td>
                      )}
                      {activeTab === 'history' && (
                        <td className="px-4 py-3 text-sm text-center sticky left-0 bg-white group-hover:bg-gray-50">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${item.status.toLowerCase() === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {item.status}
                          </span>
                        </td>
                      )}
                      {activeTab === 'history' && (
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.statusDate || '-'}</td>
                      )}
                      <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                      <td className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap font-medium">{item.serialNo}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.timestamp ? item.timestamp.split(' ')[0] : '-'}</td>
                      {user.Admin?.toLowerCase() === 'yes' && <td className="px-4 py-3 text-sm text-gray-800">{item.name}</td>}
                      <td className="px-4 py-3 text-sm text-gray-800">{item.code}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{item.teamHead}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.teamHeadEmail}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.dateOfJoining}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{item.regUnder}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.completionDate}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{item.experience}</td>
                      <td className="px-4 py-3 text-sm text-gray-800 text-center">{item.totalLeaveTaken}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.articleEmail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NOC;
