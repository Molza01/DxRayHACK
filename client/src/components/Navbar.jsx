import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, LayoutDashboard, GitBranch, AlertTriangle, Scan } from 'lucide-react';

const links = [
  { to: '/', label: 'Home', icon: Scan },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/builds', label: 'Builds', icon: Activity },
  { to: '/pipeline', label: 'Pipeline', icon: GitBranch },
  { to: '/insights', label: 'Insights', icon: AlertTriangle },
];

export default function Navbar() {
  const { pathname } = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-indigo-500/10">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2 no-underline">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Scan size={18} className="text-white" />
          </div>
          <span className="text-lg font-bold gradient-text">CI Insight</span>
        </Link>

        <div className="flex items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className="relative px-4 py-2 text-sm no-underline rounded-lg flex items-center gap-2 transition-colors"
                style={{ color: active ? '#a5b4fc' : '#94a3b8' }}
              >
                {active && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-lg"
                    style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon size={16} className="relative z-10" />
                <span className="relative z-10 hidden md:inline">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
