import React from 'react';
import { 
  LayoutDashboard, 
  FileSearch, 
  CheckCircle2, 
  Target, 
  ShieldCheck, 
  ShieldAlert,
  History, 
  Terminal, 
  Sparkles,
  ChevronRight,
  BookOpen,
  GraduationCap,
  X
} from 'lucide-react';
import { ActiveTab } from '../../types';
import { cn } from '../../lib/ui';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  savedCount: number;
  isOpenMobile: boolean;
  onToggleMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  savedCount,
  isOpenMobile,
  onToggleMobile,
}) => {
  const navItems = [
    { id: 'dashboard' as ActiveTab, label: 'Home', icon: LayoutDashboard },
    { id: 'analyze' as ActiveTab, label: 'Compare a Resume', icon: FileSearch },
    { id: 'results' as ActiveTab, label: 'Results', icon: CheckCircle2 },
    { id: 'ats-checker' as ActiveTab, label: 'ATS Check', icon: ShieldCheck },
    { id: 'security' as ActiveTab, label: 'Resume Security', icon: ShieldAlert },
    { id: 'skills' as ActiveTab, label: 'Skill Gaps', icon: Target },
    { id: 'dictionary' as ActiveTab, label: 'Skills List', icon: BookOpen },
    { id: 'history' as ActiveTab, label: 'Past Comparisons', icon: History, count: savedCount },
    { id: 'backend-guide' as ActiveTab, label: 'How the App Works', icon: Terminal },
    { id: 'about' as ActiveTab, label: 'About This Project', icon: GraduationCap },
  ];

  const handleSelect = (tab: ActiveTab) => {
    onTabChange(tab);
    if (isOpenMobile) {
      onToggleMobile();
    }
  };

  return (
    <>
      {/* Mobile Menu Backdrop */}
      {isOpenMobile && (
        <div 
          onClick={onToggleMobile} 
          className="fixed inset-0 z-40 bg-[#0B0D12]/80 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={cn(
          'fixed top-0 bottom-0 left-0 z-50 flex flex-col w-64 lg:w-64',
          'bg-[#131720]/95 backdrop-blur-md border-r border-white/[0.08] text-silver transition-transform duration-300 ease-out',
          'lg:translate-x-0',
          isOpenMobile ? 'translate-x-0 shadow-[24px_0_60px_-30px_rgba(0,0,0,0.9)]' : '-translate-x-full'
        )}
      >
        {/* Brand Area */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-[10px] bg-[#79F2C0]/15 border border-[#79F2C0]/35 text-[#79F2C0] shadow-[0_4px_16px_-4px_rgba(121,242,192,0.35)]">
              <Sparkles className="w-4.5 h-4.5" strokeWidth={2.4} />
            </div>
            <div>
              <span className="font-heading text-sm font-bold tracking-tight text-porcelain block leading-tight">
                AI ResumeMatch
              </span>
              <span className="font-mono text-[9px] uppercase tracking-wider text-silver/80 block mt-0.5">
                Resume intelligence lab
              </span>
            </div>
          </div>
          <button 
            onClick={onToggleMobile} 
            className="p-1.5 rounded-lg text-silver hover:text-porcelain hover:bg-white/5 transition-colors lg:hidden"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Section */}
        <nav aria-label="Main navigation" className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          <div className="px-3 mb-2.5 font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-silver/60">
            Workspace
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'group relative w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-180',
                  isActive
                    ? 'bg-[#79F2C0]/10 text-[#79F2C0] border border-[#79F2C0]/25 shadow-[inset_0_1px_0_rgba(121,242,192,0.12)]'
                    : 'border border-transparent text-silver hover:bg-white/[0.04] hover:text-porcelain'
                )}
              >
                <span className="flex items-center gap-3 truncate">
                  <Icon
                    className={cn(
                      'w-4 h-4 shrink-0 transition-colors',
                      isActive ? 'text-[#79F2C0]' : 'text-silver group-hover:text-porcelain'
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.count !== undefined ? (
                  <span
                    className={cn(
                      'text-[10px] tabular-nums font-mono px-1.5 py-0.5 rounded-md border transition-colors',
                      isActive
                        ? 'bg-[#79F2C0]/15 border-[#79F2C0]/30 text-[#79F2C0]'
                        : 'bg-white/5 border-white/10 text-silver'
                    )}
                  >
                    {item.count}
                  </span>
                ) : (
                  isActive && <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                )}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-[#79F2C0] shadow-[0_0_8px_rgba(121,242,192,0.7)]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Explainability Badge Footer */}
        <div className="p-3.5 mx-3 mb-4 rounded-xl bg-[#1B2230] border border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[#79F2C0] opacity-60 animate-ping" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-[#79F2C0]" />
            </span>
            <span className="text-[11px] font-semibold text-porcelain">How matches are scored</span>
          </div>
          <p className="text-[11px] text-silver leading-relaxed">
            The app compares text and skills locally on this device. No external AI service required.
          </p>
        </div>

        {/* User / Meta Footer */}
        <div className="px-5 py-3 border-t border-white/[0.08] flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-silver/70">
          <span>Final-Year Project</span>
        </div>
      </aside>
    </>
  );
};
