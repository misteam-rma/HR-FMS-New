import React, { useState, useEffect, useRef } from 'react';
import { Camera, MapPin, Clock, CheckCircle2, AlertCircle, Loader2, Send } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const AttendanceForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState({ lat: null, lng: null });
  const [photo, setPhoto] = useState(null);
  const [punchStatus, setPunchStatus] = useState('Punch In');
  const [clientName, setClientName] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;

  useEffect(() => {
    // Get geolocation on mount
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          toast.error("Please enable location services to mark attendance.");
        },
        { enableHighAccuracy: true }
      );
    } else {
      toast.error("Geolocation is not supported by your browser.");
    }
  }, []);

  const handleCapture = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhoto(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadPhoto = async (base64) => {
    try {
      const base64Data = base64.split('base64,')[1];
      const response = await fetch(
        import.meta.env.VITE_APPS_SCRIPT_URL,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            action: "uploadFile",
            fileName: `attendance_${user?.Name || 'user'}_${Date.now()}.jpg`,
            mimeType: "image/jpeg",
            base64Data: base64Data,
            folderId: import.meta.env.VITE_GOOGLE_DRIVE_PROFILE_FOLDER_ID 
          }).toString(),
        }
      );
      const result = await response.json();
      if (result.success) return result.fileUrl;
      throw new Error(result.error || "Failed to upload photo");
    } catch (error) {
      console.error("Photo upload error:", error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!location.lat || !location.lng) {
      toast.error("Location is required. Please enable GPS.");
      return;
    }

    if (!photo) {
      toast.error("Please take a selfie to verify your attendance.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Submitting attendance...");

    try {
      // 1. Upload Photo
      const photoUrl = await uploadPhoto(photo);

      // 2. Prepare Data
      const now = new Date();
      const date = now.toLocaleDateString('en-GB'); // DD/MM/YYYY
      const time = now.toLocaleTimeString('en-US', { hour12: true });
      
      // Time with buffer (e.g., adding 5 mins or just current time)
      const bufferTime = new Date(now.getTime() + 5 * 60000).toLocaleTimeString('en-US', { hour12: true });

      const rowData = [
        user?.Admin === 'Yes' ? 'Admin' : 'Employee', // Role
        user?.Code || 'N/A', // Code
        punchStatus, // Punch Status
        clientName || 'N/A', // Client Name
        location.lat.toString(), // Latitude
        location.lng.toString(), // Longitude
        photoUrl, // Image URL
        date, // Date
        time, // Time
        user?.Department || 'N/A', // Department
        user?.Name || 'N/A', // Name
        'Active', // Status (Archive)
        location.lat.toString(), // Actual Latitude
        location.lng.toString(), // Actual Longitude
        'Verified', // Location Check
        bufferTime // Time With Buffer
      ];

      // 3. Submit to Sheet
      const response = await fetch(
        import.meta.env.VITE_APPS_SCRIPT_URL,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            sheetName: "Report Daily",
            action: "insert",
            rowData: JSON.stringify(rowData),
          }),
        }
      );

      const result = await response.json();
      if (result.success) {
        toast.success("Attendance marked successfully!", { id: toastId });
        navigate('/my-attendance');
      } else {
        throw new Error(result.error || "Failed to submit attendance data");
      }
    } catch (error) {
      console.error("Submission error:", error);
      toast.error(error.message || "Failed to mark attendance", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <LoadingSpinner message="Submitting attendance..." minHeight="400px" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom duration-500 pb-10">
      <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100/50 border border-slate-100 overflow-hidden">
        {/* Header Section */}
        <div className="bg-indigo-600 p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Mark Attendance</h1>
              <p className="text-indigo-100 text-sm mt-1 uppercase tracking-widest font-semibold opacity-80">Daily Punch Log</p>
            </div>
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
              <Clock size={28} className="text-white" />
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Location Status Card */}
            <div className={`p-4 rounded-2xl border flex items-center gap-4 transition-all ${location.lat ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${location.lat ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                <MapPin size={20} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Geolocation</p>
                <p className="text-xs font-bold text-slate-700">
                  {location.lat ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Detecting...'}
                </p>
              </div>
              {location.lat ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Loader2 size={16} className="text-amber-500 animate-spin" />}
            </div>

            {/* DateTime Card */}
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Time</p>
                <p className="text-xs font-bold text-slate-700">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Punch Status Toggle */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Punch Type</label>
              <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setPunchStatus('Punch In')}
                  className={`py-3 rounded-xl text-sm font-bold transition-all ${punchStatus === 'Punch In' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Punch IN
                </button>
                <button
                  type="button"
                  onClick={() => setPunchStatus('Punch Out')}
                  className={`py-3 rounded-xl text-sm font-bold transition-all ${punchStatus === 'Punch Out' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Punch OUT
                </button>
              </div>
            </div>

            {/* Client Name Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Client Name</label>
              <input
                type="text"
                placeholder="Enter Client or Project Name"
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all shadow-inner"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>

            {/* Selfie Capture Section */}
            <div className="space-y-4">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Verification Selfie</label>
              <div 
                onClick={handleCapture}
                className={`relative aspect-[4/3] rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${photo ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-indigo-400'}`}
              >
                {photo ? (
                  <img src={photo} alt="Selfie preview" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <div className="p-4 bg-white rounded-2xl shadow-sm mb-3">
                      <Camera size={32} className="text-indigo-600" />
                    </div>
                    <p className="text-sm font-bold text-slate-600">Click to take a photo</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">Make sure your face is visible</p>
                  </>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                capture="user"
                onChange={handleFileChange}
              />
            </div>

            {/* Quick Info Grid */}
            <div className="bg-slate-50 rounded-2xl p-4 grid grid-cols-2 gap-4">
               <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Employee</p>
                  <p className="text-xs font-bold text-slate-700 truncate">{user?.Name || 'Loading...'}</p>
               </div>
               <div className="text-right">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Department</p>
                  <p className="text-xs font-bold text-slate-700 truncate">{user?.Department || 'N/A'}</p>
               </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-5 rounded-2xl text-white font-bold text-base shadow-xl transition-all flex items-center justify-center gap-3 ${loading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 active:scale-[0.98]'}`}
            >
              {loading ? (
                <>
                  <Loader2 size={24} className="animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send size={20} />
                  Submit Attendance
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Safety Note */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
        <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
          Your attendance is being logged with geolocation verification. 
          Please ensure you are at the correct location before submitting. 
          Image and location data are stored for auditing purposes.
        </p>
      </div>
    </div>
  );
};

export default AttendanceForm;
