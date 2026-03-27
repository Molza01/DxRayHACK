import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Zap, TrendingUp, HeartPulse, RefreshCw, Shield } from 'lucide-react';
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
            <p className="text-slate-400 mt-1">AI-powered pipeline analysis and recommendations</p>
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
