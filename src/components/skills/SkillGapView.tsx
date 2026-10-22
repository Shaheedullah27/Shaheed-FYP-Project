import React, { useState } from 'react';
import { 
  Target, 
  CheckCircle2, 
  AlertCircle, 
  BookOpen, 
  ArrowRight, 
  Layers, 
  Check, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { AnalysisResult, SkillCategory, SkillItem } from '../../types';

interface SkillGapViewProps {
  analysis: AnalysisResult | null;
  onGoToAnalyze: () => void;
}

export const SkillGapView: React.FC<SkillGapViewProps> = ({
  analysis,
  onGoToAnalyze,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [filterType, setFilterType] = useState<'all' | 'missing' | 'matched'>('all');

  if (!analysis) {
    return (
      <div className="p-12 panel text-center ">
        <Target className="w-10 h-10 text-[#7DEFFF] mx-auto mb-3" />
        <h2 className="text-base font-bold text-ink mb-1">No skill comparison yet</h2>
        <p className="text-xs text-mute max-w-md mx-auto mb-6">
          Compare a resume with a job posting to see which listed skills are present and which are missing.
        </p>
        <button
          onClick={onGoToAnalyze}
          className="px-4 py-2 text-xs font-semibold btn-primary text-ink rounded-lg transition-colors"
        >
          Compare a resume
        </button>
      </div>
    );
  }

  const allSkills: SkillItem[] = [
    ...analysis.matchedSkills,
    ...analysis.missingSkills
  ];

  const filteredSkills = allSkills.filter(skill => {
    const matchesCategory = selectedCategory === 'All' || skill.category === selectedCategory;
    const matchesStatus = 
      filterType === 'all' ? true :
      filterType === 'missing' ? !skill.foundInResume :
      skill.foundInResume;
    return matchesCategory && matchesStatus;
  });

  const categories = ['All', ...analysis.categoryGaps.map(c => c.category)];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 panel">
        <div>
          <div className="flex items-center gap-2 text-xs text-mute mb-1">
            <span>Skills checked</span>
            <span aria-hidden="true">·</span>
            <span>{allSkills.length} skills listed in the job posting</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-ink">
            Skills found and missing
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-mute">Skills found</div>
            <div className="text-lg font-bold font-mono tabular-nums text-[#7DEFFF]">
              {analysis.skillMatchScore}%
            </div>
          </div>
        </div>
      </div>

      {/* Category Progress Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {analysis.categoryGaps.map((gap) => {
          const isHigh = gap.matchPercentage >= 75;
          const isMedium = gap.matchPercentage >= 50 && gap.matchPercentage < 75;

          return (
            <div
              key={gap.category}
              onClick={() => setSelectedCategory(gap.category)}
              className={`p-5 panel cursor-pointer transition-all ${
                selectedCategory === gap.category 
                  ? 'border-[#35E7FF]/60 ring-2 ring-[#35E7FF]/20' 
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-ink">{gap.category}</span>
                <span className="text-xs font-mono font-bold tabular-nums text-ink/75">
                  {gap.matchPercentage}%
                </span>
              </div>

              <div className="w-full bg-white/8 h-2 rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isHigh ? 'bg-emerald-400/100' : isMedium ? 'bg-[#35E7FF]/100' : 'bg-amber-400/100'
                  }`}
                  style={{ width: `${gap.matchPercentage}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-mute">
                <span className="text-emerald-300 font-medium">
                  {gap.matchedCount} matched
                </span>
                <span className="text-rose-300 font-medium">
                  {gap.missingCount} missing
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Skills Filter & Listing Section */}
      <div className="p-6 panel">
        {/* Filter Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/8">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-gradient-to-br from-[#35E7FF] to-[#8B5CFF] text-[#05080F]'
                    : 'bg-white/8 text-mute hover:text-ink'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-white/8 rounded-lg text-xs self-start md:self-auto">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-md transition-colors ${filterType === 'all' ? 'bg-[#35E7FF] font-bold text-[#05080F] shadow-[0_6px_18px_-8px_rgba(53,231,255,0.7)]' : 'text-mute'}`}
            >
              All ({allSkills.length})
            </button>
            <button
              onClick={() => setFilterType('missing')}
              className={`px-3 py-1 rounded-md transition-colors ${filterType === 'missing' ? 'bg-white/8 font-semibold text-rose-300 ' : 'text-mute'}`}
            >
              Missing ({analysis.missingSkills.length})
            </button>
            <button
              onClick={() => setFilterType('matched')}
              className={`px-3 py-1 rounded-md transition-colors ${filterType === 'matched' ? 'bg-white/8 font-semibold text-emerald-300 ' : 'text-mute'}`}
            >
              Matched ({analysis.matchedSkills.length})
            </button>
          </div>
        </div>

        {/* Skills Detailed Grid */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredSkills.map((skill, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border flex items-start justify-between gap-3 transition-colors ${
                skill.foundInResume
                  ? 'bg-emerald-400/10/20 border-emerald-400/30'
                  : 'bg-rose-400/10/20 border-rose-400/30'
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {skill.foundInResume ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />
                  )}
                  <span className="text-xs font-bold text-ink">{skill.name}</span>
                  <span className="text-[10px] text-mute font-medium bg-white/8 px-2 py-0.5 rounded border border-white/12">
                    {skill.category}
                  </span>
                </div>

                {skill.foundInResume ? (
                  <p className="text-[11px] text-emerald-300 mt-1">
                    Found in your resume.
                  </p>
                ) : (
                  <p className="text-[11px] text-rose-300 mt-1">
                    Listed in the job posting ({skill.frequencyInJD} {skill.frequencyInJD === 1 ? 'time' : 'times'}), but not found in your resume.
                  </p>
                )}
              </div>

              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded whitespace-nowrap shrink-0 ${
                skill.importance === 'Required' ? 'bg-gradient-to-br from-[#35E7FF] to-[#8B5CFF] text-[#05080F]' : 'bg-white/8 text-mute'
              }`}>
                {skill.importance}
              </span>
            </div>
          ))}

          {filteredSkills.length === 0 && (
            <div className="col-span-2 py-8 text-center text-xs text-mute/80">
              No skills match these filters.
            </div>
          )}
        </div>
      </div>

      {/* Learning & Resume Integration Plan */}
      <div className="p-6 panel">
        <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-[#7DEFFF]">
          <BookOpen className="w-4 h-4" />
          <span>What you can do next</span>
        </div>
        <h2 className="text-base font-bold text-ink mb-2">
          Ways to build the missing skills
        </h2>
        <p className="text-xs text-mute leading-relaxed mb-6">
          If a skill is missing, these steps can help you gain experience and describe it clearly. Only include skills you really have.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl border border-white/10 bg-white/[0.03]">
            <span className="font-bold text-[#7DEFFF] block mb-1">1. Include relevant courses</span>
            <p className="text-mute leading-relaxed">
              If you have used a skill in a course or lab, name the course and describe the work in your Education section.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-white/10 bg-white/[0.03]">
            <span className="font-bold text-[#7DEFFF] block mb-1">2. Build a project</span>
            <p className="text-mute leading-relaxed">
              Try a project that uses the skill. Add a link and explain what you built and what you learned.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-white/10 bg-white/[0.03]">
            <span className="font-bold text-[#7DEFFF] block mb-1">3. Use clear skill names</span>
            <p className="text-mute leading-relaxed">
              Use the same skill name as the job posting when it accurately describes your experience. For example, write “PostgreSQL” if that is the database you used.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
