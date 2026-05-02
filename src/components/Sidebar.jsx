import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Search,
  Phone,
  UserCheck,
  UserX,
  UserMinus,
  CheckCircle2,
  AlarmClockCheck,
  Users,
  Calendar,
  FileText as LeaveIcon,
  User as ProfileIcon,
  LogOut as LogOutIcon,
  X,
  Copyright,
  User,
  Menu,
  ChevronDown,
  ChevronUp,
  NotebookPen,
  BookPlus,
  Settings,
  Bell,
  Clock,
  IndianRupee,
  MessageSquare,
  DoorClosed
} from 'lucide-react';
import { getStoredUser, isAdminUser } from '../utils/auth';

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [showLeaveManagement, setShowLeaveManagement] = useState(false);
  const user = getStoredUser();
  const isAdmin = isAdminUser(user);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('employeeId');
    sessionStorage.removeItem('role');
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    const checkLeaveManagementAccess = async () => {
      if (!user) return;
      try {
        const response = await fetch(`${import.meta.env.VITE_APPS_SCRIPT_URL}?sheet=USER&action=fetch`);
        const result = await response.json();
        if (result.success && result.data) {
          const employeeData = result.data;
          const headers = employeeData[0];
          const usernameColIndex = headers.findIndex(h => h.toString().toLowerCase().includes('username') || h.toString().toLowerCase().includes('name'));
          const adminColIndex = headers.findIndex(h => h.toString().toLowerCase().includes('admin'));
          const leaveManagementColIndex = 6; 
          const userRecord = employeeData.find(row => row[usernameColIndex] === user.Name || row[usernameColIndex] === user.Username);
          if (userRecord) {
            const isAdmin = userRecord[adminColIndex]?.toString().toLowerCase() === 'yes';
            const hasLeaveAccess = userRecord[leaveManagementColIndex] && userRecord[leaveManagementColIndex].toString().trim() !== '';
            setShowLeaveManagement(isAdmin || (!isAdmin && hasLeaveAccess));
          }
        }
      } catch (error) {
        setShowLeaveManagement(isAdmin);
      }
    };
    checkLeaveManagementAccess();
  }, [isAdmin, user]);

  const [attendanceOpen, setAttendanceOpen] = useState(true);

  const adminMenuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/indent', icon: FileText, label: 'Indent' },
    { path: '/find-enquiry', icon: Search, label: 'Find Enquiry' },
    { path: '/call-tracker', icon: Phone, label: 'Call Tracker' },
    { path: '/joining', icon: NotebookPen, label: 'Joining' },
    { path: '/after-joining-work', icon: UserCheck, label: 'After Joining' },
    { path: '/leaving', icon: UserX, label: 'Leaving' },
    { path: '/after-leaving-work', icon: UserMinus, label: 'After Leaving' },
    { path: '/employee', icon: Users, label: 'Employee' },
    { 
      label: 'Attendance', 
      icon: Clock, 
      isNested: true,
      isOpen: attendanceOpen,
      onToggle: () => setAttendanceOpen(!attendanceOpen),
      subItems: [
        { path: '/attendance/daily', label: 'Daily' },
        { path: '/attendance/monthly', label: 'Monthly' },
        
      ]
    },
    { path: '/reimbursement', icon: IndianRupee, label: 'Reimbursement' },
    { path: '/leave-management', icon: BookPlus, label: 'Leave Mgmt' },
    { path: '/noc', icon: FileText, label: '108 NOC' },
    { path: '/feedback', icon: MessageSquare, label: 'Feedback' },
    { path: '/visitor-approval', icon: CheckCircle2, label: 'Request Approval' },
    { path: '/close-gate-pass', icon: DoorClosed, label: 'Close Gate Pass' },
    { path: '/company-calendar', icon: Calendar, label: 'Calendar' },
    { path: '/license', icon: AlarmClockCheck, label: 'License' },
  ];

  const employeeMenuItems = [
    { path: '/my-profile', icon: ProfileIcon, label: 'My Profile' },
    // { path: '/attendance-form', icon: UserCheck, label: 'Mark Attendance' },
    { path: '/my-attendance', icon: Clock, label: 'My Attendance' },
    { path: '/reimbursement', icon: IndianRupee, label: 'Reimbursement' },
    { path: '/leave-request', icon: LeaveIcon, label: 'Leave Request' },
    // { path: '/gate-pass-request', icon: Bell, label: 'Gate Pass' },
    { path: '/noc', icon: FileText, label: '108 NOC' },
    { path: '/feedback', icon: MessageSquare, label: 'Feedback' },
    { path: '/visitor-approval', icon: CheckCircle2, label: 'Visitor Requests' },
    { path: '/company-calendar', icon: Calendar, label: 'Calendar' },
    { path: '/license', icon: Copyright, label: 'License' },
  ];

  const menuItems = isAdmin ? adminMenuItems : employeeMenuItems;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-56 bg-[#0f172a] text-slate-300 z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Users size={20} className="text-white" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">HR Connect</span>
            </div>
            <button onClick={onClose} className="lg:hidden p-2 hover:bg-slate-800 rounded-lg">
              <X size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-hide">
            {menuItems.map((item, idx) => (
              <React.Fragment key={idx}>
                {item.isNested ? (
                  <div className="space-y-1">
                    <button
                      onClick={item.onToggle}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 group hover:bg-slate-800 hover:text-white border-l-4 border-transparent`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon size={20} className="group-hover:scale-110 transition-transform" />
                        <span className="font-medium">{item.label}</span>
                      </div>
                      {item.isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    
                    {item.isOpen && (
                      <div className="pl-9 space-y-1 animate-in slide-in-from-top-2 duration-200">
                        {item.subItems.map((sub) => (
                          <NavLink
                            key={sub.path}
                            to={sub.path}
                            onClick={onClose}
                            className={({ isActive }) => `
                              flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200
                              ${isActive 
                                ? 'bg-blue-600/20 text-blue-400 font-bold' 
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                            `}
                          >
                            <span className="text-sm">{sub.label}</span>
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group
                      ${isActive 
                        ? 'bg-blue-600/10 text-blue-400 border-l-4 border-blue-600' 
                        : 'hover:bg-slate-800 hover:text-white border-l-4 border-transparent'}
                    `}
                  >
                    <item.icon size={20} className="group-hover:scale-110 transition-transform" />
                    <span className="font-medium">{item.label}</span>
                  </NavLink>
                )}
              </React.Fragment>
            ))}
          </nav>

          {/* User Profile Section */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/50">
            <div className="flex items-center gap-3 px-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center border-2 border-slate-600">
                <User size={20} className="text-slate-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user?.Name || 'Guest User'}</p>
                <p className="text-xs text-slate-400 truncate">{isAdmin ? 'Administrator' : 'Employee'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
            >
              <LogOutIcon size={20} />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
