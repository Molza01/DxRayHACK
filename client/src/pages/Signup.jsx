import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, Mail, Lock, User, AlertCircle, Scan, GitFork, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PageTransition from '../animations/PageTransition';

const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID || '';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('form'); // 'form' | 'connect-github'
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const baseURL = import.meta.env.PROD ? 'https://dxrayhack.onrender.com/api' : '/api';
      const res = await fetch(`${baseURL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Signup failed');
        setLoading(false);
        return;
      }

      login(data.token, data.user);
      setStep('connect-github');
    } catch (err) {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  const handleConnectGitHub = () => {
    if (!GITHUB_CLIENT_ID) {
      // If no client ID configured, skip GitHub connect
      navigate('/dashboard');
      return;
    }
    // Redirect to GitHub OAuth
    const redirectUri = `${window.location.origin}/auth/github/callback`;
    const scope = 'read:user,repo';
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}`;
  };

  const handleSkip = () => {
    navigate('/dashboard');
  };

  return (
    <PageTransition>
      <div className="min-h-screen flex items-center justify-center px-4 pt-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
              <Scan size={32} className="text-white" />
            </div>
            {step === 'form' ? (
              <>
                <h1 className="text-3xl font-bold text-white">Create account</h1>
                <p className="text-slate-400 mt-2">Start analyzing your CI/CD pipelines</p>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-bold text-white">Connect GitHub</h1>
                <p className="text-slate-400 mt-2">Link your GitHub to access your repositories</p>
              </>
            )}
          </div>

          <div className="glass p-8">
            {step === 'form' ? (
              <>
                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
                    >
                      <AlertCircle size={16} />
                      {error}
                    </motion.div>
                  )}

                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Name</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        required
                        className="w-full bg-slate-900/50 border border-indigo-500/20 rounded-lg pl-10 pr-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Email</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="w-full bg-slate-900/50 border border-indigo-500/20 rounded-lg pl-10 pr-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        required
                        minLength={6}
                        className="w-full bg-slate-900/50 border border-indigo-500/20 rounded-lg pl-10 pr-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-sm hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-50"
                  >
                    {loading ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                        <UserPlus size={18} />
                      </motion.div>
                    ) : (
                      <>
                        <UserPlus size={18} />
                        Create Account
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-sm text-slate-500">
                    Already have an account?{' '}
                    <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                      Sign in
                    </Link>
                  </p>
                </div>
              </>
            ) : (
              /* GitHub connect step */
              <div className="space-y-6 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                >
                  <CheckCircle size={48} className="text-emerald-400 mx-auto" />
                </motion.div>
                <p className="text-sm text-slate-300">
                  Account created! Connect your GitHub to get quick access to your repos when syncing CI/CD pipelines.
                </p>

                <button
                  onClick={handleConnectGitHub}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-slate-800 border border-slate-600 text-white font-semibold text-sm hover:bg-slate-700 transition-all"
                >
                  <GitFork size={20} />
                  Connect GitHub Account
                </button>

                <button
                  onClick={handleSkip}
                  className="w-full text-sm text-slate-500 hover:text-slate-300 transition-colors py-2"
                >
                  Skip for now
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
