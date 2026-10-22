import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn, scoreTone, toneFill } from '../../lib/ui';

interface ScoreRingProps {
  /** 0–100 */
  value: number;
  label: string;
  sublabel?: string;
  size?: number;
  strokeWidth?: number;
  /** Overrides the automatic tone (e.g. force cyan). */
  tone?: 'ion' | 'good' | 'warn' | 'bad';
  className?: string;
}

const RING_BG = 'var(--theme-ring-track)';

/**
 * Circular score visualization with an animated arc and a count-up value.
 * All values come from real analysis results — nothing is simulated.
 */
export const ScoreRing: React.FC<ScoreRingProps> = ({
  value,
  label,
  sublabel,
  size = 168,
  strokeWidth = 10,
  tone,
  className,
}) => {
  const reduced = useReducedMotion();
  const safeValue = Math.max(0, Math.min(100, Math.round(value)));
  const activeTone = tone ?? scoreTone(safeValue);
  const color =
    activeTone === 'good'
      ? '#79F2C0'
      : activeTone === 'warn'
      ? '#F4BD73'
      : activeTone === 'bad'
      ? '#FF777F'
      : '#62D9F5';

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const targetOffset = circumference - (safeValue / 100) * circumference;

  // Count-up for the centre number
  const [display, setDisplay] = useState(reduced ? safeValue : 0);
  const started = useRef(false);

  useEffect(() => {
    if (reduced) {
      setDisplay(safeValue);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const duration = 1100;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * safeValue));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    started.current = true;
    return () => cancelAnimationFrame(raf);
  }, [safeValue, reduced]);

  return (
    <div className={cn('flex flex-col items-center text-center', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
          <defs>
            <linearGradient id={`ring-grad-${activeTone}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor={activeTone === 'ion' ? '#A99BFF' : color} stopOpacity={0.75} />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={RING_BG}
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#ring-grad-${activeTone})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: reduced ? targetOffset : circumference }}
            animate={{ strokeDashoffset: targetOffset }}
            transition={{ duration: reduced ? 0 : 1.1, ease: [0.22, 1, 0.36, 1] }}
            style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-mono font-extrabold tabular-nums leading-none"
            style={{ fontSize: size * 0.24, color }}
          >
            {display}
            <span style={{ fontSize: size * 0.13 }}>%</span>
          </span>
        </div>
      </div>
      <div className="mt-3 text-xs font-semibold text-ink">{label}</div>
      {sublabel && <div className="mt-0.5 text-[11px] text-mute max-w-[15rem] leading-relaxed">{sublabel}</div>}
    </div>
  );
};
