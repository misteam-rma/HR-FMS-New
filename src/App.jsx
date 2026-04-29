import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/admin/Dashboard';
import Indent from './pages/admin/Indent';
import FindEnquiry from './pages/admin/FindEnquiry';
import CallTracker from './pages/admin/CallTracker';
import AfterJoiningWork from './pages/admin/AfterJoiningWork';
import Leaving from './pages/admin/Leaving';
import AfterLeavingWork from './pages/admin/AfterLeavingWork';
import Employee from './pages/admin/Employee';
import MyProfile from './pages/user/MyProfile';
import MyAttendance from './pages/user/MyAttendance';
import LeaveRequest from './pages/user/LeaveRequest';
import CompanyCalendar from './pages/CompanyCalendar';
import ProtectedRoute from './components/ProtectedRoute';
import Attendance from './pages/admin/Attendance';
import AttendanceDaily from './pages/admin/AttendanceDaily';
import LeaveManagement from './pages/admin/LeaveManagement';
import Payroll from './pages/admin/Payroll';
import Joining from './pages/admin/Joining';
import License from './pages/License';
import LeaveApproval from './pages/admin/LeaveApproval';
import AttendanceForm from './pages/user/AttendanceForm';
import AdminAttendance from './pages/admin/AdminAttendance';
import Reimbursement from './pages/admin/Reimbursement';

function App() {
  return (
    <div className="gradient-bg min-h-screen">
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="indent" element={<Indent />} />
            <Route path="find-enquiry" element={<FindEnquiry />} />
            <Route path="call-tracker" element={<CallTracker />} />
            <Route path='joining' element={<Joining />} />
            <Route path="after-joining-work" element={<AfterJoiningWork />} />
            <Route path="leaving" element={<Leaving />} />
            <Route path="after-leaving-work" element={<AfterLeavingWork />} />
            <Route path="employee" element={<Employee />} />
            <Route path="my-profile" element={<MyProfile />} />
            <Route path="my-attendance" element={<MyAttendance />} />
            <Route path="attendance-form" element={<AttendanceForm />} />
            <Route path="attendance/daily" element={<AttendanceDaily />} />
            <Route path="attendance/monthly" element={<Attendance />} />
            <Route path="reimbursement" element={<Reimbursement />} />
            <Route path="leave-request" element={<LeaveRequest />} />
            <Route path="company-calendar" element={<CompanyCalendar />} />
            <Route path="leave-management" element={<LeaveManagement />} />
            <Route path="admin-attendance" element={<AdminAttendance />} />
            <Route path="license" element={<License />} />
            <Route path='leaveApproval' element={<LeaveApproval />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;