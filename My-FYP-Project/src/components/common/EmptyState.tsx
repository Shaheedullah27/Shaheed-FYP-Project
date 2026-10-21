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
    <div className="flex flex-col items-center justify-center p-12 text-center panel">
      <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-white/8 text-mute mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-bold text-ink mb-1">{title}</h3>
      <p className="text-xs text-mute max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 text-xs font-semibold btn-primary text-ink rounded-lg transition-colors whitespace-nowrap "
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
