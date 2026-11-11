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

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB of file content
# Multipart boundaries and headers add a little overhead on top of the file, so
# Flask's request-level limit gets a small allowance. The exact 10 MB file check
# still happens below, where the friendly per-file message is returned.
MAX_REQUEST_BYTES = MAX_FILE_SIZE + 1024 * 1024
MAX_TEXT_LENGTH = 200_000
MIN_WORDS = 10
ALLOWED_EXTENSIONS = {".pdf", ".docx"}

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_REQUEST_BYTES


def _allowed_origins() -> list[str]:
    """Parse FRONTEND_ORIGIN, supporting a comma-separated allow-list."""
    raw = os.environ.get("FRONTEND_ORIGIN", "*")
    return [origin.strip() for origin in raw.split(",") if origin.strip()] or ["*"]


CORS(app, resources={r"/api/*": {"origins": _allowed_origins()}})


def api_error(message: str, status: int):
    """Single response shape for every API failure, so clients parse one format."""
    return jsonify({"error": message}), status


def display_filename(raw_name: str) -> str:
    """Strip any path components a browser may send (Windows or POSIX)."""
    return os.path.basename(raw_name.replace("\\", "/")).strip()


@app.errorhandler(413)
def request_entity_too_large(_error):
    return api_error(
        "This file is larger than the 10 MB limit. Upload a smaller PDF or DOCX file.",
        413,
    )


@app.errorhandler(404)
def not_found(_error):
    return api_error("This endpoint does not exist. See GET / for the available endpoints.", 404)


@app.errorhandler(405)
def method_not_allowed(_error):
    return api_error("This HTTP method is not allowed for this endpoint.", 405)


@app.errorhandler(500)
def internal_error(_error):
    return api_error("The server could not complete this request. Please try again.", 500)


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
        return api_error("No resume file was uploaded.", 400)

    filename = display_filename(uploaded.filename)
    extension = os.path.splitext(filename)[1].lower()
    if extension not in ALLOWED_EXTENSIONS:
        return api_error(
            "Unsupported file type. Upload a PDF (.pdf) or Word document (.docx).",
            400,
        )

    file_bytes = uploaded.read()
    if not file_bytes:
        return api_error("The uploaded file is empty. Choose another document.", 400)
    if len(file_bytes) > MAX_FILE_SIZE:
        return api_error("This file is larger than the 10 MB limit.", 413)

    try:
        extracted_text = parse_uploaded_file(file_bytes, filename)
    except ValueError as exc:
        return api_error(str(exc), 400)
    except RuntimeError as exc:
        return api_error(str(exc), 422)

    word_count = len(extracted_text.split())
    if word_count < MIN_WORDS:
        return api_error(
            "Very little readable text was found in this document. "
            "If it is a scanned PDF, upload one with selectable text or a DOCX file.",
            422,
        )

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
        return api_error("Send a JSON body with resume_text and job_description.", 400)

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
            return api_error(f"{name} must be a string.", 400)

    resume_text = resume_text.strip()
    job_description = job_description.strip()
    resume_title = resume_title.strip()[:120] or "Uploaded resume"
    job_title = job_title.strip()[:120] or "Target role"

    if not resume_text:
        return api_error("Resume text is empty. Upload or paste a resume first.", 400)
    if not job_description:
        return api_error("Job description is empty. Paste the job posting first.", 400)

    if len(resume_text) > MAX_TEXT_LENGTH or len(job_description) > MAX_TEXT_LENGTH:
        return api_error(
            "One of the documents is too long to analyse. Use a shorter extract.",
            400,
        )

    resume_words = len(resume_text.split())
    job_words = len(job_description.split())
    if resume_words < MIN_WORDS:
        return api_error(
            f"Resume text is too short ({resume_words} words). Add at least {MIN_WORDS} words.",
            400,
        )
    if job_words < MIN_WORDS:
        return api_error(
            f"Job description is too short ({job_words} words). Add at least {MIN_WORDS} words.",
            400,
        )

    try:
        result = analyze_full(resume_text, job_description, resume_title, job_title)
    except Exception:
        app.logger.exception("Analysis failed")
        return api_error(
            "The analysis could not be completed. Check the documents and try again.",
            500,
        )

    result["id"] = f"analysis-{uuid.uuid4().hex[:10]}"
    result["timestamp"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")

    return jsonify(result), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    print(f"Starting AI ResumeMatch API on http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=debug)
