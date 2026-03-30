import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, GitCommit, User, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import PageTransition from '../animations/PageTransition';
import StatusBadge from '../components/StatusBadge';
import TerminalLog from '../components/TerminalLog';
import { fetchBuild } from '../services/api';

export default function BuildDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedStep, setSelectedStep] = useState(null);

  useEffect(() => {
    fetchBuild(id)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
          <RefreshCw size={28} className="text-indigo-400" />
        </motion.div>
      </div>
    );
  }

  if (!data) return <div className="min-h-screen flex items-center justify-center text-slate-400">Build not found</div>;

  const { build, steps } = data;
  const maxDuration = Math.max(...steps.map(s => s.duration), 1);

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto px-6 pt-8 pb-12">
        {/* Header */}
        <Link to="/builds" className="inline-flex items-center gap-2 text-slate-400 hover:text-indigo-400 text-sm mb-6 no-underline transition-colors">
          <ArrowLeft size={16} /> Back to Builds
        </Link>

        <div className="glass p-6 mb-8">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-white">{build.workflowName}</h1>
                <StatusBadge status={build.status} />
              </div>
              <div className="flex items-center gap-5 text-sm text-slate-400">
                <span className="flex items-center gap-1.5"><GitCommit size={14} />{build.branch}</span>
                <span className="flex items-center gap-1.5"><User size={14} />{build.triggeredBy}</span>
                <span className="flex items-center gap-1.5"><Clock size={14} />{build.duration}s</span>
                <span>{format(new Date(build.createdAt), 'MMM dd, yyyy HH:mm')}</span>
              </div>
            </div>
            <div className="text-xs text-slate-500 font-mono">
              Run #{build.runId}<br />
              {build.commitSha?.slice(0, 8)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Timeline / Gantt */}
          <div>
            <h2 className="text-lg font-bold text-white mb-4">Execution Timeline</h2>
            <div className="space-y-2">
              {steps.map((step, i) => {
                const widthPct = Math.max(5, (step.duration / maxDuration) * 100);
                const statusColor = {
                  success: 'from-emerald-500 to-emerald-600',
                  failure: 'from-red-500 to-red-600',
                  skipped: 'from-slate-600 to-slate-700',
                  cancelled: 'from-amber-500 to-amber-600',
                }[step.status] || 'from-indigo-500 to-indigo-600';

                return (
                  <motion.div
                    key={step._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setSelectedStep(step)}
                    className={`glass p-3 cursor-pointer transition-all ${
                      selectedStep?._id === step._id ? 'border-indigo-500/50 neon-border' : 'glass-hover'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 w-5">{step.stepNumber}</span>
                        <span className="text-sm text-white font-medium truncate">{step.stepName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">{step.duration}s</span>
                        <StatusBadge status={step.status} />
                      </div>
                    </div>
                    {/* Gantt bar */}
                    <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${widthPct}%` }}
                        transition={{ delay: i * 0.05 + 0.2, duration: 0.5 }}
                        className={`h-full rounded-full bg-gradient-to-r ${statusColor}`}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Logs viewer */}
          <div>
            <h2 className="text-lg font-bold text-white mb-4">Step Logs</h2>
            {selectedStep ? (
              <TerminalLog logs={selectedStep.logs} title={selectedStep.stepName} />
            ) : (
              <div className="glass p-10 text-center text-slate-400">
                <p>Click a step to view its logs</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
