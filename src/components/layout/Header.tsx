import React from 'react';
import { ActiveTab } from '../../types';
import { Menu, Moon, Sun } from 'lucide-react';

interface HeaderProps {
  activeTab: ActiveTab;
  theme: 'dark' | 'light';
  onThemeChange: (theme: 'dark' | 'light') => void;
  onToggleMobileNav: () => void;
}

const TAB_TITLES: Record<ActiveTab, string> = {
  dashboard: 'Dashboard',
  analyze: 'Analyze resume',
  results: 'Your results',
  skills: 'Skill gaps',
  'ats-checker': 'ATS check',
  security: 'Resume security',
  dictionary: 'Skills list',
  history: 'Analysis history',
  progress: 'Progress',
  'backend-guide': 'How it works',
  about: 'About',
  settings: 'Settings',
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  theme,
  onThemeChange,
  onToggleMobileNav,
}) => {
  const title = TAB_TITLES[activeTab] || 'AI ResumeMatch';
  const isDark = theme === 'dark';

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-obsidian/95">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            onClick={onToggleMobileNav}
            aria-label="Open navigation menu"
            className="rounded-lg border border-white/[0.08] p-2 text-silver transition-colors hover:text-porcelain lg:hidden"
          >
            <Menu className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="hidden text-sm text-silver sm:inline">AI ResumeMatch</span>
          <span aria-hidden="true" className="hidden text-silver/40 sm:inline">
            /
          </span>
          <h1 className="truncate font-heading text-sm font-semibold text-porcelain">{title}</h1>
        </div>

        <button
          type="button"
          onClick={() => onThemeChange(isDark ? 'light' : 'dark')}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] text-silver transition-colors hover:text-porcelain"
        >
          {isDark ? (
            <Sun className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Moon className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </header>
  );
};
