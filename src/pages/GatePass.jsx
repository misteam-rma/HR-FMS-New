import React, { useState, useEffect } from 'react';
import { Search, X, Check, Clock, Calendar, Plus, Image } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';

const GatePass = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingPasses, setPendingPasses] = useState([]);
  const [approvedPasses, setApprovedPasses] = useState([]);
  const [rejectedPasses, setRejectedPasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [actionInProgress, setActionInProgress] = useState(null);
  const [hodNames, setHodNames] = useState([]);

  // New state for gate pass request modal
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({
    employeeId: '',
    employeeName: '',
    department: '',
    visitPlace: '',
    visitReason: '',
    departureTime: '',
    arrivalTime: '',
    hodName: '',
    whatsappNumber: '',
    gatePassImage: null,
  });

  const SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

  useEffect(() => {
    fetchGatePassData();
    fetchEmployees();
    fetchHodNames();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${SCRIPT_URL}?sheet=JOINING&action=fetch`);
      const result = await response.json();

      if (result.success) {
        if (result.data && result.data.length > 1) {
          const employeeData = result.data.slice(1).map(row => ({
            id: row[1] || '', // Employee ID from Column B
            name: row[2] || '', // Name from Column C
            department: row[20] || '', // Department from Column U
            whatsappNumber: row[11] || '' // WhatsApp from Column L
          })).filter(emp => emp.id && emp.name);

          setEmployees(employeeData);
        } else {
          // No data in sheet, set empty array
          setEmployees([]);
        }
      } else {
        toast.error('Failed to load employee data');
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
      toast.error(`Failed to load employee data: ${error.message}`);
    }
  };

  const fetchHodNames = async () => {
    try {
      const response = await fetch(`${SCRIPT_URL}?sheet=Master&action=fetch`);
      const result = await response.json();

      if (result.success) {
        if (result.data && result.data.length > 0) {
          // Extract HOD names from Column A (index 0)
          const hodNames = result.data.slice(1).map(row => row[0]).filter(name => name);
          setHodNames(hodNames);
        } else {
          // No data in sheet, set default names
          setHodNames(['Deepak', 'Vikas', 'Dharam', 'Pratap', 'Aubhav']);
        }
      } else {
        toast.error('Failed to load HOD data');
        setHodNames(['Deepak', 'Vikas', 'Dharam', 'Pratap', 'Aubhav']);
      }
    } catch (error) {
      console.error('Error fetching HOD data:', error);
      toast.error(`Failed to load HOD data: ${error.message}`);
      setHodNames(['Deepak', 'Vikas', 'Dharam', 'Pratap', 'Aubhav']);
    }
  };

  const fetchGatePassData = async () => {
    setLoading(true);
    setTableLoading(true);
    setError(null);

    try {
      const response = await fetch(`${SCRIPT_URL}?sheet=Gate%20Pass&action=fetch`);
      const result = await response.json();

      if (result.success) {
        if (result.data && result.data.length > 1) {
          const gatePassData = result.data.slice(1).map(row => ({
            serialNo: row[1] || '', // Column B
            employeeId: row[2] || '', // Column D
            employeeName: row[3] || '', // Column C
            department: row[4] || '', // Column E
            visitPlace: row[5] || '', // Column F
            visitReason: row[5] || '', // Column F (combined with place)
            departureTime: row[6] || '', // Column G
            arrivalTime: row[7] || '', // Column H
            hodName: row[8] || '', // Column I
            whatsappNumber: row[9] || '', // Column J
            gatePassImage: row[10] || '', // Column K
            status: row[11] || 'pending' // Column L
          }));


          setPendingPasses(gatePassData.filter(pass => pass.status === 'pending'));
          setApprovedPasses(gatePassData.filter(pass => pass.status === 'approved'));
          setRejectedPasses(gatePassData.filter(pass => pass.status === 'rejected'));
        } else {
          // No data in sheet, set empty arrays
          setPendingPasses([]);
          setApprovedPasses([]);
          setRejectedPasses([]);
        }
      } else {
        toast.error('Failed to load gate pass data');
      }
    } catch (error) {
      console.error('Error fetching gate pass data:', error);
      setError(error.message);
      toast.error(`Failed to load gate pass data: ${error.message}`);
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };


  const handleCheckboxChange = (passId, rowData) => {
    if (selectedRow?.serialNo === passId) {
      setSelectedRow(null);
    } else {
      setSelectedRow(rowData);
    }
  };

  // Handle employee selection
  const handleEmployeeChange = (selectedName) => {
    const selectedEmployee = employees.find(emp => emp.name === selectedName);
    setFormData(prev => ({
      ...prev,
      employeeName: selectedName,
      employeeId: selectedEmployee ? selectedEmployee.id : '',
      department: selectedEmployee ? selectedEmployee.department : '',
      whatsappNumber: selectedEmployee ? selectedEmployee.whatsappNumber : ''
    }));
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'employeeName') {
      handleEmployeeChange(value);
    } else if (name === 'gatePassImage') {
      setFormData(prev => ({
        ...prev,
        [name]: e.target.files[0]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Get next serial number
  const getNextSerialNo = () => {
    if (pendingPasses.length === 0 && approvedPasses.length === 0 && rejectedPasses.length === 0) {
      return '1';
    }

    const allPasses = [...pendingPasses, ...approvedPasses, ...rejectedPasses];
    const serialNumbers = allPasses
      .map(pass => parseInt(pass.serialNo))
      .filter(num => !isNaN(num))
      .sort((a, b) => b - a);

    return serialNumbers.length > 0 ? (serialNumbers[0] + 1).toString() : '1';
  };

  // Update the uploadImageToDrive function
  const uploadImageToDrive = async (file) => {
    try {
      // Convert file to base64
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
      });

      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          action: 'uploadFile',
          base64Data: base64Data,
          fileName: file.name,
          mimeType: file.type,
          folderId: import.meta.env.VITE_GOOGLE_DRIVE_GATEPASS_FOLDER_ID
        })
      });

      const result = await response.json();

      if (result.success) {
        return result.fileUrl;
      } else {
        throw new Error(result.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.employeeName || !formData.visitPlace || !formData.visitReason ||
      !formData.departureTime || !formData.arrivalTime || !formData.hodName ||
      !formData.whatsappNumber) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      setSubmitting(true);

      // Upload image if provided
      let imageUrl = '';
      if (formData.gatePassImage) {
        imageUrl = await uploadImageToDrive(formData.gatePassImage);
      }

      // Format dates to dd/mm/yy hh:mm:ss for timestamp
      const formatDateTimeForSheet = (dateTimeString) => {
        const date = new Date(dateTimeString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
      };

      // Format dates to dd/mm/yyyy for departure and arrival
      const formatDateForSheet = (dateTimeString) => {
        const date = new Date(dateTimeString);
        return date; // Return Date object instead of formatted string
      };

      const timestamp = formatDateTimeForSheet(new Date().toISOString());
      const departureTimeDate = formatDateForSheet(formData.departureTime);
      const arrivalTimeDate = formatDateForSheet(formData.arrivalTime);

      const serialNo = getNextSerialNo();
      const placeAndReason = `${formData.visitPlace} - ${formData.visitReason}`;

      const rowData = [
        timestamp,                    // Column A: Timestamp (dd/mm/yy hh:mm:ss)
        serialNo,                     // Column B: Serial No
        formData.employeeId,          // Column C: Employee ID
        formData.employeeName,        // Column D: Name of Employee
        formData.department,          // Column E: Department
        placeAndReason,               // Column F: Place and Reason to visit
        departureTimeDate,            // Column G: Departure From Plant (Date object)
        arrivalTimeDate,              // Column H: Arrival at Plant (Date object)
        formData.hodName,             // Column I: HOD Name
        formData.whatsappNumber,      // Column J: Employee Whatsapp Number
        imageUrl,                     // Column K: Image of Employee gate pass (uploaded URL)
        'pending'                     // Column L: Status
      ];

      // Send data to Google Sheets
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          action: 'insert',
          sheetName: 'Gate Pass',
          rowData: JSON.stringify(rowData)
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Gate Pass Request submitted successfully!');
        setFormData({
          employeeId: '',
          employeeName: '',
          department: '',
          visitPlace: '',
          visitReason: '',
          departureTime: '',
          arrivalTime: '',
          hodName: '',
          whatsappNumber: '',
          gatePassImage: null,
        });
        setShowModal(false);
        fetchGatePassData(); // Refresh data
      } else {
        toast.error('Failed to submit gate pass request');
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Something went wrong!');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGatePassAction = async (action) => {
    if (!selectedRow) {
      toast.error('Please select a gate pass request');
      return;
    }

    setActionInProgress(action);
    setLoading(true);

    try {
      // Find the row index in the sheet
      const response = await fetch(`${SCRIPT_URL}?sheet=Gate%20Pass&action=fetch`);
      const result = await response.json();

      if (result.success && result.data) {
        const rowIndex = result.data.findIndex(row => row[1] === selectedRow.serialNo) + 1;

        if (rowIndex > 0) {
          // Update the status column (Column L, index 11)
          const updateResponse = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              action: 'updateCell',
              sheetName: 'Gate Pass',
              rowIndex: rowIndex,
              columnIndex: 12, // Column L is index 12 (1-based)
              value: action === 'accept' ? 'approved' : 'rejected'
            })
          });

          const updateResult = await updateResponse.json();

          if (updateResult.success) {
            toast.success(`Gate Pass ${action === 'accept' ? 'approved' : 'rejected'} for ${selectedRow.employeeName || 'employee'}`);
            setSelectedRow(null);
            fetchGatePassData(); // Refresh data
          } else {
            toast.error(`Failed to ${action} gate pass`);
          }
        } else {
          toast.error('Could not find the selected gate pass in the sheet');
        }
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error(`Failed to ${action} gate pass: ${error.message}`);
    } finally {
      setLoading(false);
      setActionInProgress(null);
    }
  };

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return '-';
    return dateTimeString;
  };

  const filteredPendingPasses = pendingPasses.filter(item => {
    const matchesSearch = item.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredApprovedPasses = approvedPasses.filter(item => {
    const matchesSearch = item.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredRejectedPasses = rejectedPasses.filter(item => {
    const matchesSearch = item.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const renderPendingPassesTable = () => (
    <table className="min-w-full divide-y divide-white">
      <thead className="bg-gray-100">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Select
          </th>
          {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serial No</th> */}
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee Name</th>
          {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th> */}
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Place and reason to visit</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departure From Plant</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Arrival at Plant</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HOD Name</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee Whatsapp Number</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gate Pass Image</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white">
        {filteredPendingPasses.length > 0 ? (
          filteredPendingPasses.map((item, index) => (
            <tr key={index} className="hover:bg-white">
              <td className="px-6 py-4 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={selectedRow?.serialNo === item.serialNo}
                  onChange={() => handleCheckboxChange(item.serialNo, item)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
              </td>
              {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.serialNo}</td> */}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.employeeId}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.employeeName}</td>
              {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.department}</td> */}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div>
                  <div className="font-medium">{item.visitPlace}</div>
                  {/* <div className="text-xs text-gray-400">{item.visitReason}</div> */}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTime(item.departureTime)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTime(item.arrivalTime)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.hodName}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.whatsappNumber}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.gatePassImage ? (<a href={item.gatePassImage} target='_blank' rel='noopener noreferrer'>{<Image />}</a>) : ('-')}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                  Pending
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleGatePassAction('accept')}
                    disabled={!selectedRow || selectedRow.serialNo !== item.serialNo || loading}
                    className={`px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 min-h-[42px] flex items-center justify-center ${!selectedRow || selectedRow.serialNo !== item.serialNo || loading ? 'opacity-75 cursor-not-allowed' : ''
                      }`}
                  >
                    {loading && selectedRow?.serialNo === item.serialNo && actionInProgress === 'accept' ? (
                      <div className="flex items-center">
                        <svg
                          className="animate-spin h-4 w-4 text-white mr-2"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Approving...</span>
                      </div>
                    ) : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleGatePassAction('rejected')}
                    disabled={selectedRow?.serialNo !== item.serialNo || loading}
                    className={`px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 min-h-[42px] flex items-center justify-center ${selectedRow?.serialNo !== item.serialNo || (loading && actionInProgress === 'accept') ? 'opacity-75 cursor-not-allowed' : ''
                      }`}
                  >
                    {loading && selectedRow?.serialNo === item.serialNo && actionInProgress === 'rejected' ? (
                      <div className="flex items-center">
                        <svg
                          className="animate-spin h-4 w-4 text-white mr-2"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Rejecting...</span>
                      </div>
                    ) : 'Reject'}
                  </button>
                </div>
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan="12" className="px-6 py-12 text-center">
              <p className="text-gray-500">No pending gate pass requests found.</p>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );

  const renderApprovedPassesTable = () => (
    <table className="min-w-full divide-y divide-white">
      <thead className="bg-gray-100">
        <tr>
          {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serial No</th> */}
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee Name</th>
          {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th> */}
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Place and reason to visit</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departure From Plant</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Arrival at Plant</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HOD Name</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee Whatsapp Number</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gate Pass Image</th>

          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white">
        {filteredApprovedPasses.length > 0 ? (
          filteredApprovedPasses.map((item, index) => (
            <tr key={index} className="hover:bg-white">
              {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.serialNo}</td> */}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.employeeId}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.employeeName}</td>
              {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.department}</td> */}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div>
                  <div className="font-medium">{item.visitPlace}</div>
                  {/* <div className="text-xs text-gray-400">{item.visitReason}</div> */}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTime(item.departureTime)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTime(item.arrivalTime)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.hodName}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.whatsappNumber}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.gatePassImage ? (<a href={item.gatePassImage} target='_blank' rel='noopener noreferrer'><Image /></a>) : ('-')}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                  Approved
                </span>
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan="10" className="px-6 py-12 text-center">
              <p className="text-gray-500">No approved gate pass requests found.</p>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );

  const renderRejectedPassesTable = () => (
    <table className="min-w-full divide-y divide-white">
      <thead className="bg-gray-100">
        <tr>
          {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serial No</th> */}
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee Name</th>
          {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th> */}
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Place and reason to visit</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departure From Plant</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Arrival at Plant</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HOD Name</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee Whatsapp Number</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gate Pass Image</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white">
        {filteredRejectedPasses.length > 0 ? (
          filteredRejectedPasses.map((item, index) => (
            <tr key={index} className="hover:bg-white">
              {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.serialNo}</td> */}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.employeeId}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.employeeName}</td>
              {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.department}</td> */}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div>
                  <div className="font-medium">{item.visitPlace}</div>
                  {/* <div className="text-xs text-gray-400">{item.visitReason}</div> */}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTime(item.departureTime)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTime(item.arrivalTime)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.hodName}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.whatsappNumber}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.gatePassImage ? (<a href={item.gatePassImage} target='_blank' rel='noopener noreferrer'><Image /></a>) : ('-')}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                  Rejected
                </span>
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan="10" className="px-6 py-12 text-center">
              <p className="text-gray-500">No rejected gate pass requests found.</p>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );

  const renderTable = () => {
    switch (activeTab) {
      case 'pending':
        return renderPendingPassesTable();
      case 'approved':
        return renderApprovedPassesTable();
      case 'rejected':
        return renderRejectedPassesTable();
      default:
        return renderPendingPassesTable();
    }
  };

  return (
    <div className="space-y-3 md:pb-4 mb-4 font-outfit">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Gate Pass Management</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Security and exit tracking</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2 rounded-md shadow-sm text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-indigo-100"
        >
          <Plus size={14} className="mr-1.5" />
          New Request
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or ID..."
            className="w-full pl-9 pr-4 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs sm:text-sm transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Content Card with Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50/30">
          <nav className="flex px-2 overflow-x-auto no-scrollbar">
            {[
              { id: "pending", label: "Pending", count: pendingPasses.length },
              { id: "approved", label: "Approved", count: approvedPasses.length },
              { id: "rejected", label: "Rejected", count: rejectedPasses.length }
            ].map((tab) => (
              <button
                key={tab.id}
                className={`py-3 px-4 font-bold text-[10px] uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </nav>
        </div>

        <div className="p-0">
          <div className="overflow-x-auto">
            {tableLoading ? (
              <LoadingSpinner message="Syncing gate logs..." minHeight="300px" />
            ) : error ? (
              <div className="px-6 py-12 text-center">
                <p className="text-rose-500 text-xs font-bold mb-2">Error: {error}</p>
                <button onClick={fetchGatePassData} className="px-3 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded text-xs font-bold shadow-sm">Retry Log Fetch</button>
              </div>
            ) : (
              <>
                {/* Desktop Tables */}
                <div className="hidden md:block">
                  {activeTab === "pending" && (
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead className="bg-gray-50/50">
                        <tr>
                          <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select</th>
                          <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Employee</th>
                          <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Visit Details</th>
                          <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Times</th>
                          <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Docs</th>
                          <th className="px-4 py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 bg-white">
                        {filteredPendingPasses.length > 0 ? (
                          filteredPendingPasses.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50/50 transition-colors group">
                               <td className="px-4 py-2 whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  checked={selectedRow?.serialNo === item.serialNo}
                                  onChange={() => handleCheckboxChange(item.serialNo, item)}
                                  className="h-3.5 w-3.5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                <p className="text-xs font-bold text-gray-900">{item.employeeName}</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase">{item.employeeId} | {item.department}</p>
                              </td>
                              <td className="px-4 py-2">
                                <p className="text-[11px] font-bold text-gray-700 leading-tight">{item.visitPlace}</p>
                                <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5 tracking-tighter line-clamp-1">{item.visitReason}</p>
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                <p className="text-[10px] text-rose-600 font-bold">Out: {item.departureTime}</p>
                                <p className="text-[10px] text-emerald-600 font-bold">In: {item.arrivalTime}</p>
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                {item.gatePassImage ? (
                                  <a href={item.gatePassImage} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-indigo-50 rounded text-indigo-600 inline-block transition-colors">
                                    <Image size={14} />
                                  </a>
                                ) : <span className="text-[10px] text-gray-300 font-bold">N/A</span>}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleGatePassAction('accept')}
                                    disabled={!selectedRow || selectedRow.serialNo !== item.serialNo || loading}
                                    className={`px-3 py-1 bg-emerald-50 text-emerald-700 rounded border border-emerald-100 text-[10px] font-bold uppercase tracking-tight hover:bg-emerald-600 hover:text-white transition-all shadow-sm ${(!selectedRow || selectedRow.serialNo !== item.serialNo || loading) ? "opacity-30" : ""}`}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleGatePassAction('rejected')}
                                    disabled={selectedRow?.serialNo !== item.serialNo || loading}
                                    className={`px-3 py-1 bg-rose-50 text-rose-700 rounded border border-rose-100 text-[10px] font-bold uppercase tracking-tight hover:bg-rose-600 hover:text-white transition-all shadow-sm ${(selectedRow?.serialNo !== item.serialNo || loading) ? "opacity-30" : ""}`}
                                  >
                                    Reject
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan="6" className="px-4 py-12 text-center text-gray-400 text-xs">No pending requests found.</td></tr>
                        )}
                      </tbody>
                    </table>
                  )}

                  {(activeTab === "approved" || activeTab === "rejected") && (
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead className="bg-gray-50/50">
                        <tr>
                          <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Employee</th>
                          <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Visit Details</th>
                          <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Times</th>
                          <th className="px-4 py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 bg-white">
                        {(activeTab === "approved" ? filteredApprovedPasses : filteredRejectedPasses).map((item, index) => (
                           <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-2 whitespace-nowrap">
                              <p className="text-xs font-bold text-gray-900">{item.employeeName}</p>
                              <p className="text-[10px] text-gray-400 font-bold uppercase">{item.employeeId}</p>
                            </td>
                            <td className="px-4 py-2">
                              <p className="text-[11px] font-bold text-gray-700 line-clamp-1">{item.visitPlace}</p>
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              <p className="text-[10px] text-gray-500">Out: {item.departureTime}</p>
                              <p className="text-[10px] text-gray-500">In: {item.arrivalTime}</p>
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-center">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest shadow-sm ${activeTab === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                {activeTab}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Mobile View */}
                <div className="md:hidden divide-y divide-gray-100">
                  {(activeTab === "pending" ? filteredPendingPasses : (activeTab === "approved" ? filteredApprovedPasses : filteredRejectedPasses)).length > 0 ? (
                    (activeTab === "pending" ? filteredPendingPasses : (activeTab === "approved" ? filteredApprovedPasses : filteredRejectedPasses)).map((item, index) => (
                      <div key={index} className="p-3 space-y-2">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-bold text-indigo-600">#{item.employeeId}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${activeTab === 'pending' ? 'bg-amber-100 text-amber-700' : (activeTab === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}`}>
                            {activeTab}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900 leading-tight">{item.employeeName}</div>
                          <div className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">{item.department}</div>
                        </div>
                        <div className="bg-gray-50 p-2 rounded border border-gray-100 space-y-1">
                          <div className="flex justify-between items-start text-[11px]">
                            <span className="text-gray-400 uppercase font-bold tracking-tighter">Place</span>
                            <span className="font-bold text-gray-700 text-right max-w-[150px]">{item.visitPlace}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-rose-500 font-bold">Departure: {item.departureTime}</span>
                            <span className="text-emerald-500 font-bold">Arrival: {item.arrivalTime}</span>
                          </div>
                        </div>
                        {activeTab === "pending" && (
                          <div className="flex gap-2 pt-1">
                             <button
                              onClick={() => {
                                handleCheckboxChange(item.serialNo, item);
                                setTimeout(() => handleGatePassAction('accept'), 50);
                              }}
                              className="flex-1 py-2 bg-emerald-50 text-emerald-700 rounded border border-emerald-100 text-xs font-bold uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                handleCheckboxChange(item.serialNo, item);
                                setTimeout(() => handleGatePassAction('rejected'), 50);
                              }}
                              className="flex-1 py-2 bg-rose-50 text-rose-700 rounded border border-rose-100 text-xs font-bold uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-400 text-xs font-medium">No results found.</div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Refined Modal for new gate pass request */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200 shadow-2xl">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden border border-indigo-100 flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50/50">
              <div>
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">New Gate Pass</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Security logging system</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto scrollbar-hide">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 px-1">Employee Name*</label>
                  <select
                    name="employeeName"
                    value={formData.employeeName}
                    onChange={handleInputChange}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
                    required
                  >
                    <option value="">Select Employee</option>
                    {employees.map(employee => (
                      <option key={employee.id} value={employee.name}>{employee.name.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 md:col-span-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 px-1">Approval From (HOD)*</label>
                  <select
                    name="hodName"
                    value={formData.hodName}
                    onChange={handleInputChange}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
                    required
                  >
                    <option value="">Select HOD</option>
                    {hodNames.map((name, index) => (
                      <option key={index} value={name}>{name.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-50">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 px-1">Visit Destination*</label>
                  <input
                    type="text"
                    name="visitPlace"
                    value={formData.visitPlace}
                    onChange={handleInputChange}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="Where are you going?"
                    required
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 px-1">Departure Time*</label>
                  <input
                    type="datetime-local"
                    name="departureTime"
                    value={formData.departureTime}
                    onChange={handleInputChange}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 px-1">Expected Return*</label>
                  <input
                    type="datetime-local"
                    name="arrivalTime"
                    value={formData.arrivalTime}
                    onChange={handleInputChange}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                   <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 px-1">Reason for Visit*</label>
                   <input
                    type="text"
                    name="visitReason"
                    value={formData.visitReason}
                    onChange={handleInputChange}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="Purpose of exit"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-gray-50">
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 px-1">Gate Pass Document (Optional)</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="file"
                      name="gatePassImage"
                      onChange={handleInputChange}
                      className="hidden"
                      id="pass-image-upload"
                      accept="image/*"
                    />
                    <label 
                      htmlFor="pass-image-upload"
                      className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-gray-200 rounded-lg py-3 hover:border-indigo-300 hover:bg-indigo-50 transition-all cursor-pointer group"
                    >
                      <Image size={16} className="text-gray-400 group-hover:text-indigo-500" />
                      <span className="text-[10px] font-bold text-gray-500 group-hover:text-indigo-600 uppercase tracking-widest">
                        {formData.gatePassImage ? formData.gatePassImage.name : 'Selection Image'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex-[2] py-2.5 bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {submitting ? 'Processing Upload...' : 'Request Gate Pass'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GatePass;