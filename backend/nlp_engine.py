"""Core NLP logic for AI ResumeMatch.

The module deliberately stays small and explainable:

1. TF-IDF vectorisation + cosine similarity -> resume/job text match percentage.
2. Dictionary-based keyword detection -> matched, missing and resume keywords.
3. Keyword coverage -> matched job keywords / all identified job keywords.
4. Rule-based suggestions derived only from the analysis output.

There is no database, generative AI, or hidden scoring model in this pipeline.

Text handling notes
-------------------
Both metrics share one tokenisation pass (:func:`clean_text`), so a document is
never normalised twice per request. Tokens keep the characters that carry
meaning in technical and professional terms -- ``c++``, ``c#``, ``node.js``,
``asp.net`` -- while punctuation that only separates words (commas, brackets,
slashes, hyphens) becomes a space. ``.NET`` is canonicalised to ``dotnet``
before tokenising so the leading dot is not lost, and ``go-to`` style hyphens
split naturally.

The TF-IDF vectoriser then re-uses those tokens (:func:`_vector_tokens`) rather
than scikit-learn's default ``\\w\\w+`` pattern, which would silently turn
``c++`` into ``c``, ``node.js`` into ``node`` + ``js`` and drop the distinction
between related skills.
"""

import json
import os
import re
import unicodedata
from functools import lru_cache
from typing import Any, Dict, Iterable, List, Tuple

from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS, TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

DICT_PATH = os.path.join(os.path.dirname(__file__), "skills_dictionary.json")

# A document needs a minimum amount of usable vocabulary before a cosine
# similarity means anything. Below this, one shared word would produce 100%.
MIN_VECTOR_TOKENS = 3


# ---------------------------------------------------------------------------
# Text preprocessing
# ---------------------------------------------------------------------------

# Letters/digits, optional dotted segments (node.js, asp.net, react.js), then
# trailing technical marks (c++, c#). Everything else acts as a separator, so
# "ci/cd" -> "ci cd", "full-stack" -> "full stack" and "UI/UX" -> "ui ux".
_TOKEN_RE = re.compile(r"[a-z0-9]+(?:\.[a-z0-9]+)*[+#]*")

# ".NET" must survive as one meaningful token. Only a leading dot is rewritten,
# so "ASP.NET" keeps its own token and does not become "asp dotnet".
_DOTNET_RE = re.compile(r"(?<![a-z0-9])\.net(?![a-z0-9])")

_QUOTE_TRANSLATION = str.maketrans({
    "\u2018": "'", "\u2019": "'", "\u201b": "'",
    "\u201c": '"', "\u201d": '"',
    "\u2010": "-", "\u2011": "-", "\u2012": "-",
    "\u2013": "-", "\u2014": "-", "\u2015": "-", "\u2212": "-",
    "\u00a0": " ",
})


def clean_text(text: str) -> str:
    """Normalise text into a space-separated token stream.

    Steps, in order:

    1. Unicode NFKC normalisation (ligatures, full-width characters).
    2. Typographic quotes/dashes folded to ASCII equivalents.
    3. Lower-casing, so ``REACT.JS`` and ``react.js`` are identical.
    4. ``.NET`` -> ``dotnet`` so the leading dot is not treated as a separator.
    5. Token extraction that keeps ``+``/``#``/internal dots (``c++``, ``c#``,
       ``node.js``) and drops everything else as a word separator.
    6. Whitespace collapsed to single spaces by the join itself.

    The result is idempotent: ``clean_text(clean_text(x)) == clean_text(x)``.
    """
    if not isinstance(text, str):
        return ""

    text = unicodedata.normalize("NFKC", text)
    text = text.translate(_QUOTE_TRANSLATION).lower()
    text = _DOTNET_RE.sub("dotnet", text)
    return " ".join(_TOKEN_RE.findall(text))


def _vector_tokens(cleaned: str) -> List[str]:
    """Tokenise already-cleaned text for TF-IDF.

    Kept intentionally close to the text people write:

    * Single characters and pure numbers are dropped (they are dates, grades or
      initials, not content); ``c`` from a stray ``C`` is noise, ``c++`` is not.
    * English stop words are filtered here, so the vectoriser needs no default
      token pattern and cannot mangle technical tokens.
    * An immediately repeated token is counted once. PDF layout artefacts and
      keyword stuffing ("Python Python Python") otherwise distort the weights
      without adding meaning.
    """
    tokens: List[str] = []
    previous = ""
    for token in cleaned.split():
        if len(token) < 2 or not any(char.isalpha() for char in token):
            continue
        if token in ENGLISH_STOP_WORDS:
            continue
        if token == previous:
            continue
        tokens.append(token)
        previous = token
    return tokens


# ---------------------------------------------------------------------------
# TF-IDF / cosine similarity
# ---------------------------------------------------------------------------

def _similarity_from_clean(resume_clean: str, job_clean: str) -> float:
    """Cosine similarity for documents that were already normalised."""
    if not resume_clean or not job_clean:
        return 0.0

    resume_tokens = _vector_tokens(resume_clean)
    job_tokens = _vector_tokens(job_clean)
    if len(resume_tokens) < MIN_VECTOR_TOKENS or len(job_tokens) < MIN_VECTOR_TOKENS:
        return 0.0

    try:
        vectorizer = TfidfVectorizer(
            tokenizer=str.split,
            preprocessor=None,
            token_pattern=None,
            stop_words=None,
            lowercase=False,
            sublinear_tf=True,
        )
        matrix = vectorizer.fit_transform(
            [" ".join(resume_tokens), " ".join(job_tokens)]
        )
        similarity = cosine_similarity(matrix[0:1], matrix[1:2])[0][0]
    except ValueError:
        # Raised by scikit-learn when the vocabulary is empty (e.g. stop words
        # only). Report a safe zero instead of raising.
        return 0.0

    return round(min(100.0, max(0.0, float(similarity) * 100.0)), 1)


def calculate_tfidf_similarity(resume_text: str, job_description: str) -> float:
    """Return cosine similarity between resume and job description as 0-100.

    Uses scikit-learn's TF-IDF vectoriser with sublinear term frequency on the
    shared token stream. If either document contains too little usable
    vocabulary (empty, stop words only, or fewer than ``MIN_VECTOR_TOKENS``
    content tokens), the similarity is safely reported as 0.0 instead of
    raising an error or matching a single shared word.
    """
    return _similarity_from_clean(clean_text(resume_text), clean_text(job_description))


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


def _iter_skill_entries() -> Iterable[Tuple[str, str, List[str], List[str], List[str]]]:
    """Yield unique ``(name, category, terms, exclude_after, exclude_before)``.

    A dictionary entry may declare an optional ``terms`` list. When present it
    replaces the display name for matching, which keeps ambiguous names such as
    ``Go (Golang)`` or ``R`` from matching ordinary English words. Optional
    ``exclude_after`` / ``exclude_before`` lists block a term that is followed
    or preceded by one of the given words, e.g. ``accounting for``,
    ``reporting to`` or ``kubernetes node``.
    """
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
            explicit_terms = entry.get("terms")
            if isinstance(explicit_terms, list) and explicit_terms:
                match_terms = [
                    str(term).strip() for term in explicit_terms if str(term).strip()
                ]
            else:
                match_terms = [name, *aliases]

            exclude_after = [
                str(value).strip().casefold()
                for value in entry.get("exclude_after", [])
                if str(value).strip()
            ]
            exclude_before = [
                str(value).strip().casefold()
                for value in entry.get("exclude_before", [])
                if str(value).strip()
            ]

            yield name, str(category), match_terms, exclude_after, exclude_before


def _normalised_terms(values: List[str]) -> List[str]:
    """Normalise keyword terms, removing duplicates and unusable fragments.

    Single-character terms are dropped: a lone ``r`` or ``c`` appears in
    ordinary prose far more often than it refers to a skill, so those skills
    must be matched through an unambiguous form (``r programming``, ``c++``).
    """
    terms: List[str] = []
    for value in values:
        normalised = clean_text(value)
        if len(normalised) < 2 or normalised in terms:
            continue
        terms.append(normalised)
    return terms


@lru_cache(maxsize=1)
def _keyword_terms() -> Tuple[
    Tuple[str, str, Tuple[str, ...], Tuple[str, ...], Tuple[str, ...]], ...
]:
    """Normalised entries with exclusions, prepared once per process.

    The dictionary is static for the lifetime of the process, so rebuilding and
    re-normalising every entry for each request would be wasted work.
    """
    prepared: List[
        Tuple[str, str, Tuple[str, ...], Tuple[str, ...], Tuple[str, ...]]
    ] = []
    for name, category, terms, exclude_after, exclude_before in _iter_skill_entries():
        normalised = _normalised_terms(terms)
        if normalised:
            prepared.append((
                name,
                category,
                tuple(normalised),
                tuple(exclude_after),
                tuple(exclude_before),
            ))
    return tuple(prepared)


@lru_cache(maxsize=None)
def _term_pattern(term: str, exclusions: Tuple[str, ...] = ()) -> "re.Pattern[str]":
    """Compiled matcher for one normalised term, reused across requests."""
    pattern = r"(?<![a-z0-9._-])" + re.escape(term) + r"(?![a-z0-9_])"
    if exclusions:
        blocked = "|".join(re.escape(value) for value in exclusions)
        pattern += r"(?!\s+(?:" + blocked + r")(?![a-z0-9_]))"
    return re.compile(pattern)


def _preceded_by_blocked_word(
    clean_document: str,
    position: int,
    excluded: Tuple[str, ...],
) -> bool:
    """True when the word before ``position`` is in ``excluded``."""
    if not excluded or position <= 0:
        return False
    before = clean_document[:position].rstrip()
    if not before:
        return False
    previous_word = before.rsplit(" ", 1)[-1]
    return previous_word in excluded


def _count_occurrences(
    clean_document: str,
    terms: Tuple[str, ...],
    exclude_after: Tuple[str, ...] = (),
    exclude_before: Tuple[str, ...] = (),
) -> int:
    """Count whole-term occurrences without matching longer words.

    Lookarounds instead of ``\\b`` keep punctuation-bearing skills working:
    ``c++`` must match ``c++`` but not ``c``; ``java`` must not match
    ``javascript``; ``.net`` must not match inside ``asp.net``. Dots and
    hyphens on the left also stop the short alias ``js`` from matching inside
    ``node.js`` or ``express.js``.

    Overlapping matches between a keyword and its longer alias (``node``
    inside ``node.js``) count once, so a single mention is never doubled.
    """
    spans: List[Tuple[int, int]] = []
    for term in terms:
        # C-level substring guard first: most dictionary terms never appear in a
        # given document, so the boundary regex only runs when it can match.
        # Skipping is exact, because a regex match always contains the literal.
        if term not in clean_document:
            continue
        for match in _term_pattern(term, exclude_after).finditer(clean_document):
            if _preceded_by_blocked_word(clean_document, match.start(), exclude_before):
                continue
            spans.append((match.start(), match.end()))

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


def _keywords_from_clean(resume_clean: str, job_clean: str) -> Dict[str, Any]:
    """Keyword analysis for documents that were already normalised."""
    job_keywords: List[Dict[str, Any]] = []
    resume_keywords: List[Dict[str, Any]] = []

    for name, category, terms, exclude_after, exclude_before in _keyword_terms():
        job_frequency = _count_occurrences(
            job_clean, terms, exclude_after, exclude_before
        )
        resume_frequency = _count_occurrences(
            resume_clean, terms, exclude_after, exclude_before
        )

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


def analyze_keywords(resume_text: str, job_description: str) -> Dict[str, Any]:
    """Identify job keywords and compare them with the resume.

    Only terms from the maintained skills dictionary are treated as keywords,
    which prevents ordinary job-posting words from inflating coverage.
    """
    return _keywords_from_clean(clean_text(resume_text), clean_text(job_description))


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
    # Normalise each document once, then reuse the result for both metrics.
    resume_clean = clean_text(resume_text)
    job_clean = clean_text(job_description)

    match_percentage = _similarity_from_clean(resume_clean, job_clean)
    keyword_analysis = _keywords_from_clean(resume_clean, job_clean)

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
