import React from 'react';
import { cn } from '../../lib/ui';

export type BadgeVariant = 'mint' | 'cyan' | 'violet' | 'amber' | 'coral' | 'neutral';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  mono?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  mint: 'tag-mint',
  cyan: 'tag-cyan',
  violet: 'tag-violet',
  amber: 'tag-warn',
  coral: 'tag-bad',
  neutral: 'tag-mute',
};

const dotColors: Record<BadgeVariant, string> = {
  mint: 'bg-mint',
  cyan: 'bg-ion',
  violet: 'bg-plasma',
  amber: 'bg-amber-warn',
  coral: 'bg-coral-error',
  neutral: 'bg-silver',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'md',
  dot = false,
  mono = false,
  className,
  children,
  ...props
}) => {
  return (
    <span
      className={cn(
        'tag',
        variantStyles[variant],
        size === 'sm' && 'text-[10px] px-2 py-0.5',
        mono && 'font-mono tracking-tight',
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])}
          aria-hidden="true"
        />
      )}
      <span>{children}</span>
    </span>
  );
};
