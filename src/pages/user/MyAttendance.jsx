import { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, MapPin } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';

const MyAttendance = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [userAttendanceData, setUserAttendanceData] = useState([]);

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
        `${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=Attendance&action=fetch`
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

  useEffect(() => {
    fetchAttendanceData();
  }, []);

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

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 font-outfit">
      
      {/* Header Container */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Attendance History</h1>
           <p className="text-slate-500 text-sm font-medium">Track your presence and work duration logs.</p>
        </div>
        <div className="flex items-center gap-3">
             <select
               value={selectedMonth}
               onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
               className="px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm"
             >
               {months.map((month, index) => (
                 <option key={index} value={index}>{month.toUpperCase()}</option>
               ))}
             </select>
             <select
               value={selectedYear}
               onChange={(e) => setSelectedYear(parseInt(e.target.value))}
               className="px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm"
             >
               {years.map(year => (
                 <option key={year} value={year}>{year}</option>
               ))}
             </select>
         </div>
      </div>

      {/* Modern Statistics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Logs', value: filteredAttendance.length, icon: Calendar, color: 'blue' },
          { label: 'Present', value: presentDays, icon: CheckCircle, color: 'emerald' },
          { label: 'Absent', value: absentDays, icon: XCircle, color: 'rose' },
          { label: 'Hrs Worked', value: totalWorkingHours.toFixed(1), icon: Clock, color: 'indigo' },
          { label: 'Overtime', value: totalOvertime.toFixed(1), icon: Clock, color: 'amber' }
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm transition-all hover:shadow-md flex flex-col gap-2">
               <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${stat.color}-50 text-${stat.color}-600 mb-2`}>
                  <Icon size={20} />
               </div>
               <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
               <p className="text-3xl font-black text-slate-900 leading-none">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Unified Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        <div className="px-6 py-4 border-b border-slate-200/60 bg-slate-50/50 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
           <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Attendance Logs</h2>
           <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-3 py-1.5 rounded-full uppercase tracking-widest">Real-time Sync</span>
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
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/50 sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/60">Date</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/60">Info</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/60">Punch In/Out</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/60">Location</th>
                  <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/60">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filteredAttendance.length > 0 ? filteredAttendance.map((record, index) => {
                  const color = getStatusColor(record.Status);
                  return (
                    <tr key={index} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm font-bold text-slate-800">{record.Date || '-'}</p>
                        <span className={`mt-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter bg-${color}-50 text-${color}-600 inline-block`}>
                          {record.Status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">{record.Dept || 'NA'}</p>
                        <p className="text-[10px] font-medium text-slate-400 uppercase">{record.Type || 'NA'}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                           <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-slate-400 w-6">IN:</span>
                              <span className="text-xs font-bold text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-100">{record['Check In'] || '--:--'}</span>
                           </div>
                           <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-slate-400 w-6">OUT:</span>
                              <span className="text-xs font-bold text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-100">{record['Check Out'] || '--:--'}</span>
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 max-w-[200px]">
                           <p className="text-[11px] font-bold text-slate-600 line-clamp-1 truncate">{record.Location || 'NA'}</p>
                           {record.Link && (
                             <a 
                               href={record.Link} 
                               target="_blank" 
                               rel="noopener noreferrer" 
                               className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 flex items-center gap-1"
                             >
                               <MapPin size={10} /> View Map
                             </a>
                           )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex flex-col items-end gap-2">
                           <span className="px-3 py-1.5 bg-slate-100 rounded-full text-[10px] font-black text-slate-600 uppercase tracking-widest leading-none">
                             {record['Working Hours'] || '0.0'} HRS
                           </span>
                           {record.Photo && (
                             <button 
                               onClick={() => window.open(record.Photo, '_blank')}
                               className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-[10px] font-bold hover:bg-indigo-700 transition-colors uppercase tracking-widest shadow-sm shadow-indigo-100"
                             >Selfie</button>
                           )}
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan="5" className="px-6 py-20 text-center text-slate-400 text-sm font-bold">No records found for this period.</td></tr>
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