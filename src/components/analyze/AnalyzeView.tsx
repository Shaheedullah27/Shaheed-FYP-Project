import React, { useMemo, useRef, useState } from 'react';
import {
  Upload,
  FileText,
  Sparkles,
  CheckCircle,
  X,
  AlertCircle,
  Loader2,
  RotateCw,
  ClipboardPaste,
  Info,
  Bot,
} from 'lucide-react';
import { SAMPLE_RESUMES, SAMPLE_JOB_DESCRIPTIONS } from '../../data/sampleData';
import { ACCEPTED_FILE_TYPES, validateDocumentFile } from '../../services/fileValidation';
import { deriveJobTitle } from '../../services/progress';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Button } from '../ui/Button';
import { cn, prefersReducedMotion } from '../../lib/ui';

interface AnalyzeViewProps {
  onRunAnalysis: (
    resumeText: string,
    jdText: string,
    resumeTitle: string,
    jobTitle: string,
    /** Explicit consent for sending the resume text and job description to Google Gemini. */
    useGemini: boolean
  ) => void;
  isLoading: boolean;
  /** User-facing failure message from the last attempt, if any. */
  error?: string | null;
  onDismissError?: () => void;
  initialResumeText?: string;
  initialJdText?: string;
}

interface SelectedFile {
  name: string;
  size: number;
  wordCount: number;
}

const MIN_WORDS = 15;

const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const StepHeading: React.FC<{ step: number; title: string; description: string }> = ({
  step,
  title,
  description,
}) => (
  <div className="mb-4 flex items-start gap-3">
    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-mint/30 bg-mint/10 font-mono text-xs font-semibold text-mint">
      {step}
    </span>
    <div className="min-w-0">
      <h2 className="font-heading text-base font-semibold text-porcelain">{title}</h2>
      <p className="mt-0.5 text-sm leading-relaxed text-silver">{description}</p>
    </div>
  </div>
);

export const AnalyzeView: React.FC<AnalyzeViewProps> = ({
  onRunAnalysis,
  isLoading,
  error,
  onDismissError,
  initialResumeText = '',
  initialJdText = '',
}) => {
  const [resumeText, setResumeText] = useState(initialResumeText);
  const [jobDescriptionText, setJobDescriptionText] = useState(initialJdText);
  const [resumeTitle, setResumeTitle] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  /** Per-run opt-in. Nothing reaches any external AI service unless this is on. */
  const [aiConsent, setAiConsent] = useState(false);

  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [fieldErrors, setFieldErrors] = useState<{ resume?: string; jd?: string }>({});
  const [actionNote, setActionNote] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resumeBoxRef = useRef<HTMLDivElement>(null);
  const jdBoxRef = useRef<HTMLDivElement>(null);

  const resumeWords = useMemo(() => countWords(resumeText), [resumeText]);
  const jdWords = useMemo(() => countWords(jobDescriptionText), [jobDescriptionText]);

  const resumeReady = resumeWords >= MIN_WORDS;
  const jdReady = jdWords >= MIN_WORDS;
  const canSubmit = resumeReady && jdReady && !isParsingFile;

  const disabledReason = isParsingFile
    ? 'Waiting for your file to finish reading…'
    : !resumeText.trim()
    ? 'Add your resume to continue.'
    : !resumeReady
    ? `Add a little more resume text (at least ${MIN_WORDS} words).`
    : !jobDescriptionText.trim()
    ? 'Paste the job description to continue.'
    : !jdReady
    ? `Add a little more of the job description (at least ${MIN_WORDS} words).`
    : null;

  const handleFile = async (file: File) => {
    // Reset immediately so picking the same file twice still fires onChange.
    if (fileInputRef.current) fileInputRef.current.value = '';
    setUploadMessage(null);
    setFieldErrors(prev => ({ ...prev, resume: undefined }));
    setActionNote(null);

    const validation = validateDocumentFile(file);
    if (!validation.valid) {
      setUploadMessage({ type: 'error', text: validation.error || 'This file cannot be used.' });
      return;
    }

    setIsParsingFile(true);
    try {
      // Load the PDF/DOCX parsers only when a file is actually chosen.
      const { parseDocumentFile } = await import('../../services/documentParser');
      const result = await parseDocumentFile(file);

      if (result.error) {
        setUploadMessage({ type: 'error', text: result.error });
      } else if (result.text) {
        setResumeText(result.text);
        setResumeTitle(file.name.replace(/\.[^/.]+$/, ''));
        setSelectedFile({ name: file.name, size: file.size, wordCount: result.wordCount });
        setUploadMessage({
          type: 'success',
          text: `Added “${file.name}” (${result.wordCount} words). You can edit the text below if anything looks wrong.`,
        });
      }
    } catch {
      setUploadMessage({
        type: 'error',
        text: 'Something went wrong while reading this file. Please try another document.',
      });
    } finally {
      setIsParsingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setResumeText('');
    setUploadMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const loadExample = () => {
    const resume = SAMPLE_RESUMES[0];
    const jd = SAMPLE_JOB_DESCRIPTIONS[0];
    setResumeText(resume.text);
    setResumeTitle(resume.title);
    setJobDescriptionText(jd.text);
    setJobTitle(jd.title);
    setSelectedFile(null);
    setUploadMessage({
      type: 'success',
      text: 'Example resume and job description loaded. Edit or replace them, then run the analysis.',
    });
    setFieldErrors({});
    setActionNote(null);
  };

  const submit = () => {
    const nextErrors: typeof fieldErrors = {};
    if (!resumeText.trim()) nextErrors.resume = 'Add your resume by uploading a file or pasting the text.';
    else if (!resumeReady) nextErrors.resume = `Add at least ${MIN_WORDS} words from your resume.`;
    if (!jobDescriptionText.trim())
      nextErrors.jd = 'Paste the job description so there is something to compare against.';
    else if (!jdReady) nextErrors.jd = `Add at least ${MIN_WORDS} words from the job description.`;

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setActionNote('Check the highlighted fields above, then try again.');
      const behavior = prefersReducedMotion() ? 'auto' : 'smooth';
      if (nextErrors.resume) resumeBoxRef.current?.scrollIntoView({ block: 'center', behavior });
      else jdBoxRef.current?.scrollIntoView({ block: 'center', behavior });
      return;
    }

    setActionNote(null);
    const fallbackResumeTitle =
      resumeText
        .split('\n')
        .map(line => line.trim())
        .find(Boolean)
        ?.slice(0, 80) || 'My resume';

    onRunAnalysis(
      resumeText,
      jobDescriptionText,
      resumeTitle.trim() || fallbackResumeTitle,
      jobTitle.trim() || deriveJobTitle(jobDescriptionText) || 'Target role',
      aiConsent
    );
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    submit();
  };

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl py-8">
        <LoadingSpinner
          message={aiConsent ? 'Analyzing your resume, then generating AI insights…' : 'Analyzing your resume…'}
          hint={aiConsent ? 'The optional Gemini step can add 10–30 seconds.' : undefined}
        />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-3xl space-y-5" noValidate>
      {/* Page intro */}
      <div className="px-1">
        <h2 className="font-heading text-xl font-semibold tracking-tight text-porcelain sm:text-2xl">
          Compare your resume with a job
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-silver">
          Three steps: upload your resume, add the job description, then run the analysis. The core
          comparison runs in this app. Optional AI insights only run if you explicitly opt in below
          (step 3); otherwise nothing is sent to any third-party service.
        </p>
      </div>

      {/* Failure message from a previous attempt */}
      {error && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-coral-error/30 bg-coral-error/[0.08] p-4 sm:flex-row sm:items-start sm:justify-between"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-coral-error" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-porcelain">The analysis did not finish</p>
              <p className="mt-0.5 text-sm leading-relaxed text-silver">{error}</p>
              <p className="mt-1 text-xs text-silver">
                Your resume and job description are still here, so you can try again.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={submit}
              leftIcon={<RotateCw className="h-3.5 w-3.5" />}
            >
              Try again
            </Button>
            {onDismissError && (
              <button
                type="button"
                onClick={onDismissError}
                aria-label="Dismiss error message"
                className="rounded-lg p-2 text-silver transition-colors hover:text-porcelain"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 1 — resume */}
      <section className="panel p-5 sm:p-6" aria-label="Step 1: upload your resume">
        <div ref={resumeBoxRef}>
          <StepHeading
            step={1}
            title="Upload your resume"
            description="Drag and drop your file here, or choose a file from your device."
          />
        </div>

        <input
          ref={fileInputRef}
          id="resume-file"
          type="file"
          className="hidden"
          accept={ACCEPTED_FILE_TYPES}
          onChange={event => {
            const file = event.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        {!selectedFile && !isParsingFile && (
          <div
            onDragOver={event => {
              event.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={cn(
              'flex flex-col items-center rounded-xl border-2 border-dashed px-4 py-7 text-center transition-colors',
              isDragOver
                ? 'border-mint bg-mint/[0.06]'
                : 'border-white/[0.14] bg-white/[0.015]'
            )}
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-mint">
              <Upload className="h-4 w-4" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-porcelain">
              {isDragOver ? 'Drop your file to add it' : 'Drop your resume here'}
            </p>
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="mt-3"
              onClick={() => fileInputRef.current?.click()}
              leftIcon={<Upload className="h-4 w-4" />}
            >
              Choose file
            </Button>
            <p id="resume-file-help" className="mt-3 text-xs text-silver">
              PDF, DOCX, TXT, MD, or RTF · up to 10 MB
            </p>
          </div>
        )}

        {isParsingFile && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-4"
          >
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-mint" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-porcelain">Reading your document…</p>
              <p className="text-xs text-silver">This only takes a moment.</p>
            </div>
          </div>
        )}

        {selectedFile && !isParsingFile && (
          <div className="flex flex-col gap-3 rounded-xl border border-mint/25 bg-mint/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <FileText className="h-5 w-5 shrink-0 text-mint" aria-hidden="true" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-porcelain">{selectedFile.name}</p>
                <p className="text-xs text-silver">
                  {formatBytes(selectedFile.size)} · {selectedFile.wordCount} words read
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Replace
              </Button>
              <button
                type="button"
                onClick={handleRemoveFile}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-silver transition-colors hover:text-coral-error"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Remove
              </button>
            </div>
          </div>
        )}

        {uploadMessage && (
          <div
            role={uploadMessage.type === 'error' ? 'alert' : 'status'}
            className={cn(
              'mt-3 flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-xs leading-relaxed',
              uploadMessage.type === 'error'
                ? 'border-coral-error/30 bg-coral-error/[0.08] text-porcelain'
                : 'border-mint/25 bg-mint/[0.06] text-silver'
            )}
          >
            {uploadMessage.type === 'error' ? (
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-coral-error" aria-hidden="true" />
            ) : (
              <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint" aria-hidden="true" />
            )}
            <span>{uploadMessage.text}</span>
          </div>
        )}

        {/* Resume text — always visible so pasted resumes and fixes are possible */}
        <div className="mt-5">
          <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
            <label htmlFor="resume-text" className="text-sm font-medium text-porcelain">
              Resume text
            </label>
            <span className="font-mono text-[11px] tabular-nums text-silver">
              {resumeWords} {resumeWords === 1 ? 'word' : 'words'}
            </span>
          </div>
          <p id="resume-text-help" className="mb-2 text-xs leading-relaxed text-silver">
            Uploading a file fills this in. You can also paste your resume or correct anything the
            file reader missed.
          </p>
          <textarea
            id="resume-text"
            value={resumeText}
            onChange={event => {
              setResumeText(event.target.value);
              setFieldErrors(prev => ({ ...prev, resume: undefined }));
            }}
            rows={9}
            placeholder="Paste your resume here — include your skills, experience, projects, and education."
            aria-describedby="resume-text-help"
            aria-invalid={Boolean(fieldErrors.resume)}
            className="field"
          />
          {fieldErrors.resume && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-coral-error" role="alert">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {fieldErrors.resume}
            </p>
          )}
        </div>

        <div className="mt-3">
          <label htmlFor="resume-name" className="mb-1.5 block text-xs font-medium text-silver">
            Name this resume (optional)
          </label>
          <input
            id="resume-name"
            type="text"
            value={resumeTitle}
            onChange={event => setResumeTitle(event.target.value)}
            placeholder="For example, “Alex Chen — Software Engineer”"
            className="field"
          />
          <p className="mt-1 text-xs text-silver">Used to label this analysis in your history.</p>
        </div>
      </section>

      {/* Step 2 — job description */}
      <section className="panel p-5 sm:p-6" aria-label="Step 2: add the job description">
        <div ref={jdBoxRef}>
          <StepHeading
            step={2}
            title="Add the job description"
            description="Paste the posting so the resume can be compared with this specific role."
          />
        </div>

        <div className="mb-4">
          <label htmlFor="job-title" className="mb-1.5 block text-xs font-medium text-silver">
            Job title (optional)
          </label>
          <input
            id="job-title"
            type="text"
            value={jobTitle}
            onChange={event => setJobTitle(event.target.value)}
            placeholder="For example, “Full Stack Engineer”"
            className="field"
            aria-describedby="job-title-help"
          />
          <p id="job-title-help" className="mt-1 text-xs text-silver">
            Used to group repeat analyses in Progress. Leave blank to use the title from the posting.
          </p>
        </div>

        <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
          <label htmlFor="jd-text" className="text-sm font-medium text-porcelain">
            Job description
          </label>
          <span className="font-mono text-[11px] tabular-nums text-silver">
            {jdWords} {jdWords === 1 ? 'word' : 'words'}
          </span>
        </div>
        <p id="jd-text-help" className="mb-2 text-xs leading-relaxed text-silver">
          Include the role summary, responsibilities, and required skills. The more complete the
          posting, the more useful the comparison.
        </p>
        <div className="relative">
          <textarea
            id="jd-text"
            value={jobDescriptionText}
            onChange={event => {
              setJobDescriptionText(event.target.value);
              setFieldErrors(prev => ({ ...prev, jd: undefined }));
            }}
            rows={9}
            placeholder="Paste the job description here, including required skills and responsibilities."
            aria-describedby="jd-text-help"
            aria-invalid={Boolean(fieldErrors.jd)}
            className="field"
          />
          {!jobDescriptionText && (
            <button
              type="button"
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  if (text.trim()) {
                    setJobDescriptionText(text);
                    setFieldErrors(prev => ({ ...prev, jd: undefined }));
                    setActionNote('Pasted from your clipboard.');
                  } else {
                    setActionNote('Your clipboard is empty. Copy the job posting first.');
                  }
                } catch {
                  setActionNote('Clipboard access was blocked. Paste with Ctrl+V or ⌘V instead.');
                }
              }}
              className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-md border border-white/[0.1] bg-graphite px-2 py-1 text-[11px] font-medium text-silver transition-colors hover:text-porcelain"
            >
              <ClipboardPaste className="h-3.5 w-3.5" aria-hidden="true" />
              Paste
            </button>
          )}
        </div>
        {fieldErrors.jd && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-coral-error" role="alert">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {fieldErrors.jd}
          </p>
        )}
      </section>

      {/* Step 3 — run */}
      <section className="panel p-5 sm:p-6" aria-label="Step 3: start the analysis">
        <StepHeading
          step={3}
          title="Start the analysis"
          description="You will get a match score, matched and missing skills, improvement ideas, and an ATS check."
        />

        {/* Optional AI insights — explicit privacy consent per the project charter */}
        <div className="mb-5 rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
          <label
            htmlFor="ai-consent"
            className="flex cursor-pointer items-start gap-3"
          >
            <input
              id="ai-consent"
              type="checkbox"
              checked={aiConsent}
              onChange={event => setAiConsent(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-ion"
            />
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-porcelain">
                <Bot className="h-4 w-4 shrink-0 text-ion" aria-hidden="true" />
                Add AI insights (optional)
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-silver">
                Besides the local score, Google Gemini reviews your resume text and this job
                description and returns contextual advice: experience alignment, strengths,
                skill gaps, prioritized improvements, ATS keywords grounded in the posting, and
                tweaks for existing bullet points. If you decline, only the built-in analysis
                runs and no data is sent anywhere. If enabled, the result may take an extra
                10–30 seconds.
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-silver">
                Only these two texts are sent, once per analysis. They are not stored on
                Google's servers with this request, and the numeric match score is always
                computed locally.
              </span>
            </span>
          </label>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="order-2 flex items-start gap-2 text-xs leading-relaxed text-silver sm:order-1 sm:max-w-md">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-ion" aria-hidden="true" />
            <span>
              Scores show how closely the wording and skills align. They are not a hiring
              probability or an official ATS score.
            </span>
          </div>

          <div className="order-1 sm:order-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={!canSubmit}
              className="w-full sm:w-auto"
              leftIcon={<Sparkles className="h-4 w-4" strokeWidth={2.4} />}
            >
              Analyze My Resume
            </Button>
            <p className="mt-1.5 text-xs text-silver sm:text-right" aria-live="polite">
              {disabledReason || 'Ready when you are.'}
            </p>
          </div>
        </div>

        {actionNote && (
          <p className="mt-3 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-silver" role="status">
            {actionNote}
          </p>
        )}
      </section>

      <p className="px-1 pb-2 text-center text-xs text-silver">
        No resume handy?{' '}
        <button
          type="button"
          onClick={loadExample}
          className="font-semibold text-ion underline-offset-4 hover:text-mint hover:underline"
        >
          Load an example resume and job description
        </button>
        .
      </p>
    </form>
  );
};
