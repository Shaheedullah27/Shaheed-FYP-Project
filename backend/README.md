# AI ResumeMatch — Flask Backend

Flask API for the simplified ResumeMatch final-year project. It extracts text from PDF/DOCX resumes and compares that text with a job description using scikit-learn TF-IDF cosine similarity, dictionary keyword matching and rule-based suggestions.

No database, authentication, Gemini/other AI API, report export or security inspection is present. See the [root README](../README.md) for full project setup and the calculation details.

## Modules

| File | Responsibility |
| :-- | :-- |
| `app.py` | Flask routes, input validation, JSON responses, 10 MB limit |
| `parser.py` | PDF/DOCX extraction and conservative text normalisation (line-break hyphenation, wrapped lines, Unicode) |
| `nlp_engine.py` | TF-IDF/cosine similarity, keyword coverage, suggestions |
| `skills_dictionary.json` | Maintainable keyword vocabulary with aliases |
| `tests/test_resumematch.py` | Extraction, NLP, validation and API tests |

## Setup

From the project root:

```bash
python -m venv backend/venv
# Windows: backend\venv\Scripts\activate
# macOS/Linux: source backend/venv/bin/activate
python -m pip install -r backend/requirements.txt
python backend/app.py
```

The API listens on **http://localhost:5000**. Set `PORT` or `FRONTEND_ORIGIN` if needed.

## Endpoints

### `GET /api/health`

Returns service status, version, NLP engine and supported formats.

### `POST /api/extract-resume`

Multipart form data with a `file` field.

- Accepted: `.pdf`, `.docx`
- Maximum: 10 MB
- Returns: `filename`, `word_count`, `extracted_text`
- Rejects invalid, empty, encrypted or unreadable documents with a JSON error.

### `POST /api/analyze`

```json
{
  "resume_text": "...",
  "job_description": "...",
  "resume_title": "Candidate resume",
  "job_title": "Target role"
}
```

Both texts must contain at least 10 words. The response contains:

- `match_percentage` — cosine similarity × 100;
- `keyword_coverage` — distinct matched requirements / distinct identified requirements × 100 (an explicit "A or B" group counts once);
- `matched_keywords`, `missing_keywords`, `resume_keywords`;
- `job_keyword_count`, `matched_keyword_count`;
- word counts;
- `suggestions` — rule-based, non-generative;
- `disclaimer`.

## Design decisions

- **Unigram TF-IDF** with English stop words and sublinear term frequency keeps the vector space small and the score explainable. Bigrams were measured against the same document pairs and lowered similarity for relevant matches without improving separation from unrelated text, so they are not used.
- **Token-preserving normalisation** — one pass performs NFKC normalisation, folds typographic quotes/dashes, lower-cases, canonicalises `.NET` to `dotnet`, and keeps `+`, `#` and internal dots so `C++`, `C#` and `Node.js` reach the vectoriser as single tokens. Separators such as `/` and `-` split words, so `CI/CD` and `UI/UX` are matched through their word forms.
- **Multi-domain vocabulary** — the dictionary covers software, data, cloud/DevOps, marketing, design, business/management, HR and finance, with aliases mapping shorthand such as `JS`, `ML`, `MS Excel`, `SEM`, `CRO` and `HR` onto one canonical keyword.
- **Guarded matches** — `terms` overrides keep ambiguous display names (`Go (Golang)`, `R`) from matching ordinary words, while `exclude_after` / `exclude_before` block boilerplate and homographs such as "accounting for", "reporting to", "sales team", "kubernetes node", "excel at", "react to", "express interest", "swift delivery" and "prevent rust".
- **Whole-keyword lookarounds** prevent `Java` matching `JavaScript` and keep `C++`, `C#` and `.NET` working. Two-character aliases after a number are treated as units, so `8 hr` is not HR and `500 ml` is not ML.
- **Clause-scoped negation** — a negator (`no`, `not`, `never`, `without`, `cannot`, contractions expanded to `not`) covers the following enumeration until a sentence, bullet, colon, contrast word (`but`, `however`, `still`) or strength word ends the clause. That drops every member of `no experience with Docker, Kubernetes, or AWS` but keeps `Python` in `..., but strong Python` and in `I still use Python`. Idiomatic positives (`not only`, `no problem`, `no better tool than`) are exempt. A requirement clause such as `Kubernetes is not required` is removed from the posting, a comma-separated list followed by `are not required` is unwound backwards, and a heading-style `Not required: Kubernetes` crosses the colon. `No experience required: Python` stays positive because it describes the entry-level experience expected, not the absence of Python. Ambiguous wording (`not necessarily required`) is left positive on purpose.
- **Conservative PDF/DOCX normalisation** — line-break hyphenation is joined only when the continuation starts uppercase or the joined word is a known dictionary spelling (`Postgre-` / `SQL` → `PostgreSQL`, `Scikit-` / `Learn` → `Scikit-learn`). A genuine compound keeps its hyphen (`full-` / `stack` → `full-stack`), bullets and sentence boundaries are preserved, lowercase continuation lines are re-joined, and NBSP, zero-width characters, soft hyphens, ligatures and typographic punctuation are folded. The uploaded file is never modified.
- **Requirement importance (suggestion ordering only)** — a local cue within seven tokens before or six after a mention marks it required (`required`, `must`, `essential`, `minimum`), preferred (`preferred`, `desirable`) or optional (`bonus`, `nice to have`, `a plus`). Sentence and bullet boundaries stop the search, and unmarked wording stays `unspecified`. This never changes coverage or the API shape; it only decides which gaps are named first and how they are described.
- **Alternative requirements** — adjacent mentions joined by exactly `or`, in the same dictionary category and each mentioned once, form one requirement (`React or Angular`, `Python or R programming`). If either side is evidenced, only the evidenced side is listed and the other is not a gap; if neither is evidenced, one synthetic `React or Angular` record represents the gap. `and` lists, cross-category pairs (`Python or Excel`) and `or` elsewhere in a sentence are not grouped.
- **Weak-evidence wording** — matched keywords are checked for a depth qualifier in the posting ("advanced Excel", "proven Docker") and for an explicit low-depth signal in the resume ("basic Excel", "familiar with Tableau") or a stated number of years. A posting that repeats a skill the resume mentions once is also flagged. This only changes suggestion wording, never coverage.
- **Distinct-requirement deduplication** — repeated mentions, repeated aliases and overlapping matches (`node` inside `node.js`) count once per keyword, and a keyword nested inside a longer keyword is dropped so one phrase cannot create two requirements.
- **Zero-division guard** returns `0.0` coverage when the posting has no dictionary keywords.
- **No storage** — uploads are processed in memory and analysis results are returned without persistence.
- **Single normalisation pass** — `/api/analyze` normalises each document once and reuses the token stream for TF-IDF, negation, boundaries and keyword matching. Keyword patterns are compiled once per process, the token list is split once per document, and the accepted mention spans feed both counting and the weak-requirement check. Documents with no negator skip the boundary pass unless requirement importance needs it.
- **Consistent errors** — validation, `404`, `405`, `413` and `500` responses all return `{"error": "..."}` JSON.

## Requirement interpretation rules

Coverage remains `distinct matched requirements / distinct identified requirements`.
Two internal interpretations refine that list without adding response fields:

1. **Alternative group** — an explicit `A or B` pair (same category, adjacent, one
   mention each) is one requirement. If the resume has A, the requirement is
   satisfied and B is not reported missing. If it has neither, one `A or B`
   record is missing. Two evidenced alternatives still appear as two matched
   dictionary entries, because both are genuinely present.
2. **Importance** — `required` / `preferred` / `optional` / `unspecified` is
   derived from nearby wording only. It is used to order and phrase
   suggestions. It does **not** weight, add or remove a coverage point, and no
   importance field is returned, so the API contract is unchanged.

`match_percentage` is unaffected by either rule: it remains the TF-IDF cosine
similarity of the two token streams.

## Tests

```bash
backend/venv/bin/python -m unittest discover -s backend/tests -v
```

On Windows:

```powershell
.\backend\venv\Scripts\python.exe -m unittest discover -s backend\tests -v
```

The tests build real PDF and DOCX fixtures in memory, so parser coverage is exercised without committing binary sample files. They include negated lists and clauses, positive exceptions, negated job requirements, `A or B` alternatives, requirement cues, basic/familiar evidence, hyphen-split PDF and DOCX text, aliases versus non-equivalent related technologies, and the unchanged API shape.

## Limitations

- Image-only/scanned PDFs need OCR, which is out of scope; the API returns a readable error.
- TF-IDF cannot understand synonyms outside the dictionary or judge experience quality.
- Keyword coverage is not an official ATS score, and requirements outside the dictionary are invisible to it.
- Equivalence is limited to declared aliases. Related technologies are not interchangeable: PostgreSQL does not satisfy SQL, JavaScript does not satisfy React, Excel does not satisfy Microsoft Office, and Python does not satisfy Machine Learning. No directional implication is inferred.
- Requirement importance comes from local wording, not section parsing. A heading that applies to several paragraphs may not reach a distant keyword. `not necessarily required` is left unspecified rather than treated as optional, and the level never changes coverage.
- Alternative grouping is deliberately narrow: an adjacent same-category pair joined by exactly `or`, with one mention of each. Cross-category alternatives (`Python or Excel`), chains with commas, `and/or`, and alternatives spread across a sentence are not grouped; `and` lists are never alternatives.
- Negation is clause-aware but not grammatical parsing. It handles lists, contractions, `without`, positive idioms, and comma-separated `... are not required` in a posting. It does not resolve a long-distance reference, sarcasm or a negated subordinate clause such as "not sure I would say I know Python"; those are left conservative.
- PDF dehyphenation depends on case or a dictionary spelling. An unknown lowercase term split as `some-` / `thing` keeps its hyphen and may not match. Bullet layout and line grouping are heuristic; the original file is never altered.
- Single-letter skill names are matched only in an explicit form (`R programming`, `RStudio`); a bare `R` in a skills list is ignored to avoid matching the English word.
- Normalisation targets Latin text. A resume written entirely in another script produces no tokens and scores `0.0`.
