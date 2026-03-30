import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, GitCommit, User, ChevronRight, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import PageTransition from '../animations/PageTransition';
import StatusBadge from '../components/StatusBadge';
import { fetchBuilds } from '../services/api';

export default function Builds() {
  const [builds, setBuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = { page, limit: 20 };
        if (filter !== 'all') params.status = filter;
        const data = await fetchBuilds(params);
        setBuilds(data.builds);
        setTotalPages(data.totalPages);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    load();
  }, [filter, page]);

  const filters = ['all', 'success', 'failure', 'cancelled'];

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto px-6 pt-8 pb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white neon-text">Build History</h1>
            <p className="text-slate-400 mt-1">Detailed view of all pipeline runs</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                filter === f
                  ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300'
                  : 'bg-slate-800/50 border border-slate-700/30 text-slate-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
              <RefreshCw size={28} className="text-indigo-400" />
            </motion.div>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {builds.map((build, i) => (
                <motion.div
                  key={build._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link
                    to={`/builds/${build._id}`}
                    className="glass glass-hover p-5 flex items-center gap-5 no-underline group block"
                  >
                    <StatusBadge status={build.status} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-semibold text-sm truncate">{build.workflowName}</h3>
                        <span className="text-xs text-slate-500">#{build.runId}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1"><GitCommit size={12} />{build.branch}</span>
                        <span className="flex items-center gap-1"><User size={12} />{build.triggeredBy}</span>
                        <span className="flex items-center gap-1"><Clock size={12} />{build.duration}s</span>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500">
                      {format(new Date(build.createdAt), 'MMM dd, HH:mm')}
                    </span>
                    <ChevronRight size={18} className="text-slate-600 group-hover:text-indigo-400 transition-colors" />
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                      page === p
                        ? 'bg-indigo-500 text-white'
                        : 'bg-slate-800/50 text-slate-400 hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </PageTransition>
  );
}
