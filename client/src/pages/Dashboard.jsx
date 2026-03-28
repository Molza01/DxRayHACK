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
import HeatmapChart from '../charts/HeatmapChart';
import ScrollReveal from '../animations/ScrollReveal';
import { fetchAnalytics, seedDemo, seedScenario, syncGitHub, syncVercel, syncRender, clearData } from '../services/api';

const PLATFORMS = [
  { id: 'github', label: 'GitHub Actions', color: 'indigo' },
  { id: 'vercel', label: 'Vercel', color: 'sky' },
  { id: 'render', label: 'Render', color: 'emerald' },
];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [platform, setPlatform] = useState('github');
  const [syncForm, setSyncForm] = useState({ owner: '', repo: '', projectId: '', serviceId: '' });
  const [showSync, setShowSync] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);
  const [selectedRepo, setSelectedRepo] = useState('');

  const load = async (repo) => {
    setLoading(true);
    try {
      const repoFilter = repo !== undefined ? repo : selectedRepo;
      const analytics = await fetchAnalytics(repoFilter || undefined);
      setData(analytics);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleRepoChange = (repo) => {
    setSelectedRepo(repo);
    load(repo);
  };

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

  const handleScenario = async (scenario) => {
    setSyncing(true);
    try {
      const result = await seedScenario(scenario);
      setSyncMessage({ type: 'success', text: result.message });
      await load();
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      setSyncMessage({ type: 'error', text: msg });
    }
    setSyncing(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      let result;
      if (platform === 'github') {
        if (!syncForm.owner || !syncForm.repo) {
          setSyncMessage({ type: 'error', text: 'Owner and repository name are required.' });
          setSyncing(false);
          return;
        }
        try {
          result = await syncGitHub(syncForm.owner, syncForm.repo);
        } catch (err) {
          const data = err.response?.data;
          // Auto-detect: if GitHub has no Actions but detected Vercel/Render, suggest switching
          if (data?.detectedPlatforms?.length > 0) {
            const detected = data.detectedPlatforms[0]; // Switch to first detected platform
            setPlatform(detected);
            setSyncMessage({
              type: 'error',
              text: `${data.message} We switched to the ${detected === 'vercel' ? 'Vercel' : 'Render'} tab — enter your ${detected === 'vercel' ? 'project name' : 'Service ID'} to sync.`,
            });
            setSyncing(false);
            return;
          }
          throw err; // Re-throw for the outer catch
        }
      } else if (platform === 'vercel') {
        if (!syncForm.projectId) {
          setSyncMessage({ type: 'error', text: 'Vercel project name or ID is required.' });
          setSyncing(false);
          return;
        }
        result = await syncVercel(syncForm.projectId);
      } else if (platform === 'render') {
        if (!syncForm.serviceId) {
          setSyncMessage({ type: 'error', text: 'Render Service ID is required.' });
          setSyncing(false);
          return;
        }
        result = await syncRender(syncForm.serviceId);
      }
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
            <div className="relative group">
              <button
                disabled={syncing}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-sm font-medium hover:bg-purple-500/20 transition-all disabled:opacity-50"
              >
                <Database size={16} />
                Demo Presets
              </button>
              <div className="absolute right-0 top-full mt-1 w-52 rounded-xl bg-slate-900 border border-indigo-500/20 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <button onClick={handleSeed} disabled={syncing} className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-indigo-500/10 rounded-t-xl transition-colors">
                  Normal Mix
                  <span className="block text-[10px] text-slate-500">65% success, varied steps</span>
                </button>
                <button onClick={() => handleScenario('healthy')} disabled={syncing} className="w-full text-left px-4 py-2.5 text-sm text-emerald-300 hover:bg-emerald-500/10 transition-colors">
                  Healthy Pipeline
                  <span className="block text-[10px] text-slate-500">95% success, fast builds</span>
                </button>
                <button onClick={() => handleScenario('bottleneck')} disabled={syncing} className="w-full text-left px-4 py-2.5 text-sm text-amber-300 hover:bg-amber-500/10 transition-colors">
                  Bottleneck Pipeline
                  <span className="block text-[10px] text-slate-500">Slow builds, clear bottlenecks</span>
                </button>
                <button onClick={() => handleScenario('flaky')} disabled={syncing} className="w-full text-left px-4 py-2.5 text-sm text-red-300 hover:bg-red-500/10 rounded-b-xl transition-colors">
                  Flaky Pipeline
                  <span className="block text-[10px] text-slate-500">55% success, high retries</span>
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowSync(!showSync)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-sm font-medium hover:bg-indigo-500/20 transition-all"
            >
              <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
              Sync Platform
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

        {/* Repo selector */}
        {data?.availableRepos?.length > 0 && (
          <div className="flex items-center gap-3 mb-6">
            <span className="text-xs text-slate-400">Filter by repo:</span>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => handleRepoChange('')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  !selectedRepo ? 'bg-indigo-500 text-white' : 'bg-slate-800/50 text-slate-400 hover:text-white'
                }`}
              >
                All Repos
              </button>
              {data.availableRepos.map((repo) => (
                <button
                  key={repo}
                  onClick={() => handleRepoChange(repo)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedRepo === repo ? 'bg-indigo-500 text-white' : 'bg-slate-800/50 text-slate-400 hover:text-white'
                  }`}
                >
                  {repo}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sync form */}
        {showSync && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="glass p-5 mb-6"
          >
            {/* Platform selector tabs */}
            <div className="flex gap-2 mb-4">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlatform(p.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    platform === p.id
                      ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                      : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Dynamic form fields */}
            <div className="flex items-end gap-4">
              {platform === 'github' && (
                <>
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
                </>
              )}

              {platform === 'vercel' && (
                <div className="flex-1">
                  <label className="text-xs text-slate-400 mb-1 block">Project Name / ID</label>
                  <input
                    value={syncForm.projectId}
                    onChange={(e) => setSyncForm({ ...syncForm, projectId: e.target.value })}
                    placeholder="e.g. my-next-app"
                    className="w-full bg-slate-900/50 border border-sky-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500/50"
                  />
                </div>
              )}

              {platform === 'render' && (
                <div className="flex-1">
                  <label className="text-xs text-slate-400 mb-1 block">Service ID</label>
                  <input
                    value={syncForm.serviceId}
                    onChange={(e) => setSyncForm({ ...syncForm, serviceId: e.target.value })}
                    placeholder="srv-..."
                    className="w-full bg-slate-900/50 border border-emerald-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              )}

              <button
                onClick={handleSync}
                disabled={syncing}
                className="px-6 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-all disabled:opacity-50 shrink-0"
              >
                {syncing ? 'Syncing...' : 'Sync'}
              </button>
            </div>

            {/* Help text */}
            <div className="mt-3 text-xs text-slate-500">
              {platform === 'github' && 'Enter the GitHub repository owner and name. Token is configured in .env file.'}
              {platform === 'vercel' && 'Enter your Vercel project name (from your Vercel dashboard). Token is configured in .env file.'}
              {platform === 'render' && 'Enter your Render Service ID (starts with "srv-", found in service settings). API key is configured in .env file.'}
            </div>
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
            <p className="text-slate-400 mb-6">Load demo data or sync from GitHub, Vercel, or Render to get started.</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button onClick={() => handleScenario('healthy')} disabled={syncing}
                className="px-5 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold hover:bg-emerald-500/20 transition-all disabled:opacity-50">
                Healthy Demo
              </button>
              <button onClick={() => handleScenario('bottleneck')} disabled={syncing}
                className="px-5 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold hover:bg-amber-500/20 transition-all disabled:opacity-50">
                Bottleneck Demo
              </button>
              <button onClick={() => handleScenario('flaky')} disabled={syncing}
                className="px-5 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 font-semibold hover:bg-red-500/20 transition-all disabled:opacity-50">
                Flaky Demo
              </button>
              <button onClick={() => setShowSync(true)}
                className="px-5 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-semibold hover:bg-indigo-500/20 transition-all">
                Sync a Platform
              </button>
            </div>
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
            <ScrollReveal direction="up">
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
            </ScrollReveal>

            {/* Build Time Heatmap */}
            {data.heatmapData && data.heatmapData.length > 0 && (
              <ScrollReveal direction="up" delay={0.1}>
                <div className="mb-8">
                  <HeatmapChart data={data.heatmapData} title="Build Time Heatmap (Day / Hour)" />
                </div>
              </ScrollReveal>
            )}

            {/* Bottleneck + Success Rate charts */}
            <ScrollReveal direction="left" delay={0.05}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <BarChartComponent
                  data={data.slowestSteps}
                  title="CI Bottleneck Detector — Slowest Steps"
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
            </ScrollReveal>

            {/* Insights */}
            {data.insights && data.insights.length > 0 && (
              <ScrollReveal direction="up" delay={0.1}>
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-white mb-4">Insights & Alerts</h2>
                  <div className="grid gap-4">
                    {data.insights.map((insight, i) => (
                      <InsightCard key={i} insight={insight} index={i} />
                    ))}
                  </div>
                </div>
              </ScrollReveal>
            )}
          </>
        )}
      </div>
    </PageTransition>
  );
}
