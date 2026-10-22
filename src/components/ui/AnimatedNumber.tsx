import React, { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';

interface AnimatedNumberProps {
  /** Real application value — this component only eases INTO it. */
  value: number;
  suffix?: string;
  className?: string;
}

/**
 * Counts up to the given value once when it first mounts.
 * Respects prefers-reduced-motion (jumps straight to the value).
 */
export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  suffix = '',
  className,
}) => {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(reduced ? value : 0);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const duration = 900;
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduced]);

  return (
    <span className={className}>
      {display}
      {suffix}
    </span>
  );
};
