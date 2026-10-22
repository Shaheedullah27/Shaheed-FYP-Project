import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Terminal, 
  Cpu, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  Server, 
  Layers, 
  Code2, 
  RefreshCw,
  FolderTree,
  Sparkles
} from 'lucide-react';
import { checkFlaskHealth, getFlaskUrl, setFlaskUrl, getEngineMode, setEngineMode } from '../../services/api';
import { GlowPanel } from '../ui/GlowPanel';
import { cn, riseIn, stagger } from '../../lib/ui';

export const BackendGuideView: React.FC = () => {
  const [flaskUrl, setFlaskUrlState] = useState(getFlaskUrl());
  const [engineMode, setEngineModeState] = useState<'browser' | 'flask'>(getEngineMode());
  const [healthStatus, setHealthStatus] = useState<{
    checking: boolean;
    connected: boolean;
    version?: string;
    error?: string;
  }>({
    checking: false,
    connected: false
  });
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const checkConnection = async () => {
    setHealthStatus(prev => ({ ...prev, checking: true }));
    const result = await checkFlaskHealth();
    setHealthStatus({
      checking: false,
      connected: result.connected,
      version: result.version,
      error: result.error
    });
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFlaskUrlState(val);
    setFlaskUrl(val);
  };

  const handleToggleMode = (mode: 'browser' | 'flask') => {
    setEngineModeState(mode);
    setEngineMode(mode);
  };

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
        <GlowPanel glow className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#79F2C0] mb-1">
              <Terminal className="w-4 h-4" />
              <span>SYSTEM ARCHITECTURE & RUNTIME</span>
            </div>
            <h1 className="text-xl md:text-2xl font-display font-bold tracking-tight text-ink">
              Dual-Engine Topology & Local Deployment
            </h1>
            <p className="text-xs text-mute mt-0.5">
              Run standalone in client browser or connect to the Python Flask microservice with SQLite persistence.
            </p>
          </div>

          {/* Engine Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs shrink-0">
            <button
              onClick={() => handleToggleMode('browser')}
              className={cn(
                'px-3 py-1.5 rounded-lg font-mono text-[11px] transition-colors',
                engineMode === 'browser' 
                  ? 'bg-[#79F2C0] text-[#0B0D12] font-bold shadow-[0_0_12px_rgba(121,242,192,0.3)]' 
                  : 'text-mute hover:text-ink'
              )}
            >
              In-Browser Engine
            </button>
            <button
              onClick={() => handleToggleMode('flask')}
              className={cn(
                'px-3 py-1.5 rounded-lg font-mono text-[11px] transition-colors',
                engineMode === 'flask' 
                  ? 'bg-[#79F2C0] text-[#0B0D12] font-bold shadow-[0_0_12px_rgba(121,242,192,0.3)]' 
                  : 'text-mute hover:text-ink'
              )}
            >
              Flask Python Daemon
            </button>
          </div>
        </GlowPanel>
      </motion.div>

      {/* Live Server Connection Card */}
      <motion.div variants={riseIn}>
        <GlowPanel className="p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-[#79F2C0]" />
              <h2 className="text-sm font-display font-bold text-ink">
                Flask Microservice Connection Status
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {healthStatus.checking ? (
                <span className="text-xs font-mono text-mute">Checking connection...</span>
              ) : healthStatus.connected ? (
                <span className="flex items-center gap-1.5 text-xs font-mono text-[#79F2C0] bg-[#79F2C0]/10 px-2.5 py-1 rounded-full border border-[#79F2C0]/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Online (v{healthStatus.version})</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-mono text-mute bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/[0.08]">
                  <AlertCircle className="w-3.5 h-3.5 text-[#F4BD73]" />
                  <span>Daemon Offline</span>
                </span>
              )}
              <button
                onClick={checkConnection}
                disabled={healthStatus.checking}
                className="p-1.5 text-mute hover:text-ink rounded-lg hover:bg-white/[0.08] transition-colors"
                title="Probe endpoint health"
              >
                <RefreshCw className={cn("w-4 h-4", healthStatus.checking && "animate-spin text-[#79F2C0]")} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-mono text-mute mb-1">
                Flask REST API Base Endpoint
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={flaskUrl}
                  onChange={handleUrlChange}
                  placeholder="http://localhost:5000"
                  className="field font-mono"
                />
                <button
                  onClick={checkConnection}
                  className="btn-primary text-xs whitespace-nowrap"
                >
                  Probe Endpoint
                </button>
              </div>
            </div>

            <div className="p-3.5 bg-white/[0.02] rounded-xl border border-white/[0.06]">
              <div className="font-semibold text-ink mb-1">Autonomous Offline Mode</div>
              <p className="text-[11px] text-mute leading-relaxed">
                If the Python server is offline, the client seamlessly falls back to the in-memory TF-IDF and regex engine. Zero setup required to test resumes.
              </p>
            </div>
          </div>
        </GlowPanel>
      </motion.div>

      {/* Architecture Flow Diagram */}
      <motion.div variants={riseIn}>
        <GlowPanel className="p-6">
          <h2 className="text-sm font-display font-bold text-ink mb-4">
            Component Architecture & Data Lifecycle
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.08]">
              <div className="flex items-center gap-2 mb-2 font-mono font-bold text-[#79F2C0]">
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
              <div className="flex items-center gap-2 mb-2 font-mono font-bold text-[#62D9F5]">
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
              <div className="flex items-center gap-2 mb-2 font-mono font-bold text-[#A99BFF]">
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
              <div className="flex items-center gap-2 mb-2 font-mono font-bold text-[#F4BD73]">
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
          <h2 className="text-base font-display font-bold text-ink mb-1.5">
            Local Development & Execution Setup
          </h2>
          <p className="text-xs text-mute mb-5">
            Run the following commands in Windows PowerShell to activate the local daemon:
          </p>

          <div className="space-y-3.5">
            {setupCommands.map((cmd, idx) => (
              <div key={idx} className="rounded-xl border border-white/[0.08] overflow-hidden bg-[#0B0D12]">
                <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.03] border-b border-white/[0.08] text-xs font-semibold text-ink">
                  <span className="font-mono text-[11px]">{cmd.title}</span>
                  <button
                    onClick={() => copyCode(cmd.code, idx)}
                    className="flex items-center gap-1.5 text-[11px] font-mono text-mute hover:text-[#79F2C0] transition-colors"
                  >
                    {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-[#79F2C0]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedIndex === idx ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-4 text-[#F1F0EA]/85 font-mono text-xs overflow-x-auto leading-relaxed">
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
            <FolderTree className="w-4 h-4 text-[#79F2C0]" />
            <h2 className="text-sm font-display font-bold text-ink">
              Core Backend Modules Inventory
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 bg-white/[0.02] rounded-xl border border-white/[0.08]">
              <span className="font-mono font-bold text-[#79F2C0] block mb-1">backend/app.py</span>
              <span className="text-mute text-[11px]">Flask HTTP entrypoint, route handlers, CORS configuration, and telemetry endpoints.</span>
            </div>
            <div className="p-3.5 bg-white/[0.02] rounded-xl border border-white/[0.08]">
              <span className="font-mono font-bold text-[#62D9F5] block mb-1">backend/nlp_engine.py</span>
              <span className="text-mute text-[11px]">TF-IDF calculation, cosine similarity metric, and taxonomy skill extraction pipeline.</span>
            </div>
            <div className="p-3.5 bg-white/[0.02] rounded-xl border border-white/[0.08]">
              <span className="font-mono font-bold text-[#A99BFF] block mb-1">backend/parser.py</span>
              <span className="text-mute text-[11px]">Multi-format file parser converting PDF and DOCX binary streams into clean plaintext.</span>
            </div>
            <div className="p-3.5 bg-white/[0.02] rounded-xl border border-white/[0.08]">
              <span className="font-mono font-bold text-[#F4BD73] block mb-1">backend/database.py</span>
              <span className="text-mute text-[11px]">SQLite schema migrations, record persistence, queries, and audit trail storage.</span>
            </div>
            <div className="p-3.5 bg-white/[0.02] rounded-xl border border-white/[0.08]">
              <span className="font-mono font-bold text-[#62D9F5] block mb-1">backend/schema.sql</span>
              <span className="text-mute text-[11px]">Relational tables for comparison history, security inspections, and audit logs.</span>
            </div>
            <div className="p-3.5 bg-white/[0.02] rounded-xl border border-white/[0.08]">
              <span className="font-mono font-bold text-[#79F2C0] block mb-1">backend/requirements.txt</span>
              <span className="text-mute text-[11px]">Pinned Python dependencies including Flask, scikit-learn, PyMuPDF, and python-docx.</span>
            </div>
          </div>
        </GlowPanel>
      </motion.div>
    </motion.div>
  );
};
