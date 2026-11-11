import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { OverviewView } from './components/dashboard/OverviewView';
import { AnalyzeView } from './components/analyze/AnalyzeView';
import { Button } from './components/ui/Button';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { analyzeResume } from './services/api';
import type { ActiveTab, AnalysisResult } from './types';

const ResultsView = lazy(() =>
  import('./components/results/ResultsView').then(module => ({ default: module.ResultsView }))
);
const HowItWorksView = lazy(() =>
  import('./components/architecture/BackendGuideView').then(module => ({
    default: module.BackendGuideView,
  }))
);
const AboutView = lazy(() =>
  import('./components/about/AboutView').then(module => ({ default: module.AboutView }))
);

const friendlyError = (error: unknown): string => {
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'The analysis did not finish. Check the documents and try again.';
};

type Theme = 'dark' | 'light';

const THEME_STORAGE_KEY = 'resume-match-theme';

/** Theme preference is a convenience, never a hard requirement: storage can throw. */
const readStoredTheme = (): Theme => {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
};

const storeTheme = (theme: Theme): void => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage may be blocked (private mode / disabled cookies); the theme still applies.
  }
};

const FULL_PAGE_TRANSITION = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

const REDUCED_PAGE_TRANSITION = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [theme, setTheme] = useState<Theme>(readStoredTheme);
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    storeTheme(theme);
  }, [theme]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [activeTab]);

  // Stable callbacks keep memoized layout components from re-rendering on unrelated state.
  const handleTabChange = useCallback((tab: ActiveTab) => setActiveTab(tab), []);
  const handleToggleMobileNav = useCallback(() => setIsMobileNavOpen(open => !open), []);
  const handleCloseMobileNav = useCallback(() => setIsMobileNavOpen(false), []);
  const handleDismissError = useCallback(() => setAnalysisError(null), []);
  const handleStartAnalysis = useCallback(() => setActiveTab('analyze'), []);

  const handleRunAnalysis = useCallback(
    async (resumeText: string, jdText: string, resumeTitle: string, jobTitle: string) => {
      setIsLoading(true);
      setAnalysisError(null);
      setActiveTab('analyze');

      try {
        const result = await analyzeResume({
          resumeText,
          jobDescription: jdText,
          resumeTitle,
          jobTitle,
        });
        setActiveAnalysis(result);
        setActiveTab('results');
      } catch (error) {
        console.error('Analysis failed', error);
        setAnalysisError(friendlyError(error));
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const startNewAnalysis = useCallback(() => {
    setActiveAnalysis(null);
    setAnalysisError(null);
    setActiveTab('analyze');
  }, []);

  const pageTransition = reduced ? REDUCED_PAGE_TRANSITION : FULL_PAGE_TRANSITION;

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-obsidian text-porcelain">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        hasResults={Boolean(activeAnalysis)}
        isOpenMobile={isMobileNavOpen}
        onCloseMobile={handleCloseMobileNav}
      />

      <div className="flex min-h-screen min-w-0 flex-col lg:pl-64">
        <Header
          activeTab={activeTab}
          theme={theme}
          onThemeChange={setTheme}
          onToggleMobileNav={handleToggleMobileNav}
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
                {activeTab === 'home' && (
                  <OverviewView onStartAnalysis={handleStartAnalysis} />
                )}

                {activeTab === 'analyze' && (
                  <AnalyzeView
                    onRunAnalysis={handleRunAnalysis}
                    isLoading={isLoading}
                    error={analysisError}
                    onDismissError={handleDismissError}
                  />
                )}

                {activeTab === 'results' && activeAnalysis && (
                  <ResultsView
                    analysis={activeAnalysis}
                    onNewAnalysis={startNewAnalysis}
                  />
                )}

                {activeTab === 'results' && !activeAnalysis && (
                  <div className="panel mx-auto max-w-xl px-6 py-10 text-center">
                    <h2 className="font-heading text-base font-semibold text-porcelain">
                      No results yet
                    </h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-silver">
                      Upload a resume and paste a job description to run your first comparison.
                    </p>
                    <Button
                      variant="primary"
                      size="md"
                      className="mt-5"
                      onClick={handleStartAnalysis}
                    >
                      Analyze My Resume
                    </Button>
                  </div>
                )}

                {activeTab === 'how-it-works' && (
                  <HowItWorksView onTabChange={handleTabChange} />
                )}

                {activeTab === 'about' && <AboutView onTabChange={handleTabChange} />}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
