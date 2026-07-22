import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { UserCheck, Upload, CheckCircle2, AlertCircle, FileText, User, CreditCard, Building2, Phone, Calendar, ShieldCheck, Sparkles, Send } from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = "https://script.google.com/macros/s/AKfycbwGN0L4CqcZdhgie3l94KGGjWHqaL_cHRgwtw1CCUZy6yqpF5lFlFNBbO10dEm7BNK6FQ/exec";

const PublicJoiningForm = () => {
  const [searchParams] = useSearchParams();
  const enquiryNoParam = searchParams.get('enquiry') || '';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [candidateData, setCandidateData] = useState(null);
  const [teamHeads, setTeamHeads] = useState([]);
  const [historyData, setHistoryData] = useState([]);

  const [formData, setFormData] = useState({
    nameAsPerAadhar: '',
    fatherHusbandName: '',
    dateOfJoining: '',
    designation: '',
    currentAddress: '',
    dobAsPerAadhar: '',
    gender: '',
    mobileNo: '',
    familyMobileNo: '',
    relationshipWithFamily: '',
    currentBankAc: '',
    ifscCode: '',
    branchName: '',
    personalEmail: '',
    highestQualification: '',
    department: '',
    equipment: '',
    aadharCardNo: '',
    aadharFrontPhoto: null,
    candidatePhoto: null,
    bankPassbookPhoto: null,
    studentIdCardPhoto: null,
    resumeCopyFile: null,
    panCardPhoto: null,
    candidateEnquiryNo: enquiryNoParam,
    indentType: '',
    emergencyContactName: '',
    teamHead: '',
    registrationUnder: '',
    bankName: '',
    reportingTo: '',
  });

  // Fetch Enquiry Data & Master Data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [enquiryResp, masterResp, joiningResp] = await Promise.all([
          fetch(`${API_URL}?sheet=ENQUIRY&action=fetch`),
          fetch(`${API_URL}?sheet=Master&action=fetch`),
          fetch(`${API_URL}?sheet=JOINING&action=fetch`),
        ]);

        const [enquiryRes, masterRes, joiningRes] = await Promise.all([
          enquiryResp.json(),
          masterResp.json(),
          joiningResp.json(),
        ]);

        if (joiningRes.success && joiningRes.data) {
          setHistoryData(joiningRes.data.slice(1));
        }

        if (masterRes.success && masterRes.data) {
          const masterRows = masterRes.data.slice(1);
          const heads = [...new Set(masterRows.map(r => r[3]).filter(Boolean))].sort();
          setTeamHeads(heads);
        }

        if (enquiryRes.success && enquiryRes.data && enquiryRes.data.length > 0) {
          const enquiryRows = enquiryRes.data.slice(6);
          
          let target = null;
          if (enquiryNoParam) {
            target = enquiryRows.find(row => 
              (row[2] || '').toString().trim().toLowerCase() === enquiryNoParam.trim().toLowerCase()
            );
          }

          if (target) {
            setCandidateData({
              id: target[0] || '',
              indentNo: target[1] || '',
              candidateEnquiryNo: target[2] || '',
              indentType: target[3] || '',
              applyingForPost: target[4] || '',
              department: target[5] || '',
              candidateName: target[6] || '',
              candidateDOB: target[7] || '',
              candidatePhone: target[8] || '',
              candidateEmail: target[9] || '',
              previousCompany: target[10] || '',
              jobExperience: target[11] || '',
              previousPosition: target[12] || '',
              reasonOfLeaving: target[13] || '',
              maritalStatus: target[14] || '',
              lastSalaryDrawn: target[15] || '',
              candidatePhoto: target[16] || '',
              gender: target[17] || '',
              presentAddress: target[18] || '',
              aadharNo: target[19] || '',
              candidateResume: target[20] || '',
            });

            setFormData(prev => ({
              ...prev,
              nameAsPerAadhar: target[6] || '',
              candidateEnquiryNo: target[2] || enquiryNoParam,
              indentType: target[3] || '',
              department: target[5] || '',
              designation: target[4] || '',
              mobileNo: target[8] || '',
              personalEmail: target[9] || '',
              dobAsPerAadhar: target[7] || '',
              gender: target[17] || '',
              currentAddress: target[18] || '',
              aadharCardNo: target[19] || '',
            }));
          } else if (enquiryNoParam) {
            toast.error(`Enquiry record "${enquiryNoParam}" not found. Please verify the link.`);
          }
        }
      } catch (err) {
        console.error("Error loading onboarding form data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [enquiryNoParam]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = err => reject(err);
    });
  };

  const uploadFileToDrive = async (file, type, candidateId) => {
    try {
      const base64Data = await fileToBase64(file);
      const folderId = import.meta.env.VITE_GOOGLE_DRIVE_PHOTO_FOLDER_ID || import.meta.env.VITE_GOOGLE_DRIVE_ENQUIRY_FOLDER_ID;

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'uploadFile',
          base64Data: base64Data,
          fileName: `${candidateId}_${type}_${file.name}`,
          mimeType: file.type,
          folderId: folderId
        }),
      });

      const result = await response.json();
      if (result.success) return result.fileUrl;
      throw new Error(result.error || 'Upload failed');
    } catch (err) {
      console.error(`Error uploading ${type}:`, err);
      return '';
    }
  };

  const generateJoiningId = () => {
    const usedIds = historyData.map(item => item[1]).filter(Boolean);
    let maxNum = 0;
    usedIds.forEach(id => {
      const match = String(id).match(/RMA-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `RMA-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!formData.nameAsPerAadhar || !formData.mobileNo || !formData.dateOfJoining) {
      toast.error("Please fill in all mandatory fields (*)");
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading("Submitting your onboarding details...");

    try {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const timestamp = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      
      const joiningId = generateJoiningId();

      // Upload Attached Files
      let aadharPhotoUrl = '';
      let candidatePhotoUrl = candidateData?.candidatePhoto || '';
      let bankPassbookUrl = '';
      let studentIdCardUrl = '';
      let panCardUrl = '';
      let resumeUrl = candidateData?.candidateResume || '';

      if (formData.aadharFrontPhoto) {
        toast.loading("Uploading Aadhar photo...", { id: toastId });
        aadharPhotoUrl = await uploadFileToDrive(formData.aadharFrontPhoto, 'aadhar', joiningId);
      }
      if (formData.candidatePhoto) {
        toast.loading("Uploading candidate photo...", { id: toastId });
        candidatePhotoUrl = await uploadFileToDrive(formData.candidatePhoto, 'photo', joiningId);
      }
      if (formData.bankPassbookPhoto) {
        toast.loading("Uploading bank passbook...", { id: toastId });
        bankPassbookUrl = await uploadFileToDrive(formData.bankPassbookPhoto, 'passbook', joiningId);
      }
      if (formData.studentIdCardPhoto) {
        toast.loading("Uploading student ID card...", { id: toastId });
        studentIdCardUrl = await uploadFileToDrive(formData.studentIdCardPhoto, 'student_id', joiningId);
      }
      if (formData.resumeCopyFile) {
        toast.loading("Uploading resume copy...", { id: toastId });
        resumeUrl = await uploadFileToDrive(formData.resumeCopyFile, 'resume', joiningId);
      }
      if (formData.panCardPhoto) {
        toast.loading("Uploading PAN card...", { id: toastId });
        panCardUrl = await uploadFileToDrive(formData.panCardPhoto, 'pan', joiningId);
      }

      toast.loading("Saving registration details...", { id: toastId });

      // Construct JOINING sheet Row Data (Columns A-AE / indices 0-30)
      const rowData = new Array(31).fill("");
      rowData[0] = timestamp;
      rowData[1] = joiningId;
      rowData[2] = formData.candidateEnquiryNo || candidateData?.candidateEnquiryNo || "";
      rowData[3] = formData.indentType || candidateData?.indentType || "";
      rowData[4] = formData.department || candidateData?.department || "";
      rowData[5] = formData.designation || candidateData?.applyingForPost || "";
      rowData[6] = formData.nameAsPerAadhar || candidateData?.candidateName || "";
      rowData[7] = formData.gender || "";
      rowData[8] = formData.dobAsPerAadhar || candidateData?.candidateDOB || "";
      rowData[9] = formData.mobileNo || candidateData?.candidatePhone || "";
      rowData[10] = formData.personalEmail || candidateData?.candidateEmail || "";
      rowData[11] = formData.emergencyContactName || "";
      rowData[12] = formData.familyMobileNo || "";
      rowData[13] = formData.relationshipWithFamily || "";
      rowData[14] = formData.highestQualification || "";
      rowData[15] = formData.aadharCardNo || candidateData?.aadharNo || "";
      rowData[16] = aadharPhotoUrl || "";
      rowData[17] = formData.currentAddress || candidateData?.presentAddress || "";
      rowData[18] = formData.currentAddress || candidateData?.presentAddress || "";
      rowData[19] = formData.dateOfJoining || "";
      rowData[20] = formData.teamHead || "";
      rowData[21] = formData.registrationUnder || "";
      rowData[22] = formData.bankName || "";
      rowData[23] = formData.currentBankAc || "";
      rowData[24] = formData.ifscCode || "";
      rowData[25] = candidatePhotoUrl || "";
      rowData[26] = bankPassbookUrl || "";
      rowData[27] = panCardUrl || "";
      rowData[28] = studentIdCardUrl || "";
      rowData[29] = resumeUrl || "";
      rowData[30] = formData.reportingTo || "";

      // Submit to JOINING sheet
      const params = new URLSearchParams();
      params.append('sheetName', 'JOINING');
      params.append('action', 'insert');
      params.append('rowData', JSON.stringify(rowData));

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      });

      const resData = await response.json();
      if (!resData.success) throw new Error(resData.error || 'Registration failed');

      // Update Column AC (Actual Joining timestamp) on ENQUIRY sheet
      try {
        const enqFetch = await fetch(`${API_URL}?sheet=ENQUIRY&action=fetch`);
        const enqRes = await enqFetch.json();

        if (enqRes.success && enqRes.data) {
          const rows = enqRes.data;
          let targetIndex = -1;
          const searchEnqNo = (formData.candidateEnquiryNo || candidateData?.candidateEnquiryNo || '').toString().trim().toLowerCase();

          if (searchEnqNo) {
            for (let i = 6; i < rows.length; i++) {
              if ((rows[i][2] || '').toString().trim().toLowerCase() === searchEnqNo) {
                targetIndex = i + 1; // 1-indexed
                break;
              }
            }
          }

          if (targetIndex !== -1) {
            await fetch(API_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                sheetName: 'ENQUIRY',
                action: 'updateCell',
                rowIndex: targetIndex.toString(),
                columnIndex: '29', // Column AC
                value: timestamp,
              })
            });
          }
        }
      } catch (syncErr) {
        console.warn("Silent failure syncing ENQUIRY actual joining date:", syncErr);
      }

      toast.dismiss(toastId);
      toast.success("Registration submitted successfully!");
      setSubmitted(true);

    } catch (err) {
      console.error("Submission error:", err);
      toast.dismiss(toastId);
      toast.error(`Submission failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center space-y-4 border border-slate-100">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <h2 className="text-lg font-bold text-slate-800">Loading Onboarding Form</h2>
          <p className="text-xs text-slate-500">Retrieving candidate registration details...</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center space-y-5 border border-slate-100 animate-in zoom-in duration-300">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 size={36} />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Joining Registered!</h2>
            <p className="text-xs text-slate-500 font-medium">Your onboarding form has been successfully submitted and recorded.</p>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-left space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold">Candidate Name:</span>
              <span className="font-bold text-slate-800">{formData.nameAsPerAadhar}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold">Enquiry No:</span>
              <span className="font-bold text-emerald-600">{formData.candidateEnquiryNo || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold">Designation:</span>
              <span className="font-bold text-slate-800">{formData.designation}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold">Date of Joining:</span>
              <span className="font-bold text-slate-800">{formData.dateOfJoining}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 italic">Thank you! Welcome to the team.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Banner Header */}
        <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200 shrink-0">
              <UserCheck size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Candidate Joining Registration</h1>
              <p className="text-xs text-slate-500 mt-0.5">Please fill out your official onboarding registration details below.</p>
            </div>
          </div>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 border border-slate-100 space-y-8">
          
          {/* Section 1: Candidate Basic Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <User className="text-emerald-500" size={18} />
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">1. Basic & Personal Details</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Full Name (As per Aadhar)*</label>
                <input
                  type="text"
                  name="nameAsPerAadhar"
                  value={formData.nameAsPerAadhar}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Father / Husband Name*</label>
                <input
                  type="text"
                  name="fatherHusbandName"
                  value={formData.fatherHusbandName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Date of Birth</label>
                <input
                  type="date"
                  name="dobAsPerAadhar"
                  value={formData.dobAsPerAadhar}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Gender*</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Mobile Number*</label>
                <input
                  type="tel"
                  name="mobileNo"
                  value={formData.mobileNo}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Personal Email</label>
                <input
                  type="email"
                  name="personalEmail"
                  value={formData.personalEmail}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none lowercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Designation / Post*</label>
                <input
                  type="text"
                  name="designation"
                  value={formData.designation}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Department</label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Date of Joining*</label>
                <input
                  type="date"
                  name="dateOfJoining"
                  value={formData.dateOfJoining}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-emerald-700"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1">Current Address</label>
                <input
                  type="text"
                  name="currentAddress"
                  value={formData.currentAddress}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Highest Qualification</label>
                <input
                  type="text"
                  name="highestQualification"
                  value={formData.highestQualification}
                  onChange={handleInputChange}
                  placeholder="e.g. B.Tech, M.Com, Diploma"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Emergency Contact & Identity */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Phone className="text-emerald-500" size={18} />
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">2. Emergency Contact & Identity</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Emergency Contact Person</label>
                <input
                  type="text"
                  name="emergencyContactName"
                  value={formData.emergencyContactName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Family Emergency Contact No.</label>
                <input
                  type="tel"
                  name="familyMobileNo"
                  value={formData.familyMobileNo}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Relationship</label>
                <input
                  type="text"
                  name="relationshipWithFamily"
                  value={formData.relationshipWithFamily}
                  onChange={handleInputChange}
                  placeholder="e.g. Father, Spouse, Brother"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Aadhar Card Number*</label>
                <input
                  type="text"
                  name="aadharCardNo"
                  value={formData.aadharCardNo}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Team Head / Supervisor</label>
                <select
                  name="teamHead"
                  value={formData.teamHead}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">Select Team Head</option>
                  {teamHeads.map((head, idx) => (
                    <option key={idx} value={head}>{head}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Registration Under</label>
                <input
                  type="text"
                  name="registrationUnder"
                  value={formData.registrationUnder}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Bank Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <CreditCard className="text-emerald-500" size={18} />
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">3. Bank Account Information</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Bank Name</label>
                <input
                  type="text"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleInputChange}
                  placeholder="e.g. HDFC Bank, SBI"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Bank Account Number</label>
                <input
                  type="text"
                  name="currentBankAc"
                  value={formData.currentBankAc}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">IFSC Code</label>
                <input
                  type="text"
                  name="ifscCode"
                  value={formData.ifscCode}
                  onChange={handleInputChange}
                  placeholder="e.g. SBIN0001234"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none font-mono uppercase"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Document Attachments */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Upload className="text-emerald-500" size={18} />
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">4. Document Uploads</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              
              <div className="border border-dashed border-slate-200 rounded-2xl p-3 bg-slate-50/50 hover:bg-slate-50 transition-all">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Passport Size Photo</label>
                <label className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-emerald-500 transition-all">
                  <Upload size={14} className="text-emerald-600 shrink-0" />
                  <span className="text-xs text-slate-600 truncate">{formData.candidatePhoto?.name || 'Choose photo...'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setFormData(prev => ({ ...prev, candidatePhoto: e.target.files[0] }))} />
                </label>
              </div>

              <div className="border border-dashed border-slate-200 rounded-2xl p-3 bg-slate-50/50 hover:bg-slate-50 transition-all">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Aadhar Card Photo</label>
                <label className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-emerald-500 transition-all">
                  <Upload size={14} className="text-emerald-600 shrink-0" />
                  <span className="text-xs text-slate-600 truncate">{formData.aadharFrontPhoto?.name || 'Choose file...'}</span>
                  <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setFormData(prev => ({ ...prev, aadharFrontPhoto: e.target.files[0] }))} />
                </label>
              </div>

              <div className="border border-dashed border-slate-200 rounded-2xl p-3 bg-slate-50/50 hover:bg-slate-50 transition-all">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Bank Passbook / Cheque</label>
                <label className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-emerald-500 transition-all">
                  <Upload size={14} className="text-emerald-600 shrink-0" />
                  <span className="text-xs text-slate-600 truncate">{formData.bankPassbookPhoto?.name || 'Choose file...'}</span>
                  <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setFormData(prev => ({ ...prev, bankPassbookPhoto: e.target.files[0] }))} />
                </label>
              </div>

              <div className="border border-dashed border-slate-200 rounded-2xl p-3 bg-slate-50/50 hover:bg-slate-50 transition-all">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Valid PAN Card Proof</label>
                <label className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-emerald-500 transition-all">
                  <Upload size={14} className="text-emerald-600 shrink-0" />
                  <span className="text-xs text-slate-600 truncate">{formData.panCardPhoto?.name || 'Choose file...'}</span>
                  <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setFormData(prev => ({ ...prev, panCardPhoto: e.target.files[0] }))} />
                </label>
              </div>

              <div className="border border-dashed border-slate-200 rounded-2xl p-3 bg-slate-50/50 hover:bg-slate-50 transition-all">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Student / Article ID Card</label>
                <label className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-emerald-500 transition-all">
                  <Upload size={14} className="text-emerald-600 shrink-0" />
                  <span className="text-xs text-slate-600 truncate">{formData.studentIdCardPhoto?.name || 'Choose file...'}</span>
                  <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setFormData(prev => ({ ...prev, studentIdCardPhoto: e.target.files[0] }))} />
                </label>
              </div>

              <div className="border border-dashed border-slate-200 rounded-2xl p-3 bg-slate-50/50 hover:bg-slate-50 transition-all">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Resume Copy</label>
                <label className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-emerald-500 transition-all">
                  <Upload size={14} className="text-emerald-600 shrink-0" />
                  <span className="text-xs text-slate-600 truncate">{formData.resumeCopyFile?.name || 'Choose file...'}</span>
                  <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => setFormData(prev => ({ ...prev, resumeCopyFile: e.target.files[0] }))} />
                </label>
              </div>

            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-8 py-3 bg-emerald-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-600 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>Submitting Registration...</>
              ) : (
                <>
                  <Send size={14} />
                  Submit Joining Form
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default PublicJoiningForm;
