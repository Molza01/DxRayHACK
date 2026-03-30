import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ThemeProvider } from './hooks/useTheme';
import { AuthProvider } from './context/AuthContext';
import { SidebarProvider, useSidebar } from './context/SidebarContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import GitHubCallback from './pages/GitHubCallback';
import Dashboard from './pages/Dashboard';
import Builds from './pages/Builds';
import BuildDetail from './pages/BuildDetail';
import Pipeline from './pages/Pipeline';
import Insights from './pages/Insights';
import CommandCenter from './pages/CommandCenter';
import DocsScan from './pages/DocsScan';

// Pages where sidebar should not appear
const NO_SIDEBAR = ['/', '/login', '/signup', '/auth/github/callback'];

function AppLayout() {
  const { expanded } = useSidebar();
  const { pathname } = useLocation();
  const showSidebar = !NO_SIDEBAR.includes(pathname);

  return (
    <div className="min-h-screen animated-gradient">
      {showSidebar && <Navbar />}
      <div
        className="transition-all duration-300"
        style={{ marginLeft: showSidebar ? (expanded ? '240px' : '72px') : '0' }}
      >
        <AnimatePresence mode="wait">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/auth/github/callback" element={<GitHubCallback />} />

            {/* Protected routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/builds" element={<ProtectedRoute><Builds /></ProtectedRoute>} />
            <Route path="/builds/:id" element={<ProtectedRoute><BuildDetail /></ProtectedRoute>} />
            <Route path="/pipeline" element={<ProtectedRoute><Pipeline /></ProtectedRoute>} />
            <Route path="/insights" element={<ProtectedRoute><Insights /></ProtectedRoute>} />
            <Route path="/command-center" element={<ProtectedRoute><CommandCenter /></ProtectedRoute>} />
            <Route path="/docs-scan" element={<ProtectedRoute><DocsScan /></ProtectedRoute>} />
          </Routes>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
    <BrowserRouter>
    <AuthProvider>
    <SidebarProvider>
      <AppLayout />
    </SidebarProvider>
    </AuthProvider>
    </BrowserRouter>
    </ThemeProvider>
  );
}
