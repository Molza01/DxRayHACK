import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Scan, ArrowRight, Activity, GitBranch, Zap, Shield, Target, FileText, CheckCircle, BarChart3 } from 'lucide-react';
import BackgroundEffects from '../animations/BackgroundEffects';
import ScrollReveal from '../animations/ScrollReveal';

const features = [
  { icon: Activity, title: 'Build Analytics', desc: 'Track build times, success rates, and pipeline health in real-time.' },
  { icon: Zap, title: 'Bottleneck Detection', desc: 'Identify the slowest steps dragging your pipelines down.' },
  { icon: Shield, title: 'Flaky Step Detection', desc: 'Pinpoint unreliable steps with instability scoring.' },
  { icon: GitBranch, title: 'Pipeline Visualization', desc: 'Interactive graph with performance overlays.' },
  { icon: Target, title: 'Command Center', desc: 'Unified investigation — hotspot to recommendation in one view.' },
  { icon: FileText, title: 'Docs Scanner', desc: 'Detect stale docs, code drift, and AI-powered fix suggestions.' },
];

const stats = [
  { label: 'Platforms Supported', value: '3+', sub: 'GitHub, Vercel, Render' },
  { label: 'Analysis Metrics', value: '20+', sub: 'Bottlenecks, flaky, heatmap' },
  { label: 'AI-Powered Fixes', value: 'Gemini', sub: 'Root cause & doc fixes' },
  { label: 'Real-time', value: 'SSE', sub: 'Live pipeline updates' },
];

export default function Landing() {
  return (
    <div className="relative overflow-hidden">
      <BackgroundEffects />

      {/* ===== HERO ===== */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
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
              to="/command-center"
              className="inline-flex items-center gap-2 px-8 py-3.5 border border-indigo-500/30 text-indigo-300 font-semibold rounded-xl no-underline hover:bg-indigo-500/10 transition-all"
            >
              Command Center
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* ===== STATS BAR ===== */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <ScrollReveal key={s.label} direction="up" delay={i * 0.1}>
              <div className="glass p-5 text-center">
                <div className="text-2xl font-bold gradient-text">{s.value}</div>
                <div className="text-sm text-white font-medium mt-1">{s.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{s.sub}</div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>

      {/* ===== FEATURES ===== */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <ScrollReveal direction="up">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-3 neon-text">What It Does</h2>
          <p className="text-slate-400 text-center mb-14 max-w-xl mx-auto">A complete diagnostic toolkit for your CI/CD pipelines and documentation health.</p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <ScrollReveal
              key={title}
              direction={i % 3 === 0 ? 'left' : i % 3 === 2 ? 'right' : 'up'}
              delay={i * 0.08}
            >
              <motion.div
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className="glass glass-hover p-6 h-full"
              >
                <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                  <Icon size={22} className="text-indigo-400" />
                </div>
                <h3 className="text-white font-semibold mb-2">{title}</h3>
                <p className="text-sm text-slate-400">{desc}</p>
              </motion.div>
            </ScrollReveal>
          ))}
        </div>
      </div>

      {/* ===== HOW IT WORKS ===== */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-24">
        <ScrollReveal direction="up">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-3 neon-text">How It Works</h2>
          <p className="text-slate-400 text-center mb-14">Four steps from connect to fix</p>
        </ScrollReveal>

        <div className="space-y-6">
          {[
            { num: '01', title: 'Connect', desc: 'Sync your GitHub, Vercel, or Render project — just paste the repo URL.', icon: GitBranch },
            { num: '02', title: 'Scan', desc: 'Deep analysis of builds, steps, durations, and failure patterns.', icon: Scan },
            { num: '03', title: 'Diagnose', desc: 'AI-powered root cause analysis with bottleneck impact scoring.', icon: BarChart3 },
            { num: '04', title: 'Fix', desc: 'Actionable recommendations with estimated time savings.', icon: CheckCircle },
          ].map((step, i) => (
            <ScrollReveal key={step.num} direction={i % 2 === 0 ? 'left' : 'right'} delay={i * 0.1}>
              <div className="glass glass-hover p-6 flex items-center gap-6">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center shrink-0">
                  <step.icon size={24} className="text-indigo-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">{step.num}</span>
                    <h3 className="text-white font-semibold">{step.title}</h3>
                  </div>
                  <p className="text-sm text-slate-400">{step.desc}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>

      {/* ===== CTA ===== */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-24 text-center">
        <ScrollReveal direction="scale">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 neon-text">Ready to scan?</h2>
          <p className="text-slate-400 mb-8">Paste your repo URL and get instant pipeline diagnostics.</p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-10 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-xl no-underline hover:shadow-lg hover:shadow-indigo-500/30 transition-all"
          >
            Start Scanning
            <ArrowRight size={18} />
          </Link>
        </ScrollReveal>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-indigo-500/10 py-8 px-6 text-center">
        <ScrollReveal direction="fade">
          <p className="text-xs text-slate-500">CI Insight Scanner &bull; DX-Ray Hackathon 2026 &bull; Track A + Track C</p>
        </ScrollReveal>
      </footer>
    </div>
  );
}
