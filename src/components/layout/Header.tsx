import React from 'react';
import { ActiveTab } from '../../types';
import { Terminal, CheckCircle2, Sparkles, Menu, Moon, Sun } from 'lucide-react';

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  theme: 'dark' | 'light';
  onThemeChange: (theme: 'dark' | 'light') => void;
  engineMode: 'browser' | 'flask';
  onToggleEngineMode: (mode: 'browser' | 'flask') => void;
  hasActiveAnalysis: boolean;
  onNewAnalysis: () => void;
  /** Opens the sidebar on small screens (the sidebar itself closes it). */
  onToggleMobileNav: () => void;
}

const TAB_TITLES: Record<ActiveTab, { title: string; breadcrumb: string }> = {
  'dashboard': { title: 'Home', breadcrumb: 'Home' },
  'analyze': { title: 'Compare a Resume', breadcrumb: 'Compare' },
  'results': { title: 'Comparison Results', breadcrumb: 'Results' },
  'skills': { title: 'Skill Gaps', breadcrumb: 'Skills' },
  'ats-checker': { title: 'ATS Check', breadcrumb: 'ATS Check' },
  'security': { title: 'Resume Security & Quarantine', breadcrumb: 'Security & Forensics' },
  'dictionary': { title: 'Skills List', breadcrumb: 'Skills List' },
  'history': { title: 'Past Comparisons', breadcrumb: 'History' },
  'backend-guide': { title: 'How the App Works', breadcrumb: 'How it works' },
  'about': { title: 'About This Project', breadcrumb: 'About' },
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  theme,
  onThemeChange,
  engineMode,
  onToggleEngineMode,
  hasActiveAnalysis,
  onNewAnalysis,
  onToggleMobileNav,
}) => {
  const current = TAB_TITLES[activeTab] || { title: 'Workspace', breadcrumb: 'AI ResumeMatch' };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-6 px-5 md:px-6 py-3 bg-[#070B14]/82 backdrop-blur-md border-b border-white/10">
      {/* Zone 1: Mobile menu + breadcrumb trail */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleMobileNav}
          aria-label="Open menu"
          className="lg:hidden shrink-0 p-2 -ml-1 rounded-lg text-mute hover:text-ink hover:bg-white/5 border border-white/10 transition-colors"
        >
          <Menu className="w-4.5 h-4.5" />
        </button>
        <div className="flex items-center gap-2.5 text-xs font-medium text-mute whitespace-nowrap">
          <span className="hidden sm:inline">AI ResumeMatch</span>
          <span aria-hidden="true" className="hidden sm:inline text-white/20">/</span>
          <span className="text-ink font-semibold flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="w-1.5 h-1.5 rounded-full bg-[#35E7FF] shadow-[0_0_8px_rgba(53,231,255,0.9)]"
            />
            {current.breadcrumb}
          </span>
        </div>
      </div>

      {/* Zone 2: Engine Selector & Quick Status */}
      <div className="hidden lg:flex items-center gap-4 text-xs font-medium">
        <div className="seg" role="group" aria-label="Analysis engine">
          <button
            onClick={() => onToggleEngineMode('browser')}
            data-active={engineMode === 'browser'}
            className="seg-btn"
            aria-pressed={engineMode === 'browser'}
          >
            In this browser
          </button>
          <button
            onClick={() => onToggleEngineMode('flask')}
            data-active={engineMode === 'flask'}
            className="seg-btn flex items-center gap-1.5"
            aria-pressed={engineMode === 'flask'}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Python backend</span>
          </button>
        </div>

        {hasActiveAnalysis && activeTab !== 'results' && (
          <button
            onClick={() => onTabChange('results')}
            className="flex items-center gap-1.5 text-[#7DEFFF] hover:text-[#35E7FF] transition-colors whitespace-nowrap shrink-0 font-semibold"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>View latest results</span>
          </button>
        )}
      </div>

      {/* Zone 3: Primary Action */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="seg" role="group" aria-label="Color theme">
          <button
            onClick={() => onThemeChange('dark')}
            data-active={theme === 'dark'}
            aria-pressed={theme === 'dark'}
            aria-label="Use dark theme"
            title="Dark theme"
            className="seg-btn flex items-center gap-1.5 px-2 sm:px-3"
          >
            <Moon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dark</span>
          </button>
          <button
            onClick={() => onThemeChange('light')}
            data-active={theme === 'light'}
            aria-pressed={theme === 'light'}
            aria-label="Use light theme"
            title="Light theme"
            className="seg-btn flex items-center gap-1.5 px-2 sm:px-3"
          >
            <Sun className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Light</span>
          </button>
        </div>
        <button
          onClick={onNewAnalysis}
          aria-label="Start a new comparison"
          title="New comparison"
          className="btn-primary px-2 sm:px-4 py-2 text-xs whitespace-nowrap shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5" strokeWidth={2.4} />
          <span className="hidden sm:inline">New comparison</span>
        </button>
      </div>
    </header>
  );
};
