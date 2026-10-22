import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GraduationCap, 
  BookOpen, 
  Cpu, 
  Database, 
  ShieldCheck, 
  HelpCircle, 
  CheckCircle2, 
  Terminal, 
  Layers, 
  Sparkles,
  ArrowRight,
  Code2,
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { ActiveTab } from '../../types';
import { GlowPanel } from '../ui/GlowPanel';
import { cn, riseIn, stagger } from '../../lib/ui';

interface AboutViewProps {
  onTabChange: (tab: ActiveTab) => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ onTabChange }) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: 'How does the app compare a resume with a job posting?',
      a: 'It tokenizes both documents into unigram and bigram features, applies TF-IDF (Term Frequency-Inverse Document Frequency) with sublinear scaling to weight distinguishing technical vocabulary, and calculates their cosine similarity. The output is a normalized lexical overlap index, not a hiring prediction.'
    },
    {
      q: 'Does repeating a skill artificially inflate the score?',
      a: 'No. Sublinear term-frequency scaling (1 + log(tf)) rapidly diminishes the marginal gain of repeated keywords. An isolated term mentioned dozens of times cannot overwhelm the broader semantic profile of the job specification.'
    },
    {
      q: 'What is the distinction between Semantic Match and ATS Readability?',
      a: 'Semantic Match measures vocabulary and capability overlap against the job description. ATS Readability tests layout extractability, section header detection, and contact coordinates. Neither score represents a commercial ATS vendor endorsement.'
    },
    {
      q: 'Are students penalized for lack of corporate tenure?',
      a: 'No. The structural parser incorporates student-friendly guardrails: substantial Academic Projects and Education sections substitute for corporate work history without triggering penalty deductions.'
    },
    {
      q: 'Can the text parser verify complex visual multi-column layouts?',
      a: 'No. Pure text extraction streams cannot reliably verify multi-column visual reading order or text embedded in canvas images. Users are advised to review raw formatting in simple single-column or clean two-column layouts.'
    }
  ];

  const demoSteps = [
    {
      step: '01 // Initialize Session',
      action: 'Load standard demonstration profiles or paste an unformatted technical resume.',
      tip: 'Supports PDF binary streams, DOCX OpenXML packages, or raw plaintext inputs.'
    },
    {
      step: '02 // Define Target Specification',
      action: 'Paste the target position requirements, responsibilities, and qualifications.',
      tip: 'The parser extracts both explicit requirements and preferred technical skills.'
    },
    {
      step: '03 // Execute Multi-Engine Comparison',
      action: 'Click "Run Match Analysis" to generate deterministic TF-IDF and taxonomy scores.',
      tip: 'Calculations are pure mathematical functions: identical inputs produce identical scores.'
    },
    {
      step: '04 // Inspect Competency Vectors',
      action: 'Review matched skills, missing proficiencies, and category-level coverage.',
      tip: 'All scoring reflects genuine analysis output without simulated mock figures.'
    },
    {
      step: '05 // Audit ATS Extractability',
      action: 'Open ATS Compatibility to verify contact data and standard resume headers.',
      tip: 'Flags layout ambiguities and identifies student guardrail substitutions.'
    },
    {
      step: '06 // Curate Skill Taxonomy',
      action: 'Open Skills List to add emerging frameworks or canonical synonyms.',
      tip: 'Custom definitions instantly integrate with future analysis runs.'
    },
    {
      step: '07 // Export Standalone Audit',
      action: 'Generate self-contained HTML reports for persistent offline archiving.',
      tip: 'Includes full scoring breakdown, skill gap lists, and formatting recommendations.'
    }
  ];

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={stagger}
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={riseIn}>
        <GlowPanel glow className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#79F2C0] mb-1">
              <GraduationCap className="w-4 h-4" />
              <span>FINAL YEAR PROJECT SPECIFICATION</span>
            </div>
            <h1 className="text-xl md:text-2xl font-display font-bold tracking-tight text-ink">
              About AI ResumeMatch
            </h1>
            <p className="text-xs text-mute mt-0.5">
              Deterministic TF-IDF similarity, taxonomy-driven skill extraction, and ATS layout readability architecture.
            </p>
          </div>

          <button
            onClick={() => onTabChange('analyze')}
            className="btn-primary text-xs shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            <span>Open Match Studio</span>
          </button>
        </GlowPanel>
      </motion.div>

      {/* Abstract & Academic Objectives Grid */}
      <motion.div variants={riseIn} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlowPanel className="p-6">
          <h2 className="text-sm font-display font-bold text-ink mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#79F2C0]" />
            <span>Research Motivation & Problem Statement</span>
          </h2>
          <p className="text-xs text-mute leading-relaxed mb-3">
            Modern recruitment workflows rely heavily on automated applicant tracking systems to triage candidate pools. Job seekers frequently struggle to evaluate whether their resumes articulate technical competencies in ways commercial parsers can extract reliably.
          </p>
          <p className="text-xs text-mute leading-relaxed">
            <strong className="text-ink">AI ResumeMatch</strong> provides a transparent, explainable alternative to black-box candidate evaluation by combining sublinear TF-IDF cosine similarity, structured skill taxonomy classification, and heuristic layout extractability audits.
          </p>
        </GlowPanel>

        <GlowPanel className="p-6">
          <h2 className="text-sm font-display font-bold text-ink mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#62D9F5]" />
            <span>Core Technical Deliverables</span>
          </h2>
          <ul className="space-y-2 text-xs text-mute leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="font-mono text-[#79F2C0]">•</span>
              <span><strong className="text-ink">Deterministic NLP:</strong> Scikit-learn TF-IDF vectorization with n-gram tokenization and sublinear term frequency weighting.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono text-[#62D9F5]">•</span>
              <span><strong className="text-ink">Multi-Domain Taxonomy:</strong> Multi-category skill extraction covering languages, databases, web development, cloud, and project management.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono text-[#A99BFF]">•</span>
              <span><strong className="text-ink">Extractability Heuristics:</strong> RFC-compliant email detection, phone parsing, and heading hierarchy verification.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono text-[#F4BD73]">•</span>
              <span><strong className="text-ink">Academic Equity:</strong> Protected student mode allowing substantial coursework to substitute for employment history.</span>
            </li>
          </ul>
        </GlowPanel>
      </motion.div>

      {/* Step-by-Step Viva Presentation Demo Guide */}
      <motion.div variants={riseIn}>
        <GlowPanel className="p-6">
          <div className="flex items-center gap-2 mb-2 text-xs font-mono font-semibold text-[#79F2C0]">
            <Layers className="w-4 h-4" />
            <span>DEMONSTRATION WALKTHROUGH</span>
          </div>
          <h2 className="text-base font-display font-bold text-ink mb-1.5">
            Step-by-Step Viva Evaluation Guide
          </h2>
          <p className="text-xs text-mute mb-5">
            Recommended sequence for presenting system architecture, algorithmic calculations, and real-time report generation:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {demoSteps.map((d, idx) => (
              <div key={idx} className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.08] text-xs">
                <div className="font-mono font-bold text-[#79F2C0] mb-1">{d.step}</div>
                <p className="text-ink font-medium mb-2 leading-relaxed">{d.action}</p>
                <div className="text-[11px] text-[#62D9F5] bg-[#62D9F5]/8 p-2.5 rounded-lg border border-[#62D9F5]/20 font-mono">
                  <strong className="text-[#62D9F5]">Note: </strong>
                  {d.tip}
                </div>
              </div>
            ))}
          </div>
        </GlowPanel>
      </motion.div>

      {/* Examiner FAQ */}
      <motion.div variants={riseIn}>
        <GlowPanel className="p-6">
          <h2 className="text-base font-display font-bold text-ink mb-1 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-[#79F2C0]" />
            <span>Academic Defense FAQ</span>
          </h2>
          <p className="text-xs text-mute mb-5">
            Key questions and methodological justifications for final-year project examiners:
          </p>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div key={idx} className="rounded-xl border border-white/[0.08] overflow-hidden bg-white/[0.02]">
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full p-4 text-left font-semibold text-xs text-ink hover:bg-white/[0.03] flex items-center justify-between transition-colors"
                  >
                    <span>{faq.q}</span>
                    <span className="text-[#79F2C0] ml-3 shrink-0">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-4 pb-4 pt-1 text-xs text-mute leading-relaxed border-t border-white/[0.06]"
                      >
                        {faq.a}
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
