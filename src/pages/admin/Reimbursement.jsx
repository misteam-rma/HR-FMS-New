import React, { useState, useEffect } from "react";
import {
  Search, Calendar, Filter, Clock, CheckCircle2,
  XCircle, ChevronRight, History, Download, MapPin,
  Plus, Trash2, FileText, ChevronDown, Check,
  IndianRupee, Car, MapPinned, Info
} from "lucide-react";
import LoadingSpinner from "../../components/LoadingSpinner";
import toast from "react-hot-toast";

const Reimbursement = () => {
  const [reimbursementData, setReimbursementData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [tableLoading, setTableLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [articleList, setArticleList] = useState([]);

  // Form States
  const [formData, setFormData] = useState({
    billMonth: new Date().toISOString().substring(0, 7), // YYYY-MM
    articleCode: '',
    articleName: '',
    vehicleType: '2 Wheeler',
    ratePerKm: '3.5',
    visits: [{ date: new Date().toISOString().split('T')[0], place: '', km: '' }],
    notes: ''
  });

  const vehicleOptions = [
    { label: '2 Wheeler', rate: '3.5' },
    { label: '4 Wheeler', rate: '10' }
  ];

  const [placeOptions, setPlaceOptions] = useState([]);

  useEffect(() => {
    fetchReimbursementLogs();
    fetchArticleList();
  }, []);

  const fetchArticleList = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=Master&action=fetch`);
      const result = await response.json();
      const rawData = result.data || result;

      if (Array.isArray(rawData) && rawData.length > 0) {
        const combinedArticles = [];
        const combinedPlaces = [];

        // Skip header row
        rawData.slice(1).forEach(row => {
          // Fetch only from Column L (index 11) for Code and Column K (index 10) for Name
          const code = row[11]?.toString().trim();
          const name = row[10]?.toString().trim();
          if (code) {
            combinedArticles.push({ code, name: name || code });
          }

          // Places logic: Column G (6) for Name, Column H (7) for KM
          const placeName = row[6]?.toString().trim();
          const placeKm = row[7]?.toString().trim();
          if (placeName) {
            combinedPlaces.push({ label: placeName, km: placeKm || '0' });
          }
        });

        // Filter for unique codes
        const uniqueArticles = combinedArticles.filter((v, i, a) => a.findIndex(t => t.code === v.code) === i);
        setArticleList(uniqueArticles);

        // Filter unique places
        const uniquePlaces = combinedPlaces.filter((v, i, a) => a.findIndex(t => t.label === v.label) === i);
        setPlaceOptions(uniquePlaces);
      }
    } catch (err) {
      console.error("fetchArticleList Error:", err);
    }
  };

  const [tableHeaders, setTableHeaders] = useState([]);

  const fetchReimbursementLogs = async () => {
    setTableLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=Reimbursment&action=fetch`);
      const result = await response.json();
      const rawData = result.data || result;

      if (Array.isArray(rawData) && rawData.length > 5) {
        // Headers are in row 6 (index 5)
        const allHeaders = rawData[5].map(h => h?.toString().trim() || '');
        const totalPriceIdx = allHeaders.findIndex(h => h === 'Total Price');
        const headers = totalPriceIdx !== -1 ? allHeaders.slice(0, totalPriceIdx + 1) : allHeaders;

        setTableHeaders(headers.filter(h => h));

        // Data starts from row 7 (index 6)
        const dataRows = rawData.slice(6);

        const processed = dataRows.map((row, idx) => {
          const obj = { id: idx, _raw: row };
          headers.forEach((h, i) => {
            if (h) obj[h] = row[i]?.toString().trim() || '';
          });
          return obj;
        });
        setReimbursementData(processed);
      }
    } catch (err) {
      console.error("fetchReimbursementLogs Error:", err);
    } finally {
      setTableLoading(false);
    }
  };

  const handleArticleCodeChange = (e) => {
    const code = e.target.value;
    const article = articleList.find(a => a.code === code);
    setFormData({
      ...formData,
      articleCode: code,
      articleName: article ? article.name : ''
    });
  };

  const handleVehicleChange = (e) => {
    const type = e.target.value;
    const option = vehicleOptions.find(o => o.label === type);
    setFormData({
      ...formData,
      vehicleType: type,
      ratePerKm: option ? option.rate : formData.ratePerKm
    });
  };

  const addVisit = () => {
    setFormData({
      ...formData,
      visits: [...formData.visits, { date: new Date().toISOString().split('T')[0], place: '', km: '' }]
    });
  };

  const removeVisit = (index) => {
    if (formData.visits.length === 1) return;
    const newVisits = formData.visits.filter((_, i) => i !== index);
    setFormData({ ...formData, visits: newVisits });
  };

  const updateVisit = (index, field, value) => {
    const newVisits = [...formData.visits];
    newVisits[index][field] = value;

    // Auto-fill KM if place is selected
    if (field === 'place') {
      const place = placeOptions.find(p => p.label === value);
      if (place) {
        newVisits[index]['km'] = place.km;
      }
    }

    setFormData({ ...formData, visits: newVisits });
  };

  const calculateTotalKm = () => {
    return formData.visits.reduce((sum, v) => sum + (parseFloat(v.km) || 0), 0);
  };

  const calculateTotalAmount = () => {
    return calculateTotalKm() * (parseFloat(formData.ratePerKm) || 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.articleCode) return toast.error("Please select Article Code");

    setIsSubmitting(true);
    try {
      // 1. Fetch current Reimbursement sheet to generate Serial No
      const fetchResponse = await fetch(`${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=Reimbursment&action=fetch`);
      const fetchResult = await fetchResponse.json();
      const existingData = fetchResult.success ? (fetchResult.data || fetchResult) : [];

      let maxSerialNum = 0;
      if (Array.isArray(existingData) && existingData.length > 1) {
        const rows = existingData.slice(6);
        rows.forEach(row => {
          const snString = row[1]?.toString() || '';
          const match = snString.match(/R-(\d+)/) || snString.match(/(\d+)/);
          if (match) {
            const sn = parseInt(match[1]);
            if (!isNaN(sn) && sn > maxSerialNum) maxSerialNum = sn;
          }
        });
      }

      const userStr = localStorage.getItem('user');
      const currentUser = userStr ? JSON.parse(userStr) : {};
      const article = articleList.find(a => a.code === formData.articleCode);
      const empType = article?.type || 'Field Staff';
      const now = new Date();
      const timestamp = now.toLocaleString();
      const rateNum = parseFloat(formData.ratePerKm) || 0;

      // Submit each visit as a separate row
      for (let i = 0; i < formData.visits.length; i++) {
        const visit = formData.visits[i];
        const nextSerialNum = maxSerialNum + 1 + i;
        const formattedSerial = `R-${String(nextSerialNum).padStart(3, '0')}`;
        const visitKm = parseFloat(visit.km) || 0;
        const visitAmount = visitKm * rateNum;

        const rowData = [
          timestamp,              // A: Timestamp
          formattedSerial,        // B: Serial No
          formData.billMonth,     // C: Form Date
          empType,                // D: Employee Type
          currentUser.Code || '', // E: Employee Code
          currentUser.Name || '', // F: Employee Name
          formData.vehicleType,   // G: Vehical Type
          formData.ratePerKm,     // H: Rate Per KM
          visit.place,            // I: Visit Address (Individual)
          visit.date,             // J: Visit Date (Individual)
          formData.articleCode,   // K: Senior Code
          formData.articleName,   // L: Senior Name
          formData.notes,         // M: Note
          visitKm,                // N: Total KM (Individual)
          visitAmount,            // O: Total Price (Individual)
          '',                     // P: Planned
          '',                     // Q: Actual
          '',                     // R: Delays
          'Pending',              // S: Status
          ''                      // T: Remarks
        ];

        const response = await fetch(import.meta.env.VITE_APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            action: 'insert',
            sheetName: 'Reimbursment',
            rowData: JSON.stringify(rowData)
          })
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error || "Failed to insert row " + (i + 1));
      }

      toast.success("Reimbursement claim submitted successfully!");
      setIsModalOpen(false);
      fetchReimbursementLogs();
      setFormData({
        billMonth: new Date().toISOString().substring(0, 7),
        articleCode: '',
        articleName: '',
        vehicleType: '2 Wheeler',
        ratePerKm: '3.5',
        visits: [{ date: new Date().toISOString().split('T')[0], place: '', km: '' }],
        notes: ''
      });
    } catch (err) {
      toast.error("Submission failed: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredData = reimbursementData.filter(item => {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : {};
    const isAdmin = user?.Admin?.toLowerCase() === 'yes';
    
    const name = item['Employee Name'] || '';
    const code = item['Employee Code'] || '';

    // First, filter by role if not admin
    if (!isAdmin && code !== user.Code) {
      return false;
    }

    const matchesSearch = !searchTerm ||
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      code.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const currentItems = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="max-w-full mx-auto px-1 sm:px-2 lg:px-4 py-4 space-y-4 md:space-y-6 pb-20 md:pb-8 font-outfit">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-gray-800">Reimbursement Logs</h1>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search claims..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full text-[13px] shadow-sm bg-white"
            />
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 h-8 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-bold uppercase tracking-wider shadow-sm transition-all active:scale-95"
          >
            <Plus size={14} />
            <span>New Claim</span>
          </button>
        </div>
      </div>

      {/* Table Area */}
      <div className="overflow-hidden border border-gray-200 rounded-lg bg-white min-h-[530px] flex flex-col">
        {tableLoading ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <LoadingSpinner message="Loading claims..." />
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border-collapse">
                <thead className="bg-gray-50">
                  <tr>
                    {tableHeaders.map((header, idx) => (
                      <th key={idx} className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider border-x border-gray-100 whitespace-nowrap">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan={tableHeaders.length || 6} className="px-6 py-24 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">No records found</td>
                    </tr>
                  ) : (
                    currentItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                        {tableHeaders.map((header, idx) => {
                          const val = item[header];
                          const isStatus = header.toLowerCase().includes('status');
                          const isAmount = header.toLowerCase().includes('price') || header.toLowerCase().includes('amount');

                          return (
                            <td key={idx} className="px-4 py-3 whitespace-nowrap text-center text-[12px] text-gray-600 border-x border-gray-50">
                              {isStatus ? (
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${val === 'Approved' ? 'bg-green-100 text-green-700' : (val === 'Pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700')}`}>
                                  {val || 'Pending'}
                                </span>
                              ) : isAmount ? (
                                <span className="font-bold text-indigo-600">₹{parseFloat(val || 0).toLocaleString()}</span>
                              ) : (
                                val || '-'
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination placeholder */}
            <div className="px-4 py-3 bg-white border-t border-gray-200 flex items-center justify-between">
              <p className="text-[13px] text-gray-600 font-medium">Page {currentPage} of {Math.max(1, totalPages)}</p>
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} className="p-1 border rounded hover:bg-gray-50 disabled:opacity-50"><ChevronRight size={16} className="rotate-180" /></button>
                <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} className="p-1 border rounded hover:bg-gray-50 disabled:opacity-50"><ChevronRight size={16} /></button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal - Design parity with provided image */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-gray-900/80 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto flex flex-col p-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-black text-gray-800 uppercase tracking-tight">Claim Reimbursement</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"><XCircle size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Bill Month */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Bill Month</label>
                <div className="relative">
                  <input
                    type="month"
                    value={formData.billMonth}
                    onChange={(e) => setFormData({ ...formData, billMonth: e.target.value })}
                    className="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Article Code */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Article Code</label>
                <select
                  value={formData.articleCode}
                  onChange={handleArticleCodeChange}
                  className="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                >
                  <option value="">Select code</option>
                  {articleList.map(a => <option key={a.code} value={a.code}>{a.code}</option>)}
                </select>
              </div>

              {/* Article Name */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Article Name</label>
                <input
                  type="text"
                  value={formData.articleName}
                  readOnly
                  className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-[13px] font-medium text-gray-500 outline-none"
                />
              </div>

              {/* Vehicle Type */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Vehicle Type</label>
                <select
                  value={formData.vehicleType}
                  onChange={handleVehicleChange}
                  className="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  {vehicleOptions.map(o => <option key={o.label} value={o.label}>{o.label}</option>)}
                </select>
              </div>

              {/* Rate */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Rate per KM</label>
                <input
                  type="number"
                  value={formData.ratePerKm}
                  onChange={(e) => setFormData({ ...formData, ratePerKm: e.target.value })}
                  className="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Visits Section */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center justify-between">
                  Visits (Add as needed)
                  <Plus size={12} className="text-indigo-600 cursor-pointer" onClick={addVisit} />
                </label>

                {formData.visits.map((visit, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-xl border border-dashed border-gray-200 space-y-2 relative">
                    {index > 0 && (
                      <button onClick={() => removeVisit(index)} className="absolute -top-1 -right-1 p-1 bg-white border border-gray-200 text-rose-500 rounded-full shadow-sm">
                        <XCircle size={14} />
                      </button>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={visit.date}
                        onChange={(e) => updateVisit(index, 'date', e.target.value)}
                        className="flex-1 h-9 px-2 bg-white border border-gray-200 rounded text-[11px] outline-none"
                      />
                      <select
                        value={visit.place}
                        onChange={(e) => updateVisit(index, 'place', e.target.value)}
                        className="flex-1 h-9 px-2 bg-white border border-gray-200 rounded text-[11px] outline-none"
                      >
                        <option value="">Select place</option>
                        {placeOptions.map((p, idx) => <option key={idx} value={p.label}>{p.label}</option>)}
                      </select>
                    </div>
                    <input
                      type="number"
                      placeholder="KM"
                      value={visit.km}
                      onChange={(e) => updateVisit(index, 'km', e.target.value)}
                      className="w-full h-9 px-2 bg-white border border-gray-200 rounded text-[11px] outline-none"
                    />
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addVisit}
                className="w-full py-2 border border-dashed border-gray-300 rounded-xl text-[11px] font-bold text-gray-400 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={12} />
                Add Visit
              </button>

              {/* Notes */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Notes</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes..."
                  className="w-full p-3 bg-white border border-gray-200 rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Totals Box */}
              <div className="bg-indigo-50 p-4 rounded-xl border border-dashed border-indigo-200 flex justify-between items-center">
                <div className="text-[13px] font-bold text-indigo-900">Total KM: {calculateTotalKm()}</div>
                <div className="text-sm font-black text-indigo-950">₹ {calculateTotalAmount().toLocaleString()}</div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[13px] font-black uppercase tracking-widest shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Claim'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reimbursement;
