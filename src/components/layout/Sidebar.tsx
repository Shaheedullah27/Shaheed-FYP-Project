import React, { useEffect, useRef } from 'react';
import {
  Home,
  FileSearch,
  CheckCircle2,
  Terminal,
  GraduationCap,
  Sparkles,
  X,
} from 'lucide-react';
import { ActiveTab } from '../../types';
import { cn } from '../../lib/ui';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  hasResults: boolean;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: ActiveTab;
  label: string;
  icon: typeof Home;
  showWhen?: boolean;
}

const PRIMARY: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'analyze', label: 'Analyze resume', icon: FileSearch },
  { id: 'results', label: 'Latest results', icon: CheckCircle2, showWhen: true },
];

const MORE: NavItem[] = [
  { id: 'how-it-works', label: 'How it works', icon: Terminal },
  { id: 'about', label: 'About', icon: GraduationCap },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  hasResults,
  isOpenMobile,
  onCloseMobile,
}) => {
  const asideRef = useRef<HTMLElement>(null);

  const handleSelect = (tab: ActiveTab) => {
    onTabChange(tab);
    if (isOpenMobile) onCloseMobile();
  };

  // Mobile drawer: lock scroll, move focus inside, trap Tab and close on Escape.
  useEffect(() => {
    if (!isOpenMobile) return;
    const node = asideRef.current;
    const getFocusable = () =>
      Array.from(
        node?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) || []
      ).filter(element => element.offsetParent !== null);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    getFocusable()[0]?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseMobile();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpenMobile, onCloseMobile]);

  const renderItem = (item: NavItem, compact = false) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    return (
      <li key={item.id}>
        <button
          type="button"
          onClick={() => handleSelect(item.id)}
          aria-current={isActive ? 'page' : undefined}
          className={cn(
            'flex w-full items-center justify-between gap-3 rounded-lg text-left transition-colors',
            compact ? 'px-3 py-2 text-[13px]' : 'px-3 py-2.5 text-sm',
            isActive
              ? 'bg-mint/10 font-semibold text-mint'
              : 'font-medium text-silver hover:bg-white/[0.05] hover:text-porcelain'
          )}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{item.label}</span>
          </span>
        </button>
      </li>
    );
  };

  return (
    <>
      {isOpenMobile && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 cursor-default bg-obsidian/80 lg:hidden"
        />
      )}

      <aside
        ref={asideRef}
        aria-label="Main navigation"
        role={isOpenMobile ? 'dialog' : undefined}
        aria-modal={isOpenMobile ? true : undefined}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/[0.08] bg-graphite transition-transform duration-200 ease-out',
          'lg:translate-x-0',
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-mint/30 bg-mint/10 text-mint">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <span className="block font-heading text-sm font-semibold leading-tight text-porcelain">
                AI ResumeMatch
              </span>
              <span className="block text-[11px] text-silver">Resume and job comparison</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="rounded-lg p-1.5 text-silver transition-colors hover:bg-white/5 hover:text-porcelain lg:hidden"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          <p className="px-3 pb-1.5 pt-2 text-xs font-semibold text-silver">Main</p>
          <ul className="space-y-0.5">
            {PRIMARY.filter(item => !item.showWhen || hasResults).map(item => renderItem(item))}
          </ul>

          <p className="px-3 pb-1.5 pt-6 text-xs font-semibold text-silver">Project</p>
          <ul className="space-y-0.5">{MORE.map(item => renderItem(item, true))}</ul>
        </nav>

        <div className="border-t border-white/[0.08] p-4">
          <p className="text-[11px] leading-relaxed text-silver/80">
            No account and no saved history. Documents are processed by the local Flask API for
            this analysis only.
          </p>
        </div>
      </aside>
    </>
  );
};
