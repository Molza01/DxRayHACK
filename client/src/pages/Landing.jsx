import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Scan, ArrowRight, Activity, GitBranch, Zap, Shield } from 'lucide-react';
import BackgroundEffects from '../animations/BackgroundEffects';

const features = [
  { icon: Activity, title: 'Build Analytics', desc: 'Track build times, success rates, and pipeline health in real-time.' },
  { icon: Zap, title: 'Bottleneck Detection', desc: 'Identify the slowest steps dragging your pipelines down.' },
  { icon: Shield, title: 'Flaky Step Detection', desc: 'Pinpoint unreliable steps with instability scoring.' },
  { icon: GitBranch, title: 'Pipeline Visualization', desc: 'Interactive graph-based view of your CI/CD workflow.' },
];

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <BackgroundEffects />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-4xl"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center pulse-glow"
          >
            <Scan size={40} className="text-white" />
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 neon-text">
            Build & CI
            <span className="gradient-text block">Scanner</span>
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10"
          >
            Diagnose and optimize your CI/CD pipelines with deep analytics,
            bottleneck detection, and intelligent insights.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex gap-4 justify-center flex-wrap"
          >
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl no-underline hover:shadow-lg hover:shadow-indigo-500/30 transition-all"
            >
              Open Dashboard
              <ArrowRight size={18} />
            </Link>
            <Link
              to="/pipeline"
              className="inline-flex items-center gap-2 px-8 py-3.5 border border-indigo-500/30 text-indigo-300 font-semibold rounded-xl no-underline hover:bg-indigo-500/10 transition-all"
            >
              View Pipelines
            </Link>
          </motion.div>
        </motion.div>

        {/* Features grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mt-24 w-full"
        >
          {features.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 + i * 0.1 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="glass glass-hover p-6 text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                <Icon size={20} className="text-indigo-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">{title}</h3>
              <p className="text-sm text-slate-400">{desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
