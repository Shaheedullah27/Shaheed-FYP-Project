import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Upload,
  FileText,
  Briefcase,
  Sparkles,
  CheckCircle,
  Trash2,
  Sliders,
  Info,
  AlertCircle,
  Loader2,
  FileCheck
} from 'lucide-react';
import { SAMPLE_RESUMES, SAMPLE_JOB_DESCRIPTIONS } from '../../data/sampleData';
import { parseDocumentFile } from '../../services/documentParser';
import { GlowPanel } from '../ui/GlowPanel';
import { cn, riseIn, stagger } from '../../lib/ui';

interface AnalyzeViewProps {
  onRunAnalysis: (
    resumeText: string, 
    jdText: string, 
    resumeTitle: string, 
    jobTitle: string
  ) => void;
  isLoading: boolean;
  initialResumeText?: string;
  initialJdText?: string;
}

export const AnalyzeView: React.FC<AnalyzeViewProps> = ({
  onRunAnalysis,
  isLoading,
  initialResumeText = '',
  initialJdText = ''
}) => {
  const [resumeText, setResumeText] = useState(initialResumeText || SAMPLE_RESUMES[0].text);
  const [resumeTitle, setResumeTitle] = useState('Alex Chen — Full Stack Software Engineer');
  const [jobDescriptionText, setJobDescriptionText] = useState(initialJdText || SAMPLE_JOB_DESCRIPTIONS[0].text);
  const [jobTitle, setJobTitle] = useState('Senior / Mid-Level Full Stack Engineer');
  const [companyName, setCompanyName] = useState('Acme SaaS Inc.');
  const [isDragOver, setIsDragOver] = useState(false);
  
  // File upload state & feedback
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Advanced Algorithm Tuning Settings
  const [includeBigrams, setIncludeBigrams] = useState(true);
  const [filterStopwords, setFilterStopwords] = useState(true);
  const [showOptions, setShowOptions] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resumeWordCount = resumeText.trim().split(/\s+/).filter(Boolean).length;
  const jdWordCount = jobDescriptionText.trim().split(/\s+/).filter(Boolean).length;

  const handleSelectSampleResume = (id: string) => {
    const sample = SAMPLE_RESUMES.find(r => r.id === id);
    if (sample) {
      setResumeText(sample.text);
      setResumeTitle(sample.title);
      setUploadFeedback({ message: `Loaded sample resume: ${sample.title}`, type: 'info' });
      setValidationError(null);
    }
  };

  const handleSelectSampleJd = (id: string) => {
    const sample = SAMPLE_JOB_DESCRIPTIONS.find(j => j.id === id);
    if (sample) {
      setJobDescriptionText(sample.text);
      setJobTitle(sample.title);
      setCompanyName(sample.subtitle.split('—')[0].trim());
      setValidationError(null);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploadFeedback(null);
    setValidationError(null);
    setIsParsingFile(true);

    try {
      const result = await parseDocumentFile(file);

      if (result.error) {
        setUploadFeedback({
          message: result.error,
          type: 'error'
        });
      } else if (result.text) {
        setResumeText(result.text);
        const autoTitle = file.name.replace(/\.[^/.]+$/, '');
        setResumeTitle(autoTitle);
        setUploadFeedback({
          message: `Read "${file.name}" and found ${result.wordCount} words.`,
          type: 'success'
        });
      }
    } catch (err: any) {
      setUploadFeedback({
        message: err.message || 'Could not read this file. Try another document.',
        type: 'error'
      });
    } finally {
      setIsParsingFile(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validation checks
    const resWords = resumeText.trim().split(/\s+/).filter(Boolean).length;
    const jdWords = jobDescriptionText.trim().split(/\s+/).filter(Boolean).length;

    if (!resumeText.trim()) {
      setValidationError('Add your resume by uploading a file or pasting its text.');
      return;
    }
    if (resWords < 15) {
      setValidationError('The resume is too short. Add more of its text before comparing.');
      return;
    }
    if (!jobDescriptionText.trim()) {
      setValidationError('Add the job posting by pasting its text.');
      return;
    }
    if (jdWords < 15) {
      setValidationError('The job posting is too short. Paste more of its text before comparing.');
      return;
    }

    onRunAnalysis(resumeText, jobDescriptionText, resumeTitle, jobTitle);
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div
        variants={riseIn}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.12em] text-[#79F2C0] mb-1.5">
            <FileCheck className="w-3.5 h-3.5" />
            <span>Match Studio</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-heading font-extrabold tracking-tight text-porcelain">
            Compare a resume with a job posting
          </h1>
          <p className="text-xs text-silver mt-1">
            Upload a resume or paste its text, then paste the job posting. We’ll compare the wording and skills.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowOptions(!showOptions)}
            aria-expanded={showOptions}
            className={cn(
              'btn-ghost px-3 py-2 text-xs cursor-pointer',
              showOptions && 'border-[#79F2C0]/40 text-[#79F2C0] bg-[#79F2C0]/10'
            )}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Scoring options</span>
          </button>
        </div>
      </motion.div>

      {/* Validation Error Banner */}
      {validationError && (
        <motion.div
          role="alert"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-[#FF777F]/10 border border-[#FF777F]/30 rounded-xl flex items-start gap-3 text-xs text-[#FF777F]"
        >
          <AlertCircle className="w-4 h-4 text-[#FF777F] shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block mb-0.5 text-porcelain">Please check your text</span>
            <span className="text-silver">{validationError}</span>
          </div>
          <button
            type="button"
            onClick={() => setValidationError(null)}
            aria-label="Dismiss error"
            className="text-[#FF777F] hover:text-white font-bold ml-2 cursor-pointer"
          >
            ×
          </button>
        </motion.div>
      )}

      {/* Algorithm Tuning Options Accordion */}
      {showOptions && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          <GlowPanel className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-ink">
              <Info className="w-4 h-4 text-[#7DEFFF]" />
              <span>How text is compared</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <label className="flex items-center gap-2.5 cursor-pointer text-mute hover:text-ink transition-colors">
                <input
                  type="checkbox"
                  checked={includeBigrams}
                  onChange={(e) => setIncludeBigrams(e.target.checked)}
                  className="rounded border-white/20 bg-[#0B0D12] text-[#79F2C0] focus:ring-[#79F2C0]/40"
                />
                <span>Compare single words and two-word phrases</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer text-silver hover:text-porcelain transition-colors">
                <input
                  type="checkbox"
                  checked={filterStopwords}
                  onChange={(e) => setFilterStopwords(e.target.checked)}
                  className="rounded border-white/20 bg-[#0B0D12] text-[#79F2C0] focus:ring-[#79F2C0]/40"
                />
                <span>Ignore common words such as “the” and “and”</span>
              </label>
            </div>
          </GlowPanel>
        </motion.div>
      )}

      {/* Main Two-Column Input Workspace */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Candidate Resume Column */}
          <motion.div variants={riseIn}>
            <GlowPanel glow className="p-5 h-full flex flex-col">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-[#79F2C0]/10 border border-[#79F2C0]/25 text-[#79F2C0]">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-heading font-bold text-porcelain">Your resume</h2>
                    <span className="text-[11px] text-silver">Upload a file or paste the text</span>
                  </div>
                </div>
                <div className="text-[11px] font-mono tabular-nums text-silver px-2 py-1 rounded-md bg-white/5 border border-white/10">
                  {resumeWordCount} words
                </div>
              </div>

              {/* Title & Preset Bar */}
              <div className="space-y-3 mb-4">
                <div>
                  <label htmlFor="resume-title" className="block text-[11px] font-medium text-silver mb-1.5">
                    Resume name
                  </label>
                  <input
                    id="resume-title"
                    type="text"
                    value={resumeTitle}
                    onChange={(e) => setResumeTitle(e.target.value)}
                    placeholder="Candidate Name or Resume Title"
                    className="field"
                  />
                </div>

                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] text-silver pt-1">Sample resumes:</span>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {SAMPLE_RESUMES.map((res) => (
                      <button
                        key={res.id}
                        type="button"
                        onClick={() => handleSelectSampleResume(res.id)}
                        className="px-2.5 py-1 text-[11px] font-medium text-silver bg-white/5 border border-white/10 hover:text-porcelain hover:border-[#79F2C0]/40 hover:bg-[#79F2C0]/10 rounded-md transition-all cursor-pointer"
                      >
                        {res.role}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* File Drag and Drop Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                aria-label="Upload a resume file"
                className={cn(
                  'relative rounded-xl border-2 border-dashed p-5 text-center cursor-pointer mb-3 transition-all duration-200',
                  isDragOver
                    ? 'border-[#79F2C0] bg-[#79F2C0]/10 shadow-[0_0_32px_-6px_rgba(121,242,192,0.4)] scale-[1.01]'
                    : 'border-white/[0.12] bg-[#131720]/70 hover:border-[#79F2C0]/50 hover:bg-[#131720]'
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.txt,.md"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  className="hidden"
                />
                <div className="flex flex-col items-center justify-center gap-2">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center border transition-colors',
                      isDragOver
                        ? 'bg-[#79F2C0]/20 border-[#79F2C0]/50 text-[#79F2C0]'
                        : 'bg-white/5 border-white/10 text-[#79F2C0]'
                    )}
                  >
                    {isParsingFile ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#79F2C0]" />
                    ) : (
                      <Upload className="w-4 h-4 text-[#79F2C0]" />
                    )}
                  </div>
                  <div className="text-xs text-silver">
                    {isParsingFile ? (
                      <span className="text-porcelain font-semibold">Reading document…</span>
                    ) : (
                      <>
                        Drop resume here or{' '}
                        <span className="font-semibold text-[#79F2C0]">browse file</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {['PDF', 'DOCX', 'TXT'].map((fmt) => (
                      <span
                        key={fmt}
                        className="text-[9px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded border border-white/12 bg-white/5 text-silver"
                      >
                        {fmt}
                      </span>
                    ))}
                    <span className="text-[9px] text-silver/60">up to 10 MB</span>
                  </div>
                </div>
              </div>

              {uploadFeedback && (
                <div
                  role="status"
                  className={cn(
                    'mb-3 px-3 py-2.5 rounded-lg text-xs flex items-start justify-between gap-2 border',
                    uploadFeedback.type === 'error'
                      ? 'bg-rose-500/10 text-rose-200 border-rose-400/30'
                      : uploadFeedback.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-200 border-emerald-400/30'
                      : 'bg-[#35E7FF]/8 text-[#9FE9FF] border-[#35E7FF]/25'
                  )}
                >
                  <div className="flex items-start gap-2">
                    {uploadFeedback.type === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-emerald-300 shrink-0" />
                    ) : uploadFeedback.type === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />
                    ) : (
                      <Info className="w-4 h-4 text-[#7DEFFF] shrink-0" />
                    )}
                    <span>{uploadFeedback.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadFeedback(null)}
                    aria-label="Dismiss message"
                    className="font-bold shrink-0 text-mute hover:text-ink"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Text Area */}
              <div className="flex-1 flex flex-col">
                <label htmlFor="resume-text" className="block text-[11px] font-semibold text-mute mb-1.5">
                  Resume text
                </label>
                <textarea
                  id="resume-text"
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  rows={14}
                  placeholder="Paste your resume text here. Include skills, experience, education, and projects if you have them."
                  className="field flex-1 min-h-52"
                  required
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-mute">
                <span>Your text is processed on this device</span>
                <button
                  type="button"
                  onClick={() => setResumeText('')}
                  className="text-mute hover:text-rose-300 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              </div>
            </GlowPanel>
          </motion.div>

          {/* RIGHT: Job Description Column */}
          <motion.div variants={riseIn}>
            <GlowPanel glow className="p-5 h-full flex flex-col">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-[#62D9F5]/10 border border-[#62D9F5]/25 text-[#62D9F5]">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-heading font-bold text-porcelain">Job posting</h2>
                    <span className="text-[11px] text-silver">The role and its requirements</span>
                  </div>
                </div>
                <div className="text-[11px] font-mono tabular-nums text-silver px-2 py-1 rounded-md bg-white/5 border border-white/10">
                  {jdWordCount} words
                </div>
              </div>

              {/* Job Title & Preset Bar */}
              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label htmlFor="job-title" className="block text-[11px] font-medium text-silver mb-1.5">
                      Job title
                    </label>
                    <input
                      id="job-title"
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="e.g. Full Stack Engineer"
                      className="field"
                    />
                  </div>
                  <div>
                    <label htmlFor="company-name" className="block text-[11px] font-medium text-silver mb-1.5">
                      Company Name
                    </label>
                    <input
                      id="company-name"
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Acme Corp"
                      className="field"
                    />
                  </div>
                </div>

                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] text-silver pt-1">Sample job postings:</span>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {SAMPLE_JOB_DESCRIPTIONS.map((jd) => (
                      <button
                        key={jd.id}
                        type="button"
                        onClick={() => handleSelectSampleJd(jd.id)}
                        className="px-2.5 py-1 text-[11px] font-medium text-silver bg-white/5 border border-white/10 hover:text-porcelain hover:border-[#62D9F5]/40 hover:bg-[#62D9F5]/10 rounded-md transition-all cursor-pointer"
                      >
                        {jd.role}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Text Area */}
              <div className="flex-1 flex flex-col">
                <label htmlFor="jd-text" className="block text-[11px] font-semibold text-mute mb-1.5">
                  Job posting text
                </label>
                <textarea
                  id="jd-text"
                  value={jobDescriptionText}
                  onChange={(e) => setJobDescriptionText(e.target.value)}
                  rows={17}
                  placeholder="Paste the job posting here, including the role, required skills, and responsibilities."
                  className="field flex-1 min-h-52"
                  required
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-mute">
                <span>We check for skills from the app’s skills list</span>
                <button
                  type="button"
                  onClick={() => setJobDescriptionText('')}
                  className="text-mute hover:text-rose-300 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              </div>
            </GlowPanel>
          </motion.div>
        </div>

        {/* Action Row */}
        <motion.div variants={riseIn}>
          <GlowPanel glow className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-xs text-silver">
              <Info className="w-4 h-4 text-[#62D9F5] shrink-0" />
              <span>These scores provide alignment guidance, not an automated hiring probability.</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="submit"
                disabled={isLoading || isParsingFile}
                className="btn-primary w-full sm:w-auto px-6 py-2.5 text-xs"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Comparing your resume and the job posting…</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" strokeWidth={2.4} />
                    <span>Compare now</span>
                  </>
                )}
              </button>
            </div>
          </GlowPanel>
        </motion.div>
      </form>
    </motion.div>
  );
};
