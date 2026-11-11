# AI ResumeMatch — NLP Resume and Job Description Matcher

**Final Year Project — BS Computer Science**

AI ResumeMatch compares a PDF or DOCX resume with a job description and reports:

- an estimated **resume–job matching percentage** using scikit-learn **TF-IDF** and **cosine similarity**;
- **matched, missing and resume keywords** from a maintained skills dictionary;
- a **basic ATS keyword coverage** percentage;
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
   ├── parser.py       PyMuPDF / python-docx → clean text
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
│   ├── parser.py                 PDF/DOCX extraction
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
      "id": "review-missing-keywords",
      "title": "Review 2 job keywords not found in your resume",
      "description": "The job description mentions Flask, Communication, but these terms were not detected in your resume.",
      "action": "If you have genuine experience with Flask, Communication, add it to your skills, projects, or work history using the same wording. Only include skills you actually have."
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
2. `TfidfVectorizer(stop_words="english", sublinear_tf=True)` converts the resume and job description into TF-IDF vectors.
3. `cosine_similarity` measures the angle between the two vectors.
4. The result is multiplied by 100 and rounded to one decimal place.

If either document has no usable vocabulary (for example, only stop words), the result is `0.0`.

### Keyword coverage

```
Keyword Coverage = (Matched Job Keywords / Total Identified Job Keywords) × 100
```

- Only terms from `backend/skills_dictionary.json` are counted, so ordinary posting words do not inflate coverage.
- Aliases are normalised; canonical keywords are deduplicated.
- If no job keywords are identified, coverage is `0.0` and the UI explains that division by zero was avoided.
- The UI explicitly states that this is **not** an official ATS score and does not simulate commercial ATS platforms.

### Suggestions

Suggestions are generated from the analysis output only:

- missing keywords → conditional wording, e.g. "If you have genuine experience with …";
- existing matched keywords → make them easy to find and support them with real examples;
- short or thin resume text → add relevant detail the user genuinely has;
- low coverage → align wording with the posting where accurate;
- high coverage → keep the content accurate;
- always → review the resume against the job requirements.

The project never invents work experience, qualifications, certifications, achievements or skills.

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
- duplicate keyword handling;
- zero job-keyword handling;
- rule-based suggestions;
- DOCX and PDF extraction;
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
- Keyword coverage depends on the maintained dictionary and should not be treated as an employer's ATS result.
- The match percentage does not assess seniority, quality, truthfulness or hiring likelihood.

---

## 9. Academic notes

The project demonstrates practical NLP through:

- text preprocessing and normalisation;
- TF-IDF feature extraction with scikit-learn;
- cosine similarity;
- dictionary and alias-based keyword extraction;
- precision-oriented keyword coverage (matched / total identified);
- rule-based natural-language suggestions.

The frontend remains a React 19 + TypeScript + Vite application with the existing Emerald Luxe design system and Three.js hero scene. The backend is a modular Flask API with no paid services, external AI calls, authentication or database.
