import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Search, 
  CheckCircle2, 
  Sparkles, 
  RotateCcw,
  Tag,
  Filter
} from 'lucide-react';
import { SkillCategory } from '../../types';
import { 
  getSkillsDictionary, 
  addCustomSkill, 
  removeCustomSkill, 
  SkillDefinition, 
  DEFAULT_SKILLS_DICTIONARY 
} from '../../data/skillsDictionary';
import { GlowPanel } from '../ui/GlowPanel';
import { cn, riseIn, stagger } from '../../lib/ui';

interface DictionaryViewProps {
  onDictionaryUpdated?: () => void;
}

export const DictionaryView: React.FC<DictionaryViewProps> = ({ onDictionaryUpdated }) => {
  const [skills, setSkills] = useState<SkillDefinition[]>(getSkillsDictionary());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Add skill form state
  const [newSkillName, setNewSkillName] = useState('');
  const [newCategory, setNewCategory] = useState<SkillCategory>('Programming Languages');
  const [newAliases, setNewAliases] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const categories: SkillCategory[] = [
    'Programming Languages',
    'Databases & Storage',
    'Web Development',
    'Project Management',
    'Marketing & Analytics',
    'Communication & Interpersonal',
    'Cloud & DevOps'
  ];

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;

    const aliases = newAliases
      .split(',')
      .map(a => a.trim())
      .filter(Boolean);

    const updated = addCustomSkill({
      name: newSkillName.trim(),
      category: newCategory,
      aliases
    });

    setSkills(updated);
    setNewSkillName('');
    setNewAliases('');
    setSuccessMessage(`Added "${newSkillName.trim()}" to ${newCategory}.`);
    setTimeout(() => setSuccessMessage(null), 3000);
    onDictionaryUpdated?.();
  };

  const handleRemoveSkill = (name: string) => {
    const updated = removeCustomSkill(name);
    setSkills(updated);
    onDictionaryUpdated?.();
  };

  const handleResetToDefault = () => {
    if (window.confirm('Remove your custom skills and restore the original skills list?')) {
      localStorage.removeItem('ai_resumematch_custom_skills');
      setSkills(DEFAULT_SKILLS_DICTIONARY);
      setSuccessMessage('Restored the original canonical skills dictionary.');
      setTimeout(() => setSuccessMessage(null), 3000);
      onDictionaryUpdated?.();
    }
  };

  const filteredSkills = skills.filter(s => {
    const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory;
    const matchesSearch = 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.aliases && s.aliases.some(a => a.toLowerCase().includes(searchTerm.toLowerCase())));
    return matchesCategory && matchesSearch;
  });

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
              <BookOpen className="w-4 h-4" />
              <span>TAXONOMY KNOWLEDGE BASE</span>
              <span className="text-mute">·</span>
              <span className="text-mute font-mono">{skills.length} recognized skills</span>
            </div>
            <h1 className="text-xl md:text-2xl font-display font-bold tracking-tight text-ink">
              Skills Taxonomy & Aliases
            </h1>
            <p className="text-xs text-mute mt-0.5">
              Customize canonical terms, framework synonyms, and technical keyword mappings recognized by the matching engine.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetToDefault}
              className="btn-ghost text-xs"
              title="Restore standard dictionary"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-mute" />
              <span>Restore Factory Defaults</span>
            </button>
          </div>
        </GlowPanel>
      </motion.div>

      {successMessage && (
        <motion.div 
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 bg-[#79F2C0]/10 border border-[#79F2C0]/30 text-[#79F2C0] text-xs rounded-xl flex items-center gap-2.5 font-mono"
        >
          <CheckCircle2 className="w-4 h-4 text-[#79F2C0] shrink-0" />
          <span>{successMessage}</span>
        </motion.div>
      )}

      {/* Add New Skill Form */}
      <motion.div variants={riseIn}>
        <GlowPanel className="p-5">
          <h2 className="text-sm font-display font-bold text-ink mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#79F2C0]" />
            <span>Register Custom Skill / Technology</span>
          </h2>
          <form onSubmit={handleAddSkill} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-mono text-mute mb-1">
                Canonical Name
              </label>
              <input
                type="text"
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                placeholder="e.g. Snowflake, PyTorch"
                className="field"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-mute mb-1">
                Category Domain
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as SkillCategory)}
                className="field"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat} className="bg-[#131720] text-ink">{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-mute mb-1">
                Synonyms (Comma-Separated)
              </label>
              <input
                type="text"
                value={newAliases}
                onChange={(e) => setNewAliases(e.target.value)}
                placeholder="e.g. torch, torchlib, torch.nn"
                className="field"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full btn-primary text-xs flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save to Dictionary</span>
              </button>
            </div>
          </form>
        </GlowPanel>
      </motion.div>

      {/* Filter and Search Bar */}
      <motion.div variants={riseIn}>
        <GlowPanel className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-mute absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by skill or alias..."
              className="field"
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full text-xs">
            <button
              onClick={() => setSelectedCategory('All')}
              className={cn(
                'px-3 py-1.5 rounded-lg font-mono text-[11px] whitespace-nowrap transition-colors border',
                selectedCategory === 'All'
                  ? 'bg-[#79F2C0] text-[#0B0D12] font-bold border-[#79F2C0] shadow-[0_0_12px_rgba(121,242,192,0.3)]'
                  : 'bg-white/[0.03] text-mute hover:text-ink border-white/[0.06]'
              )}
            >
              All Categories ({skills.length})
            </button>
            {categories.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg font-mono text-[11px] whitespace-nowrap transition-colors border',
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
        </GlowPanel>
      </motion.div>

      {/* Skills Grid */}
      <motion.div variants={riseIn} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredSkills.map((skill, idx) => (
          <div
            key={idx}
            className="p-4 rounded-xl border border-white/[0.08] bg-[#131720] hover:bg-[#1B2230] hover:border-white/[0.14] transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-xs font-semibold text-ink truncate">
                  {skill.name}
                </span>
                {skill.isCustom && (
                  <button
                    onClick={() => handleRemoveSkill(skill.name)}
                    className="text-mute hover:text-[#FF777F] transition-colors p-0.5 rounded"
                    title="Remove custom skill definition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <span className="text-[10px] font-mono text-[#62D9F5] block mb-2.5">
                {skill.category}
              </span>
            </div>

            {skill.aliases && skill.aliases.length > 0 ? (
              <div className="text-[10px] font-mono text-mute truncate bg-white/[0.02] p-1.5 rounded border border-white/[0.04]">
                <span className="text-mute/60">aka: </span>
                {skill.aliases.join(', ')}
              </div>
            ) : (
              <div className="text-[10px] font-mono text-mute/50 italic">Standard canonical term</div>
            )}
          </div>
        ))}

        {filteredSkills.length === 0 && (
          <div className="col-span-full py-12 text-center text-xs text-mute font-mono">
            No dictionary entries match "{searchTerm}".
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
