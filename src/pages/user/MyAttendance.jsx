import { useState, useEffect, useRef } from 'react';
import { 
  Calendar, Clock, CheckCircle, XCircle, MapPin, Plus, X, RefreshCcw, FileText,
  Camera, RotateCw, MapPinned, CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';

const MyAttendance = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [userAttendanceData, setUserAttendanceData] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const rawUser = localStorage.getItem("user");
  const user = rawUser ? JSON.parse(rawUser) : {};

  const [formData, setFormData] = useState({
    code: user.Code || '',
    name: user.Name || '',
    type: user.Type || 'Article',
    department: user.Department || '',
    punchType: 'in',
  });

  const [capturedImage, setCapturedImage] = useState(null);
  const [locationData, setLocationData] = useState({ latitude: '', longitude: '', locationName: '' });
  const [cameraActive, setCameraActive] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [userList, setUserList] = useState([]);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Get user details from localStorage
  const getUserDetails = () => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        return JSON.parse(userData);
      }
      return null;
    } catch (error) {
      console.error('Error parsing user data from localStorage:', error);
      return null;
    }
  };

  const fetchAttendanceData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${"https://script.google.com/macros/s/AKfycbwGN0L4CqcZdhgie3l94KGGjWHqaL_cHRgwtw1CCUZy6yqpF5lFlFNBbO10dEm7BNK6FQ/exec"}?sheet=Attendance&action=fetch`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data');
      }

      const rawData = result.data || result;
      if (!Array.isArray(rawData) || rawData.length < 2) {
        setAttendanceData([]);
        return;
      }

      const user = getUserDetails();
      if (!user) return;

      // Filter rows for current user (Column C is Code, Column E is Name)
      const userRows = rawData.slice(1).filter(row => {
        const rowCode = row[2]?.toString().trim();
        const rowName = row[4]?.toString().trim();
        return (rowCode === user.Code) || (rowName?.toLowerCase() === user.Name?.toLowerCase());
      });

      // Group by Date (Column L / index 11)
      const dailyGroups = {};
      userRows.forEach(row => {
        const date = row[11]?.toString().trim();
        const time = row[12]?.toString().trim();

        if (!date || !time) return;

        if (!dailyGroups[date]) {
          dailyGroups[date] = { date, punches: [] };
        }
        dailyGroups[date].punches.push({ time });
      });

      // Process groups into attendance records
      const processed = Object.values(dailyGroups).map(group => {
        const sortedPunches = group.punches.sort((a, b) => a.time.localeCompare(b.time));
        const checkIn = sortedPunches[0].time;
        const checkOut = sortedPunches.length > 1 ? sortedPunches[sortedPunches.length - 1].time : '-';

        // Extract metadata from the first punch row for this day
        const firstRow = userRows.find(r => r[11]?.toString().trim() === group.date);

        let workingHours = 0;
        if (checkOut !== '-') {
          const [h1, m1, s1] = checkIn.split(':').map(Number);
          const [h2, m2, s2] = checkOut.split(':').map(Number);
          const d1 = new Date(2000, 0, 1, h1, m1, s1 || 0);
          const d2 = new Date(2000, 0, 1, h2, m2, s2 || 0);
          workingHours = (d2 - d1) / (1000 * 60 * 60);
        }

        return {
          'Date': group.date,
          'Check In': checkIn,
          'Check Out': checkOut,
          'Working Hours': workingHours.toFixed(2),
          'Overtime Hours': Math.max(0, workingHours - 8).toFixed(2),
          'Status': 'Present',
          'Dept': firstRow[5],
          'Type': firstRow[3],
          'Location': firstRow[10],
          'Photo': firstRow[7],
          'Link': firstRow[13]
        };
      });

      setAttendanceData(processed);

    } catch (error) {
      console.error('Error fetching attendance:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (attendanceData.length > 0) {
      setUserAttendanceData([...attendanceData].reverse());
    }
  }, [attendanceData]);

  const filteredAttendance = userAttendanceData.filter(record => {
    const dateValue = record.Date || '';
    if (!dateValue) return false;
    try {
      const parts = dateValue.split('/');
      const recordDate = new Date(parts[2], parts[1] - 1, parts[0]);
      return recordDate.getMonth() === selectedMonth && recordDate.getFullYear() === selectedYear;
    } catch (e) { return true; }
  });

  const presentDays = filteredAttendance.filter(record => record.Status === 'Present').length;
  const absentDays = 0;

  const totalWorkingHours = filteredAttendance.reduce((sum, record) => {
    return sum + parseFloat(record['Working Hours'] || 0);
  }, 0);

  const totalOvertime = filteredAttendance.reduce((sum, record) => {
    return sum + parseFloat(record['Overtime Hours'] || 0);
  }, 0);

  const getStatusColor = (status) => {
    if (!status) return 'slate';
    const s = status.toLowerCase();
    if (s.includes('present')) return 'emerald';
    if (s.includes('absent')) return 'rose';
    if (s.includes('late')) return 'amber';
    if (s.includes('holiday')) return 'indigo';
    return 'slate';
  };

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const years = [2024, 2025, 2026];

  useEffect(() => {
    fetchAttendanceData();
    fetchUserList();
  }, []);

  const fetchUserList = async () => {
    try {
      const response = await fetch(`${"https://script.google.com/macros/s/AKfycbwGN0L4CqcZdhgie3l94KGGjWHqaL_cHRgwtw1CCUZy6yqpF5lFlFNBbO10dEm7BNK6FQ/exec"}?sheet=USER&action=fetch`);
      const result = await response.json();
      const rawData = result.data || result;
      if (Array.isArray(rawData) && rawData.length > 0) {
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(rawData.length, 10); i++) {
          const row = rawData[i];
          if (row && row.some(cell => cell && (cell.toString().toLowerCase().includes('code') || cell.toString().toLowerCase().includes('serial')))) {
            headerRowIndex = i;
            break;
          }
        }
        const dataRows = rawData.slice(headerRowIndex + 1);
        const processedUsers = dataRows.map(row => ({
          code: row[6]?.toString().trim() || "",
          name: row[2]?.toString().trim() || "",
          type: row[3]?.toString().trim() || "",
          department: row[10]?.toString().trim() || ""
        })).filter(u => u.code && u.code !== "Code");
        setUserList(processedUsers);
      }
    } catch (err) { console.error("fetchUserList Error:", err); }
  };

  const startCamera = async () => {
    try {
      setCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      toast.error("Unable to access camera");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    if (locationData.latitude && locationData.longitude) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
      ctx.font = "bold 14px Outfit, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText(`Lat: ${parseFloat(locationData.latitude).toFixed(5)} | Long: ${parseFloat(locationData.longitude).toFixed(5)}`, canvas.width / 2, canvas.height - 15);
    }
    setCapturedImage(canvas.toDataURL('image/jpeg'));
    stopCamera();
  };

  const fetchLocation = () => {
    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude.toString();
        const lng = position.coords.longitude.toString();
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          setLocationData({ latitude: lat, longitude: lng, locationName: data.display_name || `${lat}, ${lng}` });
          toast.success("Location identified!");
        } catch (e) {
          setLocationData({ latitude: lat, longitude: lng, locationName: `${lat}, ${lng}` });
        } finally { setLoadingLocation(false); }
      },
      (err) => { toast.error("Location access denied"); setLoadingLocation(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (name === 'code') {
      const employee = userList.find(u => u.code === value);
      if (employee) {
        setFormData(prev => ({ ...prev, code: value, name: employee.name, type: employee.type || 'Article', department: employee.department }));
        toast.success(`Identified: ${employee.name}`);
      } else {
        setFormData(prev => ({ ...prev, code: value, name: '', type: 'Article', department: '' }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.code || !formData.name) return toast.error("Please select valid employee code");

    setSubmitting(true);
    const loadingToast = toast.loading('Syncing and submitting attendance...');

    try {
      // 1. Fetch fresh data for validation and serial calculation
      const fetchRes = await fetch(`${"https://script.google.com/macros/s/AKfycbwGN0L4CqcZdhgie3l94KGGjWHqaL_cHRgwtw1CCUZy6yqpF5lFlFNBbO10dEm7BNK6FQ/exec"}?sheet=Attendance&action=fetch`);
      const fetchResult = await fetchRes.json();
      const existingData = fetchResult.success ? (fetchResult.data || fetchResult) : [];

      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const dateStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
      const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      // Find if there's an active session for today in fresh data
      const userTodayRows = existingData.slice(1).filter(row => {
        return row[2]?.toString().trim() === formData.code && row[11]?.toString().trim() === dateStr;
      });

      const hasIn = userTodayRows.some(row => {
        const val = row[6]?.toString().trim().toUpperCase();
        return val === 'IN' || val === 'PUNCH IN';
      });
      const hasOut = userTodayRows.some(row => {
        const val = row[6]?.toString().trim().toUpperCase();
        return val === 'OUT' || val === 'PUNCH OUT';
      });

      if (formData.punchType === 'out') {
        if (!hasIn) {
          setSubmitting(false);
          return toast.error("Access Denied: You must PUNCH IN first for today.", { id: loadingToast });
        }
        if (hasOut) {
          setSubmitting(false);
          return toast.error("Already Punched Out: Your daily shift log is already complete.", { id: loadingToast });
        }
      } else if (formData.punchType === 'in') {
        if (hasIn) {
          if (!hasOut) {
            setSubmitting(false);
            return toast.error("Active Session: You are already Punched In. Please Punch Out first.", { id: loadingToast });
          } else {
            setSubmitting(false);
            return toast.error("Shift Completed: You have already Punched In and Out for today.", { id: loadingToast });
          }
        }
      }

      if (!capturedImage) {
        setSubmitting(false);
        return toast.error("Selfie is mandatory", { id: loadingToast });
      }
      if (!locationData.latitude) {
        setSubmitting(false);
        return toast.error("Location is mandatory", { id: loadingToast });
      }

      // 2. Upload image
      const folderId = formData.punchType === 'in' 
        ? import.meta.env.VITE_GOOGLE_DRIVE_ATTENDANCE_IN_FOLDER_ID 
        : import.meta.env.VITE_GOOGLE_DRIVE_ATTENDANCE_OUT_FOLDER_ID;

      const uploadRes = await fetch("https://script.google.com/macros/s/AKfycbwGN0L4CqcZdhgie3l94KGGjWHqaL_cHRgwtw1CCUZy6yqpF5lFlFNBbO10dEm7BNK6FQ/exec", {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'uploadFile',
          base64Data: capturedImage,
          fileName: `Attendance_${formData.code}_${formData.punchType.toUpperCase()}_${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
          folderId: folderId || ""
        })
      });
      const uploadResult = await uploadRes.json();
      if (!uploadResult.success) throw new Error(uploadResult.error || "Image upload failed");

      const fileId = uploadResult.fileUrl.split('id=')[1];
      const imageUrl = fileId ? `https://drive.google.com/file/d/${fileId}/view?usp=sharing` : uploadResult.fileUrl;

      // 3. (Optional: Update logic removed per user request)

      let maxSerial = 0;
      if (Array.isArray(existingData) && existingData.length > 1) {
        existingData.slice(1).forEach(row => {
          const sn = parseInt(row[1]);
          if (!isNaN(sn) && sn > maxSerial) maxSerial = sn;
        });
      }
      const nextSerial = maxSerial + 1;

      // 4. Insert Row
      const timestamp = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()} ${now.getHours()}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      const rowData = [
        timestamp,
        nextSerial,
        formData.code,
        formData.type || 'Article',
        formData.name,
        formData.department,
        formData.punchType.toLowerCase() === 'in' ? 'Punch In' : 'Punch Out',
        imageUrl,
        locationData.latitude,
        locationData.longitude,
        locationData.locationName,
        dateStr,
        timeStr,
        `https://www.google.com/maps?q=${locationData.latitude},${locationData.longitude}`,
        now.toLocaleString('en-US', { month: 'long' })
      ];

      const res = await fetch("https://script.google.com/macros/s/AKfycbwGN0L4CqcZdhgie3l94KGGjWHqaL_cHRgwtw1CCUZy6yqpF5lFlFNBbO10dEm7BNK6FQ/exec", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ action: "insert", sheetName: "Attendance", rowData: JSON.stringify(rowData) })
      });
      const result = await res.json();

      if (result.success) {
        toast.success(`Punched ${formData.punchType.toUpperCase()} successfully!`, { id: loadingToast });
        setShowForm(false);
        setCapturedImage(null);
        setLocationData({ latitude: '', longitude: '', locationName: '' });
        setFormData({ 
          code: user.Code || '',
          name: user.Name || '',
          type: user.Type || 'Article',
          department: user.Department || '',
          punchType: 'in' 
        });
        fetchAttendanceData();
      } else { throw new Error(result.error || 'Punch failed'); }
    } catch (error) { toast.error(error.message || 'Submission failed', { id: loadingToast });
    } finally { setSubmitting(false); }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-10">

      {/* Header Container - NOC Style */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Calendar size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Attendance</h1>
            <p className="text-sm text-gray-500">Track your presence and work duration logs</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 mr-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm"
            >
              {months.map((month, index) => (
                <option key={index} value={index}>{month}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <button onClick={fetchAttendanceData} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">
            <RefreshCcw size={15} /> <span className="hidden sm:inline">Refresh</span>
          </button>
          <button onClick={() => { setShowForm(true); fetchLocation(); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
            <MapPin size={16} /> <span className="hidden sm:inline">Attendance</span><span className="sm:hidden">Punch</span>
          </button>
        </div>
      </div>

      {/* Stats Grid - Reduced Size */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total Logs', value: filteredAttendance.length, icon: Calendar, color: 'indigo' },
          { label: 'Present', value: presentDays, icon: CheckCircle, color: 'emerald' },
          { label: 'Absent', value: absentDays, icon: XCircle, color: 'rose' },
          { label: 'Hrs Worked', value: totalWorkingHours.toFixed(1), icon: Clock, color: 'blue' },
          { label: 'Overtime', value: totalOvertime.toFixed(1), icon: Clock, color: 'amber' }
        ].map((stat, idx) => {
          const Icon = stat.icon;
          const colorMap = {
            indigo: 'bg-indigo-50 text-indigo-600',
            emerald: 'bg-emerald-50 text-emerald-600',
            rose: 'bg-rose-50 text-rose-600',
            blue: 'bg-blue-50 text-blue-600',
            amber: 'bg-amber-50 text-amber-600'
          };
          return (
            <div key={idx} className="bg-white p-3 md:p-4 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorMap[stat.color] || 'bg-gray-50 text-gray-600'}`}>
                <Icon size={16} />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{stat.label}</p>
                <p className="text-lg font-bold text-gray-900 leading-none">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Attendance Form Modal - Synced with Leave Request Style */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl animate-in zoom-in duration-300 overflow-hidden border border-gray-200 flex flex-col max-h-[95vh]">
            
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                  <Plus size={16} />
                </div>
                <h3 className="text-base font-bold text-gray-900 tracking-tight uppercase">New Attendance Entry</h3>
              </div>
              <button onClick={() => { stopCamera(); setShowForm(false); setCapturedImage(null); }} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Employee ID</label>
                  <input type="text" name="code" value={formData.code} readOnly className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded text-[13px] font-medium outline-none cursor-not-allowed shadow-sm" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Punch Status</label>
                  <select name="punchType" value={formData.punchType} onChange={handleFormChange}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded text-[13px] font-medium outline-none focus:ring-1 focus:ring-indigo-500 transition shadow-sm">
                    <option value="in">PUNCH IN</option>
                    <option value="out">PUNCH OUT</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Employee Name</label>
                  <input type="text" value={formData.name} readOnly className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded text-[13px] font-medium outline-none cursor-not-allowed shadow-sm" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Department</label>
                  <input type="text" value={formData.department} readOnly className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded text-[13px] font-medium outline-none cursor-not-allowed shadow-sm" />
                </div>
              </div>

              {/* Location Module - Clean Style */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Verification Location</label>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="text-indigo-600" size={18} />
                    <p className="text-[11px] font-medium text-gray-600 line-clamp-1">
                      {loadingLocation ? "Locating..." : (locationData.locationName || "Identify location...")}
                    </p>
                  </div>
                  <button type="button" onClick={fetchLocation} disabled={loadingLocation} className="text-indigo-600 hover:text-indigo-800 transition-colors">
                    {loadingLocation ? <RotateCw size={16} className="animate-spin" /> : <MapPinned size={16} />}
                  </button>
                </div>
              </div>

              {/* Camera Module - Clean Style */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Identity Authentication</label>
                <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center">
                  {cameraActive ? (
                    <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" playsInline />
                  ) : capturedImage ? (
                    <img src={capturedImage} className="w-full h-full object-cover" alt="Identity" />
                  ) : (
                    <div className="text-center p-4">
                      <Camera className="text-gray-300 mx-auto mb-2" size={32} />
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Initialization Required</p>
                    </div>
                  )}
                  <canvas ref={canvasRef} className="hidden" />
                </div>

                <div className="flex gap-2 pt-2">
                  {!cameraActive ? (
                    <button type="button" onClick={startCamera}
                      className="px-4 py-2 bg-gray-800 text-white rounded text-[10px] font-bold uppercase tracking-widest hover:bg-gray-900 transition-all active:scale-95">
                      Open Camera
                    </button>
                  ) : (
                    <button type="button" onClick={capturePhoto}
                      className="px-4 py-2 bg-indigo-600 text-white rounded text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95">
                      Capture Selfie
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-50">
                <button type="button" onClick={() => { stopCamera(); setShowForm(false); setCapturedImage(null); }} className="px-5 py-2 text-[11px] font-bold text-gray-500 hover:bg-gray-100 rounded transition-all uppercase tracking-widest">Cancel</button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-2 bg-slate-900 text-white text-[11px] font-bold rounded hover:bg-slate-800 shadow-md shadow-slate-100 transition-all uppercase tracking-widest active:scale-95 disabled:opacity-50"
                >
                  {submitting ? "Processing..." : "Register Attendance"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unified Table Container - NOC Style */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[400px]">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Attendance Logs</h2>
          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-widest">Real-time Sync</span>
        </div>

        {loading ? (
          <div className="p-12 flex items-center justify-center min-h-[300px]">
            <LoadingSpinner message="Syncing records..." />
          </div>
        ) : error ? (
          <div className="p-12 text-center min-h-[300px] flex flex-col justify-center items-center">
            <p className="text-rose-500 text-sm font-bold mb-3">{error}</p>
            <button onClick={fetchAttendanceData} className="px-5 py-2.5 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-100 transition-colors uppercase tracking-widest shadow-sm">Retry Request</button>
          </div>
        ) : (
          <div className="overflow-x-auto min-h-[400px] max-h-[calc(100vh-350px)] overflow-y-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">Date</th>
                  <th className="px-4 py-4 text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">Type</th>
                  <th className="px-4 py-4 text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">Dept</th>
                  <th className="px-4 py-4 text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">Punch In</th>
                  <th className="px-4 py-4 text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">Punch Out</th>
                  <th className="px-4 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">Location</th>
                  <th className="px-4 py-4 text-right text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredAttendance.length > 0 ? filteredAttendance.map((record, index) => {
                  const color = getStatusColor(record.Status);
                  return (
                    <tr key={index} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <p className="text-sm font-bold text-gray-800">{record.Date || '-'}</p>
                        <span className={`mt-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tighter bg-${color}-100 text-${color}-700 inline-block`}>
                          {record.Status}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">{record.Type || 'NA'}</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <span className="text-[11px] font-bold text-gray-400 uppercase">{record.Dept || 'NA'}</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <span className="text-xs font-bold text-gray-700 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 inline-block min-w-[75px]">
                          {record['Check In'] || '--:--'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <span className="text-xs font-bold text-gray-700 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 inline-block min-w-[75px]">
                          {record['Check Out'] || '--:--'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 max-w-[200px]">
                          <p className="text-[11px] font-bold text-gray-600 line-clamp-1 truncate">{record.Location || 'NA'}</p>
                          {record.Link && (
                            <a
                              href={record.Link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                            >
                              <MapPin size={10} /> View Map
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        <div className="flex flex-col items-end gap-2">
                          <span className="px-3 py-1.5 bg-gray-100 rounded-full text-[10px] font-bold text-gray-600 uppercase tracking-widest leading-none">
                            {record['Working Hours'] || '0.0'} HRS
                          </span>
                          {record.Photo && (
                            <button
                              onClick={() => window.open(record.Photo, '_blank')}
                              className="px-4 py-1.5 bg-indigo-600 text-white rounded text-[10px] font-bold hover:bg-indigo-700 transition-colors uppercase tracking-widest shadow-sm active:scale-95"
                            >Selfie</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan="7" className="px-6 py-20 text-center text-slate-400 text-sm font-bold">No records found for this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyAttendance;