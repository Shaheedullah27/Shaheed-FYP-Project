import re
import os
import json
import math
from typing import Dict, Any, List, Tuple
try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    import numpy as np
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

from ats_checker import evaluate_ats_compatibility

DICT_PATH = os.path.join(os.path.dirname(__file__), 'skills_dictionary.json')

# Standard English Stopwords for fallback
STOP_WORDS = {
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are',
    'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but',
    'by', 'can', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from',
    'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him',
    'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me',
    'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only',
    'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should',
    'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then',
    'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up',
    'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why',
    'will', 'with', 'you', 'your', 'yours', 'yourself', 'yourselves'
}

def clean_text(text: str) -> str:
    """Preprocesses and normalizes text for NLP processing."""
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r'[^a-z0-9+#.\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def calculate_tfidf_similarity(resume_text: str, jd_text: str) -> Tuple[float, List[Dict[str, Any]]]:
    """
    Computes explainable TF-IDF Cosine Similarity between resume and job description.
    Uses scikit-learn when available, or mathematically identical standard library implementation.
    """
    if SKLEARN_AVAILABLE:
        vectorizer = TfidfVectorizer(
            stop_words='english',
            ngram_range=(1, 2),
            sublinear_tf=True
        )
        tfidf_matrix = vectorizer.fit_transform([resume_text, jd_text])
        feature_names = np.array(vectorizer.get_feature_names_out())
        similarity_matrix = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])
        score = float(similarity_matrix[0][0]) * 100.0
        rounded_score = round(min(100.0, max(0.0, score)), 1)
        
        res_weights = tfidf_matrix[0].toarray()[0]
        jd_weights = tfidf_matrix[1].toarray()[0]
        combined = res_weights + jd_weights
        top_indices = np.argsort(combined)[::-1][:20]
        
        skills_dict = load_skills_dictionary()
        all_skill_names = set()
        for cat_skills in skills_dict.values():
            for s in cat_skills:
                all_skill_names.add(s['name'].lower())
        
        term_weights = []
        for idx in top_indices:
            if combined[idx] > 0.04:
                term_str = str(feature_names[idx])
                term_weights.append({
                    'term': term_str,
                    'resumeWeight': round(float(res_weights[idx]), 4),
                    'jobWeight': round(float(jd_weights[idx]), 4),
                    'isSkill': any(term_str in s or s in term_str for s in all_skill_names)
                })
        return rounded_score, term_weights
    else:
        # Pure Python standard-library implementation matching scikit-learn
        def tokenize(txt):
            clean = re.sub(r'[^a-z0-9+#.\s]', ' ', txt.lower())
            words = [w for w in clean.split() if len(w) > 1 and w not in STOP_WORDS]
            bigrams = [f"{words[i]} {words[i+1]}" for i in range(len(words)-1)]
            return words + bigrams

        r_tokens = tokenize(resume_text)
        j_tokens = tokenize(jd_text)
        vocab = list(set(r_tokens + j_tokens))
        
        if not vocab:
            return 0.0, []

        tf_r = {}
        tf_j = {}
        for t in r_tokens: tf_r[t] = tf_r.get(t, 0) + 1
        for t in j_tokens: tf_j[t] = tf_j.get(t, 0) + 1

        v_r = {}
        v_j = {}
        norm_r_sq = 0.0
        norm_j_sq = 0.0

        for t in vocab:
            df = (1 if t in tf_r else 0) + (1 if t in tf_j else 0)
            idf = math.log((1 + 2) / (1 + df)) + 1.0
            
            raw_r = tf_r.get(t, 0)
            sub_r = (1.0 + math.log(raw_r)) if raw_r > 0 else 0.0
            w_r = sub_r * idf
            v_r[t] = w_r
            norm_r_sq += w_r * w_r
            
            raw_j = tf_j.get(t, 0)
            sub_j = (1.0 + math.log(raw_j)) if raw_j > 0 else 0.0
            w_j = sub_j * idf
            v_j[t] = w_j
            norm_j_sq += w_j * w_j

        norm_r = math.sqrt(norm_r_sq)
        norm_j = math.sqrt(norm_j_sq)

        if norm_r == 0 or norm_j == 0:
            return 0.0, []

        dot_product = sum((v_r[t] / norm_r) * (v_j[t] / norm_j) for t in vocab)
        rounded_score = round(min(100.0, max(0.0, dot_product * 100.0)), 1)

        term_weights = []
        for t in vocab:
            l2_r = v_r[t] / norm_r
            l2_j = v_j[t] / norm_j
            if l2_r > 0.04 or l2_j > 0.04:
                term_weights.append({
                    'term': t,
                    'resumeWeight': round(l2_r, 4),
                    'jobWeight': round(l2_j, 4),
                    'isSkill': False
                })
        term_weights.sort(key=lambda x: (x['resumeWeight'] + x['jobWeight']), reverse=True)
        return rounded_score, term_weights[:20]

def load_skills_dictionary() -> Dict[str, List[Dict[str, Any]]]:
    """Loads the maintainable skills dictionary from JSON file."""
    if os.path.exists(DICT_PATH):
        try:
            with open(DICT_PATH, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Warning: could not read {DICT_PATH}: {e}")
            
    # Fallback default dictionary
    return {
        "Programming Languages": [
            {"name": "Python", "aliases": ["python3", "py"]},
            {"name": "JavaScript", "aliases": ["js"]},
            {"name": "TypeScript", "aliases": ["ts"]},
            {"name": "Java", "aliases": ["jdk"]},
            {"name": "C++", "aliases": ["cpp"]},
            {"name": "SQL", "aliases": ["structured query language"]}
        ],
        "Databases & Storage": [
            {"name": "PostgreSQL", "aliases": ["postgres"]},
            {"name": "MySQL", "aliases": []},
            {"name": "MongoDB", "aliases": ["mongo"]},
            {"name": "Redis", "aliases": ["caching"]}
        ],
        "Web Development": [
            {"name": "React", "aliases": ["reactjs"]},
            {"name": "Node.js", "aliases": ["nodejs"]},
            {"name": "Express.js", "aliases": ["express"]},
            {"name": "REST APIs", "aliases": ["restful"]}
        ],
        "Project Management": [
            {"name": "Agile", "aliases": ["scrum"]},
            {"name": "Jira", "aliases": []},
            {"name": "Sprint Planning", "aliases": []}
        ],
        "Marketing & Analytics": [
            {"name": "SEO", "aliases": ["search engine optimization"]},
            {"name": "Google Analytics", "aliases": ["ga4"]},
            {"name": "Content Strategy", "aliases": []}
        ],
        "Communication & Interpersonal": [
            {"name": "Written Communication", "aliases": ["documentation"]},
            {"name": "Cross-Functional Collaboration", "aliases": ["teamwork"]},
            {"name": "Problem Solving", "aliases": ["troubleshooting"]}
        ],
        "Cloud & DevOps": [
            {"name": "AWS", "aliases": ["ec2", "s3"]},
            {"name": "Docker", "aliases": ["containers"]},
            {"name": "CI/CD", "aliases": ["github actions"]}
        ]
    }


def extract_skills_analysis(resume_text: str, jd_text: str) -> Dict[str, Any]:
    """
    Detects required skills from Job Description and compares with Resume text.
    Uses maintainable JSON dictionary covering programming, databases, web dev,
    marketing, communication, and project management.
    """
    clean_res = f" {clean_text(resume_text)} "
    clean_jd = f" {clean_text(jd_text)} "
    
    skills_taxonomy = load_skills_dictionary()
    matched_skills = []
    missing_skills = []
    category_gaps = []
    
    for category, skill_list in skills_taxonomy.items():
        cat_matched = []
        cat_missing = []
        
        for item in skill_list:
            skill_name = item['name']
            aliases = item.get('aliases', [])
            all_search = [skill_name] + aliases
            
            # Count frequency in JD
            jd_matches = 0
            for term in all_search:
                escaped = re.escape(term.lower())
                found_jd = re.findall(rf'\b{escaped}\b', clean_jd)
                jd_matches += len(found_jd)
                
            if jd_matches > 0:
                # Check resume
                res_matches = 0
                for term in all_search:
                    escaped = re.escape(term.lower())
                    found_res = re.findall(rf'\b{escaped}\b', clean_res)
                    res_matches += len(found_res)
                    
                found = res_matches > 0
                skill_obj = {
                    'name': skill_name,
                    'category': category,
                    'importance': 'Required' if jd_matches > 1 else 'Preferred',
                    'frequencyInJD': jd_matches,
                    'foundInResume': found
                }
                
                if found:
                    matched_skills.append(skill_obj)
                    cat_matched.append(skill_name)
                else:
                    missing_skills.append(skill_obj)
                    cat_missing.append(skill_name)
                    
        total_cat = len(cat_matched) + len(cat_missing)
        if total_cat > 0:
            category_gaps.append({
                'category': category,
                'totalRequired': total_cat,
                'matchedCount': len(cat_matched),
                'missingCount': len(cat_missing),
                'matchPercentage': round((len(cat_matched) / total_cat) * 100),
                'matchedSkills': cat_matched,
                'missingSkills': cat_missing
            })
            
    total_skills = len(matched_skills) + len(missing_skills)
    skill_score = round((len(matched_skills) / total_skills) * 100) if total_skills > 0 else 75
    
    return {
        'matched_skills': matched_skills,
        'missing_skills': missing_skills,
        'category_gaps': category_gaps,
        'skill_match_score': skill_score
    }

def evaluate_ats_structure(resume_text: str) -> float:
    """Evaluates ATS parsing readability based on section headers and layout cues."""
    score = 50.0
    text_lower = resume_text.lower()
    
    if 'experience' in text_lower or 'work history' in text_lower:
        score += 15
    if 'education' in text_lower or 'degree' in text_lower:
        score += 15
    if 'skills' in text_lower or 'technologies' in text_lower:
        score += 15
        
    if '@' in text_lower and ('.com' in text_lower or '.edu' in text_lower):
        score += 5
        
    return min(100.0, max(40.0, score))

def generate_recommendations(missing_skills: List[Dict[str, Any]], cosine_sim: float, ats_score: float) -> List[Dict[str, Any]]:
    """Generates explainable, prioritized recommendations for the candidate."""
    recs = []
    
    high_priority = [s['name'] for s in missing_skills if s.get('importance') == 'Required'][:3]
    if high_priority:
        recs.append({
            'id': 'rec-1',
            'type': 'critical',
            'title': f"Incorporate Key Missing Skills: {', '.join(high_priority)}",
            'description': f"The job description highlights {', '.join(high_priority)}. Adding these terms directly enhances automated ATS search matching.",
            'suggestedAction': "Highlight academic, internship, or project applications of these technologies in your experience bullets.",
            'targetSection': 'Skills'
        })
        
    if cosine_sim < 65:
        recs.append({
            'id': 'rec-2',
            'type': 'improvement',
            'title': "Mirror Position Action Verbs & Terminology",
            'description': "Your overall TF-IDF cosine similarity shows divergence in phrasing. Aligning verbs with the job requisition improves semantic overlap.",
            'suggestedAction': "Adopt exact phrasing directly from the responsibilities section in your work bullets.",
            'targetSection': 'Experience'
        })
    else:
        recs.append({
            'id': 'rec-3',
            'type': 'strength',
            'title': "Strong Natural Language & Vocabulary Alignment",
            'description': f"Your resume has {cosine_sim}% cosine similarity with the role requisitions.",
            'suggestedAction': "Keep current bullet phrasing; focus on quantifying achievements with measurable metrics.",
            'targetSection': 'Summary'
        })
        
    if ats_score < 80:
        recs.append({
            'id': 'rec-4',
            'type': 'improvement',
            'title': "Standardize Header Sections for ATS Crawlers",
            'description': "Ensure standard section titles (Work Experience, Education, Technical Skills) for reliable parsing.",
            'suggestedAction': "Use simple text layout without columns or tables inside image frames.",
            'targetSection': 'Education'
        })
        
    return recs

def analyze_full(resume_text: str, jd_text: str, resume_title: str = "Resume", job_title: str = "Job") -> Dict[str, Any]:
    """End-to-end NLP analysis orchestrator."""
    cosine_sim, term_weights = calculate_tfidf_similarity(resume_text, jd_text)
    skills_data = extract_skills_analysis(resume_text, jd_text)
    
    missing_skill_names = [s['name'] for s in skills_data['missing_skills']]
    ats_report = evaluate_ats_compatibility(resume_text, jd_text, missing_skill_names)
    ats_score = ats_report['atsScore']
    
    word_count_resume = len(resume_text.strip().split())
    word_count_jd = len(jd_text.strip().split())
    
    skill_score = skills_data['skill_match_score']
    density_score = min(100, round((len(skills_data['matched_skills']) + 5) * 5.5))
    
    # Weighted composite score: 40% Cosine Sim + 35% Skill Match + 15% Keyword Density + 10% ATS
    overall_score = round(
        (cosine_sim * 0.40) + 
        (skill_score * 0.35) + 
        (density_score * 0.15) + 
        (ats_score * 0.10)
    )
    
    recs = generate_recommendations(skills_data['missing_skills'], cosine_sim, ats_score)
    
    return {
        'resume_title': resume_title,
        'job_title': job_title,
        'cosine_similarity': cosine_sim,
        'skill_match_score': skill_score,
        'keyword_density_score': density_score,
        'ats_readability_score': ats_score,
        'overall_score': overall_score,
        'word_count_resume': word_count_resume,
        'word_count_jd': word_count_jd,
        'matched_skills': skills_data['matched_skills'],
        'missing_skills': skills_data['missing_skills'],
        'category_gaps': skills_data['category_gaps'],
        'top_term_weights': term_weights,
        'recommendations': recs,
        'ats_compatibility_report': ats_report,
        'resume_text': resume_text,
        'job_description_text': jd_text,
        'score_explanation': {
            'disclaimer': 'The similarity score measures textual relevance and vocabulary overlap, not the probability of getting hired.',
            'formula': 'Overall Score = (Cosine Similarity × 0.40) + (Skill Match × 0.35) + (Keyword Density × 0.15) + (ATS Structure × 0.10)',
            'cosine_method': 'scikit-learn TfidfVectorizer(ngram_range=(1,2), sublinear_tf=True, norm=l2) and pairwise cosine_similarity.'
        }
    }
