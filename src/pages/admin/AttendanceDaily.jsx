import React, { useState, useEffect, useRef } from "react";
import { 
  Search, Users, Calendar, Filter, Clock, CheckCircle2, 
  XCircle, AlertCircle, ChevronRight, FileText, ChevronDown, 
  Check, History, Download, MapPin, List, LayoutDashboard, Camera, RotateCw, MapPinned,
  Plus, Loader2, Send
} from "lucide-react";
import LoadingSpinner from "../../components/LoadingSpinner";
import toast from "react-hot-toast";

const AttendanceDaily = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [activeTab, setActiveTab] = useState("pending"); 
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const [filterDate, setFilterDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState(null);

  // Attendance Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalFormData, setModalFormData] = useState({
    code: '',
    name: '',
    type: '',
    department: '',
    punchType: 'in'
  });
  const [capturedImage, setCapturedImage] = useState(null);
  const [locationData, setLocationData] = useState({ latitude: '', longitude: '', locationName: '' });
  const [cameraActive, setCameraActive] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [isPunching, setIsPunching] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [userList, setUserList] = useState([]);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const startCamera = async () => {
    try {
      setCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("startCamera Error:", err);
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

    // Print Lat / Long at the image footer
    if (locationData.latitude && locationData.longitude) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
      
      ctx.font = "bold 14px Outfit, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText(
        `Lat: ${parseFloat(locationData.latitude).toFixed(5)} | Long: ${parseFloat(locationData.longitude).toFixed(5)}`,
        canvas.width / 2,
        canvas.height - 15
      );
    }

    const photoData = canvas.toDataURL('image/jpeg');
    setCapturedImage(photoData);
    stopCamera();
  };

  const fetchLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported by browser");
      return;
    }

    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude.toString();
        const lng = position.coords.longitude.toString();
        
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          const locName = data.display_name || `Coordinates: ${lat}, ${lng}`;
          setLocationData({ latitude: lat, longitude: lng, locationName: locName });
          toast.success("Location successfully identified!");
        } catch (e) {
          setLocationData({ latitude: lat, longitude: lng, locationName: `Coordinates: ${lat}, ${lng}` });
        } finally {
          setLoadingLocation(false);
        }
      },
      (err) => {
        console.error("fetchLocation Error:", err);
        toast.error("Location services denied. Check device permissions.");
        setLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const fetchUserList = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=USER&action=fetch`);
      const result = await response.json();
      const rawData = result.data || result;
      
      if (Array.isArray(rawData) && rawData.length > 0) {
        // Dynamic Header Detection: Find where the data starts
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(rawData.length, 10); i++) {
          const row = rawData[i];
          if (row && row.some(cell => cell && cell.toString().toLowerCase().includes('code') || cell.toString().toLowerCase().includes('serial'))) {
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
        })).filter(u => u.code && u.code !== "Code" && u.code !== "Employee Code");
        
        setUserList(processedUsers);
      }
    } catch (err) {
      console.error("fetchUserList Error:", err);
    }
  };

  const handleCodeChange = (e) => {
    const selectedCode = e.target.value;
    const employee = userList.find(u => u.code === selectedCode);
    
    if (employee) {
      setModalFormData({
        ...modalFormData,
        code: selectedCode,
        name: employee.name,
        type: employee.type,
        department: employee.department
      });
      toast.success(`Employee ${employee.name} identified!`);
    } else {
      setModalFormData({
        ...modalFormData,
        code: selectedCode,
        name: '',
        type: '',
        department: ''
      });
    }
  };

  const lookupEmployee = async () => {
    // Legacy lookup kept for compatibility if needed, but dropdown is now primary
    if (!modalFormData.code) return toast.error("Please enter an employee code");
    setIsLookingUp(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=USER&action=fetch`);
      const result = await response.json();
      const rawData = result.data || result;
      
      if (Array.isArray(rawData)) {
        // In USER sheet: Code is index 6 (Col G)
        const employee = rawData.slice(6).find(row => row[6]?.toString().trim().toLowerCase() === modalFormData.code.trim().toLowerCase());
        
        if (employee) {
          setModalFormData(prev => ({
            ...prev,
            name: employee[2] || "",
            type: employee[3] || "",
            department: employee[10] || ""
          }));
          toast.success("Employee verified!");
        } else {
          toast.error("Employee code not found");
        }
      }
    } catch (err) {
      console.error("Lookup error:", err);
      toast.error("Verification service unavailable");
    } finally {
      setIsLookingUp(false);
    }
  };

  const handlePunchSubmit = async (e) => {
    e.preventDefault();
    if (!modalFormData.code) return toast.error("Employee code is essential");
    if (!modalFormData.name) return toast.error("Please verify employee code first");
    if (!capturedImage) return toast.error("Live snapshot is mandatory");
    if (!locationData.latitude) return toast.error("Please capture geolocation data");

    setIsPunching(true);
    try {
      // 1. Upload image to Google Drive
      let imageUrl = null;
      const folderId = modalFormData.punchType === 'in' 
        ? import.meta.env.VITE_GOOGLE_DRIVE_ATTENDANCE_IN_FOLDER_ID 
        : import.meta.env.VITE_GOOGLE_DRIVE_ATTENDANCE_OUT_FOLDER_ID;

      const uploadResponse = await fetch(import.meta.env.VITE_APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'uploadFile',
          base64Data: capturedImage,
          fileName: `Attendance_${modalFormData.code}_${modalFormData.punchType.toUpperCase()}_${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
          folderId: folderId || ""
        })
      });
      
      const uploadResult = await uploadResponse.json();
      if (uploadResult.success && uploadResult.fileUrl) {
        // Extract file ID from the backend's returned URL (https://drive.google.com/uc?export=view&id=...)
        const fileId = uploadResult.fileUrl.split('id=')[1];
        imageUrl = fileId 
          ? `https://drive.google.com/file/d/${fileId}/view?usp=sharing`
          : uploadResult.fileUrl;
      } else {
        throw new Error(uploadResult.error || "Image upload failed. Please try again.");
      }

      // 2. Fetch current Attendance sheet to generate Serial No
      const fetchResponse = await fetch(`${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=Attendance&action=fetch`);
      const fetchResult = await fetchResponse.json();
      const existingData = fetchResult.success ? (fetchResult.data || fetchResult) : [];
      
      let maxSerial = 0;
      if (Array.isArray(existingData) && existingData.length > 1) {
          const rows = existingData.slice(1); // Skip header row
          rows.forEach(row => {
              const sn = parseInt(row[1]); // Serial no is index 1
              if (!isNaN(sn) && sn > maxSerial) maxSerial = sn;
          });
      }
      const nextSerial = maxSerial + 1;

      const now = new Date();
      const pad = (num) => String(num).padStart(2, '0');
      const timestamp = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()} ${now.getHours()}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      const dateStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
      const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      const locationLink = `https://www.google.com/maps?q=${locationData.latitude},${locationData.longitude}`;

      // 3. Submitting to Attendance sheet
      const response = await fetch(import.meta.env.VITE_APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'insert',
          sheetName: 'Attendance',
          rowData: JSON.stringify([
            timestamp,                          // A: Timestamp
            nextSerial,                         // B: Serial No
            modalFormData.code,                 // C: Employee Code
            modalFormData.type,                 // D: Employee Type
            modalFormData.name,                 // E: Employee Name
            modalFormData.department,           // F: Department
            modalFormData.punchType.toUpperCase(), // G: Punch Status
            imageUrl,                           // H: Live Selfie Capture (URL)
            locationData.latitude,              // I: Latitude
            locationData.longitude,             // J: Longitude
            locationData.locationName,          // K: Location name
            dateStr,                            // L: Date
            timeStr,                            // M: Time
            locationLink                        // N: Location Link
          ])
        })
      });

      toast.success(`Employee punched ${modalFormData.punchType.toUpperCase()} successfully!`);
      setIsModalOpen(false);
      setCapturedImage(null);
      setModalFormData({ code: '', name: '', type: '', department: '', punchType: 'in' });
      setLocationData({ latitude: '', longitude: '', locationName: '' });
      fetchReportDailySheet();
    } catch (err) {
      console.error("handlePunchSubmit Error:", err);
      toast.error("Transaction mapping failed");
    } finally {
      setIsPunching(false);
    }
  };

  const fetchReportDailySheet = async () => {
    setTableLoading(true);
    setError(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=Attendance&action=fetch`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to fetch daily logs');

      const rawData = result.data || result;
      if (!Array.isArray(rawData)) throw new Error('Expected array data not received');

      let headerRowIndex = 0;
      for (let i = 0; i < rawData.length; i++) {
        if (rawData[i] && rawData[i].some(cell => cell && cell.toString().toLowerCase().includes('date'))) {
          headerRowIndex = i;
          break;
        }
      }

      const headers = rawData[headerRowIndex].map(h => h?.toString().trim() || '');
      const dataRows = rawData.length > headerRowIndex + 1 ? rawData.slice(headerRowIndex + 1) : [];

      const processedData = dataRows.map((row, idx) => {
        const obj = { id: idx };
        headers.forEach((header, colIndex) => {
          obj[header] = row[colIndex] !== undefined && row[colIndex] !== null ? row[colIndex].toString() : '';
        });
        
        // Correct Mapping based on Sheet Image
        const punchStatus = (obj['Punch Status'] || '').toUpperCase();
        const punchTime = obj['Time'] || '--:--';

        return {
          id: obj.id,
          empId: obj['Employee Code'] || '-',
          name: obj['Employee Name'] || '-',
          department: obj['Department'] || 'General',
          designation: obj['Employee Type'] || 'Staff',
          date: obj['Date'] || '-',
          day: '-', // Day can be derived if needed, or left as placeholder
          inTime: punchStatus === 'IN' ? punchTime : '--:--',
          outTime: punchStatus === 'OUT' ? punchTime : '--:--',
          workingHours: '0', // Calculated later or in separate logic
          lateMins: '0', 
          status: punchStatus === 'IN' ? 'Present' : 'Punch Out',
          location: obj['Location name'] || 'Location NA',
        };
      });

      setAttendanceData(processedData);
    } catch (err) {
      console.error("fetchReportDailySheet error:", err);
      setError(err.message);
      toast.error(`Failed to load attendance logs: ${err.message}`);
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchReportDailySheet();
    fetchUserList();
  }, []);

  const filteredData = attendanceData.filter(item => {
    if (activeTab === "history" && item.status !== "Absent" && item.lateMins === "0") return false;
    const matchesSearch = !searchTerm || item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.empId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = !filterDepartment || item.department === filterDepartment;
    const matchesDate = !filterDate || item.date === filterDate;
    return matchesSearch && matchesDept && matchesDate;
  });

  const departments = [...new Set(attendanceData.map(d => d.department))].sort();
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderPaginationNav = () => (
    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px w-full justify-center sm:w-auto">
      <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="relative inline-flex items-center px-1.5 py-1.5 rounded-l-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50">
        <ChevronRight className="h-4 w-4 rotate-180" />
      </button>
      {[...Array(Math.max(1, Math.min(5, totalPages)))].map((_, i) => (
        <button key={i} onClick={() => paginate(i+1)} className={`relative inline-flex items-center px-3 py-1.5 border text-[11px] font-bold ${currentPage === (i+1) ? "z-10 bg-indigo-50 border-indigo-500 text-indigo-600 shadow-sm" : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"}`}>
          {i + 1}
        </button>
      ))}
      <button onClick={() => paginate(currentPage + 1)} disabled={currentPage >= totalPages} className="relative inline-flex items-center px-1.5 py-1.5 rounded-r-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50">
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );

  return (
    <div className="max-w-full mx-auto px-1 sm:px-2 lg:px-4 py-4 space-y-4 md:space-y-6 pb-20 md:pb-8 font-outfit">
      
      {/* 🧩 Header Section - Call Tracker Parity */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Tab Switcher - Call Tracker SPEC */}
        <div className="flex bg-gray-100 p-1 rounded-lg w-fit">
           <button 
             onClick={() => { setActiveTab("pending"); setCurrentPage(1); }} 
             className={`flex items-center gap-2 py-1 px-4 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all duration-200 ${activeTab === 'pending' ? 'bg-white text-indigo-600 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
           >
             <Clock size={13} />
             <span>Pending ({filteredData.length})</span>
           </button>
           <button 
             onClick={() => { setActiveTab("history"); setCurrentPage(1); }} 
             className={`flex items-center gap-2 py-1 px-4 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all duration-200 ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
           >
             <History size={13} />
             <span>History</span>
           </button>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {/* Search bar */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
            <input 
               type="text" 
               placeholder="Search calls..." 
               value={searchTerm} 
               onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
               className="pl-9 pr-4 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full text-[13px] shadow-sm bg-white"
            />
          </div>

          <div className="grid grid-cols-2 lg:flex lg:items-center gap-2">
             {/* Department Filter */}
             <div className="relative">
               <div onClick={() => setIsDeptDropdownOpen(!isDeptDropdownOpen)} className="flex items-center gap-2 h-8 px-3 border border-gray-200 rounded bg-white text-[11px] text-gray-700 font-medium cursor-pointer hover:border-indigo-400 transition shadow-sm">
                 <Filter size={11} className="text-gray-400" />
                 <span className="truncate">{filterDepartment || "All Dept"}</span>
                 <ChevronDown size={12} className={`ml-1 text-gray-400 transition-transform ${isDeptDropdownOpen ? 'rotate-180' : ''}`} />
               </div>
               {isDeptDropdownOpen && (
                 <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50 overflow-hidden py-1">
                    <div onClick={() => { setFilterDepartment(""); setIsDeptDropdownOpen(false); setCurrentPage(1); }} className="px-3 py-1.5 text-[11px] font-normal cursor-pointer hover:bg-gray-50">All Departments</div>
                    {departments.map(d => (
                       <div key={d} onClick={() => { setFilterDepartment(d); setIsDeptDropdownOpen(false); setCurrentPage(1); }} className="px-3 py-1.5 text-[11px] font-normal cursor-pointer hover:bg-gray-50 flex items-center justify-between">
                         {d}
                         {filterDepartment === d && <Check size={11} className="text-indigo-500" />}
                       </div>
                    ))}
                 </div>
               )}
             </div>

             {/* Date Picker */}
             <div className="flex items-center gap-1 h-8 px-2 border border-gray-200 rounded bg-white text-[11px] text-gray-600 shadow-sm relative">
               <Calendar size={11} className="text-gray-400" />
               <input type="date" value={filterDate} onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(1); }} className="bg-transparent focus:outline-none text-[10px] w-24 cursor-pointer" />
             </div>

             {/* Attendance Button */}
             <button 
               onClick={() => { 
                 const userStr = localStorage.getItem('user');
                 const user = userStr ? JSON.parse(userStr) : null;
                 const isAdmin = user && user.Admin === 'Yes';

                 if (user && !isAdmin) {
                   setModalFormData({
                     code: user.Code || '',
                     name: user.Name || '',
                     type: user.Type || 'Full Time',
                     department: user.Department || '',
                     punchType: 'in'
                   });
                 } else {
                   // If admin or no user, reset to empty form for manual selection
                   setModalFormData({ code: '', name: '', type: '', department: '', punchType: 'in' });
                 }
                 setIsModalOpen(true); 
                 fetchLocation(); 
                 fetchUserList(); 
               }}
               className="flex items-center justify-center gap-2 h-8 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-bold uppercase tracking-wider shadow-sm transition-all duration-200 ease-in-out hover:shadow-md active:scale-95"
             >
               <span>Attendance</span>
             </button>
          </div>
        </div>
      </div>

      {/* 📊 Main Table Content Area - Call Tracker Absolute Mirroring */}
      <div className="overflow-hidden border border-gray-200 rounded-lg bg-white min-h-[530px] flex flex-col">
        {tableLoading ? (
           <div className="flex-1 flex items-center justify-center p-12">
             <LoadingSpinner message="Retrieving logs..." minHeight="450px" />
           </div>
        ) : (
          <>
            <div className="max-h-[calc(105vh-280px)] min-h-[530px] overflow-y-auto scrollbar-hide">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Employee Name</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Employee ID</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Date</th>
                    {/* <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Day</th> */}
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">In-Time</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Out-Time</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Net Depth</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Latency</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-24 text-center">
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">No matching records found.</p>
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-700 font-normal uppercase">
                           {item.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 font-normal uppercase tracking-tight">#{item.empId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-xs text-gray-500 font-normal tracking-tight">{item.date}</td>
                        {/* <td className="px-6 py-4 whitespace-nowrap text-center text-[10px] text-gray-400 uppercase font-normal">{item.day}</td> */}
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 font-normal">{item.inTime}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 font-normal">{item.outTime}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-indigo-600 font-normal">{item.workingHours}h</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-rose-500 font-normal">+{item.lateMins}m</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                           <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium ${item.status === 'Present' ? 'bg-green-100 text-green-700' : (item.status === 'Holiday' ? 'bg-indigo-100 text-indigo-700' : 'bg-red-100 text-red-700')}`}>
                             {item.status}
                           </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* 📑 Footer Pagination - Call Tracker Mirror */}
            <div className="px-4 py-3 bg-white border-t border-gray-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6 flex-wrap">
                <p className="text-[13px] text-gray-600 font-medium tracking-wide">
                  Showing <span className="font-bold text-gray-900">{filteredData.length > 0 ? indexOfFirstItem + 1 : 0}</span> to <span className="font-bold text-gray-900">{Math.min(indexOfLastItem, filteredData.length)}</span> of <span className="font-bold text-gray-900">{filteredData.length}</span> records
                </p>
                <div className="flex items-center gap-2 h-5">
                  <label className="text-[13px] text-gray-500 font-medium whitespace-nowrap">Rows per page:</label>
                  <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="text-xs bg-transparent font-medium text-gray-700 outline-none cursor-pointer">
                    {[15, 30, 50, 100].map(val => <option key={val} value={val}>{val}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center w-auto justify-end">
                {renderPaginationNav()}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Full Screen Attendance Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300 font-outfit">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col border border-gray-100 relative">
            
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                  <Plus size={20} />
                </div>
                <h2 className="text-xl font-bold text-gray-800 uppercase tracking-tight">New Attendance Entry</h2>
              </div>
              <button 
                type="button"
                onClick={() => { stopCamera(); setIsModalOpen(false); setCapturedImage(null); }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-all"
              >
                <XCircle size={24} />
              </button>
            </div>

            <form onSubmit={handlePunchSubmit} className="p-8 space-y-6 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Employee ID */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Employee ID</label>
                  {(() => {
                    const userStr = localStorage.getItem('user');
                    const user = userStr ? JSON.parse(userStr) : null;
                    const isAdmin = user && user.Admin === 'Yes';
                    
                    if (user && !isAdmin) {
                      return (
                        <input 
                          type="text"
                          value={modalFormData.code}
                          readOnly
                          className="h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 focus:outline-none shadow-sm cursor-not-allowed"
                        />
                      );
                    } else {
                      return (
                        <select 
                          value={modalFormData.code}
                          onChange={handleCodeChange}
                          className="h-11 px-4 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                          required
                        >
                          <option value="">Select Employee ID</option>
                          {userList.map((user, idx) => (
                            <option key={idx} value={user.code}>{user.code}</option>
                          ))}
                        </select>
                      );
                    }
                  })()}
                </div>

                {/* Punch Status */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Punch Status</label>
                  <select 
                    value={modalFormData.punchType}
                    onChange={(e) => setModalFormData({ ...modalFormData, punchType: e.target.value })}
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
                    value={modalFormData.name}
                    readOnly
                    placeholder="Auto-filled"
                    className="h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 focus:outline-none shadow-sm cursor-not-allowed"
                  />
                </div>

                {/* Department */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Department</label>
                  <input 
                    type="text"
                    value={modalFormData.department}
                    readOnly
                    placeholder="Auto-filled"
                    className="h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 focus:outline-none shadow-sm cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Location Module */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Verification Location</label>
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4 group hover:border-indigo-400 transition-all shadow-sm">
                  <div className="flex items-start gap-3">
                    <MapPin className="text-indigo-600 mt-1" size={18} />
                    <div>
                      <p className={`text-xs font-medium ${loadingLocation ? 'text-indigo-500 animate-pulse' : 'text-gray-600'}`}>
                        {loadingLocation ? "Tracking satellites..." : (locationData.locationName || "Press button to resolve location")}
                      </p>
                    </div>
                  </div>
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

              {/* Camera Capture Module */}
              <div className="space-y-4 pt-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Identity Authentication</label>
                
                <div className="relative w-full aspect-[4/3] max-w-sm mx-auto bg-slate-50 border border-gray-200 rounded-2xl overflow-hidden flex flex-col items-center justify-center transition-all">
                  {cameraActive ? (
                    <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" playsInline />
                  ) : capturedImage ? (
                    <img src={capturedImage} className="w-full h-full object-cover" alt="Captured Identity" />
                  ) : (
                    <div className="text-center p-8 space-y-3">
                      <Camera className="text-gray-300 mx-auto" size={48} strokeWidth={1.5} />
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Initialization Required</p>
                    </div>
                  )}
                  
                  <canvas ref={canvasRef} className="hidden" />
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
                      <CheckCircle2 size={14} />
                      <span>Authenticate & Log</span>
                    </button>
                  )}
                  {capturedImage && !cameraActive && (
                    <button 
                      type="button"
                      onClick={() => setCapturedImage(null)}
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
                    "Submit Verification Log"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AttendanceDaily;