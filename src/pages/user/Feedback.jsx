import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Plus, FileUp, X, CheckCircle, RefreshCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';

const Feedback = () => {
  const rawUser = localStorage.getItem("user");
  const user = rawUser ? JSON.parse(rawUser) : {};

  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [feedbackData, setFeedbackData] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [employees, setEmployees] = useState([]);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: user.Name || '',
    email: user.Email || '',
    mobileNo: user['Mobile No.'] || user.Phone || '',
    problem: '',
    description: '',
    suggestion: '',
    screenshot: null
  });

  const problemOptions = [
    'Punch not registering',
    'Wrong punch timing',
    'Log in',
    'Attendance not synced',
    'Other'
  ];

  // Utility to convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = (error) => reject(error);
    });
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch(
        `${"https://script.google.com/macros/s/AKfycbwGN0L4CqcZdhgie3l94KGGjWHqaL_cHRgwtw1CCUZy6yqpF5lFlFNBbO10dEm7BNK6FQ/exec"}?sheet=JOINING&action=fetch`
      );
      const result = await response.json();
      if (result.success) {
        const rawData = result.data || result;
        if (Array.isArray(rawData)) {
          // Data starts after headers, mapping name, email, and mobile
          const employeeData = rawData.slice(6).map(row => ({
            name: row[6] || '',   // Column G (Name As Per Aadhar)
            mobile: row[9] || '', // Column J
            email: row[10] || ''   // Column K
          })).filter(emp => emp.name);
          setEmployees(employeeData);
        }
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchFeedbackData = async () => {
    setTableLoading(true);
    try {
      const response = await fetch(
        `${"https://script.google.com/macros/s/AKfycbwGN0L4CqcZdhgie3l94KGGjWHqaL_cHRgwtw1CCUZy6yqpF5lFlFNBbO10dEm7BNK6FQ/exec"}?sheet=Feedback&action=fetch`
      );

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch Feedback data');
      }

      const rawData = result.data || result;
      if (!Array.isArray(rawData) || rawData.length < 2) {
        setFeedbackData([]);
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

      // Map indices
      const getIndex = (name) => headers.findIndex(h => h?.toString().trim().toLowerCase().includes(name.toLowerCase()));
      const tsIdx = getIndex('Timestamp');
      const snIdx = getIndex('Serial No');
      const nameIdx = getIndex('Name');
      const emailIdx = getIndex('Email');
      const mobIdx = getIndex('Mobile No');
      const probIdx = getIndex('Problem');
      const descIdx = getIndex('Description');
      const screenIdx = getIndex('Screenshot');
      const suggIdx = getIndex('Suggestion');

      const statusIdx = getIndex('Status');

      const processedData = dataRows
        .filter(row => Array.isArray(row) && row.some(cell => cell && cell.toString().trim() !== ''))
        .map((row, idx) => {
          const colStatus = statusIdx !== -1 && row[statusIdx] ? row[statusIdx].toString().trim() : '';

          return {
            timestamp: tsIdx !== -1 ? row[tsIdx] : '',
            serialNo: snIdx !== -1 ? row[snIdx] : '',
            name: nameIdx !== -1 ? row[nameIdx] : '',
            email: emailIdx !== -1 ? row[emailIdx] : '',
            mobileNo: mobIdx !== -1 ? row[mobIdx] : '',
            problem: probIdx !== -1 ? row[probIdx] : '',
            description: descIdx !== -1 ? row[descIdx] : '',
            screenshot: screenIdx !== -1 ? row[screenIdx] : '',
            suggestion: suggIdx !== -1 ? row[suggIdx] : '',
            status: colStatus,
            rowIndex: headerRowIndex + 1 + idx + 1, // 1-based index: offset + 1 (header) + 0-based idx + 1
            // Pending: Status is empty
            // History: Status is filled
            isPending: colStatus === '',
            isHistory: colStatus !== ''
          };
        });

      // Filter to show only the current user's feedback (or all if admin)
      let finalData = processedData;
      if (user.Admin?.toLowerCase() !== 'yes') {
        finalData = processedData.filter(item =>
          item.name && item.name.toLowerCase() === (user.Name || '').toLowerCase()
        );
      }
      setFeedbackData(finalData.reverse());
      console.log('Feedback Table Data:', finalData);

    } catch (error) {
      console.error('Error fetching feedback:', error);
      toast.error('Could not load feedback history');
    } finally {
      setTableLoading(false);
    }
  };

  const [activeTab, setActiveTab] = useState('pending');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [approvalStatus, setApprovalStatus] = useState('');
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    fetchFeedbackData();
    if (user.Admin?.toLowerCase() === 'yes') {
      fetchEmployees();
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // If Admin selects a name from dropdown, auto-fill related info
    if (name === 'name' && user.Admin?.toLowerCase() === 'yes') {
      const selectedEmp = employees.find(emp => emp.name === value);
      if (selectedEmp) {
        setFormData(prev => ({
          ...prev,
          name: value,
          email: selectedEmp.email || prev.email,
          mobileNo: selectedEmp.mobile || prev.mobileNo
        }));
        return;
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('File size must be less than 10MB');
        return;
      }
      setFormData(prev => ({ ...prev, screenshot: file }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.problem || !formData.description) {
      toast.error('Please fill in all required fields (*)');
      return;
    }

    setSubmitting(true);
    const loadingToast = toast.loading('Submitting feedback...');

    try {
      let screenshotUrl = "";

      // 1. Upload screenshot if selected
      if (formData.screenshot) {
        toast.loading('Uploading screenshot...', { id: loadingToast });
        const base64Data = await fileToBase64(formData.screenshot);
        const fileName = `Feedback_${Date.now()}_${formData.screenshot.name.replace(/\s+/g, '_')}`;

        const uploadRes = await fetch("https://script.google.com/macros/s/AKfycbwGN0L4CqcZdhgie3l94KGGjWHqaL_cHRgwtw1CCUZy6yqpF5lFlFNBbO10dEm7BNK6FQ/exec", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            action: "uploadFile",
            base64Data: base64Data,
            fileName: fileName,
            mimeType: formData.screenshot.type,
            folderId: import.meta.env.VITE_GOOGLE_DRIVE_FEEDBACK_FOLDER_ID
          }),
        });

        const uploadResult = await uploadRes.json();
        if (uploadResult.success) {
          screenshotUrl = uploadResult.fileUrl;
        } else {
          toast.error("Screenshot upload failed, submitting without image.");
        }
      }

      toast.loading('Saving details...', { id: loadingToast });

      // 2. Fetch existing data to get Serial Number
      const fetchResponse = await fetch(`${"https://script.google.com/macros/s/AKfycbwGN0L4CqcZdhgie3l94KGGjWHqaL_cHRgwtw1CCUZy6yqpF5lFlFNBbO10dEm7BNK6FQ/exec"}?sheet=Feedback&action=fetch`);
      const result = await fetchResponse.json();
      const existingData = result.success ? (result.data || result) : [];

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
          const snString = (snIdx !== -1 ? row[snIdx] : row[1])?.toString() || "";
          const match = snString.match(/FB-(\d+)/) || snString.match(/(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        });
      }
      const nextSerial = `FB-${String(maxNum + 1).padStart(3, '0')}`;

      // 3. Prepare row data
      const now = new Date();
      const pad = (num) => String(num).padStart(2, '0');
      const timestamp = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      const rowData = [
        timestamp,            // A
        nextSerial,           // B
        formData.name,        // C
        formData.email,       // D
        formData.mobileNo,    // E
        formData.problem,     // F
        formData.description, // G
        screenshotUrl,        // H
        formData.suggestion,  // I
        "",                   // J (Blank as requested)
        ""                    // K (Status, remains null)
      ];

      // 4. Save to sheet
      const insertRes = await fetch("https://script.google.com/macros/s/AKfycbwGN0L4CqcZdhgie3l94KGGjWHqaL_cHRgwtw1CCUZy6yqpF5lFlFNBbO10dEm7BNK6FQ/exec", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          action: "insert",
          sheetName: "Feedback",
          rowData: JSON.stringify(rowData)
        })
      });

      const insertResult = await insertRes.json();

      if (insertResult.success) {
        toast.success('Feedback submitted successfully!', { id: loadingToast });
        setShowForm(false);
        setFormData({
          name: user.Name || '',
          email: user.Email || '',
          mobileNo: user['Mobile No.'] || user.Phone || '',
          problem: '',
          description: '',
          suggestion: '',
          screenshot: null
        });
        if (fileInputRef.current) fileInputRef.current.value = "";
        fetchFeedbackData();
      } else {
        throw new Error(insertResult.error || "Failed to submit feedback");
      }

    } catch (error) {
      console.error('Submission error:', error);
      toast.error(error.message || 'Error submitting feedback', { id: loadingToast });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprovalSubmit = async (e) => {
    e.preventDefault();
    if (!approvalStatus || !selectedFeedback) {
      toast.error('Missing approval data');
      return;
    }
    setApproving(true);
    const loadingToast = toast.loading(`Submitting ${approvalStatus}...`);

    const now = new Date();
    const pad = (num) => String(num).padStart(2, '0');
    const actualTimestamp = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    try {
      // 1. Fetch the full current row data to ensure we don't overwrite other columns
      const fetchResponse = await fetch(`${"https://script.google.com/macros/s/AKfycbwGN0L4CqcZdhgie3l94KGGjWHqaL_cHRgwtw1CCUZy6yqpF5lFlFNBbO10dEm7BNK6FQ/exec"}?sheet=Feedback&action=fetch`);
      const result = await fetchResponse.json();
      const allData = result.data || result;

      // The selectedFeedback.rowIndex is 1-based index
      const rowIndex = selectedFeedback.rowIndex;
      const currentRow = allData[rowIndex - 1]; // 0-based index for the array

      if (!currentRow) {
        throw new Error("Could not find the row to update");
      }

      // 2. Update Column K (index 10) and Column M (index 12)
      // Ensure the row array has enough length
      while (currentRow.length < 13) {
        currentRow.push("");
      }

      currentRow[9] = "";               // Column J (Blank)
      currentRow[10] = actualTimestamp;  // Column K
      currentRow[12] = approvalStatus;   // Column M

      // 3. Send update request using rowIndex
      const res = await fetch("https://script.google.com/macros/s/AKfycbwGN0L4CqcZdhgie3l94KGGjWHqaL_cHRgwtw1CCUZy6yqpF5lFlFNBbO10dEm7BNK6FQ/exec", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          action: "update",
          sheetName: "Feedback",
          rowIndex: rowIndex,
          rowData: JSON.stringify(currentRow)
        })
      });

      const responseText = await res.text();
      let updateResult;
      try {
        updateResult = JSON.parse(responseText);
      } catch (e) {
        // Fallback if success message is not JSON
        updateResult = { success: responseText.toLowerCase().includes('success') || responseText === "" };
      }

      if (updateResult.success || responseText.toLowerCase().includes('success')) {
        toast.success(`Feedback ${approvalStatus} successfully!`, { id: loadingToast });
        setShowApprovalModal(false);
        setApprovalStatus('');
        setSelectedFeedback(null);
        fetchFeedbackData();
      } else {
        throw new Error(updateResult.error || "Failed to update status");
      }
    } catch (error) {
      console.error('Approval error:', error);
      toast.error(error.message || 'Error updating status', { id: loadingToast });
    } finally {
      setApproving(false);
    }
  };

  const filteredData = feedbackData.filter(item => {
    if (activeTab === 'pending') return item.isPending;
    if (activeTab === 'history') return item.isHistory;
    return true;
  });

  return (
    <div className="space-y-6 page-content p-4 md:p-6 pb-24 md:pb-12 h-full">
      {/* Header Container */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <MessageSquare className="text-indigo-600" size={24} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">Feedback / Helpdesk</h1>
            <p className="text-sm text-gray-500">Report an issue or provide suggestions</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchFeedbackData()}
            className="flex items-center justify-center p-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
            title="Refresh"
          >
            <RefreshCcw size={20} className={tableLoading ? 'animate-spin' : ''} />
          </button>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus size={20} />
              <span>Submit Feedback</span>
            </button>
          )}
        </div>
      </div>

      {/* Feedback Submission Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">New Feedback</h2>
              <button 
                onClick={() => setShowForm(false)} 
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  {user.Admin?.toLowerCase() === 'yes' ? (
                    <select
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                    >
                      <option value="">Select Employee</option>
                      {employees.map((emp, i) => (
                        <option key={i} value={emp.name}>{emp.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      name="name"
                      required
                      readOnly
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      placeholder="Your Name"
                    />
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="your.email@example.com"
                  />
                </div>

                {/* Mobile No */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mobile No
                  </label>
                  <input
                    type="tel"
                    name="mobileNo"
                    value={formData.mobileNo}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="10-digit mobile number"
                  />
                </div>

                {/* Problem Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Problem <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="problem"
                    required
                    value={formData.problem}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="">Select an issue</option>
                    {problemOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="description"
                  required
                  rows={3}
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Describe your issue in detail..."
                />
              </div>

              {/* Suggestions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Any suggestions to improve the system?
                </label>
                <textarea
                  name="suggestion"
                  rows={2}
                  value={formData.suggestion}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="We value your input..."
                />
              </div>

              {/* Screenshot Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload Screenshot (Max 10 MB)
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm text-gray-600 transition-colors"
                  >
                    <FileUp size={16} />
                    <span>{formData.screenshot ? 'Change File' : 'Add File'}</span>
                  </button>
                  {formData.screenshot && (
                    <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                      <CheckCircle size={14} />
                      <span className="truncate max-w-[150px]">{formData.screenshot.name}</span>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*,.pdf"
                    className="hidden"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2 text-sm border rounded-lg hover:bg-gray-50 transition-colors text-gray-600"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50`}
                >
                  {submitting ? <RefreshCcw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  {submitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 mt-6">
        <button
          onClick={() => setActiveTab('pending')}
          className={`pb-2 px-4 font-medium text-sm transition-colors relative ${activeTab === 'pending'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          Pending Feedbacks
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-2 px-4 font-medium text-sm transition-colors relative ${activeTab === 'history'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          History
        </button>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800">
            {activeTab === 'pending' ? 'Pending Feedback Requests' : 'Feedback History'}
          </h2>
        </div>

        {tableLoading ? (
          <div className="p-8">
            <LoadingSpinner message="Loading feedbacks..." />
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No feedback found</h3>
            <p className="text-gray-500">
              There are no {activeTab} feedback records yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {user.Admin?.toLowerCase() === 'yes' && activeTab === 'pending' && (
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-center">Action</th>
                  )}
                  {activeTab === 'history' && (
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-center">Status</th>
                  )}
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">ID</th>
                  {user.Admin?.toLowerCase() === 'yes' && (
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                  )}
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Problem</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Attachment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredData.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    {user.Admin?.toLowerCase() === 'yes' && activeTab === 'pending' && (
                      <td className="px-4 py-3 text-sm text-center">
                        <button
                          onClick={() => { setSelectedFeedback(item); setShowApprovalModal(true); }}
                          className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 hover:text-indigo-800 transition-colors font-medium text-xs"
                        >
                          Action
                        </button>
                      </td>
                    )}
                    {activeTab === 'history' && (
                      <td className="px-4 py-3 text-sm text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${item.status.toLowerCase() === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {item.status}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {item.timestamp ? item.timestamp.split(' ')[0] : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {item.serialNo}
                    </td>
                    {user.Admin?.toLowerCase() === 'yes' && (
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {item.name}
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm text-gray-800">
                      <span className="inline-flex px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium border border-blue-100 whitespace-nowrap">
                        {item.problem}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title={item.description}>
                      {item.description}
                    </td>
                    <td className="px-4 py-3 text-sm text-indigo-600 whitespace-nowrap">
                      {item.screenshot ? (
                        <a
                          href={item.screenshot}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline flex items-center gap-1"
                        >
                          <FileUp size={14} /> View
                        </a>
                      ) : (
                        <span className="text-gray-400">None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Approval Modal */}
      {showApprovalModal && selectedFeedback && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Review Feedback</h2>
              <button 
                onClick={() => { setShowApprovalModal(false); setApprovalStatus(''); }} 
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleApprovalSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className="flex gap-2">
                  <span className="font-semibold text-gray-600 min-w-[80px]">ID:</span>
                  <p className="text-gray-900">{selectedFeedback.serialNo}</p>
                </div>
                <div className="flex gap-2">
                  <span className="font-semibold text-gray-600 min-w-[80px]">Name:</span>
                  <p className="text-gray-900">{selectedFeedback.name}</p>
                </div>
                <div className="flex gap-2">
                  <span className="font-semibold text-gray-600 min-w-[80px]">Problem:</span>
                  <p className="text-gray-900">{selectedFeedback.problem}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-gray-600">Description:</span>
                  <p className="text-gray-900 bg-gray-50 p-2 rounded-lg border border-gray-100">{selectedFeedback.description}</p>
                </div>
                {selectedFeedback.suggestion && (
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-gray-600">Suggestion:</span>
                    <p className="text-gray-900 bg-gray-50 p-2 rounded-lg border border-gray-100">{selectedFeedback.suggestion}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={approvalStatus}
                  onChange={(e) => setApprovalStatus(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="">Select Status</option>
                  <option value="Approved">Approved</option>
                  <option value="Reject">Reject</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowApprovalModal(false); setApprovalStatus(''); }}
                  className="px-5 py-2 text-sm border rounded-lg hover:bg-gray-50 transition-colors text-gray-600"
                  disabled={approving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={approving}
                  className="px-5 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {approving ? <RefreshCcw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  {approving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Feedback;
