import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Camera,
  Edit3,
  Save,
  X,
  Building,
  Phone,
  Mail,
  MapPin,
  Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';

const MyProfile = () => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leaveData, setLeaveData] = useState([]);
  const [gatePassData, setGatePassData] = useState([]);
  const [isHovering, setIsHovering] = useState(false); // Added isHovering state
  const fileInputRef = useRef(null); // Added fileInputRef

  const handleProfilePictureClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    try {
      setLoading(true);

      // Convert file to base64
      const base64Data = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          // Remove the data URL prefix if present
          const result = reader.result;
          if (typeof result === 'string' && result.includes('base64,')) {
            resolve(result.split('base64,')[1]);
          } else {
            resolve(result);
          }
        };
        reader.readAsDataURL(file);
      });

      // Upload to Google Drive (with fallbacks for robustness)
      const folderIdsToTry = [
        import.meta.env.VITE_GOOGLE_DRIVE_PROFILE_FOLDER_ID,
        import.meta.env.VITE_GOOGLE_DRIVE_PHOTO_FOLDER_ID,
        import.meta.env.VITE_GOOGLE_DRIVE_ENQUIRY_FOLDER_ID
      ].filter(Boolean);

      let uploadResult = { success: false };
      let lastUploadError = null;

      for (const folderId of folderIdsToTry) {
        try {
          const uploadResponse = await fetch(
            import.meta.env.VITE_APPS_SCRIPT_URL,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                action: "uploadFile",
                fileName: `profile_${profileData.joiningNo}_${Date.now()}.jpg`,
                mimeType: file.type,
                base64Data: base64Data,
                folderId: folderId
              }).toString(),
            }
          );

          uploadResult = await uploadResponse.json();
          if (uploadResult.success) break;
          lastUploadError = uploadResult.error;
        } catch (err) {
          lastUploadError = err.message;
        }
      }

      if (!uploadResult.success) {
        throw new Error(lastUploadError || "Failed to upload image to all available folders");
      }

      const imageUrl = uploadResult.fileUrl;

      // Find the row with matching Joining No and update Column H
      const fullDataResponse = await fetch(
        `${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=JOINING&action=fetch`
      );

      if (!fullDataResponse.ok) {
        throw new Error(`HTTP error! status: ${fullDataResponse.status}`);
      }

      const fullDataResult = await fullDataResponse.json();
      const allData = fullDataResult.data || fullDataResult;

      // Find header row by looking for joining ID or Name
      let headerRowIndex = -1;
      let headers = [];

      for (let i = 0; i < allData.length; i++) {
        const row = allData[i];
        if (row && Array.isArray(row)) {
          const idIndex = row.findIndex(cell => {
            if (!cell) return false;
            const text = cell.toString().trim().toLowerCase();
            return text.includes('ska-joining id') || text.includes('joining id') || text === 'name as per aadhar' || text.includes('candidate name');
          });

          if (idIndex !== -1) {
            headerRowIndex = i;
            headers = row.map(h => h?.toString().trim());
            break;
          }
        }
      }

      if (headerRowIndex === -1) {
        console.warn("Could not find header row dynamically, falling back to row 0");
        headerRowIndex = 0;
        headers = allData[0].map(h => h?.toString().trim());
      }

      // 2. Find the row in ENQUIRY sheet and update Column Q (Index 16, Column 17)
      const enquiryResponse = await fetch(
        `${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=ENQUIRY&action=fetch`
      );

      if (!enquiryResponse.ok) {
        throw new Error(`HTTP error! status: ${enquiryResponse.status}`);
      }

      const enquiryResult = await enquiryResponse.json();
      const enquiryData = enquiryResult.data || enquiryResult;

      // Find header row in ENQUIRY
      let enquiryHeaderRowIndex = -1;
      let enquiryHeaders = [];

      for (let i = 0; i < enquiryData.length; i++) {
        const row = enquiryData[i];
        if (row && Array.isArray(row)) {
          const idIndex = row.findIndex(cell => {
            if (!cell) return false;
            const text = cell.toString().trim().toLowerCase();
            return text.includes('ska-joining id') || text.includes('joining id') || text.includes("candidate's photo") || text.includes("candidate photo");
          });

          if (idIndex !== -1) {
            enquiryHeaderRowIndex = i;
            enquiryHeaders = row.map(h => h?.toString().trim());
            break;
          }
        }
      }

      if (enquiryHeaderRowIndex === -1) {
        enquiryHeaderRowIndex = 5; // Fallback to row 6 (index 5)
        enquiryHeaders = enquiryData[5]?.map(h => h?.toString().trim()) || [];
      }

      const employeeIdIndex = enquiryHeaders.findIndex(h =>
        h && (h.toLowerCase().includes('ska-joining id') || h.toLowerCase().includes('joining id'))
      );

      const nameIndex = enquiryHeaders.findIndex(h =>
        h && (h.toLowerCase().includes('name as per aadhar') || h.toLowerCase().includes('candidate name') || h.toLowerCase() === 'name')
      );

      // Find the row index in ENQUIRY
      const enquiryRowIndex = enquiryData.findIndex((row, idx) => {
        if (idx <= enquiryHeaderRowIndex) return false;

        // Match by Employee ID first (most reliable)
        if (employeeIdIndex !== -1 && profileData.joiningNo) {
          const rowId = row[employeeIdIndex]?.toString().trim().toLowerCase();
          const targetId = profileData.joiningNo.toString().trim().toLowerCase();
          if (rowId && rowId === targetId) return true;
        }

        // Match by Name as fallback
        if (nameIndex !== -1 && profileData.candidateName) {
          const rowName = row[nameIndex]?.toString().trim().toLowerCase();
          const targetName = profileData.candidateName.toString().trim().toLowerCase();
          if (rowName === targetName) return true;
        }

        return false;
      });

      if (enquiryRowIndex === -1) throw new Error(`Employee record not found in ENQUIRY sheet`);

      // Update the ENQUIRY sheet with the new image URL in Column Q (Column 17)
      const updateResponse = await fetch(
        import.meta.env.VITE_APPS_SCRIPT_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            action: "updateCell",
            sheetName: "ENQUIRY",
            rowIndex: enquiryRowIndex + 1, // Convert to 1-based index
            columnIndex: 17, // Column Q (1-based index)
            value: imageUrl
          }).toString(),
        }
      );

      const updateResultText = await updateResponse.text();
      let updateResult;
      try {
        updateResult = JSON.parse(updateResultText);
      } catch (e) {
        updateResult = { success: updateResultText.toLowerCase().includes('success') || updateResultText === '' };
      }

      if (updateResult.success) {
        // Update local state
        setProfileData(prev => ({ ...prev, candidatePhoto: imageUrl }));
        setFormData(prev => ({ ...prev, candidatePhoto: imageUrl }));
        toast.success('Profile picture updated successfully!');
      } else {
        throw new Error(updateResult.error || "Failed to update profile in ENQUIRY sheet");
      }

    } catch (error) {
      console.error('Error uploading profile picture:', error);
      toast.error(`Failed to upload profile picture: ${error.message}`);
    } finally {
      setLoading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };


  const fetchLeaveData = async () => {
    try {
      // Get employee ID from localStorage
      const employeeId = localStorage.getItem("employeeId");
      if (!employeeId) {
        console.log("No employee ID found for fetching leave data");
        return;
      }

      // Fetch data from the Leave Management sheet
      const response = await fetch(
        `${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=Leave Management&action=fetch`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data from Leave Management sheet');
      }

      const rawData = result.data || result;

      if (!Array.isArray(rawData)) {
        throw new Error('Expected array data not received');
      }

      // Find header row (usually index 5, row 6)
      let headerRowIndex = -1;
      let headers = [];

      for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        if (row && Array.isArray(row)) {
          const typeIndex = row.findIndex(cell =>
            cell && cell.toString().trim().toLowerCase().includes('leave type')
          );

          if (typeIndex !== -1) {
            headerRowIndex = i;
            headers = row.map(h => h?.toString().trim());
            break;
          }
        }
      }

      if (headerRowIndex === -1) {
        if (rawData.length > 5) {
          headerRowIndex = 5;
          headers = rawData[5].map(h => h?.toString().trim());
        } else {
          headerRowIndex = 0;
          headers = rawData[0].map(h => h?.toString().trim());
        }
      }

      const dataRows = rawData.length > headerRowIndex + 1 ? rawData.slice(headerRowIndex + 1) : [];

      const getIndex = (possibleNames, fallbackIndex) => {
        for (const name of possibleNames) {
          const index = headers.findIndex(h =>
            h && h.toString().trim().toLowerCase().includes(name.toLowerCase())
          );
          if (index !== -1) return index;
        }
        return fallbackIndex; // Use fallback index if header match fails
      };

      const employeeNameIndex = getIndex(['employee name', 'name', 'employee'], 3);
      const fromDateIndex = getIndex(['start date', 'from date', 'leave date start'], 9);
      const toDateIndex = getIndex(['end date', 'to date', 'leave date end'], 10);
      const remarksIndex = getIndex(['reason', 'remarks', 'comment'], 8);
      const statusIndex = getIndex(['status', 'approval status'], 14);
      const leaveTypeIndex = getIndex(['leave type', 'type', 'leave'], 7);

      // Process data and filter for current employee
      const processedData = dataRows
        .filter(row => {
          const rowEmployeeName = row[employeeNameIndex]?.toString().trim() || "";
          const targetName = profileData?.candidateName?.toString().trim() || "";

          // Also try to match with user from localStorage as fallback
          const userStr = localStorage.getItem('user');
          let lsUserName = "";
          if (userStr) {
            const user = JSON.parse(userStr);
            lsUserName = (user.Name || user.userName || "").toString().trim();
          }

          if (!rowEmployeeName) return false;

          return (targetName && rowEmployeeName.toLowerCase() === targetName.toLowerCase()) ||
            (lsUserName && rowEmployeeName.toLowerCase() === lsUserName.toLowerCase());
        })
        .map(row => ({
          employeeName: row[employeeNameIndex] || '',
          fromDate: row[fromDateIndex] || '',
          toDate: row[toDateIndex] || '',
          remarks: row[remarksIndex] || '',
          status: row[statusIndex] || 'Pending',
          leaveType: row[leaveTypeIndex] || ''
        }));

      console.log('Processed leave data:', processedData);
      setLeaveData(processedData);
    } catch (error) {
      console.error('Error fetching leave data:', error);
    }
  };


  const fetchGatePassData = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=Gate Pass&action=fetch`
      );

      if (!response.ok) {
        console.warn(`Gate Pass fetch HTTP error! status: ${response.status}`);
        setGatePassData([]);
        return;
      }

      const result = await response.json();
      if (!result.success) {
        console.warn(result.error || 'Gate Pass sheet might not exist or is inaccessible. Defaulting to empty.');
        setGatePassData([]);
        return;
      }

      const rawData = result.data || result;
      if (!Array.isArray(rawData) || rawData.length < 1) {
        setGatePassData([]);
        return;
      }

      const headers = rawData[0].map(h => h?.toString().trim());
      const dataRows = rawData.slice(1);

      const getIndex = (col) => headers.findIndex(h => h && h.toLowerCase().includes(col.toLowerCase()));

      const empIndex = getIndex('Employee Name');
      const placeIndex = getIndex('Place and reason to visit');
      const departureIndex = getIndex('Departure From Plant');
      const arrivalIndex = getIndex('Arrival at Plant');
      const statusIndex = getIndex('Status');

      const processedData = dataRows
        .filter(row => row[empIndex]?.toString().trim().toLowerCase() === profileData.candidateName?.toLowerCase())
        .map(row => ({
          employeeName: row[empIndex] || '',
          place: row[placeIndex] || '',
          departure: row[departureIndex] || '',
          arrival: row[arrivalIndex] || '',
          status: row[statusIndex] || ''
        }));

      setGatePassData(processedData);
    } catch (error) {
      console.warn('Could not fetch gate pass data (likely missing sheet on backend).');
      setGatePassData([]);
    }
  };

  useEffect(() => {
    if (profileData && profileData.candidateName) {
      fetchLeaveData();
      fetchGatePassData();
    } else if (profileData === null && !loading) {
      // Redirect to Leave Request if profile data is not found after loading
      navigate('/leave-request');
    }
  }, [profileData, loading, navigate]);


  const fetchJoiningData = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) {
        throw new Error('No user data found in localStorage');
      }

      const currentUser = JSON.parse(userData);
      const userName = currentUser.Name;

      const response = await fetch(
        `${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=JOINING&action=fetch`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data from JOINING sheet');
      }

      const rawData = result.data || result;

      if (!Array.isArray(rawData)) {
        throw new Error('Expected array data not received');
      }

      // Find the header row by looking for the Joining ID column
      let headerRowIndex = -1;
      let headers = [];

      for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        if (row && Array.isArray(row)) {
          const joiningIdIndex = row.findIndex(cell => {
            if (!cell) return false;
            const text = cell.toString().trim().toLowerCase();
            return text.includes('ska-joining id') || text.includes('joining id') || text === 'id';
          });

          if (joiningIdIndex !== -1) {
            headerRowIndex = i;
            headers = row.map(h => h?.toString().trim());
            break;
          }
        }
      }

      // If we couldn't find a header row dynamically, assume row index 0
      if (headerRowIndex === -1) {
        console.warn('Could not definitively find header row, assuming row 0');
        headerRowIndex = 0;
        headers = rawData[0].map(h => h?.toString().trim());
      }

      const dataRows = rawData.length > headerRowIndex + 1 ? rawData.slice(headerRowIndex + 1) : [];

      const getIndex = (headerName) => {
        const index = headers.findIndex(h =>
          h && h.toString().trim().toLowerCase().includes(headerName.toLowerCase())
        );
        if (index === -1) {
          // Fallback static indices based on known sheet structure if dynamic fails
          if (headerName === 'SKA-Joining ID') return 1;
          if (headerName === 'Name As Per Aadhar') return 6;
        }
        return index;
      };

      const processedData = dataRows.map(row => ({
        timestamp: row[getIndex('Timestamp')] || row[0] || '',
        joiningNo: row[getIndex('SKA-Joining ID')] || row[1] || '',
        candidateName: row[getIndex('Name As Per Aadhar')] || row[6] || '',
        candidatePhoto: row[getIndex("Candidate's Photo")] || row[25] || '',
        fatherName: row[getIndex('Father / Husband name')] || '',
        dateOfJoining: row[getIndex('Date Of Joining')] || row[19] || '',
        joiningPlace: '',
        designation: row[getIndex('Designation')] || row[5] || '',
        salary: row[getIndex('Department')] || row[4] || '',
        currentAddress: row[getIndex('Current Address')] || row[18] || '',
        addressAsPerAadhar: '',
        bodAsPerAadhar: row[getIndex('Date Of Birth As Per Aadhar Card')] || row[8] || '',
        gender: row[getIndex('Gender')] || row[7] || '',
        mobileNo: row[getIndex('Mobile No.')] || row[9] || '',
        familyMobileNo: row[getIndex('Family Mobile No')] || row[12] || '',
        relationWithFamily: row[getIndex('Relationship With Family Person')] || row[13] || '',
        email: row[getIndex('Personal Email-Id')] || row[10] || '',
        companyName: row[getIndex('Department')] || row[4] || '',
        aadharNo: row[getIndex('Aadhar Card No')] || row[15] || '',
      }));

      // Get user code for reliable matching
      const userCode = currentUser.Code || currentUser.UserId || "";

      // Filter data for the current user
      const filteredData = processedData.filter(task => {
        const candidateName = task.candidateName?.toString() || "";
        const targetName = userName?.toString() || "";
        const candidateCode = task.joiningNo?.toString() || "";
        const targetCode = userCode?.toString() || "";

        // Match by Code if available (most reliable)
        if (targetCode && candidateCode && candidateCode.trim().toLowerCase() === targetCode.trim().toLowerCase()) {
          return true;
        }

        // Fallback to name match
        return candidateName.trim().toLowerCase() === targetName.trim().toLowerCase() && targetName !== "";
      });

      if (filteredData.length > 0) {
        const profile = filteredData[0];

        // Fetch profile image from ENQUIRY sheet
        try {
          const enquiryResponse = await fetch(
            `${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=ENQUIRY&action=fetch`
          );

          if (enquiryResponse.ok) {
            const enquiryResult = await enquiryResponse.json();
            if (enquiryResult.success) {
              const enquiryData = enquiryResult.data || enquiryResult;

              // Find the header row in ENQUIRY sheet
              let enquiryHeaderRowIndex = -1;
              let enquiryHeaders = [];

              for (let i = 0; i < enquiryData.length; i++) {
                const row = enquiryData[i];
                if (row && Array.isArray(row)) {
                  const candidatePhotoIndex = row.findIndex(cell =>
                    cell && (cell.toString().trim().toLowerCase().includes("candidate's photo") || cell.toString().trim().toLowerCase().includes("candidate photo"))
                  );

                  if (candidatePhotoIndex !== -1) {
                    enquiryHeaderRowIndex = i;
                    enquiryHeaders = row.map(h => h?.toString().trim());
                    break;
                  }
                }
              }

              if (enquiryHeaderRowIndex !== -1) {
                const photoIndex = 16; // Column Q is Index 16

                // Find indices for ID and Name in ENQUIRY
                const employeeIdIndex = enquiryHeaders.findIndex(h =>
                  h && (h.toLowerCase().includes('ska-joining id') || h.toLowerCase().includes('joining id'))
                );
                const enquiryNameIndex = enquiryHeaders.findIndex(h =>
                  h && (h.toLowerCase().includes('name as per aadhar') || h.toLowerCase().includes('candidate name') || h.toLowerCase() === 'name')
                );

                for (let i = enquiryHeaderRowIndex + 1; i < enquiryData.length; i++) {
                  const row = enquiryData[i];
                  if (!row) continue;

                  let isMatch = false;

                  // Match by Joining ID
                  if (employeeIdIndex !== -1 && profile.joiningNo) {
                    const rowId = row[employeeIdIndex]?.toString().trim().toLowerCase();
                    const targetId = profile.joiningNo.toString().trim().toLowerCase();
                    if (rowId && targetId && rowId === targetId) isMatch = true;
                  }

                  // Fallback: Match by Name if ID doesn't match or column missing
                  if (!isMatch && enquiryNameIndex !== -1 && profile.candidateName) {
                    const rowName = row[enquiryNameIndex]?.toString().trim().toLowerCase();
                    const targetName = profile.candidateName.toString().trim().toLowerCase();
                    if (rowName && targetName && rowName === targetName) isMatch = true;
                  }

                  if (isMatch && row[photoIndex]) {
                    profile.candidatePhoto = row[photoIndex];
                    break;
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error('Error fetching profile image from ENQUIRY sheet:', error);
          // Continue without the profile image if there's an error
        }

        setProfileData(profile);
        setFormData(profile);
        localStorage.setItem("employeeId", profile.joiningNo);
      } else {
        setProfileData(null);
        setFormData({});
      }

    } catch (error) {
      console.error('Error fetching joining data:', error);
      toast.error(`Failed to load profile data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJoiningData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      // 1. Fetch current data from JOINING sheet
      const fullDataResponse = await fetch(
        `${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=JOINING&action=fetch`
      );

      if (!fullDataResponse.ok) {
        throw new Error(`HTTP error! status: ${fullDataResponse.status}`);
      }

      const fullDataResult = await fullDataResponse.json();
      if (!fullDataResult.success && !Array.isArray(fullDataResult)) {
        throw new Error(fullDataResult.error || "Failed to fetch current data");
      }

      const allData = fullDataResult.data || fullDataResult;

      // 2. Find header row by looking for joining ID or Name
      let headerRowIndex = -1;
      let headers = [];

      for (let i = 0; i < allData.length; i++) {
        const row = allData[i];
        if (row && Array.isArray(row)) {
          const idIndex = row.findIndex(cell => {
            if (!cell) return false;
            const text = cell.toString().trim().toLowerCase();
            return text.includes('ska-joining id') || text.includes('joining id') || text === 'id' || text === 'name as per aadhar' || text.includes('candidate name');
          });

          if (idIndex !== -1) {
            headerRowIndex = i;
            headers = row.map(h => h?.toString().trim());
            break;
          }
        }
      }

      if (headerRowIndex === -1) {
        console.warn("Could not find header row dynamically, falling back to row 0");
        headerRowIndex = 0;
        headers = allData[0].map(h => h?.toString().trim());
      }

      // 3. Find relevant column indices
      const employeeIdIndex = headers.findIndex(h =>
        h && (h.toLowerCase().includes('ska-joining id') || h.toLowerCase().includes('joining id'))
      );

      const nameIndex = headers.findIndex(h =>
        h && (h.toLowerCase().includes('name as per aadhar') || h.toLowerCase().includes('candidate name') || h.toLowerCase() === 'name')
      );

      // 4. Find the employee row index
      const rowIndex = allData.findIndex((row, idx) => {
        if (idx <= headerRowIndex) return false;

        // Match by Name first (as requested)
        if (nameIndex !== -1 && profileData.candidateName) {
          const rowName = row[nameIndex]?.toString().trim().toLowerCase();
          const targetName = profileData.candidateName.toString().trim().toLowerCase();
          if (rowName === targetName) return true;
        }

        // Match by Employee ID as fallback
        if (employeeIdIndex !== -1 && profileData.joiningNo) {
          const rowId = row[employeeIdIndex]?.toString().trim().toLowerCase();
          const targetId = profileData.joiningNo.toString().trim().toLowerCase();
          if (rowId && rowId === targetId) return true;
        }

        return false;
      });

      if (rowIndex === -1) throw new Error(`Could not find row for employee: ${profileData.candidateName}`);

      // 5. Get a copy of the existing row
      let currentRow = [...allData[rowIndex]];

      // 6. Apply updates to the row data
      // Map form fields to their respective column indices
      const headerMap = {
        'mobileNo': headers.findIndex(h => h && h.toLowerCase().includes('mobile no')),
        'familyMobileNo': headers.findIndex(h => h && h.toLowerCase().includes('family mobile no')),
        'email': headers.findIndex(h => h && h.toLowerCase().includes('personal email-id')),
        'currentAddress': headers.findIndex(h => h && h.toLowerCase().includes('current address'))
      };

      // Only update fields that are editable in the form
      if (headerMap['mobileNo'] !== -1) {
        currentRow[headerMap['mobileNo']] = formData.mobileNo || '';
      }
      if (headerMap['familyMobileNo'] !== -1) {
        currentRow[headerMap['familyMobileNo']] = formData.familyMobileNo || '';
      }
      if (headerMap['email'] !== -1) {
        currentRow[headerMap['email']] = formData.email || '';
      }
      if (headerMap['currentAddress'] !== -1) {
        currentRow[headerMap['currentAddress']] = formData.currentAddress || '';
      }

      // 7. Prepare payload
      const payload = {
        sheetName: "JOINING",
        action: "update",
        rowIndex: rowIndex + 1, // Convert to 1-based index
        rowData: JSON.stringify(currentRow)
      };

      console.log("Final payload being sent:", payload);

      // 8. Send update request
      const response = await fetch(
        import.meta.env.VITE_APPS_SCRIPT_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams(payload).toString(),
        }
      );

      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        result = { success: responseText.toLowerCase().includes('success') || responseText === '' };
      }

      console.log("Update result:", result);

      if (result.success || responseText.toLowerCase().includes('success')) {
        // Update local state only after successful API update
        setProfileData(formData);
        toast.success('Profile updated successfully!');
        setIsEditing(false);
      } else {
        throw new Error(result.error || "Failed to update data");
      }

    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(`Failed to update profile: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData(profileData || {});
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="page-content p-6">
        <LoadingSpinner message="Loading profile data..." minHeight="400px" />
      </div>
    );
  }

  if (!profileData) {
    return <div className="page-content p-6">No profile data available</div>;
  }

  // Debug log to verify photo source
  console.log("Profile Photo URL:", profileData.candidatePhoto);

  return (
    <div className="space-y-6 page-content p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">My Profile</h1>
        <div className="flex space-x-2">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Edit3 size={16} className="mr-2" />
              Edit Profile
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={handleSave}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Save size={16} className="mr-2" />
                Save
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                <X size={16} className="mr-2" />
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Profile Picture & Basic Info - Modified Section */}
        <div className="bg-white rounded-xl shadow-lg border p-6">
          <div className="text-center">
            <div
              className="relative w-32 h-32 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden cursor-pointer"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              onClick={handleProfilePictureClick}
            >
              {profileData.candidatePhoto ? (
                <img
                  src={profileData.candidatePhoto}
                  alt="Profile"
                  className="w-full h-full object-cover profile-image-tag"
                  onError={(e) => {
                    const originalUrl = profileData.candidatePhoto;
                    // If standard Drive link fails, try converting to direct format as fallback
                    if (originalUrl && originalUrl.includes('drive.google.com') && !e.target.src.includes('lh3.googleusercontent.com')) {
                      const idMatch = originalUrl.match(/[-\w]{25,}/);
                      if (idMatch) {
                        console.log("Drive preview failed, trying direct stream format...");
                        e.target.src = `https://lh3.googleusercontent.com/d/${idMatch[0]}`;
                        return;
                      }
                    }
                    
                    console.warn("Image could not be loaded even with fallback.");
                    e.target.style.display = "none";
                    const defaultAvatar = e.target.parentElement.querySelector('.default-avatar-container');
                    if (defaultAvatar) defaultAvatar.classList.remove('hidden');
                    if (defaultAvatar) defaultAvatar.classList.add('flex');
                  }}
                  onLoad={(e) => {
                    e.target.style.display = "block";
                    const defaultAvatar = e.target.parentElement.querySelector('.default-avatar-container');
                    if (defaultAvatar) {
                      defaultAvatar.classList.remove('flex');
                      defaultAvatar.classList.add('hidden');
                    }
                  }}
                />
              ) : null}
              <div
                className={`default-avatar-container w-full h-full items-center justify-center ${profileData.candidatePhoto ? "hidden" : "flex"
                  }`}
              >
                <User size={48} className="text-indigo-400" />
              </div>

              {/* Hover overlay with camera icon */}
              <div
                className={`absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-full transition-opacity duration-200 ${isHovering ? 'opacity-100' : 'opacity-0'
                  }`}
              >
                <Camera size={32} className="text-white" />
              </div>
            </div>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />

            <h2 className="text-xl font-bold text-gray-800">
              {profileData.candidateName}
            </h2>
            <p className="text-gray-600 font-bold">{profileData.designation}</p>
            <p className="text-sm text-gray-500 mt-1">Click on photo to update</p>
          </div>
        </div>

        {/* Personal Information */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-6">
            Personal Information
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-4 md:gap-6">
            {/* First Column */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User size={16} className="inline mr-2" />
                  Full Name
                </label>
                <p className="text-gray-800 font-medium">
                  {profileData.candidateName}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building size={16} className="inline mr-2" />
                  Joining ID
                </label>
                <p className="text-gray-800">{profileData.joiningNo}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building size={16} className="inline mr-2" />
                  Department
                </label>
                <p className="text-gray-800">{profileData.companyName}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar size={16} className="inline mr-2" />
                  Date of Birth
                </label>
                <p className="text-gray-800">{profileData.bodAsPerAadhar}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender
                </label>
                <p className="text-gray-800">{profileData.gender}</p>
              </div>
            </div>

            {/* Second Column */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Father's Name
                </label>
                <p className="text-gray-800">{profileData.fatherName}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar size={16} className="inline mr-2" />
                  Joining Date
                </label>
                <p className="text-gray-800">{profileData.dateOfJoining}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail size={16} className="inline mr-2" />
                  Email Address
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    name="email"
                    value={formData.email || ""}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <p className="text-gray-800">{profileData.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone size={16} className="inline mr-2" />
                  Phone Number
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    name="mobileNo"
                    value={formData.mobileNo || ""}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <p className="text-gray-800">{profileData.mobileNo}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Contact
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    name="familyMobileNo"
                    value={formData.familyMobileNo || ""}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <p className="text-gray-800">{profileData.familyMobileNo}</p>
                )}
              </div>
            </div>
          </div>

          {/* Current Address - Full width below the two columns */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin size={16} className="inline mr-2" />
              Current Address
            </label>
            {isEditing ? (
              <textarea
                name="currentAddress"
                value={formData.currentAddress || ""}
                onChange={handleInputChange}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            ) : (
              <p className="text-gray-800 whitespace-pre-line">
                {profileData.currentAddress}
              </p>
            )}
          </div>
        </div>
      </div>
      {/* Bottom Section - Full Width */}
      <div className="w-full pb-12">
        {/* Leave History Card */}
        <div className="bg-white rounded-xl shadow-lg border p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-6">
            Leave History
          </h3>
          {leaveData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Leave Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      From Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      To Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leaveData.map((leave, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 text-sm text-gray-800">
                        {leave.leaveType}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800">
                        {leave.fromDate}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800">
                        {leave.toDate}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${leave.status.toLowerCase() === "approved"
                            ? "bg-green-100 text-green-800"
                            : leave.status.toLowerCase() === "rejected"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                            }`}
                        >
                          {leave.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800">
                        {leave.remarks}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-600 text-center py-4">
              No leave records found
            </p>
          )}
        </div>

        {/* Gate Pass Card */}
        {/* <div className="bg-white rounded-xl shadow-lg border p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-6">
            Gate Pass History
          </h3>
          {gatePassData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Place & Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Departure
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Arrival
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {gatePassData.map((gp, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 text-sm text-gray-800">
                        {gp.place}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800">
                        {gp.departure}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800">
                        {gp.arrival}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            gp.status.toLowerCase() === "approved"
                              ? "bg-green-100 text-green-800"
                              : gp.status.toLowerCase() === "rejected"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {gp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-600 text-center py-4">
              No gate pass records found
            </p>
          )}
        </div> */}
      </div>
    </div>
  );
};

export default MyProfile;