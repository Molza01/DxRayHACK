import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

function formatDateLabel(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[1]}/${parts[2]}`;
  }
  return dateStr;
}

function formatTooltipDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(15,15,40,0.95)',
      border: '1px solid rgba(99,102,241,0.3)',
      borderRadius: 12,
      padding: '8px 12px',
      color: '#e2e8f0',
      fontSize: 13,
    }}>
      <p style={{ marginBottom: 4, fontWeight: 600 }}>{formatTooltipDate(label)}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === 'number' ? Math.round(entry.value * 10) / 10 : entry.value}
        </p>
      ))}
    </div>
  );
}

export default function TrendChart({ data, title, dataKey = 'avgDuration', color = '#818cf8' }) {
  // Filter to only show data points that have actual builds (for sparse data)
  const hasData = data?.some(d => d.totalBuilds > 0);

  // Calculate tick interval based on data length
  const tickInterval = data?.length > 30 ? Math.floor(data.length / 10) : data?.length > 15 ? 2 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-6"
    >
      <h3 className="text-white font-semibold mb-4">{title}</h3>
      {!hasData ? (
        <div className="h-[280px] flex items-center justify-center text-slate-500 text-sm">
          No build data available for this period
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#64748b', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatDateLabel}
              interval={tickInterval}
              angle={-35}
              textAnchor="end"
              height={50}
            />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              fill={`url(#grad-${dataKey})`}
              dot={false}
              activeDot={{ r: 5, fill: color, stroke: '#fff', strokeWidth: 2 }}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  );
}
