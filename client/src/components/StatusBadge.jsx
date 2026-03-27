import { CheckCircle, XCircle, MinusCircle, Clock, SkipForward } from 'lucide-react';

const config = {
  success: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  failure: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  cancelled: { icon: MinusCircle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  in_progress: { icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  skipped: { icon: SkipForward, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30' },
};

export default function StatusBadge({ status }) {
  const c = config[status] || config.failure;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${c.color} ${c.bg} ${c.border}`}>
      <Icon size={12} />
      {status}
    </span>
  );
}
