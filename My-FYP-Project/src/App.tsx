import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import confetti from 'canvas-confetti';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { OverviewView } from './components/dashboard/OverviewView';
import { AnalyzeView } from './components/analyze/AnalyzeView';
import { ResultsView } from './components/results/ResultsView';
import { SkillGapView } from './components/skills/SkillGapView';
import { AtsCompatibilityView } from './components/ats/AtsCompatibilityView';
import { DictionaryView } from './components/dictionary/DictionaryView';
import { HistoryView } from './components/history/HistoryView';
import { BackendGuideView } from './components/architecture/BackendGuideView';
import { AboutView } from './components/about/AboutView';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { GlowPanel } from './components/ui/GlowPanel';

import { ActiveTab, AnalysisResult, HistoryItem } from './types';
import { 
  getStoredHistory, 
  saveAnalysisToHistory, 
  deleteHistoryItem,
  getActiveAnalysis, 
  getAnalysisById 
} from './services/storage';
import { runAnalysis, getEngineMode, setEngineMode } from './services/api';
import { SAMPLE_RESUMES, SAMPLE_JOB_DESCRIPTIONS } from './data/sampleData';
import { analyzeResumeAndJob } from './services/nlpEngine';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const storedTheme = localStorage.getItem('resume-match-theme');
    return storedTheme === 'light' ? 'light' : 'dark';
  });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [engineMode, setEngineModeState] = useState<'browser' | 'flask'>('browser');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('resume-match-theme', theme);
  }, [theme]);

  // Initial load
  useEffect(() => {
    const storedHistory = getStoredHistory();
    setHistory(storedHistory);

    const mode = getEngineMode();
    setEngineModeState(mode);

    const existing = getActiveAnalysis();
    if (existing) {
      setActiveAnalysis(existing);
    } else {
      // Pre-seed an initial benchmark analysis so all views are populated immediately
      const initial = analyzeResumeAndJob(
        SAMPLE_RESUMES[0].text,
        SAMPLE_JOB_DESCRIPTIONS[0].text,
        SAMPLE_RESUMES[0].title,
        SAMPLE_JOB_DESCRIPTIONS[0].title
      );
      initial.id = 'hist-1';
      initial.timestamp = '2026-10-18 14:32';
      setActiveAnalysis(initial);
    }
  }, []);

  const handleToggleEngineMode = (mode: 'browser' | 'flask') => {
    setEngineModeState(mode);
    setEngineMode(mode);
  };

  const handleRunAnalysis = async (
    resumeText: string,
    jdText: string,
    resumeTitle: string,
    jobTitle: string
  ) => {
    setIsLoading(true);

    try {
      // Step-by-step loading experience
      await new Promise(resolve => setTimeout(resolve, 1400));
      const { result } = await runAnalysis(resumeText, jdText, resumeTitle, jobTitle);

      const savedItem = saveAnalysisToHistory(result);
      setHistory(prev => [savedItem, ...prev.filter(h => h.id !== savedItem.id)]);
      setActiveAnalysis(result);
      setIsLoading(false);
      setActiveTab('results');

      // Trigger celebratory confetti for strong matches
      if (result.overallScore >= 75) {
        confetti({
          particleCount: 65,
          spread: 70,
          origin: { y: 0.7 }
        });
      }
    } catch (err) {
      console.error('Analysis failed', err);
      setIsLoading(false);
    }
  };

  const handleSelectSampleAndAnalyze = (resumeId: string, jdId: string) => {
    const resume = SAMPLE_RESUMES.find(r => r.id === resumeId);
    const jd = SAMPLE_JOB_DESCRIPTIONS.find(j => j.id === jdId);

    if (resume && jd) {
      handleRunAnalysis(resume.text, jd.text, resume.title, jd.title);
    }
  };

  const handleViewAnalysis = (id: string) => {
    const record = getAnalysisById(id);
    if (record) {
      setActiveAnalysis(record);
      setActiveTab('results');
    }
  };

  const handleDeleteHistoryItem = (id: string) => {
    const updated = deleteHistoryItem(id);
    setHistory(updated);
    if (activeAnalysis && activeAnalysis.id === id) {
      if (updated.length > 0) {
        const next = getAnalysisById(updated[0].id);
        setActiveAnalysis(next);
      } else {
        setActiveAnalysis(null);
      }
    }
  };

  const pageTransition = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -10 },
      };

  return (
    <div data-theme={theme} className="relative min-h-screen flex flex-col lg:flex-row bg-abyss text-ink font-sans antialiased">
      {/* Layered ambient environment: radial light fields + technical grid */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 grid-lines opacity-70" />
        <div
          className="absolute -top-48 -left-40 h-[36rem] w-[36rem] rounded-full blur-[130px]"
          style={{ background: 'radial-gradient(circle, rgba(53,231,255,0.13), transparent 65%)' }}
        />
        <div
          className="absolute -bottom-56 -right-40 h-[42rem] w-[42rem] rounded-full blur-[140px]"
          style={{ background: 'radial-gradient(circle, rgba(139,92,255,0.16), transparent 65%)' }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 120% 60% at 50% -10%, rgba(53,231,255,0.06), transparent 55%)',
          }}
        />
      </div>

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        savedCount={history.length}
        isOpenMobile={isMobileNavOpen}
        onToggleMobile={() => setIsMobileNavOpen(!isMobileNavOpen)}
      />

      {/* Main Content Viewport */}
      <div className="relative z-10 flex-1 lg:pl-64 flex flex-col min-h-screen min-w-0">
        {/* Top Header Bar */}
        <Header
          activeTab={activeTab}
          onTabChange={setActiveTab}
          theme={theme}
          onThemeChange={setTheme}
          engineMode={engineMode}
          onToggleEngineMode={handleToggleEngineMode}
          hasActiveAnalysis={!!activeAnalysis}
          onNewAnalysis={() => setActiveTab('analyze')}
          onToggleMobileNav={() => setIsMobileNavOpen(!isMobileNavOpen)}
        />

        {/* Dynamic Main Workspace Canvas */}
        <main className="flex-1 p-5 md:p-8 max-w-7xl mx-auto w-full">
          {isLoading ? (
            <motion.div
              key="loading"
              className="py-20 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <LoadingSpinner message="Calculating Sublinear TF-IDF & Cosine Similarity..." />
            </motion.div>
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeTab}
                {...pageTransition}
                transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
              >
                {activeTab === 'dashboard' && (
                  <OverviewView
                    onTabChange={setActiveTab}
                    onSelectSampleAndAnalyze={handleSelectSampleAndAnalyze}
                    history={history}
                    activeAnalysis={activeAnalysis}
                    onViewAnalysis={handleViewAnalysis}
                  />
                )}

                {activeTab === 'analyze' && (
                  <AnalyzeView
                    onRunAnalysis={handleRunAnalysis}
                    isLoading={isLoading}
                    initialResumeText={activeAnalysis?.resumeText}
                    initialJdText={activeAnalysis?.jobDescriptionText}
                  />
                )}

                {activeTab === 'results' && activeAnalysis && (
                  <ResultsView
                    analysis={activeAnalysis}
                    onTabChange={setActiveTab}
                    onNewAnalysis={() => setActiveTab('analyze')}
                  />
                )}

                {activeTab === 'results' && !activeAnalysis && (
                  <GlowPanel glow className="p-10 md:p-14 text-center">
                    <h3 className="text-base font-bold text-ink mb-1.5">No Comparison Computed Yet</h3>
                    <p className="text-xs text-mute mb-6">
                      Run your first comparison in the Resume Analyzer.
                    </p>
                    <button
                      onClick={() => setActiveTab('analyze')}
                      className="btn-primary px-5 py-2.5 text-xs"
                    >
                      Go to Match Studio
                    </button>
                  </GlowPanel>
                )}

                {activeTab === 'skills' && (
                  <SkillGapView
                    analysis={activeAnalysis}
                    onGoToAnalyze={() => setActiveTab('analyze')}
                  />
                )}

                {activeTab === 'ats-checker' && (
                  <AtsCompatibilityView
                    analysis={activeAnalysis}
                    onGoToAnalyze={() => setActiveTab('analyze')}
                    onTabChange={setActiveTab}
                  />
                )}

                {activeTab === 'dictionary' && (
                  <DictionaryView />
                )}

                {activeTab === 'history' && (
                  <HistoryView
                    history={history}
                    onViewAnalysis={handleViewAnalysis}
                    onDeleteHistoryItem={handleDeleteHistoryItem}
                    onGoToAnalyze={() => setActiveTab('analyze')}
                  />
                )}

                {activeTab === 'backend-guide' && (
                  <BackendGuideView />
                )}

                {activeTab === 'about' && (
                  <AboutView onTabChange={setActiveTab} />
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>
    </div>
  );
}
