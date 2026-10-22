import React, { useState, useEffect } from 'react';
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
  FolderTree
} from 'lucide-react';
import { checkFlaskHealth, getFlaskUrl, setFlaskUrl, getEngineMode, setEngineMode } from '../../services/api';

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
    { title: '1. Create and activate the Python environment (Windows)', code: 'cd backend\npy -3.12 -m venv venv\n.\\venv\\Scripts\\Activate.ps1' },
    { title: '2. Install backend packages', code: 'python -m pip install -r requirements.txt' },
    { title: '3. Start the backend', code: 'python app.py' },
    { title: '4. In a second terminal, start the website from the project folder', code: 'npm install\nnpm run dev' }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="p-6 panel">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#7DEFFF] font-semibold mb-1">
              <Terminal className="w-4 h-4" />
              <span>How the app works</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-ink">
              How the website, backend, and database work together
            </h1>
            <p className="text-xs text-mute mt-1">
              You can compare resumes in your browser or use the Python backend running on your computer.
            </p>
          </div>

          {/* Engine Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-white/8 rounded-lg text-xs shrink-0">
            <button
              onClick={() => handleToggleMode('browser')}
              className={`px-3 py-1.5 rounded-md transition-colors ${engineMode === 'browser' ? 'bg-[#35E7FF] font-bold text-[#05080F] shadow-[0_6px_18px_-8px_rgba(53,231,255,0.7)]' : 'text-mute'}`}
            >
              In this browser
            </button>
            <button
              onClick={() => handleToggleMode('flask')}
              className={`px-3 py-1.5 rounded-md transition-colors ${engineMode === 'flask' ? 'bg-[#35E7FF] font-bold text-[#05080F] shadow-[0_6px_18px_-8px_rgba(53,231,255,0.7)]' : 'text-mute'}`}
            >
              Python backend
            </button>
          </div>
        </div>
      </div>

      {/* Live Server Connection Card */}
      <div className="p-6 panel">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/8">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-[#7DEFFF]" />
            <h2 className="text-sm font-bold text-ink">
              Flask API Server Connection
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {healthStatus.checking ? (
              <span className="text-xs text-mute/80">Checking connection...</span>
            ) : healthStatus.connected ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-400/10 px-2.5 py-1 rounded-md border border-emerald-400/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Connected (version {healthStatus.version})</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-mute bg-white/8 px-2.5 py-1 rounded-md">
                <AlertCircle className="w-3.5 h-3.5 text-mute/80" />
                <span>Python backend is not running</span>
              </span>
            )}
            <button
              onClick={checkConnection}
              disabled={healthStatus.checking}
              className="p-1.5 text-mute hover:text-ink rounded-md hover:bg-white/8 transition-colors"
              title="Check the connection"
            >
              <RefreshCw className={`w-4 h-4 ${healthStatus.checking ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="md:col-span-2">
            <label className="block text-[11px] font-medium text-mute mb-1">
              Backend address
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={flaskUrl}
                onChange={handleUrlChange}
                placeholder="http://localhost:5000"
                className="w-full px-3 py-2 font-mono text-xs border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35E7FF]/25 focus:border-[#35E7FF]/60 text-ink/85"
              />
              <button
                onClick={checkConnection}
                className="px-4 py-2 btn-primary font-medium rounded-lg transition-colors whitespace-nowrap"
              >
                Check connection
              </button>
            </div>
          </div>

          <div className="p-3 bg-white/[0.03] rounded-lg border border-white/8">
            <div className="font-semibold text-ink/85 mb-1">If the backend is offline</div>
            <p className="text-[11px] text-mute leading-relaxed">
              The app can still compare text in your browser if the Python backend is not running.
            </p>
          </div>
        </div>
      </div>

      {/* Architecture Flow Diagram */}
      <div className="p-6 panel">
        <h2 className="text-sm font-bold text-ink mb-4">
          How a comparison works
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="p-4 bg-white/[0.03] rounded-xl border border-white/10">
            <div className="flex items-center gap-2 mb-2 font-bold text-[#7DEFFF]">
              <Code2 className="w-4 h-4" />
              <span>1. Website</span>
            </div>
            <ul className="space-y-1 text-mute leading-relaxed text-[11px]">
              <li>• Shows the pages and results</li>
              <li>• Lets you upload or paste a resume</li>
              <li>• Displays charts and skill matches</li>
              <li>• Can compare text in your browser</li>
            </ul>
          </div>

          <div className="p-4 bg-white/[0.03] rounded-xl border border-white/10">
            <div className="flex items-center gap-2 mb-2 font-bold text-[#C4B5FD]">
              <Server className="w-4 h-4" />
              <span>2. Python backend</span>
            </div>
            <ul className="space-y-1 text-mute leading-relaxed text-[11px]">
              <li>• Receives comparison requests</li>
              <li>• Reads PDF and Word files</li>
              <li>• Runs the text and skill checks</li>
              <li>• Sends results back to the website</li>
            </ul>
          </div>

          <div className="p-4 bg-white/[0.03] rounded-xl border border-white/10">
            <div className="flex items-center gap-2 mb-2 font-bold text-[#7DEFFF]">
              <Cpu className="w-4 h-4" />
              <span>3. Text comparison</span>
            </div>
            <ul className="space-y-1 text-mute leading-relaxed text-[11px]">
              <li>• Gives useful words more weight</li>
              <li>• Checks single words and phrases</li>
              <li>• Measures how much the texts overlap</li>
              <li>• Groups skills by category</li>
            </ul>
          </div>

          <div className="p-4 bg-white/[0.03] rounded-xl border border-white/10">
            <div className="flex items-center gap-2 mb-2 font-bold text-emerald-300">
              <Database className="w-4 h-4" />
              <span>4. Saved results</span>
            </div>
            <ul className="space-y-1 text-mute leading-relaxed text-[11px]">
              <li>• Stored in a local SQLite file</li>
              <li>• Keeps past comparisons</li>
              <li>• Lets you reopen or delete results</li>
              <li>• Does not require an online database</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Step-by-Step Local Setup Guide */}
      <div className="p-6 panel">
        <h2 className="text-base font-bold text-ink mb-2">
          Run both parts of the app
        </h2>
        <p className="text-xs text-mute mb-6">
          Use the commands below in PowerShell. Keep the backend and website running in separate terminals:
        </p>

        <div className="space-y-4">
          {setupCommands.map((cmd, idx) => (
            <div key={idx} className="panel overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.03] border-b border-white/10 text-xs font-semibold text-ink/85">
                <span>{cmd.title}</span>
                <button
                  onClick={() => copyCode(cmd.code, idx)}
                  className="flex items-center gap-1 text-[11px] text-mute hover:text-ink transition-colors"
                >
                  {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedIndex === idx ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-4 bg-[#0B132B] text-ink/80 font-mono text-xs overflow-x-auto">
                <code>{cmd.code}</code>
              </pre>
            </div>
          ))}
        </div>
      </div>

      {/* Directory Structure & File Inventory */}
      <div className="p-6 panel">
        <div className="flex items-center gap-2 mb-3">
          <FolderTree className="w-4 h-4 text-[#7DEFFF]" />
          <h2 className="text-sm font-bold text-ink">
            Backend files
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-white/[0.03] rounded-lg border border-white/10">
            <span className="font-mono font-bold text-[#7DEFFF] block mb-0.5">backend/app.py</span>
            <span className="text-mute text-[11px]">Starts the backend and handles requests from the website.</span>
          </div>
          <div className="p-3 bg-white/[0.03] rounded-lg border border-white/10">
            <span className="font-mono font-bold text-[#7DEFFF] block mb-0.5">backend/nlp_engine.py</span>
            <span className="text-mute text-[11px]">Compares resume text and checks for job skills.</span>
          </div>
          <div className="p-3 bg-white/[0.03] rounded-lg border border-white/10">
            <span className="font-mono font-bold text-[#7DEFFF] block mb-0.5">backend/parser.py</span>
            <span className="text-mute text-[11px]">Reads text from PDF and Word files.</span>
          </div>
          <div className="p-3 bg-white/[0.03] rounded-lg border border-white/10">
            <span className="font-mono font-bold text-[#7DEFFF] block mb-0.5">backend/database.py</span>
            <span className="text-mute text-[11px]">Saves, loads, and deletes comparison history.</span>
          </div>
          <div className="p-3 bg-white/[0.03] rounded-lg border border-white/10">
            <span className="font-mono font-bold text-[#7DEFFF] block mb-0.5">backend/schema.sql</span>
            <span className="text-mute text-[11px]">Describes how comparison data is stored.</span>
          </div>
          <div className="p-3 bg-white/[0.03] rounded-lg border border-white/10">
            <span className="font-mono font-bold text-[#7DEFFF] block mb-0.5">backend/requirements.txt</span>
            <span className="text-mute text-[11px]">Lists the Python packages the backend needs.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
