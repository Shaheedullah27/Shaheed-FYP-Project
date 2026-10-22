import os
import uuid
import datetime
import json
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from database import (
    init_db, save_analysis, get_recent_analyses, get_analysis_by_id, delete_analysis_by_id,
    get_db_connection, get_security_summary, get_security_findings_list,
    get_security_finding_by_id, get_security_inspections, get_security_inspection_by_id,
    get_security_audit_logs, get_all_security_policies
)
from security_engine import (
    inspect_uploaded_resume, render_page_with_highlight,
    perform_admin_review_action, record_audit_log
)
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
        
        # Security inspection layer
        cache_dir = os.path.join(os.path.dirname(__file__), 'document_cache')
        os.makedirs(cache_dir, exist_ok=True)
        
        conn = get_db_connection()
        candidate_hint = request.form.get('candidate_name', '')
        job_hint = request.form.get('job_title', '')
        
        inspection = inspect_uploaded_resume(
            conn=conn,
            file_bytes=file_bytes,
            filename=file.filename,
            candidate_name=candidate_hint,
            job_title=job_hint
        )
        conn.close()
        
        # Cache file bytes under inspection_id for evidence rendering
        cached_file_path = os.path.join(cache_dir, f"{inspection['id']}{ext}")
        try:
            with open(cached_file_path, 'wb') as cf:
                cf.write(file_bytes)
        except Exception:
            pass
            
        if not extracted_text or len(extracted_text.strip()) < 10:
            return jsonify({
                'filename': file.filename,
                'word_count': 0,
                'extracted_text': '',
                'security_inspection': inspection,
                'warning': 'Could not extract readable text from this document. It may be a scanned image-only PDF without OCR text.'
            }), 200
            
        return jsonify({
            'filename': file.filename,
            'word_count': len(extracted_text.split()),
            'extracted_text': extracted_text,
            'security_inspection': inspection
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

# ==============================================================================
# RESUME SECURITY, MANIPULATION DETECTION & QUARANTINE ENDPOINTS
# ==============================================================================

@app.route('/api/security/summary', methods=['GET'])
def get_security_summary_endpoint():
    """Returns overview statistics, counts, and recent security alerts."""
    try:
        summary = get_security_summary()
        return jsonify(summary), 200
    except Exception as e:
        return jsonify({'error': f"Failed to retrieve security summary: {str(e)}"}), 500

@app.route('/api/security/findings', methods=['GET'])
def list_security_findings_endpoint():
    """Lists security findings with optional filters for search, severity, category, and review status."""
    try:
        query = request.args.get('query')
        severity = request.args.get('severity')
        category = request.args.get('category')
        reviewer_status = request.args.get('reviewer_status')
        limit = request.args.get('limit', default=50, type=int)
        offset = request.args.get('offset', default=0, type=int)

        data = get_security_findings_list(
            query=query,
            severity=severity,
            category=category,
            reviewer_status=reviewer_status,
            limit=limit,
            offset=offset
        )
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': f"Failed to query security findings: {str(e)}"}), 500

@app.route('/api/security/findings/<finding_id>', methods=['GET'])
def get_security_finding_endpoint(finding_id):
    """Retrieves full evidence details for a specific security finding."""
    try:
        finding = get_security_finding_by_id(finding_id)
        if not finding:
            return jsonify({'error': 'Security finding not found'}), 404
        return jsonify(finding), 200
    except Exception as e:
        return jsonify({'error': f"Failed to retrieve finding: {str(e)}"}), 500

@app.route('/api/security/inspections', methods=['GET'])
def list_inspections_endpoint():
    """Lists document inspection records."""
    try:
        limit = request.args.get('limit', default=50, type=int)
        offset = request.args.get('offset', default=0, type=int)
        quarantine_status = request.args.get('quarantine_status')
        inspections = get_security_inspections(limit=limit, offset=offset, quarantine_status=quarantine_status)
        return jsonify({'inspections': inspections}), 200
    except Exception as e:
        return jsonify({'error': f"Failed to list inspections: {str(e)}"}), 500

@app.route('/api/security/inspections/<inspection_id>', methods=['GET'])
def get_inspection_endpoint(inspection_id):
    """Retrieves a single inspection record and all its findings."""
    try:
        inspection = get_security_inspection_by_id(inspection_id)
        if not inspection:
            return jsonify({'error': 'Inspection record not found'}), 404
        return jsonify(inspection), 200
    except Exception as e:
        return jsonify({'error': f"Failed to fetch inspection: {str(e)}"}), 500

@app.route('/api/security/inspect', methods=['POST'])
def direct_inspect_endpoint():
    """Directly inspects an uploaded resume file and returns complete security findings."""
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded for security inspection'}), 400
        
    file = request.files['file']
    if not file or file.filename == '':
        return jsonify({'error': 'No file selected for inspection'}), 400

    mock_ocr = request.form.get('mock_ocr_text')
    candidate_name = request.form.get('candidate_name', '')
    job_title = request.form.get('job_title', '')

    try:
        file_bytes = file.read()
        conn = get_db_connection()
        inspection = inspect_uploaded_resume(
            conn=conn,
            file_bytes=file_bytes,
            filename=file.filename,
            candidate_name=candidate_name,
            job_title=job_title,
            mock_ocr_text=mock_ocr,
            actor="admin_direct_inspect"
        )
        conn.close()

        # Cache file
        cache_dir = os.path.join(os.path.dirname(__file__), 'document_cache')
        os.makedirs(cache_dir, exist_ok=True)
        ext = os.path.splitext(file.filename)[1].lower()
        cached_path = os.path.join(cache_dir, f"{inspection['id']}{ext}")
        with open(cached_path, 'wb') as cf:
            cf.write(file_bytes)

        return jsonify(inspection), 200
    except Exception as e:
        return jsonify({'error': f"Security inspection failed: {str(e)}"}), 500

@app.route('/api/security/evidence/<inspection_id>/page/<int:page_num>', methods=['GET'])
def get_rendered_evidence_page(inspection_id, page_num):
    """
    Safely renders the document page with suspicious bounding box overlays highlighted in PNG format.
    """
    cache_dir = os.path.join(os.path.dirname(__file__), 'document_cache')
    pdf_path = os.path.join(cache_dir, f"{inspection_id}.pdf")
    
    if not os.path.exists(pdf_path):
        return jsonify({'error': 'Rendered evidence preview only available for uploaded PDF documents'}), 404

    try:
        with open(pdf_path, 'rb') as f:
            pdf_bytes = f.read()

        # Retrieve bounding boxes for this page
        insp = get_security_inspection_by_id(inspection_id)
        bboxes = []
        if insp and 'findings' in insp:
            for find in insp['findings']:
                if find.get('page_number') == page_num:
                    bbox = find.get('bbox')
                    if bbox and isinstance(bbox, list) and len(bbox) == 4:
                        bboxes.append(bbox)

        png_bytes = render_page_with_highlight(pdf_bytes, page_number=page_num, bboxes_to_highlight=bboxes)
        if not png_bytes:
            return jsonify({'error': f"Could not render page {page_num}"}), 404

        response = make_response(png_bytes)
        response.headers['Content-Type'] = 'image/png'
        response.headers['Cache-Control'] = 'public, max-age=3600'
        return response
    except Exception as e:
        return jsonify({'error': f"Failed to generate evidence image: {str(e)}"}), 500

@app.route('/api/security/review', methods=['POST'])
def review_action_endpoint():
    """
    Executes an administrative review action:
    'under_review', 'confirm', 'false_positive', 'clear', 'release', 'reject', 'add_note'
    Requires substantive reason and actor verification.
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid request body. Expected JSON.'}), 400

    action = data.get('action')
    target_id = data.get('target_id')
    actor = data.get('actor', 'admin_reviewer')
    reason = data.get('reason', '')
    reviewer_notes = data.get('reviewer_notes')

    if not action or not target_id:
        return jsonify({'error': 'Fields action and target_id are required'}), 400

    conn = get_db_connection()
    try:
        result = perform_admin_review_action(
            conn=conn,
            action=action,
            target_id=target_id,
            actor=actor,
            reason=reason,
            reviewer_notes=reviewer_notes
        )
        conn.close()
        return jsonify(result), 200
    except ValueError as ve:
        conn.close()
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        conn.close()
        return jsonify({'error': f"Review action failed: {str(e)}"}), 500

@app.route('/api/security/audit-log', methods=['GET'])
def get_security_audit_log_endpoint():
    """Returns immutable security audit history."""
    try:
        limit = request.args.get('limit', default=100, type=int)
        logs = get_security_audit_logs(limit=limit)
        return jsonify({'audit_logs': logs}), 200
    except Exception as e:
        return jsonify({'error': f"Failed to retrieve audit log: {str(e)}"}), 500

@app.route('/api/security/policies', methods=['GET'])
def get_policies_endpoint():
    """Returns current active security policies and thresholds."""
    try:
        policies = get_all_security_policies()
        return jsonify({'policies': policies}), 200
    except Exception as e:
        return jsonify({'error': f"Failed to fetch security policies: {str(e)}"}), 500

@app.route('/api/security/policies', methods=['POST'])
def update_policy_endpoint():
    """Updates a configurable security policy."""
    data = request.get_json()
    if not data or not data.get('policy_key'):
        return jsonify({'error': 'policy_key and policy_value are required'}), 400
        
    policy_key = data['policy_key']
    policy_value = data.get('policy_value')
    actor = data.get('actor', 'admin')
    
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT OR REPLACE INTO security_policies (policy_key, policy_value_json, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
        ''', (policy_key, json.dumps(policy_value)))
        
        record_audit_log(
            conn,
            actor=actor,
            action="POLICY_UPDATED",
            target_type="POLICY",
            target_id=policy_key,
            reason=f"Updated policy {policy_key}",
            details={"key": policy_key, "value": policy_value}
        )
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'policy_key': policy_key, 'policy_value': policy_value}), 200
    except Exception as e:
        conn.close()
        return jsonify({'error': f"Failed to update policy: {str(e)}"}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting AI ResumeMatch Flask Server on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=True)

