import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { IndianRupee, TrendingUp, Download, Eye, Banknote, CalendarDays, Wallet } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';

const MySalary = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [salaryData, setSalaryData] = useState([]);
  const [error, setError] = useState(null);

  //  Filter salary by selected year
  const filteredSalary = salaryData.filter(record => {
    return record.year.includes(selectedYear.toString());
  });

  const fetchSalaryData = async () => {
    setLoading(true);
    setTableLoading(true);
    setError(null);

    try {
      // Get user info from localStorage
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const employeeId = localStorage.getItem("employeeId")
      const employeeName = user?.Name;

      if (!employeeId || !employeeName) {
        throw new Error("User info missing in localStorage");
      }

      const response = await fetch(
        `${"https://script.google.com/macros/s/AKfycbwGN0L4CqcZdhgie3l94KGGjWHqaL_cHRgwtw1CCUZy6yqpF5lFlFNBbO10dEm7BNK6FQ/exec"}?sheet=Salary&action=fetch`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch salary data');
      }

      const rawData = result.data || result;

      if (!Array.isArray(rawData)) {
        throw new Error('Expected array data not received');
      }

      // Skip header row
      const dataRows = rawData.length > 1 ? rawData.slice(1) : [];

      // Map rows to structured data - PROPERLY CONVERT STRINGS TO NUMBERS
      const processedData = dataRows
        .map((row, index) => {
          // Helper function to safely convert to number
          const toNumber = (value) => {
            if (typeof value === 'number') return value;
            if (typeof value === 'string') {
              // Remove commas and any non-numeric characters except decimal point
              const cleaned = value.replace(/[^\d.]/g, '');
              return parseFloat(cleaned) || 0;
            }
            return 0;
          };

          return {
            id: index + 1,
            timestamp: row[0] || '',
            employeeId: row[1] || '',
            employeeName: row[2] || '',
            year: row[3] || '',
            month: row[4] || '',
            basicSalary: toNumber(row[5]),
            allowances: toNumber(row[6]),
            overtime: toNumber(row[7]),
            deductions: toNumber(row[8]),
            netSalary: toNumber(row[9]),
            status: row[10] || '',
            payDate: row[11] || '',
          };
        })
        .filter(item =>
          item.employeeId === employeeId && item.employeeName === employeeName
        );

      setSalaryData(processedData);

    } catch (error) {
      console.error('Error fetching salary data:', error);
      setError(error.message);
      toast.error(`Failed to load salary data: ${error.message}`);
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchSalaryData();
  }, []);

  // Calculate yearly statistics
  const totalEarnings = filteredSalary.reduce((sum, record) => {
    const netSalary = typeof record.netSalary === 'string'
      ? parseFloat(record.netSalary.replace(/[^\d.]/g, '')) || 0
      : record.netSalary || 0;
    return sum + netSalary;
  }, 0);

  const averageSalary = filteredSalary.length > 0 ? totalEarnings / filteredSalary.length : 0;

  const totalDeductions = filteredSalary.reduce((sum, record) => {
    const deductions = typeof record.deductions === 'string'
      ? parseFloat(record.deductions.replace(/[^\d.]/g, '')) || 0
      : record.deductions || 0;
    return sum + deductions;
  }, 0);

  const totalOvertime = filteredSalary.reduce((sum, record) => {
    const overtime = typeof record.overtime === 'string'
      ? parseFloat(record.overtime.replace(/[^\d.]/g, '')) || 0
      : record.overtime || 0;
    return sum + overtime;
  }, 0);

  const years = [2023, 2024, 2025, 2026];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 font-outfit">
      {/* Header Container */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Salary</h1>
           <p className="text-slate-500 text-sm font-medium">View your payroll and compensation history</p>
        </div>
      </div>

      {/* Unified Filter Toolbar */}
      <div className="bg-white/60 backdrop-blur-xl p-4 flex items-center justify-between gap-4 rounded-3xl border border-slate-200/60 shadow-sm w-full md:w-auto self-start">
         <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                 <CalendarDays size={16} className="text-slate-400" />
                 <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Financial Year</span>
             </div>
             <select
               value={selectedYear}
               onChange={(e) => setSelectedYear(parseInt(e.target.value))}
               className="w-full md:w-32 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm"
             >
               {years.map(year => (
                 <option key={year} value={year}>{year}</option>
               ))}
             </select>
         </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Earnings', value: totalEarnings, icon: IndianRupee, color: 'emerald' },
          { label: 'Avg Monthly', value: averageSalary, icon: TrendingUp, color: 'blue' },
          { label: 'Total Deductions', value: totalDeductions, icon: Wallet, color: 'rose' },
          { label: 'Overtime Earnings', value: totalOvertime, icon: Banknote, color: 'amber' }
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm transition-all hover:shadow-md flex items-center justify-between gap-4">
               <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                  <h3 className="text-2xl font-black text-slate-900 mt-1">₹{Math.round(stat.value).toLocaleString()}</h3>
               </div>
               <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-${stat.color}-50 text-${stat.color}-600 shrink-0 shadow-sm`}>
                  <Icon size={24} />
               </div>
            </div>
          );
        })}
      </div>

      {/* Salary Breakdown Chart (Latest Month) */}
      {filteredSalary.length > 0 && !tableLoading && (
        <div className="bg-slate-900 rounded-3xl shadow-lg shadow-slate-200 p-6 flex flex-col md:flex-row items-center gap-6">
          <div className="md:w-1/3">
             <h2 className="text-xl font-bold text-white tracking-tight leading-tight">Latest Breakdown</h2>
             <p className="text-sm text-indigo-200 font-medium mb-1">For {filteredSalary[0].month}</p>
             <div className="inline-block px-3 py-1 bg-white/10 rounded-full border border-white/10 mt-3">
                <span className="text-2xl font-black text-white">₹{filteredSalary[0].netSalary.toLocaleString()}</span>
                <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest ml-2">Net Pay</span>
             </div>
          </div>
          <div className="md:w-2/3 w-full grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
               { label: 'Basic Salary', value: filteredSalary[0].basicSalary, color: 'text-emerald-400' },
               { label: 'Allowances', value: filteredSalary[0].allowances, color: 'text-blue-400' },
               { label: 'Overtime', value: filteredSalary[0].overtime, color: 'text-amber-400' },
               { label: 'Deductions', value: filteredSalary[0].deductions, color: 'text-rose-400' }
            ].map((item, idx) => (
                <div key={idx} className="bg-white/5 rounded-2xl border border-white/10 p-4">
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{item.label}</p>
                   <p className={`text-lg font-black ${item.color}`}>₹{item.value.toLocaleString()}</p>
                </div>
            ))}
          </div>
        </div>
      )}

      {/* Salary Records Table */}
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
         <div className="px-6 py-4 border-b border-slate-200/60 bg-slate-50/50 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Payslip Archive</h2>
            <span className="text-[10px] font-black text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-100 uppercase">Records for {selectedYear}</span>
         </div>
          
         <div className="overflow-x-auto min-h-[300px] max-h-[calc(105vh-280px)] overflow-y-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left border-collapse">
              <thead className="bg-slate-50/50 sticky top-0 z-10 backdrop-blur-sm shadow-sm md:shadow-none">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/60">Period</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/60">Basic</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/60">Allowances</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/60">Overtime</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/60">Deductions</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/60">Net Pay</th>
                  <th className="px-6 py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/60">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {tableLoading ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12">
                      <LoadingSpinner message="Retrieving salary statements..." />
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center flex flex-col items-center justify-center min-h-[200px]">
                      <p className="text-rose-500 text-sm font-bold mb-3">{error}</p>
                      <button onClick={fetchSalaryData} className="px-5 py-2.5 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-100 transition-colors uppercase tracking-widest shadow-sm">Retry Request</button>
                    </td>
                  </tr>
                ) : filteredSalary.length > 0 ? filteredSalary.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                       <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{record.month}</p>
                       <p className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1 uppercase tracking-tight">
                         <CalendarDays size={10} /> 
                         {record.payDate ? new Date(record.payDate).toLocaleDateString() : 'N/A'}
                       </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-600">
                      ₹{record.basicSalary.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold shadow-sm inline-block min-w-[60px] text-center border border-blue-100">
                         +{record.allowances.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded text-xs font-bold shadow-sm inline-block min-w-[60px] text-center border border-amber-100">
                         +{record.overtime.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="bg-rose-50 text-rose-700 px-2 py-1 rounded text-xs font-bold shadow-sm inline-block min-w-[60px] text-center border border-rose-100">
                         -{record.deductions.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-sm font-black shadow-sm inline-block border border-slate-700">
                         ₹{record.netSalary.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm inline-block w-[80px] text-center ${record.status === 'Paid'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                        }`}>
                        {record.status || 'Pending'}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="8" className="px-6 py-20 text-center text-slate-400 font-bold text-sm">
                      No salary records found for {selectedYear}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
      </div>
    </div>
  );
};

export default MySalary;