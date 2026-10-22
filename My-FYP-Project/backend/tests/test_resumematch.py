import unittest
import os
import sys
import json
import sqlite3

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from nlp_engine import clean_text, calculate_tfidf_similarity, extract_skills_analysis, analyze_full
from ats_checker import evaluate_ats_compatibility
from database import init_db, save_analysis, get_recent_analyses, get_analysis_by_id, delete_analysis_by_id, DB_FILE
from report_generator import generate_text_report

class TestAIResumeMatch(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        init_db()

    def test_text_cleaning(self):
        raw = "Hello World! @#$ Python3 & REACT.JS -- 2026\n\n\tNew line"
        cleaned = clean_text(raw)
        self.assertIn("hello world", cleaned)
        self.assertIn("python3", cleaned)
        self.assertIn("react.js", cleaned)
        self.assertNotIn("@#$", cleaned)

    def test_tfidf_cosine_similarity_relevant(self):
        res = "Full stack engineer proficient in Python React PostgreSQL Docker and REST APIs with experience building full stack applications using Python React PostgreSQL Docker and REST APIs."
        jd = "Looking for a full stack developer skilled in Python React PostgreSQL Docker and REST APIs to build full stack applications using Python React PostgreSQL Docker and REST APIs."
        score, term_weights = calculate_tfidf_similarity(res, jd)
        
        self.assertGreaterEqual(score, 50.0)
        self.assertLessEqual(score, 100.0)
        self.assertTrue(len(term_weights) > 0)
        
        terms = [t['term'] for t in term_weights]
        self.assertTrue(any('python' in t or 'react' in t for t in terms))

    def test_tfidf_cosine_similarity_unrelated(self):
        res = "Chef and culinary specialist with 10 years experience in French pastry, baking, and kitchen inventory."
        jd = "Senior Cloud Architect needed for Kubernetes cluster automation, AWS infrastructure, and Terraform."
        score, _ = calculate_tfidf_similarity(res, jd)
        
        # Unrelated texts should have very low cosine similarity
        self.assertLess(score, 25.0)

    def test_skills_extraction(self):
        res = "Proficient in Python, SQL, React, Git, Agile, and SEO."
        jd = "Requires Python, SQL, React, Docker, and AWS. Agile methodology experience preferred."
        data = extract_skills_analysis(res, jd)
        
        matched_names = [s['name'] for s in data['matched_skills']]
        missing_names = [s['name'] for s in data['missing_skills']]
        
        self.assertIn('Python', matched_names)
        self.assertIn('SQL', matched_names)
        self.assertIn('React', matched_names)
        self.assertIn('Agile', matched_names)
        self.assertIn('Docker', missing_names)
        self.assertIn('AWS', missing_names)
        self.assertGreaterEqual(data['skill_match_score'], 50)

    def test_ats_checker_student_tolerance(self):
        # Student with NO employment history, but strong Projects & Education
        student_resume = """
        SARAH CONNOR
        sarah.connor@university.edu | (555) 345-6789 | Austin, TX | linkedin.com/in/sarahconnor

        PROFESSIONAL SUMMARY
        Final year Computer Science student passionate about machine learning and backend API development.

        TECHNICAL SKILLS
        Languages: Python, Java, SQL, C++
        Frameworks: FastAPI, Flask, React
        Tools: Git, Linux, Docker

        EDUCATION
        Bachelor of Science in Computer Science | University of Texas | Expected May 2026
        Dean's Honor List, Relevant coursework: Data Structures, Database Management, Operating Systems.

        PROJECTS
        AI ResumeMatch FYP | Python, Flask, scikit-learn, SQLite
        - Engineered explainable NLP pipeline comparing candidate resumes with job postings.
        - Designed 7-domain skills gap analyzer with 85% parsing precision.
        """
        report = evaluate_ats_compatibility(student_resume, "Python SQL Docker", ['Docker'])
        
        self.assertGreaterEqual(report['atsScore'], 80)
        self.assertTrue(report['contactDetails']['emailFound'])
        self.assertTrue(report['contactDetails']['phoneFound'])
        self.assertTrue(report['contactDetails']['linkedinFound'])
        
        # Check that Work Experience was given student tolerance
        work_sec = next((s for s in report['sectionsDetected'] if s['sectionName'] == 'Work Experience'), None)
        self.assertIsNotNone(work_sec)
        self.assertEqual(work_sec['status'], 'alternative_present')

    def test_ats_checker_missing_contact_info(self):
        no_contact_resume = """
        CANDIDATE ANONYMOUS
        San Francisco, CA

        SUMMARY
        Software developer with web experience.

        SKILLS
        Python, HTML, CSS

        EDUCATION
        B.S. Computer Science
        """
        report = evaluate_ats_compatibility(no_contact_resume)
        self.assertFalse(report['contactDetails']['emailFound'])
        self.assertFalse(report['contactDetails']['phoneFound'])
        self.assertLess(report['atsScore'], 70)
        self.assertTrue(any(r['priority'] == 'high' for r in report['recommendations']))

    def test_database_crud(self):
        sample_analysis = {
            'id': 'test-analysis-001',
            'timestamp': '2026-10-19 12:00',
            'resume_title': 'Unit Test Resume',
            'candidate_name': 'Test Candidate',
            'job_title': 'Unit Test Engineer',
            'company_name': 'Test Labs',
            'cosine_similarity': 82.5,
            'skill_match_score': 85.0,
            'keyword_density_score': 80.0,
            'ats_readability_score': 88.0,
            'overall_score': 84.0,
            'word_count_resume': 250,
            'word_count_jd': 300,
            'matched_skills': [{'name': 'Python', 'category': 'Programming Languages'}],
            'missing_skills': [{'name': 'Docker', 'category': 'Cloud & DevOps'}],
            'category_gaps': [],
            'top_term_weights': []
        }
        
        # 1. Save
        saved_id = save_analysis(sample_analysis)
        self.assertEqual(saved_id, 'test-analysis-001')
        
        # 2. Retrieve by ID
        retrieved = get_analysis_by_id('test-analysis-001')
        self.assertIsNotNone(retrieved)
        self.assertEqual(retrieved['resume_title'], 'Unit Test Resume')
        self.assertEqual(retrieved['overall_score'], 84.0)
        
        # 3. Retrieve recent
        recent = get_recent_analyses(10)
        self.assertTrue(any(r['id'] == 'test-analysis-001' for r in recent))
        
        # 4. Delete
        deleted = delete_analysis_by_id('test-analysis-001')
        self.assertTrue(deleted)
        
        # Verify deletion
        self.assertIsNone(get_analysis_by_id('test-analysis-001'))

    def test_report_generation(self):
        sample_analysis = {
            'id': 'rep-001',
            'timestamp': '2026-10-19 12:00',
            'resume_title': 'Alex Chen',
            'job_title': 'Full Stack Engineer',
            'overall_score': 85,
            'cosine_similarity': 82.0,
            'skill_match_score': 88.0,
            'ats_readability_score': 90.0,
            'matched_skills': [{'name': 'Python', 'category': 'Programming Languages', 'frequencyInJD': 2}],
            'missing_skills': [{'name': 'Kubernetes', 'category': 'Cloud & DevOps', 'importance': 'Required', 'frequencyInJD': 3}],
            'recommendations': [{'type': 'critical', 'title': 'Add Kubernetes', 'targetSection': 'Skills', 'description': 'Required tool', 'suggestedAction': 'Add to skills'}],
            'ats_compatibility_report': {
                'atsScore': 90,
                'contactDetails': {'emailFound': True, 'emailAddress': 'alex@example.com', 'phoneFound': True, 'phoneNumber': '(555) 123-4567', 'linkedinFound': True},
                'sectionsDetected': [{'sectionName': 'Skills', 'status': 'present'}]
            }
        }
        text_report = generate_text_report(sample_analysis)
        self.assertIn("AI ResumeMatch", text_report)
        self.assertIn("Alex Chen", text_report)
        self.assertIn("Full Stack Engineer", text_report)
        self.assertIn("IMPORTANT NOTICE", text_report)
        self.assertIn("85 / 100", text_report)

if __name__ == '__main__':
    unittest.main()
