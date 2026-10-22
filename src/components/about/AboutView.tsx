import React, { useState } from 'react';
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
  FileText
} from 'lucide-react';
import { ActiveTab } from '../../types';

interface AboutViewProps {
  onTabChange: (tab: ActiveTab) => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ onTabChange }) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: 'How does the app compare a resume with a job posting?',
      a: 'It looks at the words and skills in both texts. TF-IDF gives more weight to useful words, and a similarity calculation compares the two sets. The result is a guide to how much the texts overlap, not a hiring prediction.'
    },
    {
      q: 'Does repeating a skill raise the score?',
      a: 'A repeated word counts, but each extra repetition adds less than the previous one. This helps stop a score from rising just because a word appears many times.'
    },
    {
      q: 'What is the difference between the text match and ATS readability scores?',
      a: 'The text match shows how much the resume wording overlaps with the job posting. The ATS readability score checks whether software can find details such as contact information and common resume sections. Neither score comes from an employer.'
    },
    {
      q: 'Will the app mark a student down for having no work history?',
      a: 'If a resume has education and projects but no work experience, the app treats those sections as a reasonable alternative. It does not assume that every applicant has had a formal job.'
    },
    {
      q: 'Can the app check every part of a resume layout?',
      a: 'No. It reads extracted text, so it may not detect text inside images or tell exactly how columns and text boxes look on the page. Check the original document yourself, especially if it uses a complex layout.'
    }
  ];

  const demoSteps = [
    {
      step: '1. Start a comparison',
      action: 'Choose a sample resume and job posting, or enter your own.',
      tip: 'You can upload a PDF or Word document, or paste text.'
    },
    {
      step: '2. Add a resume',
      action: 'Upload a PDF or Word document, or paste the resume text.',
      tip: 'The browser reads the file on your device. The Python option uses your local computer.'
    },
    {
      step: '3. Compare the texts',
      action: 'Click "Compare now" to see the text match, skill match, and readability scores.',
      tip: 'The app uses a fixed calculation, so the same text gives the same result.'
    },
    {
      step: '4. Review the results',
      action: 'Check the skills found and missing, the score breakdown, and the suggestions.',
      tip: 'The scores are guidance, not a promise of getting an interview.'
    },
    {
      step: '5. Check readability',
      action: 'Open "ATS Check" to see whether contact details and common sections were found.',
      tip: 'Some layout details cannot be checked from text alone.'
    },
    {
      step: '6. Edit the skills list',
      action: 'Open "Skills List" to add a skill or another name for it.',
      tip: 'The list is used when the app checks for skills in both documents.'
    },
    {
      step: '7. Save a report',
      action: 'Download the results if you want to keep or print a copy.',
      tip: 'You can find saved comparisons in "Past Comparisons".'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="p-6 panel">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#7DEFFF] font-semibold mb-1">
              <GraduationCap className="w-4 h-4" />
              <span>Computer science final-year project</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-ink">
              About AI ResumeMatch
            </h1>
            <p className="text-xs text-mute mt-1">
              A tool that compares a resume with a job posting and points out possible skill gaps.
            </p>
          </div>

          <button
            onClick={() => onTabChange('analyze')}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold btn-primary text-ink rounded-lg transition-colors shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Open Match Studio</span>
          </button>
        </div>
      </div>

      {/* Abstract & Academic Objectives Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 panel">
          <h2 className="text-sm font-bold text-ink mb-2 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#7DEFFF]" />
            <span>Why this project was made</span>
          </h2>
          <p className="text-xs text-mute leading-relaxed mb-3">
            Many employers use applicant tracking systems (ATS) to organize applications. It can be hard for students and job seekers to tell whether a resume includes the skills and details listed in a job posting.
          </p>
          <p className="text-xs text-mute leading-relaxed">
            <strong>AI ResumeMatch</strong> compares the wording and skills in a resume with a job posting. It also checks whether common resume details are easy to find. The app gives suggestions, but it cannot predict hiring decisions.
          </p>
        </div>

        <div className="p-5 panel">
          <h2 className="text-sm font-bold text-ink mb-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#7DEFFF]" />
            <span>What the app does</span>
          </h2>
          <ul className="space-y-2 text-xs text-mute leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="font-bold text-[#7DEFFF]">•</span>
              <span><strong>Compares text:</strong> Uses TF-IDF to give more weight to useful words, then compares the word patterns in both texts.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-[#7DEFFF]">•</span>
              <span><strong>Checks skills:</strong> Looks for skills in areas such as programming, databases, web development, project work, marketing, communication, and cloud computing.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-[#7DEFFF]">•</span>
              <span><strong>Checks readability:</strong> Reports what it can find in the text and explains what it cannot check.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-[#7DEFFF]">•</span>
              <span><strong>Considers students:</strong> Treats education and projects as an alternative when a student has no work history.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Step-by-Step Viva Presentation Demo Guide */}
      <div className="p-6 panel">
        <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-[#7DEFFF]">
          <GraduationCap className="w-4 h-4" />
          <span>Project demonstration</span>
        </div>
        <h2 className="text-base font-bold text-ink mb-2">
          Show how the app works
        </h2>
        <p className="text-xs text-mute mb-6">
          Use these steps to walk someone through the main features:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {demoSteps.map((d, idx) => (
            <div key={idx} className="p-4 bg-white/[0.03] rounded-xl border border-white/10 text-xs">
              <div className="font-bold text-ink mb-1">{d.step}</div>
              <p className="text-ink/75 font-medium mb-1.5">{d.action}</p>
              <div className="text-[11px] text-[#7DEFFF] bg-[#35E7FF]/8 p-2 rounded border border-[#35E7FF]/25">
                <span className="font-bold">Tip: </span>
                {d.tip}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Examiner FAQ (Viva Defense Questions) */}
      <div className="p-6 panel">
        <h2 className="text-base font-bold text-ink mb-2 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-[#7DEFFF]" />
          <span>Common questions</span>
        </h2>
        <p className="text-xs text-mute mb-5">
          Short answers to questions about the app:
        </p>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div key={idx} className="panel overflow-hidden">
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full p-4 text-left font-semibold text-xs text-ink bg-white/[0.03] hover:bg-white/8 flex items-center justify-between transition-colors"
              >
                <span>{faq.q}</span>
                <span className="text-[#7DEFFF] font-bold ml-2">{activeFaq === idx ? '−' : '+'}</span>
              </button>
              {activeFaq === idx && (
                <div className="p-4 text-xs text-mute bg-white/8 leading-relaxed border-t border-white/10">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
