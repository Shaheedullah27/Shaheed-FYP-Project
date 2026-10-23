import React from 'react';
import { LucideIcon, FileSearch } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = FileSearch,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center panel bg-slate-surface border border-white/[0.08] rounded-xl">
      <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-mint/10 border border-mint/25 text-mint mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-heading font-semibold text-porcelain mb-1.5">{title}</h3>
      <p className="text-xs text-silver max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="btn-primary px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
