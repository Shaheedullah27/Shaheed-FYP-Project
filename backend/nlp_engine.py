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

Keyword coverage notes
----------------------
Coverage is a *set* measure: every dictionary entry contributes at most one
matched requirement, no matter how often it is repeated. Counting occurrences
only orders the lists; it never changes coverage. Keyword coverage is therefore
independent of the TF-IDF percentage, which is a continuous lexical similarity.

A dictionary hit also has to read as a real skill mention. Short aliases that
double as units (``hr``, ``ml``) are rejected after a number, a few ambiguous
names carry context exclusions in the JSON dictionary (``excel at``,
``react to``, ``kubernetes node``), and an explicitly negated mention
("no experience with Kubernetes") is not treated as evidence. Negation is
scoped per clause: a negator covers a following comma/``or``/``and`` list but
stops at a sentence boundary, a contrast word (``but``) or a strength word, so
"no experience with Docker, Kubernetes, or AWS, but strong Python" keeps Python
positive. These guards are deliberately shallow and are documented as
limitations rather than presented as full language understanding.

Two further distinctions are internal only and never change the API shape:

* A job requirement can be *required*, *preferred* or *optional*. That level
  orders and phrases suggestions; it does not weight the coverage percentage.
* Two requirements joined by ``or`` in the posting ("React or Angular") form one
  alternative requirement. When the resume evidences one alternative, the
  absent alternative is not counted as an additional gap.
"""

import json
import os
import re
import unicodedata
from functools import lru_cache
from typing import Any, Dict, Iterable, List, Optional, Tuple

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

# "don't" -> "don not" keeps the negation word as its own token. Without this,
# the apostrophe split produced "don" + "t" and negated evidence was invisible.
_CONTRACTION_RE = re.compile(r"n't\b")

_QUOTE_TRANSLATION = str.maketrans({
    "\u2018": "'", "\u2019": "'", "\u201b": "'",
    "\u201c": '"', "\u201d": '"',
    "\u2010": "-", "\u2011": "-", "\u2012": "-",
    "\u2013": "-", "\u2014": "-", "\u2015": "-", "\u2212": "-",
    "\u2026": "...", "\u00a0": " ",
})


def _normalise_text(text: str) -> str:
    """Unicode, case and contraction normalisation shared by every consumer.

    Kept separate from token extraction so negation can inspect the original
    punctuation and line breaks while producing exactly the same token stream
    as :func:`clean_text`.
    """
    if not isinstance(text, str):
        return ""

    text = unicodedata.normalize("NFKC", text)
    text = text.translate(_QUOTE_TRANSLATION).lower()
    text = text.replace("can't", "can not").replace("won't", "will not")
    text = text.replace("shan't", "shall not")
    text = _CONTRACTION_RE.sub(" not", text)
    return _DOTNET_RE.sub("dotnet", text)


def clean_text(text: str) -> str:
    """Normalise text into a space-separated token stream.

    Steps, in order:

    1. Unicode NFKC normalisation (ligatures, full-width characters).
    2. Typographic quotes/dashes folded to ASCII equivalents.
    3. Lower-casing, so ``REACT.JS`` and ``react.js`` are identical.
    4. Contractions expanded just enough for negation (``don't`` -> ``don not``).
    5. ``.NET`` -> ``dotnet`` so the leading dot is not treated as a separator.
    6. Token extraction that keeps ``+``/``#``/internal dots (``c++``, ``c#``,
       ``node.js``) and drops everything else as a word separator.
    7. Whitespace collapsed to single spaces by the join itself.

The result is idempotent: ``clean_text(clean_text(x)) == clean_text(x)``.
"""
    return " ".join(_TOKEN_RE.findall(_normalise_text(text)))


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


# Words that make a skill mention read as absent rather than present.
_NEGATION_WORDS = frozenset({
    "no", "not", "never", "without", "lack", "lacks", "lacking",
    "none", "zero", "nor", "cannot", "nothing",
})

# Idioms where the negator does not deny the skill: "not only Python",
# "no problem using Python", "no better tool than Python". The word directly
# after the negator decides, so the rest of the clause is left untouched.
_NEGATION_EXCEPTIONS = frozenset({
    "only", "just", "problem", "problems", "doubt", "doubts", "better",
    "necessarily", "issue", "issues", "trouble", "difficulty", "shortage",
})

# A negated list ends at a contrast or a new clause. These words are checked
# before a token is added to the scope, so "but strong Python" keeps Python.
_CLAUSE_BOUNDARY_WORDS = frozenset({
    "but", "however", "yet", "although", "though", "whereas", "except",
    "excepting", "instead", "plus", "additionally", "besides", "still",
})

# List glue inside a negated enumeration: "Docker, Kubernetes, or AWS".
_LIST_CONNECTORS = frozenset({
    "and", "or", "nor", "as", "well", "both", "either", "including",
})

# Hard cap so a long sentence cannot turn into an unbounded negation scope.
_NEGATION_SCOPE_LIMIT = 12

# Sentence-level separators. A colon is deliberately absent: "Required: SQL" is
# a list introducer, not the end of the requirement clause.
_CLAUSE_MARKS = frozenset(".;!?") | {chr(10), chr(13)}

# Words that can sit between a negator and the skill without changing what is
# negated: "no practical professional experience with Python". The scan stops at
# the first word outside this set, so "no problem using Python" and "not only
# Python" stay positive.
_NEGATION_FILLERS = frozenset({
    "a", "an", "the", "any", "this", "that", "these", "those",
    "my", "our", "your", "their", "his", "her", "its", "i", "we", "you", "they",
    "prior", "previous", "practical", "professional", "hands-on", "handson",
    "real", "direct", "formal", "working", "worked", "work", "industrial",
    "commercial", "relevant",
    "experience", "experiences", "knowledge", "exposure", "familiarity",
    "background", "understanding", "skills", "skill", "training",
    "use", "usage", "using", "used",
    "in", "with", "of", "to", "on", "at", "for", "from", "about", "into",
    "have", "has", "had", "do", "does", "did", "am", "is", "are", "was",
    "were", "be", "been", "being",
    "comfortable", "familiar", "experienced", "proficient", "fluent", "confident",
    "much", "enough", "significant", "solid", "strong", "advanced", "expert",
    "proven", "extensive", "deep", "very", "so", "particularly", "especially",
    "highly", "really", "well", "know", "knows", "knew", "known", "knowing",
})

# "Python is not required" / "Kubernetes: no experience required".
_REQUIREMENT_CLOSERS = frozenset({
    "required", "mandatory", "essential", "necessary", "needed", "compulsory",
})


def _clause_boundaries(
    normalised: str,
    matches: List["re.Match[str]"],
) -> Tuple[frozenset[int], frozenset[int], frozenset[int], frozenset[int]]:
    """Token indices that begin a new sentence and a new negation scope.

    :func:`clean_text` removes punctuation, so the information has to be
    recovered from the gaps between token spans. A boundary before token ``i``
    means the clause ended between ``i - 1`` and ``i``.

    Colon boundaries are returned only for negation: a colon after a heading
    ("Required: SQL") introduces a list and must not stop requirement-level
    cues, but it does end a negated enumeration.
    """
    sentence = set()
    negation = set()
    commas = set()
    colons = set()
    for index in range(1, len(matches)):
        gap = normalised[matches[index - 1].end(): matches[index].start()]
        if any(mark in gap for mark in _CLAUSE_MARKS):
            sentence.add(index)
            negation.add(index)
        elif ":" in gap:
            negation.add(index)
            colons.add(index)
        elif "," in gap:
            commas.add(index)
    return frozenset(sentence), frozenset(negation), frozenset(commas), frozenset(colons)


def _negated_token_indices(
    tokens: List[str],
    boundary_before: frozenset[int],
    comma_before: frozenset[int] = frozenset(),
    colon_before: frozenset[int] = frozenset(),
) -> frozenset[int]:
    """Token positions covered by a clause-scoped negation.

    A negator first skips a short phrase such as "experience with" or "familiar
    with", then covers the following enumeration until one of these stops it:

    * sentence punctuation or a line break (computed from the gaps between
      tokens, because :func:`clean_text` removes punctuation from the stream);
    * a contrast word such as ``but`` or ``however``;
    * a strength word once at least one item has been consumed, so
      "no experience with Docker and strong Python skills" does not swallow
      Python;
    * the scope cap.

    The word directly after a negator can cancel it for idioms such as "not
    only", "no problem" and "no better tool than". Ambiguous phrases are left
    positive on purpose; that limitation is documented rather than guessed at.
    """
    if not tokens or not _NEGATION_WORDS.intersection(tokens):
        return frozenset()

    negated = set()
    index = 0
    while index < len(tokens):
        if tokens[index] not in _NEGATION_WORDS:
            index += 1
            continue

        cursor = index + 1
        if cursor < len(tokens) and tokens[cursor] in _NEGATION_EXCEPTIONS:
            index = cursor + 1
            continue

        while (
            cursor < len(tokens)
            and tokens[cursor] in _NEGATION_FILLERS
            and cursor not in boundary_before
        ):
            cursor += 1

        if cursor >= len(tokens) or cursor in boundary_before:
            index = max(cursor, index + 1)
            continue

        content_seen = 0
        start = cursor
        # "Not required: Kubernetes" places the item after a colon. A colon
        # may be crossed only when the negator was directly followed by a
        # requirement closer; a sentence or semicolon still ends the scope.
        # "No experience required: Python" is an entry-level phrase about
        # experience, not a negation of Python, so it must not cross.
        entry_level = (
            tokens[index] == "no"
            and start > 0
            and tokens[start - 1]
            in {"experience", "experiences", "knowledge", "background"}
        )
        requirement_clause = tokens[start] in _REQUIREMENT_CLOSERS and not entry_level
        while cursor < len(tokens) and cursor - start < _NEGATION_SCOPE_LIMIT:
            if cursor in boundary_before and not (
                requirement_clause and cursor in colon_before
            ):
                break
            token = tokens[cursor]
            if token in _CLAUSE_BOUNDARY_WORDS:
                break
            if content_seen and token in _STRENGTH_WORDS:
                break
            negated.add(cursor)
            if token not in _NEGATION_FILLERS and token not in _LIST_CONNECTORS:
                content_seen += 1
            cursor += 1

        index = max(cursor, index + 1)

    # A list can also be negated after the fact: "Kubernetes, Docker and AWS
    # are not required". Only a comma-separated list is unwound backwards; a
    # sentence such as "Kubernetes is used here and Docker is not required"
    # stops at "here" and therefore keeps Kubernetes positive.
    for index, token in enumerate(tokens):
        if token not in _NEGATION_WORDS:
            continue
        if not any(
            closer in _REQUIREMENT_CLOSERS
            for closer in tokens[index + 1: index + 4]
        ):
            continue
        if "necessarily" in tokens[index + 1: index + 4]:
            continue

        cursor = index - 1
        content_seen = 0
        seen_comma = False
        while cursor >= 0 and cursor + 1 not in boundary_before:
            candidate = tokens[cursor]
            if candidate in _CLAUSE_BOUNDARY_WORDS:
                break
            if candidate in _REQUIREMENT_CLOSERS:
                break
            if candidate in _NEGATION_FILLERS or candidate in _LIST_CONNECTORS:
                cursor -= 1
                continue
            seen_comma = seen_comma or cursor in comma_before
            if content_seen and not seen_comma:
                break
            negated.add(cursor)
            content_seen += 1
            cursor -= 1

    return frozenset(negated)


def _prepare_document(
    text: str,
    need_boundaries: bool = False,
) -> Tuple[str, frozenset[int], frozenset[int]]:
    """Return the token stream, negated positions and clause boundaries.

    The tokens are exactly those of :func:`clean_text`. Most documents contain
    no negator, so the common case skips the match-span and boundary passes
    unless the caller needs boundaries for suggestion importance.
    """
    normalised = _normalise_text(text)
    tokens = _TOKEN_RE.findall(normalised)
    clean = " ".join(tokens)

    has_negation = bool(_NEGATION_WORDS.intersection(tokens))
    if not has_negation and not need_boundaries:
        return clean, frozenset(), frozenset()

    matches = list(_TOKEN_RE.finditer(normalised))
    (
        sentence_boundaries,
        negation_boundaries,
        comma_boundaries,
        colon_boundaries,
    ) = _clause_boundaries(normalised, matches)
    return (
        clean,
        _negated_token_indices(
            tokens, negation_boundaries, comma_boundaries, colon_boundaries
        ),
        sentence_boundaries,
    )


def _term_matches(
    clean_document: str,
    terms: Tuple[str, ...],
    exclude_after: Tuple[str, ...],
    exclude_before: Tuple[str, ...],
    words: List[str],
    negated: frozenset[int],
) -> List[Tuple[int, int, int]]:
    """Accepted ``(start, end, token_index)`` matches for one entry.

    Guards are applied here so counting and weak-requirement detection agree on
    what a real mention is:

    * boundary lookarounds (see :func:`_term_pattern`);
    * dictionary ``exclude_after`` / ``exclude_before`` context words;
    * a two-character alias after a number (``8 hr``, ``500 ml``) is a unit;
    * an explicitly negated mention is not evidence, including every member of
      a negated list (``no experience with Docker, Kubernetes, or AWS``) and a
      requirement clause such as ``Kubernetes is not required``. The negated
      positions are computed once per document, so a later clause cannot
      retroactively negate an earlier, positive requirement.

    A list rather than a generator keeps this hot loop inside one function; the
    token index is advanced incrementally, so a document is never re-scanned
    from the start for each match.
    """
    matches: List[Tuple[int, int, int]] = []
    for term in terms:
        # C-level substring guard first: most dictionary terms never appear in a
        # given document, so the boundary regex only runs when it can match.
        # Skipping is exact, because a regex match always contains the literal.
        if term not in clean_document:
            continue
        short_term = len(term) <= 2
        index = 0
        cursor = 0
        for match in _term_pattern(term, exclude_after).finditer(clean_document):
            start = match.start()
            index += clean_document.count(" ", cursor, start)
            cursor = start
            if _preceded_by_blocked_word(clean_document, start, exclude_before):
                continue
            if short_term and index > 0 and words[index - 1].isdigit():
                continue
            token_span = term.count(" ") + 1
            if any((index + offset) in negated for offset in range(token_span)):
                continue
            matches.append((start, match.end(), index))
    return matches


def _document_keyword_spans(
    clean_document: str,
    negated: frozenset[int] = frozenset(),
) -> Dict[str, List[Tuple[int, int]]]:
    """Per-keyword mention spans for one document.

    Overlapping matches for one entry (``node`` inside ``node.js``) collapse to
    a single occurrence. The single-match case, which dominates real documents,
    skips sorting entirely.

    Longest-match-wins is applied afterwards by :func:`_drop_nested_spans` so a
    compound requirement is not counted twice: "financial reporting" should be
    one requirement (Financial Reporting), not that plus the generic
    "Reporting" entry that its wording happens to contain.
    """
    if not clean_document:
        return {}

    words = clean_document.split()
    spans_by_name: Dict[str, List[Tuple[int, int]]] = {}
    for name, _category, terms, exclude_after, exclude_before in _keyword_terms():
        spans = [
            (start, end)
            for start, end, _index in _term_matches(
                clean_document, terms, exclude_after, exclude_before, words, negated
            )
        ]
        if not spans:
            continue
        if len(spans) > 1:
            spans.sort()
            merged = [spans[0]]
            for start, end in spans[1:]:
                if start < merged[-1][1]:
                    merged[-1] = (merged[-1][0], max(merged[-1][1], end))
                else:
                    merged.append((start, end))
            spans = merged
        spans_by_name[name] = spans
    return spans_by_name


def _drop_nested_spans(
    spans_by_name: Dict[str, List[Tuple[int, int]]],
) -> Dict[str, List[Tuple[int, int]]]:
    """Remove spans already covered by a longer keyword from another entry.

    A single sweep over spans ordered by position (longest first on ties): a
    span that ends inside the furthest end seen so far is nested in an earlier,
    longer keyword and is dropped. Spans of one entry never overlap after
    merging, so this cannot discard a keyword's own mentions.
    """
    flat = [
        (start, end, name)
        for name, spans in spans_by_name.items()
        for start, end in spans
    ]
    if not flat:
        return {}

    flat.sort(key=lambda item: (item[0], -(item[1] - item[0])))
    kept: Dict[str, List[Tuple[int, int]]] = {}
    furthest_end = -1
    for start, end, name in flat:
        if end <= furthest_end:
            continue
        kept.setdefault(name, []).append((start, end))
        furthest_end = end
    return kept


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


@lru_cache(maxsize=1)
def _category_by_name() -> Dict[str, str]:
    """Dictionary category per display name, used by alternative grouping."""
    return {
        name: category
        for name, category, _terms, _after, _before in _keyword_terms()
    }


def _alternative_groups(
    job_clean: str,
    job_spans: Dict[str, List[Tuple[int, int]]],
) -> Tuple[Tuple[str, str], ...]:
    """Find explicit two-item ``or`` alternatives in the job description.

    Rules, deliberately narrow:

    * the two mentions must be adjacent in the text with only the word ``or``
      between them, so unrelated skills near an ``or`` elsewhere are ignored;
    * both must come from the same dictionary category, so cross-domain
      comparisons such as "Python or Excel" are not treated as substitutes;
    * each keyword must occur exactly once in the posting, so grouping never
      removes a second, standalone requirement;
    * a keyword can belong to at most one group.

    The result is a tuple of ``(earlier, later)`` pairs in text order.
    """
    mentions = [
        (start, end, name)
        for name, spans in job_spans.items()
        for start, end in spans
    ]
    if len(mentions) < 2:
        return ()

    mentions.sort()
    categories = _category_by_name()
    grouped: set[str] = set()
    groups: List[Tuple[str, str]] = []

    for first, second in zip(mentions, mentions[1:]):
        first_start, first_end, first_name = first
        second_start, _second_end, second_name = second
        if first_name == second_name or first_name in grouped or second_name in grouped:
            continue
        if len(job_spans.get(first_name, ())) != 1 or len(job_spans.get(second_name, ())) != 1:
            continue
        if categories.get(first_name) != categories.get(second_name):
            continue
        if job_clean[first_end:second_start].strip() != "or":
            continue
        groups.append((first_name, second_name))
        grouped.update((first_name, second_name))

    return tuple(groups)


def _keyword_records(
    job_spans: Dict[str, List[Tuple[int, int]]],
    resume_spans: Dict[str, List[Tuple[int, int]]],
    alternative_groups: Tuple[Tuple[str, str], ...] = (),
) -> Dict[str, Any]:
    """Build the matched/missing/resume lists from accepted span maps.

    Frequencies are the number of surviving mentions, but coverage only asks
    whether a keyword is present at all, so repeated mentions never inflate it.

    An alternative group ("React or Angular") is one requirement:

    * when either side is evidenced, only the evidenced side is counted and the
      absent alternative is not reported as an additional gap;
    * when neither side is evidenced, one synthetic "React or Angular" record
      represents the group, so the gap is not counted twice.

    Every other requirement keeps the one-entry-one-requirement rule.
    """
    removed: set[str] = set()
    synthetic: List[Dict[str, Any]] = []
    categories = _category_by_name()

    for first_name, second_name in alternative_groups:
        matched = [
            name for name in (first_name, second_name)
            if resume_spans.get(name)
        ]
        if not matched:
            category = categories.get(first_name, "General")
            job_frequency = len(job_spans.get(first_name, ())) + len(
                job_spans.get(second_name, ())
            )
            synthetic.append(
                _keyword_record(
                    name=f"{first_name} or {second_name}",
                    category=category,
                    job_frequency=job_frequency,
                    resume_frequency=0,
                )
            )
            removed.update((first_name, second_name))
        elif len(matched) == 1:
            absent = second_name if matched[0] == first_name else first_name
            removed.add(absent)

    job_keywords: List[Dict[str, Any]] = []
    resume_keywords: List[Dict[str, Any]] = []

    for name, category, _terms, _exclude_after, _exclude_before in _keyword_terms():
        job_frequency = len(job_spans.get(name, ()))
        resume_frequency = len(resume_spans.get(name, ()))

        record = _keyword_record(
            name=name,
            category=category,
            job_frequency=job_frequency,
            resume_frequency=resume_frequency,
        )

        if resume_frequency > 0:
            resume_keywords.append(record)

        if job_frequency > 0 and name not in removed:
            job_keywords.append(record)

    job_keywords.extend(synthetic)

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


def _keywords_from_clean(
    resume_clean: str,
    job_clean: str,
    resume_negated: frozenset[int] = frozenset(),
    job_negated: frozenset[int] = frozenset(),
) -> Dict[str, Any]:
    """Keyword analysis for documents that were already normalised.

    Every document is scanned once: spans are collected per dictionary entry,
    merged, and stripped of nested duplicates. Each mention is also checked for
    negation and unit-like context by :func:`_term_matches`, so counting and
    suggestion logic agree on what evidence is real.
    """
    job_spans = _drop_nested_spans(_document_keyword_spans(job_clean, job_negated))
    resume_spans = _drop_nested_spans(
        _document_keyword_spans(resume_clean, resume_negated)
    )
    return _keyword_records(
        job_spans,
        resume_spans,
        _alternative_groups(job_clean, job_spans),
    )


def analyze_keywords(resume_text: str, job_description: str) -> Dict[str, Any]:
    """Identify job keywords and compare them with the resume.

    Only terms from the maintained skills dictionary are treated as keywords,
    which prevents ordinary job-posting words from inflating coverage. Coverage
    counts distinct requirements: a keyword repeated ten times in the job
    description is still one requirement, and an explicit "A or B" group counts
    once when either alternative is evidenced.
    """
    resume_clean, resume_negated, _ = _prepare_document(resume_text)
    job_clean, job_negated, _ = _prepare_document(job_description)
    return _keywords_from_clean(
        resume_clean, job_clean, resume_negated, job_negated
    )


# ---------------------------------------------------------------------------
# Requirement strength: missing vs weakly represented
# ---------------------------------------------------------------------------

# Words a posting uses to ask for depth rather than bare exposure.
_STRENGTH_WORDS = frozenset({
    "advanced", "expert", "expertise", "strong", "proven", "extensive", "deep",
    "solid", "hands-on", "handson", "proficient", "proficiency", "demonstrated",
    "mastery", "comprehensive", "thorough", "significant", "in-depth", "indepth",
    "specialist", "senior",
})

# Filler that can sit between the strength word and the skill, as in
# "proven experience with Docker" or "advanced level Excel".
_STRENGTH_CONNECTORS = frozenset({
    "a", "an", "the", "with", "in", "of", "at", "on", "for", "and", "or",
    "your", "our", "their", "this", "that", "these", "those",
    "level", "levels", "skills", "skill", "knowledge", "experience",
    "experiences", "using", "use", "to", "as", "is", "are", "be", "must",
    "should", "required", "require", "requires", "highly", "very", "plus",
    "including", "such", "exceptional", "excellent", "good", "working",
    "demonstrable", "practical", "professional",
})


@lru_cache(maxsize=1)
def _aliases_by_name() -> Dict[str, Tuple[str, ...]]:
    """Display aliases per keyword, used to show accepted alternatives."""
    aliases: Dict[str, Tuple[str, ...]] = {}
    for category, entries in load_skills_dictionary().items():
        if category.startswith("_") or not isinstance(entries, list):
            continue
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            name = str(entry.get("name", "")).strip()
            if not name:
                continue
            values = [
                str(alias).strip()
                for alias in entry.get("aliases", [])
                if str(alias).strip() and str(alias).strip().casefold() != name.casefold()
            ]
            if values:
                aliases[name] = tuple(dict.fromkeys(values))
    return aliases


def _slug(value: str) -> str:
    """Stable, readable suggestion id fragment."""
    return re.sub(r"[^a-z0-9]+", "-", value.casefold()).strip("-")


def _qualifier_before(words: List[str], index: int, window: int = 6) -> Optional[str]:
    """Return the depth word the posting places before a requirement."""
    cursor = index - 1
    steps = 0
    while cursor >= 0 and steps < window:
        token = words[cursor]
        if token in _STRENGTH_CONNECTORS:
            cursor -= 1
            steps += 1
            continue
        return token if token in _STRENGTH_WORDS else None
    return None


# Words that describe low depth, or exposure without practice. They only count
# next to a skill the posting asks for at a higher level, never on their own.
_LOW_EVIDENCE_WORDS = frozenset({
    "basic", "beginner", "beginners", "introductory", "elementary", "limited",
    "some", "familiar", "familiarity", "coursework", "academic", "exposure",
    "assisted", "assisting",
})


def _resume_evidence(
    resume_clean: str,
    spans: Iterable[Tuple[int, int]],
    resume_words: List[str],
) -> Tuple[bool, str]:
    """Return ``(shows_depth, low_evidence_word)`` for a keyword's mentions.

    Reuses the spans collected for counting, so no document is scanned a second
    time. ``shows_depth`` is true when a strength word sits within three tokens
    of a mention, or a number and a year unit appear within eight tokens (a
    stated duration). ``low_evidence_word`` records an explicit low-depth word
    such as "basic" or "familiar", so a thin mention can be described instead
    of guessed at.

    A bare keyword mention, or many repetitions of it, is not treated as depth.
    """
    shows_depth = False
    low_word = ""
    index = 0
    cursor = 0
    for start, end in spans:
        index += resume_clean.count(" ", cursor, start)
        cursor = start
        token_span = resume_clean[start:end].count(" ") + 1
        nearby = (
            resume_words[max(0, index - 3): index]
            + resume_words[index: index + token_span]
            + resume_words[index + token_span: index + token_span + 2]
        )
        if any(token in _STRENGTH_WORDS for token in nearby):
            shows_depth = True
        if not low_word:
            low_word = next(
                (token for token in nearby if token in _LOW_EVIDENCE_WORDS), ""
            )

        wider = resume_words[
            max(0, index - 8): index + token_span + 8
        ]
        # Require the number and the unit to be adjacent, so an unrelated "3"
        # elsewhere in the sentence is not read as three years of experience.
        has_duration = any(
            wider[position].isdigit()
            and (
                (position + 1 < len(wider) and wider[position + 1] in {"year", "years", "yrs"})
                or (position > 0 and wider[position - 1] in {"year", "years", "yrs"})
            )
            for position in range(len(wider))
        )
        if has_duration:
            shows_depth = True
    return shows_depth, low_word


def _weak_requirements(
    matched_keywords: List[Dict[str, Any]],
    job_spans: Dict[str, List[Tuple[int, int]]],
    resume_spans: Dict[str, List[Tuple[int, int]]],
    job_clean: str,
    resume_clean: str,
) -> List[Dict[str, Any]]:
    """Describe matched requirements that the resume covers only thinly.

    Three transparent rules built from the existing fields:

    * ``proficiency`` - the posting asks for depth and the resume itself
      describes the skill as basic, familiar or coursework-level;
    * ``qualified`` - the posting asks for depth and the resume never places a
      depth word or a number of years next to that skill;
    * ``repeated`` - the posting mentions the skill three or more times while
      the resume mentions it once.

    These records only enrich the suggestions. They never move a keyword
    between matched and missing and never change the coverage percentage.
    """
    if not matched_keywords or not job_clean or not resume_clean:
        return []

    job_words = job_clean.split()
    resume_words = resume_clean.split()
    weak: List[Dict[str, Any]] = []

    for item in matched_keywords[:8]:
        job_mentions = job_spans.get(item["keyword"], ())
        if not job_mentions:
            continue

        start, end = min(job_mentions)
        start_index = job_clean.count(" ", 0, start)
        token_span = job_clean[start:end].count(" ") + 1

        # "Advanced Excel" is itself a dictionary alias, so the depth word can
        # sit inside the matched phrase rather than before it.
        qualifier = None
        for token in job_words[start_index:start_index + token_span]:
            if token in _STRENGTH_WORDS:
                qualifier = token
                break
        if qualifier is None:
            qualifier = _qualifier_before(job_words, start_index)

        resume_mentions = resume_spans.get(item["keyword"], ())
        shows_depth, low_word = _resume_evidence(
            resume_clean, resume_mentions, resume_words
        )
        if qualifier and not shows_depth:
            weak.append({
                **item,
                "reason": "proficiency" if low_word else "qualified",
                "qualifier": qualifier,
                "evidence": low_word,
            })
        elif item["job_frequency"] >= 3 and item["resume_frequency"] == 1:
            weak.append({
                **item,
                "reason": "repeated",
                "qualifier": "",
                "evidence": low_word,
            })

    weak.sort(key=lambda item: (-item["job_frequency"], item["keyword"]))
    return weak[:4]


# ---------------------------------------------------------------------------
# Requirement importance
# ---------------------------------------------------------------------------

# Local wording that marks how strongly a posting asks for a requirement. A cue
# only applies near a mention (and never across a sentence or bullet boundary),
# so the word "required" in a different sentence cannot reclassify a keyword.
_REQUIRED_CUES = frozenset({
    "required", "require", "requires", "requirement", "requirements", "must",
    "essential", "mandatory", "compulsory", "necessary", "minimum", "needed",
    "need", "needs", "expect", "expected",
})
_PREFERRED_CUES = frozenset({
    "preferred", "prefer", "preferably", "desirable", "desired", "ideally",
})
_OPTIONAL_CUES = frozenset({
    "bonus", "optional", "plus", "advantage", "advantageous", "nice",
})

_LEVEL_RANK = {"required": 0, "unspecified": 1, "preferred": 2, "optional": 3}


def _cue_level(words: List[str], position: int) -> Optional[str]:
    """Classify the cue word at ``position``, if it is one."""
    token = words[position]
    if token == "nice":
        if words[position + 1: position + 3] == ["to", "have"]:
            return "optional"
        return None
    if token in _REQUIRED_CUES:
        return "required"
    if token in _PREFERRED_CUES:
        return "preferred"
    if token == "plus":
        # "a plus" / "would be a plus", not the additive "Python plus SQL".
        preceding = words[max(0, position - 2): position]
        return "optional" if any(
            word in {"a", "an", "is", "are", "be", "as"} for word in preceding
        ) else None
    if token in {"advantage", "advantageous"}:
        # "is an advantage", not "take advantage of Python".
        preceding = words[max(0, position - 2): position]
        return "optional" if any(
            word in {"a", "an", "is", "are", "be", "of"} for word in preceding
        ) else None
    if token in _OPTIONAL_CUES:
        return "optional"
    return None


def _requirement_levels(
    job_clean: str,
    boundary_before: frozenset[int],
    job_spans: Dict[str, List[Tuple[int, int]]],
) -> Dict[str, str]:
    """Infer required / preferred / optional for each job keyword.

    Only local cues count: the nearest cue before a mention within seven tokens,
    or a cue after it within six tokens. Sentences, bullets and contrast words
    stop the search. A negated cue ("not required") is ignored; such a mention
    is normally removed by negation handling before this point anyway.

    Ambiguous wording stays ``unspecified`` on purpose. The level is never used
    to weight coverage; it only orders and phrases suggestions.
    """
    words = job_clean.split()
    levels: Dict[str, str] = {}

    for name, spans in job_spans.items():
        start, end = min(spans)
        index = job_clean.count(" ", 0, start)
        token_span = job_clean[start:end].count(" ") + 1
        level = "unspecified"

        for cursor in range(index - 1, max(-1, index - 8), -1):
            if cursor + 1 in boundary_before or words[cursor] in _CLAUSE_BOUNDARY_WORDS:
                break
            cue = _cue_level(words, cursor)
            if not cue:
                continue
            if cursor > 0 and words[cursor - 1] in _NEGATION_WORDS:
                break
            level = cue
            break

        if level == "unspecified":
            for cursor in range(
                index + token_span,
                min(len(words), index + token_span + 6),
            ):
                if cursor in boundary_before:
                    break
                cue = _cue_level(words, cursor)
                if cue:
                    level = cue
                    break

        levels[name] = level

    return levels


def _group_levels(
    levels: Dict[str, str],
    groups: Tuple[Tuple[str, str], ...],
) -> Dict[str, str]:
    """Give a synthetic "A or B" requirement the stronger side's level."""
    combined = dict(levels)
    for first, second in groups:
        first_level = levels.get(first, "unspecified")
        second_level = levels.get(second, "unspecified")
        combined[f"{first} or {second}"] = min(
            (first_level, second_level),
            key=lambda level: _LEVEL_RANK.get(level, 1),
        )
    return combined


# ---------------------------------------------------------------------------
# Rule-based suggestions
# ---------------------------------------------------------------------------

# Practical next step per dictionary category. Suggestions stay specific by
# naming the actual requirement and then describing what evidence to add.
_CATEGORY_GUIDANCE = {
    "Programming Languages": "say which project or role it was used in and what you built or fixed with it",
    "Databases & Storage": "name the database and the kind of schema, query or data volume you handled",
    "Web Development": "say which part of the product you built and which framework features you used",
    "Data Science & Machine Learning": "describe the dataset, method or evaluation you used and the result",
    "Cloud & DevOps": "name the environment or pipeline stage you worked in and what you automated",
    "Testing & Quality": "name the test type, the tool and the coverage or defect outcome",
    "Data & Analytics": "state the dataset, the metric you measured and the decision your analysis supported",
    "Marketing & Analytics": "name the channel or tool and the metric or result you improved",
    "Design & Creative": "name the artefact you produced and the brief or outcome it served",
    "Business & Management": "give the scope you managed (team, budget or timeline) and the result",
    "Communication & Interpersonal": "give one concrete example (audience, format, outcome) instead of listing the trait",
    "Human Resources": "state the process, its volume and the system you used",
    "Finance & Accounting": "name the statements, systems or standards involved and the period or volume handled",
}


def _guidance_for(category: str) -> str:
    return _CATEGORY_GUIDANCE.get(category, "say where you used it and what you achieved")


def _missing_suggestion(
    item: Dict[str, Any],
    level: str = "unspecified",
) -> Dict[str, str]:
    """One specific, conditional suggestion for a missing requirement."""
    name = item["keyword"]
    alternatives = _aliases_by_name().get(name, ())
    alternative_note = (
        f" Accepted alternatives include {', '.join(alternatives[:3])}."
        if alternatives
        else ""
    )
    level_note = {
        "required": " The posting presents this as a required skill.",
        "preferred": " The posting presents this as preferred rather than mandatory.",
        "optional": (
            " The posting presents this as optional, so weigh it against the "
            "required gaps."
        ),
    }.get(level, "")
    if " or " in name:
        action = (
            f"If you have genuine experience with either {name}, "
            f"{_guidance_for(item['category'])}. Only include skills you actually have."
        )
    else:
        action = (
            f"If you have genuine experience with {name}, "
            f"{_guidance_for(item['category'])}. Only include skills you actually have."
        )
    return {
        "id": f"missing-{_slug(name)}",
        "title": f"{name} appears in the job description but not in your resume",
        "description": (
            f"The posting lists {name} under {item['category']}. Your resume text "
            f"does not contain this term or any of its known alternatives."
            f"{alternative_note}{level_note}"
        ),
        "action": action,
    }


def _weak_suggestion(item: Dict[str, Any]) -> Dict[str, str]:
    """Suggestion for a requirement the resume mentions but only thinly."""
    name = item["keyword"]
    guidance = _guidance_for(item["category"])
    mentions = item["job_frequency"]
    resume_mentions = item["resume_frequency"]
    evidence = item.get("evidence", "")

    if item["reason"] == "proficiency":
        qualifier = item["qualifier"]
        level_word = evidence or "basic"
        return {
            "id": f"weak-{_slug(name)}",
            "title": (
                f"The posting asks for {qualifier} {name}; your resume describes "
                f"{level_word} {name}"
            ),
            "description": (
                f"The job description asks for \"{qualifier}\" {name}, while your "
                f"resume frames {name} as {level_word}. This is a genuine mention, "
                "not a missing skill, but it may not evidence the requested depth."
            ),
            "action": (
                f"If you have worked beyond a {level_word} level with {name}, "
                f"{guidance}. Describe the level honestly and do not claim "
                "expertise you do not have."
            ),
        }

    if item["reason"] == "qualified":
        qualifier = item["qualifier"]
        return {
            "id": f"weak-{_slug(name)}",
            "title": f"The posting asks for {qualifier} {name}; your resume only mentions {name}",
            "description": (
                f'The job description qualifies {name} as "{qualifier}" and mentions it '
                f"{mentions} time{'s' if mentions != 1 else ''}, while your resume mentions "
                f"it {resume_mentions} time{'s' if resume_mentions != 1 else ''} without that "
                "level of detail."
            ),
            "action": (
                f"If you have that level of {name} experience, {guidance}. State the level "
                "honestly and do not claim expertise you do not have."
            ),
        }

    return {
        "id": f"weak-{_slug(name)}",
        "title": f"{name} is central to the posting but appears once in your resume",
        "description": (
            f"{name} appears {mentions} times in the job description but {resume_mentions} "
            "time in your resume, so the evidence may look thin."
            + (f" Your only mention describes it as {evidence}." if evidence else "")
        ),
        "action": (
            f"If you have used {name} more than that single mention suggests, {guidance}. "
            "Only include what you have actually done."
        ),
    }


def _remaining_missing_suggestion(remaining: List[Dict[str, Any]]) -> Dict[str, str]:
    """Group the missing requirements that did not get their own card."""
    names = [item["keyword"] for item in remaining[:4]]
    listed = ", ".join(names)
    extra = len(remaining) - len(names)
    return {
        "id": "missing-remaining",
        "title": f"Also not found: {listed}" + (f" and {extra} more" if extra else ""),
        "description": (
            f"These {len(remaining)} additional requirements from the posting do not appear "
            "in your resume text."
        ),
        "action": (
            f"If you have genuine experience with {listed}, describe it in your skills or work "
            "history using the posting's wording. Only include skills you actually have."
        ),
    }


def generate_suggestions(
    matched_keywords: List[Dict[str, Any]],
    missing_keywords: List[Dict[str, Any]],
    job_keyword_count: int,
    keyword_coverage: float,
    resume_keyword_count: int,
    resume_word_count: int,
    weak_requirements: Optional[List[Dict[str, Any]]] = None,
    requirement_levels: Optional[Dict[str, str]] = None,
) -> List[Dict[str, str]]:
    """Build practical suggestions from the actual analysis results.

    Rules, in priority order:

    1. Named missing requirements (at most two, from different categories),
       ordered so a locally marked required skill comes before a preferred or
       optional one.
    2. Weakly represented requirements, when the posting asks for depth,
       describes a thin mention, or repeats a skill the resume mentions once.
    3. The remaining missing requirements, or an explicit "nothing matched"
       finding when the resume contains none of them.
    4. A resume with no recognisable skills at all.
    5. Strong coverage, as a confirmed finding rather than new advice.
    6. Always last: the honest limitation of both metrics.

    Every suggestion names an actual requirement from this comparison. Nothing
    is generic filler, no keyword is recommended twice, and missing requirements
    are always phrased conditionally ("if you have ...").
    """
    weak = weak_requirements or []
    levels = requirement_levels or {}

    def rank(item: Dict[str, Any]) -> Tuple[int, int, str]:
        level = levels.get(item["keyword"], "unspecified")
        return (
            _LEVEL_RANK.get(level, 1),
            -int(item["job_frequency"]),
            str(item["keyword"]),
        )

    missing_ordered = sorted(missing_keywords, key=rank)
    weak_ordered = sorted(weak, key=rank)

    caveat = {
        "id": "review-against-requirements",
        "title": "Review the resume against the job requirements",
        "description": (
            "Text similarity and keyword coverage cannot judge the quality, seniority, "
            "or truthfulness of your experience, and coverage only counts dictionary "
            "terms that were recognised in the posting."
        ),
        "action": (
            "Read the posting again and check that your resume gives honest evidence for "
            "the most important requirements, not just the right keywords."
        ),
    }

    if job_keyword_count == 0:
        return [{
            "id": "no-job-keywords",
            "title": "No known keywords found in the job description",
            "description": (
                "The posting does not contain any terms from the current skills "
                "dictionary, so keyword coverage cannot be measured for this run."
            ),
            "action": (
                "Paste the complete job description, including the required tools and "
                "skills. This is not a problem with your resume. Do not add experience or "
                "skills you do not possess just to match a posting."
            ),
        }, caveat]

    suggestions: List[Dict[str, str]] = []
    named = set()

    # 1. The two most prominent missing requirements, one per category so the
    # advice stays varied rather than listing five items from one skill family.
    used_categories = set()
    for item in missing_ordered:
        if sum(1 for entry in suggestions if entry["id"].startswith("missing-")) >= 2:
            break
        if item["category"] in used_categories:
            continue
        used_categories.add(item["category"])
        suggestions.append(
            _missing_suggestion(item, levels.get(item["keyword"], "unspecified"))
        )
        named.add(item["keyword"])

    # 2. Present but thin evidence. This is the distinction the UI previously
    # could not express: matched, but described without the requested depth.
    for item in weak_ordered:
        if len(suggestions) >= 3:
            break
        if item["keyword"] in named:
            continue
        suggestions.append(_weak_suggestion(item))
        named.add(item["keyword"])

    # 3. What is left, or the blunt summary when nothing matched at all.
    remaining = [item for item in missing_ordered if item["keyword"] not in named]
    if matched_keywords:
        if remaining and len(suggestions) < 4:
            suggestions.append(_remaining_missing_suggestion(remaining))
    elif resume_keyword_count > 0 and len(suggestions) < 4:
        suggestions.append({
            "id": "no-keyword-matches",
            "title": (
                f"None of the {job_keyword_count} recognised job keywords appear in "
                "your resume"
            ),
            "description": (
                "Every requirement the dictionary recognised in this posting is "
                "currently missing from your resume text, so keyword coverage is 0%."
            ),
            "action": (
                "Use the missing-keyword list above as a checklist and add only the "
                "requirements you can support with real work, projects or coursework."
            ),
        })

    # 4. A resume with no dictionary skills at all is a different problem from a
    # resume that is simply aimed at another field.
    if resume_keyword_count == 0 and len(suggestions) < 4:
        suggestions.append({
            "id": "no-resume-keywords",
            "title": "No known skills were detected in your resume text",
            "description": (
                f"None of the {job_keyword_count} recognised job requirements, and no "
                f"other dictionary term, appears in the {resume_word_count}-word resume text."
            ),
            "action": (
                "Add the tools, projects and coursework you genuinely have, using the same "
                "terminology as the posting. Do not add experience, certifications or "
                "skills you do not possess."
            ),
        })

    # 5. Strong coverage is reported as a finding, not as new homework.
    if keyword_coverage >= 80 and matched_keywords and len(suggestions) < 4:
        suggestions.append({
            "id": "strong-keyword-coverage",
            "title": (
                "All identified job keywords appear in your resume"
                if not remaining
                else "Keyword coverage is strong"
            ),
            "description": (
                f"Your resume includes {len(matched_keywords)} of {job_keyword_count} "
                "identified job keywords."
            ),
            "action": (
                "Keep the content accurate and make sure every keyword is supported by a "
                "concrete example of what you actually did."
            ),
        })

    return (suggestions + [caveat])[:5]


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
    # Normalise each document once, then reuse the tokens for similarity,
    # negation and keyword detection. Nothing is parsed twice.
    resume_clean, resume_negated, _ = _prepare_document(resume_text)
    job_clean, job_negated, job_boundaries = _prepare_document(
        job_description, need_boundaries=True
    )

    match_percentage = _similarity_from_clean(resume_clean, job_clean)

    # One span pass per document feeds both the keyword lists and the
    # weakly-represented check; nothing is matched twice.
    job_spans = _drop_nested_spans(
        _document_keyword_spans(job_clean, job_negated)
    )
    resume_spans = _drop_nested_spans(
        _document_keyword_spans(resume_clean, resume_negated)
    )
    alternative_groups = _alternative_groups(job_clean, job_spans)
    keyword_analysis = _keyword_records(
        job_spans, resume_spans, alternative_groups
    )
    requirement_levels = _group_levels(
        _requirement_levels(job_clean, job_boundaries, job_spans),
        alternative_groups,
    )

    resume_word_count = len(resume_text.split())
    job_description_word_count = len(job_description.split())

    weak_requirements = _weak_requirements(
        keyword_analysis["matched_keywords"],
        job_spans,
        resume_spans,
        job_clean,
        resume_clean,
    )

    suggestions = generate_suggestions(
        matched_keywords=keyword_analysis["matched_keywords"],
        missing_keywords=keyword_analysis["missing_keywords"],
        job_keyword_count=keyword_analysis["job_keyword_count"],
        keyword_coverage=keyword_analysis["keyword_coverage"],
        resume_keyword_count=len(keyword_analysis["resume_keywords"]),
        resume_word_count=resume_word_count,
        weak_requirements=weak_requirements,
        requirement_levels=requirement_levels,
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
            "Keyword coverage is the share of distinct dictionary requirements from the job "
            "description that also appear in the resume. Neither value is a hiring "
            "probability or an official Applicant Tracking System (ATS) score."
        ),
    }
