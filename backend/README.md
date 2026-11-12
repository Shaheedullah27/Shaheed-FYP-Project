# AI ResumeMatch — Flask Backend

Flask API for the simplified ResumeMatch final-year project. It extracts text from PDF/DOCX resumes and compares that text with a job description using scikit-learn TF-IDF cosine similarity, dictionary keyword matching and rule-based suggestions.

No database, authentication, Gemini/other AI API, report export or security inspection is present. See the [root README](../README.md) for full project setup and the calculation details.

## Modules

| File | Responsibility |
| :-- | :-- |
| `app.py` | Flask routes, input validation, JSON responses, 10 MB limit |
| `parser.py` | PDF extraction (PyMuPDF) and DOCX extraction (python-docx) |
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
- `keyword_coverage` — matched job keywords / total job keywords × 100;
- `matched_keywords`, `missing_keywords`, `resume_keywords`;
- `job_keyword_count`, `matched_keyword_count`;
- word counts;
- `suggestions` — rule-based, non-generative;
- `disclaimer`.

## Design decisions

- **Unigram TF-IDF** with English stop words and sublinear term frequency keeps the vector space small and the score explainable. Bigrams were measured against the same document pairs and lowered similarity for relevant matches without improving separation from unrelated text, so they are not used.
- **Token-preserving normalisation** — one pass performs NFKC normalisation, folds typographic quotes/dashes, lower-cases, canonicalises `.NET` to `dotnet`, and keeps `+`, `#` and internal dots so `C++`, `C#` and `Node.js` reach the vectoriser as single tokens. Separators such as `/` and `-` split words, so `CI/CD` and `UI/UX` are matched through their word forms.
- **Multi-domain vocabulary** — the dictionary covers software, data, cloud/DevOps, marketing, design, business/management, HR and finance, with aliases mapping shorthand such as `JS`, `ML`, `MS Excel`, `SEM`, `CRO` and `HR` onto one canonical keyword.
- **Guarded matches** — `terms` overrides keep ambiguous display names (`Go (Golang)`, `R`) from matching ordinary words, while `exclude_after` / `exclude_before` block boilerplate such as "accounting for", "reporting to", "sales team" and "kubernetes node".
- **Whole-keyword lookarounds** prevent `Java` matching `JavaScript` and keep `C++`, `C#` and `.NET` working.
- **Canonical keyword deduplication** means repeated mentions or multiple aliases count once in coverage.
- **Zero-division guard** returns `0.0` coverage when the posting has no dictionary keywords.
- **No storage** — uploads are processed in memory and analysis results are returned without persistence.
- **Single normalisation pass** — `/api/analyze` cleans each document once and reuses the result for both TF-IDF and keyword matching; keyword patterns are compiled once per process instead of once per request.
- **Consistent errors** — validation, `404`, `405`, `413` and `500` responses all return `{"error": "..."}` JSON.

## Tests

```bash
backend/venv/bin/python -m unittest discover -s backend/tests -v
```

On Windows:

```powershell
.\backend\venv\Scripts\python.exe -m unittest discover -s backend\tests -v
```

The tests build real PDF and DOCX fixtures in memory, so parser coverage is exercised without committing binary sample files.

## Limitations

- Image-only/scanned PDFs need OCR, which is out of scope; the API returns a readable error.
- TF-IDF cannot understand synonyms outside the dictionary or judge experience quality.
- Keyword coverage is not an official ATS score.
- Single-letter skill names are matched only in an explicit form (`R programming`, `RStudio`); a bare `R` in a skills list is ignored to avoid matching the English word.
- Normalisation targets Latin text. A resume written entirely in another script produces no tokens and scores `0.0`.
