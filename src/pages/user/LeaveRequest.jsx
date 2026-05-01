import React, { useState, useEffect } from 'react';
import { Plus, Filter, X, Clock, Search, RotateCw } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';

const LeaveRequest = () => {
  const employeeId = localStorage.getItem("employeeId");
  const rawUser = localStorage.getItem("user");
  const user = rawUser ? JSON.parse(rawUser) : {};
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [leavesData, setLeavesData] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [employees, setEmployees] = useState([]);
  const [hodNames, setHodNames] = useState([]);
  const [formData, setFormData] = useState({
    employeeId: user.Code || '',
    employeeName: user.Name || '',
    department: '',
    hodName: '', // Will be selected from dropdown
    substitute: '',
    leaveType: '',
    fromDate: '',
    toDate: '',
    reason: ''
  });

  const fetchHodNames = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=Master&action=fetch`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch HOD data');
      }

      const rawData = result.data || result;

      if (!Array.isArray(rawData)) {
        throw new Error('Expected array data not received');
      }

      // Skip the header row and get all unique names from Column K (index 10)
      const hodData = rawData.slice(1)
        .map(row => row[10]?.toString().trim() || '')
        .filter(name => name);
      
      const uniqueHodData = [...new Set(hodData)];
      setHodNames(uniqueHodData);
    } catch (error) {
      console.error('Error fetching HOD data:', error);
      toast.error(`Failed to load HOD data: ${error.message}`);
    }
  };

  // Fetch employee data including designation
  const fetchEmployeeData = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=JOINING&action=fetch`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch employee data');
      }

      const rawData = result.data || result;

      if (!Array.isArray(rawData)) {
        throw new Error('Expected array data not received');
      }

      const employeeRow = rawData.slice(6).find(row => {
        const rowCode = row[1]?.toString().trim().toLowerCase();
        const rowName = row[2]?.toString().trim().toLowerCase();
        const userCode = user.Code?.toString().trim().toLowerCase();
        const userName = user.Name?.toString().trim().toLowerCase();
        return (userCode && rowCode === userCode) || (userName && rowName === userName);
      });

      if (employeeRow) {
        const employeeId = employeeRow[1] || '';
        const department = employeeRow[20] || '';

        setFormData(prev => ({
          ...prev,
          employeeId: employeeId,
          department: department
          // Removed auto-setting hodName here
        }));
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
    }
  };

  // Fetch employees from JOINING sheet
  const fetchEmployees = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=JOINING&action=fetch`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch employee data');
      }

      const rawData = result.data || result;

      if (!Array.isArray(rawData)) {
        throw new Error('Expected array data not received');
      }

      // Data starts from row 7 (index 6)
      // Column C is index 2 (Employee Name)
      // Column B is index 1 (Employee ID)
      // Column U is index 20 (Department) - changed from designation
      const employeeData = rawData.slice(6).map((row, index) => ({
        id: row[1] || '', // Column B (Employee ID)
        name: row[2] || '', // Column C (Employee Name)
        department: row[20] || '', // Column U (Department)
        rowIndex: index + 7 // Actual row number in sheet
      })).filter(emp => emp.name && emp.id); // Filter out empty entries

      setEmployees(employeeData);
    } catch (error) {
      console.error('Error fetching employee data:', error);
      toast.error(`Failed to load employee data: ${error.message}`);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
  };

  const handleYearChange = (e) => {
    setSelectedYear(e.target.value);
  };

  const parseDateString = (dateStr) => {
    if (!dateStr) return null;
    if (typeof dateStr === 'string' && dateStr.includes('/')) {
      const parts = dateStr.split('/').map(Number);
      if (parts.length === 3) {
        if (parts[0] > 12) {
          // Format is definitely DD/MM/YYYY
          return new Date(parts[2], parts[1] - 1, parts[0]);
        } else if (parts[1] > 12) {
          // Format is definitely MM/DD/YYYY
          return new Date(parts[2], parts[0] - 1, parts[1]);
        } else {
          // Ambiguous, fallback to DD/MM/YYYY as it was the original intention
          return new Date(parts[2], parts[1] - 1, parts[0]);
        }
      }
    }
    return new Date(dateStr);
  };

  const calculateDays = (startDateStr, endDateStr) => {
    if (!startDateStr || !endDateStr) return 0;

    const startDate = parseDateString(startDateStr);
    const endDate = parseDateString(endDateStr);

    if (!startDate || !endDate || isNaN(startDate) || isNaN(endDate)) return 0;

    const diffTime = endDate - startDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(0, diffDays); // Ensure it doesn't return negative days
  };

  const calculateDaysInMonth = (startDateStr, endDateStr, month, year) => {
    if (!startDateStr || !endDateStr || month === 'all') {
      return calculateDays(startDateStr, endDateStr);
    }

    const startDate = parseDateString(startDateStr);
    const endDate = parseDateString(endDateStr);

    if (!startDate || !endDate || isNaN(startDate) || isNaN(endDate)) return 0;

    const selectedMonthStart = new Date(year, parseInt(month), 1);
    const selectedMonthEnd = new Date(year, parseInt(month) + 1, 0);

    if (endDate < selectedMonthStart || startDate > selectedMonthEnd) {
      return 0;
    }

    const adjustedStartDate = startDate < selectedMonthStart ? selectedMonthStart : startDate;
    const adjustedEndDate = endDate > selectedMonthEnd ? selectedMonthEnd : endDate;

    const diffTime = adjustedEndDate - adjustedStartDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    return Math.max(0, diffDays);
  };


  const formatDOB = (dateString) => {
    if (!dateString) return '';

    // If already in dd/mm/yyyy format, return as-is
    if (typeof dateString === 'string' && dateString.includes('/')) {
      const parts = dateString.split('/');
      // Check if it's in mm/dd/yyyy format (first part > 12)
      if (parts.length === 3 && parseInt(parts[0]) > 12) {
        // It's already in dd/mm/yyyy format
        return dateString;
      } else if (parts.length === 3) {
        // It's in mm/dd/yyyy format, convert to dd/mm/yyyy
        const [month, day, year] = parts;
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
      }
    }

    // Handle other date formats or invalid dates
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // Return as-is if not a valid date
      }

      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();

      return `${day}/${month}/${year}`;
    } catch (error) {
      return dateString; // Return original if parsing fails
    }
  };

  // Unified date parsing
  const parseDate = (dateStr) => {
    return parseDateString(dateStr);
  };

  // Check if a date falls within a specific month and year
  const isDateInSelectedPeriod = (dateStr, monthIndex, year) => {
    if (!dateStr) return true;

    const date = parseDate(dateStr);
    if (!date) return false;

    if (monthIndex === 'all') {
      return date.getFullYear() === parseInt(year);
    }

    return date.getMonth() === parseInt(monthIndex) && date.getFullYear() === parseInt(year);
  };

  const fetchLeaveData = async () => {
    setLoading(true);
    setTableLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=Leave Management&action=fetch`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch leave data');
      }

      const rawData = result.data || result;
      console.log("Raw data from API:", rawData);

      if (!Array.isArray(rawData)) {
        throw new Error('Expected array data not received');
      }

      const dataRows = rawData.length > 1 ? rawData.slice(6) : [];

      // Updated column indices:
      // Column E (index 4) - From Date
      // Column F (index 5) - To Date
      // Column H (index 7) - Status
      // Column I (index 8) - Leave Type
      // Column M (index 12) - Days (changed from index 13)
      const processedData = dataRows
        .map((row, index) => ({
          id: index + 1,
          timestamp: row[0] || '',
          serialNo: row[1] || '',
          employeeId: row[2] || '',
          employeeName: row[3] || '',
          employeeCode: row[4] || '',
          employeeType: row[5] || '',
          department: row[6] || '',
          leaveType: row[7] || '',       // H (7)
          reason: row[8] || '',          // I (8)
          startDate: row[9] || '',       // J (9)
          endDate: row[10] || '',        // K (10)
          approvedBy: row[11] || '',     // L (11)
          status: row[14] || 'Pending',  // O (14)
          remarks: row[15] || '',        // P (15)
          days: calculateDays(row[9], row[10]) || 0, // dynamically calculate days
          appliedDate: row[0] || '',
        }))
        .filter(item => {
          const userCode = user.Code?.toString().trim().toLowerCase();
          const userName = user.Name?.toString().trim().toLowerCase();
          const itemCode = item.employeeId?.toString().trim().toLowerCase();
          const itemName = item.employeeName?.toString().trim().toLowerCase();
          return (userCode && itemCode === userCode) || (userName && itemName === userName);
        });

      if (processedData.length > 0) {
        setLeavesData(processedData);
      } else {
        setLeavesData([]);
      }

    } catch (error) {
      console.error('Error fetching leave data:', error);
      setError(error.message);
      toast.error(`Failed to load leave data: ${error.message}`);
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveData();
    fetchEmployees();
    fetchEmployeeData();
    fetchHodNames();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.employeeName ||
      !formData.leaveType ||
      !formData.fromDate ||
      !formData.toDate ||
      !formData.reason ||
      !formData.hodName
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      setSubmitting(true);
      const now = new Date();

      // Format timestamp as DD/MM/YYYY HH:MM:SS
      const day = String(now.getDate()).padStart(2, "0");
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = now.getFullYear();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      const formattedTimestamp = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;

      // Calculate leave days
      const leaveDays = calculateDays(formData.fromDate, formData.toDate);

      // 1. Fetch current data to generate Serial No
      const fetchResponse = await fetch(`${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=Leave Management&action=fetch`);
      const fetchResult = await fetchResponse.json();
      const existingData = fetchResult.success ? (fetchResult.data || fetchResult) : [];

      let maxSerialNum = 0;
      if (Array.isArray(existingData) && existingData.length > 6) {
        const rows = existingData.slice(6);
        rows.forEach(row => {
          const snString = row[1]?.toString() || '';
          // Extract numeric part from serial number (handles "L-001" or just "1")
          const match = snString.match(/(\d+)/);
          if (match) {
            const sn = parseInt(match[0]);
            if (!isNaN(sn) && sn > maxSerialNum) maxSerialNum = sn;
          }
        });
      }
      const nextSerialNum = maxSerialNum + 1;
      const formattedSerial = String(nextSerialNum).padStart(3, '0');

      // Updated rowData array for EXACT 12 column mapping
      const rowData = [
        formattedTimestamp,        // A (0): Timestamp
        formattedSerial,           // B (1): SerialNo (Auto-generated)
        formData.employeeId,       // C (2): Employe ID
        formData.employeeName,     // D (3): Employee Name
        formData.employeeId,       // E (4): Employee Code
        user['Employee Type'] || user['User Type'] || "Full Time", // F (5): Employee Type
        formData.department || "N/A", // G (6): Department
        formData.leaveType,        // H (7): Leave Type
        formData.reason,           // I (8): Reason For Leave
        formData.fromDate,         // J (9): Leave Date Start
        formData.toDate,           // K (10): Leave Date End
        formData.hodName           // L (11): Approve BY
      ];

      const response = await fetch(
        import.meta.env.VITE_APPS_SCRIPT_URL,
        {
          method: "POST",
          body: new URLSearchParams({
            sheetName: "Leave Management",
            action: "insert",
            rowData: JSON.stringify(rowData),
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success("Leave Request submitted successfully!");

        // Refresh the data immediately to update the button state
        await fetchLeaveData();

        setFormData({
          employeeId: user.Code || "",
          employeeName: user.Name || "",
          department: formData.department || "",
          hodName: "",
          substitute: "",
          leaveType: "",
          fromDate: "",
          toDate: "",
          reason: "",
        });
        setShowModal(false);
      } else {
        toast.error("Failed to insert: " + (result.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Insert error:", error);
      toast.error("Something went wrong!");
    } finally {
      setSubmitting(false);
    }
  };


  const hasSubmittedToday = () => {
    const today = new Date();
    const todayStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

    return leavesData.some(leave => {
      // Case-insensitive employee name comparison
      if (!leave.timestamp || !leave.employeeName ||
        leave.employeeName.toLowerCase().trim() !== user.Name.toLowerCase().trim()) {
        return false;
      }

      // Extract date part from timestamp (M/D/YYYY H:M:S format from sheet)
      const timestampDate = leave.timestamp.split(' ')[0];
      return timestampDate === todayStr;
    });
  };
  const leaveTypes = [
    "Casual Leave",
    "Earned Leave",
    "Sick Leave",
    "Restricted Holiday",
  ];

  // Generate year options (current year and previous 5 years)
  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];

    for (let i = currentYear; i >= currentYear - 5; i--) {
      years.push(i);
    }

    return years;
  };

  const yearOptions = getYearOptions();

  // Calculate leave counts based on selected month and year

  const calculateLeaveStats = () => {
    const currentYear = new Date().getFullYear();

    // Filter approved leaves for current employee matching Column D (employeeName)
    const relevantLeaves = leavesData.filter(leave => {
      const isApproved = leave.status && leave.status.toString().trim().toLowerCase() === 'approved';
      const isNameMatch = leave.employeeName && user.Name &&
        leave.employeeName.toString().trim().toLowerCase() === user.Name.toString().trim().toLowerCase();
      return isApproved && isNameMatch;
    });

    // Calculate approved leaves using days from Column M (index 12)
    const casualLeaveTaken = relevantLeaves
      .filter((leave) => {
        const leaveYear = new Date(
          leave.startDate.split("/").reverse().join("-")
        ).getFullYear();
        return (
          leave.leaveType &&
          leave.leaveType.toLowerCase().includes("casual") &&
          leaveYear === currentYear
        );
      })
      .reduce((sum, leave) => {
        // Use days from Column M (index 12), fallback to 0 if not available
        const days = leave.days ? parseInt(leave.days) : 0;
        return sum + (isNaN(days) ? 0 : days);
      }, 0);

    const earnedLeaveTaken = relevantLeaves
      .filter((leave) => {
        const leaveYear = new Date(
          leave.startDate.split("/").reverse().join("-")
        ).getFullYear();
        return (
          leave.leaveType &&
          leave.leaveType.toLowerCase().includes("earned") &&
          leaveYear === currentYear
        );
      })
      .reduce((sum, leave) => {
        const days = leave.days ? parseInt(leave.days) : 0;
        return sum + (isNaN(days) ? 0 : days);
      }, 0);

    const sickLeaveTaken = relevantLeaves
      .filter((leave) => {
        const leaveYear = new Date(
          leave.startDate.split("/").reverse().join("-")
        ).getFullYear();
        return (
          leave.leaveType &&
          leave.leaveType.toLowerCase().includes("sick") &&
          leaveYear === currentYear
        );
      })
      .reduce((sum, leave) => {
        const days = leave.days ? parseInt(leave.days) : 0;
        return sum + (isNaN(days) ? 0 : days);
      }, 0);

    const restrictedHolidayTaken = relevantLeaves
      .filter((leave) => {
        const leaveYear = new Date(
          leave.startDate.split("/").reverse().join("-")
        ).getFullYear();
        return (
          leave.leaveType &&
          leave.leaveType.toLowerCase().includes("restricted") &&
          leaveYear === currentYear
        );
      })
      .reduce((sum, leave) => {
        const days = leave.days ? parseInt(leave.days) : 0;
        return sum + (isNaN(days) ? 0 : days);
      }, 0);

    const totalLeave =
      casualLeaveTaken +
      earnedLeaveTaken +
      sickLeaveTaken +
      restrictedHolidayTaken;

    return {
      casualLeave: casualLeaveTaken,
      earnedLeave: earnedLeaveTaken,
      sickLeave: sickLeaveTaken,
      restrictedHoliday: restrictedHolidayTaken,
      totalLeave: totalLeave,
    };
  };

  const leaveStats = calculateLeaveStats();

  const getFilteredLeaves = () => {
    return leavesData.filter(leave => {
      // 1. Status Dropdown Filter
      if (statusFilter !== 'all' && leave.status?.toLowerCase() !== statusFilter.toLowerCase()) return false;

      // 2. Search Filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesType = leave.leaveType?.toLowerCase().includes(searchLower);
        const matchesReason = leave.reason?.toLowerCase().includes(searchLower);
        if (!matchesType && !matchesReason) return false;
      }

      // 3. Date Filter
      if (selectedMonth !== 'all') {
        const inPeriod = isDateInSelectedPeriod(leave.startDate, selectedMonth, selectedYear) ||
                       isDateInSelectedPeriod(leave.endDate, selectedMonth, selectedYear);
        if (!inPeriod) return false;
      }

      return true;
    });
  };

  const displayedLeaves = getFilteredLeaves();




  // ✅ Approved leave counts (only number of requests)
  const calculateApprovedLeaveCounts = () => {
    const approvedLeaves = leavesData.filter(
      leave =>
        leave.status &&
        leave.status.toLowerCase() === 'approved' &&
        leave.employeeName === user.Name &&
        (selectedMonth === 'all' ||
          isDateInSelectedPeriod(leave.startDate, selectedMonth, selectedYear) ||
          isDateInSelectedPeriod(leave.endDate, selectedMonth, selectedYear))
    );

    return {
      'Casual Leave': approvedLeaves.filter(
        leave => leave.leaveType && leave.leaveType.toLowerCase() === 'casual leave'
      ).length,
      'Earned Leave': approvedLeaves.filter(
        leave => leave.leaveType && leave.leaveType.toLowerCase() === 'earned leave'
      ).length,
    };
  };

  const approvedCounts = calculateApprovedLeaveCounts();

  // Generate month options for the dropdown
  const monthOptions = [
    { value: 'all', label: 'All Months' },
    { value: '0', label: 'January' },
    { value: '1', label: 'February' },
    { value: '2', label: 'March' },
    { value: '3', label: 'April' },
    { value: '4', label: 'May' },
    { value: '5', label: 'June' },
    { value: '6', label: 'July' },
    { value: '7', label: 'August' },
    { value: '8', label: 'September' },
    { value: '9', label: 'October' },
    { value: '10', label: 'November' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 font-outfit">
      
      {/* Simplified Header: Filter Controls and New Request Button */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        
        {/* Left Side: Title or Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by leave type or reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Right Side: Filters and Button */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
          >
            <option value="all">ALL STATUS</option>
            <option value="pending">PENDING</option>
            <option value="approved">APPROVED</option>
            <option value="rejected">REJECTED</option>
          </select>

          {/* Month/Year Filters */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded">
            <select
              value={selectedMonth}
              onChange={handleMonthChange}
              className="bg-transparent text-[10px] font-bold text-slate-500 uppercase px-2 py-1 focus:outline-none"
            >
              {monthOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <div className="w-[1px] h-3 bg-slate-200" />
            <select
              value={selectedYear}
              onChange={handleYearChange}
              className="bg-transparent text-[10px] font-bold text-slate-500 uppercase px-2 py-1 focus:outline-none"
            >
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-sm"
          >
            <Plus size={16} />
            NEW REQUEST
          </button>
        </div>
      </div>



      {/* Main Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto min-h-[530px] max-h-[calc(105vh-280px)] overflow-y-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-slate-50/50 sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/60">S.No</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/60">Type</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/60">Period</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/60">Duration</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/60">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/60">Applied On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableLoading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12">
                    <LoadingSpinner message="Syncing requests..." minHeight="300px" />
                  </td>
                </tr>
              ) : (() => {
                if (displayedLeaves.length === 0) {
                  return (
                    <tr>
                      <td colSpan="6" className="px-6 py-20 text-center">
                        <p className="text-sm font-bold text-slate-400">No records found matching your criteria</p>
                      </td>
                    </tr>
                  );
                }

                return displayedLeaves.map((request, index) => (
                  <tr key={index} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="text-[11px] font-black text-slate-400">#{request.serialNo || index + 1}</span>
                    </td>
                    <td className="px-6 py-4 font-bold text-sm text-slate-700">
                      {request.leaveType}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                        {formatDOB(request.startDate)} <span className="text-slate-300">→</span> {formatDOB(request.endDate)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-widest">{request.days} Days</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${request.status?.toLowerCase() === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                          request.status?.toLowerCase() === 'rejected' ? 'bg-rose-100 text-rose-700' :
                            'bg-amber-100 text-amber-700'
                        }`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[11px] font-bold text-slate-400">{request.timestamp?.split(' ')[0]}</span>
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-slate-100 bg-slate-50 min-h-[500px]">
          {tableLoading ? (
            <div className="p-8">
              <LoadingSpinner message="Syncing requests..." />
            </div>
          ) : (() => {
            if (displayedLeaves.length === 0) {
              return (
                <div className="p-12 text-center text-slate-400">
                  <p className="text-sm font-bold">No records found matching your criteria</p>
                </div>
              );
            }

            return displayedLeaves.map((request, index) => (
              <div key={index} className="p-4 bg-white hover:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">#{request.serialNo || index + 1}</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${request.status?.toLowerCase() === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                      request.status?.toLowerCase() === 'rejected' ? 'bg-rose-100 text-rose-700' :
                        'bg-amber-100 text-amber-700'
                    }`}>
                    {request.status}
                  </span>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 space-y-2 mb-1">
                  <p className="text-sm font-bold text-slate-900">{request.leaveType}</p>
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-500">{formatDOB(request.startDate)} - {formatDOB(request.endDate)}</span>
                    <span className="text-slate-900">{request.days} Days</span>
                  </div>
                </div>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Modern Request Modal - Matching Admin Style */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl animate-in zoom-in duration-300 overflow-hidden border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                  <Plus size={16} />
                </div>
                <h3 className="text-base font-bold text-gray-900 tracking-tight uppercase">New Request Entry</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Employee ID</label>
                  <input
                    type="text"
                    value={formData.employeeId}
                    disabled
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded text-[13px] font-medium outline-none cursor-not-allowed shadow-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Leave Type</label>
                  <select
                    name="leaveType"
                    value={formData.leaveType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded text-[13px] font-medium outline-none focus:ring-1 focus:ring-indigo-500 transition shadow-sm"
                    required
                  >
                    <option value="">Select Leave Type</option>
                    {leaveTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Start Date</label>
                  <input
                    type="date"
                    name="fromDate"
                    value={formData.fromDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded text-[13px] font-medium outline-none focus:ring-1 focus:ring-indigo-500 transition shadow-sm"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">End Date</label>
                  <input
                    type="date"
                    name="toDate"
                    value={formData.toDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded text-[13px] font-medium outline-none focus:ring-1 focus:ring-indigo-500 transition shadow-sm"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Approve By</label>
                  <select
                    name="hodName"
                    value={formData.hodName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded text-[13px] font-medium outline-none focus:ring-1 focus:ring-indigo-500 transition shadow-sm"
                    required
                  >
                    <option value="">Select Approver</option>
                    {hodNames.map((name, index) => (
                      <option key={index} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Reason / Remarks</label>
                <textarea
                  name="reason"
                  rows={3}
                  value={formData.reason}
                  onChange={handleInputChange}
                  placeholder="Provide specific absence details..."
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded text-[13px] font-medium focus:ring-1 focus:ring-indigo-500 outline-none resize-none transition-all placeholder:text-gray-300 shadow-sm"
                  required
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-50">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2 text-[11px] font-bold text-gray-500 hover:bg-gray-100 rounded transition-all uppercase tracking-widest focus:outline-none">Cancel</button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-2 bg-slate-900 text-white text-[11px] font-bold rounded hover:bg-slate-800 shadow-md shadow-slate-100 transition-all uppercase tracking-widest active:scale-95 disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Register Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveRequest;