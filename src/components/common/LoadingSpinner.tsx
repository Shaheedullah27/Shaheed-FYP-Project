import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, FileText, Cpu, BarChart2 } from 'lucide-react';

interface LoadingSpinnerProps {
  onComplete?: () => void;
  message?: string;
}

const STEPS = [
  { label: 'Reading the resume and job posting...', icon: FileText },
  { label: 'Checking for listed skills...', icon: Cpu },
  { label: 'Comparing the words they use...', icon: BarChart2 },
  { label: 'Preparing your results...', icon: CheckCircle2 }
];

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message }) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 450);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-8 panel max-w-md mx-auto text-center">
      <div className="relative mb-5">
        <div className="w-14 h-14 rounded-full border-3 border-white/10 border-t-[#79F2C0] animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-[#79F2C0] animate-pulse" />
        </div>
      </div>

      <h3 className="text-base font-heading font-bold text-porcelain mb-1">
        {message || 'Comparing your resume and the job posting'}
      </h3>
      <p className="text-xs text-silver mb-6">
        This may take a few seconds.
      </p>

      <div className="w-full space-y-2.5 text-left border-t border-white/[0.08] pt-4">
        {STEPS.map((step, idx) => {
          const isDone = idx < currentStep;
          const isCurrent = idx === currentStep;
          const Icon = step.icon;

          return (
            <div 
              key={idx}
              className={`flex items-center gap-3 text-xs transition-opacity duration-200 ${
                isDone ? 'text-[#79F2C0] font-medium' : isCurrent ? 'text-[#62D9F5] font-semibold' : 'text-silver/60'
              }`}
            >
              <div className="w-4 h-4 flex items-center justify-center shrink-0">
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-[#79F2C0]" />
                ) : (
                  <Icon className={`w-3.5 h-3.5 ${isCurrent ? 'animate-pulse text-[#62D9F5]' : 'text-silver/60'}`} />
                )}
              </div>
              <span className="truncate">{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
