import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ThemeProvider } from './hooks/useTheme';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Builds from './pages/Builds';
import BuildDetail from './pages/BuildDetail';
import Pipeline from './pages/Pipeline';
import Insights from './pages/Insights';
import CommandCenter from './pages/CommandCenter';
import DocsScan from './pages/DocsScan';

export default function App() {
  return (
    <ThemeProvider>
    <BrowserRouter>
      <div className="min-h-screen animated-gradient">
        <Navbar />
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/builds" element={<Builds />} />
            <Route path="/builds/:id" element={<BuildDetail />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/command-center" element={<CommandCenter />} />
            <Route path="/docs-scan" element={<DocsScan />} />
          </Routes>
        </AnimatePresence>
      </div>
    </BrowserRouter>
    </ThemeProvider>
  );
}
