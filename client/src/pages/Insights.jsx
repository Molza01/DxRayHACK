import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Zap, TrendingUp, HeartPulse, RefreshCw, Shield, Clock, GitBranch, RotateCcw } from 'lucide-react';
import PageTransition from '../animations/PageTransition';
import InsightCard from '../components/InsightCard';
import BarChartComponent from '../charts/BarChartComponent';
import { fetchAnalytics } from '../services/api';

export default function Insights() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
          <RefreshCw size={28} className="text-indigo-400" />
        </motion.div>
      </div>
    );
  }

  const insights = data?.insights || [];
  const bottlenecks = insights.filter(i => i.type === 'bottleneck');
  const flakyInsights = insights.filter(i => i.type === 'flaky');
  const regressions = insights.filter(i => i.type === 'regression');
  const healthInsights = insights.filter(i => i.type === 'health');

  const retryAnalysis = data?.retryAnalysis || {};
  const retrySteps = retryAnalysis.retrySteps || [];
  const timePatterns = retryAnalysis.timePatterns || [];
  const branchPatterns = retryAnalysis.branchPatterns || [];

  const categories = [
    { title: 'Bottlenecks', items: bottlenecks, icon: Zap, color: 'text-amber-400', empty: 'No bottlenecks detected' },
    { title: 'Flaky Steps', items: flakyInsights, icon: AlertTriangle, color: 'text-red-400', empty: 'No flaky steps detected' },
    { title: 'Regressions', items: regressions, icon: TrendingUp, color: 'text-purple-400', empty: 'No regressions detected' },
    { title: 'Health Alerts', items: healthInsights, icon: HeartPulse, color: 'text-red-400', empty: 'Pipeline is healthy' },
  ];

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto px-6 pt-24 pb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white neon-text">Insights & Alerts</h1>
            <p className="text-slate-400 mt-1">AI-powered pipeline analysis with root cause detection</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <Shield size={16} className="text-indigo-400" />
            <span className="text-sm text-indigo-300 font-medium">
              {insights.length} alert{insights.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {categories.map(({ title, items, icon: Icon, color }) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass p-5 text-center"
            >
              <Icon size={24} className={`${color} mx-auto mb-2`} />
              <div className="text-2xl font-bold text-white">{items.length}</div>
              <div className="text-xs text-slate-400">{title}</div>
            </motion.div>
          ))}
        </div>

        {/* Detailed insights by category */}
        {categories.map(({ title, items, icon: Icon, color, empty }) => (
          <div key={title} className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Icon size={20} className={color} />
              <h2 className="text-lg font-bold text-white">{title}</h2>
            </div>
            {items.length === 0 ? (
              <div className="glass p-6 text-center text-slate-400 text-sm">{empty}</div>
            ) : (
              <div className="grid gap-4">
                {items.map((insight, i) => (
                  <InsightCard key={i} insight={insight} index={i} />
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Retry Analysis Section */}
        {retrySteps.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <RotateCcw size={20} className="text-orange-400" />
              <h2 className="text-lg font-bold text-white">Retry Analysis</h2>
            </div>
            <div className="glass p-5">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 text-xs border-b border-slate-700/50">
                      <th className="text-left pb-3 font-medium">Step Name</th>
                      <th className="text-center pb-3 font-medium">Total Runs</th>
                      <th className="text-center pb-3 font-medium">Failures</th>
                      <th className="text-center pb-3 font-medium">Failure Rate</th>
                      <th className="text-center pb-3 font-medium">Retries</th>
                      <th className="text-center pb-3 font-medium">Avg Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {retrySteps.map((step, i) => (
                      <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 text-white font-medium">{step.stepName}</td>
                        <td className="py-3 text-center text-slate-300">{step.totalRuns}</td>
                        <td className="py-3 text-center text-red-400">{step.failures}</td>
                        <td className="py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            step.failureRate > 50 ? 'bg-red-500/20 text-red-400' :
                            step.failureRate > 25 ? 'bg-amber-500/20 text-amber-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {step.failureRate}%
                          </span>
                        </td>
                        <td className="py-3 text-center text-orange-400">{step.totalRetries}</td>
                        <td className="py-3 text-center text-slate-300">{step.avgDuration}s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Failure Pattern Analysis */}
        {(timePatterns.length > 0 || branchPatterns.length > 0) && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-white mb-4">Failure Pattern Analysis</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Failures by Time of Day */}
              {timePatterns.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass p-5"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Clock size={18} className="text-purple-400" />
                    <h3 className="text-white font-semibold text-sm">Failures by Time of Day</h3>
                  </div>
                  <div className="space-y-2">
                    {timePatterns.map((tp, i) => {
                      const maxCount = timePatterns[0]?.failureCount || 1;
                      const width = (tp.failureCount / maxCount) * 100;
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs text-slate-400 w-14 text-right">{tp.hour}:00</span>
                          <div className="flex-1 h-5 bg-slate-800/50 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                              style={{ width: `${width}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-300 w-8">{tp.failureCount}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-500 mt-3">
                    Most failures occur at {timePatterns[0]?.hour}:00 — consider investigating resource availability during these hours.
                  </p>
                </motion.div>
              )}

              {/* Failures by Branch */}
              {branchPatterns.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="glass p-5"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <GitBranch size={18} className="text-cyan-400" />
                    <h3 className="text-white font-semibold text-sm">Failures by Branch</h3>
                  </div>
                  <div className="space-y-2">
                    {branchPatterns.map((bp, i) => {
                      const maxCount = branchPatterns[0]?.failureCount || 1;
                      const width = (bp.failureCount / maxCount) * 100;
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs text-slate-400 w-24 text-right truncate" title={bp.branch}>{bp.branch}</span>
                          <div className="flex-1 h-5 bg-slate-800/50 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
                              style={{ width: `${width}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-300 w-8">{bp.failureCount}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-500 mt-3">
                    Branch "{branchPatterns[0]?.branch}" has the most failures — consider adding pre-push checks.
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        )}

        {/* Flaky steps chart */}
        {data?.flakySteps?.length > 0 && (
          <BarChartComponent
            data={data.flakySteps}
            title="Flaky Steps — Instability Score"
            dataKey="instabilityScore"
            nameKey="stepName"
          />
        )}
      </div>
    </PageTransition>
  );
}
