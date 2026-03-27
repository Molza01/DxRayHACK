import { motion } from 'framer-motion';
import { AlertTriangle, Zap, TrendingUp, HeartPulse } from 'lucide-react';

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
  const type = typeConfig[insight.type] || typeConfig.bottleneck;
  const sev = severityColors[insight.severity] || severityColors.low;
  const Icon = type.icon;

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
          {insight.metric && (
            <span className="inline-block mt-2 text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">
              {insight.metric}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
