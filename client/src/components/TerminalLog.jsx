import { motion } from 'framer-motion';

export default function TerminalLog({ logs, title = 'Step Logs' }) {
  const lines = (logs || '').split('\n');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="terminal rounded-xl border border-indigo-500/20 overflow-hidden"
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#0d0d20] border-b border-indigo-500/10">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
        </div>
        <span className="text-xs text-slate-500 ml-2">{title}</span>
      </div>

      {/* Log content */}
      <div className="p-4 max-h-[400px] overflow-y-auto">
        {lines.map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className="flex"
          >
            <span className="text-slate-600 select-none w-8 shrink-0 text-right mr-4">
              {i + 1}
            </span>
            <span className={getLineColor(line)}>{line}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function getLineColor(line) {
  if (line.includes('FAIL') || line.includes('Error') || line.includes('failed') || line.includes('✗'))
    return 'text-red-400';
  if (line.includes('PASS') || line.includes('✓') || line.includes('Success') || line.includes('success'))
    return 'text-emerald-400';
  if (line.includes('$') || line.includes('>'))
    return 'text-indigo-400';
  return 'text-slate-300';
}
