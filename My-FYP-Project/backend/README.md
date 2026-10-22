# AI ResumeMatch — Python Flask Backend

**AI ResumeMatch** is a resume and job-description analyzer. It helps job seekers compare a resume with a target role, see matching and missing skills, review ATS readability signals, and get suggestions for improving the resume. Its scores are guidance only: they are not a hiring prediction or an actual score from an employer's ATS.

This project has a React/Vite frontend and a Flask API backend. Open the frontend in a browser; the backend provides analysis, document parsing, and saved history.

## 📌 Architecture Overview
- **Frontend**: React, TypeScript, and Vite
- **Framework**: Python Flask + Flask-CORS
- **NLP & Similarity Engine**: scikit-learn (`TfidfVectorizer`, `cosine_similarity`), NumPy
- **Document Parsing**: PyMuPDF (`fitz`) for PDF, `python-docx` for Word documents, and text parsing for TXT/RTF/MD
- **Database**: SQLite3 (`resumematch.db`), initialized and upgraded automatically when the API starts
- **Explainability**: Deterministic mathematical cosine similarity, sublinear term frequencies, n-gram extraction (unigrams + bigrams), and category-level skill gap classification.

---

## 🚀 Setup & Local Execution

### Prerequisites
- Python 3.9–3.12. The pinned scikit-learn and NumPy versions are not compatible with Python 3.14.
- Node.js and npm.

### Install dependencies

Run these commands from the project root (`My-FYP-Project`). The Windows commands create the backend virtual environment in `backend\venv`.

**Windows PowerShell:**
```bash
py -3.12 -m venv .\backend\venv
.\backend\venv\Scripts\Activate.ps1
python -m pip install -r .\backend\requirements.txt
npm install
```

If PowerShell blocks activation, allow it for the current terminal and activate again:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\backend\venv\Scripts\Activate.ps1
```

**Linux/macOS:**
```bash
python3.12 -m venv backend/venv
source backend/venv/bin/activate
python -m pip install -r backend/requirements.txt
npm install
```

### Run the project

Start the backend and frontend in **two separate terminals**, from the project root.

**Terminal 1 — Flask backend (Windows PowerShell):**
```bash
Set-Location .\backend
.\venv\Scripts\Activate.ps1
python app.py
```

**Terminal 2 — React frontend:**
```bash
npm run dev
```

Open **http://localhost:3000** in your browser. The Flask API runs at **http://localhost:5000**; its health endpoint is **http://localhost:5000/api/health**. Keep both terminals open while using the app.

To run the backend without activating the environment:
```powershell
.\backend\venv\Scripts\python.exe .\backend\app.py
```

### Optional: seed sample data

Run from the backend directory with the virtual environment active:
```bash
python seed_data.py
```

### Tests and production build

From the project root:
```powershell
.\backend\venv\Scripts\python.exe -m unittest discover -s backend\tests -v
npm run lint
npm run build
```

---

## 📡 REST API Documentation

### 1. `GET /api/health`
Checks server status and connected NLP/database engines.
- **Response**:
```json
{
  "status": "healthy",
  "service": "AI ResumeMatch Flask API",
  "version": "2.0.0",
  "database": "SQLite connected",
  "nlp_engine": "scikit-learn TF-IDF + Cosine Similarity",
  "supported_formats": [".pdf", ".docx", ".doc", ".txt", ".md", ".rtf"]
}
```

The backend exposes API endpoints rather than a web page, so opening `http://localhost:5000/` directly may return 404. Use the frontend at `http://localhost:3000`.

### 2. `POST /api/analyze`
Executes end-to-end TF-IDF vectorization, cosine similarity computation, skill extraction, ATS readability scoring, and improvement advice.
- **Request Body**:
```json
{
  "resume_text": "Alex Chen Full Stack Engineer React TypeScript Node...",
  "job_description": "We are looking for Full Stack Engineer with React...",
  "resume_title": "Alex Chen Resume",
  "job_title": "Full Stack Engineer"
}
```
- **Response**:
```json
{
  "id": "analysis-a1b2c3d4",
  "timestamp": "2026-10-19 12:00",
  "overall_score": 84,
  "cosine_similarity": 82.5,
  "skill_match_score": 88.0,
  "matched_skills": [...],
  "missing_skills": [...],
  "category_gaps": [...],
  "top_term_weights": [...]
}
```

### 3. `POST /api/parse-resume`
Extracts raw text from uploaded `.pdf`, `.docx`, or `.txt` files using PyMuPDF and python-docx.
- **Form Data**: `file` (multipart file upload)

### 4. `POST /api/ats-check`
Performs standalone or job-aligned Applicant Tracking System (ATS) compatibility check.
- **Request Body**:
```json
{
  "resume_text": "Full text of resume...",
  "job_description": "Optional target job requisition text...",
  "missing_skills": ["AWS", "Docker"]
}
```
- **Response**:
```json
{
  "ats_compatibility_report": {
    "atsScore": 88,
    "contactDetails": { "emailFound": true, "phoneFound": true, "linkedinFound": true },
    "sectionsDetected": [...],
    "checks": [...],
    "recommendations": [...]
  }
}
```

### 5. `GET /api/history`
Returns historical comparison records stored in SQLite.

### 6. `GET /api/history/<id>`
Retrieves a specific stored analysis record.

### 7. `DELETE /api/history/<id>`
Deletes an analysis record.

---

## 🔍 ATS Check Verification Taxonomy & Limitations

| Check Category | Implementation Method | Verification Level | Technical Note |
| :--- | :--- | :--- | :--- |
| **Email & Phone Presence** | Regex pattern matching | **Verified** | Deterministic check for email and international/E.164 phone formats. |
| **LinkedIn / Portfolio URL** | Domain and handle regex | **Verified** | Identifies custom LinkedIn URLs and developer portfolio handles. |
| **Standard Headings** | Alias dictionary & line length | **Verified** | Recognizes Skills, Experience, Education, Projects, and Certifications. |
| **Student Work History Tolerance** | Academic/Project presence logic | **Verified** | Does NOT penalize students for lacking work experience if Projects/Education exist. |
| **Text Stream Fragmentation** | Single-word line ratio heuristic | **Approximate** | Flags potential multi-column reading order corruption. |
| **Decorative Bullet Glyphs** | UTF-8 non-standard symbol scan | **Verified** | Detects geometric wingdings (❖, ★, ▲) that confuse legacy ATS parsers. |
| **Visual 2D Text Boxes & Canvas Columns** | Stream parser limitation | **Unverified** | Plain text extraction discards X/Y coordinates; cannot verify visual column bounding boxes without 2D OCR. |
| **Images Containing Text** | Stream parser limitation | **Unverified** | Flattened raster images cannot be parsed without optical character recognition (OCR). |
