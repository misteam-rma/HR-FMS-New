import React, { useEffect, useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
  PieChart,
  Pie,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  UserPlus,
  TrendingUp,
  Briefcase,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Gift
} from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';

const Dashboard = () => {
  const [totalEmployee, setTotalEmployee] = useState(0);
  const [activeEmployee, setActiveEmployee] = useState(0);
  const [leftEmployee, setLeftEmployee] = useState(0);
  const [leaveThisMonth, setLeaveThisMonth] = useState(0);
  const [monthlyHiringData, setMonthlyHiringData] = useState([]);
  const [designationData, setDesignationData] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [statusRatio, setStatusRatio] = useState({ active: 0, left: 0 });
  const [upcomingBirthdays, setUpcomingBirthdays] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fallback Logic
  const displayStats = {
    total: totalEmployee || 0,
    active: activeEmployee || 0,
    left: leftEmployee || 0,
    leaves: leaveThisMonth || 0
  };

  const displayMonthlyData = monthlyHiringData.length > 0 ? monthlyHiringData : [];
  const displayDeptData = departmentData.length > 0 ? departmentData : [];
  const displayDesigData = designationData.length > 0 ? designationData : [];

  const displayStatusData = useMemo(() => [
    { name: 'Active', value: statusRatio.active || 0, color: '#2563eb' },
    { name: 'Resigned', value: statusRatio.left || 0, color: '#cbd5e1' }
  ], [statusRatio]);

  // Parse DD/MM/YYYY or DD-MMM-YY format date
  const parseSheetDate = (dateStr) => {
    if (!dateStr) return null;
    
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          return new Date(year, month, day);
        }
      }
    }
    
    // Fallback for standard formats like '2-May-26' or '3-January-00'
    const parsedDate = new Date(dateStr);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
    
    return null;
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [joiningResponse, enquiryResponse] = await Promise.all([
          fetch(`${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=JOINING&action=fetch`),
          fetch(`${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=ENQUIRY&action=fetch`)
        ]);
        
        const result = await joiningResponse.json();
        const enquiryResult = await enquiryResponse.json();
        
        if (result.success && result.data && result.data.length > 6) {
          const rows = result.data.slice(6);
          // Active employees don't have a planned leaving date (row[31])
          const activeRows = rows.filter(row => !row[31] || row[31].toString().trim() === '');
          
          let fullTimeCount = 0;
          let articleCount = 0;
          let internCount = 0;
          
          let deptCounts = {};
          let desigCounts = {};
          let monthlyDataMap = {};
          let upcomingBdays = [];
          let tActive = 0;
          let tLeft = 0;

          // Initialize last 6 months for monthly chart
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const today = new Date();
          const todayAtMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

          for(let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const mName = monthNames[d.getMonth()];
            monthlyDataMap[mName] = { month: mName, hired: 0, left: 0, year: d.getFullYear(), mIndex: d.getMonth() };
          }

          rows.forEach(row => {
            const isLeft = row[31] && row[31].toString().trim() !== '';
            if (isLeft) tLeft++;
            else tActive++;

            if (!isLeft) {
              const empType = (row[3] || '').toString().toLowerCase().trim();
              if (empType.includes('full time') || empType.includes('fulltime')) fullTimeCount++;
              else if (empType.includes('article')) articleCount++;
              else if (empType.includes('intern')) internCount++;

              const dept = (row[4] || '').toString().trim();
              const desig = (row[5] || '').toString().trim();
              if (dept) deptCounts[dept] = (deptCounts[dept] || 0) + 1;
              if (desig) desigCounts[desig] = (desigCounts[desig] || 0) + 1;

              }

            // Monthly Data Processing
            const dojStr = row[19];
            if (dojStr) {
                const d = parseSheetDate(dojStr);
                if (d && monthlyDataMap[monthNames[d.getMonth()]] && monthlyDataMap[monthNames[d.getMonth()]].year === d.getFullYear()) {
                    monthlyDataMap[monthNames[d.getMonth()]].hired++;
                }
            }
            const dolStr = row[31];
            if (dolStr && isLeft) {
                const d = parseSheetDate(dolStr);
                if (d && monthlyDataMap[monthNames[d.getMonth()]] && monthlyDataMap[monthNames[d.getMonth()]].year === d.getFullYear()) {
                    monthlyDataMap[monthNames[d.getMonth()]].left++;
                }
            }
          });
          
          // Process Birthdays from ENQUIRY sheet
          if (enquiryResult.success && enquiryResult.data && enquiryResult.data.length > 6) {
            const enquiryRows = enquiryResult.data.slice(6);
            enquiryRows.forEach(row => {
              const dobStr = row[7]; // DOB is in Column H (Index 7) in ENQUIRY
              if (dobStr) {
                const d = parseSheetDate(dobStr);
                
                if (d) {
                  const bMonth = d.getMonth() + 1;
                  const bDay = d.getDate();
                  const bdayThisYear = new Date(today.getFullYear(), bMonth - 1, bDay);
                  let diffDays = Math.ceil((bdayThisYear.getTime() - todayAtMidnight.getTime()) / (1000 * 60 * 60 * 24));
                  
                  if (diffDays < 0) {
                    const bdayNextYear = new Date(today.getFullYear() + 1, bMonth - 1, bDay);
                    diffDays = Math.ceil((bdayNextYear.getTime() - todayAtMidnight.getTime()) / (1000 * 60 * 60 * 24));
                  }
                  
                  if (diffDays >= 0 && diffDays <= 5) {
                    upcomingBdays.push({
                      name: row[6] || 'Unknown', // Candidate Name is Column G (Index 6)
                      department: (row[5] || '').toString().trim(), // Department is Column F (Index 5)
                      dateStr: `${bDay} ${monthNames[bMonth - 1]}`,
                      daysLeft: diffDays,
                      photo: '' // Photo column might not be standard in ENQUIRY, leave blank to use initials
                    });
                  }
                }
              }
            });
          }
          
          // Map counts to the existing state variables to minimize changes
          setTotalEmployee(fullTimeCount); 
          setActiveEmployee(articleCount);
          setLeftEmployee(internCount);
          setLeaveThisMonth(tActive); 
          setStatusRatio({ active: tActive, left: tLeft });

          const formattedDept = Object.keys(deptCounts).map(k => ({ department: k, employees: deptCounts[k] })).sort((a,b) => b.employees - a.employees).slice(0, 6);
          setDepartmentData(formattedDept);

          const formattedDesig = Object.keys(desigCounts).map(k => ({ designation: k, employees: desigCounts[k] })).sort((a,b) => b.employees - a.employees).slice(0, 6);
          setDesignationData(formattedDesig);

          const formattedMonthly = Object.values(monthlyDataMap).sort((a, b) => {
             if(a.year !== b.year) return a.year - b.year;
             return a.mIndex - b.mIndex;
          });
          setMonthlyHiringData(formattedMonthly);

          upcomingBdays.sort((a, b) => a.daysLeft - b.daysLeft);
          setUpcomingBirthdays(upcomingBdays);
        }
      } catch (error) {
        console.error("Dashboard Fetch Error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const StatCard = ({ title, value, icon: Icon, color, trend }) => (
    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-bl-3xl -mr-4 -mt-4 transition-transform group-hover:scale-110" />
      <div className="flex justify-between items-start mb-3 relative z-10">
        <div className={`p-2 rounded-lg bg-indigo-50 transition-colors group-hover:bg-indigo-100`}>
          <Icon size={18} className="text-indigo-600" />
        </div>
        {trend && (
          <div className={`flex items-center gap-0.5 text-[10px] font-bold ${trend > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="relative z-10">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{title}</p>
        <h3 className="text-2xl font-bold text-gray-800 tracking-tight">{value}</h3>
      </div>
    </div>
  );

  if (isLoading) {
    return <LoadingSpinner message="Aggregating workforce metrics..." fullPage={true} />;
  }

  const handleGenerateReport = () => {
    window.print();
  };

  const handleExportAnalytics = () => {
    const csvRows = [];
    csvRows.push("Metric,Value");
    csvRows.push(`Total Employee (Full Time),${displayStats.total}`);
    csvRows.push(`Articles,${displayStats.active}`);
    csvRows.push(`Interns,${displayStats.left}`);
    csvRows.push(`Total Active,${displayStats.leaves}`);
    csvRows.push("");
    
    csvRows.push("Department,Employee Count");
    departmentData.forEach(d => csvRows.push(`"${d.department}",${d.employees}`));
    
    csvRows.push("");
    csvRows.push("Role,Employee Count");
    designationData.forEach(d => csvRows.push(`"${d.designation}",${d.employees}`));

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `hr_analytics_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 pb-12 font-outfit">
      {/* Welcome Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Executive Dashboard</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">Real-time workforce intelligence & metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleGenerateReport}
            className="px-3 py-1.5 bg-white border border-gray-200 rounded text-[10px] font-bold text-gray-500 uppercase tracking-wider hover:bg-gray-50 transition-all shadow-sm"
          >
            Generate Report
          </button>
          <button 
            onClick={handleExportAnalytics}
            className="px-3 py-1.5 bg-indigo-600 text-white rounded text-[10px] font-bold uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
          >
            Export Analytics
          </button>
        </div>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard 
          title="Total Employee (Full Time)" 
          value={displayStats.total} 
          icon={Briefcase} 
        />
        <StatCard 
          title="Articles" 
          value={displayStats.active} 
          icon={Users} 
        />
        <StatCard 
          title="Interns" 
          value={displayStats.left} 
          icon={UserCheck} 
        />
        <StatCard 
          title="Total Active" 
          value={displayStats.leaves} 
          icon={Layers} 
        />
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Growth Chart */}
        <div className="lg:col-span-8 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6 px-1">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-indigo-600" />
              <h2 className="text-xs font-bold text-gray-800 uppercase tracking-widest">Workforce Dynamics</h2>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayMonthlyData}>
                <defs>
                  <linearGradient id="colorHired" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#fff', fontSize: '10px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="hired" 
                  stroke="#4f46e5" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorHired)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="left" 
                  stroke="#cbd5e1" 
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  fill="transparent" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ratio Pie */}
        <div className="lg:col-span-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-6 px-1">
            <Layers size={16} className="text-indigo-600" />
            <h2 className="text-xs font-bold text-gray-800 uppercase tracking-widest">Status Ratio</h2>
          </div>
          <div className="h-64 flex flex-col items-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={displayStatusData}
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {displayStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#4f46e5' : '#e2e8f0'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend 
                  verticalAlign="bottom" 
                  height={30}
                  iconType="circle"
                  formatter={(val) => <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{val}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Dept Horizontal Bar */}
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-6 px-1">
            <Briefcase size={16} className="text-indigo-600" />
            <h2 className="text-xs font-bold text-gray-800 uppercase tracking-widest">Department Load</h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayDeptData} layout="vertical" margin={{ left: 10, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f8fafc" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="department" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false}
                  width={80}
                  tick={{fill: '#64748b', fontSize: 10, fontWeight: 700}}
                />
                <Tooltip 
                  cursor={{fill: '#f1f5f9', opacity: 0.4}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
                />
                <Bar dataKey="employees" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Role Bar Chart */}
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-6 px-1">
            <ArrowUpRight size={16} className="text-indigo-600" />
            <h2 className="text-xs font-bold text-gray-800 uppercase tracking-widest">Role Distribution</h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayDesigData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                <XAxis 
                  dataKey="designation" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 9, fontWeight: 700}}
                />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
                />
                <Bar dataKey="employees" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={32}>
                  {displayDesigData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#4f46e5' : '#e2e8f0'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Upcoming Birthdays Section */}
      <div className="mt-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-6 px-1">
          <Gift size={16} className="text-rose-500" />
          <h2 className="text-xs font-bold text-gray-800 uppercase tracking-widest">Upcoming Birthdays (Next 5 Days)</h2>
        </div>
        
        {upcomingBirthdays.length === 0 ? (
          <div className="py-8 text-center border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
             <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No birthdays in the next 5 days.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {upcomingBirthdays.map((bday, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-md transition-all group">
                 {bday.photo ? (
                    <img src={bday.photo} alt={bday.name} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                 ) : (
                    <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-black text-sm">
                       {bday.name.charAt(0)}
                    </div>
                 )}
                 <div className="overflow-hidden">
                    <p className="text-xs font-bold text-gray-900 truncate">{bday.name}</p>
                    <p className="text-[10px] font-medium text-gray-500 truncate mb-1">{bday.department || 'Staff'}</p>
                    <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                       bday.daysLeft === 0 ? 'bg-rose-500 text-white animate-pulse' : 
                       bday.daysLeft === 1 ? 'bg-orange-100 text-orange-600' : 
                       'bg-indigo-50 text-indigo-600'
                    }`}>
                       {bday.daysLeft === 0 ? 'Today!' : bday.daysLeft === 1 ? 'Tomorrow' : `In ${bday.daysLeft} days (${bday.dateStr})`}
                    </span>
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;