import React, { useState } from 'react';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Search, 
  CheckCircle2, 
  Sparkles, 
  RotateCcw,
  Tag
} from 'lucide-react';
import { SkillCategory } from '../../types';
import { 
  getSkillsDictionary, 
  addCustomSkill, 
  removeCustomSkill, 
  SkillDefinition, 
  DEFAULT_SKILLS_DICTIONARY 
} from '../../data/skillsDictionary';

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
      setSuccessMessage('Restored the original skills list.');
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 panel">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#7DEFFF] font-semibold mb-1">
            <BookOpen className="w-4 h-4" />
            <span>Skills used in comparisons</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-ink">
            Skills list
          </h1>
          <p className="text-xs text-mute mt-0.5">
            Add or remove skills that the app looks for in resumes and job postings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetToDefault}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-mute hover:text-ink bg-white/8 hover:bg-white/12 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restore original list</span>
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-400/10 border border-emerald-400/30 text-emerald-200 text-xs rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Add New Skill Form */}
      <div className="p-5 panel">
        <h2 className="text-sm font-bold text-ink mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4 text-[#7DEFFF]" />
          <span>Add a skill</span>
        </h2>
        <form onSubmit={handleAddSkill} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-mute mb-1">
              Skill or tool
            </label>
            <input
              type="text"
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              placeholder="e.g. Snowflake, Tableau, HubSpot"
              className="w-full px-3 py-1.5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35E7FF]/25 focus:border-[#35E7FF]/60 text-ink"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-mute mb-1">
              Category
            </label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as SkillCategory)}
              className="w-full px-3 py-1.5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35E7FF]/25 focus:border-[#35E7FF]/60 text-ink bg-white/8"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-mute mb-1">
              Other names (separate with commas)
            </label>
            <input
              type="text"
              value={newAliases}
              onChange={(e) => setNewAliases(e.target.value)}
              placeholder="e.g. data warehouse, cloud dw"
              className="w-full px-3 py-1.5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35E7FF]/25 focus:border-[#35E7FF]/60 text-ink"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-1.5 px-4 btn-primary font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 "
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add skill</span>
            </button>
          </div>
        </form>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 panel flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-mute/80 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search skills or other names..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35E7FF]/25 focus:border-[#35E7FF]/60 text-ink"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full text-xs">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${selectedCategory === 'All' ? 'bg-gradient-to-br from-[#35E7FF] to-[#8B5CFF] text-[#05080F] font-semibold' : 'bg-white/8 text-mute hover:text-ink'}`}
          >
            All categories ({skills.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-gradient-to-br from-[#35E7FF] to-[#8B5CFF] text-[#05080F] font-semibold' : 'bg-white/8 text-mute hover:text-ink'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Skills Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredSkills.map((skill, idx) => (
          <div
            key={idx}
            className="p-3.5 panel flex flex-col justify-between hover:border-white/20 transition-colors"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-xs font-bold text-ink truncate">
                  {skill.name}
                </span>
                {skill.isCustom && (
                  <button
                    onClick={() => handleRemoveSkill(skill.name)}
                    className="text-mute/80 hover:text-rose-300 transition-colors p-0.5"
                    title="Remove custom skill"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <span className="text-[10px] text-mute font-medium block mb-2">
                {skill.category}
              </span>
            </div>

            {skill.aliases && skill.aliases.length > 0 ? (
              <div className="text-[10px] text-mute/80 truncate">
                Synonyms: {skill.aliases.join(', ')}
              </div>
            ) : (
              <div className="text-[10px] text-mute italic">No synonyms</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
