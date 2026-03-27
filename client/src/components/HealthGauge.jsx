import { motion } from 'framer-motion';

export default function HealthGauge({ score }) {
  const color = score >= 80 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171';
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="140" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="45" fill="none" stroke="rgba(99,102,241,0.1)" strokeWidth="8" />
        <motion.circle
          cx="60" cy="60" r="45" fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          transform="rotate(-90 60 60)"
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
        <text x="60" y="55" textAnchor="middle" fill="white" fontSize="28" fontWeight="bold">
          {score}
        </text>
        <text x="60" y="75" textAnchor="middle" fill="#94a3b8" fontSize="11">
          Health Score
        </text>
      </svg>
    </div>
  );
}
