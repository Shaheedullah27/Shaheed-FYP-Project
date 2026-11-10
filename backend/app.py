"""AI ResumeMatch Flask API.

Endpoints:
    GET  /api/health           Service status.
    POST /api/extract-resume   Validate and extract text from a PDF/DOCX upload.
    POST /api/analyze          Compare resume text with a job description.
"""

import datetime
import os
import uuid

from flask import Flask, jsonify, request
from flask_cors import CORS

from nlp_engine import analyze_full
from parser import parse_uploaded_file

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
MAX_TEXT_LENGTH = 200_000
MIN_WORDS = 10
ALLOWED_EXTENSIONS = {".pdf", ".docx"}

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_FILE_SIZE

CORS(
    app,
    resources={r"/api/*": {"origins": os.environ.get("FRONTEND_ORIGIN", "*")}},
)


@app.errorhandler(413)
def request_entity_too_large(_error):
    return jsonify({
        "error": "This file is larger than the 10 MB limit. Upload a smaller PDF or DOCX file."
    }), 413


@app.route("/", methods=["GET"])
def api_index():
    return jsonify({
        "service": "AI ResumeMatch API",
        "version": "3.0.0",
        "endpoints": ["/api/health", "/api/extract-resume", "/api/analyze"],
    }), 200


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "AI ResumeMatch API",
        "version": "3.0.0",
        "nlp_engine": "scikit-learn TF-IDF + cosine similarity",
        "supported_formats": sorted(ALLOWED_EXTENSIONS),
    }), 200


@app.route("/api/extract-resume", methods=["POST"])
def extract_resume():
    """Validate an uploaded resume and return its extracted text."""
    uploaded = request.files.get("file")
    if uploaded is None or not uploaded.filename:
        return jsonify({"error": "No resume file was uploaded."}), 400

    filename = os.path.basename(uploaded.filename)
    extension = os.path.splitext(filename)[1].lower()
    if extension not in ALLOWED_EXTENSIONS:
        return jsonify({
            "error": "Unsupported file type. Upload a PDF (.pdf) or Word document (.docx)."
        }), 400

    file_bytes = uploaded.read()
    if not file_bytes:
        return jsonify({"error": "The uploaded file is empty. Choose another document."}), 400
    if len(file_bytes) > MAX_FILE_SIZE:
        return jsonify({"error": "This file is larger than the 10 MB limit."}), 413

    try:
        extracted_text = parse_uploaded_file(file_bytes, filename)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 422

    word_count = len(extracted_text.split())
    if word_count < MIN_WORDS:
        return jsonify({
            "error": (
                "Very little readable text was found in this document. "
                "If it is a scanned PDF, upload one with selectable text or a DOCX file."
            )
        }), 422

    return jsonify({
        "filename": filename,
        "word_count": word_count,
        "extracted_text": extracted_text,
    }), 200


@app.route("/api/analyze", methods=["POST"])
def analyze():
    """Compare resume text with a job description."""
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Send a JSON body with resume_text and job_description."}), 400

    resume_text = data.get("resume_text", "")
    job_description = data.get("job_description", "")
    resume_title = data.get("resume_title", "Uploaded resume")
    job_title = data.get("job_title", "Target role")

    for value, name in [
        (resume_text, "resume_text"),
        (job_description, "job_description"),
        (resume_title, "resume_title"),
        (job_title, "job_title"),
    ]:
        if not isinstance(value, str):
            return jsonify({"error": f"{name} must be a string."}), 400

    resume_text = resume_text.strip()
    job_description = job_description.strip()
    resume_title = resume_title.strip()[:120] or "Uploaded resume"
    job_title = job_title.strip()[:120] or "Target role"

    if not resume_text:
        return jsonify({"error": "Resume text is empty. Upload or paste a resume first."}), 400
    if not job_description:
        return jsonify({"error": "Job description is empty. Paste the job posting first."}), 400

    if len(resume_text) > MAX_TEXT_LENGTH or len(job_description) > MAX_TEXT_LENGTH:
        return jsonify({"error": "One of the documents is too long to analyse. Use a shorter extract."}), 400

    resume_words = len(resume_text.split())
    job_words = len(job_description.split())
    if resume_words < MIN_WORDS:
        return jsonify({
            "error": f"Resume text is too short ({resume_words} words). Add at least {MIN_WORDS} words."
        }), 400
    if job_words < MIN_WORDS:
        return jsonify({
            "error": f"Job description is too short ({job_words} words). Add at least {MIN_WORDS} words."
        }), 400

    try:
        result = analyze_full(resume_text, job_description, resume_title, job_title)
    except Exception:
        app.logger.exception("Analysis failed")
        return jsonify({"error": "The analysis could not be completed. Check the documents and try again."}), 500

    result["id"] = f"analysis-{uuid.uuid4().hex[:10]}"
    result["timestamp"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")

    return jsonify(result), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    print(f"Starting AI ResumeMatch API on http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=debug)
