import React, { useState } from 'react';
import { Search, Download, Filter, Calendar, Clock, UserCheck, UserX, BarChart3, MessageCircle } from 'lucide-react';

const Report = () => {
  const [activeReport, setActiveReport] = useState('attendanceDayEnd');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [filters, setFilters] = useState({
    department: '',
    employee: ''
  });

  const reportHeaders = {
    attendanceDayEnd: 'Attendance Day End Report',
    attendanceAnalysis: 'Attendance Analysis Report',
    monthlyAttendance: 'Monthly Attendance Report',
    whatsappDayEnd: 'WhatsApp Day End Report',
    leaveReport: 'Leave Report',
    lateCutoff: 'Late & Early Cutoff Report',
    overtimeReport: 'Overtime Report'
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const StatusBadge = ({ status, type }) => {
    const colors = {
      present: 'bg-emerald-100 text-emerald-700',
      late: 'bg-amber-100 text-amber-700',
      absent: 'bg-rose-100 text-rose-700',
      delivered: 'bg-emerald-100 text-emerald-700',
      pending: 'bg-amber-100 text-amber-700',
      approved: 'bg-emerald-100 text-emerald-700',
      rejected: 'bg-rose-100 text-rose-700',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest shadow-sm ${colors[status.toLowerCase()] || 'bg-gray-100 text-gray-700'}`}>
        {status}
      </span>
    );
  };

  const renderReportContent = () => {
    switch (activeReport) {
      case 'attendanceDayEnd':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: "Present", value: 142, icon: UserCheck, color: "emerald" },
                { label: "Late", value: 8, icon: Clock, color: "amber" },
                { label: "Absent", value: 15, icon: UserX, color: "rose" }
              ].map((stat) => (
                <div key={stat.label} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <stat.icon size={14} className={`text-${stat.color}-600`} />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</span>
                  </div>
                  <p className="text-xl font-bold text-gray-800 leading-none">{stat.value}</p>
                </div>
              ))}
            </div>
            
            <div className="bg-white rounded-lg border border-gray-100 overflow-hidden shadow-sm">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Employee</th>
                    <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Check-In</th>
                    <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Check-Out</th>
                    <th className="px-4 py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[
                    { id: 'EMP001', name: 'John Doe', in: '09:05 AM', out: '06:15 PM', status: 'Present' },
                    { id: 'EMP002', name: 'Jane Smith', in: '09:25 AM', out: '06:05 PM', status: 'Late' },
                    { id: 'EMP003', name: 'Robert Johnson', in: '-', out: '-', status: 'Absent' }
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-2 whitespace-nowrap">
                        <p className="text-xs font-bold text-gray-800">{row.name}</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase">{row.id}</p>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-[11px] font-medium text-gray-600">{row.in}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-[11px] font-medium text-gray-600">{row.out}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-center">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'attendanceAnalysis':
        return (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Attendance Trends</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Weekly activity overview</p>
                </div>
                <div className="flex gap-1">
                  <button className="text-[10px] font-bold px-2 py-1 bg-indigo-50 text-indigo-700 rounded border border-indigo-100">THIS WEEK</button>
                  <button className="text-[10px] font-bold px-2 py-1 text-gray-400 hover:bg-gray-50 rounded">THIS MONTH</button>
                </div>
              </div>
              <div className="h-48 bg-gray-50 border border-dashed border-gray-200 rounded-lg flex items-center justify-center group overflow-hidden relative">
                <BarChart3 size={32} className="text-gray-300 group-hover:scale-110 transition-transform" />
                <span className="ml-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Interactive Visualization Container</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-50 pb-2">Departmental Leaderboard</h4>
                <div className="space-y-2">
                  {[
                    { name: 'Engineering', val: '96%' },
                    { name: 'Sales', val: '92%' },
                    { name: 'Marketing', val: '89%' }
                  ].map((dept) => (
                    <div key={dept.name} className="flex justify-between items-center group">
                      <span className="text-xs font-bold text-gray-700">{dept.name}</span>
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{dept.val}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-50 pb-2">Policy Violations (Late)</h4>
                <div className="space-y-2">
                  {[
                    { name: 'Michael Brown', val: '8X' },
                    { name: 'Sarah Wilson', val: '6X' },
                    { name: 'David Lee', val: '5X' }
                  ].map((emp) => (
                    <div key={emp.name} className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-700">{emp.name}</span>
                      <span className="text-xs font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">{emp.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      case 'monthlyAttendance':
        return (
          <div className="bg-white rounded-lg border border-gray-100 overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Employee</th>
                  <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</th>
                  <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Present</th>
                  <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Absent</th>
                  <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Leaves</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  { name: 'John Doe', tot: 22, p: 20, a: 1, l: 1 },
                  { name: 'Jane Smith', tot: 22, p: 19, a: 0, l: 3 }
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-2 whitespace-nowrap text-xs font-bold text-gray-800">{row.name}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-[11px] font-medium text-gray-600">{row.tot}D</td>
                    <td className="px-4 py-2 whitespace-nowrap text-[11px] font-bold text-emerald-600">{row.p}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-[11px] font-bold text-rose-600">{row.a}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-[11px] font-bold text-amber-600">{row.l}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'whatsappDayEnd':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Messages Sent</p>
                <p className="text-xl font-bold text-indigo-700 leading-none mt-1">142</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Acks Recv.</p>
                <p className="text-xl font-bold text-emerald-600 leading-none mt-1">128 <span className="text-[9px] text-gray-300 font-bold">(90%)</span></p>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 overflow-hidden shadow-sm">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Employee</th>
                    <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sent Time</th>
                    <th className="px-4 py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[
                    { name: 'John Doe', time: '06:15 PM', status: 'Delivered' },
                    { name: 'Jane Smith', time: '06:15 PM', status: 'Pending' }
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-2 whitespace-nowrap text-xs font-bold text-gray-800">{row.name}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-[11px] text-gray-600">{row.time}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-center">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'leaveReport':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Total Req.", val: 24, c: "indigo" },
                { label: "Approved", val: 18, c: "emerald" },
                { label: "Rejected", val: 3, c: "rose" },
                { label: "Pending", val: 3, c: "amber" }
              ].map(s => (
                <div key={s.label} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{s.label}</p>
                  <p className={`text-xl font-bold text-${s.c}-600 leading-none mt-1`}>{s.val}</p>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-lg border border-gray-100 overflow-hidden shadow-sm">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Employee</th>
                    <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Type</th>
                    <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Period</th>
                    <th className="px-4 py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[
                    { name: 'John Doe', type: 'Sick', range: '15/09 - 16/09', status: 'Approved' },
                    { name: 'Jane Smith', type: 'Annual', range: '20/09 - 22/09', status: 'Pending' }
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-2 whitespace-nowrap text-xs font-bold text-gray-800">{row.name}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-[10px] font-bold text-gray-500 uppercase">{row.type}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-[10px] font-medium text-gray-400">{row.range}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-center">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'lateCutoff':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-3 px-1">
                <Clock className="text-rose-500" size={14} />
                <h4 className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">Late Arrivals Today</h4>
              </div>
              <div className="space-y-2">
                {[
                  { name: 'John Doe', id: 'EMP001', time: '09:25 AM', diff: '25m late' },
                  { name: 'Jane Smith', id: 'EMP002', time: '09:35 AM', diff: '35m late' }
                ].map((row, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-gray-50/50 rounded border border-gray-100">
                    <div>
                      <p className="text-xs font-bold text-gray-800">{row.name}</p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase">{row.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-rose-600">{row.time}</p>
                      <p className="text-[9px] text-rose-400 font-bold uppercase">{row.diff}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-3 px-1">
                <Clock className="text-amber-500" size={14} />
                <h4 className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">Early Departures Today</h4>
              </div>
               <div className="space-y-2">
                {[
                  { name: 'Robert Johnson', id: 'EMP003', time: '05:15 PM', diff: '45m early' },
                  { name: 'Sarah Wilson', id: 'EMP004', time: '05:25 PM', diff: '35m early' }
                ].map((row, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-gray-50/50 rounded border border-gray-100">
                    <div>
                      <p className="text-xs font-bold text-gray-800">{row.name}</p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase">{row.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-amber-600">{row.time}</p>
                      <p className="text-[9px] text-amber-400 font-bold uppercase">{row.diff}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'overtimeReport':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { l: "Total OT", v: "42.5h", c: "indigo" },
                { l: "OT Employees", v: "18", c: "emerald" },
                { l: "Avg OT", v: "2.3h", c: "amber" },
                { l: "Peak OT", v: "8.5h", c: "rose" }
              ].map(s => (
                <div key={s.l} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{s.l}</p>
                  <p className={`text-xl font-bold text-${s.c}-600 leading-none mt-1`}>{s.v}</p>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-lg border border-gray-100 overflow-hidden shadow-sm">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Employee</th>
                    <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Regular</th>
                    <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">OT Hours</th>
                    <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                   {[
                    { name: 'John Doe', reg: '8h', ot: '2.5h', tot: '10.5h' },
                    { name: 'Jane Smith', reg: '8h', ot: '3h', tot: '11h' }
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-2 whitespace-nowrap text-xs font-bold text-gray-800">{row.name}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-[11px] text-gray-500">{row.reg}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-[11px] font-bold text-indigo-600">{row.ot}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-[11px] font-bold text-gray-700">{row.tot}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      default:
        return <div className="p-8 text-center text-gray-400 text-[10px] font-bold uppercase">Select a specific report type above</div>;
    }
  };

  return (
    <div className="space-y-3 md:pb-4 mb-4 font-outfit">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-2 sm:px-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Reports Dashboard</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Operational analytics and monitoring</p>
        </div>
        <button className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md text-[11px] font-bold uppercase tracking-widest shadow-sm hover:bg-indigo-700 transition-all shadow-indigo-100">
          <Download size={14} className="mr-1.5" />
          Export Report
        </button>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex flex-col xl:flex-row xl:items-center justify-between gap-3 mx-2 sm:mx-0">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search report logs..."
            className="w-full pl-9 pr-4 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs sm:text-sm"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-gray-50/50 border border-gray-200 rounded-md px-2 py-1 gap-2">
            <Calendar size={14} className="text-gray-400" />
            <input
              type="date"
              name="start"
              value={dateRange.start}
              onChange={handleDateChange}
              className="bg-transparent text-[10px] font-bold text-gray-600 focus:outline-none uppercase"
            />
            <span className="text-[9px] font-bold text-gray-300">TO</span>
            <input
              type="date"
              name="end"
              value={dateRange.end}
              onChange={handleDateChange}
              className="bg-transparent text-[10px] font-bold text-gray-600 focus:outline-none uppercase"
            />
          </div>
          
          <select
            name="department"
            value={filters.department}
            onChange={handleFilterChange}
            className="bg-white border border-gray-300 rounded-md px-2 py-1.5 text-[10px] font-bold text-gray-600 uppercase focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">ALL DEPTS</option>
            <option value="engineering">ENGINEERING</option>
            <option value="sales">SALES</option>
            <option value="marketing">MARKETING</option>
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mx-2 sm:mx-0">
        <div className="border-b border-gray-100 bg-gray-50/30">
          <nav className="flex px-2 overflow-x-auto no-scrollbar scroll-smooth">
            {[
              { id: 'attendanceDayEnd', label: 'Day End' },
              { id: 'attendanceAnalysis', label: 'Analysis' },
              { id: 'monthlyAttendance', label: 'Monthly' },
              { id: 'whatsappDayEnd', label: 'WhatsApp' },
              { id: 'leaveReport', label: 'Leaves' },
              { id: 'lateCutoff', label: 'Exceptions' },
              { id: 'overtimeReport', label: 'Overtime' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveReport(tab.id)}
                className={`py-3 px-4 font-bold text-[10px] uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
                  activeReport === tab.id 
                    ? 'border-indigo-600 text-indigo-700' 
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-3 border-b border-gray-50 bg-white/50 flex items-center justify-between">
          <h2 className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">{reportHeaders[activeReport]}</h2>
          <span className="text-[9px] font-bold text-indigo-600 space-x-1 cursor-pointer hover:font-black transition-all">REFRESH DATA</span>
        </div>

        <div className="p-4">
          {renderReportContent()}
        </div>
      </div>
    </div>
  );
};

export default Report;