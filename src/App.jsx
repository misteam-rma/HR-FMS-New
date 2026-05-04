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
import Feedback from './pages/user/Feedback';
import NOC from './pages/user/NOC';
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
import GatePass from './pages/GatePass';
import GatePassRequest from './pages/GatePassRequest';
import VisitorApproval from './pages/admin/VisitorApproval';
import CloseGatePass from './pages/admin/CloseGatePass';
import VisitorEntry from './pages/admin/VisitorEntry';


function App() {
  return (
    <div className="gradient-bg min-h-screen">
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/visitor-form" element={<div className="p-6 bg-slate-50 min-h-screen flex items-center justify-center"><VisitorEntry /></div>} />

          
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<ProtectedRoute allowedRoles={['admin']}><Dashboard /></ProtectedRoute>} />
            <Route path="indent" element={<ProtectedRoute allowedRoles={['admin']}><Indent /></ProtectedRoute>} />
            <Route path="find-enquiry" element={<ProtectedRoute allowedRoles={['admin']}><FindEnquiry /></ProtectedRoute>} />
            <Route path="call-tracker" element={<ProtectedRoute allowedRoles={['admin']}><CallTracker /></ProtectedRoute>} />
            <Route path='joining' element={<ProtectedRoute allowedRoles={['admin']}><Joining /></ProtectedRoute>} />
            <Route path="after-joining-work" element={<ProtectedRoute allowedRoles={['admin']}><AfterJoiningWork /></ProtectedRoute>} />
            <Route path="leaving" element={<ProtectedRoute allowedRoles={['admin']}><Leaving /></ProtectedRoute>} />
            <Route path="after-leaving-work" element={<ProtectedRoute allowedRoles={['admin']}><AfterLeavingWork /></ProtectedRoute>} />
            <Route path="employee" element={<ProtectedRoute allowedRoles={['admin']}><Employee /></ProtectedRoute>} />
            <Route path="my-profile" element={<ProtectedRoute allowedRoles={['user']}><MyProfile /></ProtectedRoute>} />
            <Route path="my-attendance" element={<ProtectedRoute allowedRoles={['user']}><MyAttendance /></ProtectedRoute>} />
            <Route path="attendance-form" element={<ProtectedRoute allowedRoles={['user']}><AttendanceForm /></ProtectedRoute>} />
            <Route path="attendance/daily" element={<ProtectedRoute allowedRoles={['admin']}><AttendanceDaily /></ProtectedRoute>} />
            <Route path="attendance/monthly" element={<ProtectedRoute allowedRoles={['admin']}><Attendance /></ProtectedRoute>} />
            <Route path="reimbursement" element={<Reimbursement />} />
            <Route path="leave-request" element={<ProtectedRoute allowedRoles={['user']}><LeaveRequest /></ProtectedRoute>} />
            <Route path="gate-pass" element={<ProtectedRoute allowedRoles={['admin']}><GatePass /></ProtectedRoute>} />
            <Route path="gate-pass-request" element={<ProtectedRoute allowedRoles={['user']}><GatePassRequest /></ProtectedRoute>} />
            <Route path="visitor-approval" element={<ProtectedRoute allowedRoles={['admin', 'user']}><VisitorApproval /></ProtectedRoute>} />
            <Route path="close-gate-pass" element={<ProtectedRoute allowedRoles={['admin']}><CloseGatePass /></ProtectedRoute>} />
            <Route path="noc" element={<NOC />} />
            <Route path="feedback" element={<Feedback />} />
            <Route path="company-calendar" element={<CompanyCalendar />} />
            <Route path="leave-management" element={<ProtectedRoute allowedRoles={['admin']}><LeaveManagement /></ProtectedRoute>} />
            <Route path="admin-attendance" element={<ProtectedRoute allowedRoles={['admin']}><AdminAttendance /></ProtectedRoute>} />
            <Route path="license" element={<License />} />
            <Route path='leaveApproval' element={<ProtectedRoute allowedRoles={['admin']}><LeaveApproval /></ProtectedRoute>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
