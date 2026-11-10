import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GraduationCap,
  BookOpen,
  Cpu,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  Layers,
  ShieldCheck,
  Target,
} from 'lucide-react';
import { ActiveTab } from '../../types';
import { GlowPanel } from '../ui/GlowPanel';
import { Button } from '../ui/Button';
import { riseIn, stagger } from '../../lib/ui';

interface AboutViewProps {
  onTabChange: (tab: ActiveTab) => void;
}

const SCOPE = [
  'Upload a resume as PDF or DOCX.',
  'Paste a job description as text.',
  'Extract readable text on the Flask backend.',
  'Calculate TF-IDF cosine similarity as the match percentage.',
  'Identify matched, missing and resume keywords.',
  'Calculate basic ATS-style keyword coverage.',
  'Show rule-based improvement suggestions.',
  'Display all results on one results page.',
];

const WALKTHROUGH = [
  {
    step: '01 // Upload',
    action: 'Choose a PDF or DOCX resume.',
    note: 'Flask validates the file and extracts text with PyMuPDF or python-docx.',
  },
  {
    step: '02 // Describe the role',
    action: 'Paste the target job description.',
    note: 'The posting supplies both the TF-IDF comparison text and the job keywords.',
  },
  {
    step: '03 // Analyze',
    action: 'Run the comparison.',
    note: 'scikit-learn builds the vectors; cosine similarity and keyword coverage are calculated.',
  },
  {
    step: '04 // Review',
    action: 'Read the match percentage, keyword lists and suggestions.',
    note: 'Every value comes from the two documents. No score is hardcoded or randomized.',
  },
];

const FAQS = [
  {
    q: 'How is the resume–job match percentage calculated?',
    a: 'The backend cleans both documents, converts them into TF-IDF vectors with scikit-learn, and calculates cosine similarity. The cosine value is multiplied by 100 and rounded to one decimal place. It measures shared vocabulary and phrasing, not the probability of being hired.',
  },
  {
    q: 'Is keyword coverage an official ATS score?',
    a: 'No. It is a basic keyword check: matched dictionary keywords divided by all dictionary keywords identified in the job description. It does not simulate Workday, Greenhouse, Taleo, or any commercial applicant tracking system, and it makes no compatibility claim.',
  },
  {
    q: 'Why might a relevant resume score only around 50–60%?',
    a: 'TF-IDF is a lexical method. Different wording, synonyms, acronyms outside the keyword dictionary, or a short posting can lower the score even when the experience is relevant. The keyword lists and coverage help explain where the overlap is weak.',
  },
  {
    q: 'Does the app invent missing experience or rewrite the resume?',
    a: 'No. Suggestions are rule-based and conditional. Missing keywords are phrased as “if you have genuine experience with …”, and the app never generates work history, qualifications, certifications, achievements, or skills the user does not have.',
  },
  {
    q: 'What was intentionally removed from the earlier version?',
    a: 'Authentication, user roles, analysis history, downloadable reports, Google Gemini integration, generative resume rewriting, advanced ATS simulation, the security dashboard, and composite scoring were removed. The visual design, Three.js scene and Emerald Luxe interface were preserved.',
  },
];

export const AboutView: React.FC<AboutViewProps> = ({ onTabChange }) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">
      {/* Header */}
      <motion.div variants={riseIn}>
        <GlowPanel glow className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div>
            <div className="mb-1 flex items-center gap-2 font-mono text-xs font-semibold text-mint">
              <GraduationCap className="h-4 w-4" aria-hidden="true" />
              <span>FINAL YEAR PROJECT</span>
            </div>
            <h2 className="font-heading text-xl font-semibold tracking-tight text-porcelain md:text-2xl">
              About AI ResumeMatch
            </h2>
            <p className="mt-0.5 max-w-xl text-xs leading-relaxed text-silver">
              An explainable NLP resume and job-description matching system built around TF-IDF,
              cosine similarity and keyword analysis.
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            className="shrink-0"
            onClick={() => onTabChange('analyze')}
            leftIcon={<Sparkles className="h-4 w-4" />}
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            Analyze a resume
          </Button>
        </GlowPanel>
      </motion.div>

      {/* Purpose + scope */}
      <motion.div variants={riseIn} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <GlowPanel className="p-6">
          <h2 className="mb-3 flex items-center gap-2 font-heading text-sm font-semibold text-porcelain">
            <BookOpen className="h-4 w-4 text-mint" aria-hidden="true" />
            Purpose and problem statement
          </h2>
          <p className="mb-3 text-xs leading-relaxed text-silver">
            Job seekers often cannot tell whether their resume communicates the language of a
            specific role. Commercial screening tools are opaque, and many resume tools rely on
            generative AI that can invent claims.
          </p>
          <p className="text-xs leading-relaxed text-silver">
            This project provides a transparent alternative: the user can see the exact match
            percentage, the keywords that were found, the keywords that were not found, the keyword
            coverage formula, and the rules that produced each suggestion.
          </p>
        </GlowPanel>

        <GlowPanel className="p-6">
          <h2 className="mb-3 flex items-center gap-2 font-heading text-sm font-semibold text-porcelain">
            <CheckCircle2 className="h-4 w-4 text-ion" aria-hidden="true" />
            Final project scope
          </h2>
          <ul className="space-y-2 text-xs leading-relaxed text-silver">
            {SCOPE.map(item => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-0.5 font-mono text-mint">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </GlowPanel>
      </motion.div>

      {/* Method */}
      <motion.div variants={riseIn}>
        <GlowPanel className="p-6">
          <div className="mb-4 flex items-center gap-2 font-mono text-xs font-semibold text-mint">
            <Cpu className="h-4 w-4" aria-hidden="true" />
            <span>METHODOLOGY</span>
          </div>
          <h2 className="mb-4 font-heading text-base font-semibold text-porcelain">
            Two separate, explainable metrics
          </h2>

          <div className="grid gap-4 text-xs sm:grid-cols-2">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
              <div className="mb-2 flex items-center gap-2 font-semibold text-porcelain">
                <Target className="h-4 w-4 text-mint" aria-hidden="true" />
                Resume–job text match
              </div>
              <p className="leading-relaxed text-silver">
                TF-IDF vectorisation from scikit-learn, followed by cosine similarity. The score is
                a lexical overlap measure from 0 to 100, not a hiring probability.
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
              <div className="mb-2 flex items-center gap-2 font-semibold text-porcelain">
                <ShieldCheck className="h-4 w-4 text-ion" aria-hidden="true" />
                Basic keyword coverage
              </div>
              <p className="leading-relaxed text-silver">
                A maintained skills dictionary with aliases identifies job keywords. Coverage =
                matched job keywords ÷ total job keywords × 100, with a zero-division guard.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 font-mono text-[11px] leading-relaxed text-silver">
            <p>match_percentage = cosine_similarity(tfidf(resume), tfidf(job)) × 100</p>
            <p className="mt-1">
              keyword_coverage = matched_job_keywords / total_job_keywords × 100
            </p>
          </div>
        </GlowPanel>
      </motion.div>

      {/* Viva walkthrough */}
      <motion.div variants={riseIn}>
        <GlowPanel className="p-6">
          <div className="mb-2 flex items-center gap-2 font-mono text-xs font-semibold text-mint">
            <Layers className="h-4 w-4" aria-hidden="true" />
            <span>DEMONSTRATION WALKTHROUGH</span>
          </div>
          <h2 className="mb-1.5 font-heading text-base font-semibold text-porcelain">
            Four steps for the viva
          </h2>
          <p className="mb-5 text-xs leading-relaxed text-silver">
            A short sequence for demonstrating the complete workflow and the NLP calculation.
          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {WALKTHROUGH.map(item => (
              <div
                key={item.step}
                className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-xs"
              >
                <div className="mb-1 font-mono font-semibold text-mint">{item.step}</div>
                <p className="mb-2 font-medium leading-relaxed text-porcelain">{item.action}</p>
                <div className="rounded-lg border border-ion/20 bg-ion/[0.06] p-2.5 font-mono text-[11px] leading-relaxed text-ion">
                  <strong className="text-ion">Note: </strong>
                  {item.note}
                </div>
              </div>
            ))}
          </div>
        </GlowPanel>
      </motion.div>

      {/* FAQ */}
      <motion.div variants={riseIn}>
        <GlowPanel className="p-6">
          <h2 className="mb-1 flex items-center gap-2 font-heading text-base font-semibold text-porcelain">
            <HelpCircle className="h-4 w-4 text-mint" aria-hidden="true" />
            Academic defence FAQ
          </h2>
          <p className="mb-5 text-xs leading-relaxed text-silver">
            Methodological questions an examiner may ask about the simplified scope.
          </p>

          <div className="space-y-3">
            {FAQS.map((faq, index) => {
              const isOpen = activeFaq === index;
              return (
                <div
                  key={faq.q}
                  className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]"
                >
                  <button
                    type="button"
                    onClick={() => setActiveFaq(isOpen ? null : index)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between p-4 text-left text-xs font-semibold text-porcelain transition-colors hover:bg-white/[0.03]"
                  >
                    <span>{faq.q}</span>
                    <span className="ml-3 shrink-0 text-mint">
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                      )}
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <p className="border-t border-white/[0.06] px-4 pb-4 pt-3 text-xs leading-relaxed text-silver">
                          {faq.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </GlowPanel>
      </motion.div>
    </motion.div>
  );
};

export default AboutView;
