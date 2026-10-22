-- SQLite Schema for AI ResumeMatch
-- Final Year Project Database

CREATE TABLE IF NOT EXISTS analyses (
    id TEXT PRIMARY KEY,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    resume_title TEXT NOT NULL,
    candidate_name TEXT,
    job_title TEXT NOT NULL,
    company_name TEXT,
    cosine_similarity REAL NOT NULL,
    skill_match_score REAL NOT NULL,
    keyword_density_score REAL,
    ats_readability_score REAL,
    ats_score REAL,
    overall_score REAL NOT NULL,
    word_count_resume INTEGER,
    word_count_jd INTEGER,
    resume_text TEXT,
    job_description_text TEXT,
    analysis_json TEXT
);

CREATE TABLE IF NOT EXISTS skills_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    analysis_id TEXT NOT NULL,
    skill_name TEXT NOT NULL,
    category TEXT NOT NULL,
    importance TEXT,
    frequency_in_jd INTEGER,
    found_in_resume BOOLEAN,
    FOREIGN KEY(analysis_id) REFERENCES analyses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_analyses_timestamp ON analyses(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_skills_analysis_id ON skills_cache(analysis_id);
