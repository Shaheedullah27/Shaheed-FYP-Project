import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Terminal,
  Cpu,
  Copy,
  Check,
  Server,
  Code2,
  FolderTree,
  Sparkles,
  ArrowRight,
  FileText,
  ScanText,
  ShieldCheck,
} from 'lucide-react';
import { ActiveTab } from '../../types';
import { GlowPanel } from '../ui/GlowPanel';
import { Button } from '../ui/Button';
import { riseIn, stagger } from '../../lib/ui';

interface BackendGuideViewProps {
  onTabChange: (tab: ActiveTab) => void;
}

const PIPELINE = [
  {
    step: '01',
    title: 'Upload',
    description: 'The React form sends your PDF or DOCX to Flask as multipart form data.',
    icon: FileText,
  },
  {
    step: '02',
    title: 'Extract',
    description: 'PyMuPDF reads PDF text; python-docx reads paragraphs and tables from DOCX.',
    icon: ScanText,
  },
  {
    step: '03',
    title: 'Vectorise',
    description: 'scikit-learn builds TF-IDF vectors for the resume and job description.',
    icon: Cpu,
  },
  {
    step: '04',
    title: 'Compare',
    description: 'Cosine similarity becomes the match percentage; the keyword dictionary becomes coverage.',
    icon: Sparkles,
  },
];

export const BackendGuideView: React.FC<BackendGuideViewProps> = ({ onTabChange }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const resetTimer = useRef<number | null>(null);

  // Clear a pending "Copied" reset when the page unmounts.
  useEffect(
    () => () => {
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    },
    []
  );

  const copyCode = async (code: string, index: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedIndex(index);
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => {
        setCopiedIndex(null);
        resetTimer.current = null;
      }, 2000);
    } catch {
      setCopiedIndex(null);
    }
  };

  const setupCommands = [
    {
      title: '1. Install backend dependencies',
      code: 'cd backend\npython -m venv venv\n# Windows: venv\\Scripts\\activate\n# macOS/Linux: source venv/bin/activate\npip install -r requirements.txt',
    },
    {
      title: '2. Start the Flask API',
      code: 'python app.py',
    },
    {
      title: '3. Start the React frontend',
      code: 'npm install\nnpm run dev',
    },
  ];

  const endpoints = [
    {
      method: 'GET',
      path: '/api/health',
      description: 'Returns service status, version and supported upload formats.',
    },
    {
      method: 'POST',
      path: '/api/extract-resume',
      description: 'Accepts multipart form data with a file field and returns extracted text and word count.',
    },
    {
      method: 'POST',
      path: '/api/analyze',
      description: 'Accepts JSON with resume_text and job_description; returns the match and keyword analysis.',
    },
  ];

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">
      <motion.div variants={riseIn}>
        <GlowPanel glow className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-start">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-medium text-mint">
              <Terminal className="h-4 w-4" aria-hidden="true" />
              <span>How the app works</span>
            </div>
            <h2 className="font-heading text-xl font-semibold tracking-tight text-porcelain md:text-2xl">
              A small, explainable NLP pipeline
            </h2>
            <p className="mt-1 max-w-xl text-sm text-silver">
              React handles the interface. Flask handles extraction, TF-IDF similarity and keyword
              coverage. There is no database, login, generative AI or report archive in this
              simplified project.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onTabChange('analyze')}
            rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
          >
            Try the analyzer
          </Button>
        </GlowPanel>
      </motion.div>

      {/* Architecture flow */}
      <motion.div variants={riseIn}>
        <GlowPanel className="p-6">
          <h2 className="mb-4 font-heading text-sm font-semibold text-porcelain">
            Request lifecycle
          </h2>
          <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
            {PIPELINE.map(item => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4"
                >
                  <div className="mb-2 flex items-center gap-2 font-mono font-semibold text-mint">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span>{item.step}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-porcelain">{item.title}</h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-silver">{item.description}</p>
                </div>
              );
            })}
          </div>
        </GlowPanel>
      </motion.div>

      {/* API endpoints */}
      <motion.div variants={riseIn}>
        <GlowPanel className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Server className="h-4 w-4 text-ion" aria-hidden="true" />
            <h2 className="font-heading text-sm font-semibold text-porcelain">API endpoints</h2>
          </div>
          <div className="space-y-2.5">
            {endpoints.map(endpoint => (
              <div
                key={endpoint.path}
                className="flex flex-col gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 sm:flex-row sm:items-start sm:gap-4"
              >
                <span
                  className={`inline-flex w-fit shrink-0 rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold ${
                    endpoint.method === 'GET'
                      ? 'border-ion/30 bg-ion/10 text-ion'
                      : 'border-mint/30 bg-mint/10 text-mint'
                  }`}
                >
                  {endpoint.method}
                </span>
                <div className="min-w-0">
                  <p className="font-mono text-xs font-semibold text-porcelain">{endpoint.path}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-silver">
                    {endpoint.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </GlowPanel>
      </motion.div>

      {/* Setup */}
      <motion.div variants={riseIn}>
        <GlowPanel className="p-6">
          <div className="mb-1.5 flex items-center gap-2">
            <Code2 className="h-4 w-4 text-mint" aria-hidden="true" />
            <h2 className="font-heading text-sm font-semibold text-porcelain">
              Run it locally
            </h2>
          </div>
          <p className="mb-5 text-xs text-silver">
            Use two terminals: one for the Flask API on port 5000, one for Vite on port 3000.
          </p>

          <div className="space-y-3.5">
            {setupCommands.map((command, index) => (
              <div
                key={command.title}
                className="overflow-hidden rounded-xl border border-white/[0.08] bg-obsidian"
              >
                <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-xs font-semibold text-porcelain">
                  <span className="font-mono text-[11px]">{command.title}</span>
                  <button
                    type="button"
                    onClick={() => copyCode(command.code, index)}
                    className="flex items-center gap-1.5 font-mono text-[11px] text-silver transition-colors hover:text-mint"
                  >
                    {copiedIndex === index ? (
                      <Check className="h-3.5 w-3.5 text-mint" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    <span>{copiedIndex === index ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-porcelain/85">
                  <code>{command.code}</code>
                </pre>
              </div>
            ))}
          </div>
        </GlowPanel>
      </motion.div>

      {/* Backend files and scope */}
      <motion.div variants={riseIn} className="grid gap-4 md:grid-cols-2">
        <GlowPanel className="p-6">
          <div className="mb-3 flex items-center gap-2">
            <FolderTree className="h-4 w-4 text-mint" aria-hidden="true" />
            <h2 className="font-heading text-sm font-semibold text-porcelain">Backend files</h2>
          </div>
          <div className="space-y-3 text-xs">
            {[
              ['backend/app.py', 'Flask routes, upload validation, JSON responses.'],
              ['backend/parser.py', 'PyMuPDF and python-docx text extraction.'],
              ['backend/nlp_engine.py', 'TF-IDF similarity, keyword analysis, suggestions.'],
              ['backend/skills_dictionary.json', 'Maintainable keyword vocabulary with aliases.'],
            ].map(([file, description]) => (
              <div
                key={file}
                className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5"
              >
                <span className="mb-1 block font-mono font-semibold text-mint">{file}</span>
                <span className="text-[11px] text-silver">{description}</span>
              </div>
            ))}
          </div>
        </GlowPanel>

        <GlowPanel className="p-6">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-ion" aria-hidden="true" />
            <h2 className="font-heading text-sm font-semibold text-porcelain">
              What this project does not do
            </h2>
          </div>
          <ul className="space-y-2.5 text-xs leading-relaxed text-silver">
            {[
              'No accounts, login, admin roles or personalized dashboard.',
              'No SQLite analysis history or downloadable reports.',
              'No Google Gemini or other external AI API calls.',
              'No generative resume rewriting.',
              'No advanced ATS simulation or commercial ATS compatibility claims.',
              'No composite score: the match percentage and keyword coverage stay separate.',
            ].map(item => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-0.5 font-mono text-mint">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </GlowPanel>
      </motion.div>
    </motion.div>
  );
};

export default BackendGuideView;
