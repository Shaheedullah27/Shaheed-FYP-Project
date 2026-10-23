import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { OverviewView } from './components/dashboard/OverviewView';
import { AnalyzeView } from './components/analyze/AnalyzeView';
import { HistoryView } from './components/history/HistoryView';
import { Button } from './components/ui/Button';
import { LoadingSpinner } from './components/common/LoadingSpinner';

/**
 * Secondary destinations and chart-heavy results load on demand, keeping the
 * first visit limited to the shell, dashboard, and analysis form.
 */
const ResultsView = lazy(() =>
  import('./components/results/ResultsView').then(module => ({ default: module.ResultsView }))
);
const ProgressView = lazy(() =>
  import('./components/progress/ProgressView').then(module => ({ default: module.ProgressView }))
);
const SkillGapView = lazy(() =>
  import('./components/skills/SkillGapView').then(module => ({ default: module.SkillGapView }))
);
const AtsCompatibilityView = lazy(() =>
  import('./components/ats/AtsCompatibilityView').then(module => ({ default: module.AtsCompatibilityView }))
);
const SecurityDashboardView = lazy(() =>
  import('./components/security/SecurityDashboardView').then(module => ({ default: module.SecurityDashboardView }))
);
const DictionaryView = lazy(() =>
  import('./components/dictionary/DictionaryView').then(module => ({ default: module.DictionaryView }))
);
const BackendGuideView = lazy(() =>
  import('./components/architecture/BackendGuideView').then(module => ({ default: module.BackendGuideView }))
);
const AboutView = lazy(() =>
  import('./components/about/AboutView').then(module => ({ default: module.AboutView }))
);
const SettingsView = lazy(() =>
  import('./components/settings/SettingsView').then(module => ({ default: module.SettingsView }))
);

import { ActiveTab, AnalysisResult, HistoryItem } from './types';
import {
  getStoredHistory,
  saveAnalysisToHistory,
  deleteHistoryItem,
  clearStoredHistory,
  getActiveAnalysis,
  getAnalysisById,
} from './services/storage';
import { runAnalysis, getEngineMode } from './services/api';
import { getVersionContext } from './services/progress';
import { SAMPLE_RESUMES, SAMPLE_JOB_DESCRIPTIONS } from './data/sampleData';

const friendlyError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : '';
  if (/quota|storage/i.test(message)) {
    return 'This browser could not save the result because its local storage is full. Free up space and try again.';
  }
  return 'Something interrupted the analysis before it finished. Please check the file and try again.';
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const storedTheme = localStorage.getItem('resume-match-theme');
    return storedTheme === 'light' ? 'light' : 'dark';
  });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [engineNotice, setEngineNotice] = useState<string | null>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('resume-match-theme', theme);
  }, [theme]);

  // Load only what this user actually saved — no seeded demo history.
  useEffect(() => {
    setHistory(getStoredHistory());
    setActiveAnalysis(getActiveAnalysis());
  }, []);

  // Warm the results chunk in the background so opening a result feels instant.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void import('./components/results/ResultsView');
    }, 2500);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [activeTab]);

  const handleRunAnalysis = async (
    resumeText: string,
    jdText: string,
    resumeTitle: string,
    jobTitle: string,
    /** Explicit, per-run user opt-in for sending the texts to Gemini. */
    useGemini: boolean = false
  ) => {
    setIsLoading(true);
    setAnalysisError(null);
    setEngineNotice(null);
    // Show the in-place loading state even when the run starts from the dashboard.
    setActiveTab('analyze');

    const requestedMode = getEngineMode();

    try {
      const { result, source } = await runAnalysis(resumeText, jdText, resumeTitle, jobTitle, useGemini);

      const savedItem = saveAnalysisToHistory(result);
      setHistory(prev => [savedItem, ...prev.filter(item => item.id !== savedItem.id)]);
      setActiveAnalysis(result);

      if (requestedMode === 'flask' && source === 'browser') {
        setEngineNotice(
          useGemini
            ? 'The Python backend could not be reached, so this analysis ran with the built-in engine instead. Because the local engine never contacts Gemini, no AI insights are included — nothing was sent anywhere.'
            : 'The Python backend could not be reached, so this analysis ran with the built-in engine instead.'
        );
      }

      setActiveTab('results');
    } catch (error) {
      console.error('Analysis failed', error);
      setAnalysisError(friendlyError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSampleAndAnalyze = (resumeId: string, jdId: string) => {
    const resume = SAMPLE_RESUMES.find(item => item.id === resumeId);
    const jd = SAMPLE_JOB_DESCRIPTIONS.find(item => item.id === jdId);
    if (resume && jd) {
      handleRunAnalysis(resume.text, jd.text, resume.title, jd.title);
    }
  };

  const handleViewAnalysis = (id: string) => {
    const record = getAnalysisById(id);
    if (record) {
      setActiveAnalysis(record);
      setAnalysisError(null);
      setActiveTab('results');
    }
  };

  const handleDeleteHistoryItem = (id: string) => {
    const updated = deleteHistoryItem(id);
    setHistory(updated);
    if (activeAnalysis?.id === id) {
      setActiveAnalysis(updated.length > 0 ? getAnalysisById(updated[0].id) : null);
    }
  };

  const handleClearHistory = () => {
    clearStoredHistory();
    setHistory([]);
    setActiveAnalysis(null);
  };

  const versionContext = useMemo(
    () => (activeAnalysis ? getVersionContext(activeAnalysis, history) : null),
    [activeAnalysis, history]
  );

  const pageTransition = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -6 },
      };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-obsidian text-porcelain">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        savedCount={history.length}
        hasResults={Boolean(activeAnalysis)}
        isOpenMobile={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
      />

      <div className="flex min-h-screen min-w-0 flex-col lg:pl-64">
        <Header
          activeTab={activeTab}
          theme={theme}
          onThemeChange={setTheme}
          onToggleMobileNav={() => setIsMobileNavOpen(open => !open)}
        />

        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              {...pageTransition}
              transition={{ duration: reduced ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <Suspense
                fallback={
                  <div className="flex justify-center py-16">
                    <LoadingSpinner message="Loading this page…" hint="One moment." />
                  </div>
                }
              >
              {activeTab === 'dashboard' && (
                <OverviewView
                  onTabChange={setActiveTab}
                  onSelectSampleAndAnalyze={handleSelectSampleAndAnalyze}
                  history={history}
                  onViewAnalysis={handleViewAnalysis}
                />
              )}

              {activeTab === 'analyze' && (
                <AnalyzeView
                  onRunAnalysis={handleRunAnalysis}
                  isLoading={isLoading}
                  error={analysisError}
                  onDismissError={() => setAnalysisError(null)}
                  initialResumeText={activeAnalysis?.resumeText}
                  initialJdText={activeAnalysis?.jobDescriptionText}
                />
              )}

              {activeTab === 'results' && activeAnalysis && (
                <ResultsView
                  analysis={activeAnalysis}
                  onTabChange={setActiveTab}
                  onNewAnalysis={() => setActiveTab('analyze')}
                  engineNotice={engineNotice}
                  versionContext={versionContext}
                  onOpenProgress={() => setActiveTab('progress')}
                />
              )}

              {activeTab === 'results' && !activeAnalysis && (
                <div className="panel mx-auto max-w-xl px-6 py-10 text-center">
                  <h2 className="font-heading text-base font-semibold text-porcelain">No results yet</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-silver">
                    Run your first comparison to see your match score, missing skills, and ATS
                    check here.
                  </p>
                  <Button
                    variant="primary"
                    size="md"
                    className="mt-5"
                    onClick={() => setActiveTab('analyze')}
                  >
                    Analyze My Resume
                  </Button>
                </div>
              )}

              {activeTab === 'skills' && (
                <SkillGapView
                  analysis={activeAnalysis}
                  onGoToAnalyze={() => setActiveTab('analyze')}
                  onTabChange={setActiveTab}
                />
              )}

              {activeTab === 'ats-checker' && (
                <AtsCompatibilityView
                  analysis={activeAnalysis}
                  onGoToAnalyze={() => setActiveTab('analyze')}
                  onTabChange={setActiveTab}
                />
              )}

              {activeTab === 'security' && <SecurityDashboardView />}

              {activeTab === 'dictionary' && <DictionaryView />}

              {activeTab === 'history' && (
                <HistoryView
                  history={history}
                  onViewAnalysis={handleViewAnalysis}
                  onDeleteHistoryItem={handleDeleteHistoryItem}
                  onGoToAnalyze={() => setActiveTab('analyze')}
                  onGoToProgress={() => setActiveTab('progress')}
                />
              )}

              {activeTab === 'progress' && (
                <ProgressView
                  history={history}
                  onViewAnalysis={handleViewAnalysis}
                  onGoToAnalyze={() => setActiveTab('analyze')}
                />
              )}

              {activeTab === 'backend-guide' && <BackendGuideView onTabChange={setActiveTab} />}

              {activeTab === 'about' && <AboutView onTabChange={setActiveTab} />}

              {activeTab === 'settings' && (
                <SettingsView
                  theme={theme}
                  onThemeChange={setTheme}
                  historyCount={history.length}
                  onClearHistory={handleClearHistory}
                />
              )}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
