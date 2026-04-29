import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useDataStore = create(
  persist(
    (set, get) => ({
      // Indent Data
      indentData: [],
      addIndent: (data) => set((state) => ({
        indentData: [...state.indentData, { 
          ...data, 
          id: Date.now(), 
          indentNo: `IND-${String(state.indentData.length + 1).padStart(3, '0')}`,
          createdAt: new Date().toISOString() 
        }]
      })),

      // Social Site Data
      socialSiteData: [],
      moveSocialSiteToHistory: (id) => set((state) => ({
        socialSiteData: state.socialSiteData.map(item => 
          item.id === id ? { ...item, status: 'completed' } : item
        )
      })),

      // Find Enquiry Data
      findEnquiryData: [],
      addEnquiry: (data) => set((state) => ({
        findEnquiryData: [...state.findEnquiryData, { 
          ...data, 
          id: Date.now(),
          candidateEnquiryNo: `EN-${String(state.findEnquiryData.length + 1).padStart(3, '0')}`,
          createdAt: new Date().toISOString() 
        }]
      })),

      // Call Tracker Data
      callTrackerData: [],
      updateCallTracker: (id, data) => set((state) => ({
        callTrackerData: state.callTrackerData.map(item => 
          item.id === id ? { ...item, ...data, lastUpdated: new Date().toISOString() } : item
        )
      })),

      // Employee Data
      employeeData: [],
      addEmployee: (data) => set((state) => ({
        employeeData: [...state.employeeData, { 
          ...data, 
          id: Date.now(),
          employeeId: `EMP-${String(state.employeeData.length + 1).padStart(4, '0')}`,
          status: 'active',
          createdAt: new Date().toISOString() 
        }]
      })),

      // After Joining Work Data
      afterJoiningData: [],
      updateAfterJoining: (id, data) => set((state) => ({
        afterJoiningData: state.afterJoiningData.map(item => 
          item.id === id ? { ...item, ...data, completed: true } : item
        )
      })),

      // Leaving Data
      leavingData: [],
      addLeaving: (data) => set((state) => ({
        leavingData: [...state.leavingData, { 
          ...data, 
          id: Date.now(),
          status: 'pending',
          createdAt: new Date().toISOString() 
        }]
      })),

      // After Leaving Work Data
      afterLeavingData: [],
      updateAfterLeaving: (id, data) => set((state) => ({
        afterLeavingData: state.afterLeavingData.map(item => 
          item.id === id ? { ...item, ...data, completed: true } : item
        )
      })),

      // Employee Attendance Data
      attendanceData: [],
      addAttendance: (data) => set((state) => ({
        attendanceData: [...state.attendanceData, { 
          ...data, 
          id: Date.now(),
          createdAt: new Date().toISOString() 
        }]
      })),

      // Leave Requests Data
      leaveRequestsData: [],
      addLeaveRequest: (data) => set((state) => ({
        leaveRequestsData: [...state.leaveRequestsData, { 
          ...data, 
          id: Date.now(),
          appliedDate: new Date().toISOString().split('T')[0],
          status: 'Pending'
        }]
      })),

      // Salary Data
      salaryData: [],

      // Employee Profile Data
      employeeProfileData: {},

      // Helper function to get filtered data based on user role
      getFilteredData: (dataType, user) => {
        const state = get();
        if (user?.role === 'admin') {
          return state[dataType] || [];
        } else if (user?.role === 'employee') {
          // Filter data for specific employee
          const data = state[dataType] || [];
          if (dataType === 'attendanceData' || dataType === 'leaveRequestsData' || dataType === 'salaryData') {
            return data.filter(item => item.employeeId === user.employeeId);
          }
          return data;
        }
        return [];
      },

      // Initialize data from other stores
      initializeFromIndent: () => {
        const state = get();
        state.indentData.forEach(indent => {
          const existsInSocial = state.socialSiteData.find(item => item.indentId === indent.id);
          if (!existsInSocial) {
            state.socialSiteData.push({
              ...indent,
              indentId: indent.id,
              status: 'pending'
            });
          }
        });
      },

      initializeFromSocial: () => {
        const state = get();
        const completedSocial = state.socialSiteData.filter(item => item.status === 'completed');
        completedSocial.forEach(social => {
          const existsInEnquiry = state.findEnquiryData.find(item => item.indentId === social.indentId);
          if (!existsInEnquiry) {
            // This will be handled when enquiry is created
          }
        });
      }
    }),
    {
      name: 'hr-fms-data-storage',
    }
  )
);

export default useDataStore;