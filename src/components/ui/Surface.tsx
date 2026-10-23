import React from 'react';
import { cn } from '../../lib/ui';

export type SurfaceTone = 'obsidian' | 'graphite' | 'slate';
export type SurfaceElevation = 'flat' | 'raised' | 'overlay';
export type SurfaceRadius = 'sm' | 'md' | 'lg' | 'xl';

export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: SurfaceTone;
  elevation?: SurfaceElevation;
  radius?: SurfaceRadius;
  border?: boolean;
}

const toneStyles: Record<SurfaceTone, string> = {
  obsidian: 'bg-[var(--color-obsidian)]',
  graphite: 'bg-[var(--color-graphite)]',
  slate: 'bg-[var(--color-slate-surface)]',
};

const elevationStyles: Record<SurfaceElevation, string> = {
  flat: 'shadow-none',
  raised: 'shadow-[0_4px_20px_-6px_rgba(4,14,12,0.5)]',
  overlay: 'shadow-[0_20px_48px_-12px_rgba(4,14,12,0.75)]',
};

const radiusStyles: Record<SurfaceRadius, string> = {
  sm: 'rounded-md',   // 6px
  md: 'rounded-[10px]', // 10px
  lg: 'rounded-xl',    // 12px
  xl: 'rounded-2xl',   // 16px
};

export const Surface: React.FC<SurfaceProps> = ({
  tone = 'slate',
  elevation = 'raised',
  radius = 'lg',
  border = true,
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        toneStyles[tone],
        elevationStyles[elevation],
        radiusStyles[radius],
        border && 'border border-white/[0.08]',
        'transition-colors duration-200',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
