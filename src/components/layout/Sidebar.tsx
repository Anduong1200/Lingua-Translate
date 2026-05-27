import {
  BookMarked,
  Layers,
  LayoutDashboard,
  Settings,
  Upload,
  BookOpenText,
  GraduationCap,
  BarChart3,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { motion } from 'framer-motion';

const mainNavItems = [
  { path: '/', icon: LayoutDashboard, label: 'Bảng điều khiển' },
  { path: '/reader', icon: BookOpenText, label: 'Đọc & phân tích' },
  { path: '/upload', icon: Upload, label: 'Dịch file' },
  { path: '/vocabulary', icon: BookMarked, label: 'Từ vựng' },
  { path: '/flashcards', icon: Layers, label: 'Flashcards' },
];

export default function Sidebar() {
  const { savedWords, documents, reviewItems } = useStore();
  const dueCount = reviewItems.filter(
    (item) => new Date(item.due_at).getTime() <= Date.now()
  ).length;

  return (
    <aside className="fixed bottom-0 left-0 top-[72px] z-40 hidden w-[300px] flex-col border-r border-teal-100/30 bg-white/80 backdrop-blur-2xl dark:bg-slate-900/80 dark:border-slate-800/60 md:flex">
      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-4 pt-6">
        {mainNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-xl px-4 py-3 text-base font-semibold transition-all duration-200 ${isActive
                ? 'sidebar-active text-teal-700 dark:text-teal-400'
                : 'text-slate-500 hover:bg-teal-50/50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 h-6 w-[4px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-teal-500 to-teal-600 shadow-sm shadow-teal-500/20"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${isActive
                      ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-sm shadow-teal-500/20'
                      : 'text-slate-400 group-hover:bg-teal-100 group-hover:text-teal-600 dark:group-hover:bg-slate-800 dark:group-hover:text-teal-400'
                    }`}
                >
                  <item.icon className="h-5 w-5" />
                </div>
                <span className={`text-base font-semibold ${isActive ? 'text-teal-700 dark:text-teal-400' : 'text-slate-600 dark:text-slate-400'}`}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Workspace section */}
      <div className="mx-4 mb-4">
        <div className="rounded-2xl bg-gradient-to-br from-teal-50/80 to-teal-50/40 dark:from-slate-800/80 dark:to-slate-800/40 border border-teal-100/40 dark:border-slate-700/50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Workspace</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{documents.length}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Tài liệu</p>
            </div>
            <div>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{savedWords.length}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Từ vựng</p>
            </div>
            <div>
              <p className={`text-xl font-bold ${dueCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200'}`}>{dueCount}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Cần ôn</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom section */}
      <div className="border-t border-teal-100/20 dark:border-slate-800/50 px-4 py-4">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `group relative flex items-center gap-3 rounded-xl px-4 py-3 text-base font-semibold transition-all duration-200 ${isActive
              ? 'sidebar-active text-teal-700 dark:text-teal-400'
              : 'text-slate-500 hover:bg-teal-50/50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-bottom"
                  className="absolute left-0 top-1/2 h-6 w-[4px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-teal-500 to-teal-600 shadow-sm shadow-teal-500/20"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${isActive
                    ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-sm shadow-teal-500/20'
                    : 'text-slate-400 group-hover:bg-teal-100 group-hover:text-teal-600 dark:group-hover:bg-slate-800 dark:group-hover:text-teal-400'
                  }`}
              >
                <Settings className="h-5 w-5" />
              </div>
              <span className={`text-base font-semibold ${isActive ? 'text-teal-700 dark:text-teal-400' : 'text-slate-600 dark:text-slate-400'}`}>Cài đặt</span>
            </>
          )}
        </NavLink>

        {/* Branding */}
        <div className="mt-4 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 dark:from-teal-600 dark:to-cyan-800 p-4 text-white shadow-sm">
          <div className="flex items-center gap-2 mb-1.5">
            <GraduationCap className="h-4 w-4 text-teal-100" />
            <span className="text-sm font-bold">Hanora</span>
          </div>
          <p className="text-xs leading-relaxed text-teal-100">
            Chinese Context Reader
          </p>
        </div>
      </div>
    </aside>
  );
}
