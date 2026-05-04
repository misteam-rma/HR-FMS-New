import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  Calendar,
  Clock,
  UserCheck,
  SwitchCamera,
  ArrowLeft,
  ChevronRight,
  Send,
  XCircle,
  RefreshCw,
  CheckCircle,
  UserPlus,
  ShieldCheck,
  Plus,
  X
} from "lucide-react";
import { createVisitRequestApi, fetchVisitorByMobileApi, fetchVisitsForApprovalApi } from "../../utils/visitorApi";

const VisitorEntry = ({ isModal = false, onClose, onRefresh, isPublic = false }) => {

  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [personToMeetOptions, setPersonToMeetOptions] = useState([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [currentFacingMode, setCurrentFacingMode] = useState("environment");
  const [stream, setStream] = useState(null);

  const [formData, setFormData] = useState({
    visitorName: "",
    mobileNumber: "",
    email: "",
    visitorAddress: "",
    purposeOfVisit: "",
    personToMeet: "",
    dateOfVisit: "",
    timeOfEntry: "",
  });

  useEffect(() => {
    openCamera("environment");

    const now = new Date();
    
    // Pre-fill user name if logged in as user
    const userStr = localStorage.getItem('user');
    let prefillName = "";
    if (userStr && !isPublic) {
      try {
        const userData = JSON.parse(userStr);
        const isAdmin = userData.Admin?.toLowerCase() === 'yes' || userData.Role?.toLowerCase() === 'admin' || userData.role?.toLowerCase() === 'admin';
        
        if (!isAdmin && (userData.Name || userData.name)) {
          prefillName = userData.Name || userData.name;
        }
      } catch (e) {
        console.error("Error parsing user data:", e);
      }
    }


    setFormData((prev) => ({
      ...prev,
      visitorName: prefillName || prev.visitorName,
      dateOfVisit: now.toISOString().split("T")[0],
      timeOfEntry: now.toTimeString().slice(0, 5),
    }));

    fetchPersonToMeetOptions();

    return () => closeCamera();
  }, []);

  const fetchPersonToMeetOptions = async () => {
    setIsLoadingOptions(true);
    try {
      const SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;
      const response = await fetch(`${SCRIPT_URL}?action=fetch&sheet=Master`);
      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        const mastersData = result.data;
        const options = [];
        for (let i = 1; i < mastersData.length; i++) {
          const personName = mastersData[i][10]; // Column K
          if (personName && typeof personName === 'string' && personName.trim() !== '') {
            options.push({ person_to_meet: personName.trim() });
          }
        }

        const uniqueOptions = Array.from(new Set(options.map(o => o.person_to_meet)))
          .map(name => ({ person_to_meet: name }));

        setPersonToMeetOptions(uniqueOptions);
      }
    } catch (err) {
      console.error("Error fetching options:", err);
    } finally {
      setIsLoadingOptions(false);
    }
  };

  const openCamera = async (facingMode) => {
    try {
      if (stream) stream.getTracks().forEach((t) => t.stop());

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        setStream(newStream);
        setCurrentFacingMode(facingMode);
      }
    } catch (err) {
      showToast("Camera access failed", "error");
    }
  };

  const switchCamera = async () => {
    const next = currentFacingMode === "user" ? "environment" : "user";
    await openCamera(next);
  };

  const closeCamera = () => {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    setStream(null);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);

    canvas.toBlob(
      (blob) => {
        const file = new File([blob], `visitor_${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        setPhotoFile(file);
        setCapturedPhoto(URL.createObjectURL(file));
        showToast("Photo captured!", "success");

        if ("geolocation" in navigator) {
          showToast("Fetching location...", "success");
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords;
              try {
                const response = await fetch(
                  `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=19&addressdetails=1`
                );
                const data = await response.json();
                const a = data.address || {};
                const parts = [
                  a.amenity || a.building || a.office || a.shop || a.tourism || a.leisure,
                  a.house_number ? `${a.house_number}, ${a.road}` : a.road,
                  a.neighbourhood || a.suburb || a.quarter || a.hamlet || a.village,
                  a.city_district || a.district,
                  a.city || a.town || a.county,
                  a.state,
                  a.postcode,
                ].filter(Boolean);

                const address = parts.length >= 3 ? parts.join(", ") : (data.display_name || parts.join(", "));
                if (address) {
                  setFormData((prev) => ({ ...prev, visitorAddress: address }));
                  showToast("Address identified!", "success");
                }
              } catch (error) {
                console.error("Error fetching location:", error);
                showToast("Address lookup failed", "error");
              }
            },
            (err) => { 
              console.error("GPS Error:", err);
              showToast("GPS access denied or timed out", "error");
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
          );
        } else {
          showToast("Geolocation not supported", "error");
        }
      },
      "image/jpeg",
      0.9
    );
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    setPhotoFile(null);
    openCamera(currentFacingMode);
  };

  const handleChange = async (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "mobileNumber" && value.length === 10) {
      // Don't auto-recognize for Admins to allow new visitor entries without interference
      const userStr = localStorage.getItem('user');
      let isAdmin = false;
      if (userStr) {
        try {
          const userData = JSON.parse(userStr);
          isAdmin = userData.Admin?.toLowerCase() === 'yes' || 
                    userData.Role?.toLowerCase() === 'admin' || 
                    userData.role?.toLowerCase() === 'admin';
        } catch (e) {}
      }

      if (!isAdmin && !isPublic) {
        try {
          const res = await fetchVisitorByMobileApi(value);
          if (res.found) {
            setFormData((prev) => ({
              ...prev,
              visitorName: res.data.visitorName || "",
              visitorAddress: res.data.visitorAddress || "",
            }));
            showToast("Visitor recognized", "success");
          }
        } catch (err) { }
      }
    }
  };

  useEffect(() => {
    // Dispatch custom event to notify Header about visitor data for QR generation
    window.dispatchEvent(new CustomEvent('visitor-form-update', { 
      detail: formData 
    }));
  }, [formData]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!formData.visitorName || !formData.mobileNumber || !formData.personToMeet) {
      showToast("Fill mandatory fields", "error");
      return;
    }
    setIsSubmitting(true);
    try {
      const visitsRes = await fetchVisitsForApprovalApi();
      const nextSerial = visitsRes.success ? (visitsRes.visits.length + 1).toString() : "1";

      // Get user code for Column S submission
      const userStr = localStorage.getItem('user');
      let userCode = "";
      if (userStr) {
        try {
          const userData = JSON.parse(userStr);
          userCode = userData.Code || userData.code || "";
        } catch (e) {}
      }

      await createVisitRequestApi({ 
        ...formData, 
        photoFile, 
        serialNo: nextSerial,
        userCode: userCode 
      });
      showToast("Registered Successfully", "success");

      if (onRefresh) onRefresh();
      setTimeout(() => {
        if (isModal) onClose();
        else if (isPublic) {
          // Reset form for next visitor
          setFormData({
            visitorName: "",
            mobileNumber: "",
            email: "",
            visitorAddress: "",
            purposeOfVisit: "",
            personToMeet: "",
            dateOfVisit: new Date().toISOString().split("T")[0],
            timeOfEntry: new Date().toTimeString().slice(0, 5),
          });
          setCapturedPhoto(null);
          setPhotoFile(null);
          openCamera(currentFacingMode);
        }
        else navigate("/");
      }, 1500);

    } catch (err) {
      showToast("Error saving data", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
  };

  const handleCancel = () => {
    if (isModal) onClose();
    else navigate("/");
  };

  return (
    <div className={`space-y-6 font-outfit animate-in fade-in zoom-in-95 duration-300 ${isModal ? '' : 'max-w-4xl mx-auto pb-10'}`}>
      {!isModal && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600">
              <UserPlus size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">Visitor Registration</h1>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">Generate entry gate pass</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className={`bg-white ${isModal ? '' : 'rounded-3xl border border-slate-200 shadow-sm overflow-hidden'}`}>
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
            {/* Photo Section */}
            <div className="md:col-span-5 space-y-4">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Camera size={14} /> Identity Capture
              </label>
              <div className="relative aspect-[4/3] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border-4 border-white ring-1 ring-slate-100 group">
                {!capturedPhoto ? (
                  <>
                    <video ref={videoRef} autoPlay className="w-full h-full object-cover" />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex gap-2">
                        <button type="button" onClick={switchCamera} className="p-4 bg-white/20 backdrop-blur-md rounded-2xl text-white hover:bg-white/40 transition-all border border-white/20">
                          <SwitchCamera size={20} />
                        </button>
                        <button type="button" onClick={capturePhoto} className="px-8 py-3 bg-white text-slate-900 rounded-2xl font-bold text-sm hover:scale-105 transition-all shadow-xl">
                          Capture Photo
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover" />
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                      <button type="button" onClick={retakePhoto} className="flex items-center gap-2 px-8 py-3 bg-rose-500 text-white rounded-2xl font-bold text-sm shadow-xl hover:bg-rose-600 transition-all">
                        <RefreshCw size={18} /> Retake Photo
                      </button>
                    </div>
                  </>
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-medium italic text-center px-4">Live identity verification is required for all visitors entering the premises.</p>
            </div>

            {/* Form Section */}
            <div className="md:col-span-7 space-y-6">
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">Visitor Name*</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                    <input
                      type="text"
                      name="visitorName"
                      value={formData.visitorName}
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none text-sm font-semibold"
                      placeholder="Enter full name"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">Mobile No.*</label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                    <input
                      type="tel"
                      name="mobileNumber"
                      value={formData.mobileNumber}
                      onChange={handleChange}
                      maxLength="10"
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none text-sm font-semibold"
                      placeholder="10-digit number"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">Person To Meet*</label>
                <div className="relative group">
                  <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                  <select
                    name="personToMeet"
                    value={formData.personToMeet}
                    onChange={handleChange}
                    className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none text-sm font-bold appearance-none cursor-pointer"
                    required
                  >
                    <option value="">SELECT STAFF MEMBER</option>
                    {personToMeetOptions.map((person, idx) => (
                      <option key={idx} value={person.person_to_meet}>{person.person_to_meet}</option>
                    ))}
                  </select>
                  <ChevronRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">Purpose Of Visit</label>
                <div className="relative group">
                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                  <input
                    type="text"
                    name="purposeOfVisit"
                    value={formData.purposeOfVisit}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none text-sm font-semibold"
                    placeholder="Meeting, Delivery, etc."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="date"
                      name="dateOfVisit"
                      value={formData.dateOfVisit}
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 transition-all outline-none text-sm font-bold"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">Entry Time</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="time"
                      name="timeOfEntry"
                      value={formData.timeOfEntry}
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 transition-all outline-none text-sm font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Full Width Address */}
          <div className="space-y-1.5 mt-6">
            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">Address / Location</label>
            <div className="relative group">
              <MapPin className="absolute left-4 top-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
              <textarea
                name="visitorAddress"
                value={formData.visitorAddress}
                onChange={handleChange}
                rows="2"
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none text-sm font-semibold resize-none"
                placeholder="Current residential or business address"
              />
            </div>
          </div>

          {/* Action Bar */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-slate-100">
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
              * Mandatory Fields Must Be Filled
            </div>
            <div className="flex gap-4 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 sm:flex-none px-10 py-3.5 bg-slate-50 text-slate-500 rounded-2xl font-bold text-sm hover:bg-slate-100 transition-all active:scale-95 border border-slate-200"
              >
                Discard
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-12 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:scale-105 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <RefreshCw className="animate-spin" size={18} />
                ) : (
                  <Send size={18} />
                )}
                {isSubmitting ? "Processing..." : "Generate Gate Pass"}
              </button>
            </div>
          </div>
        </div>
      </form>

      {toast.show && (
        <div className="fixed top-8 right-8 z-[100] animate-in fade-in slide-in-from-top-6 duration-300">
          <div className={`px-8 py-4 rounded-2xl shadow-2xl text-white font-bold text-sm flex items-center gap-4 ${toast.type === "success" ? "bg-emerald-500" : "bg-rose-500"
            }`}>
            {toast.type === "success" ? <CheckCircle size={22} /> : <XCircle size={22} />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisitorEntry;
