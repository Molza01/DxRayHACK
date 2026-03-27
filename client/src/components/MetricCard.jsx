import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect, useRef } from 'react';

export default function MetricCard({ title, value, suffix = '', icon: Icon, color = 'indigo', delay = 0 }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => {
    if (suffix === '%' || suffix === 's') return v.toFixed(1);
    return Math.round(v);
  });
  const displayRef = useRef(null);

  useEffect(() => {
    const numVal = typeof value === 'number' ? value : parseFloat(value) || 0;
    const controls = animate(count, numVal, { duration: 1.5, delay, ease: 'easeOut' });
    const unsub = rounded.on('change', (v) => {
      if (displayRef.current) displayRef.current.textContent = v + suffix;
    });
    return () => { controls.stop(); unsub(); };
  }, [value, count, rounded, suffix, delay]);

  const colors = {
    indigo: { bg: 'from-indigo-500/20 to-indigo-600/5', border: 'border-indigo-500/20', text: 'text-indigo-400' },
    green: { bg: 'from-emerald-500/20 to-emerald-600/5', border: 'border-emerald-500/20', text: 'text-emerald-400' },
    red: { bg: 'from-red-500/20 to-red-600/5', border: 'border-red-500/20', text: 'text-red-400' },
    purple: { bg: 'from-purple-500/20 to-purple-600/5', border: 'border-purple-500/20', text: 'text-purple-400' },
    amber: { bg: 'from-amber-500/20 to-amber-600/5', border: 'border-amber-500/20', text: 'text-amber-400' },
  };
  const c = colors[color] || colors.indigo;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      className={`glass glass-hover p-6 bg-gradient-to-br ${c.bg} ${c.border}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-slate-400">{title}</span>
        {Icon && <Icon size={20} className={c.text} />}
      </div>
      <div ref={displayRef} className="text-3xl font-bold text-white">
        0{suffix}
      </div>
    </motion.div>
  );
}
