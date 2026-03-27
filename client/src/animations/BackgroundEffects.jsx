import { motion } from 'framer-motion';

export default function BackgroundEffects() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Animated gradient orbs */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)' }}
        animate={{ x: [0, 100, -50, 0], y: [0, -80, 60, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        initial={{ top: '-10%', left: '-10%' }}
      />
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full opacity-15"
        style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)' }}
        animate={{ x: [0, -80, 60, 0], y: [0, 100, -40, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        initial={{ bottom: '-10%', right: '-10%' }}
      />

      {/* Grid overlay */}
      <div className="absolute inset-0 grid-bg opacity-60" />

      {/* Scan line */}
      <motion.div
        className="absolute left-0 right-0 h-[2px]"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.4), transparent)' }}
        animate={{ top: ['0%', '100%'] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}
