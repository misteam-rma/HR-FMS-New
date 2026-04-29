import React, { useEffect, useState } from 'react';
import { HistoryIcon, Plus, X, Search, Filter, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import useDataStore from '../../store/dataStore';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useNavigate } from 'react-router-dom';

const Indent = () => {
  const navigate = useNavigate();
  const { addIndent } = useDataStore();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    post: '',
    indentType: '', // New field for indent type
    gender: '',
    department: '',
    prefer: '',
    numberOfPost: '',
    completionDate: '',
    socialSite: '',
    indentNumber: '',
    timestamp: '',
    experience: '', // New field for experience input
    socialSiteTypes: [], // New field for social site types
  });
  const [indentData, setIndentData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [indentTypes, setIndentTypes] = useState([]);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [emailData, setEmailData] = useState({
    recipientName: "",
    recipientEmail: "",
    subject: "",
    message: "",
  });

  // Expanded Cards State
  const [expandedCards, setExpandedCards] = useState({});
  const toggleCard = (id) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);

  const handleShareClick = (item) => {
    setSelectedRow(item);

    // Create a formatted message with row details
    const formattedMessage = `
Indent Number: ${item.indentNumber}
Post: ${item.post}
Gender: ${item.gender}
Department: ${item.department}
Prefer: ${item.prefer}
Experience: ${item.experience || 'N/A'}
Number of Posts: ${item.noOfPost}
Completion Date: ${item.completionDate}
Social Site: ${item.socialSite}
Social Site Types: ${item.socialSiteTypes || 'N/A'}

This indent requires your attention.
  `.trim();

    setEmailData({
      recipientName: '',
      recipientEmail: '',
      subject: ``,
      message: formattedMessage
    });
    setShowEmailModal(true);
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();

    if (!emailData.recipientEmail || !emailData.subject || !emailData.message) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      setSubmitting(true);
      const timestamp = getCurrentTimestamp();

      const response = await fetch(import.meta.env.VITE_APPS_SCRIPT_URL, {
        method: 'POST',
        body: new URLSearchParams({
          action: 'shareViaEmail',
          recipientEmail: emailData.recipientEmail,
          subject: emailData.subject,
          message: emailData.message,
          documents: JSON.stringify([]) // You can add documents if needed
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Email sent successfully!');
        setShowEmailModal(false);
        setEmailData({
          recipientName: '',
          recipientEmail: '',
          subject: '',
          message: ''
        });
      } else {
        toast.error('Failed to send email: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Email send error:', error);
      toast.error('Failed to send email!');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailInputChange = (e) => {
    const { name, value } = e.target;
    setEmailData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const fetchMasterData = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=Master&action=fetch`
      );

      const result = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        // Extract unique departments from Column B (index 1), skip header row
        const deptList = result.data
          .slice(1) // Skip header row
          .map(row => row[1]) // Column B is index 1
          .filter(dept => dept && dept.trim() !== '') // Remove empty values
          .filter((dept, index, self) => self.indexOf(dept) === index); // Get unique values

        setDepartments(deptList);

        // Extract unique indent types from Column C (index 2), skip header row
        const typeList = result.data
          .slice(1) // Skip header row
          .map(row => row[2]) // Column C is index 2
          .filter(type => type && type.trim() !== '') // Remove empty values
          .filter((type, index, self) => self.indexOf(type) === index); // Get unique values

        setIndentTypes(typeList);
      }
    } catch (error) {
      console.error('Error fetching master data:', error);
    }
  };



  // Social site options
  const socialSiteOptions = [
    'Instagram',
    'Facebook',
    'LinkedIn',
    'Referral',
    'Job Consultancy',
  ];

  useEffect(() => {
    const loadData = async () => {
      setTableLoading(true);
      const result = await fetchIndentDataFromRow7();
      if (result.success) {

      } else {
        console.error('Error:', result.error);
      }
      await fetchMasterData();
      setTableLoading(false);
    };
    loadData();
  }, []);

  const generateIndentNumber = async () => {
    try {
      const result = await fetchLastIndentNumber();

      if (result.success) {
        const nextNumber = result.lastIndentNumber + 1;
        return `IND-${String(nextNumber).padStart(3, '0')}`;
      }
      // Fallback if fetch fails
      return 'IND-001';
    } catch (error) {
      console.error('Error generating indent number:', error);
      return 'IND-001';
    }
  };

  const getCurrentTimestamp = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const year = now.getFullYear() === 2028 ? 2026 : now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  const fetchIndentDataFromRow7 = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=INDENT&action=fetch`
      );

      const result = await response.json();

      if (result.success && result.data && result.data.length >= 7) {
        // Get data starting from row 7 (array index 6) to end
        const dataFromRow7 = result.data.slice(6);

        // Find headers (assuming they're in row 6 - array index 5)
        const headers = result.data[5].map(h => h.trim());

        // Find column indices for important fields
        const timestampIndex = headers.indexOf('Timestamp');
        const indentNumberIndex = headers.indexOf('Indent Number');
        const postIndex = headers.indexOf('Post');
        const genderIndex = headers.indexOf('Gender');
        const departmentIndex = headers.indexOf('Department');
        const preferIndex = headers.indexOf('Prefer');
        const noOFPostIndex = headers.indexOf('Number Of Posts');
        const completionDateIndex = headers.indexOf('Completion Date');
        const socialSiteIndex = headers.indexOf('Social Site');
        const experienceIndex = headers.indexOf('Experience');
        const socialSiteTypesIndex = headers.indexOf('Social Site Types');
        const indentTypeIndex = 18; // Column S (A=0, ..., S=18)
        // Add other column indices as needed

        // Process and sort the data (latest first - REC-99 before REC-01)
        const processedData = dataFromRow7.map(row => ({
          timestamp: row[0] || '',
          indentNumber: row[1] || '',
          indentType: row[2] || '',
          post: row[3] || '',
          gender: row[4] || '',
          department: row[5] || '',
          prefer: row[6] || '',
          experience: row[7] || '',
          noOfPost: row[8] || '',
          completionDate: row[9] || '',
          socialSite: row[10] || '',
          socialSiteTypes: row[11] || '',
        }))
        .filter(item => item.indentNumber && item.indentNumber.trim() !== '' && item.post && item.post.trim() !== '')
        .sort((a, b) => {
          const numA = parseInt(a.indentNumber?.match(/\d+/)?.[0] || 0);
          const numB = parseInt(b.indentNumber?.match(/\d+/)?.[0] || 0);
          return numB - numA; // Sort descending
        });

        setIndentData(processedData)
        return {
          success: true,
          data: processedData
        };
      } else {
        return {
          success: false,
          error: 'Not enough rows in sheet data'
        };
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  };

  const fetchLastIndentNumber = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=INDENT&action=fetch`
      );

      const result = await response.json();
      console.log('Full sheet data:', result); // Debugging

      if (result.success && result.data && result.data.length > 1) {
        // Find the first row with actual headers (skip empty rows)
        let headerRowIndex = 0;
        while (headerRowIndex < result.data.length &&
          result.data[headerRowIndex].every(cell => !cell || cell.trim() === '')) {
          headerRowIndex++;
        }

        if (headerRowIndex >= result.data.length) {
          throw new Error('No header row found in sheet');
        }

        const headers = result.data[headerRowIndex].map(h => h ? h.trim().toLowerCase() : '');
        console.log('Headers found:', headers);

        // Try to find the indent number column by common names
        const possibleNames = ['indent number', 'indentnumber', 'indent_no', 'indentno', 'indent'];
        let indentNumberIndex = -1;

        for (const name of possibleNames) {
          indentNumberIndex = headers.indexOf(name);
          if (indentNumberIndex !== -1) break;
        }

        if (indentNumberIndex === -1) {
          // If still not found, try to find by position (from your screenshot it's column B/index 1)
          indentNumberIndex = 1;
          console.warn('Using fallback column index 1 for indent number');
        }

        // Find the last non-empty row with data
        let lastDataRowIndex = result.data.length - 1;
        while (lastDataRowIndex > headerRowIndex &&
          (!result.data[lastDataRowIndex][indentNumberIndex] ||
            result.data[lastDataRowIndex][indentNumberIndex].trim() === '')) {
          lastDataRowIndex--;
        }

        if (lastDataRowIndex <= headerRowIndex) {
          return {
            success: true,
            lastIndentNumber: 0,
            message: 'No data rows found'
          };
        }

        const lastIndentNumber = result.data[lastDataRowIndex][indentNumberIndex];
        console.log('Last indent number found:', lastIndentNumber);

        // Extract numeric part from "REC-01" format
        let numericValue = 0;
        if (typeof lastIndentNumber === 'string') {
          const match = lastIndentNumber.match(/\d+/);
          numericValue = match ? parseInt(match[0]) : 0;
        } else {
          numericValue = parseInt(lastIndentNumber) || 0;
        }

        return {
          success: true,
          lastIndentNumber: numericValue,
          fullLastIndent: lastIndentNumber
        };
      } else {
        return {
          success: true,
          lastIndentNumber: 0,
          message: 'Sheet is empty or has no data rows'
        };
      }
    } catch (error) {
      console.error('Error in fetchLastIndentNumber:', error);
      return {
        success: false,
        error: error.message,
        lastIndentNumber: 0
      };
    }
  };





  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSocialSiteTypeChange = (e) => {
    const { value, checked } = e.target;

    setFormData(prev => {
      if (checked) {
        return {
          ...prev,
          socialSiteTypes: [...prev.socialSiteTypes, value]
        };
      } else {
        return {
          ...prev,
          socialSiteTypes: prev.socialSiteTypes.filter(type => type !== value)
        };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.post ||
      !formData.gender ||
      !formData.numberOfPost ||
      !formData.completionDate ||
      !formData.socialSite
    ) {
      toast.error('Please fill all required fields');
      return;
    }

    // Additional validation for experience if prefer is "Experience"
    if (formData.prefer === 'Experience' && !formData.experience) {
      toast.error('Please enter experience details');
      return;
    }

    // Additional validation for social site types if socialSite is "Yes"
    if (formData.socialSite === 'Yes' && formData.socialSiteTypes.length === 0) {
      toast.error('Please select at least one social site type');
      return;
    }

    try {
      setSubmitting(true);
      // Generate indent number and timestamp
      const indentNumber = await generateIndentNumber();
      const timestamp = getCurrentTimestamp();

      // Format the completion date to MM/DD/YYYY for Google Sheets
      const formattedDate = formatDateForSheet(formData.completionDate);
      console.log(indentNumber);

      // Prepare row data matching user specification A to L
      const rowData = [
        timestamp,                                        // A (0): Timestamp
        indentNumber,                                     // B (1): Indent Number
        formData.indentType,                              // C (2): Indent Type
        formData.post,                                    // D (3): Post
        formData.gender,                                  // E (4): Gender
        formData.department,                              // F (5): Department
        formData.prefer,                                  // G (6): Prefer
        formData.prefer === 'Experience' ? formData.experience : '', // H (7): Experience Year
        formData.numberOfPost,                            // I (8): Number Of Posts
        formattedDate,                                    // J (9): Completion Date
        formData.socialSite,                              // K (10): Social Site
        formData.socialSite === 'Yes' ? formData.socialSiteTypes.join(', ') : '', // L (11): Social Site Types
      ];

      const response = await fetch(import.meta.env.VITE_APPS_SCRIPT_URL, {
        method: 'POST',
        body: new URLSearchParams({
          sheetName: 'INDENT',
          action: 'insert',
          rowData: JSON.stringify(rowData),
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Indent submitted successfully!');
        setFormData({
          post: '',
          indentType: '',
          gender: '',
          department: '',
          prefer: '',
          numberOfPost: '',
          completionDate: '',
          socialSite: '',
          indentNumber: '',
          timestamp: '',
          experience: '',
          socialSiteTypes: [],
        });
        setShowModal(false);
        // Refresh the table data
        setTableLoading(true);
        await fetchIndentDataFromRow7();
        setTableLoading(false);
      } else {
        toast.error('Failed to insert: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Insert error:', error);
      toast.error('Something went wrong!');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper function to format date for Google Sheets
  const formatDateForSheet = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const handleCancel = () => {
    setFormData({
      post: '',
      indentType: '',
      gender: '',
      department: '',
      prefer: '',
      numberOfPost: '',
      completionDate: '',
      socialSite: '',
      indentNumber: '',
      timestamp: '',
      experience: '',
      socialSiteTypes: [],
    });
    setShowModal(false);
  };

  // Helper date matching
  const getFormattedDateToMatch = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getFormattedDateToMatchFromSheet = (itemDate) => {
    if (!itemDate) return '';
    if (typeof itemDate === 'string' && /^\d{2}\/\d{2}\/\d{4}/.test(itemDate)) {
      return itemDate.split(' ')[0];
    }
    const d = new Date(itemDate);
    if (isNaN(d.getTime())) return String(itemDate);
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Filter Logic
  const filteredData = indentData.filter(item => {
    // Overall search
    const matchesSearch = searchTerm ?
      Object.values(item).some(val =>
        String(val || '').toLowerCase().includes(searchTerm.toLowerCase())
      ) : true;

    // Department check
    const matchesDepartment = filterDepartment ? item.department === filterDepartment : true;

    // Date check
    let matchesDate = true;
    if (filterDate) {
      const formattedFilterDate = getFormattedDateToMatch(filterDate);
      const formattedItemDate = getFormattedDateToMatchFromSheet(item.completionDate);

      // We can also check if timestamp contains the date as fallback
      const formattedTimestamp = getFormattedDateToMatchFromSheet(item.timestamp);
      matchesDate = formattedItemDate === formattedFilterDate || formattedTimestamp === formattedFilterDate;
    }

    return matchesSearch && matchesDepartment && matchesDate;
  });

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Get unique departments from the complete loaded indent data
  const uniqueDepartmentsFromData = Array.from(
    new Set(
      indentData
        .map(item => item.department)
        .filter(dept => dept && typeof dept === 'string' && dept.trim() !== '')
    )
  ).sort();

  const renderPaginationNav = () => (
    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px w-full justify-center sm:w-auto" aria-label="Pagination">
      <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="relative inline-flex items-center px-1.5 py-1 sm:px-2 sm:py-1 rounded-l-md border border-gray-300 bg-white text-xs sm:text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
        <span className="sr-only">Previous</span>
        <svg className="h-4 w-4 sm:h-4 sm:w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
      </button>

      {[...Array(totalPages)].map((_, i) => {
        const pageNum = i + 1;
        if (pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)) {
          return (
            <button key={pageNum} onClick={() => paginate(pageNum)} className={`relative inline-flex items-center px-2.5 py-1 sm:px-3 sm:py-1 border text-xs sm:text-sm font-medium ${currentPage === pageNum ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}`}>
              {pageNum}
            </button>
          );
        } else if ((pageNum === currentPage - 2 && pageNum > 1) || (pageNum === currentPage + 2 && pageNum < totalPages)) {
          return <span key={pageNum} className="relative inline-flex items-center px-2 py-1 sm:px-3 sm:py-1 border border-gray-300 bg-white text-xs sm:text-sm font-medium text-gray-700">...</span>;
        }
        return null;
      })}

      <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} className="relative inline-flex items-center px-1.5 py-1 sm:px-2 sm:py-1 rounded-r-md border border-gray-300 bg-white text-xs sm:text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
        <span className="sr-only">Next</span>
        <svg className="h-4 w-4 sm:h-4 sm:w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
      </button>
    </nav>
  );


  return (
    <div className="space-y-3 md:pb-4 mb-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 md:gap-4">
        <h1 className="hidden md:block text-2xl font-bold text-gray-800">Indent</h1>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full lg:w-auto">
          {/* Mobile Top Row: Search + Create Button */}
          <div className="flex flex-row items-center gap-2 w-full sm:w-auto">
            {/* Overall Search */}
            <div className="relative flex-1 sm:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search all fields..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full text-xs sm:text-sm"
              />
            </div>

            {/* Create Button */}
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center justify-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-all duration-200 shrink-0"
              disabled={loading}
              title="Create Indent"
            >
              {loading ? (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <>
                  <Plus size={16} className="sm:mr-2" />
                  <span className="hidden sm:inline">Create Indent</span>
                </>
              )}
            </button>
          </div>

          {/* Mobile Bottom Row: Filters */}
          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
            {/* Department Filter (Custom Dropdown) */}
            <div className="relative">
              <div
                onClick={() => setIsDeptDropdownOpen(!isDeptDropdownOpen)}
                className="flex items-center gap-2 h-9 px-3 border border-gray-300 rounded bg-white text-xs text-gray-700 cursor-pointer hover:border-indigo-500 transition shadow-sm relative overflow-hidden"
              >
                <Filter size={12} className="text-gray-400 shrink-0" />
                <span className="truncate">{filterDepartment || "All Departments"}</span>
                <ChevronDown size={14} className={`ml-auto text-gray-400 transition-transform ${isDeptDropdownOpen ? 'rotate-180' : ''}`} />
              </div>

              {isDeptDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDeptDropdownOpen(false)}></div>
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-xl z-50 overflow-hidden py-1 max-h-48 overflow-y-auto">
                    <div
                      onClick={() => { setFilterDepartment(''); setIsDeptDropdownOpen(false); setCurrentPage(1); }}
                      className={`px-3 py-2 text-xs cursor-pointer hover:bg-gray-50 flex items-center justify-between ${!filterDepartment ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-600'}`}
                    >
                      All Departments
                      {!filterDepartment && <div className="w-1 h-1 bg-indigo-500 rounded-full" />}
                    </div>
                    {uniqueDepartmentsFromData.map((dept, index) => (
                      <div
                        key={index}
                        onClick={() => { setFilterDepartment(dept); setIsDeptDropdownOpen(false); setCurrentPage(1); }}
                        className={`px-3 py-2 text-xs cursor-pointer hover:bg-gray-50 flex items-center justify-between ${filterDepartment === dept ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-600'}`}
                      >
                        {dept}
                        {filterDepartment === dept && <div className="w-1 h-1 bg-indigo-500 rounded-full" />}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Date Filter */}
            <div className="relative">
              <div className="flex items-center gap-2 h-9 px-3 border border-gray-300 rounded bg-white text-xs text-gray-700 relative overflow-hidden">
                <Calendar size={12} className="text-gray-400 shrink-0" />
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => {
                    setFilterDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-transparent focus:outline-none text-[11px] font-medium"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-medium text-gray-800">
                Create New Indent
              </h3>
              <button
                onClick={handleCancel}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Indent Type *
                </label>
                <select
                  name="indentType"
                  value={formData.indentType}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Select Indent Type</option>
                  {indentTypes.map((type, index) => (
                    <option key={index} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Post *
                </label>
                <input
                  type="text"
                  name="post"
                  value={formData.post}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter post title"
                  required
                />
              </div>



              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender *
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Any">Any</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Department</option>
                  {departments.map((dept, index) => (
                    <option key={index} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prefer
                </label>
                <select
                  name="prefer"
                  value={formData.prefer}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Experience</option>
                  <option value="Experience">Experience</option>
                  <option value="Fresher">Fresher</option>
                  <option value="Any">Any</option>
                </select>
              </div>

              {/* Experience input field - only show when prefer is Experience */}
              {formData.prefer === "Experience" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Experience *
                  </label>
                  <input
                    type="text"
                    name="experience"
                    value={formData.experience}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter experience details"
                    required={formData.prefer === "Experience"}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number Of Post *
                </label>
                <input
                  type="number"
                  name="numberOfPost"
                  value={formData.numberOfPost}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter number of posts"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Completion Date *
                </label>
                <input
                  type="date"
                  name="completionDate"
                  value={formData.completionDate}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Social Site *
                </label>
                <select
                  name="socialSite"
                  value={formData.socialSite}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>

              {/* Social Site Types checklist - only show when socialSite is Yes */}
              {formData.socialSite === "Yes" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Social Site Types *
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
                    {socialSiteOptions.map((option) => (
                      <div key={option} className="flex items-center">
                        <input
                          type="checkbox"
                          id={option}
                          value={option}
                          checked={formData.socialSiteTypes.includes(option)}
                          onChange={handleSocialSiteTypeChange}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label
                          htmlFor={option}
                          className="ml-2 block text-sm text-gray-700"
                        >
                          {option}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-all duration-200"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-all duration-200 flex items-center justify-center"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    "Submit"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEmailModal && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-medium text-gray-800">
                Share Indent via Email
              </h3>
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEmailSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient Name
                </label>
                <input
                  type="text"
                  name="recipientName"
                  value={emailData.recipientName}
                  onChange={handleEmailInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter recipient name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="recipientEmail"
                  value={emailData.recipientEmail}
                  onChange={handleEmailInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter email address"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  name="subject"
                  value={emailData.subject}
                  onChange={handleEmailInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter subject"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message *
                </label>
                <textarea
                  name="message"
                  value={emailData.message}
                  onChange={handleEmailInputChange}
                  rows="6"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-vertical"
                  placeholder="Enter your message"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-all duration-200"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-all duration-200 flex items-center justify-center"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Sending...
                    </>
                  ) : (
                    "Send Email"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Unified Main Content Container (Synced with Indent.jsx) */}
      <div className="overflow-hidden border border-gray-200 rounded-lg bg-white min-h-[500px] flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <LoadingSpinner message="Retrieving indent data..." minHeight="400px" />
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto scrollbar-hide">
              {/* Increased height and vertical scroll */}
              <div className="max-h-[calc(105vh-280px)] min-h-[530px] overflow-y-auto scrollbar-hide">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Action
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Indent Number
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Indent Type
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Post
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Gender
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Department
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Prefer
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Experience
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        No. of Post
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Completion Date
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Social Site
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[300px]">
                        Social Site Types
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {tableLoading ? (
                      <tr>
                        <td colSpan="11" className="px-6 border-b-none py-1">
                          <LoadingSpinner message="Loading..." minHeight="450px" />
                        </td>
                      </tr>
                    ) : filteredData.length === 0 ? (
                      <tr>
                        <td colSpan="12" className="px-6 py-24 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <p className="text-gray-500 text-lg">No indent data found for the given filters.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      currentItems.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => handleShareClick(item)}
                                className="bg-green-600 px-3 py-1 rounded-md text-white text-xs hover:bg-green-700 transition-colors"
                              >
                                Share
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                            {item.indentNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-indigo-600">
                            {item.indentType || "—"}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 min-w-[150px] text-center">
                            {item.post}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 text-center">
                            {item.gender}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 text-center">
                            {item.department}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 text-center">
                            {item.prefer}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 break-words max-w-[200px] text-center">
                            {item.experience}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 text-center">
                            {item.noOfPost}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 text-center">
                            <div className="text-sm text-gray-900 break-words text-center">
                              {item.completionDate
                                ? (() => {
                                  // Robust date parsing for display
                                  if (typeof item.completionDate === 'string' && /^\d{2}\/\d{2}\/\d{4}/.test(item.completionDate)) {
                                    const parts = item.completionDate.split(' ');
                                    return (
                                      <div className="flex flex-col items-center">
                                        <div className="font-medium">{parts[0]}</div>
                                        <div className="text-xs text-gray-500">{parts[1] || ''}</div>
                                      </div>
                                    );
                                  }

                                  const date = new Date(item.completionDate);
                                  if (!date || isNaN(date.getTime()))
                                    return <span className="text-gray-400">{String(item.completionDate)}</span>;

                                  const day = date.getDate().toString().padStart(2, "0");
                                  const month = (date.getMonth() + 1).toString().padStart(2, "0");
                                  const year = date.getFullYear();
                                  const hours = date.getHours().toString().padStart(2, "0");
                                  const minutes = date.getMinutes().toString().padStart(2, "0");
                                  const seconds = date.getSeconds().toString().padStart(2, "0");

                                  return (
                                    <div className="flex flex-col items-center">
                                      <div className="font-medium">
                                        {`${day}/${month}/${year}`}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {`${hours}:${minutes}:${seconds}`}
                                      </div>
                                    </div>
                                  );
                                })()
                                : "—"}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 text-center">
                            {item.socialSite}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 break-words min-w-[300px] max-w-[400px] text-center">
                            {item.socialSiteTypes}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Refined Mobile Card View (Matched to FindEnquiry.jsx) */}
            <div className="md:hidden flex flex-col h-[calc(100vh-220px)]">
              <div className="flex-1 p-2 space-y-3 overflow-y-auto scrollbar-hide">
                {tableLoading ? (
                  <LoadingSpinner message="Retrieving indents..." minHeight="250px" />
                ) : filteredData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-32">
                    <div className="p-4 bg-gray-100 rounded-full mb-3">
                      <Search size={24} className="text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-bold text-sm tracking-tight text-center px-6 uppercase">No matching indents found</p>
                  </div>
                ) : (
                  currentItems.map((item, index) => (
                    <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 space-y-3 relative overflow-hidden group hover:border-indigo-200 transition-all duration-300">
                      {/* Card Header: Indent Identifiers */}
                      <div className="flex justify-between items-center bg-gray-50/80 -mx-3 -mt-3 p-2.5 px-3 border-b border-gray-100 mb-0.5">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-3 bg-indigo-600 rounded-full"></div>
                          <span className="font-black text-indigo-600 text-xs tracking-tighter uppercase">{item.indentNumber}</span>
                        </div>
                        <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">{item.department}</span>
                      </div>

                      {/* Main Post Section */}
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-black text-gray-800 leading-tight truncate uppercase tracking-tight">{item.post}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded uppercase">{item.gender}</span>
                            <span className="text-[10px] font-bold text-gray-500 border border-gray-100 px-1.5 py-0.5 rounded uppercase">{item.noOfPost} Posts</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleShareClick(item)}
                          className="p-2 bg-indigo-600 text-white rounded-lg shadow-lg shadow-indigo-100 active:scale-90 transition-transform shrink-0"
                          title="Share Indent"
                        >
                          <HistoryIcon size={14} />
                        </button>
                      </div>

                      {/* Detailed Grid Section - High Density */}
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-50">
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-gray-400 font-black uppercase tracking-tighter block opacity-60">Completion Target</span>
                          <div className="flex items-center gap-1.5 font-bold text-gray-700 text-[10px]">
                            <Calendar size={10} className="text-indigo-400" />
                            {item.completionDate ? (typeof item.completionDate === 'string' ? item.completionDate.split(' ')[0] : new Date(item.completionDate).toLocaleDateString()) : "N/A"}
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-gray-400 font-black uppercase tracking-tighter block opacity-60">Experience Req</span>
                          <div className="text-[10px] font-bold text-gray-700 truncate">{item.experience || "Not Specified"}</div>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-gray-400 font-black uppercase tracking-tighter block opacity-60">Preference</span>
                          <div className="text-[10px] font-bold text-gray-700">{item.prefer}</div>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-gray-400 font-black uppercase tracking-tighter block opacity-60">Sourcing</span>
                          <div className={`text-[10px] font-bold ${item.socialSite === "Yes" ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {item.socialSite === "Yes" ? "Social Sites Required" : "No Social Site"}
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-gray-400 font-black uppercase tracking-tighter block opacity-60">Indent Type</span>
                          <div className="text-[10px] font-bold text-indigo-600 uppercase">{item.indentType || "N/A"}</div>
                        </div>
                      </div>

                      {/* Site Types (Conditional Box) */}
                      {item.socialSite === "Yes" && item.socialSiteTypes && (
                        <div className="bg-indigo-50/30 p-2 rounded border border-indigo-100/50 mt-1 animate-in slide-in-from-top-1 duration-300">
                          <span className="text-[8px] text-indigo-400 font-black uppercase tracking-tighter block mb-1">Approved Platform Channels</span>
                          <div className="text-[10px] font-medium text-indigo-700 leading-tight">{item.socialSiteTypes}</div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Sticky Fixed Mobile Pagination (Standardized UI) */}
              <div className="border-t border-gray-200 bg-white p-2.5 flex justify-center sticky bottom-0 z-10 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
                {renderPaginationNav()}
              </div>
            </div>

            {/* Desktop Pagination Controls Footer (Standardized) - Hidden on Mobile since it's redundant */}
            <div className="hidden md:flex px-4 py-1.5 bg-white border-t border-gray-200 items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-4 flex-wrap">
                <p className="text-sm text-gray-700 font-medium">
                  Showing <span className="font-bold">{filteredData.length > 0 ? indexOfFirstItem + 1 : 0}</span> to <span className="font-bold">{Math.min(indexOfLastItem, filteredData.length)}</span> of <span className="font-bold">{filteredData.length}</span> records
                </p>
                <div className="flex items-center gap-2 border-l border-gray-300 pl-4 h-5">
                  <label className="text-xs text-gray-500 font-medium whitespace-nowrap">Rows per page:</label>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="text-[11px] border border-gray-200 rounded-md px-2 py-0.5 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white font-medium text-gray-700 outline-none transition shadow-sm"
                  >
                    {[15, 30, 50, 100].map(val => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center w-auto justify-end gap-4">
                {renderPaginationNav()}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Indent;