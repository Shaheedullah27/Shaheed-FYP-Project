"""Core NLP logic for AI ResumeMatch.

The module deliberately stays small and explainable:

1. TF-IDF vectorisation + cosine similarity -> resume/job text match percentage.
2. Dictionary-based keyword detection -> matched, missing and resume keywords.
3. Keyword coverage -> matched job keywords / all identified job keywords.
4. Rule-based suggestions derived only from the analysis output.

There is no database, generative AI, or hidden scoring model in this pipeline.
"""

import json
import os
import re
from functools import lru_cache
from typing import Any, Dict, Iterable, List, Tuple

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

DICT_PATH = os.path.join(os.path.dirname(__file__), "skills_dictionary.json")


# ---------------------------------------------------------------------------
# Text preprocessing
# ---------------------------------------------------------------------------

def clean_text(text: str) -> str:
    """Normalise text for vectorisation and keyword comparison.

    Lower-cases the text, keeps technical characters such as ``+``, ``#`` and
    ``.`` (so ``C++``, ``C#`` and ``Node.js`` survive), and collapses all
    remaining punctuation and whitespace into single spaces.
    """
    if not isinstance(text, str):
        return ""

    text = text.lower()
    text = re.sub(r"[\u2018\u2019]", "'", text)
    text = re.sub(r"[^a-z0-9+#.\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


# ---------------------------------------------------------------------------
# TF-IDF / cosine similarity
# ---------------------------------------------------------------------------

def calculate_tfidf_similarity(resume_text: str, job_description: str) -> float:
    """Return cosine similarity between resume and job description as 0-100.

    Uses scikit-learn's TF-IDF vectoriser with sublinear term frequency. If
    either document contains no usable vocabulary (for example, only stop
    words), the similarity is safely reported as 0.0 instead of raising an
    error.
    """
    resume_clean = clean_text(resume_text)
    job_clean = clean_text(job_description)

    if not resume_clean or not job_clean:
        return 0.0

    try:
        vectorizer = TfidfVectorizer(
            stop_words="english",
            sublinear_tf=True,
        )
        matrix = vectorizer.fit_transform([resume_clean, job_clean])
        similarity = cosine_similarity(matrix[0:1], matrix[1:2])[0][0]
    except ValueError:
        # Raised by scikit-learn when the vocabulary is empty (e.g. stop words only).
        return 0.0

    return round(min(100.0, max(0.0, float(similarity) * 100.0)), 1)


# ---------------------------------------------------------------------------
# Skills dictionary and keyword comparison
# ---------------------------------------------------------------------------

@lru_cache(maxsize=1)
def load_skills_dictionary() -> Dict[str, List[Dict[str, Any]]]:
    """Load the maintainable keyword vocabulary from JSON."""
    if not os.path.exists(DICT_PATH):
        return {}

    try:
        with open(DICT_PATH, "r", encoding="utf-8") as handle:
            data = json.load(handle)
    except (OSError, json.JSONDecodeError):
        return {}

    return data if isinstance(data, dict) else {}


def _iter_skill_entries() -> Iterable[Tuple[str, str, List[str]]]:
    """Yield unique ``(name, category, aliases)`` entries from the dictionary."""
    seen = set()
    for category, entries in load_skills_dictionary().items():
        if not isinstance(entries, list):
            continue
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            name = str(entry.get("name", "")).strip()
            if not name:
                continue
            key = name.casefold()
            if key in seen:
                continue
            seen.add(key)
            aliases = [
                str(alias).strip()
                for alias in entry.get("aliases", [])
                if str(alias).strip()
            ]
            yield name, str(category), aliases


def _normalised_terms(name: str, aliases: List[str]) -> List[str]:
    """Normalise a keyword and its aliases, removing duplicates."""
    terms: List[str] = []
    for value in [name, *aliases]:
        normalised = clean_text(value)
        if normalised and normalised not in terms:
            terms.append(normalised)
    return terms


def _count_occurrences(clean_document: str, terms: List[str]) -> int:
    """Count whole-term occurrences without matching longer words.

    Lookarounds instead of ``\\b`` keep punctuation-bearing skills working:
    ``c++`` must match ``c++`` but not ``c``; ``java`` must not match
    ``javascript``; ``.net`` must not match inside ``asp.net``. Dots and
    hyphens on the left also stop the short alias ``js`` from matching inside
    ``Node.js`` or ``Express.js``.

    Overlapping matches between a keyword and its longer alias (``express``
    inside ``express.js``) count once, so a single mention is never doubled.
    """
    spans: List[Tuple[int, int]] = []
    for term in terms:
        pattern = re.compile(
            r"(?<![a-z0-9._-])" + re.escape(term) + r"(?![a-z0-9_])"
        )
        spans.extend((match.start(), match.end()) for match in pattern.finditer(clean_document))

    spans.sort()
    total = 0
    covered_until = -1
    for start, end in spans:
        if start >= covered_until:
            total += 1
        covered_until = max(covered_until, end)
    return total


def _keyword_record(
    name: str,
    category: str,
    job_frequency: int,
    resume_frequency: int,
) -> Dict[str, Any]:
    return {
        "keyword": name,
        "category": category,
        "job_frequency": job_frequency,
        "resume_frequency": resume_frequency,
    }


def analyze_keywords(resume_text: str, job_description: str) -> Dict[str, Any]:
    """Identify job keywords and compare them with the resume.

    Only terms from the maintained skills dictionary are treated as keywords,
    which prevents ordinary job-posting words from inflating coverage.
    """
    resume_clean = clean_text(resume_text)
    job_clean = clean_text(job_description)

    job_keywords: List[Dict[str, Any]] = []
    resume_keywords: List[Dict[str, Any]] = []

    for name, category, aliases in _iter_skill_entries():
        terms = _normalised_terms(name, aliases)
        if not terms:
            continue

        job_frequency = _count_occurrences(job_clean, terms)
        resume_frequency = _count_occurrences(resume_clean, terms)

        record = _keyword_record(
            name=name,
            category=category,
            job_frequency=job_frequency,
            resume_frequency=resume_frequency,
        )

        if resume_frequency > 0:
            resume_keywords.append(record)

        if job_frequency > 0:
            job_keywords.append(record)

    matched_keywords = [
        item for item in job_keywords if item["resume_frequency"] > 0
    ]
    missing_keywords = [
        item for item in job_keywords if item["resume_frequency"] == 0
    ]

    # Most frequently requested keywords are the most useful to show first.
    matched_keywords.sort(key=lambda item: (-item["job_frequency"], item["keyword"]))
    missing_keywords.sort(key=lambda item: (-item["job_frequency"], item["keyword"]))
    resume_keywords.sort(key=lambda item: (-item["resume_frequency"], item["keyword"]))

    job_keyword_count = len(job_keywords)
    matched_count = len(matched_keywords)
    keyword_coverage = (
        round((matched_count / job_keyword_count) * 100.0, 1)
        if job_keyword_count > 0
        else 0.0
    )

    return {
        "matched_keywords": matched_keywords,
        "missing_keywords": missing_keywords,
        "resume_keywords": resume_keywords,
        "job_keyword_count": job_keyword_count,
        "matched_keyword_count": matched_count,
        "keyword_coverage": keyword_coverage,
    }


# ---------------------------------------------------------------------------
# Rule-based suggestions
# ---------------------------------------------------------------------------

def generate_suggestions(
    matched_keywords: List[Dict[str, Any]],
    missing_keywords: List[Dict[str, Any]],
    job_keyword_count: int,
    keyword_coverage: float,
    resume_keyword_count: int,
    resume_word_count: int,
) -> List[Dict[str, str]]:
    """Build practical suggestions from the actual analysis results.

    Suggestions never invent experience, qualifications, or skills. Missing
    keywords are phrased conditionally ("if you have used ...").
    """
    suggestions: List[Dict[str, str]] = []

    if job_keyword_count == 0:
        suggestions.append({
            "id": "no-job-keywords",
            "title": "No known keywords found in the job description",
            "description": (
                "The posting does not contain any terms from the current skills "
                "dictionary, so keyword coverage cannot be measured for this run."
            ),
            "action": (
                "Paste the complete job description, including required tools and "
                "skills. This is not a problem with your resume."
            ),
        })

    if missing_keywords:
        missing_names = [item["keyword"] for item in missing_keywords[:5]]
        readable_names = ", ".join(missing_names)
        suggestions.append({
            "id": "review-missing-keywords",
            "title": f"Review {len(missing_keywords)} job keyword"
                     + ("s" if len(missing_keywords) != 1 else "")
                     + " not found in your resume",
            "description": f"The job description mentions {readable_names}, but these terms were not detected in your resume.",
            "action": (
                f"If you have genuine experience with {readable_names}, add it to your "
                "skills, projects, or work history using the same wording. Only include "
                "skills you actually have."
            ),
        })

    if matched_keywords:
        matched_names = [item["keyword"] for item in matched_keywords[:5]]
        suggestions.append({
            "id": "highlight-matched-keywords",
            "title": "Make your existing matching skills easy to find",
            "description": f"Your resume already contains {', '.join(matched_names)}.",
            "action": (
                "Keep these keywords in a clearly labelled Skills section and support "
                "them with real project, coursework, or work examples."
            ),
        })

    if resume_word_count < 150 or resume_keyword_count < 4:
        suggestions.append({
            "id": "add-relevant-detail",
            "title": "Add relevant detail where it is missing",
            "description": (
                "The resume contains limited relevant content for this comparison, "
                "which reduces both text similarity and keyword coverage."
            ),
            "action": (
                "Add projects, coursework, tools, or responsibilities that you genuinely "
                "have. Do not add experience, certifications, or skills you do not possess."
            ),
        })

    if job_keyword_count > 0 and keyword_coverage < 60:
        suggestions.append({
            "id": "align-wording",
            "title": "Use the job posting's wording where it is accurate",
            "description": (
                f"Your resume matches {keyword_coverage}% of the identified job keywords. "
                "Different wording can lower both coverage and text similarity."
            ),
            "action": (
                "Where your real experience matches a requirement, describe it with the "
                "same terminology as the posting rather than a vague synonym."
            ),
        })
    elif job_keyword_count > 0 and keyword_coverage >= 80:
        suggestions.append({
            "id": "strong-keyword-coverage",
            "title": "Keyword coverage is strong",
            "description": (
                f"Your resume includes {len(matched_keywords)} of {job_keyword_count} "
                "identified job keywords."
            ),
            "action": (
                "Keep the content accurate and make sure every keyword is supported by a "
                "concrete example of what you actually did."
            ),
        })

    suggestions.append({
        "id": "review-against-requirements",
        "title": "Review the resume against the job requirements",
        "description": (
            "Text similarity and keyword coverage cannot judge the quality, seniority, "
            "or truthfulness of your experience."
        ),
        "action": (
            "Read the posting again and check that your resume gives honest evidence for "
            "the most important requirements, not just the right keywords."
        ),
    })

    return suggestions[:5]


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------

def analyze_full(
    resume_text: str,
    job_description: str,
    resume_title: str = "Uploaded resume",
    job_title: str = "Target role",
) -> Dict[str, Any]:
    """Run the complete, deterministic resume/job comparison."""
    match_percentage = calculate_tfidf_similarity(resume_text, job_description)
    keyword_analysis = analyze_keywords(resume_text, job_description)

    resume_word_count = len(resume_text.split())
    job_description_word_count = len(job_description.split())

    suggestions = generate_suggestions(
        matched_keywords=keyword_analysis["matched_keywords"],
        missing_keywords=keyword_analysis["missing_keywords"],
        job_keyword_count=keyword_analysis["job_keyword_count"],
        keyword_coverage=keyword_analysis["keyword_coverage"],
        resume_keyword_count=len(keyword_analysis["resume_keywords"]),
        resume_word_count=resume_word_count,
    )

    return {
        "resume_title": resume_title,
        "job_title": job_title,
        "match_percentage": match_percentage,
        "keyword_coverage": keyword_analysis["keyword_coverage"],
        "job_keyword_count": keyword_analysis["job_keyword_count"],
        "matched_keyword_count": keyword_analysis["matched_keyword_count"],
        "matched_keywords": keyword_analysis["matched_keywords"],
        "missing_keywords": keyword_analysis["missing_keywords"],
        "resume_keywords": keyword_analysis["resume_keywords"],
        "resume_word_count": resume_word_count,
        "job_description_word_count": job_description_word_count,
        "suggestions": suggestions,
        "disclaimer": (
            "The match percentage is a TF-IDF cosine similarity between the two texts. "
            "Keyword coverage is the share of dictionary keywords from the job description "
            "that also appear in the resume. Neither value is a hiring probability or an "
            "official Applicant Tracking System (ATS) score."
        ),
    }
