import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

const COLORS = { success: '#34d399', failure: '#f87171', cancelled: '#fbbf24' };

export default function PieChartComponent({ success, failure, cancelled = 0 }) {
  const data = [
    { name: 'Success', value: success },
    { name: 'Failure', value: failure },
    ...(cancelled > 0 ? [{ name: 'Cancelled', value: cancelled }] : []),
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass p-6"
    >
      <h3 className="text-white font-semibold mb-4">Build Outcomes</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={4}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={COLORS[entry.name.toLowerCase()] || '#818cf8'} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: 'rgba(15,15,40,0.95)',
              border: '1px solid rgba(99,102,241,0.3)',
              borderRadius: 12,
              color: '#e2e8f0',
              fontSize: 13,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-4 mt-2">
        {data.map((entry) => (
          <div key={entry.name} className="flex items-center gap-1.5 text-xs text-slate-400">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[entry.name.toLowerCase()] }} />
            {entry.name}: {entry.value}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
