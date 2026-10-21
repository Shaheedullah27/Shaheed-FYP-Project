import React, { useCallback } from 'react';
import { cn } from '../../lib/ui';

interface GlowPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Adds the cursor-responsive radial light. */
  glow?: boolean;
  /** Uses the luminous cyan→violet gradient border (reserved for hero surfaces). */
  edge?: boolean;
  children: React.ReactNode;
}

/**
 * The core surface of the design system: a dark glass panel with a thin
 * luminous edge, soft elevation, and an optional cursor-following light.
 */
export const GlowPanel: React.FC<GlowPanelProps> = ({
  glow = false,
  edge = false,
  className,
  children,
  onPointerMove,
  ...rest
}) => {
  const handleMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`);
      e.currentTarget.style.setProperty('--my', `${e.clientY - rect.top}px`);
      onPointerMove?.(e);
    },
    [onPointerMove]
  );

  return (
    <div
      onPointerMove={glow ? handleMove : onPointerMove}
      className={cn('panel', glow && 'glow-follow', edge && 'edge-light', className)}
      {...rest}
    >
      {children}
    </div>
  );
};
