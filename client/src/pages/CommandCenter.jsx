import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw, Target, Zap, AlertTriangle, Lightbulb, Download, Search,
  TrendingUp, Clock, CheckCircle, XCircle, Activity, ArrowRight, Wifi
} from 'lucide-react';
import PageTransition from '../animations/PageTransition';
import HealthGauge from '../components/HealthGauge';
import HeatmapChart from '../charts/HeatmapChart';
import { fetchAnalytics, fetchReport, createSSEStream } from '../services/api';

const IMPACT_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4'];

function getImpactColor(score) {
  if (score >= 60) return IMPACT_COLORS[0];
  if (score >= 40) return IMPACT_COLORS[1];
  if (score >= 20) return IMPACT_COLORS[2];
  if (score >= 10) return IMPACT_COLORS[3];
  return IMPACT_COLORS[4];
}

function effortBadge(effort) {
  const colors = { low: 'bg-emerald-500/20 text-emerald-400', medium: 'bg-amber-500/20 text-amber-400', high: 'bg-red-500/20 text-red-400', varies: 'bg-purple-500/20 text-purple-400' };
  return colors[effort] || colors.medium;
}

export default function CommandCenter() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liveConnected, setLiveConnected] = useState(false);
  const [logSearch, setLogSearch] = useState('');
  const [activeTab, setActiveTab] = useState('impact');
  const sseRef = useRef(null);

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

  useEffect(() => {
    load();
    // Connect to SSE for live updates
    sseRef.current = createSSEStream((msg) => {
      if (msg.type === 'connected') setLiveConnected(true);
      if (msg.type === 'analytics') setData(msg.data);
    });
    return () => sseRef.current?.close();
  }, []);

  const handleExport = async (format) => {
    try {
      const report = await fetchReport();
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `ci-report-${new Date().toISOString().slice(0, 10)}.json`);
      } else {
        const md = generateMarkdown(report);
        const blob = new Blob([md], { type: 'text/markdown' });
        downloadBlob(blob, `ci-report-${new Date().toISOString().slice(0, 10)}.md`);
      }
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function generateMarkdown(report) {
    let md = `# CI/CD Pipeline Report\n`;
    md += `Generated: ${new Date(report.generatedAt).toLocaleString()}\n\n`;
    md += `## Summary\n`;
    md += `| Metric | Value |\n|--------|-------|\n`;
    md += `| Total Builds | ${report.summary.totalBuilds} |\n`;
    md += `| Success Rate | ${report.summary.successRate}% |\n`;
    md += `| Avg Duration | ${report.summary.avgDuration}s |\n`;
    md += `| Health Score | ${report.summary.healthScore}/100 |\n\n`;

    if (report.bottlenecks?.length > 0) {
      md += `## Top Bottlenecks\n`;
      report.bottlenecks.forEach((b, i) => {
        md += `${i + 1}. **${b.stepName}** — ${b.avgDuration}s avg, ${b.contributionPct}% of pipeline, Impact: ${b.impactScore}\n`;
      });
      md += '\n';
    }

    if (report.recommendations?.length > 0) {
      md += `## Recommendations\n`;
      report.recommendations.forEach((r, i) => {
        md += `${i + 1}. **${r.title}** (${r.effort} effort, ${r.impact} impact)\n   ${r.description}\n   Estimated saving: ${r.estimatedSaving}\n\n`;
      });
    }

    if (report.insights?.length > 0) {
      md += `## Insights\n`;
      report.insights.forEach((ins) => {
        md += `- [${ins.severity.toUpperCase()}] ${ins.title}: ${ins.message}\n`;
      });
    }

    return md;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
          <RefreshCw size={32} className="text-indigo-400" />
        </motion.div>
      </div>
    );
  }

  if (!data || data.totalBuilds === 0) {
    return (
      <PageTransition>
        <div className="max-w-7xl mx-auto px-6 pt-24 pb-12 text-center">
          <Target size={48} className="text-indigo-400 mx-auto mb-4 opacity-50" />
          <h2 className="text-xl text-white mb-2">No data for Command Center</h2>
          <p className="text-slate-400">Sync a platform or load demo data from the Dashboard first.</p>
        </div>
      </PageTransition>
    );
  }

  const bottlenecks = data.bottleneckImpact || [];
  const recommendations = data.recommendations || [];
  const insights = data.insights || [];

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto px-6 pt-24 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white neon-text">Command Center</h1>
            <p className="text-slate-400 mt-1">Hotspot detection &rarr; Root cause &rarr; Recommendations</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Live indicator */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
              liveConnected ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-slate-800 text-slate-500'
            }`}>
              <Wifi size={12} className={liveConnected ? 'animate-pulse' : ''} />
              {liveConnected ? 'Live' : 'Offline'}
            </div>
            {/* Export buttons */}
            <button
              onClick={() => handleExport('markdown')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-medium hover:bg-indigo-500/20 transition-all"
            >
              <Download size={14} /> Export .md
            </button>
            <button
              onClick={() => handleExport('json')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-medium hover:bg-purple-500/20 transition-all"
            >
              <Download size={14} /> Export JSON
            </button>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="glass p-4 text-center">
            <Activity size={20} className="text-indigo-400 mx-auto mb-1" />
            <div className="text-xl font-bold text-white">{data.totalBuilds}</div>
            <div className="text-xs text-slate-400">Total Builds</div>
          </div>
          <div className="glass p-4 text-center">
            <Clock size={20} className="text-purple-400 mx-auto mb-1" />
            <div className="text-xl font-bold text-white">{data.avgDuration}s</div>
            <div className="text-xs text-slate-400">Avg Duration</div>
          </div>
          <div className="glass p-4 text-center">
            <CheckCircle size={20} className="text-emerald-400 mx-auto mb-1" />
            <div className="text-xl font-bold text-white">{data.successRate}%</div>
            <div className="text-xs text-slate-400">Success Rate</div>
          </div>
          <div className="glass p-4 text-center">
            <XCircle size={20} className="text-red-400 mx-auto mb-1" />
            <div className="text-xl font-bold text-white">{data.failureRate}%</div>
            <div className="text-xs text-slate-400">Failure Rate</div>
          </div>
          <div className="flex justify-center items-center">
            <HealthGauge score={data.healthScore} />
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { id: 'impact', label: 'Bottleneck Impact', icon: Target },
            { id: 'recommendations', label: 'Recommendations', icon: Lightbulb },
            { id: 'flaky', label: 'Flaky Investigator', icon: AlertTriangle },
            { id: 'heatmap', label: 'Build Heatmap', icon: Activity },
            { id: 'debugger', label: 'Log Debugger', icon: Search },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium shrink-0 transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {/* Bottleneck Impact Tab */}
          {activeTab === 'impact' && (
            <motion.div key="impact" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="glass p-6 mb-6">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Target size={18} className="text-red-400" />
                  Bottleneck Impact Scoring
                </h3>
                {bottlenecks.length === 0 ? (
                  <p className="text-slate-400 text-sm">No bottleneck data available.</p>
                ) : (
                  <div className="space-y-3">
                    {bottlenecks.map((step, i) => (
                      <motion.div
                        key={step.stepName}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-slate-900/50 rounded-xl p-4 border border-slate-800/50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                              style={{ backgroundColor: getImpactColor(step.impactScore) + '30', border: `2px solid ${getImpactColor(step.impactScore)}` }}
                            >
                              {step.impactScore}
                            </div>
                            <div>
                              <div className="text-white font-medium text-sm">{step.stepName}</div>
                              <div className="text-xs text-slate-500">{step.count} runs | {step.avgDuration}s avg</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <div className="text-center">
                              <div className="text-amber-400 font-bold">{step.contributionPct}%</div>
                              <div className="text-slate-500">pipeline share</div>
                            </div>
                            <div className="text-center">
                              <div className="text-red-400 font-bold">{step.failureRate}%</div>
                              <div className="text-slate-500">failure rate</div>
                            </div>
                            <div className="text-center">
                              <div className="text-purple-400 font-bold">{step.durationVariance}s</div>
                              <div className="text-slate-500">variance</div>
                            </div>
                            <div className="text-center">
                              <div className="text-emerald-400 font-bold">~{step.estimatedSavings}s</div>
                              <div className="text-slate-500">potential saving</div>
                            </div>
                          </div>
                        </div>
                        {/* Contribution bar */}
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${Math.min(step.contributionPct, 100)}%`, backgroundColor: getImpactColor(step.impactScore) }}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Recommendations Tab */}
          {activeTab === 'recommendations' && (
            <motion.div key="recs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="glass p-6">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Lightbulb size={18} className="text-amber-400" />
                  Actionable Recommendations
                </h3>
                {recommendations.length === 0 ? (
                  <p className="text-slate-400 text-sm">No recommendations — pipeline looks good!</p>
                ) : (
                  <div className="space-y-4">
                    {recommendations.map((rec, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-slate-900/50 rounded-xl p-5 border border-slate-800/50"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-sm">
                              {rec.priority}
                            </div>
                            <div>
                              <h4 className="text-white font-medium text-sm">{rec.title}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${effortBadge(rec.effort)}`}>
                                  {rec.effort} effort
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-medium">
                                  {rec.impact} impact
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-emerald-400 font-bold text-sm flex items-center gap-1">
                              <TrendingUp size={14} />
                              {rec.estimatedSaving}
                            </div>
                            <div className="text-[10px] text-slate-500">estimated saving</div>
                          </div>
                        </div>
                        <p className="text-slate-400 text-xs mt-2 leading-relaxed">{rec.description}</p>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Flaky Investigator Tab */}
          {activeTab === 'flaky' && (
            <motion.div key="flaky" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="space-y-6">
                {/* Flaky steps with root cause */}
                <div className="glass p-6">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <AlertTriangle size={18} className="text-red-400" />
                    Flaky Step Investigator
                  </h3>
                  {(data.flakySteps || []).length === 0 ? (
                    <p className="text-slate-400 text-sm">No flaky steps detected.</p>
                  ) : (
                    <div className="space-y-3">
                      {data.flakySteps.map((step, i) => {
                        const rootCauses = analyzeRootCauseClient(step.stepName, step.instabilityScore);
                        return (
                          <div key={i} className="bg-slate-900/50 rounded-xl p-4 border border-slate-800/50">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <div className="text-white font-medium text-sm">{step.stepName}</div>
                                <div className="text-xs text-slate-500">{step.totalRuns} runs | {step.failures} failures | {step.successes} successes</div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-center">
                                  <div className={`font-bold text-sm ${step.instabilityScore > 50 ? 'text-red-400' : step.instabilityScore > 25 ? 'text-amber-400' : 'text-blue-400'}`}>
                                    {step.instabilityScore}%
                                  </div>
                                  <div className="text-[10px] text-slate-500">instability</div>
                                </div>
                                {step.totalRetries > 0 && (
                                  <div className="text-center">
                                    <div className="text-orange-400 font-bold text-sm">{step.totalRetries}</div>
                                    <div className="text-[10px] text-slate-500">retries</div>
                                  </div>
                                )}
                              </div>
                            </div>
                            {/* Intermittency bar */}
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-3">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500"
                                style={{ width: `${step.instabilityScore}%` }}
                              />
                            </div>
                            {/* Root cause hints */}
                            <div className="pl-3 border-l-2 border-amber-500/30">
                              <p className="text-[10px] text-amber-400 font-semibold mb-1">PROBABLE CAUSES:</p>
                              {rootCauses.map((cause, ci) => (
                                <p key={ci} className="text-xs text-slate-400 flex items-start gap-1.5">
                                  <span className="text-amber-500 mt-0.5">&#9656;</span>
                                  {cause}
                                </p>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Insights with root cause */}
                {insights.filter(i => i.rootCause).length > 0 && (
                  <div className="glass p-6">
                    <h3 className="text-white font-semibold mb-4">All Detected Issues</h3>
                    <div className="space-y-3">
                      {insights.filter(i => i.rootCause).map((insight, i) => (
                        <div key={i} className="bg-slate-900/50 rounded-xl p-4 border border-slate-800/50">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
                              insight.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                              insight.severity === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
                            }`}>{insight.severity}</span>
                            <span className="text-white text-sm font-medium">{insight.title}</span>
                          </div>
                          <p className="text-xs text-slate-400 mb-2">{insight.message}</p>
                          {insight.rootCause && (
                            <div className="text-xs text-slate-500">
                              {insight.rootCause.map((c, ci) => (
                                <span key={ci} className="inline-block mr-2 mb-1 px-2 py-0.5 rounded bg-slate-800/80 text-slate-400">{c}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Heatmap Tab */}
          {activeTab === 'heatmap' && (
            <motion.div key="heatmap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {data.heatmapData && data.heatmapData.length > 0 ? (
                <HeatmapChart data={data.heatmapData} title="Build Activity Heatmap (Day x Hour)" />
              ) : (
                <div className="glass p-10 text-center text-slate-400 text-sm">No heatmap data available</div>
              )}
            </motion.div>
          )}

          {/* Log Debugger Tab */}
          {activeTab === 'debugger' && (
            <motion.div key="debugger" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LogDebugger data={data} searchQuery={logSearch} onSearchChange={setLogSearch} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}

// Client-side root cause analysis for flaky steps
function analyzeRootCauseClient(stepName, instabilityScore) {
  const causes = [];
  const name = stepName.toLowerCase();

  if (name.includes('test') || name.includes('spec') || name.includes('e2e')) {
    causes.push('Race conditions or timing-dependent assertions in tests');
    causes.push('Shared mutable state between test cases');
    if (instabilityScore > 40) causes.push('External service dependency (API/DB) causing intermittent failures');
  }
  if (name.includes('install') || name.includes('dependencies')) {
    causes.push('NPM/Yarn registry timeouts or rate limiting');
    causes.push('Lock file version conflicts');
  }
  if (name.includes('build') || name.includes('compile')) {
    causes.push('Memory pressure (OOM kills) on CI runner');
    causes.push('Cache invalidation causing full rebuilds');
  }
  if (name.includes('deploy') || name.includes('health')) {
    causes.push('Health check timeout — service startup too slow');
    causes.push('Resource contention on deploy target');
  }
  if (name.includes('docker') || name.includes('image')) {
    causes.push('Docker layer cache miss — base image updated');
    causes.push('Network timeouts pulling images');
  }
  if (causes.length === 0) {
    causes.push('Network instability or resource contention on CI runner');
    causes.push('Non-deterministic step behavior — review logs for patterns');
  }
  return causes;
}

// Log Debugger component — search, highlight suspicious lines
function LogDebugger({ data }) {
  const [search, setSearch] = useState('');
  const [selectedInsight, setSelectedInsight] = useState(null);

  // Collect all logs from insights and steps
  const suspiciousPatterns = [
    { pattern: /error/i, label: 'Error', color: 'text-red-400' },
    { pattern: /fail/i, label: 'Failure', color: 'text-red-400' },
    { pattern: /timeout/i, label: 'Timeout', color: 'text-amber-400' },
    { pattern: /ECONNREFUSED|ECONNRESET|ETIMEDOUT/i, label: 'Network', color: 'text-orange-400' },
    { pattern: /OOM|out of memory|heap/i, label: 'Memory', color: 'text-red-400' },
    { pattern: /permission denied|EACCES/i, label: 'Permission', color: 'text-amber-400' },
    { pattern: /warning/i, label: 'Warning', color: 'text-amber-400' },
    { pattern: /deprecated/i, label: 'Deprecated', color: 'text-purple-400' },
  ];

  // Sample suspicious log lines for demo
  const sampleLogs = [
    { source: 'Run unit tests', line: 'FAIL src/auth.test.js', type: 'error' },
    { source: 'Run unit tests', line: '  Expected: true', type: 'detail' },
    { source: 'Run unit tests', line: '  Received: false', type: 'detail' },
    { source: 'Build Docker image', line: 'WARNING: cache miss for layer sha256:abc123', type: 'warning' },
    { source: 'Deploy to production', line: 'Error: Readiness probe failed after 30s', type: 'error' },
    { source: 'Install dependencies', line: 'npm WARN deprecated uuid@3.4.0', type: 'warning' },
    { source: 'Run e2e tests', line: 'ETIMEDOUT: connect to database timeout after 5000ms', type: 'error' },
    { source: 'Health check', line: 'Error: Service unhealthy - 503 returned', type: 'error' },
  ];

  const filteredLogs = search
    ? sampleLogs.filter(l => l.line.toLowerCase().includes(search.toLowerCase()) || l.source.toLowerCase().includes(search.toLowerCase()))
    : sampleLogs;

  return (
    <div className="glass p-6">
      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
        <Search size={18} className="text-cyan-400" />
        Log Debugger — Suspicious Line Finder
      </h3>

      {/* Search bar */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search logs... (error, timeout, fail, OOM...)"
          className="w-full bg-slate-900/50 border border-indigo-500/20 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
        />
      </div>

      {/* Pattern quick filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {suspiciousPatterns.slice(0, 6).map((p) => (
          <button
            key={p.label}
            onClick={() => setSearch(p.label.toLowerCase())}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              search.toLowerCase() === p.label.toLowerCase()
                ? 'bg-indigo-500 text-white'
                : 'bg-slate-800/50 text-slate-400 hover:text-white'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Log output */}
      <div className="terminal rounded-xl border border-indigo-500/20 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2 bg-[#0d0d20] border-b border-indigo-500/10">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-xs text-slate-500 ml-2">Suspicious Lines ({filteredLogs.length} found)</span>
        </div>
        <div className="p-4 max-h-[400px] overflow-y-auto">
          {filteredLogs.map((log, i) => (
            <div key={i} className="flex mb-1">
              <span className="text-slate-600 select-none w-8 shrink-0 text-right mr-4 text-xs">{i + 1}</span>
              <span className="text-cyan-500 text-xs mr-3 shrink-0 w-36 truncate">[{log.source}]</span>
              <span className={`text-xs ${
                log.type === 'error' ? 'text-red-400 font-medium' :
                log.type === 'warning' ? 'text-amber-400' :
                'text-slate-400'
              }`}>
                {search ? highlightSearch(log.line, search) : log.line}
              </span>
            </div>
          ))}
          {filteredLogs.length === 0 && (
            <p className="text-slate-500 text-xs text-center py-4">No matching log lines found</p>
          )}
        </div>
      </div>
    </div>
  );
}

function highlightSearch(text, query) {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <span key={i} className="bg-amber-500/30 text-amber-300 px-0.5 rounded">{part}</span>
      : part
  );
}
