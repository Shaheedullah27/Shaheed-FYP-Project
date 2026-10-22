import os
import uuid
import datetime
import json
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from database import init_db, save_analysis, get_recent_analyses, get_analysis_by_id, delete_analysis_by_id
from nlp_engine import analyze_full, load_skills_dictionary, DICT_PATH
from parser import parse_uploaded_file
from ats_checker import evaluate_ats_compatibility
from report_generator import generate_text_report

app = Flask(__name__)
# Enable CORS for frontend
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Enforce 10 MB maximum request/file upload size limit
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024

ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.doc', '.txt', '.md', '.rtf'}

# Initialize SQLite database on startup
with app.app_context():
    init_db()

@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({
        'error': 'File size exceeds maximum allowed limit (10 MB). Please upload a smaller document.'
    }), 413

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint to verify backend status."""
    return jsonify({
        'status': 'healthy',
        'service': 'AI ResumeMatch Flask API',
        'version': '2.0.0',
        'database': 'SQLite connected',
        'nlp_engine': 'scikit-learn TF-IDF + Cosine Similarity',
        'supported_formats': list(ALLOWED_EXTENSIONS)
    }), 200

@app.route('/api/skills/dictionary', methods=['GET'])
def get_skills_dictionary_endpoint():
    """Returns the maintainable skill taxonomy categorized by technical domain."""
    taxonomy = load_skills_dictionary()
    return jsonify({
        'categories': list(taxonomy.keys()),
        'taxonomy': taxonomy
    }), 200

@app.route('/api/skills/dictionary', methods=['POST'])
def add_skill_to_dictionary():
    """Allows adding a custom skill to the maintainable dictionary."""
    data = request.get_json()
    if not data or not data.get('name') or not data.get('category'):
        return jsonify({'error': 'Skill name and category are required'}), 400
        
    name = data['name'].strip()
    category = data['category'].strip()
    aliases = data.get('aliases', [])
    
    taxonomy = load_skills_dictionary()
    if category not in taxonomy:
        taxonomy[category] = []
        
    # Check duplicate
    exists = any(s['name'].lower() == name.lower() for s in taxonomy[category])
    if not exists:
        taxonomy[category].append({'name': name, 'aliases': aliases})
        try:
            with open(DICT_PATH, 'w', encoding='utf-8') as f:
                json.dump(taxonomy, f, indent=2)
        except Exception as e:
            return jsonify({'error': f'Failed to write to dictionary: {str(e)}'}), 500
            
    return jsonify({'success': True, 'taxonomy': taxonomy}), 200

@app.route('/api/parse-resume', methods=['POST'])
def parse_resume():
    """
    Extracts text from uploaded PDF, DOCX, or TXT file with full validation
    for file size, empty content, and unsupported formats.
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded in the request'}), 400
        
    file = request.files['file']
    if not file or file.filename == '':
        return jsonify({'error': 'No file selected for parsing'}), 400
        
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return jsonify({
            'error': f"Unsupported file type '{ext}'. Supported formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        }), 400
        
    try:
        file_bytes = file.read()
        if len(file_bytes) == 0:
            return jsonify({'error': 'Uploaded file is completely empty (0 bytes). Please upload a valid document.'}), 400
            
        extracted_text = parse_uploaded_file(file_bytes, file.filename)
        
        if not extracted_text or len(extracted_text.strip()) < 10:
            return jsonify({
                'error': 'Could not extract readable text from this document. It may be a scanned image-only PDF without OCR text.'
            }), 422
            
        return jsonify({
            'filename': file.filename,
            'word_count': len(extracted_text.split()),
            'extracted_text': extracted_text
        }), 200
    except Exception as e:
        return jsonify({'error': f"Failed to extract text from document: {str(e)}"}), 422

@app.route('/api/analyze', methods=['POST'])
def run_analysis_endpoint():
    """
    Main analysis endpoint. Validates input, calculates scikit-learn TF-IDF,
    cosine similarity, skill gaps, and returns explainable recommendations.
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid request body. Expected JSON.'}), 400
        
    resume_text = data.get('resume_text', '').strip()
    job_description = data.get('job_description', '').strip()
    resume_title = data.get('resume_title', 'Candidate Resume').strip()
    job_title = data.get('job_title', 'Target Position').strip()
    
    if not resume_text:
        return jsonify({'error': 'Resume text is missing or empty. Please upload or paste a resume.'}), 400
    if not job_description:
        return jsonify({'error': 'Job description is missing or empty. Please paste a job requisition.'}), 400
        
    if len(resume_text.split()) < 10:
        return jsonify({'error': 'Resume text is too brief (less than 10 words). Please provide a fuller resume.'}), 400
    if len(job_description.split()) < 10:
        return jsonify({'error': 'Job description is too brief (less than 10 words). Please provide a complete job posting.'}), 400
        
    try:
        analysis_dict = analyze_full(resume_text, job_description, resume_title, job_title)
        analysis_dict['id'] = f"analysis-{uuid.uuid4().hex[:10]}"
        analysis_dict['timestamp'] = datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
        
        # Persist to SQLite
        save_analysis(analysis_dict)
        
        return jsonify(analysis_dict), 200
    except Exception as e:
        return jsonify({'error': f"NLP analysis computation failed: {str(e)}"}), 500

@app.route('/api/ats-check', methods=['POST'])
def run_ats_check_endpoint():
    """
    Dedicated ATS compatibility audit endpoint analyzing contact info,
    section hierarchy, formatting risks, and text extractability.
    """
    data = request.get_json()
    if not data or not data.get('resume_text'):
        return jsonify({'error': 'Resume text is required'}), 400
        
    resume_text = data['resume_text'].strip()
    jd_text = data.get('job_description', '').strip()
    missing_skills = data.get('missing_skills', [])
    
    try:
        report = evaluate_ats_compatibility(resume_text, jd_text, missing_skills)
        return jsonify({'ats_compatibility_report': report}), 200
    except Exception as e:
        return jsonify({'error': f"ATS check failed: {str(e)}"}), 500

@app.route('/api/export-report', methods=['POST'])
def export_report_endpoint():
    """
    Generates a formatted downloadable text/markdown report from an analysis object.
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Analysis data is required'}), 400
        
    try:
        report_text = generate_text_report(data)
        return jsonify({
            'filename': f"AI_ResumeMatch_Report_{data.get('id', 'export')}.txt",
            'report_content': report_text
        }), 200
    except Exception as e:
        return jsonify({'error': f"Report generation failed: {str(e)}"}), 500

@app.route('/api/history', methods=['GET'])
def get_history_endpoint():
    """Fetches list of historical resume analyses from SQLite."""
    try:
        limit = request.args.get('limit', default=50, type=int)
        records = get_recent_analyses(limit)
        return jsonify({'history': records}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/history/<analysis_id>', methods=['GET'])
def get_analysis_detail(analysis_id):
    """Retrieves full analysis record by ID from SQLite."""
    try:
        record = get_analysis_by_id(analysis_id)
        if not record:
            return jsonify({'error': 'Analysis record not found'}), 404
        return jsonify(record), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/history/<analysis_id>', methods=['DELETE'])
def delete_analysis_endpoint(analysis_id):
    """Deletes an analysis record from SQLite."""
    try:
        delete_analysis_by_id(analysis_id)
        return jsonify({'success': True, 'deleted_id': analysis_id}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting AI ResumeMatch Flask Server on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=True)
