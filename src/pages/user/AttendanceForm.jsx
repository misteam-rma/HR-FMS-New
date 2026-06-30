import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, MapPin, Clock, CheckCircle2, AlertCircle, Loader2, Send, 
  XCircle, RotateCw, MapPinned, CheckCircle 
} from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const AttendanceForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState({ lat: null, lng: null, name: '' });
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [punchStatus, setPunchStatus] = useState('in');
  const [isPunching, setIsPunching] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [employees, setEmployees] = useState([]);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;
  const isAdmin = user?.Admin?.toLowerCase() === 'yes';

  const [formData, setFormData] = useState({
    code: user?.Code || '',
    name: user?.Name || '',
    department: user?.Department || '',
  });

  const fetchEmployees = async () => {
    try {
      const response = await fetch(
        `${"https://script.google.com/macros/s/AKfycbwGN0L4CqcZdhgie3l94KGGjWHqaL_cHRgwtw1CCUZy6yqpF5lFlFNBbO10dEm7BNK6FQ/exec"}?sheet=JOINING&action=fetch`
      );
      const result = await response.json();
      if (result.success) {
        const rawData = result.data || result;
        if (Array.isArray(rawData)) {
          const employeeData = rawData.slice(6).map(row => ({
            code: row[1] || '',
            name: row[6] || '',
            department: row[20] || ''
          })).filter(emp => emp.code);
          setEmployees(employeeData);
        }
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported by browser");
      return;
    }

    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation(prev => ({ ...prev, lat: latitude, lng: longitude }));
        
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await response.json();
          setLocation(prev => ({ ...prev, name: data.display_name || "Location resolved" }));
        } catch (err) {
          setLocation(prev => ({ ...prev, name: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` }));
        } finally {
          setLoadingLocation(false);
        }
      },
      (error) => {
        setLoadingLocation(false);
        toast.error("Please enable location services");
      },
      { enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    fetchLocation();
    if (isAdmin) {
      fetchEmployees();
    }
  }, []);

  const handleCodeChange = (e) => {
    const code = e.target.value;
    const selectedEmp = employees.find(emp => emp.code === code);
    if (selectedEmp) {
      setFormData({
        code: code,
        name: selectedEmp.name,
        department: selectedEmp.department
      });
    } else {
      setFormData(prev => ({ ...prev, code }));
    }
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

    if (location.lat && location.lng) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
      ctx.font = "bold 14px Outfit, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText(
        `Lat: ${location.lat.toFixed(5)} | Long: ${location.lng.toFixed(5)} | ${new Date().toLocaleString()}`,
        canvas.width / 2,
        canvas.height - 15
      );
    }

    const photoData = canvas.toDataURL('image/jpeg');
    setPhoto(photoData);
    stopCamera();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!location.lat || !location.lng) {
      toast.error("Location data missing");
      return;
    }
    if (!photo) {
      toast.error("Selfie verification required");
      return;
    }

    setIsPunching(true);
    const loadingToast = toast.loading("Verifying identity & logging punch...");

    try {
      // 1. Upload Photo (with fallbacks for robustness)
      const folderIdsToTry = [
        import.meta.env.VITE_GOOGLE_DRIVE_PROFILE_FOLDER_ID,
        import.meta.env.VITE_GOOGLE_DRIVE_PHOTO_FOLDER_ID,
        import.meta.env.VITE_GOOGLE_DRIVE_ENQUIRY_FOLDER_ID
      ].filter(Boolean);

      let uploadResult = { success: false };
      let lastUploadError = null;

      for (const folderId of folderIdsToTry) {
        try {
          const uploadRes = await fetch("https://script.google.com/macros/s/AKfycbwGN0L4CqcZdhgie3l94KGGjWHqaL_cHRgwtw1CCUZy6yqpF5lFlFNBbO10dEm7BNK6FQ/exec", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              action: "uploadFile",
              fileName: `Attendance_${formData.name || 'User'}_${Date.now()}.jpg`,
              mimeType: "image/jpeg",
              base64Data: base64Data,
              folderId: folderId
            }).toString(),
          });
          uploadResult = await uploadRes.json();
          if (uploadResult.success) break;
          lastUploadError = uploadResult.error;
        } catch (err) {
          lastUploadError = err.message;
        }
      }

      if (!uploadResult.success) throw new Error(lastUploadError || "Photo upload failed across all folders");
      const photoUrl = uploadResult.fileUrl;

      // 2. Prepare Data
      const now = new Date();
      const date = now.toLocaleDateString('en-GB'); 
      const time = now.toLocaleTimeString('en-US', { hour12: false });
      const bufferTime = new Date(now.getTime() + 5 * 60000).toLocaleTimeString('en-US', { hour12: false });

      const rowData = [
        isAdmin ? 'Admin' : 'Employee',
        formData.code,
        punchStatus.toLowerCase() === 'in' ? 'Punch In' : 'Punch Out',
        'N/A', // Client Name
        location.lat.toString(),
        location.lng.toString(),
        photoUrl,
        date,
        time,
        formData.department,
        formData.name,
        'Active',
        location.lat.toString(),
        location.lng.toString(),
        now.toLocaleString('en-US', { month: 'long' }), // O
        bufferTime
      ];

      // 3. Submit to Sheet
      const response = await fetch("https://script.google.com/macros/s/AKfycbwGN0L4CqcZdhgie3l94KGGjWHqaL_cHRgwtw1CCUZy6yqpF5lFlFNBbO10dEm7BNK6FQ/exec", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          sheetName: "Attendance",
          action: "insert",
          rowData: JSON.stringify(rowData),
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Punch logged successfully!", { id: loadingToast });
        navigate('/my-attendance');
      } else {
        throw new Error(result.error || "Failed to log punch");
      }
    } catch (error) {
      toast.error(error.message || "Failed to mark attendance", { id: loadingToast });
    } finally {
      setIsPunching(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 font-outfit animate-in fade-in duration-700">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-100">
              <Plus size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-800 uppercase tracking-tight">New Attendance Entry</h2>
          </div>
          <button onClick={() => navigate(-1)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-all">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Employee ID */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Employee ID</label>
              {isAdmin ? (
                <select 
                  value={formData.code}
                  onChange={handleCodeChange}
                  className="h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                  required
                >
                  <option value="">Select Employee ID</option>
                  {employees.map((emp, idx) => (
                    <option key={idx} value={emp.code}>{emp.code}</option>
                  ))}
                </select>
              ) : (
                <input 
                  type="text"
                  value={formData.code}
                  readOnly
                  className="h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 focus:outline-none shadow-sm cursor-not-allowed"
                />
              )}
            </div>

            {/* Punch Status */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Punch Status</label>
              <select 
                value={punchStatus}
                onChange={(e) => setPunchStatus(e.target.value)}
                className="h-11 px-4 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
              >
                <option value="in">PUNCH IN</option>
                <option value="out">PUNCH OUT</option>
              </select>
            </div>

            {/* Employee Name */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Employee Name</label>
              <input 
                type="text"
                value={formData.name}
                readOnly
                className="h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 focus:outline-none shadow-sm cursor-not-allowed"
              />
            </div>

            {/* Department */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Department</label>
              <input 
                type="text"
                value={formData.department}
                readOnly
                className="h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 focus:outline-none shadow-sm cursor-not-allowed"
              />
            </div>
          </div>

          {/* Location Section */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Verification Location</label>
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4 group hover:border-indigo-400 transition-all shadow-sm">
              <div className="flex items-center gap-3">
                <MapPin className="text-indigo-600" size={18} />
                <p className={`text-xs font-medium ${loadingLocation ? 'text-indigo-500 animate-pulse' : 'text-gray-600'}`}>
                  {loadingLocation ? "Tracking satellites..." : (location.name || "Press button to resolve location")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={fetchLocation}
                  disabled={loadingLocation}
                  className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  {loadingLocation ? <RotateCw size={18} className="animate-spin" /> : <MapPinned size={18} />}
                </button>
              </div>
            </div>
          </div>

          {/* Identity Authentication Section */}
          <div className="space-y-4 pt-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Identity Authentication</label>
            <div 
              onClick={!cameraActive && !photo ? startCamera : undefined}
              className={`relative w-full aspect-[4/3] max-w-2xl mx-auto bg-slate-50 border border-gray-200 rounded-2xl overflow-hidden flex flex-col items-center justify-center transition-all ${!cameraActive && !photo ? 'cursor-pointer hover:bg-slate-100 hover:border-indigo-300' : ''}`}
            >
              {cameraActive ? (
                <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" playsInline />
              ) : photo ? (
                <img src={photo} className="w-full h-full object-cover" alt="Captured Authentication" />
              ) : (
                <div className="text-center p-8 space-y-3">
                  <Camera className="text-gray-300 mx-auto" size={48} strokeWidth={1.5} />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Initialization Required</p>
                </div>
              )}
              
              <canvas ref={canvasRef} className="hidden" />

              {/* Status Indicator */}
              {cameraActive && (
                <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 bg-black/50 backdrop-blur-md rounded-full border border-white/20">
                   <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
                   <span className="text-[9px] font-black text-white uppercase tracking-widest">Active Link</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-3">
              {!cameraActive ? (
                <button 
                  type="button"
                  onClick={startCamera}
                  className="px-8 py-3 bg-gray-900 hover:bg-black text-white rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg"
                >
                  <Camera size={14} />
                  <span>Initialize Authentication</span>
                </button>
              ) : (
                <button 
                  type="button"
                  onClick={capturePhoto}
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg"
                >
                  <CheckCircle size={14} />
                  <span>Authenticate & Log</span>
                </button>
              )}
              {photo && !cameraActive && (
                <button 
                  type="button"
                  onClick={() => setPhoto(null)}
                  className="p-3 bg-white border border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-200 rounded-xl transition shadow-sm"
                >
                  <RotateCw size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button 
              type="submit"
              disabled={isPunching}
              className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm uppercase tracking-widest rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 shadow-xl shadow-indigo-100 disabled:opacity-50"
            >
              {isPunching ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Processing Log...</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  <span>Submit Attendance Entry</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Safety Alert */}
      <div className="mt-8 flex items-center gap-4 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
        <AlertCircle size={20} className="text-amber-600 shrink-0" />
        <p className="text-[11px] text-amber-900 font-bold leading-relaxed uppercase tracking-tight">
          Identity verification and geolocation logging are active for this entry.
        </p>
      </div>
    </div>
  );
};

export default AttendanceForm;
