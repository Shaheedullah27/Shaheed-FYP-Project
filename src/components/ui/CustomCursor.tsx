import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'motion/react';

/**
 * Editorial Desktop Custom Cursor
 * - Small precision center dot + subtle outer tracking ring
 * - Automatically disabled on touch screens, coarse pointers, and prefers-reduced-motion
 * - Non-obstructive: pointer-events-none, never blocks clicks, selection, or forms
 */
export const CustomCursor: React.FC = () => {
  const reducedMotion = useReducedMotion();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  // Smooth spring physics for outer ring
  const springX = useSpring(mouseX, { stiffness: 450, damping: 28, mass: 0.5 });
  const springY = useSpring(mouseY, { stiffness: 450, damping: 28, mass: 0.5 });

  useEffect(() => {
    // Only enable on desktop with fine mouse/trackpad pointer and hover capability
    const checkSupport = () => {
      if (typeof window === 'undefined') return false;
      const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
      const canHover = window.matchMedia('(hover: hover)').matches;
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      return hasFinePointer && canHover && !isTouch && !reducedMotion;
    };

    if (!checkSupport()) {
      setIsEnabled(false);
      return;
    }

    setIsEnabled(true);

    const handlePointerMove = (e: PointerEvent) => {
      // If pointer is not a mouse (e.g. touch/pen), ignore
      if (e.pointerType && e.pointerType !== 'mouse') {
        setIsVisible(false);
        return;
      }

      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      setIsVisible(true);

      const target = e.target as HTMLElement | null;
      if (target) {
        const interactive = target.closest('button, a, input, textarea, select, [role="button"], [tabindex]:not([tabindex="-1"])');
        setIsHovering(!!interactive);
      }
    };

    const handlePointerLeave = () => {
      setIsVisible(false);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('mouseleave', handlePointerLeave);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('mouseleave', handlePointerLeave);
    };
  }, [reducedMotion, mouseX, mouseY]);

  if (!isEnabled || !isVisible) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden select-none">
      {/* Outer spring tracking ring */}
      <motion.div
        style={{
          x: springX,
          y: springY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{
          scale: isHovering ? 1.45 : 1,
          borderColor: isHovering ? 'rgba(101, 221, 181, 0.75)' : 'rgba(101, 221, 181, 0.35)',
        }}
        transition={{ duration: 0.14 }}
        className="w-7 h-7 rounded-full border border-[var(--color-mint)]/40 pointer-events-none"
      />

      {/* Immediate center point */}
      <motion.div
        style={{
          x: mouseX,
          y: mouseY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{
          scale: isHovering ? 0.7 : 1,
        }}
        transition={{ duration: 0.1 }}
        className="w-1.5 h-1.5 rounded-full bg-[var(--color-mint)] pointer-events-none shadow-[0_0_8px_rgba(101,221,181,0.9)]"
      />
    </div>
  );
};
