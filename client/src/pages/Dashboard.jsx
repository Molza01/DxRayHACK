import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Clock, CheckCircle, XCircle, RefreshCw, Database, Trash2 } from 'lucide-react';
import PageTransition from '../animations/PageTransition';
import MetricCard from '../components/MetricCard';
import HealthGauge from '../components/HealthGauge';
import InsightCard from '../components/InsightCard';
import TrendChart from '../charts/TrendChart';
import BarChartComponent from '../charts/BarChartComponent';
import PieChartComponent from '../charts/PieChartComponent';
import { fetchAnalytics, seedDemo, syncGitHub, clearData } from '../services/api';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncForm, setSyncForm] = useState({ owner: '', repo: '' });
  const [showSync, setShowSync] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const analytics = await fetchAnalytics();
      setData(analytics);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSeed = async () => {
    setSyncing(true);
    try {
      await seedDemo();
      await load();
    } catch (err) {
      console.error(err);
    }
    setSyncing(false);
  };

  const handleSync = async () => {
    if (!syncForm.owner || !syncForm.repo) return;
    setSyncing(true);
    setSyncMessage(null);
    try {
      const result = await syncGitHub(syncForm.owner, syncForm.repo);
      setSyncMessage({ type: 'success', text: result.message });
      await load();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Sync failed';
      setSyncMessage({ type: 'error', text: msg });
    }
    setSyncing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
          <RefreshCw size={32} className="text-indigo-400" />
        </motion.div>
      </div>
    );
  }

  const noData = !data || data.totalBuilds === 0;

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto px-6 pt-24 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white neon-text">Dashboard</h1>
            <p className="text-slate-400 mt-1">CI/CD pipeline analytics overview</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSeed}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-sm font-medium hover:bg-purple-500/20 transition-all disabled:opacity-50"
            >
              <Database size={16} />
              Load Demo Data
            </button>
            <button
              onClick={() => setShowSync(!showSync)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-sm font-medium hover:bg-indigo-500/20 transition-all"
            >
              <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
              Sync GitHub
            </button>
            <button
              onClick={async () => { await clearData(); await load(); setSyncMessage({ type: 'success', text: 'All data cleared. You can now resync.' }); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm font-medium hover:bg-red-500/20 transition-all"
            >
              <Trash2 size={16} />
              Clear Data
            </button>
          </div>
        </div>

        {/* Sync form */}
        {showSync && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="glass p-5 mb-6 flex items-end gap-4"
          >
            <div className="flex-1">
              <label className="text-xs text-slate-400 mb-1 block">Owner</label>
              <input
                value={syncForm.owner}
                onChange={(e) => setSyncForm({ ...syncForm, owner: e.target.value })}
                placeholder="e.g. facebook"
                className="w-full bg-slate-900/50 border border-indigo-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-slate-400 mb-1 block">Repository</label>
              <input
                value={syncForm.repo}
                onChange={(e) => setSyncForm({ ...syncForm, repo: e.target.value })}
                placeholder="e.g. react"
                className="w-full bg-slate-900/50 border border-indigo-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
              />
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-6 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-all disabled:opacity-50"
            >
              Sync
            </button>
          </motion.div>
        )}

        {/* Sync result message */}
        {syncMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-xl border flex items-start gap-3 ${
              syncMessage.type === 'error'
                ? 'bg-red-500/10 border-red-500/30 text-red-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}
          >
            {syncMessage.type === 'error' ? <XCircle size={20} className="shrink-0 mt-0.5" /> : <CheckCircle size={20} className="shrink-0 mt-0.5" />}
            <div className="flex-1">
              <p className="text-sm font-medium">{syncMessage.type === 'error' ? 'Sync Failed' : 'Sync Complete'}</p>
              <p className="text-xs mt-1 opacity-80">{syncMessage.text}</p>
            </div>
            <button onClick={() => setSyncMessage(null)} className="text-xs opacity-50 hover:opacity-100">dismiss</button>
          </motion.div>
        )}

        {noData ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass p-16 text-center"
          >
            <Database size={48} className="text-indigo-400 mx-auto mb-4 opacity-50" />
            <h2 className="text-xl text-white mb-2">No build data yet</h2>
            <p className="text-slate-400 mb-6">Load demo data or sync from GitHub to get started.</p>
            <button
              onClick={handleSeed}
              disabled={syncing}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold hover:shadow-lg hover:shadow-indigo-500/30 transition-all disabled:opacity-50"
            >
              Load Demo Data
            </button>
          </motion.div>
        ) : (
          <>
            {/* Metric cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <MetricCard title="Total Builds" value={data.totalBuilds} icon={Activity} color="indigo" delay={0} />
              <MetricCard title="Avg Duration" value={data.avgDuration} suffix="s" icon={Clock} color="purple" delay={0.1} />
              <MetricCard title="Success Rate" value={data.successRate} suffix="%" icon={CheckCircle} color="green" delay={0.2} />
              <MetricCard title="Failure Rate" value={data.failureRate} suffix="%" icon={XCircle} color="red" delay={0.3} />
              <div className="flex justify-center items-center">
                <HealthGauge score={data.healthScore} />
              </div>
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2">
                <TrendChart
                  data={data.dailyTrends}
                  title="Build Duration Trend"
                  dataKey="avgDuration"
                  color="#818cf8"
                />
              </div>
              <PieChartComponent
                success={data.successBuilds}
                failure={data.failedBuilds}
                cancelled={data.totalBuilds - data.successBuilds - data.failedBuilds}
              />
            </div>

            {/* Bottleneck + Success Rate charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <BarChartComponent
                data={data.slowestSteps}
                title="Slowest Steps (avg seconds)"
                dataKey="avgDuration"
                nameKey="stepName"
              />
              <TrendChart
                data={data.dailyTrends}
                title="Success Rate Trend"
                dataKey="successRate"
                color="#34d399"
              />
            </div>

            {/* Insights */}
            {data.insights && data.insights.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-white mb-4">Insights & Alerts</h2>
                <div className="grid gap-4">
                  {data.insights.map((insight, i) => (
                    <InsightCard key={i} insight={insight} index={i} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PageTransition>
  );
}
