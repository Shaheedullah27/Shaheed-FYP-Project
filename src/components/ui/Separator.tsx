import React from 'react';
import { cn } from '../../lib/ui';

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  label?: string;
}

export const Separator: React.FC<SeparatorProps> = ({
  orientation = 'horizontal',
  label,
  className,
  ...props
}) => {
  if (orientation === 'vertical') {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        className={cn('w-[1px] bg-white/[0.08] self-stretch', className)}
        {...props}
      />
    );
  }

  if (label) {
    return (
      <div
        role="separator"
        className={cn('flex items-center gap-3 my-4 w-full', className)}
        {...props}
      >
        <div className="h-[1px] flex-1 bg-white/[0.08]" />
        <span className="text-[10px] font-mono uppercase tracking-widest text-silver/60">
          {label}
        </span>
        <div className="h-[1px] flex-1 bg-white/[0.08]" />
      </div>
    );
  }

  return (
    <div
      role="separator"
      className={cn('h-[1px] w-full bg-white/[0.08] my-4', className)}
      {...props}
    />
  );
};
