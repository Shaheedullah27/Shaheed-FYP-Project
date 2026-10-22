import React from 'react';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'motion/react';
import { cn } from '../../lib/ui';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  /** Max tilt in degrees. Keep small — restraint reads premium. */
  maxTilt?: number;
}

/**
 * Card with restrained pointer-driven 3D perspective tilt.
 * Disabled entirely under prefers-reduced-motion.
 */
export const TiltCard: React.FC<TiltCardProps> = ({
  children,
  className,
  maxTilt = 6,
}) => {
  const reduced = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 260, damping: 22, mass: 0.4 });
  const sry = useSpring(ry, { stiffness: 260, damping: 22, mass: 0.4 });

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduced || e.pointerType === 'touch') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    ry.set(px * maxTilt * 2);
    rx.set(-py * maxTilt * 2);
  };

  const handleLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <div
      style={{ perspective: 900 }}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className={cn('h-full', className)}
    >
      <motion.div
        style={reduced ? undefined : { rotateX: srx, rotateY: sry, transformStyle: 'preserve-3d' }}
        className="h-full"
      >
        {children}
      </motion.div>
    </div>
  );
};
