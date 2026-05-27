import { NavLink } from 'react-router-dom';
import { Moon, Sun, Upload, UserRound, Search } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useState } from 'react';

export default function TopBar() {
  const { isDarkMode, toggleDarkMode, reviewItems } = useStore();
  const dueCount = reviewItems.filter(
    (item) => new Date(item.due_at).getTime() <= Date.now()
  ).length;
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <header className="glass-premium fixed left-0 right-0 top-0 z-50 h-[72px] dark:bg-slate-900/80 dark:border-slate-800/60 transition-colors">
      <div className="mx-auto flex h-full w-full items-center gap-5 px-6 md:px-10 lg:px-12" style={{ maxWidth: '1600px' }}>
        {/* Logo */}
        <NavLink to="/" className="flex shrink-0 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-sm p-0 overflow-hidden">
            <img src="/logo.svg" alt="Hanora Logo" className="h-full w-full object-cover" />
          </div>
          <div className="leading-tight">
            <div className="text-xl font-black tracking-tight">
              <span className="text-teal-700 dark:text-teal-400">Han</span>
              <span className="text-teal-400 dark:text-teal-600">ora</span>
            </div>
            <div className="hidden text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 sm:block">
              Chinese Reader
            </div>
          </div>
        </NavLink>

        {/* Quick nav */}
        <nav className="hidden items-center gap-1.5 text-sm font-semibold text-slate-500 dark:text-slate-400 lg:flex">
          {[
            { to: '/reader', label: 'Đọc & phân tích' },
            { to: '/vocabulary', label: 'Từ vựng' },
            { to: '/flashcards', label: 'Flashcards' },
          ].map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-lg px-4 py-2 transition-colors ${isActive
                  ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400'
                  : 'hover:bg-slate-50 hover:text-slate-700 dark:hover:bg-slate-800/50 dark:hover:text-slate-200'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex-1" />

        {/* Search */}
        <div className="hidden md:block">
          <div className={`relative transition-all duration-200 ${searchFocused ? 'w-80' : 'w-56'}`}>
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="w-full rounded-full border border-teal-100/50 bg-teal-50/40 py-2.5 pl-10 pr-4 text-sm placeholder:text-slate-400 focus:border-teal-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-200/40 dark:border-slate-700/50 dark:bg-slate-800/50 dark:focus:border-teal-600/50 dark:focus:bg-slate-800 dark:focus:ring-teal-600/20 transition-all dark:text-slate-200"
            />
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          {/* Upload */}
          <NavLink
            to="/upload"
            className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 px-4 text-sm font-bold text-white shadow-sm hover:shadow-md hover:from-teal-600 hover:to-teal-700 transition-all"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Tải tệp</span>
          </NavLink>

          {/* Due badge */}
          {dueCount > 0 && (
            <div className="hidden items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30 px-3.5 py-2 sm:flex">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
              </span>
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400">{dueCount}</span>
            </div>
          )}

          {/* Dark mode */}
          <button
            onClick={toggleDarkMode}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-teal-50 hover:text-teal-600 dark:hover:bg-slate-800 dark:hover:text-teal-400 transition-colors"
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Profile */}
          <NavLink
            to="/settings"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 dark:bg-slate-800 font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-200 dark:hover:bg-slate-700 transition-colors"
          >
            <UserRound className="h-5 w-5" />
          </NavLink>
        </div>
      </div>
    </header>
  );
}
