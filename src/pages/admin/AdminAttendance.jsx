import React, { useState } from 'react';
import { Calendar, Users, List, BarChart3, Search, Filter, Download, FileSpreadsheet } from 'lucide-react';
import AttendanceDaily from './AttendanceDaily';
import Attendance from './Attendance';

const AdminAttendance = () => {
  const [activeTab, setActiveTab] = useState('daily');

  const tabs = [
    { id: 'daily', label: 'Daily', icon: List, description: 'Real-time punch and shift logs' },
    { id: 'monthly', label: 'Monthly', icon: BarChart3, description: 'Aggregated analytics and performance' }
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-500 font-outfit">
      {/* Dashboard Header (Simplified) */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <Users size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Attendance</h1>
            <p className="text-slate-500 text-sm font-medium">Comprehensive management of employee workplace presence.</p>
          </div>
        </div>
      </div>

      {/* Dedicated Sub Menubar (Restructured) */}
      <div className="flex items-center gap-2 p-1 bg-slate-100/50 backdrop-blur rounded-2xl border border-slate-200/60 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2.5 px-8 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
              activeTab === tab.id 
                ? 'bg-white text-indigo-600 shadow-lg shadow-indigo-100/50 ring-1 ring-slate-200/50 translate-y-[-1px]' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Premium Dashboard Section Indicator */}
      <div className="flex items-center gap-3 px-2 py-1 animate-in slide-in-from-left-4 duration-500">
        <div className="w-1 h-8 bg-gradient-to-b from-indigo-600 to-indigo-400 rounded-full shadow-sm" />
        <div className="flex flex-col">
          <h2 className="text-[13px] font-black text-slate-800 uppercase tracking-[0.2em] leading-none mb-1.5">
            {tabs.find(t => t.id === activeTab)?.label} View
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded shadow-inner">
               {tabs.find(t => t.id === activeTab)?.description}
            </span>
          </div>
        </div>
      </div>

      {/* Active Content */}
      <div className="transition-all duration-300">
        {activeTab === 'daily' ? (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <AttendanceDaily />
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <Attendance />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAttendance;
