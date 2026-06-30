import React, { useState, useEffect } from 'react';
import { Search, Calendar, Filter, MoreVertical } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';

const Payroll = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState(""); // Changed to empty string by default
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [payrollData, setPayrollData] = useState([]);
  const [notification, setNotification] = useState(null);
  const [filters, setFilters] = useState({
    department: "",
    status: "",
    employmentType: "",
    location: "",
  });

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch data from Google Sheets using the provided AppScript URL
        const response = await fetch(
          `${"https://script.google.com/macros/s/AKfycbwGN0L4CqcZdhgie3l94KGGjWHqaL_cHRgwtw1CCUZy6yqpF5lFlFNBbO10dEm7BNK6FQ/exec"}?sheet=Payroll&action=fetch`
        );
        const data = await response.json();

        if (data && data.success && data.data) {
          // Extract headers and data rows
          const headers = data.data[0];
          const rows = data.data.slice(1);

          // Transform the data to match our structure
          const transformedData = rows.map((row) => ({
            serialNo: row[0] || "",
            employeeCode: row[1] || "",
            employeeName: row[2] || "",
            designation: row[3] || "",
            daysPresent: row[4] || 0,
            totalActual: parseFloat(row[5]) || 0,
            basic: parseFloat(row[6]) || 0,
            conveyance: parseFloat(row[7]) || 0,
            hra: parseFloat(row[8]) || 0,
            medicalAllowance: parseFloat(row[9]) || 0,
            specialAllowance: parseFloat(row[10]) || 0,
            otherAllowances: parseFloat(row[11]) || 0,
            loan: parseFloat(row[12]) || 0,
            additionalSalary: parseFloat(row[13]) || 0,
            toBePaidAfterPF: parseFloat(row[14]) || 0,
            year: row[15] || "",
            month: row[16] || "",
          }));

          setPayrollData(transformedData);
        } else {
          throw new Error(data.error || "Failed to fetch data");
        }
      } catch (error) {
        setError(error.message);
        showNotification(`Failed to load data: ${error.message}`, "error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: value,
    }));
  };

  // Filter data based on search term and selected period
  const filteredData = payrollData.filter((item) => {
    // Filter by search term
    const matchesSearch =
      item.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.year.toString().includes(searchTerm) ||
      item.month.toString().toLowerCase().includes(searchTerm.toLowerCase());

    // Filter by selected period
    let matchesPeriod = true;
    if (selectedPeriod) {
      const [selectedYear, selectedMonthNum] = selectedPeriod.split('-');
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const selectedMonthName = monthNames[parseInt(selectedMonthNum) - 1];
      matchesPeriod = item.year.toString() === selectedYear &&
        item.month.toString() === selectedMonthName;
    }

    return matchesSearch && matchesPeriod;
  });

  const getStatusColor = (paid) => {
    if (paid > 0) return 'emerald';
    return 'rose';
  };

  return (
    <div className="space-y-3 md:pb-4 mb-4 font-outfit">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Payroll Management</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Financial and compensation tracking</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, ID or month..."
            className="w-full pl-9 pr-4 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs sm:text-sm transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="month"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="pl-9 pr-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs font-bold text-gray-600 bg-white shadow-sm transition-all"
            />
          </div>
          <select
            value={filters.department}
            onChange={(e) => handleFilterChange("department", e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-xs font-bold text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 outline-none bg-white shadow-sm"
          >
            <option value="">ALL DEPTS</option>
            {[...new Set(payrollData.map(item => item.department).filter(Boolean))].sort().map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content Card with Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-indigo-600" />
            <h2 className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">Employee Payroll Log</h2>
          </div>
          <span className="text-[10px] font-bold text-gray-400 bg-white px-2 py-0.5 rounded border border-gray-100 uppercase tracking-tighter">
            {filteredData.length} Records
          </span>
        </div>

        <div className="p-0">
          {loading ? (
            <LoadingSpinner message="Calculating compensation data..." minHeight="300px" />
          ) : error ? (
             <div className="px-6 py-12 text-center">
              <p className="text-rose-500 text-xs font-bold mb-2">Error: {error}</p>
              <button onClick={() => window.location.reload()} className="px-3 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded text-xs font-bold shadow-sm">Retry Sync</button>
            </div>
          ) : (
            <div className="overflow-x-auto no-scrollbar">
              {/* Desktop Table (Horizontal Scrollable) */}
              <div className="hidden md:block">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50/50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Employee</th>
                      <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Attendance</th>
                      <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Base Payout</th>
                      <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Allowances</th>
                      <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Deductions</th>
                      <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-indigo-50/50">Net Paid</th>
                      <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Period</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 bg-white">
                    {filteredData.length > 0 ? (
                      filteredData.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50/50 transition-colors group border-l-2 border-transparent hover:border-indigo-500">
                          <td className="px-4 py-2 whitespace-nowrap">
                            <p className="text-xs font-bold text-gray-800">{item.employeeName}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{item.employeeCode} | {item.designation}</p>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold lowercase tracking-tighter">{item.daysPresent} present</span>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-[11px] font-medium text-gray-600">
                            ₹{item.basic.toLocaleString()} <span className="text-[9px] text-gray-300">Basic</span>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-emerald-600">₹{(item.medicalAllowance + item.hra + item.conveyance + item.specialAllowance + item.otherAllowances).toLocaleString()}</span>
                              <span className="text-[8px] text-gray-400 lowercase tracking-tighter">Total Adj.</span>
                            </div>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-[10px] font-bold text-rose-500">
                            -₹{item.loan.toLocaleString()}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap bg-indigo-50/20 shadow-inner group-hover:bg-indigo-50/40">
                             <span className="text-xs font-bold text-indigo-700 tracking-tight">₹{item.toBePaidAfterPF.toLocaleString()}</span>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                            {item.month} {item.year}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="7" className="px-4 py-12 text-center text-gray-400 text-xs">No payroll records found for criteria.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="md:hidden divide-y divide-gray-100">
                {filteredData.length > 0 ? (
                  filteredData.map((item, index) => (
                    <div key={index} className="p-3 space-y-2">
                       <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold text-gray-800 leading-tight">{item.employeeName}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5 tracking-tighter">{item.employeeCode} | {item.designation}</p>
                        </div>
                        <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-bold">{item.daysPresent}D</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 bg-gray-50/50 p-2 rounded border border-gray-100">
                        <div className="space-y-0.5">
                          <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Base Salary</p>
                          <p className="text-[11px] font-bold text-gray-700">₹{item.basic.toLocaleString()}</p>
                        </div>
                        <div className="text-right space-y-0.5 border-l border-gray-200 pl-2">
                          <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Net Payable</p>
                          <p className="text-xs font-bold text-indigo-600">₹{item.toBePaidAfterPF.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-tighter text-gray-300">
                        <span>Period: {item.month} {item.year}</span>
                        <div className="flex gap-2">
                          <span className="text-rose-400">Ded: ₹{item.loan}</span>
                          <span className="text-emerald-400">All: ₹{(item.medicalAllowance + item.hra + item.conveyance + item.specialAllowance + item.otherAllowances)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-400 text-[10px] font-bold uppercase">No records found.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Payroll;