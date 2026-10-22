import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Target, 
  CheckCircle2, 
  AlertCircle, 
  BookOpen, 
  Sparkles,
  Layers,
  ArrowRight,
  Filter
} from 'lucide-react';
import { AnalysisResult, SkillItem } from '../../types';
import { GlowPanel } from '../ui/GlowPanel';
import { cn, riseIn, stagger } from '../../lib/ui';

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
      <div className="p-12 panel text-center border border-white/[0.08] bg-[#131720]">
        <div className="w-12 h-12 rounded-2xl bg-[#79F2C0]/10 border border-[#79F2C0]/25 flex items-center justify-center mx-auto mb-4 text-[#79F2C0]">
          <Target className="w-6 h-6" />
        </div>
        <h2 className="text-base font-display font-bold text-ink mb-1">No Skill Gap Matrix Available</h2>
        <p className="text-xs text-mute max-w-md mx-auto mb-6 leading-relaxed">
          Compare a resume against a target job posting to extract required technical competencies, categorize overlaps, and pinpoint critical missing skills.
        </p>
        <button
          onClick={onGoToAnalyze}
          className="btn-primary text-xs"
        >
          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
          Compare a Resume Now
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
              <Target className="w-4 h-4" />
              <span>TAXONOMY COVERAGE MATRIX</span>
              <span className="text-mute">·</span>
              <span className="text-mute font-mono">{allSkills.length} competencies extracted</span>
            </div>
            <h1 className="text-xl md:text-2xl font-display font-bold tracking-tight text-ink">
              Skill Overlap & Gap Analysis
            </h1>
            <p className="text-xs text-mute mt-0.5">
              Category-level breakdown of hard technical capabilities and soft proficiencies identified in the target role.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
              <div className="text-[11px] font-mono text-mute uppercase">Coverage Index</div>
              <div className="text-2xl font-mono font-black tabular-nums text-[#79F2C0]">
                {analysis.skillMatchScore}%
              </div>
            </div>
          </div>
        </GlowPanel>
      </motion.div>

      {/* Category Progress Matrix */}
      <motion.div variants={riseIn} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {analysis.categoryGaps.map((gap) => {
          const isHigh = gap.matchPercentage >= 75;
          const isMedium = gap.matchPercentage >= 50 && gap.matchPercentage < 75;
          const isSelected = selectedCategory === gap.category;

          return (
            <div
              key={gap.category}
              onClick={() => setSelectedCategory(gap.category)}
              className={cn(
                'p-5 rounded-2xl cursor-pointer transition-all border',
                isSelected 
                  ? 'bg-[#1B2230] border-[#79F2C0]/50 shadow-[0_0_20px_rgba(121,242,192,0.12)] ring-1 ring-[#79F2C0]/30' 
                  : 'bg-[#131720] border-white/[0.08] hover:border-white/[0.16] hover:bg-[#1B2230]/60'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-display font-bold text-ink">{gap.category}</span>
                <span className="text-xs font-mono font-bold tabular-nums text-ink/90">
                  {gap.matchPercentage}%
                </span>
              </div>

              <div className="w-full bg-white/[0.06] h-2 rounded-full overflow-hidden mb-3">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    isHigh ? 'bg-[#79F2C0]' : isMedium ? 'bg-[#62D9F5]' : 'bg-[#F4BD73]'
                  )}
                  style={{ width: `${gap.matchPercentage}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-[#79F2C0] font-medium">
                  {gap.matchedCount} verified
                </span>
                <span className="text-[#FF777F] font-medium">
                  {gap.missingCount} missing
                </span>
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Skills Filter & Listing Section */}
      <motion.div variants={riseIn}>
        <GlowPanel className="p-6">
          {/* Filter Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
            {/* Category Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              {categories.map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-mono rounded-lg transition-colors whitespace-nowrap shrink-0 border',
                      active
                        ? 'bg-[#79F2C0] text-[#0B0D12] font-bold border-[#79F2C0] shadow-[0_0_12px_rgba(121,242,192,0.3)]'
                        : 'bg-white/[0.03] text-mute hover:text-ink border-white/[0.06]'
                    )}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Status Tabs */}
            <div className="flex items-center gap-1 p-1 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs self-start md:self-auto">
              <button
                onClick={() => setFilterType('all')}
                className={cn(
                  'px-3 py-1 rounded-lg font-mono text-[11px] transition-colors',
                  filterType === 'all' 
                    ? 'bg-white/10 text-ink font-bold border border-white/20' 
                    : 'text-mute hover:text-ink'
                )}
              >
                All ({allSkills.length})
              </button>
              <button
                onClick={() => setFilterType('missing')}
                className={cn(
                  'px-3 py-1 rounded-lg font-mono text-[11px] transition-colors',
                  filterType === 'missing' 
                    ? 'bg-[#FF777F]/15 text-[#FF777F] font-bold border border-[#FF777F]/30' 
                    : 'text-mute hover:text-ink'
                )}
              >
                Missing ({analysis.missingSkills.length})
              </button>
              <button
                onClick={() => setFilterType('matched')}
                className={cn(
                  'px-3 py-1 rounded-lg font-mono text-[11px] transition-colors',
                  filterType === 'matched' 
                    ? 'bg-[#79F2C0]/15 text-[#79F2C0] font-bold border border-[#79F2C0]/30' 
                    : 'text-mute hover:text-ink'
                )}
              >
                Matched ({analysis.matchedSkills.length})
              </button>
            </div>
          </div>

          {/* Skills Detailed Grid */}
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredSkills.map((skill, idx) => (
              <div
                key={idx}
                className={cn(
                  'p-4 rounded-xl border flex items-start justify-between gap-3 transition-colors',
                  skill.foundInResume
                    ? 'bg-[#79F2C0]/5 border-[#79F2C0]/25'
                    : 'bg-[#FF777F]/5 border-[#FF777F]/25'
                )}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {skill.foundInResume ? (
                      <CheckCircle2 className="w-4 h-4 text-[#79F2C0] shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-[#FF777F] shrink-0" />
                    )}
                    <span className="text-xs font-semibold text-ink">{skill.name}</span>
                    <span className="text-[10px] text-mute font-mono bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.08]">
                      {skill.category}
                    </span>
                  </div>

                  {skill.foundInResume ? (
                    <p className="text-[11px] text-[#79F2C0] mt-1 font-mono">
                      Verified present in resume text.
                    </p>
                  ) : (
                    <p className="text-[11px] text-[#FF777F] mt-1 font-mono">
                      Requested in spec ({skill.frequencyInJD}× frequency), missing from resume text.
                    </p>
                  )}
                </div>

                <span className={cn(
                  'text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase whitespace-nowrap shrink-0 border',
                  skill.importance === 'Required' 
                    ? 'bg-[#62D9F5]/10 text-[#62D9F5] border-[#62D9F5]/30' 
                    : 'bg-white/[0.04] text-mute border-white/[0.08]'
                )}>
                  {skill.importance}
                </span>
              </div>
            ))}

            {filteredSkills.length === 0 && (
              <div className="col-span-2 py-12 text-center text-xs text-mute font-mono">
                No skills match your active category and status filter.
              </div>
            )}
          </div>
        </GlowPanel>
      </motion.div>

      {/* Learning & Resume Integration Plan */}
      <motion.div variants={riseIn}>
        <GlowPanel className="p-6">
          <div className="flex items-center gap-2 mb-2 text-xs font-mono font-semibold text-[#79F2C0]">
            <BookOpen className="w-4 h-4" />
            <span>BRIDGING THE RESUME GAP</span>
          </div>
          <h2 className="text-base font-display font-bold text-ink mb-1.5">
            Architecting Strategic Skill Alignment
          </h2>
          <p className="text-xs text-mute leading-relaxed mb-6">
            If a missing skill is part of your past experience, ensure it is explicitly articulated using industry-standard naming. If it represents a true gap, plan strategic development without misrepresenting credentials.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02]">
              <span className="font-mono font-bold text-[#79F2C0] block mb-1.5">01 // Academic & Coursework Proof</span>
              <p className="text-mute leading-relaxed">
                If utilized in a capstone, laboratory, or certified curriculum, explicitly cite the coursework in your Education and Projects sections with quantifiable deliverables.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02]">
              <span className="font-mono font-bold text-[#62D9F5] block mb-1.5">02 // Open Source & Public Repos</span>
              <p className="text-mute leading-relaxed">
                Build a self-directed open-source implementation. Link directly to GitHub repositories documenting the architecture, unit test suites, and deployment scripts.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02]">
              <span className="font-mono font-bold text-[#A99BFF] block mb-1.5">03 // Exact Canonical Terminology</span>
              <p className="text-mute leading-relaxed">
                Align terminology with canonical names (e.g. use "PostgreSQL" rather than colloquial "Postgres SQL") so both keyword parsers and hiring managers recognize it immediately.
              </p>
            </div>
          </div>
        </GlowPanel>
      </motion.div>
    </motion.div>
  );
};
