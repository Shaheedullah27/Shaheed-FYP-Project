# AI ResumeMatch — NLP Resume and Job Description Matcher

**Final Year Project — BS Computer Science**

AI ResumeMatch compares a PDF or DOCX resume with a job description and reports:

- an estimated **resume–job matching percentage** using scikit-learn **TF-IDF** and **cosine similarity**;
- **matched, missing and resume keywords** from a maintained skills dictionary;
- a **basic ATS keyword coverage** percentage of the distinct requirements recognised in the posting;
- **rule-based resume improvement suggestions** derived from the actual analysis;
- the extracted resume text and word counts for transparency.

The project deliberately keeps one workflow: **Upload resume → paste job description → analyze → review results**. All values are calculated from the uploaded documents; there are no hardcoded or randomized scores.

> The match percentage is a text-similarity measure, not the probability of getting hired. Keyword coverage is a basic keyword check, not an official Applicant Tracking System (ATS) score.

---

## 1. Simplified scope

### Included

- Resume upload (PDF/DOCX) with type, size, empty-file and unreadable-file validation on the frontend and backend.
- Backend text extraction with **PyMuPDF** (PDF) and **python-docx** (DOCX).
- TF-IDF vectorisation and cosine similarity using **scikit-learn**.
- Dictionary-based keyword extraction with aliases, normalisation and deduplication.
- Matched, missing and resume keyword lists.
- Basic keyword coverage with zero-division protection.
- Rule-based improvement suggestions.
- A single results page with the exact calculations and limitations explained.

### Removed from the earlier version

- Registration, login, authentication, admin panel and user roles.
- Personalized dashboard metrics and resume analysis history.
- SQLite persistence and downloadable reports.
- Google Gemini integration and generative resume rewriting.
- Advanced ATS simulation, formatting-risk scoring, security inspection and quarantine.
- Composite "overall score", skill-match score, keyword-density score and ATS readability score.
- Recharts-based term-weight charts and history/progress views.

The **Emerald Luxe UI, typography, Three.js hero, motion, cards, gradients, hover states and responsive layout are preserved**.

---

## 2. Architecture

```
React + TypeScript + Vite (port 3000)
                │
                │  POST /api/extract-resume  (multipart file)
                │  POST /api/analyze         (JSON text)
                ▼
Flask API (port 5000)
   ├── parser.py       PyMuPDF / python-docx → normalised text
   ├── nlp_engine.py   TF-IDF + cosine similarity
   │                   keyword coverage + suggestions
   └── skills_dictionary.json
```

There is **no database**. The backend holds no analysis history and stores no uploaded files. Uploaded bytes are processed in memory and discarded after the response.

### Project structure

```
My-FYP-Project/
├── backend/
│   ├── app.py                    Flask routes and validation
│   ├── parser.py                 PDF/DOCX extraction + normalisation
│   ├── nlp_engine.py             TF-IDF, keywords, suggestions
│   ├── skills_dictionary.json    Maintainable keyword vocabulary
│   ├── requirements.txt
│   └── tests/test_resumematch.py
├── src/
│   ├── components/
│   │   ├── analyze/              Upload + job description form
│   │   ├── results/              Match, keywords, coverage, suggestions
│   │   ├── dashboard/            Home page + Three.js hero
│   │   ├── layout/               Sidebar and header (preserved design)
│   │   └── three/                Existing 3D scene
│   ├── services/api.ts           Backend client
│   ├── services/fileValidation.ts
│   └── types/
└── README.md
```

---

## 3. Requirements

- Python **3.10+** (tested with 3.12)
- Node.js **20+** (tested with Node 24) and npm
- No API key is required.

---

## 4. Local setup

Run commands from the project root.

### Backend

**Windows PowerShell**

```powershell
python -m venv backend\venv
.\backend\venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
python backend\app.py
```

If PowerShell blocks activation for the current session:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\backend\venv\Scripts\Activate.ps1
```

**Linux / macOS**

```bash
python3 -m venv backend/venv
source backend/venv/bin/activate
python -m pip install -r backend/requirements.txt
python backend/app.py
```

The API starts at **http://localhost:5000**. Health check: **http://localhost:5000/api/health**.

### Frontend

In a second terminal:

```bash
npm install
npm run dev
```

Open **http://localhost:3000**.

### Backend URL

The frontend defaults to `http://localhost:5000`. To use another host, create a `.env` file:

```env
VITE_API_URL=http://localhost:5000
```

`.env.example` documents the variable. No secrets are used.

---

## 5. API

### `GET /api/health`

```json
{
  "status": "healthy",
  "service": "AI ResumeMatch API",
  "version": "3.0.0",
  "nlp_engine": "scikit-learn TF-IDF + cosine similarity",
  "supported_formats": [".docx", ".pdf"]
}
```

### `POST /api/extract-resume`

Multipart form data with a `file` field containing a `.pdf` or `.docx` file (max 10 MB).

```json
{
  "filename": "resume.docx",
  "word_count": 312,
  "extracted_text": "ALEX CHEN\nSoftware Engineer..."
}
```

Errors:

| Status | Meaning |
| :-- | :-- |
| `400` | Missing file, empty file, unsupported type or invalid document |
| `413` | File larger than 10 MB |
| `422` | Unreadable/scanned document or too little extractable text |

Every API failure uses the same JSON shape, `{"error": "readable message"}`. Unknown routes return `404` and unsupported methods return `405` in that same shape instead of an HTML error page.

### `POST /api/analyze`

```json
{
  "resume_text": "Full extracted resume text...",
  "job_description": "Full job posting text...",
  "resume_title": "Alex Chen Resume",
  "job_title": "Full Stack Engineer"
}
```

Response (abridged):

```json
{
  "id": "analysis-a1b2c3d4e5",
  "timestamp": "2026-11-10 14:32",
  "resume_title": "Alex Chen Resume",
  "job_title": "Full Stack Engineer",
  "match_percentage": 58.7,
  "keyword_coverage": 66.7,
  "job_keyword_count": 6,
  "matched_keyword_count": 4,
  "matched_keywords": [
    {
      "keyword": "Python",
      "category": "Programming Languages",
      "job_frequency": 2,
      "resume_frequency": 1
    }
  ],
  "missing_keywords": [
    {
      "keyword": "Flask",
      "category": "Web Development",
      "job_frequency": 1,
      "resume_frequency": 0
    }
  ],
  "resume_keywords": [],
  "resume_word_count": 312,
  "job_description_word_count": 208,
  "suggestions": [
    {
      "id": "missing-flask",
      "title": "Flask appears in the job description but not in your resume",
      "description": "The posting lists Flask under Web Development. Your resume text does not contain this term or any of its known alternatives.",
      "action": "If you have genuine experience with Flask, say which part of the product you built and which framework features you used. Only include skills you actually have."
    },
    {
      "id": "missing-communication",
      "title": "Communication appears in the job description but not in your resume",
      "description": "The posting lists Communication under Communication & Interpersonal. Your resume text does not contain this term or any of its known alternatives.",
      "action": "If you have genuine experience with Communication, give one concrete example (audience, format, outcome) instead of listing the trait. Only include skills you actually have."
    }
  ],
  "disclaimer": "The match percentage is a TF-IDF cosine similarity..."
}
```

Validation rules:

- `resume_text` and `job_description` must be strings and at least 10 words each.
- Documents are capped at 200,000 characters each.
- Blank input, invalid JSON and oversized text return a readable JSON error.

---

## 6. How the calculations work

### Match percentage

1. Text is lower-cased and punctuation/whitespace is normalised while keeping technical characters such as `+`, `#` and `.`.
2. Tokens are filtered (single characters, pure numbers and English stop words are dropped) and kept in order.
3. `TfidfVectorizer(tokenizer=str.split, token_pattern=None, sublinear_tf=True)` converts the resume and job description into TF-IDF vectors over those tokens.
4. `cosine_similarity` measures the angle between the two vectors.
5. The result is multiplied by 100 and rounded to one decimal place.

If either document has no usable vocabulary (for example, only stop words), the result is `0.0`. An immediately repeated token is counted once, so keyword stuffing does not raise the score.

### Keyword coverage

```
Keyword Coverage = (Distinct Matched Job Keywords / Distinct Identified Job Keywords) × 100
```

- Only terms from `backend/skills_dictionary.json` are counted, so ordinary posting words do not inflate coverage.
- **Distinct requirements only.** Each dictionary entry counts once, however often it appears. A posting that says "Python" five times still adds one requirement, and a resume that repeats Python still satisfies one requirement. `job_frequency` and `resume_frequency` report mention counts for display only; they never change the percentage.
- **Aliases and abbreviations.** Terms such as `JS`, `ML`, `MS Excel`, `GA4`, `CRO`, `HR`, `IFRS` / `generally accepted accounting principles` and `Tally ERP` map to one canonical keyword. A phrase and its shorter alias (`node` inside `node.js`, `express` inside `express.js`) count as a single mention.
- **Formatting.** Case, punctuation, hyphens, slashes and whitespace are normalised before matching, so `CI/CD`, `CI-CD` and `ci cd` are identical, as are `Power BI` and `power-bi`. Extracted PDF and DOCX text therefore produce the same result for the same content.
- **Longest match wins.** When one keyword's wording is nested inside a longer keyword, only the longer requirement is kept: "financial reporting" is counted as Financial Reporting, not as Financial Reporting *and* Reporting.
- **Context guards.** A mention is evidence only when it reads as a skill. Two-character aliases that double as units (`8 hr`, `500 ml`) are rejected after a number, and dictionary entries declare ambiguous contexts (`excel at`, `react to`, `express interest`, `swift delivery`, `kubernetes node`).
- **Clause-scoped negation.** A negator covers the following enumeration until a sentence, bullet, colon, contrast word (`but`, `however`, `still`) or strength word ends it. `no experience with Docker, Kubernetes, or AWS` therefore drops all three, while `..., but strong Python` and `I still use Python` keep Python. Contractions (`haven't`, `didn't`), `without experience in`, positive idioms (`not only`, `no problem`, `no better tool than`) and a posting's `Kubernetes is not required` are handled. Comma-separated `... are not required` lists are unwound backwards and a heading-style `Not required: Kubernetes` crosses the colon; `No experience required: Python` and ambiguous `not necessarily required` stay positive.
- **Alternative requirements.** An adjacent same-category pair joined by exactly `or` and mentioned once each (`React or Angular`, `Python or R programming`, `Photoshop or Illustrator`) is one requirement. If either is in the resume, the group is satisfied and the absent side is not a gap. If neither is present, one synthetic `React or Angular` requirement represents the gap, not two. `and` lists and cross-category pairs are never grouped.
- **Requirement importance.** Local wording inside a sentence marks a requirement `required` (`required`, `must`, `essential`, `minimum`), `preferred` (`preferred`, `desirable`) or `optional` (`bonus`, `nice to have`, `a plus`); otherwise it stays `unspecified`. Importance only orders and phrases suggestions. It never changes coverage, similarity or the API schema.
- **No cross-domain workflows.** The dictionary alone decides what a keyword is. A marketing resume compared with a finance posting simply matches nothing; there are no separate profession-specific pipelines.
- If no job keywords are identified, coverage is `0.0` and the UI explains that division by zero was avoided.
- The UI explicitly states that this is **not** an official ATS score and does not simulate commercial ATS platforms.

### Suggestions

Suggestions are deterministic rules over the same analysis output; there is no LLM or external AI call. They are built in this order and capped at five:

1. **Missing requirements.** Up to two named requirements from the posting that the resume does not contain, each with category-specific evidence guidance, the accepted alternative spellings, and conditional wording ("If you have genuine experience with …, only include skills you actually have").
2. **Weakly represented requirements.** A matched keyword is flagged when the posting asks for depth ("advanced Excel", "proven experience with Docker") and the resume describes it as basic/familiar, or never places a depth word or a stated number of years beside it, or when the posting repeats a keyword the resume mentions once. The card distinguishes a thin mention from a missing skill and asks for honest detail, not for a skill that is already there.
3. **The remaining gaps.** Missing requirements not covered by the first two cards are grouped in one card, so its count and its names always agree.
4. **No recognised skills or no matches.** A resume with no dictionary terms gets a different, specific card from a resume that simply targets another field.
5. **Strong coverage.** Reported as a confirmed finding, not as new homework.
6. **Always last.** A limitation note that neither metric judges quality, seniority or truthfulness.

Suggestions never invent experience, qualifications, certifications, achievements or skills, never recommend a keyword that is already clearly present, and never present the same requirement twice. Required gaps are named before preferred or optional ones, and the description says when the posting marks a requirement as preferred or optional.

### Requirement importance and alternatives

These two refinements change the **interpretation** of the job description, not the scoring formula:

| Rule | What it does | Effect on coverage |
| :-- | :-- | :-- |
| Required / preferred / optional | Finds the nearest local cue within seven tokens before or six after a mention; sentence, bullet and contrast boundaries stop the search | None. It only orders and phrases suggestion cards |
| `A or B` alternative | Groups an adjacent, same-category pair joined by exactly `or`, mentioned once each | The group contributes one requirement instead of two |

Importance is not returned as a new field and is not used as a weight. An unmarked requirement stays `unspecified` rather than being guessed as required. When one side of a group is evidenced, only that side is counted and the absent side is not a gap. When both are evidenced, both remain as matched entries because both are genuinely present. Alternative grouping does not assume that related technologies are equivalent: `React` is not credited for `Angular`, and `SQL` is not credited for `PostgreSQL`; the grouping only reflects that the posting itself offered a choice.

### TF-IDF similarity vs keyword coverage

| | TF-IDF cosine similarity | Keyword coverage |
| :-- | :-- | :-- |
| Question | How similar is the wording of the two documents? | Which recognised requirements from the posting appear in the resume? |
| Input | Every content token in both texts | Dictionary keywords only |
| Output | Continuous 0–100 score influenced by document length and vocabulary | Discrete share of distinct requirements found |
| Repeated words | Damped by sublinear term frequency and IDF | Counted once |
| Typical use | Overall text alignment | Requirement checklist |
| Limitation | Rewording lowers the score even when the experience matches | Dictionary-bound; presence is not proof of depth |

Requirement importance is a third, separate layer used only for suggestion priority; it is not a score and never changes either number. The two scores are computed independently. A resume can have 100% keyword coverage and a moderate match percentage when it lists the right tools in a different style, and a high match percentage with low coverage when it mirrors the posting's wording but omits specific requirements. Neither value is a hiring probability.

---

## 7. Testing

### Backend

```powershell
.\backend\venv\Scripts\python.exe -m unittest discover -s backend\tests -v
```

Linux/macOS:

```bash
backend/venv/bin/python -m unittest discover -s backend/tests -v
```

The suite covers:

- text cleaning and technical characters;
- relevant vs unrelated TF-IDF similarity;
- empty/stop-word-only documents;
- matched and missing keywords;
- duplicate keyword handling and distinct-requirement coverage;
- punctuation, casing, hyphen and slash variants;
- DOCX and PDF extraction, including equal coverage from both formats;
- clause-scoped negation lists, contractions, positive exceptions and negated job requirements;
- either/or requirement groups and their count invariants;
- required/preferred/optional cue ordering and ambiguous wording;
- basic/familiar weak evidence versus stated years and strongly evidenced skills;
- PDF/DOCX line-break hyphenation and Unicode normalisation;
- unit aliases and homograph context guards;
- abbreviations, full forms and extended domain vocabulary;
- realistic resume/job pairs for all seven supported domains;
- weak-requirement, missing-requirement and duplicate suggestions;
- the unchanged `/api/analyze` response contract;
- invalid and empty uploads;
- empty job description validation;
- API health and structured analysis responses.

### Frontend

```bash
npm run lint
npm run build
```

`npm run lint` runs `tsc --noEmit` with `strict`, `noUnusedLocals` and `noUnusedParameters` enabled. `npm test` runs the backend unittest suite using the active Python environment.

---

## 8. Limitations

- TF-IDF is lexical: synonyms and paraphrases that are not represented by the keyword dictionary may reduce the score.
- Scanned/image-only PDFs require OCR, which is not part of this simplified scope; the backend returns a readable error.
- PDF line-break correction is conservative. A split word is joined when the continuation starts uppercase or the joined form is a known dictionary spelling (`Postgre-` / `SQL` → `PostgreSQL`); an unknown lowercase split keeps its hyphen. Bullets and wrapped lines are reconstructed heuristically from extracted text, and the original document is never altered.
- Keyword coverage depends on the maintained dictionary and should not be treated as an employer's ATS result. A requirement written with a tool that is not in the dictionary is invisible to the checker.
- Dictionary entries are independent. Aliases are handled, but related technologies are not interchangeable: PostgreSQL does not satisfy SQL, JavaScript does not satisfy React, Excel does not satisfy Microsoft Office, and Python does not satisfy Machine Learning. No directional implication is inferred.
- Requirement importance is local, not section-aware. A "Requirements" heading may not reach a keyword several lines away, `not necessarily required` is left unspecified, and importance never changes coverage. `A or B` grouping is limited to an adjacent same-category pair with one mention each; cross-category alternatives, comma chains, `and/or` and alternatives spread across a sentence are not grouped.
- Context guards are shallow, not grammatical analysis. Negation handles lists, contractions, `without`, positive idioms and comma-separated `... are not required` in a posting, but not long-distance references or a negated subordinate clause ("not sure I would say I know Python"). Homographs are handled by fixed exclusion lists.
- Coverage measures presence, not depth. A keyword in a skills list counts the same as one supported by a project example; the weak-evidence suggestions only approximate the difference from wording, basic/familiar cues, stated years and repetition.
- The match percentage does not assess seniority, quality, truthfulness or hiring likelihood.

---

## 9. Academic notes

The project demonstrates practical NLP through:

- text preprocessing and normalisation;
- TF-IDF feature extraction with scikit-learn;
- cosine similarity;
- dictionary and alias-based keyword extraction;
- precision-oriented keyword coverage (matched / total identified);
- rule-based suggestions with clause-scoped negation, alternative requirements, local importance cues and conservative weak-evidence detection.

The frontend remains a React 19 + TypeScript + Vite application with the existing Emerald Luxe design system and Three.js hero scene. The backend is a modular Flask API with no paid services, external AI calls, authentication or database.
