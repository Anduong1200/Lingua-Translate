import { useState } from 'react';
import { Bell, HelpCircle, Activity, Star, Award, Sparkles, Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '@/store/useStore';

export default function Header() {
  const [showNotification, setShowNotification] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { isDarkMode, toggleDarkMode } = useStore();
  const location = useLocation();

  const userInitials = "TL";
  const userName = "Tuấn Lê";

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/reader', label: 'Reader' },
    { path: '/vocabulary', label: 'Library' },
    { path: '/flashcards', label: 'Study Hub' }
  ];

  return (
    <header className="w-full flex items-center justify-between px-6 py-4 bg-transparent relative z-30">
      {/* Brand logo */}
      <Link to="/" className="flex items-center space-x-2 cursor-pointer">
        <div className="text-[#0d9488] dark:text-teal-400 font-black text-2xl md:text-3xl tracking-tight flex items-center select-none font-sans">
          <Sparkles className="w-6 h-6 mr-1.5 text-[#14b8a6] stroke-[2.5]" />
          <span>Hanora</span>
        </div>
      </Link>

      {/* Primary Desktop Navigation Links */}
      <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-600 dark:text-slate-400 transition-colors">
        {navLinks.map((link) => {
          const isActive = location.pathname.startsWith(link.path);
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`transition-colors ${isActive ? 'text-[#0d9488] dark:text-teal-400 font-bold bg-[#14b8a6]/10 px-3 py-1 rounded-full' : 'hover:text-[#0d9488] dark:hover:text-teal-400'}`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Action panel (Notification & Avatar) */}
      <div className="flex items-center space-x-4 relative">
        <button
          onClick={toggleDarkMode}
          className="relative p-2.5 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 hover:border-[#14b8a6]/40 text-slate-700 dark:text-slate-300 transition-all cursor-pointer focus:outline-none"
        >
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Notification Bell */}
        <button
          onClick={() => setShowNotification(!showNotification)}
          className="relative p-2.5 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 hover:border-[#14b8a6]/40 text-slate-700 dark:text-slate-300 transition-all cursor-pointer focus:outline-none"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#fda4af] rounded-full border border-white dark:border-slate-800 animate-pulse" />
        </button>

        {/* User initials circle */}
        <button
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className="w-10 h-10 rounded-full bg-[#0d9488] hover:bg-[#0f766e] text-white flex items-center justify-center font-bold text-sm shadow-md cursor-pointer transition-all border-2 border-white dark:border-slate-800 focus:outline-none"
        >
          {userInitials}
        </button>

        {/* Notifications Dropdown Overlay */}
        <AnimatePresence>
          {showNotification && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotification(false)} />
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-12 top-14 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-4 z-50 overflow-hidden"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Notifications</h3>
                  <span className="text-xs text-[#0d9488] dark:text-teal-400 font-semibold cursor-pointer">Mark all read</span>
                </div>
                <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
                  <div className="flex items-start space-x-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                    <div className="p-1 rounded-full bg-teal-50 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400 mt-0.5">
                      <Star className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Streak Achieved!</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">You maintained your 14-day study streak. Keep it up!</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Profile Menu Dropdown Overlay */}
        <AnimatePresence>
          {showProfileMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 top-14 w-60 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-4 z-50 overflow-hidden"
              >
                <div className="text-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                  <div className="w-12 h-12 bg-[#0d9488] text-white font-bold text-lg rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner">
                    {userInitials}
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{userName}</h3>
                  <p className="text-xs text-slate-400">andumong1200@gmail.com</p>
                </div>
                <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  <Link to="/settings" onClick={() => setShowProfileMenu(false)} className="flex items-center space-x-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer">
                    <Activity className="w-4 h-4 text-[#0d9488] dark:text-teal-400" />
                    <span>Settings</span>
                  </Link>
                  <div className="flex items-center space-x-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer">
                    <HelpCircle className="w-4 h-4 text-[#0d9488] dark:text-teal-400" />
                    <span>How to Use Hanora</span>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
