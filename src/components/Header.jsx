import React from 'react';
import { Bell, Search, User, Menu, Settings } from 'lucide-react';

const Header = ({ onMenuClick, user }) => {
  return (
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

          <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-all">
            <Settings size={20} />
          </button>

          <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>

          {/* User Profile Summary (Desktop) */}
          <div className="flex items-center gap-3 pl-2 group cursor-pointer">
            <div className="hidden md:block text-right">
              <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                {user?.Name || user?.Username || 'Admin'}
              </p>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {user?.Admin === 'Yes' ? 'Administrator' : 'Employee'}
              </p>
            </div>
            <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center group-hover:border-blue-300 transition-all overflow-hidden shadow-sm">
              <User size={20} className="text-blue-600" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;