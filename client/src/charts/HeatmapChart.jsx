import { motion } from 'framer-motion';
import { Tooltip as ReactTooltip } from 'recharts';
import { useState } from 'react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function getColor(value, max) {
  if (!value || value === 0) return 'rgba(30, 30, 60, 0.5)';
  const intensity = Math.min(value / Math.max(max, 1), 1);
  if (intensity < 0.25) return 'rgba(99, 102, 241, 0.2)';
  if (intensity < 0.5) return 'rgba(99, 102, 241, 0.4)';
  if (intensity < 0.75) return 'rgba(129, 140, 248, 0.6)';
  return 'rgba(165, 105, 252, 0.85)';
}

function getDurationColor(avgDuration, thresholds) {
  if (!avgDuration || avgDuration === 0) return 'rgba(30, 30, 60, 0.5)';
  if (avgDuration <= thresholds.good) return 'rgba(52, 211, 153, 0.6)';
  if (avgDuration <= thresholds.warn) return 'rgba(251, 191, 36, 0.6)';
  if (avgDuration <= thresholds.bad) return 'rgba(249, 115, 22, 0.7)';
  return 'rgba(239, 68, 68, 0.8)';
}

export default function HeatmapChart({ data, title = 'Build Time Heatmap' }) {
  const [mode, setMode] = useState('duration'); // 'duration' or 'count'
  const [hoveredCell, setHoveredCell] = useState(null);

  if (!data || data.length === 0) return null;

  // Build lookup map
  const cellMap = {};
  let maxCount = 0;
  let maxDuration = 0;

  for (const cell of data) {
    const key = `${cell.day}-${cell.hour}`;
    cellMap[key] = cell;
    if (cell.count > maxCount) maxCount = cell.count;
    if (cell.avgDuration > maxDuration) maxDuration = cell.avgDuration;
  }

  const thresholds = {
    good: maxDuration * 0.3 || 60,
    warn: maxDuration * 0.6 || 180,
    bad: maxDuration * 0.85 || 600,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">{title}</h3>
        <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1">
          <button
            onClick={() => setMode('duration')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              mode === 'duration' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Duration
          </button>
          <button
            onClick={() => setMode('count')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              mode === 'count' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Build Count
          </button>
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Hour labels */}
          <div className="flex ml-12 mb-1">
            {HOURS.map((h) => (
              <div key={h} className="flex-1 text-center text-[10px] text-slate-500">
                {h % 3 === 0 ? `${h}:00` : ''}
              </div>
            ))}
          </div>

          {/* Grid rows */}
          {DAYS.map((day, dayIdx) => (
            <div key={day} className="flex items-center mb-1">
              <div className="w-12 text-xs text-slate-400 text-right pr-2">{day}</div>
              <div className="flex flex-1 gap-[2px]">
                {HOURS.map((hour) => {
                  const key = `${dayIdx}-${hour}`;
                  const cell = cellMap[key];
                  const count = cell?.count || 0;
                  const avgDuration = cell?.avgDuration || 0;
                  const failures = cell?.failures || 0;
                  const isHovered = hoveredCell === key;

                  const bg = mode === 'duration'
                    ? getDurationColor(avgDuration, thresholds)
                    : getColor(count, maxCount);

                  return (
                    <div
                      key={hour}
                      className="flex-1 aspect-square rounded-sm cursor-pointer transition-all relative"
                      style={{
                        backgroundColor: bg,
                        transform: isHovered ? 'scale(1.3)' : 'scale(1)',
                        zIndex: isHovered ? 10 : 1,
                        outline: isHovered ? '2px solid rgba(129, 140, 248, 0.8)' : 'none',
                      }}
                      onMouseEnter={() => setHoveredCell(key)}
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      {isHovered && count > 0 && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg text-xs whitespace-nowrap z-50"
                          style={{ background: 'rgba(15,15,40,0.95)', border: '1px solid rgba(99,102,241,0.3)' }}
                        >
                          <div className="text-white font-medium">{day} {hour}:00</div>
                          <div className="text-slate-300">{count} build{count !== 1 ? 's' : ''}</div>
                          <div className="text-slate-300">Avg: {Math.round(avgDuration)}s</div>
                          {failures > 0 && <div className="text-red-400">{failures} failed</div>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-4">
        <span className="text-xs text-slate-500">
          {mode === 'duration' ? 'Build duration: ' : 'Build frequency: '}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-500">Low</span>
          {mode === 'duration' ? (
            <>
              <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: 'rgba(52, 211, 153, 0.6)' }} />
              <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: 'rgba(251, 191, 36, 0.6)' }} />
              <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: 'rgba(249, 115, 22, 0.7)' }} />
              <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.8)' }} />
            </>
          ) : (
            <>
              <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: 'rgba(99, 102, 241, 0.2)' }} />
              <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: 'rgba(99, 102, 241, 0.4)' }} />
              <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: 'rgba(129, 140, 248, 0.6)' }} />
              <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: 'rgba(165, 105, 252, 0.85)' }} />
            </>
          )}
          <span className="text-[10px] text-slate-500">High</span>
        </div>
      </div>
    </motion.div>
  );
}
