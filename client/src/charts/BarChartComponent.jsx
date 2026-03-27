import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';

const COLORS = ['#818cf8', '#a78bfa', '#c084fc', '#e879f9', '#f472b6', '#fb7185', '#f87171', '#fbbf24', '#34d399', '#60a5fa'];

export default function BarChartComponent({ data, title, dataKey = 'avgDuration', nameKey = 'stepName' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-6"
    >
      <h3 className="text-white font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" horizontal={false} />
          <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey={nameKey}
            width={140}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(15,15,40,0.95)',
              border: '1px solid rgba(99,102,241,0.3)',
              borderRadius: 12,
              color: '#e2e8f0',
              fontSize: 13,
            }}
          />
          <Bar dataKey={dataKey} radius={[0, 6, 6, 0]} barSize={18}>
            {(data || []).map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
