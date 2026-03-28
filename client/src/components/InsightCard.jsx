import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Zap, TrendingUp, HeartPulse, ChevronDown, Search } from 'lucide-react';

const typeConfig = {
  bottleneck: { icon: Zap, color: 'amber' },
  flaky: { icon: AlertTriangle, color: 'red' },
  regression: { icon: TrendingUp, color: 'purple' },
  health: { icon: HeartPulse, color: 'red' },
};

const severityColors = {
  low: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
  medium: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' },
  high: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' },
};

export default function InsightCard({ insight, index = 0 }) {
  const [expanded, setExpanded] = useState(false);
  const type = typeConfig[insight.type] || typeConfig.bottleneck;
  const sev = severityColors[insight.severity] || severityColors.low;
  const Icon = type.icon;
  const hasRootCause = insight.rootCause && insight.rootCause.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: 1.01 }}
      className="glass glass-hover p-5"
    >
      <div className="flex items-start gap-4">
        <div className={`p-2.5 rounded-xl ${sev.bg} ${sev.border} border`}>
          <Icon size={20} className={sev.text} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-white font-semibold text-sm">{insight.title}</h4>
            <span className={`text-xs px-2 py-0.5 rounded-full ${sev.bg} ${sev.text} uppercase font-bold`}>
              {insight.severity}
            </span>
          </div>
          <p className="text-slate-400 text-sm">{insight.message}</p>
          <div className="flex items-center gap-2 mt-2">
            {insight.metric && (
              <span className="inline-block text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">
                {insight.metric}
              </span>
            )}
            {hasRootCause && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="inline-flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded hover:bg-amber-500/20 transition-all"
              >
                <Search size={12} />
                Root Cause Analysis
                <ChevronDown size={12} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>

          {/* Root cause analysis expandable section */}
          <AnimatePresence>
            {expanded && hasRootCause && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 pl-3 border-l-2 border-amber-500/30"
              >
                <p className="text-xs text-amber-400 font-semibold mb-2">Probable Root Causes:</p>
                <ul className="space-y-1.5">
                  {insight.rootCause.map((cause, i) => (
                    <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5 shrink-0">&#9656;</span>
                      {cause}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
