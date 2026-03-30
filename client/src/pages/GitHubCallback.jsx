import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function GitHubCallback() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');
  const { token, updateUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) {
      setStatus('error');
      setMessage('No authorization code received from GitHub');
      return;
    }

    const connectGitHub = async () => {
      try {
        const baseURL = import.meta.env.PROD ? 'https://dxrayhack.onrender.com/api' : '/api';
        const res = await fetch(`${baseURL}/auth/github/connect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ code }),
        });

        const data = await res.json();

        if (!res.ok) {
          setStatus('error');
          setMessage(data.message || 'Failed to connect GitHub');
          return;
        }

        updateUser(data.user);
        setStatus('success');
        setMessage(`Connected as @${data.user.githubUsername}`);

        // Redirect to dashboard after 2 seconds
        setTimeout(() => navigate('/dashboard'), 2000);
      } catch (err) {
        setStatus('error');
        setMessage('Network error. Please try again.');
      }
    };

    connectGitHub();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass p-12 text-center max-w-md w-full"
      >
        {status === 'loading' && (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="mx-auto w-fit mb-4"
            >
              <RefreshCw size={40} className="text-indigo-400" />
            </motion.div>
            <p className="text-white text-lg font-medium">Connecting GitHub...</p>
            <p className="text-slate-400 text-sm mt-2">Please wait while we link your account</p>
          </>
        )}

        {status === 'success' && (
          <>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
              <CheckCircle size={48} className="text-emerald-400 mx-auto mb-4" />
            </motion.div>
            <p className="text-white text-lg font-medium">GitHub Connected!</p>
            <p className="text-slate-400 text-sm mt-2">{message}</p>
            <p className="text-slate-500 text-xs mt-4">Redirecting to dashboard...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={48} className="text-red-400 mx-auto mb-4" />
            <p className="text-white text-lg font-medium">Connection Failed</p>
            <p className="text-red-400 text-sm mt-2">{message}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-6 px-6 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-all"
            >
              Go to Dashboard
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
