import React, { useState, useEffect, useRef } from 'react';
import { Bell, Search, User, Menu, Settings, Scan, X, QrCode, Download } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { isAdminUser } from '../utils/auth';

const Header = ({ onMenuClick, user }) => {
  const isAdmin = isAdminUser(user);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [visitorData, setVisitorData] = useState(null);
  const notificationRef = useRef(null);
  const qrRef = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const [calendarRes, enquiryRes] = await Promise.all([
          fetch(`${"https://script.google.com/macros/s/AKfycbwGN0L4CqcZdhgie3l94KGGjWHqaL_cHRgwtw1CCUZy6yqpF5lFlFNBbO10dEm7BNK6FQ/exec"}?sheet=Calendar&action=fetch`)
            .then(res => res.ok ? res.json() : { success: false, data: [] })
            .catch(() => ({ success: false, data: [] })),
          fetch(`${"https://script.google.com/macros/s/AKfycbwGN0L4CqcZdhgie3l94KGGjWHqaL_cHRgwtw1CCUZy6yqpF5lFlFNBbO10dEm7BNK6FQ/exec"}?sheet=ENQUIRY&action=fetch`)
            .then(res => res.ok ? res.json() : { success: false, data: [] })
            .catch(() => ({ success: false, data: [] }))
        ]);

        let events = [];
        const today = new Date();
        today.setHours(0,0,0,0);
        const todayYear = today.getFullYear();

        if (calendarRes.success && calendarRes.data && calendarRes.data.length > 1) {
          calendarRes.data.slice(1).forEach((row, idx) => {
            if (row[1]) {
              const evtDateStr = row[1];
              let parsedDate = null;
              if (evtDateStr.includes('-')) {
                  const parts = evtDateStr.split('-');
                  if (parts.length === 3) parsedDate = new Date(parts[0], parseInt(parts[1])-1, parts[2]);
              } else if (evtDateStr.includes('/')) {
                const parts = evtDateStr.split('/');
                if (parts.length === 3) parsedDate = new Date(parts[2], parseInt(parts[1])-1, parts[0]);
              }
              
              if (parsedDate) {
                parsedDate.setHours(0,0,0,0);
                if (parsedDate.getTime() === today.getTime()) {
                  events.push({ id: `c-${idx}`, title: row[2] || 'Event', date: parsedDate, type: 'event' });
                }
              }
            }
          });
        }

        if (enquiryRes.success && enquiryRes.data && enquiryRes.data.length > 6) {
          enquiryRes.data.slice(6).forEach((row, idx) => {
             const dobStr = row[7];
             if (dobStr) {
               let parsedDate = null;
               if (dobStr.includes('/')) {
                 const parts = dobStr.split('/');
                 if (parts.length === 3) parsedDate = new Date(parts[2], parseInt(parts[1])-1, parts[0]);
               } else parsedDate = new Date(dobStr);
               
               if (parsedDate && !isNaN(parsedDate.getTime())) {
                 const bDay = new Date(todayYear, parsedDate.getMonth(), parsedDate.getDate());
                 bDay.setHours(0,0,0,0);
                 if (bDay.getTime() === today.getTime()) {
                   events.push({ id: `b-${idx}`, title: `🎂 ${row[6] || 'Employee'}'s Birthday`, date: bDay, type: 'birthday' });
                 }
               }
             }
          });
        }
        
        events.sort((a,b) => a.date - b.date);
        setUpcomingEvents(events);
      } catch (e) {
        console.error(e);
      }
    };
    fetchNotifications();

    const handleVisitorUpdate = (e) => {
      setVisitorData(e.detail);
    };
    window.addEventListener('visitor-form-update', handleVisitorUpdate);
    return () => window.removeEventListener('visitor-form-update', handleVisitorUpdate);
  }, []);

  const downloadQRCode = () => {
    if (!qrRef.current) return;
    const canvas = qrRef.current.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `visitor-pass-${visitorData?.visitorName || 'qr'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const visitorUrl = visitorData ? JSON.stringify({
    name: visitorData.visitorName,
    phone: visitorData.mobileNumber,
    purpose: visitorData.purposeOfVisit,
    toMeet: visitorData.personToMeet,
    date: visitorData.dateOfVisit,
    time: visitorData.timeOfEntry
  }) : `${window.location.origin}/visitor-registration`;

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="flex justify-between items-center h-16 px-4 sm:px-6 lg:px-8">
          
          {/* Left Section: Mobile Menu & Search */}
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Menu size={24} />
            </button>
          </div>

          {/* Right Section: Actions & Profile */}
          <div className="flex items-center gap-2 sm:gap-4">

            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-all relative"
              >
                <Bell size={20} />
                {upcomingEvents.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse shadow-sm border border-white"></span>
                )}
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
                    <span className="text-[10px] font-bold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">{upcomingEvents.length} Today</span>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {upcomingEvents.length > 0 ? upcomingEvents.map(evt => (
                      <div key={evt.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors flex flex-col gap-1">
                        <p className="text-sm font-bold text-slate-700">{evt.title}</p>
                        <p className="text-xs text-slate-500 font-medium">Today</p>
                      </div>
                    )) : (
                      <div className="p-8 text-center text-slate-400">
                        <Bell size={24} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm font-medium">No events today</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>


            <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>

            {/* User Profile Summary (Desktop) */}
            <div className="flex items-center gap-3 pl-2 group cursor-pointer">
              <div className="hidden md:block text-right">
                <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {user?.Name || user?.Username || 'Admin'}
                </p>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  {isAdmin ? 'Administrator' : 'Employee'}
                </p>
              </div>
              <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center group-hover:border-blue-300 transition-all overflow-hidden shadow-sm">
                <User size={20} className="text-blue-600" />
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* QR Code Modal - Updated per reference design */}
      {showQrModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300 border border-slate-200">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-sky-600" />
                <h3 className="font-semibold text-gray-800">Visitor QR Code</h3>
              </div>
              <button onClick={() => setShowQrModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-8 flex flex-col items-center gap-6">
              <div ref={qrRef} className="p-4 bg-white border-2 border-sky-100 rounded-2xl shadow-inner">
                <QRCodeCanvas 
                  value={visitorUrl} 
                  size={200}
                  level="H"
                  includeMargin={true}
                  imageSettings={{
                    src: "/favicon.ico", 
                    x: undefined,
                    y: undefined,
                    height: 40,
                    width: 40,
                    excavate: true,
                  }}
                />
              </div>
              
              <div className="text-center">
                <p className="text-sm font-medium text-gray-800 mb-1">Scan for Gate Pass</p>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                  {visitorData ? visitorData.visitorName : "Ready for next visitor"}
                </p>
              </div>

              <button
                onClick={downloadQRCode}
                className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white py-3 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg active:scale-95 disabled:bg-slate-200 disabled:shadow-none"
              >
                <Download className="w-5 h-5" />
                Download QR Code
              </button>
            </div>
            
            <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Botivate Technology</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
