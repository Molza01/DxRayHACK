import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity, LayoutDashboard, GitBranch, AlertTriangle, Scan, Target, FileText,
  Sun, Moon, LogIn, LogOut, GitFork, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';

const links = [
  { to: '/', label: 'Home', icon: Scan },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/command-center', label: 'Command Center', icon: Target },
  { to: '/builds', label: 'Builds', icon: Activity },
  { to: '/pipeline', label: 'Pipeline', icon: GitBranch },
  { to: '/insights', label: 'Insights', icon: AlertTriangle },
  { to: '/docs-scan', label: 'Docs Scan', icon: FileText },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { expanded, toggle } = useSidebar();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const sidebarWidth = expanded ? 'w-60' : 'w-[72px]';

  return (
    <aside className={`fixed top-0 left-0 h-screen z-50 flex flex-col glass border-r border-indigo-500/10 transition-all duration-300 ${sidebarWidth}`}>
      {/* Logo + Toggle */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-indigo-500/10">
        <Link to="/" className="flex items-center gap-2 no-underline overflow-hidden">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
            <Scan size={18} className="text-white" />
          </div>
          {expanded && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="text-lg font-bold gradient-text whitespace-nowrap overflow-hidden"
            >
              CI Insight
            </motion.span>
          )}
        </Link>
        <button
          onClick={toggle}
          className="p-1.5 rounded-lg hover:bg-indigo-500/10 transition-colors text-slate-400 hover:text-white shrink-0"
        >
          {expanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto overflow-x-hidden">
        {links.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className="relative flex items-center gap-3 px-3 py-2.5 rounded-lg no-underline transition-colors group"
              style={{ color: active ? '#a5b4fc' : '#94a3b8' }}
              title={!expanded ? label : undefined}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg"
                  style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <Icon size={18} className="relative z-10 shrink-0" />
              {expanded && (
                <span className="relative z-10 text-sm font-medium whitespace-nowrap">
                  {label}
                </span>
              )}
              {/* Tooltip when collapsed */}
              {!expanded && (
                <div className="absolute left-full ml-2 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                  {label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section: theme + auth */}
      <div className="border-t border-indigo-500/10 p-3 space-y-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all duration-200 hover:bg-indigo-500/10 text-slate-400 hover:text-white group relative`}
          title={!expanded ? (theme === 'dark' ? 'Light mode' : 'Dark mode') : undefined}
        >
          {theme === 'dark'
            ? <Sun size={18} className="text-amber-400 shrink-0" />
            : <Moon size={18} className="text-indigo-400 shrink-0" />
          }
          {expanded && (
            <span className="text-sm">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          )}
          {!expanded && (
            <div className="absolute left-full ml-2 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </div>
          )}
        </button>

        {/* Auth section */}
        {user ? (
          <>
            {/* User profile */}
            <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800/30 ${!expanded ? 'justify-center' : ''}`}>
              {user.githubAvatarUrl ? (
                <img src={user.githubAvatarUrl} alt="" className="w-8 h-8 rounded-full border border-indigo-500/30 shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
              )}
              {expanded && (
                <div className="overflow-hidden">
                  <p className="text-sm text-white font-medium truncate">{user.name}</p>
                  {user.githubUsername && (
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                      <GitFork size={10} />
                      {user.githubUsername}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-all group relative"
              title={!expanded ? 'Logout' : undefined}
            >
              <LogOut size={18} className="shrink-0" />
              {expanded && <span className="text-sm">Logout</span>}
              {!expanded && (
                <div className="absolute left-full ml-2 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                  Logout
                </div>
              )}
            </button>
          </>
        ) : (
          <Link
            to="/login"
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-sm font-medium hover:bg-indigo-500/20 transition-all no-underline group relative"
            title={!expanded ? 'Login' : undefined}
          >
            <LogIn size={18} className="shrink-0" />
            {expanded && <span>Login</span>}
            {!expanded && (
              <div className="absolute left-full ml-2 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                Login
              </div>
            )}
          </Link>
        )}
      </div>
    </aside>
  );
}

// Export for layout margin calculation
export const SIDEBAR_WIDTH_EXPANDED = '240px';
export const SIDEBAR_WIDTH_COLLAPSED = '72px';
