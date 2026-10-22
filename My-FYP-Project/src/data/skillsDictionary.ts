import { SkillCategory } from '../types';

export interface SkillDefinition {
  name: string;
  category: SkillCategory;
  aliases?: string[];
  isCustom?: boolean;
}

export const DEFAULT_SKILLS_DICTIONARY: SkillDefinition[] = [
  // Programming Languages
  { name: 'Python', category: 'Programming Languages', aliases: ['python3', 'py'] },
  { name: 'JavaScript', category: 'Programming Languages', aliases: ['js', 'ecmascript'] },
  { name: 'TypeScript', category: 'Programming Languages', aliases: ['ts'] },
  { name: 'Java', category: 'Programming Languages', aliases: ['jdk', 'core java'] },
  { name: 'C++', category: 'Programming Languages', aliases: ['cpp', 'c plus plus'] },
  { name: 'C#', category: 'Programming Languages', aliases: ['csharp', '.net'] },
  { name: 'Go', category: 'Programming Languages', aliases: ['golang'] },
  { name: 'Rust', category: 'Programming Languages' },
  { name: 'PHP', category: 'Programming Languages' },
  { name: 'Ruby', category: 'Programming Languages' },
  { name: 'Swift', category: 'Programming Languages' },
  { name: 'Kotlin', category: 'Programming Languages' },
  { name: 'R', category: 'Programming Languages', aliases: ['r-lang', 'rstats'] },
  { name: 'Bash', category: 'Programming Languages', aliases: ['shell scripting', 'sh', 'zsh'] },

  // Databases & Storage
  { name: 'SQL', category: 'Databases & Storage', aliases: ['structured query language', 't-sql'] },
  { name: 'PostgreSQL', category: 'Databases & Storage', aliases: ['postgres'] },
  { name: 'MySQL', category: 'Databases & Storage' },
  { name: 'MongoDB', category: 'Databases & Storage', aliases: ['mongo', 'nosql'] },
  { name: 'Redis', category: 'Databases & Storage', aliases: ['caching', 'in-memory'] },
  { name: 'SQLite', category: 'Databases & Storage' },
  { name: 'Firebase', category: 'Databases & Storage', aliases: ['firestore'] },
  { name: 'Elasticsearch', category: 'Databases & Storage', aliases: ['elk'] },
  { name: 'DynamoDB', category: 'Databases & Storage' },
  { name: 'Oracle Database', category: 'Databases & Storage', aliases: ['pl/sql', 'oracle sql'] },

  // Web Development
  { name: 'React', category: 'Web Development', aliases: ['reactjs', 'react.js'] },
  { name: 'Node.js', category: 'Web Development', aliases: ['nodejs', 'node'] },
  { name: 'Express.js', category: 'Web Development', aliases: ['express', 'expressjs'] },
  { name: 'HTML5', category: 'Web Development', aliases: ['html'] },
  { name: 'CSS3', category: 'Web Development', aliases: ['css', 'scss', 'sass'] },
  { name: 'Next.js', category: 'Web Development', aliases: ['nextjs'] },
  { name: 'Vue.js', category: 'Web Development', aliases: ['vue', 'vuejs'] },
  { name: 'Angular', category: 'Web Development', aliases: ['angularjs'] },
  { name: 'Django', category: 'Web Development' },
  { name: 'Flask', category: 'Web Development' },
  { name: 'FastAPI', category: 'Web Development' },
  { name: 'Tailwind CSS', category: 'Web Development', aliases: ['tailwind'] },
  { name: 'REST APIs', category: 'Web Development', aliases: ['restful', 'web apis', 'restful api'] },
  { name: 'GraphQL', category: 'Web Development' },

  // Project Management
  { name: 'Agile', category: 'Project Management', aliases: ['agile methodology'] },
  { name: 'Scrum', category: 'Project Management', aliases: ['scrum master', 'daily standups'] },
  { name: 'Jira', category: 'Project Management', aliases: ['atlassian jira'] },
  { name: 'Kanban', category: 'Project Management' },
  { name: 'Sprint Planning', category: 'Project Management', aliases: ['sprints', 'backlog grooming'] },
  { name: 'Risk Management', category: 'Project Management', aliases: ['risk assessment'] },
  { name: 'Stakeholder Management', category: 'Project Management', aliases: ['stakeholder communication'] },
  { name: 'Product Roadmap', category: 'Project Management', aliases: ['roadmap planning', 'feature prioritization'] },
  { name: 'PMP', category: 'Project Management', aliases: ['project management professional'] },
  { name: 'Confluence', category: 'Project Management' },
  { name: 'Trello', category: 'Project Management' },

  // Marketing & Analytics
  { name: 'SEO', category: 'Marketing & Analytics', aliases: ['search engine optimization', 'on-page seo'] },
  { name: 'SEM & PPC', category: 'Marketing & Analytics', aliases: ['google ads', 'paid search', 'pay per click'] },
  { name: 'Google Analytics', category: 'Marketing & Analytics', aliases: ['ga4', 'web analytics'] },
  { name: 'Content Strategy', category: 'Marketing & Analytics', aliases: ['content marketing', 'content creation'] },
  { name: 'Copywriting', category: 'Marketing & Analytics', aliases: ['ad copywriting', 'technical writing'] },
  { name: 'Social Media Marketing', category: 'Marketing & Analytics', aliases: ['smm', 'social campaigns'] },
  { name: 'Email Marketing', category: 'Marketing & Analytics', aliases: ['mailchimp', 'newsletter campaigns'] },
  { name: 'Conversion Rate Optimization', category: 'Marketing & Analytics', aliases: ['cro', 'a/b testing'] },
  { name: 'Market Research', category: 'Marketing & Analytics', aliases: ['competitive analysis', 'user research'] },
  { name: 'CRM', category: 'Marketing & Analytics', aliases: ['hubspot', 'salesforce'] },

  // Communication & Interpersonal
  { name: 'Written Communication', category: 'Communication & Interpersonal', aliases: ['business writing', 'documentation'] },
  { name: 'Verbal Communication', category: 'Communication & Interpersonal', aliases: ['oral communication', 'presentation skills'] },
  { name: 'Cross-Functional Collaboration', category: 'Communication & Interpersonal', aliases: ['interdepartmental collaboration', 'teamwork'] },
  { name: 'Problem Solving', category: 'Communication & Interpersonal', aliases: ['analytical thinking', 'troubleshooting'] },
  { name: 'Active Listening', category: 'Communication & Interpersonal' },
  { name: 'Negotiation', category: 'Communication & Interpersonal', aliases: ['consensus building'] },
  { name: 'Conflict Resolution', category: 'Communication & Interpersonal' },
  { name: 'Public Speaking', category: 'Communication & Interpersonal', aliases: ['client presentation', 'keynote'] },
  { name: 'Mentorship', category: 'Communication & Interpersonal', aliases: ['coaching', 'peer mentoring'] },

  // Cloud & DevOps
  { name: 'AWS', category: 'Cloud & DevOps', aliases: ['amazon web services', 'ec2', 's3', 'lambda'] },
  { name: 'Docker', category: 'Cloud & DevOps', aliases: ['containerization', 'containers'] },
  { name: 'Kubernetes', category: 'Cloud & DevOps', aliases: ['k8s'] },
  { name: 'CI/CD', category: 'Cloud & DevOps', aliases: ['continuous integration', 'github actions', 'gitlab ci'] },
  { name: 'Terraform', category: 'Cloud & DevOps', aliases: ['infrastructure as code', 'iac'] },
  { name: 'Linux', category: 'Cloud & DevOps', aliases: ['unix', 'ubuntu'] },
  { name: 'Git', category: 'Cloud & DevOps', aliases: ['github', 'gitlab', 'version control'] },
  { name: 'Unit Testing', category: 'Cloud & DevOps', aliases: ['jest', 'pytest', 'test automation'] }
];

const CUSTOM_SKILLS_STORAGE_KEY = 'ai_resumematch_custom_skills';

export function getSkillsDictionary(): SkillDefinition[] {
  try {
    const raw = localStorage.getItem(CUSTOM_SKILLS_STORAGE_KEY);
    if (!raw) return DEFAULT_SKILLS_DICTIONARY;
    const customList: SkillDefinition[] = JSON.parse(raw);
    return [...DEFAULT_SKILLS_DICTIONARY, ...customList];
  } catch (e) {
    return DEFAULT_SKILLS_DICTIONARY;
  }
}

export function addCustomSkill(skill: SkillDefinition): SkillDefinition[] {
  try {
    const raw = localStorage.getItem(CUSTOM_SKILLS_STORAGE_KEY);
    const customList: SkillDefinition[] = raw ? JSON.parse(raw) : [];
    const updated = [...customList.filter(s => s.name.toLowerCase() !== skill.name.toLowerCase()), { ...skill, isCustom: true }];
    localStorage.setItem(CUSTOM_SKILLS_STORAGE_KEY, JSON.stringify(updated));
    return [...DEFAULT_SKILLS_DICTIONARY, ...updated];
  } catch (e) {
    return DEFAULT_SKILLS_DICTIONARY;
  }
}

export function removeCustomSkill(skillName: string): SkillDefinition[] {
  try {
    const raw = localStorage.getItem(CUSTOM_SKILLS_STORAGE_KEY);
    if (!raw) return DEFAULT_SKILLS_DICTIONARY;
    const customList: SkillDefinition[] = JSON.parse(raw);
    const updated = customList.filter(s => s.name.toLowerCase() !== skillName.toLowerCase());
    localStorage.setItem(CUSTOM_SKILLS_STORAGE_KEY, JSON.stringify(updated));
    return [...DEFAULT_SKILLS_DICTIONARY, ...updated];
  } catch (e) {
    return DEFAULT_SKILLS_DICTIONARY;
  }
}

export const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'can\'t', 'cannot',
  'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during', 'each',
  'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d',
  'he\'ll', 'he\'s', 'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s', 'i',
  'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself', 'let\'s',
  'me', 'more', 'most', 'mustn\'t', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or',
  'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'shan\'t', 'she', 'she\'d', 'she\'ll',
  'she\'s', 'should', 'shouldn\'t', 'so', 'some', 'such', 'than', 'that', 'that\'s', 'the', 'their', 'theirs',
  'them', 'themselves', 'then', 'there', 'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve',
  'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll',
  'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when', 'when\'s', 'where', 'where\'s', 'which', 'while',
  'who', 'who\'s', 'whom', 'why', 'why\'s', 'with', 'won\'t', 'would', 'wouldn\'t', 'you', 'you\'d', 'you\'ll',
  'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves', 'will', 'also', 'etc', 'job', 'work', 'working',
  'role', 'responsible', 'including', 'years', 'experience', 'required', 'skills', 'degree', 'qualification',
  'ability', 'strong', 'knowledge', 'must', 'have', 'understanding'
]);
