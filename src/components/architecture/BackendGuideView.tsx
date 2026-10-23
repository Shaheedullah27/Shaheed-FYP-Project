import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Terminal,
  Cpu,
  Database,
  Copy,
  Check,
  Server,
  Code2,
  FolderTree,
  Settings
} from 'lucide-react';
import { ActiveTab } from '../../types';
import { GlowPanel } from '../ui/GlowPanel';
import { Button } from '../ui/Button';
import { riseIn, stagger } from '../../lib/ui';

interface BackendGuideViewProps {
  onTabChange: (tab: ActiveTab) => void;
}

export const BackendGuideView: React.FC<BackendGuideViewProps> = ({ onTabChange }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const setupCommands = [
    { title: '1. Create and activate Python virtualenv (PowerShell)', code: 'cd backend\npy -3.12 -m venv venv\n.\\venv\\Scripts\\Activate.ps1' },
    { title: '2. Install verified backend dependencies', code: 'python -m pip install -r requirements.txt' },
    { title: '3. Start Flask REST API microservice', code: 'python app.py' },
    { title: '4. Start Vite developer server in separate terminal', code: 'npm install\nnpm run dev' }
  ];

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={stagger}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={riseIn}>
        <GlowPanel glow className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-mint mb-1">
              <Terminal className="w-4 h-4" aria-hidden="true" />
              <span>How the app works</span>
            </div>
            <h2 className="text-xl md:text-2xl font-heading font-semibold tracking-tight text-porcelain">
              Two ways to run the analysis
            </h2>
            <p className="text-sm text-silver mt-1 max-w-xl">
              The app works by itself in the browser, or it can use the optional Python backend for
              the same scoring. Both produce the same comparisons.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onTabChange('settings')}
            leftIcon={<Settings className="w-3.5 h-3.5" />}
          >
            Engine settings
          </Button>
        </GlowPanel>
      </motion.div>

      {/* Architecture Flow Diagram */}
      <motion.div variants={riseIn}>
        <GlowPanel className="p-6">
          <h2 className="text-sm font-display font-semibold text-ink mb-4">
            Component Architecture & Data Lifecycle
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.08]">
              <div className="flex items-center gap-2 mb-2 font-mono font-semibold text-mint">
                <Code2 className="w-4 h-4" />
                <span>01 // Client SPA</span>
              </div>
              <ul className="space-y-1.5 text-mute leading-relaxed text-[11px]">
                <li>• React 19 + TypeScript + Vite</li>
                <li>• Drag-and-drop document upload</li>
                <li>• Interactive Recharts visualizers</li>
                <li>• Instant in-browser fallback engine</li>
              </ul>
            </div>

            <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.08]">
              <div className="flex items-center gap-2 mb-2 font-mono font-semibold text-ion">
                <Server className="w-4 h-4" />
                <span>02 // Python Backend</span>
              </div>
              <ul className="space-y-1.5 text-mute leading-relaxed text-[11px]">
                <li>• Flask lightweight REST API</li>
                <li>• PyMuPDF & python-docx extraction</li>
                <li>• Scikit-learn TF-IDF vectorizer</li>
                <li>• Security inspection & forensics</li>
              </ul>
            </div>

            <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.08]">
              <div className="flex items-center gap-2 mb-2 font-mono font-semibold text-plasma">
                <Cpu className="w-4 h-4" />
                <span>03 // NLP & Matching</span>
              </div>
              <ul className="space-y-1.5 text-mute leading-relaxed text-[11px]">
                <li>• Unigram & bigram n-gram tokenization</li>
                <li>• Sublinear term-frequency scaling</li>
                <li>• Cosine vector similarity calculation</li>
                <li>• Deterministic taxonomy mapping</li>
              </ul>
            </div>

            <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.08]">
              <div className="flex items-center gap-2 mb-2 font-mono font-semibold text-amber-warn">
                <Database className="w-4 h-4" />
                <span>04 // Persistence</span>
              </div>
              <ul className="space-y-1.5 text-mute leading-relaxed text-[11px]">
                <li>• SQLite local database file</li>
                <li>• localStorage browser sync</li>
                <li>• Immutable security audit trail</li>
                <li>• Standalone HTML report export</li>
              </ul>
            </div>
          </div>
        </GlowPanel>
      </motion.div>

      {/* Step-by-Step Local Setup Guide */}
      <motion.div variants={riseIn}>
        <GlowPanel className="p-6">
          <h2 className="text-base font-display font-semibold text-ink mb-1.5">
            Local Development & Execution Setup
          </h2>
          <p className="text-xs text-mute mb-5">
            Run the following commands in Windows PowerShell to activate the local daemon:
          </p>

          <div className="space-y-3.5">
            {setupCommands.map((cmd, idx) => (
              <div key={idx} className="rounded-xl border border-white/[0.08] overflow-hidden bg-obsidian">
                <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.03] border-b border-white/[0.08] text-xs font-semibold text-ink">
                  <span className="font-mono text-[11px]">{cmd.title}</span>
                  <button
                    onClick={() => copyCode(cmd.code, idx)}
                    className="flex items-center gap-1.5 text-[11px] font-mono text-mute hover:text-mint transition-colors"
                  >
                    {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-mint" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedIndex === idx ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-4 text-porcelain/85 font-mono text-xs overflow-x-auto leading-relaxed">
                  <code>{cmd.code}</code>
                </pre>
              </div>
            ))}
          </div>
        </GlowPanel>
      </motion.div>

      {/* Directory Structure & File Inventory */}
      <motion.div variants={riseIn}>
        <GlowPanel className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <FolderTree className="w-4 h-4 text-mint" />
            <h2 className="text-sm font-display font-semibold text-ink">
              Core Backend Modules Inventory
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 bg-white/[0.02] rounded-xl border border-white/[0.08]">
              <span className="font-mono font-semibold text-mint block mb-1">backend/app.py</span>
              <span className="text-mute text-[11px]">Flask HTTP entrypoint, route handlers, CORS configuration, and telemetry endpoints.</span>
            </div>
            <div className="p-3.5 bg-white/[0.02] rounded-xl border border-white/[0.08]">
              <span className="font-mono font-semibold text-ion block mb-1">backend/nlp_engine.py</span>
              <span className="text-mute text-[11px]">TF-IDF calculation, cosine similarity metric, and taxonomy skill extraction pipeline.</span>
            </div>
            <div className="p-3.5 bg-white/[0.02] rounded-xl border border-white/[0.08]">
              <span className="font-mono font-semibold text-plasma block mb-1">backend/parser.py</span>
              <span className="text-mute text-[11px]">Multi-format file parser converting PDF and DOCX binary streams into clean plaintext.</span>
            </div>
            <div className="p-3.5 bg-white/[0.02] rounded-xl border border-white/[0.08]">
              <span className="font-mono font-semibold text-amber-warn block mb-1">backend/database.py</span>
              <span className="text-mute text-[11px]">SQLite schema migrations, record persistence, queries, and audit trail storage.</span>
            </div>
            <div className="p-3.5 bg-white/[0.02] rounded-xl border border-white/[0.08]">
              <span className="font-mono font-semibold text-ion block mb-1">backend/schema.sql</span>
              <span className="text-mute text-[11px]">Relational tables for comparison history, security inspections, and audit logs.</span>
            </div>
            <div className="p-3.5 bg-white/[0.02] rounded-xl border border-white/[0.08]">
              <span className="font-mono font-semibold text-mint block mb-1">backend/requirements.txt</span>
              <span className="text-mute text-[11px]">Pinned Python dependencies including Flask, scikit-learn, PyMuPDF, and python-docx.</span>
            </div>
          </div>
        </GlowPanel>
      </motion.div>
    </motion.div>
  );
};
