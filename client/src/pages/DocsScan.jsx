import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, RefreshCw, AlertTriangle, CheckCircle, XCircle, Clock,
  Search, GitCommit, Code, ArrowRight, Link as LinkIcon
} from 'lucide-react';
import PageTransition from '../animations/PageTransition';
import HealthGauge from '../components/HealthGauge';
import { fetchDocsHealth, fetchDocsIssues, fetchDocsChangelog, syncDocsScan, fetchDocFix, fetchDocFixAll } from '../services/api';

const STATUS_COLORS = {
  fresh: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', label: 'Fresh' },
  stale: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', label: 'Stale' },
  outdated: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', label: 'Outdated' },
};

const SEVERITY_COLORS = {
  critical: 'bg-red-500/20 text-red-400',
  high: 'bg-orange-500/20 text-orange-400',
  medium: 'bg-amber-500/20 text-amber-400',
  low: 'bg-blue-500/20 text-blue-400',
};

const COMMIT_COLORS = {
  feature: 'bg-emerald-500/20 text-emerald-400',
  fix: 'bg-red-500/20 text-red-400',
  docs: 'bg-blue-500/20 text-blue-400',
  refactor: 'bg-purple-500/20 text-purple-400',
  test: 'bg-cyan-500/20 text-cyan-400',
  ci: 'bg-indigo-500/20 text-indigo-400',
  breaking: 'bg-red-500/30 text-red-300',
  other: 'bg-slate-500/20 text-slate-400',
};

export default function DocsScan() {
  const [health, setHealth] = useState(null);
  const [issues, setIssues] = useState(null);
  const [changelog, setChangelog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [lastSynced, setLastSynced] = useState(null); // { owner, repo }
  const [syncMessage, setSyncMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('issues');
  const [selectedRepo, setSelectedRepo] = useState('');
  const [fixes, setFixes] = useState({});       // issueId -> fix data
  const [fixLoading, setFixLoading] = useState({}); // issueId -> boolean
  const [fixAllLoading, setFixAllLoading] = useState(false);
  const [expandedFix, setExpandedFix] = useState(null); // issueId of expanded fix

  const load = async (repo) => {
    setLoading(true);
    try {
      const repoFilter = repo !== undefined ? repo : selectedRepo;
      const [h, i] = await Promise.all([
        fetchDocsHealth(repoFilter || undefined),
        fetchDocsIssues(repoFilter || undefined),
      ]);
      setHealth(h);
      setIssues(i);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSync = async () => {
    if (!repoUrl.trim()) return;
    setSyncing(true);
    setSyncMessage(null);
    setChangelog(null);
    try {
      const result = await syncDocsScan(repoUrl.trim());
      setSyncMessage({ type: 'success', text: result.message });
      // Store owner/repo from response for changelog
      if (result.owner && result.repo) {
        setLastSynced({ owner: result.owner, repo: result.repo });
      }
      await load();
      // Auto-load changelog
      if (result.owner && result.repo) {
        try {
          const cl = await fetchDocsChangelog(result.owner, result.repo);
          setChangelog(cl);
        } catch {}
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      setSyncMessage({ type: 'error', text: msg });
    }
    setSyncing(false);
  };

  const handleRepoChange = (repo) => {
    setSelectedRepo(repo);
    load(repo);
  };

  const loadChangelog = async () => {
    let owner, repo;
    if (lastSynced) {
      owner = lastSynced.owner;
      repo = lastSynced.repo;
    } else if (selectedRepo) {
      const parts = selectedRepo.split('/');
      if (parts.length === 2) { owner = parts[0]; repo = parts[1]; }
    }
    if (owner && repo) {
      try {
        const cl = await fetchDocsChangelog(owner, repo);
        setChangelog(cl);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleGetFix = async (issueId) => {
    setFixLoading(prev => ({ ...prev, [issueId]: true }));
    try {
      const fix = await fetchDocFix(issueId);
      setFixes(prev => ({ ...prev, [issueId]: fix }));
      setExpandedFix(issueId);
    } catch (err) {
      console.error('Fix generation failed:', err);
    }
    setFixLoading(prev => ({ ...prev, [issueId]: false }));
  };

  const handleFixAll = async () => {
    if (!repoUrl.trim()) return;
    setFixAllLoading(true);
    try {
      const result = await fetchDocFixAll(repoUrl.trim());
      const fixMap = {};
      (result.fixes || []).forEach(f => { if (f.issueId) fixMap[f.issueId] = f; });
      setFixes(prev => ({ ...prev, ...fixMap }));
      setSyncMessage({ type: 'success', text: result.message });
    } catch (err) {
      console.error('Fix all failed:', err);
    }
    setFixAllLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
          <RefreshCw size={32} className="text-cyan-400" />
        </motion.div>
      </div>
    );
  }

  // Show results if we have docs OR issues (a repo with no docs still has "Missing README" issues)
  const hasData = (health && health.totalDocs > 0) || (issues && issues.total > 0);

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto px-6 pt-24 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white neon-text">Docs Scanner</h1>
            <p className="text-slate-400 mt-1">Scan any GitHub repository for documentation health</p>
          </div>
        </div>

        {/* Single URL Input */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass p-5 mb-6">
          <label className="text-xs text-slate-400 mb-2 block">GitHub Repository URL</label>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <LinkIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSync()}
                placeholder="https://github.com/owner/repo  or  owner/repo"
                className="w-full bg-slate-900/50 border border-cyan-500/20 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <button
              onClick={handleSync}
              disabled={syncing || !repoUrl.trim()}
              className="px-6 py-2.5 rounded-lg bg-cyan-500 text-white text-sm font-medium hover:bg-cyan-600 transition-all disabled:opacity-50 shrink-0 flex items-center gap-2"
            >
              {syncing ? (
                <><RefreshCw size={14} className="animate-spin" /> Scanning...</>
              ) : (
                <><Search size={14} /> Scan Repository</>
              )}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Scans all files in the repository — detects stale markdown, missing docs, code-to-docs drift, and generates API changelog.
          </p>
        </motion.div>

        {/* Sync message */}
        {syncMessage && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-xl border flex items-start gap-3 ${
              syncMessage.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}>
            {syncMessage.type === 'error' ? <XCircle size={20} className="shrink-0 mt-0.5" /> : <CheckCircle size={20} className="shrink-0 mt-0.5" />}
            <div className="flex-1">
              <p className="text-sm font-medium">{syncMessage.type === 'error' ? 'Scan Failed' : 'Scan Complete'}</p>
              <p className="text-xs mt-1 opacity-80">{syncMessage.text}</p>
            </div>
            <button onClick={() => setSyncMessage(null)} className="text-xs opacity-50 hover:opacity-100">dismiss</button>
          </motion.div>
        )}

        {/* Repo filter */}
        {health?.availableRepos?.length > 0 && (
          <div className="flex items-center gap-3 mb-6">
            <span className="text-xs text-slate-400">Filter by repo:</span>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => handleRepoChange('')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${!selectedRepo ? 'bg-cyan-500 text-white' : 'bg-slate-800/50 text-slate-400 hover:text-white'}`}>
                All
              </button>
              {health.availableRepos.map(r => (
                <button key={r} onClick={() => handleRepoChange(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedRepo === r ? 'bg-cyan-500 text-white' : 'bg-slate-800/50 text-slate-400 hover:text-white'}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        {!hasData ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass p-16 text-center">
            <FileText size={48} className="text-cyan-400 mx-auto mb-4 opacity-50" />
            <h2 className="text-xl text-white mb-2">No docs scanned yet</h2>
            <p className="text-slate-400 mb-4">Paste a GitHub repository URL above and click "Scan Repository" to analyze documentation health.</p>
          </motion.div>
        ) : (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass p-4 text-center">
                <FileText size={20} className="text-cyan-400 mx-auto mb-1" />
                <div className="text-xl font-bold text-white">{health.totalDocs}</div>
                <div className="text-xs text-slate-400">Total Docs</div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass p-4 text-center">
                <CheckCircle size={20} className="text-emerald-400 mx-auto mb-1" />
                <div className="text-xl font-bold text-emerald-400">{health.freshDocs}</div>
                <div className="text-xs text-slate-400">Fresh</div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass p-4 text-center">
                <AlertTriangle size={20} className="text-red-400 mx-auto mb-1" />
                <div className="text-xl font-bold text-red-400">{issues?.total || 0}</div>
                <div className="text-xs text-slate-400">Issues Found</div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass p-4 text-center">
                <Code size={20} className="text-purple-400 mx-auto mb-1" />
                <div className="text-xl font-bold text-purple-400">{issues?.mismatch || 0}</div>
                <div className="text-xs text-slate-400">Code-Doc Drift</div>
              </motion.div>
              <div className="flex justify-center items-center">
                <HealthGauge score={health.healthScore} />
              </div>
            </div>

            {/* Freshness bar */}
            {health.totalDocs > 0 && (
              <div className="glass p-5 mb-8">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-semibold text-sm">Documentation Freshness</h3>
                  <span className="text-sm font-bold text-cyan-400">{health.freshnessPercent}% fresh</span>
                </div>
                <div className="h-4 bg-slate-800 rounded-full overflow-hidden flex">
                  {health.freshDocs > 0 && (
                    <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(health.freshDocs / health.totalDocs) * 100}%` }} />
                  )}
                  {health.staleDocs > 0 && (
                    <div className="h-full bg-amber-500 transition-all" style={{ width: `${(health.staleDocs / health.totalDocs) * 100}%` }} />
                  )}
                  {health.outdatedDocs > 0 && (
                    <div className="h-full bg-red-500 transition-all" style={{ width: `${(health.outdatedDocs / health.totalDocs) * 100}%` }} />
                  )}
                </div>
                <div className="flex gap-4 mt-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Fresh ({health.freshDocs})</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Stale ({health.staleDocs})</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Outdated ({health.outdatedDocs})</span>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              {[
                { id: 'issues', label: `Issues (${issues?.total || 0})`, icon: AlertTriangle },
                { id: 'health', label: 'File Status', icon: FileText },
                { id: 'changelog', label: 'Changelog', icon: GitCommit },
              ].map((tab) => (
                <button key={tab.id}
                  onClick={() => { setActiveTab(tab.id); if (tab.id === 'changelog' && !changelog) loadChangelog(); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'bg-slate-800/50 text-slate-400 hover:text-white'
                  }`}>
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {/* Issues Tab (default) */}
              {activeTab === 'issues' && (
                <motion.div key="issues" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {/* Issue summary + Fix All button */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="grid grid-cols-4 gap-4 flex-1 mr-4">
                      <div className="glass p-4 text-center">
                        <div className="text-xl font-bold text-red-400">{issues?.critical || 0}</div>
                        <div className="text-xs text-slate-400">Critical</div>
                      </div>
                      <div className="glass p-4 text-center">
                        <div className="text-xl font-bold text-orange-400">{issues?.missing || 0}</div>
                        <div className="text-xs text-slate-400">Missing Docs</div>
                      </div>
                      <div className="glass p-4 text-center">
                        <div className="text-xl font-bold text-amber-400">{issues?.stale || 0}</div>
                        <div className="text-xs text-slate-400">Stale / Outdated</div>
                      </div>
                      <div className="glass p-4 text-center">
                        <div className="text-xl font-bold text-purple-400">{issues?.mismatch || 0}</div>
                        <div className="text-xs text-slate-400">Code-Doc Mismatch</div>
                      </div>
                    </div>
                    {issues?.total > 0 && repoUrl && (
                      <button
                        onClick={handleFixAll}
                        disabled={fixAllLoading}
                        className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-emerald-500/20 transition-all disabled:opacity-50 shrink-0 flex items-center gap-2"
                      >
                        {fixAllLoading ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                        {fixAllLoading ? 'Generating Fixes...' : 'Generate All Fixes'}
                      </button>
                    )}
                  </div>

                  {/* Issue list with fix buttons */}
                  <div className="space-y-3">
                    {(issues?.issues || []).map((issue, i) => {
                      const fix = fixes[issue._id];
                      const isLoadingFix = fixLoading[issue._id];
                      const isExpanded = expandedFix === issue._id;

                      return (
                        <motion.div key={issue._id || i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.5) }}
                          className="glass p-5">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg shrink-0 ${
                              issue.type === 'missing' ? 'bg-red-500/10' : issue.type === 'mismatch' ? 'bg-purple-500/10' : 'bg-amber-500/10'
                            }`}>
                              {issue.type === 'missing' ? <XCircle size={18} className="text-red-400" /> :
                               issue.type === 'mismatch' ? <Code size={18} className="text-purple-400" /> :
                               <Clock size={18} className="text-amber-400" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <div className="flex items-center gap-2 min-w-0">
                                  <h4 className="text-white font-medium text-sm truncate">{issue.title}</h4>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 ${SEVERITY_COLORS[issue.severity]}`}>
                                    {issue.severity}
                                  </span>
                                </div>
                                {/* Get Fix / View Fix button */}
                                <button
                                  onClick={() => fix ? setExpandedFix(isExpanded ? null : issue._id) : handleGetFix(issue._id)}
                                  disabled={isLoadingFix}
                                  className={`px-3 py-1 rounded-lg text-xs font-medium shrink-0 flex items-center gap-1.5 transition-all ${
                                    fix ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                                       : 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20'
                                  } disabled:opacity-50`}
                                >
                                  {isLoadingFix ? <RefreshCw size={12} className="animate-spin" /> :
                                   fix ? <CheckCircle size={12} /> : <ArrowRight size={12} />}
                                  {isLoadingFix ? 'Generating...' : fix ? (isExpanded ? 'Hide Fix' : 'View Fix') : 'Get Fix'}
                                </button>
                              </div>
                              <p className="text-xs text-slate-400 mb-2">{issue.description}</p>
                              {issue.file && (
                                <span className="text-xs text-slate-500 bg-slate-800/50 px-2 py-1 rounded inline-block mb-2 font-mono">
                                  {issue.file}
                                </span>
                              )}
                              {issue.relatedCode && (
                                <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-1 rounded inline-block mb-2 ml-1 font-mono">
                                  {issue.relatedCode}
                                </span>
                              )}

                              {/* Fix suggestion (expanded) */}
                              <AnimatePresence>
                                {fix && isExpanded && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-3 border-t border-emerald-500/20 pt-3"
                                  >
                                    <div className="flex items-center gap-2 mb-2">
                                      <CheckCircle size={14} className="text-emerald-400" />
                                      <span className="text-xs font-semibold text-emerald-400">FIX: {fix.summary}</span>
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">{fix.source}</span>
                                    </div>

                                    {fix.reasoning && (
                                      <p className="text-xs text-slate-400 mb-3 italic">{fix.reasoning}</p>
                                    )}

                                    {/* Show specific changes */}
                                    {fix.changes && fix.changes.length > 0 && (
                                      <div className="space-y-2 mb-3">
                                        {fix.changes.map((change, ci) => (
                                          <div key={ci} className="bg-slate-900/70 rounded-lg p-3 border border-slate-800/50">
                                            <div className="flex items-center gap-2 mb-1.5">
                                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                                change.action === 'replace' ? 'bg-amber-500/20 text-amber-400' :
                                                change.action === 'add' ? 'bg-emerald-500/20 text-emerald-400' :
                                                'bg-red-500/20 text-red-400'
                                              }`}>{change.action}</span>
                                              <span className="text-xs text-slate-300">{change.description}</span>
                                            </div>
                                            {change.oldContent && (
                                              <div className="font-mono text-xs bg-red-500/5 border border-red-500/10 rounded p-2 mb-1.5">
                                                <span className="text-red-400">- </span>
                                                <span className="text-red-300">{change.oldContent}</span>
                                              </div>
                                            )}
                                            {change.newContent && (
                                              <div className="font-mono text-xs bg-emerald-500/5 border border-emerald-500/10 rounded p-2">
                                                <span className="text-emerald-400">+ </span>
                                                <span className="text-emerald-300 whitespace-pre-wrap">{change.newContent.slice(0, 500)}</span>
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* Full generated doc (for create actions) */}
                                    {fix.updatedDoc && (
                                      <div className="mt-2">
                                        <div className="flex items-center justify-between mb-1.5">
                                          <span className="text-xs text-emerald-400 font-semibold">Generated Documentation:</span>
                                          <button
                                            onClick={() => { navigator.clipboard.writeText(fix.updatedDoc); }}
                                            className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-white transition-colors"
                                          >
                                            Copy
                                          </button>
                                        </div>
                                        <div className="terminal rounded-lg border border-emerald-500/10 overflow-hidden">
                                          <div className="p-3 max-h-[300px] overflow-y-auto">
                                            <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono">{fix.updatedDoc}</pre>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                    {(!issues?.issues || issues.issues.length === 0) && (
                      <div className="glass p-10 text-center text-emerald-400 text-sm">No issues found — documentation looks healthy!</div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* File Status Tab */}
              {activeTab === 'health' && (
                <motion.div key="health" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {health.docs.length === 0 ? (
                    <div className="glass p-10 text-center text-slate-400 text-sm">No documentation files found in this repository.</div>
                  ) : (
                    <div className="space-y-2">
                      {health.docs.map((doc, i) => {
                        const sc = STATUS_COLORS[doc.status];
                        return (
                          <motion.div key={doc.path} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                            className="glass p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <FileText size={16} className={sc.text} />
                              <div className="min-w-0">
                                <div className="text-sm text-white truncate">{doc.path}</div>
                                <div className="text-xs text-slate-500">{doc.lastCommitAuthor} &bull; {doc.lastCommitMessage?.slice(0, 60)}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                              <div className="text-xs text-slate-400">{doc.staleDays}d ago</div>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.bg} ${sc.text} ${sc.border} border`}>
                                {sc.label}
                              </span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Changelog Tab */}
              {activeTab === 'changelog' && (
                <motion.div key="changelog" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {!changelog ? (
                    <div className="glass p-10 text-center">
                      <GitCommit size={32} className="text-slate-500 mx-auto mb-3" />
                      <p className="text-slate-400 text-sm mb-3">Scan a repository first to see the auto-generated changelog.</p>
                      {lastSynced && (
                        <button onClick={loadChangelog} className="px-4 py-2 rounded-lg bg-cyan-500 text-white text-sm">Load Changelog</button>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* API changes highlight */}
                      {changelog.apiChanges?.length > 0 && (
                        <div className="glass p-5 mb-6">
                          <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                            <Code size={16} className="text-cyan-400" />
                            API Changes Detected ({changelog.apiChanges.length})
                          </h3>
                          <div className="space-y-2">
                            {changelog.apiChanges.map((c, i) => (
                              <div key={i} className="flex items-center gap-3 text-xs bg-slate-900/50 rounded-lg p-3">
                                <span className={`px-2 py-0.5 rounded-full font-medium shrink-0 ${
                                  c.impact === 'breaking' ? 'bg-red-500/20 text-red-400' :
                                  c.impact === 'addition' ? 'bg-emerald-500/20 text-emerald-400' :
                                  c.impact === 'deprecation' ? 'bg-amber-500/20 text-amber-400' :
                                  'bg-blue-500/20 text-blue-400'
                                }`}>{c.impact}</span>
                                <span className="text-white flex-1 truncate">{c.message}</span>
                                <span className="text-slate-500 font-mono shrink-0">{c.sha}</span>
                                <span className="text-slate-500 shrink-0">{new Date(c.date).toLocaleDateString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Full changelog */}
                      <div className="glass p-5">
                        <h3 className="text-white font-semibold text-sm mb-3">
                          Recent Commits ({changelog.totalCommits})
                        </h3>
                        <div className="space-y-1 max-h-[500px] overflow-y-auto">
                          {(changelog.entries || []).map((entry, i) => (
                            <div key={i} className="flex items-center gap-3 text-xs p-2 hover:bg-slate-800/30 rounded-lg transition-colors">
                              <span className="text-slate-500 font-mono w-14 shrink-0">{entry.sha}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium w-16 text-center shrink-0 ${COMMIT_COLORS[entry.type]}`}>
                                {entry.type}
                              </span>
                              <span className="text-white flex-1 truncate">{entry.message}</span>
                              <span className="text-slate-500 shrink-0">{entry.author}</span>
                              <span className="text-slate-600 shrink-0 w-20 text-right">{new Date(entry.date).toLocaleDateString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </PageTransition>
  );
}
