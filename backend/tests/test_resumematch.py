import io
import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import app, display_filename
from nlp_engine import (
    analyze_full,
    analyze_keywords,
    calculate_tfidf_similarity,
    clean_text,
    generate_suggestions,
)
from parser import clean_extracted_text, extract_text_from_docx, extract_text_from_pdf


RELEVANT_RESUME = (
    "Full stack software engineer with hands-on experience building web applications "
    "using Python, Flask, React, TypeScript, PostgreSQL, Docker, Git, REST APIs and SQL. "
    "Built and deployed REST APIs with Flask and PostgreSQL, wrote unit tests, and worked "
    "with React and TypeScript on the frontend."
)

RELEVANT_JOB = (
    "We are hiring a full stack software engineer to build web applications with Python, "
    "Flask, React, TypeScript, PostgreSQL, Docker, Git, REST APIs and SQL. You will build "
    "REST APIs, work with React and TypeScript, and maintain PostgreSQL databases."
)

UNRELATED_RESUME = (
    "Chef and culinary specialist with ten years of experience in French pastry, baking, "
    "menu planning, kitchen inventory and restaurant service."
)

UNRELATED_JOB = (
    "Senior cloud architect needed for Kubernetes cluster automation, AWS infrastructure, "
    "Terraform provisioning and Linux operations."
)


def build_docx() -> bytes:
    from docx import Document

    document = Document()
    document.add_paragraph("John Doe")
    document.add_paragraph("Python developer with Flask, SQL and React experience.")
    document.add_paragraph("Built a resume matching project using scikit-learn.")
    buffer = io.BytesIO()
    document.save(buffer)
    return buffer.getvalue()


def build_pdf() -> bytes:
    return build_pdf_lines([
        "John Doe",
        "Python developer with Flask, SQL and React experience.",
        "Built a resume matching project using scikit-learn.",
    ])


def build_pdf_lines(lines) -> bytes:
    try:
        import pymupdf as fitz
    except ImportError:
        import fitz

    document = fitz.open()
    page = document.new_page()
    for index, line in enumerate(lines):
        page.insert_text((72, 72 + 20 * index), line)
    pdf_bytes = document.tobytes()
    document.close()
    return pdf_bytes


def build_docx_lines(lines) -> bytes:
    from docx import Document

    document = Document()
    for line in lines:
        document.add_paragraph(line)
    buffer = io.BytesIO()
    document.save(buffer)
    return buffer.getvalue()


class TextProcessingTests(unittest.TestCase):
    def test_clean_text_preserves_technical_characters(self):
        cleaned = clean_text("Hello World! @#$ Python3 & REACT.JS -- C++ C#\n\n\tNew line")
        self.assertIn("hello world", cleaned)
        self.assertIn("python3", cleaned)
        self.assertIn("react.js", cleaned)
        self.assertIn("c++", cleaned)
        self.assertIn("c#", cleaned)
        self.assertNotIn("@#$", cleaned)

    def test_similarity_is_consistent(self):
        first = calculate_tfidf_similarity(RELEVANT_RESUME, RELEVANT_JOB)
        second = calculate_tfidf_similarity(RELEVANT_RESUME, RELEVANT_JOB)
        self.assertEqual(first, second)
        self.assertGreaterEqual(first, 50.0)
        self.assertLessEqual(first, 100.0)

    def test_unrelated_documents_have_low_similarity(self):
        score = calculate_tfidf_similarity(UNRELATED_RESUME, UNRELATED_JOB)
        self.assertGreaterEqual(score, 0.0)
        self.assertLess(score, 25.0)

    def test_empty_documents_return_zero(self):
        self.assertEqual(calculate_tfidf_similarity("", RELEVANT_JOB), 0.0)
        self.assertEqual(calculate_tfidf_similarity(RELEVANT_RESUME, "   "), 0.0)

    def test_stopwords_only_documents_return_zero(self):
        self.assertEqual(
            calculate_tfidf_similarity("the and with for this that", "the and with for this that"),
            0.0,
        )


class KeywordCoverageTests(unittest.TestCase):
    def test_matched_and_missing_keywords(self):
        job = "We require Python, Flask, React, SQL, Git, and Communication."
        resume = "Python, React, SQL, Git."

        result = analyze_keywords(resume, job)

        matched = {item["keyword"] for item in result["matched_keywords"]}
        missing = {item["keyword"] for item in result["missing_keywords"]}

        self.assertEqual(result["job_keyword_count"], 6)
        self.assertEqual(matched, {"Python", "React", "SQL", "Git"})
        self.assertEqual(missing, {"Flask", "Communication"})
        self.assertEqual(result["keyword_coverage"], 66.7)

    def test_no_job_keywords_does_not_divide_by_zero(self):
        result = analyze_keywords(
            "A friendly candidate who values curiosity and kindness.",
            "We are a friendly group that values curiosity and kindness.",
        )

        self.assertEqual(result["job_keyword_count"], 0)
        self.assertEqual(result["keyword_coverage"], 0.0)
        self.assertEqual(result["matched_keywords"], [])
        self.assertEqual(result["missing_keywords"], [])

    def test_duplicate_keywords_are_counted_once(self):
        result = analyze_keywords(
            "Python and React experience.",
            "Python Python PYTHON. Flask flask. React.",
        )

        py = next(item for item in result["matched_keywords"] if item["keyword"] == "Python")
        missing = {item["keyword"] for item in result["missing_keywords"]}

        self.assertEqual(py["job_frequency"], 3)
        self.assertEqual(py["resume_frequency"], 1)
        self.assertEqual(result["job_keyword_count"], 3)
        self.assertIn("Flask", missing)
        self.assertEqual(result["keyword_coverage"], 66.7)

    def test_short_aliases_do_not_match_inside_other_skill_names(self):
        result = analyze_keywords(
            "Built services with Node.js and Express.js.",
            "Strong JavaScript and TypeScript experience required.",
        )

        matched = {item["keyword"] for item in result["matched_keywords"]}
        missing = {item["keyword"]: item for item in result["missing_keywords"]}
        self.assertNotIn("JavaScript", matched)
        self.assertNotIn("TypeScript", matched)
        self.assertEqual(missing["JavaScript"]["job_frequency"], 1)
        self.assertEqual(missing["TypeScript"]["job_frequency"], 1)

    def test_keyword_and_alias_overlap_count_once(self):
        result = analyze_keywords(
            "Built APIs with Express.js.",
            "Experience with Express.js is required.",
        )

        express = next(item for item in result["matched_keywords"] if item["keyword"] == "Express.js")
        self.assertEqual(express["job_frequency"], 1)
        self.assertEqual(express["resume_frequency"], 1)

    def test_resume_keywords_only_include_dictionary_terms(self):
        result = analyze_keywords(
            "I enjoy hiking, cooking and reading. I also know Python and SQL.",
            "Python developer wanted.",
        )

        resume_keywords = {item["keyword"] for item in result["resume_keywords"]}
        self.assertEqual(resume_keywords, {"Python", "SQL"})


class SuggestionTests(unittest.TestCase):
    def test_suggestions_are_derived_from_missing_keywords(self):
        keywords = analyze_keywords("Python and SQL.", "Python, SQL, Flask and Communication.")
        suggestions = generate_suggestions(
            matched_keywords=keywords["matched_keywords"],
            missing_keywords=keywords["missing_keywords"],
            job_keyword_count=keywords["job_keyword_count"],
            keyword_coverage=keywords["keyword_coverage"],
            resume_keyword_count=len(keywords["resume_keywords"]),
            resume_word_count=180,
        )

        text = " ".join(item["title"] + " " + item["description"] + " " + item["action"] for item in suggestions)
        self.assertTrue(any("Flask" in item["action"] for item in suggestions))
        self.assertIn("communication", text.casefold())
        self.assertTrue(any("only include" in item["action"].casefold() for item in suggestions))
        self.assertTrue(any("review" in item["title"].casefold() for item in suggestions))

    def test_suggestions_when_no_job_keywords(self):
        keywords = analyze_keywords("Python developer.", "A friendly team.")
        suggestions = generate_suggestions(
            matched_keywords=keywords["matched_keywords"],
            missing_keywords=keywords["missing_keywords"],
            job_keyword_count=keywords["job_keyword_count"],
            keyword_coverage=keywords["keyword_coverage"],
            resume_keyword_count=len(keywords["resume_keywords"]),
            resume_word_count=40,
        )

        titles = " ".join(item["title"] for item in suggestions).casefold()
        self.assertIn("no known keywords", titles)
        self.assertTrue(any("do not add experience" in item["action"].casefold() for item in suggestions))


class ParserTests(unittest.TestCase):
    def test_docx_extraction(self):
        text = extract_text_from_docx(build_docx())
        self.assertIn("John Doe", text)
        self.assertIn("Python", text)
        self.assertIn("scikit-learn", text)

    def test_pdf_extraction(self):
        text = extract_text_from_pdf(build_pdf())
        self.assertIn("John Doe", text)
        self.assertIn("Python", text)
        self.assertIn("Flask", text)

    def test_invalid_pdf_is_rejected(self):
        with self.assertRaises(RuntimeError):
            extract_text_from_pdf(b"this is not a pdf")

    def test_invalid_docx_is_rejected(self):
        with self.assertRaises(RuntimeError):
            extract_text_from_docx(b"this is not a docx package")


class ApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app.config.update(TESTING=True)
        cls.client = app.test_client()

    def test_health(self):
        response = self.client.get("/api/health")
        payload = response.get_json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(payload["status"], "healthy")
        self.assertEqual(payload["supported_formats"], [".docx", ".pdf"])

    def test_extract_docx(self):
        response = self.client.post(
            "/api/extract-resume",
            data={"file": (io.BytesIO(build_docx()), "resume.docx")},
            content_type="multipart/form-data",
        )
        payload = response.get_json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(payload["filename"], "resume.docx")
        self.assertGreaterEqual(payload["word_count"], 10)
        self.assertIn("Python", payload["extracted_text"])

    def test_extract_pdf(self):
        response = self.client.post(
            "/api/extract-resume",
            data={"file": (io.BytesIO(build_pdf()), "resume.pdf")},
            content_type="multipart/form-data",
        )
        payload = response.get_json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(payload["filename"], "resume.pdf")
        self.assertIn("Flask", payload["extracted_text"])

    def test_reject_unsupported_file_type(self):
        response = self.client.post(
            "/api/extract-resume",
            data={"file": (io.BytesIO(b"plain text resume"), "resume.txt")},
            content_type="multipart/form-data",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Unsupported file type", response.get_json()["error"])

    def test_reject_empty_file(self):
        response = self.client.post(
            "/api/extract-resume",
            data={"file": (io.BytesIO(b""), "resume.pdf")},
            content_type="multipart/form-data",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("empty", response.get_json()["error"].casefold())

    def test_reject_unreadable_pdf(self):
        response = self.client.post(
            "/api/extract-resume",
            data={"file": (io.BytesIO(b"%PDF-1.4 not really a pdf"), "resume.pdf")},
            content_type="multipart/form-data",
        )
        self.assertEqual(response.status_code, 422)
        self.assertIn("error", response.get_json())

    def test_analyze_requires_job_description(self):
        response = self.client.post(
            "/api/analyze",
            json={"resume_text": RELEVANT_RESUME, "job_description": ""},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Job description", response.get_json()["error"])

    def test_analyze_requires_minimum_resume_text(self):
        response = self.client.post(
            "/api/analyze",
            json={"resume_text": "Python developer", "job_description": RELEVANT_JOB},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("too short", response.get_json()["error"])

    def test_analyze_returns_structured_result(self):
        response = self.client.post(
            "/api/analyze",
            json={
                "resume_text": RELEVANT_RESUME,
                "job_description": RELEVANT_JOB,
                "resume_title": "Test Resume",
                "job_title": "Full Stack Engineer",
            },
        )
        payload = response.get_json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(payload["resume_title"], "Test Resume")
        self.assertEqual(payload["job_title"], "Full Stack Engineer")
        self.assertGreaterEqual(payload["match_percentage"], 50.0)
        self.assertLessEqual(payload["match_percentage"], 100.0)
        self.assertGreaterEqual(payload["keyword_coverage"], 0.0)
        self.assertLessEqual(payload["keyword_coverage"], 100.0)
        self.assertGreater(payload["job_keyword_count"], 0)
        self.assertTrue(payload["matched_keywords"])
        self.assertTrue(payload["suggestions"])
        self.assertIn("hiring probability", payload["disclaimer"])
        self.assertIn("id", payload)
        self.assertIn("timestamp", payload)

    def test_analyze_repeated_requests_are_stable(self):
        payload = {"resume_text": RELEVANT_RESUME, "job_description": RELEVANT_JOB}
        first = self.client.post("/api/analyze", json=payload).get_json()
        second = self.client.post("/api/analyze", json=payload).get_json()

        for key in (
            "match_percentage",
            "keyword_coverage",
            "job_keyword_count",
            "matched_keyword_count",
        ):
            self.assertEqual(first[key], second[key])
        self.assertEqual(first["matched_keywords"], second["matched_keywords"])
        self.assertNotEqual(first["id"], second["id"])

    def test_display_filename_strips_windows_and_posix_paths(self):
        # Browsers normally send only the basename, but older clients and direct
        # API calls can include a path. Werkzeug's multipart test client treats
        # backslashes in the Content-Disposition filename as escapes, so the
        # Windows form is checked on the helper itself rather than through an
        # upload that would lose the separators before Flask sees them.
        self.assertEqual(display_filename("C:\\Users\\me\\resume.docx"), "resume.docx")
        self.assertEqual(display_filename("/home/me/resume.docx"), "resume.docx")
        self.assertEqual(display_filename("resume.docx"), "resume.docx")
        self.assertEqual(display_filename("  resume.docx  "), "resume.docx")

    def test_upload_filename_path_components_are_stripped(self):
        response = self.client.post(
            "/api/extract-resume",
            data={"file": (io.BytesIO(build_docx()), "documents/nested/resume.docx")},
            content_type="multipart/form-data",
        )
        payload = response.get_json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(payload["filename"], "resume.docx")

    def test_uppercase_extension_is_accepted(self):
        response = self.client.post(
            "/api/extract-resume",
            data={"file": (io.BytesIO(build_pdf()), "RESUME.PDF")},
            content_type="multipart/form-data",
        )
        self.assertEqual(response.status_code, 200)

    def test_unknown_endpoint_returns_json(self):
        response = self.client.get("/api/does-not-exist")
        self.assertEqual(response.status_code, 404)
        self.assertIn("error", response.get_json())

    def test_wrong_method_returns_json(self):
        response = self.client.get("/api/analyze")
        self.assertEqual(response.status_code, 405)
        self.assertIn("error", response.get_json())

    def test_oversized_request_returns_json_413(self):
        original_limit = app.config["MAX_CONTENT_LENGTH"]
        app.config["MAX_CONTENT_LENGTH"] = 512
        try:
            response = self.client.post(
                "/api/extract-resume",
                data={"file": (io.BytesIO(b"%PDF-1.4" + b"0" * 2048), "resume.pdf")},
                content_type="multipart/form-data",
            )
        finally:
            app.config["MAX_CONTENT_LENGTH"] = original_limit

        self.assertEqual(response.status_code, 413)
        self.assertIn("10 MB", response.get_json()["error"])

    def test_analyze_empty_dictionary_case(self):
        response = self.client.post(
            "/api/analyze",
            json={
                "resume_text": "A friendly candidate who enjoys reading, cooking, hiking and the outdoors every weekend.",
                "job_description": "A friendly team that values curiosity, kindness, reading and outdoor hobbies.",
            },
        )
        payload = response.get_json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(payload["job_keyword_count"], 0)
        self.assertEqual(payload["keyword_coverage"], 0.0)
        self.assertEqual(payload["matched_keywords"], [])
        self.assertEqual(payload["missing_keywords"], [])


class OrchestrationTests(unittest.TestCase):
    def test_analyze_full_matches_public_helpers(self):
        result = analyze_full(RELEVANT_RESUME, RELEVANT_JOB)
        keywords = analyze_keywords(RELEVANT_RESUME, RELEVANT_JOB)

        self.assertEqual(
            result["match_percentage"],
            calculate_tfidf_similarity(RELEVANT_RESUME, RELEVANT_JOB),
        )
        self.assertEqual(result["matched_keywords"], keywords["matched_keywords"])
        self.assertEqual(result["missing_keywords"], keywords["missing_keywords"])
        self.assertEqual(result["keyword_coverage"], keywords["keyword_coverage"])

    def test_analyze_full_has_no_composite_scores(self):
        result = analyze_full(RELEVANT_RESUME, RELEVANT_JOB, "Resume", "Job")

        self.assertIn("match_percentage", result)
        self.assertIn("keyword_coverage", result)
        self.assertNotIn("overall_score", result)
        self.assertNotIn("skill_match_score", result)
        self.assertNotIn("ats_compatibility_report", result)
        self.assertNotIn("ai_insights", result)


# ---------------------------------------------------------------------------
# Normalisation and tokenisation regression tests
# ---------------------------------------------------------------------------

class TokenisationTests(unittest.TestCase):
    def test_clean_text_is_idempotent(self):
        source = "C++ / C# with .NET, Node.js, CI/CD, UI/UX -- React.JS!!"
        once = clean_text(source)
        self.assertEqual(clean_text(once), once)

    def test_technical_terms_survive_as_single_tokens(self):
        cleaned = clean_text("C++ C# .NET Node.js ASP.NET CI/CD UI/UX")
        tokens = cleaned.split()
        for expected in ("c++", "c#", "dotnet", "node.js", "asp.net", "ci", "cd", "ui", "ux"):
            self.assertIn(expected, tokens)

    def test_separator_punctuation_splits_words(self):
        self.assertEqual(clean_text("full-stack front-end"), "full stack front end")
        self.assertEqual(clean_text("data\r\n\tscience"), "data science")

    def test_case_and_whitespace_variants_normalise_identically(self):
        self.assertEqual(
            clean_text("REACT.JS   ,   NODE.JS"),
            clean_text("react.js, node.js"),
        )

    def test_typographic_quotes_and_dashes_are_folded(self):
        self.assertEqual(clean_text("Node\u2019s \u2014 work"), "node s work")

    def test_non_string_input_returns_empty_text(self):
        self.assertEqual(clean_text(None), "")

    def test_document_below_minimum_vocabulary_scores_zero(self):
        self.assertEqual(calculate_tfidf_similarity("Python", "Python"), 0.0)

    def test_repeated_keywords_do_not_inflate_similarity(self):
        clean = (
            "Skills Python Flask SQL Docker Git and three years of backend "
            "experience building APIs."
        )
        stuffed = (
            "Skills Python Python Python Flask Flask SQL SQL SQL Docker Docker "
            "Git Git and three years of backend experience building APIs."
        )
        base = calculate_tfidf_similarity(clean, RELEVANT_JOB)
        inflated = calculate_tfidf_similarity(stuffed, RELEVANT_JOB)
        self.assertEqual(base, inflated)

    def test_repeating_a_whole_document_does_not_increase_similarity(self):
        once = calculate_tfidf_similarity(RELEVANT_RESUME, RELEVANT_JOB)
        thrice = calculate_tfidf_similarity(" ".join([RELEVANT_RESUME] * 3), RELEVANT_JOB)
        self.assertLessEqual(thrice, once)
        self.assertGreater(thrice, once - 10.0)

    def test_equivalent_formatting_scores_identically(self):
        upper = calculate_tfidf_similarity(RELEVANT_RESUME.upper(), RELEVANT_JOB)
        spaced = calculate_tfidf_similarity(
            "   " + RELEVANT_RESUME.replace(". ", ".\n\n   ") + "   ",
            RELEVANT_JOB,
        )
        base = calculate_tfidf_similarity(RELEVANT_RESUME, RELEVANT_JOB)
        self.assertEqual(base, upper)
        self.assertEqual(base, spaced)


# ---------------------------------------------------------------------------
# Multi-domain keyword recognition and false-positive guards
# ---------------------------------------------------------------------------

class MultiDomainKeywordTests(unittest.TestCase):
    DOMAIN_JOBS = {
        "software": (
            "Python, Django, REST APIs, PostgreSQL, Docker, Git, AWS, Linux, unit testing.",
            {"Python", "Django", "REST APIs", "PostgreSQL", "Docker", "Git", "AWS",
             "Linux", "Unit Testing"},
        ),
        "marketing": (
            "Own SEO, SEM, Google Ads, Meta Ads, Google Analytics, keyword research, "
            "content marketing, email marketing, conversion rate optimization and lead "
            "generation.",
            {"SEO", "SEM & PPC", "Google Ads", "Meta Ads", "Google Analytics",
             "Keyword Research", "Content Marketing", "Email Marketing",
             "Conversion Rate Optimization", "Lead Generation"},
        ),
        "design": (
            "Adobe Photoshop, Adobe Illustrator, Figma, Canva, branding, typography, "
            "UI design, UX design, video editing and motion graphics.",
            {"Adobe Photoshop", "Adobe Illustrator", "Figma", "Canva", "Branding",
             "Typography", "UI/UX Design", "Video Editing", "Motion Graphics"},
        ),
        "business": (
            "Project management, business development, strategic planning, client relations, "
            "team management, negotiation, sales and CRM ownership.",
            {"Project Management", "Business Development", "Strategic Planning",
             "Client Relations", "Team Management", "Negotiation", "Sales", "CRM"},
        ),
        "data": (
            "Advanced Excel, Power BI, Tableau, SQL, Python, statistics, data cleaning, "
            "data visualization and reporting for stakeholders.",
            {"Excel", "Power BI", "Tableau", "SQL", "Python", "Statistics",
             "Data Cleaning", "Data Visualization", "Reporting"},
        ),
        "hr": (
            "Recruitment, talent acquisition, onboarding, employee relations, payroll, "
            "performance management and training and development.",
            {"Recruitment", "Onboarding", "Employee Relations", "Payroll",
             "Performance Management", "Training and Development"},
        ),
        "finance": (
            "Accounting, bookkeeping, budgeting, financial reporting, auditing, taxation, "
            "financial analysis and QuickBooks.",
            {"Accounting", "Bookkeeping", "Budgeting", "Financial Reporting", "Auditing",
             "Taxation", "Financial Analysis", "QuickBooks"},
        ),
    }

    def test_every_domain_vocabulary_is_recognised(self):
        for domain, (job, expected) in self.DOMAIN_JOBS.items():
            with self.subTest(domain=domain):
                # An empty resume puts every job keyword in the missing list,
                # which shows exactly what the dictionary recognised.
                job_keywords = {
                    item["keyword"]
                    for item in analyze_keywords("", job)["missing_keywords"]
                }
                undetected = expected - job_keywords
                self.assertEqual(undetected, set(), f"{domain} keywords not detected: {undetected}")

    def test_common_abbreviations_match_canonical_skills(self):
        job = (
            "JavaScript, React, Node.js, Machine Learning, SEO, CRO, CRM, Microsoft Excel, "
            "Human Resources, Conversion Rate Optimization"
        )
        resume = "JS, ReactJS, Node, ML, SEO, CRO, CRM, MS Excel, HR, CRO"
        result = analyze_keywords(resume, job)

        self.assertEqual(result["missing_keywords"], [])
        self.assertEqual(result["keyword_coverage"], 100.0)

    def test_technical_terms_are_not_confused_with_each_other(self):
        result = analyze_keywords("C# and .NET services", "C++ and .NET developer")
        matched = {item["keyword"] for item in result["matched_keywords"]}
        missing = {item["keyword"] for item in result["missing_keywords"]}

        self.assertEqual(matched, {".NET"})
        self.assertEqual(missing, {"C++"})

    def test_java_does_not_match_javascript(self):
        result = analyze_keywords("JavaScript developer", "Java developer required")
        self.assertEqual({item["keyword"] for item in result["missing_keywords"]}, {"Java"})

    def test_ambiguous_single_letters_are_not_skills(self):
        result = analyze_keywords("Strong R and Python skills.", "R programming experience needed")
        resume_keywords = {item["keyword"] for item in result["resume_keywords"]}
        job_keywords = {item["keyword"] for item in result["resume_keywords"]} | {
            item["keyword"] for item in result["missing_keywords"]
        }
        self.assertIn("R", job_keywords)
        self.assertNotIn("R", resume_keywords)

    def test_context_exclusions_block_boilerplate_false_positives(self):
        cases = [
            ("Accounting for 20 percent of revenue growth.", "Accounting"),
            ("Reporting to the finance director each month.", "Reporting"),
            ("Drive lead generation for the sales team.", "Sales"),
            ("We are recruiting an Accountant for the finance team.", "Recruitment"),
        ]
        for text, blocked in cases:
            with self.subTest(keyword=blocked):
                detected = {
                    item["keyword"]
                    for item in analyze_keywords(text, text)["matched_keywords"]
                }
                self.assertNotIn(blocked, detected)

    def test_sales_skill_still_matches_when_it_is_real_work(self):
        text = "Owned sales targets and the sales pipeline for the region."
        detected = {item["keyword"] for item in analyze_keywords(text, text)["matched_keywords"]}
        self.assertIn("Sales", detected)

    def test_kubernetes_node_is_not_nodejs(self):
        text = "Scale a Kubernetes node pool and schedule pods on each worker node."
        detected = {item["keyword"] for item in analyze_keywords(text, text)["matched_keywords"]}
        self.assertIn("Kubernetes", detected)
        self.assertNotIn("Node.js", detected)

    def test_node_without_suffix_still_matches_nodejs(self):
        text = "Backend engineer writing Node services and Express APIs."
        detected = {item["keyword"] for item in analyze_keywords(text, text)["matched_keywords"]}
        self.assertIn("Node.js", detected)

    def test_short_words_are_not_matched_inside_longer_words(self):
        text = "Excellent eye for detail, designed posters in Canvas."
        detected = {item["keyword"] for item in analyze_keywords(text, text)["matched_keywords"]}
        self.assertNotIn("Excel", detected)
        self.assertNotIn("Canva", detected)

    def test_no_duplicate_entries_or_shared_match_terms(self):
        from nlp_engine import _keyword_terms

        entries = _keyword_terms()
        names = [name for name, *_ in entries]
        self.assertEqual(len(names), len(set(names)))
        self.assertTrue(all(terms for _, _, terms, _, _ in entries))

        owner = {}
        duplicates = set()
        for name, _category, terms, _after, _before in entries:
            for term in terms:
                if term in owner and owner[term] != name:
                    duplicates.add(term)
                owner[term] = name
        self.assertEqual(duplicates, set(), f"terms shared by two entries: {duplicates}")


# ---------------------------------------------------------------------------
# End-to-end upload -> analyse workflow
# ---------------------------------------------------------------------------

class UploadWorkflowTests(unittest.TestCase):
    JOB_DESCRIPTION = (
        "We are hiring a Python developer with Flask, SQL, React and scikit-learn "
        "experience to build internal tools for the data team."
    )

    @classmethod
    def setUpClass(cls):
        app.config.update(TESTING=True)
        cls.client = app.test_client()

    def _analyse_upload(self, file_bytes, filename):
        extraction = self.client.post(
            "/api/extract-resume",
            data={"file": (io.BytesIO(file_bytes), filename)},
            content_type="multipart/form-data",
        )
        self.assertEqual(extraction.status_code, 200, extraction.get_json())

        analysis = self.client.post(
            "/api/analyze",
            json={
                "resume_text": extraction.get_json()["extracted_text"],
                "job_description": self.JOB_DESCRIPTION,
                "resume_title": filename,
                "job_title": "Python Developer",
            },
        )
        self.assertEqual(analysis.status_code, 200, analysis.get_json())
        return analysis.get_json()

    def test_docx_upload_to_results(self):
        payload = self._analyse_upload(build_docx(), "resume.docx")
        self.assertGreater(payload["match_percentage"], 0.0)
        self.assertGreater(payload["keyword_coverage"], 0.0)
        self.assertTrue(payload["matched_keywords"])
        self.assertTrue(payload["suggestions"])

    def test_pdf_upload_to_results(self):
        payload = self._analyse_upload(build_pdf(), "resume.pdf")
        self.assertGreater(payload["match_percentage"], 0.0)
        self.assertTrue(payload["matched_keywords"])
        self.assertIn("Python", {item["keyword"] for item in payload["matched_keywords"]})

    def test_empty_documents_are_handled_without_crashing(self):
        result = analyze_full("", "")
        self.assertEqual(result["match_percentage"], 0.0)
        self.assertEqual(result["keyword_coverage"], 0.0)
        self.assertEqual(result["job_keyword_count"], 0)
        self.assertTrue(result["suggestions"])

        whitespace_only = analyze_full("   \n\t  ", self.JOB_DESCRIPTION)
        self.assertEqual(whitespace_only["match_percentage"], 0.0)
        self.assertEqual(whitespace_only["keyword_coverage"], 0.0)
        self.assertGreater(whitespace_only["job_keyword_count"], 0)
        self.assertEqual(whitespace_only["matched_keywords"], [])


# ---------------------------------------------------------------------------
# Coverage consistency: distinct requirements, formatting and duplicate handling
# ---------------------------------------------------------------------------

class CoverageConsistencyTests(unittest.TestCase):
    def test_repeated_keywords_do_not_inflate_coverage(self):
        result = analyze_keywords(
            "Python Python Python React React.",
            "Python, React and SQL required.",
        )

        python = next(item for item in result["matched_keywords"] if item["keyword"] == "Python")
        self.assertEqual(python["resume_frequency"], 3)
        self.assertEqual(result["job_keyword_count"], 3)
        self.assertEqual(result["matched_keyword_count"], 2)
        self.assertEqual(result["keyword_coverage"], 66.7)

    def test_repeated_alias_and_case_forms_are_one_requirement(self):
        result = analyze_keywords(
            "Python python3 PYTHON.",
            "Python developer required.",
        )

        self.assertEqual(result["job_keyword_count"], 1)
        self.assertEqual(result["matched_keyword_count"], 1)
        self.assertEqual(result["keyword_coverage"], 100.0)

    def test_punctuation_and_case_variants_give_identical_results(self):
        job = "Power BI, Excel, CI/CD and UI/UX design are required."
        variants = [
            "POWER BI, EXCEL, CI-CD and UI UX DESIGN.",
            "power-bi, excel, ci/cd and ui/ux design",
            "Power BI. Excel. CI CD. UI-UX design.",
        ]

        baseline = analyze_keywords(variants[0], job)
        for variant in variants[1:]:
            with self.subTest(variant=variant):
                other = analyze_keywords(variant, job)
                self.assertEqual(other["matched_keywords"], baseline["matched_keywords"])
                self.assertEqual(other["keyword_coverage"], baseline["keyword_coverage"])

    def test_slash_separated_skills_are_both_recognised(self):
        result = analyze_keywords(
            "Ran SEO/SEM/PPC campaigns.",
            "SEO, SEM and PPC experience required.",
        )

        matched = {item["keyword"] for item in result["matched_keywords"]}
        self.assertEqual(matched, {"SEO", "SEM & PPC"})
        self.assertEqual(result["keyword_coverage"], 100.0)

    def test_pdf_and_docx_extraction_produce_the_same_coverage(self):
        job = "Python developer with Flask, SQL, React and Git experience."
        pdf_result = analyze_keywords(extract_text_from_pdf(build_pdf()), job)
        docx_result = analyze_keywords(extract_text_from_docx(build_docx()), job)

        self.assertGreater(pdf_result["keyword_coverage"], 0.0)
        self.assertEqual(pdf_result["keyword_coverage"], docx_result["keyword_coverage"])
        self.assertEqual(
            {item["keyword"] for item in pdf_result["matched_keywords"]},
            {item["keyword"] for item in docx_result["matched_keywords"]},
        )
        self.assertEqual(pdf_result["job_keyword_count"], docx_result["job_keyword_count"])

    def test_coverage_and_similarity_remain_separate_measures(self):
        resume = (
            "Python Flask React SQL Git. "
            + "I enjoy hiking, cooking and reading on quiet weekends. " * 5
        )
        job = "Python Flask React SQL Git required."
        result = analyze_full(resume, job)

        self.assertEqual(result["keyword_coverage"], 100.0)
        self.assertLess(result["match_percentage"], 100.0)


# ---------------------------------------------------------------------------
# False positives from ordinary sentence context
# ---------------------------------------------------------------------------

class KeywordFalsePositiveTests(unittest.TestCase):
    def test_verb_uses_of_skill_names_are_not_skills(self):
        cases = {
            "You will excel at communication and react quickly to incidents.": {"Communication"},
            "We express ideas clearly and value creative expression.": set(),
            "We need swift delivery and swift turnaround from our designers.": set(),
            "Prevent rust and remove rust from industrial equipment.": set(),
        }
        for text, expected in cases.items():
            with self.subTest(text=text):
                detected = {
                    item["keyword"]
                    for item in analyze_keywords(text, text)["matched_keywords"]
                }
                self.assertEqual(detected, expected)

    def test_unit_abbreviations_after_numbers_are_not_skills(self):
        text = "Great benefits, 8 hr shifts and 500 ml sample bottles."
        detected = {
            item["keyword"] for item in analyze_keywords(text, text)["matched_keywords"]
        }
        self.assertEqual(detected, set())

    def test_possessive_runtime_node_is_not_nodejs(self):
        text = "The node's uptime and each parent node are monitored."
        detected = {
            item["keyword"] for item in analyze_keywords(text, text)["matched_keywords"]
        }
        self.assertEqual(detected, set())

    def test_security_clearance_is_not_typescript(self):
        text = "Active TS/SCI clearance is required for this role."
        detected = {
            item["keyword"] for item in analyze_keywords(text, text)["matched_keywords"]
        }
        self.assertEqual(detected, set())

    def test_context_guards_keep_true_skill_mentions(self):
        cases = {
            "React and ReactJS frontend work.": {"React"},
            "Introduction to Express.js and Express APIs.": {"Express.js"},
            "Backend services written in Node.": {"Node.js"},
            "Advanced Excel modelling for finance.": {"Excel"},
            "Built spreadsheets and formulas in Excel.": {"Excel"},
        }
        for text, expected in cases.items():
            with self.subTest(text=text):
                detected = {
                    item["keyword"]
                    for item in analyze_keywords(text, text)["matched_keywords"]
                }
                self.assertEqual(detected, expected)


# ---------------------------------------------------------------------------
# Negated evidence must not be counted as a skill mention
# ---------------------------------------------------------------------------

class NegationTests(unittest.TestCase):
    def test_negated_resume_mentions_are_not_matched(self):
        resume = (
            "I have no experience with Kubernetes, have never used Docker and am not "
            "familiar with AWS. I do have strong Python and SQL skills."
        )
        job = "We need Python, SQL, Docker, Kubernetes and AWS experience."
        result = analyze_keywords(resume, job)

        self.assertEqual(
            {item["keyword"] for item in result["matched_keywords"]},
            {"Python", "SQL"},
        )
        self.assertEqual(
            {item["keyword"] for item in result["missing_keywords"]},
            {"AWS", "Docker", "Kubernetes"},
        )
        self.assertEqual(result["keyword_coverage"], 40.0)

    def test_contraction_negation_is_detected(self):
        result = analyze_keywords(
            "I don't have experience with Terraform.",
            "Terraform experience required.",
        )

        self.assertEqual(result["matched_keywords"], [])
        self.assertEqual(result["keyword_coverage"], 0.0)

    def test_negated_job_requirement_is_not_counted(self):
        job = (
            "Kubernetes experience is not required. "
            "Python, SQL and REST APIs are essential."
        )
        result = analyze_keywords("Python, SQL and REST APIs.", job)

        self.assertEqual(result["job_keyword_count"], 3)
        self.assertNotIn(
            "Kubernetes",
            {item["keyword"] for item in result["missing_keywords"]},
        )
        self.assertEqual(result["keyword_coverage"], 100.0)

    def test_idiomatic_phrases_are_not_treated_as_negation(self):
        cases = [
            "Not only Python but also SQL is used here.",
            "I have no problem using Python every day.",
            "There is no better tool than Python for this work.",
        ]
        for text in cases:
            with self.subTest(text=text):
                detected = {
                    item["keyword"]
                    for item in analyze_keywords(text, text)["matched_keywords"]
                }
                self.assertIn("Python", detected)


# ---------------------------------------------------------------------------
# Extended vocabulary: abbreviations, full forms and extra domain skills
# ---------------------------------------------------------------------------

class ExtendedVocabularyTests(unittest.TestCase):
    def test_extended_domain_vocabulary_is_recognised(self):
        job = (
            "ETL pipelines, Snowflake, BigQuery, Google Sheets, Adobe InDesign, "
            "Microsoft Office, ERP systems, KPI tracking, HRIS, accounts payable, "
            "accounts receivable, bank reconciliation, IFRS, GAAP, Tally ERP, OOP, "
            "data structures and WordPress."
        )
        expected = {
            "Accounts Payable", "Accounts Receivable", "Adobe InDesign",
            "Bank Reconciliation", "BigQuery", "Data Structures & Algorithms",
            "ERP", "ETL", "GAAP", "Google Sheets", "HRIS", "IFRS",
            "KPI Tracking", "Microsoft Office", "Object-Oriented Programming",
            "Snowflake", "Tally", "WordPress",
        }

        detected = {
            item["keyword"]
            for item in analyze_keywords("", job)["missing_keywords"]
        }
        self.assertEqual(detected, expected)

    def test_full_forms_and_abbreviations_map_to_the_same_keyword(self):
        cases = {
            "generally accepted accounting principles": "GAAP",
            "object oriented programming": "Object-Oriented Programming",
            "restful services": "REST APIs",
            "extract transform load": "ETL",
            "key performance indicators": "KPI Tracking",
            "human resources information system": "HRIS",
            "brand identities": "Branding",
            "cleaned data": "Data Cleaning",
            "campaign performance": "Campaign Management",
        }
        for text, keyword in cases.items():
            with self.subTest(text=text):
                detected = {
                    item["keyword"]
                    for item in analyze_keywords("", text)["missing_keywords"]
                }
                self.assertIn(keyword, detected)

    def test_tally_erp_is_not_double_counted_as_erp(self):
        detected = {
            item["keyword"]
            for item in analyze_keywords("", "Tally ERP experience required.")["missing_keywords"]
        }
        self.assertEqual(detected, {"Tally"})

        both = {
            item["keyword"]
            for item in analyze_keywords("", "Tally ERP and ERP systems.")["missing_keywords"]
        }
        self.assertEqual(both, {"Tally", "ERP"})


# ---------------------------------------------------------------------------
# Seven-domain reliability with realistic resumes and job descriptions
# ---------------------------------------------------------------------------

class DomainReliabilityTests(unittest.TestCase):
    DOMAIN_PAIRS = {
        "software": (
            "Backend engineer with Python, Flask, PostgreSQL and Docker experience.",
            "Python, Flask, PostgreSQL, Docker, Kubernetes and AWS required.",
            {"Python", "Flask", "PostgreSQL", "Docker"},
            {"Kubernetes", "AWS"},
        ),
        "data": (
            "Data analyst using Python, Pandas, SQL and Power BI dashboards.",
            "SQL, Python, Pandas, Power BI, ETL and Snowflake required.",
            {"Python", "Pandas", "SQL", "Power BI"},
            {"ETL", "Snowflake"},
        ),
        "marketing": (
            "Managed SEO, Google Ads and email marketing campaigns.",
            "SEO, Google Ads, email marketing, CRO and Google Analytics required.",
            {"SEO", "Google Ads", "Email Marketing"},
            {"Conversion Rate Optimization", "Google Analytics"},
        ),
        "design": (
            "Graphic designer with Adobe Photoshop and Illustrator skills.",
            "Adobe Photoshop, Illustrator, InDesign, Figma and typography required.",
            {"Adobe Photoshop", "Adobe Illustrator"},
            {"Adobe InDesign", "Figma", "Typography"},
        ),
        "business": (
            "Operations manager handling project management, CRM and negotiation.",
            "Project management, CRM, stakeholder management and risk management required.",
            {"Project Management", "CRM"},
            {"Risk Management", "Stakeholder Management"},
        ),
        "hr": (
            "HR officer handling recruitment, onboarding and payroll.",
            "Recruitment, onboarding, payroll, HRIS and performance management required.",
            {"Recruitment", "Onboarding", "Payroll"},
            {"HRIS", "Performance Management"},
        ),
        "finance": (
            "Accounts executive preparing financial statements and bookkeeping in QuickBooks.",
            "Financial reporting, bookkeeping, IFRS, accounts payable and Excel required.",
            {"Financial Reporting", "Bookkeeping"},
            {"IFRS", "Accounts Payable", "Excel"},
        ),
    }

    def test_each_domain_matches_and_misses_the_right_requirements(self):
        for domain, (resume, job, expected_matched, expected_missing) in self.DOMAIN_PAIRS.items():
            with self.subTest(domain=domain):
                result = analyze_keywords(resume, job)
                matched = {item["keyword"] for item in result["matched_keywords"]}
                missing = {item["keyword"] for item in result["missing_keywords"]}

                self.assertEqual(matched, expected_matched)
                self.assertEqual(missing, expected_missing)
                self.assertEqual(result["job_keyword_count"], len(expected_matched) + len(expected_missing))

    def test_one_domain_does_not_leak_into_another(self):
        marketing_resume, _job, _matched, _missing = self.DOMAIN_PAIRS["marketing"]
        finance_job = self.DOMAIN_PAIRS["finance"][1]

        result = analyze_keywords(marketing_resume, finance_job)
        self.assertEqual(result["matched_keywords"], [])
        self.assertEqual(result["keyword_coverage"], 0.0)


# ---------------------------------------------------------------------------
# Rule-based suggestion quality
# ---------------------------------------------------------------------------

class SuggestionQualityTests(unittest.TestCase):
    def test_suggestions_name_specific_missing_requirements(self):
        result = analyze_full(
            "I have strong Python and SQL experience.",
            "Python, SQL, Google Analytics and Tableau required.",
        )
        suggestions = result["suggestions"]
        text = " ".join(item["title"] + " " + item["description"] for item in suggestions)

        self.assertIn("Google Analytics", text)
        self.assertIn("Tableau", text)
        self.assertNotIn("missing-python", [item["id"] for item in suggestions])
        self.assertNotIn("Python appears in the job description", text)

    def test_suggestions_never_repeat_a_requirement(self):
        result = analyze_full(
            "Python developer.",
            "Python, Flask, SQL, Git, Docker, AWS and React required.",
        )
        suggestions = result["suggestions"]

        ids = [item["id"] for item in suggestions]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertLessEqual(len(suggestions), 5)

        for keyword in ("Flask", "SQL", "Git", "Docker", "AWS", "React"):
            with self.subTest(keyword=keyword):
                occurrences = sum(
                    1
                    for item in suggestions
                    if keyword in item["title"] + item["description"] + item["action"]
                )
                self.assertLessEqual(occurrences, 1)

    def test_weak_coverage_is_distinguished_from_missing(self):
        result = analyze_full(
            "Built monthly reports in Excel for the finance team and presented them.",
            "Requirements: advanced Excel and SQL.",
        )
        ids = [item["id"] for item in result["suggestions"]]

        self.assertEqual(result["keyword_coverage"], 50.0)
        self.assertIn("weak-excel", ids)
        self.assertNotIn("missing-excel", ids)

        weak = next(item for item in result["suggestions"] if item["id"] == "weak-excel")
        self.assertIn("advanced", weak["description"].casefold())
        self.assertIn("if you have", weak["action"].casefold())

    def test_depth_in_the_resume_suppresses_the_weak_suggestion(self):
        result = analyze_full(
            "Used advanced Excel functions and PivotTables daily for reporting.",
            "Requirements: advanced Excel and SQL.",
        )
        ids = [item["id"] for item in result["suggestions"]]
        self.assertNotIn("weak-excel", ids)

    def test_repeated_requirement_is_reported_as_weak(self):
        result = analyze_full(
            "Built one Tableau dashboard for the finance team.",
            "Tableau dashboards. Tableau reports. Tableau storytelling. SQL required.",
        )
        ids = [item["id"] for item in result["suggestions"]]
        self.assertIn("weak-tableau", ids)

    def test_suggestions_handle_an_empty_resume(self):
        result = analyze_full("", "Python, Flask and SQL required.")
        ids = [item["id"] for item in result["suggestions"]]

        self.assertEqual(result["keyword_coverage"], 0.0)
        self.assertIn("no-resume-keywords", ids)
        self.assertLessEqual(len(result["suggestions"]), 5)

    def test_suggestions_for_full_coverage(self):
        result = analyze_full(
            "Python developer with Flask and SQL experience building APIs.",
            "Python, Flask and SQL required.",
        )
        ids = [item["id"] for item in result["suggestions"]]

        self.assertEqual(result["keyword_coverage"], 100.0)
        self.assertIn("strong-keyword-coverage", ids)
        self.assertIn("review-against-requirements", ids)

    def test_missing_suggestions_are_always_conditional(self):
        result = analyze_full(
            "Python developer.",
            "Python, Kubernetes and Terraform required.",
        )
        for item in result["suggestions"]:
            if item["id"].startswith(("missing-", "weak-")):
                with self.subTest(suggestion=item["id"]):
                    self.assertIn("if you have", item["action"].casefold())

    def test_suggestion_ids_are_unique_including_weak_cards(self):
        result = analyze_full(
            "Excel and one Tableau dashboard.",
            "advanced Excel, SQL. Tableau dashboards. Tableau reports. Tableau charts.",
        )
        ids = [item["id"] for item in result["suggestions"]]
        self.assertEqual(len(ids), len(set(ids)))


# ---------------------------------------------------------------------------
# API contract: response shape must stay backward compatible
# ---------------------------------------------------------------------------

class ApiContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app.config.update(TESTING=True)
        cls.client = app.test_client()

    def test_analyze_response_shape_is_unchanged(self):
        response = self.client.post(
            "/api/analyze",
            json={
                "resume_text": RELEVANT_RESUME,
                "job_description": RELEVANT_JOB,
            },
        )
        payload = response.get_json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            set(payload),
            {
                "id", "timestamp", "resume_title", "job_title",
                "match_percentage", "keyword_coverage", "job_keyword_count",
                "matched_keyword_count", "matched_keywords", "missing_keywords",
                "resume_keywords", "resume_word_count", "job_description_word_count",
                "suggestions", "disclaimer",
            },
        )
        for item in payload["matched_keywords"] + payload["missing_keywords"]:
            self.assertEqual(
                set(item),
                {"keyword", "category", "job_frequency", "resume_frequency"},
            )
        for item in payload["suggestions"]:
            self.assertEqual(set(item), {"id", "title", "description", "action"})

    def test_negated_resume_is_not_counted_through_the_api(self):
        response = self.client.post(
            "/api/analyze",
            json={
                "resume_text": (
                    "I have no experience with Kubernetes, have never used Docker and am "
                    "not familiar with AWS. I do know Python and SQL well."
                ),
                "job_description": (
                    "We need Python, SQL, Docker, Kubernetes and AWS experience for this role."
                ),
            },
        )
        payload = response.get_json()

        self.assertEqual(response.status_code, 200)
        matched = {item["keyword"] for item in payload["matched_keywords"]}
        missing = {item["keyword"] for item in payload["missing_keywords"]}
        self.assertEqual(matched, {"Python", "SQL"})
        self.assertEqual(missing, {"AWS", "Docker", "Kubernetes"})


# ---------------------------------------------------------------------------
# Clause-scoped negation: lists, contractions and positive exceptions
# ---------------------------------------------------------------------------

NEGATION_JOB = (
    "Python, SQL, Docker, Kubernetes, AWS and Terraform experience required."
)


class NegationScopeTests(unittest.TestCase):
    def test_comma_separated_negated_list_is_fully_negated(self):
        result = analyze_keywords(
            "I have no experience with Docker, Kubernetes, or AWS. "
            "Python and SQL are my strengths.",
            NEGATION_JOB,
        )

        self.assertEqual(
            {item["keyword"] for item in result["matched_keywords"]},
            {"Python", "SQL"},
        )
        self.assertNotIn(
            "Docker", {item["keyword"] for item in result["resume_keywords"]}
        )
        self.assertNotIn(
            "Kubernetes", {item["keyword"] for item in result["resume_keywords"]}
        )
        self.assertNotIn(
            "AWS", {item["keyword"] for item in result["resume_keywords"]}
        )

    def test_positive_skills_before_a_negated_clause_are_kept(self):
        result = analyze_keywords(
            "Strong Python and SQL skills, but no experience with Docker or Kubernetes.",
            NEGATION_JOB,
        )

        self.assertEqual(
            {item["keyword"] for item in result["matched_keywords"]},
            {"Python", "SQL"},
        )
        self.assertEqual(
            {item["keyword"] for item in result["missing_keywords"]},
            {"AWS", "Docker", "Kubernetes", "Terraform"},
        )

    def test_contractions_negate_each_clause_independently(self):
        result = analyze_keywords(
            "I haven't used Terraform, and I didn't work with Kubernetes.",
            NEGATION_JOB,
        )

        self.assertEqual(result["matched_keywords"], [])
        resume_names = {item["keyword"] for item in result["resume_keywords"]}
        self.assertNotIn("Terraform", resume_names)
        self.assertNotIn("Kubernetes", resume_names)

    def test_without_experience_list_does_not_swallow_a_later_positive(self):
        result = analyze_keywords(
            "Without experience in AWS or Azure, I still use Python and SQL.",
            NEGATION_JOB,
        )

        self.assertEqual(
            {item["keyword"] for item in result["matched_keywords"]},
            {"Python", "SQL"},
        )
        self.assertIn(
            "AWS", {item["keyword"] for item in result["missing_keywords"]}
        )

    def test_separate_clauses_do_not_share_a_negation(self):
        result = analyze_keywords(
            "No Docker experience. AWS experience is a plus, and I know Python.",
            NEGATION_JOB,
        )

        self.assertEqual(
            {item["keyword"] for item in result["matched_keywords"]},
            {"AWS", "Python"},
        )
        self.assertEqual(
            {item["keyword"] for item in result["missing_keywords"]},
            {"Docker", "Kubernetes", "SQL", "Terraform"},
        )

    def test_a_heading_style_not_required_item_is_negated(self):
        result = analyze_keywords("Python.", "Not required: Kubernetes.")
        self.assertEqual(result["job_keyword_count"], 0)
        self.assertEqual(result["missing_keywords"], [])

    def test_entry_level_no_experience_required_is_not_a_skill_negation(self):
        result = analyze_keywords(
            "Python.", "No experience required: Python is essential."
        )
        self.assertEqual(result["job_keyword_count"], 1)
        self.assertEqual(
            {item["keyword"] for item in result["matched_keywords"]}, {"Python"}
        )

    def test_a_later_negated_requirement_does_not_remove_an_earlier_one(self):
        result = analyze_keywords(
            "",
            "React required. Kubernetes is not required.",
        )

        self.assertEqual(result["job_keyword_count"], 1)
        self.assertEqual(
            {item["keyword"] for item in result["missing_keywords"]}, {"React"}
        )

    def test_a_negated_job_description_list_is_not_required(self):
        job = (
            "Kubernetes, Docker and AWS are not required. "
            "Python and SQL are essential."
        )
        result = analyze_keywords("Python and SQL.", job)

        self.assertEqual(result["job_keyword_count"], 2)
        self.assertEqual(result["keyword_coverage"], 100.0)
        self.assertEqual(result["missing_keywords"], [])

    def test_a_negated_requirement_does_not_negate_a_nearby_positive_skill(self):
        job = (
            "Kubernetes is used here and Docker is not required. "
            "Python is essential."
        )
        result = analyze_keywords("Python.", job)

        self.assertEqual(
            {item["keyword"] for item in result["missing_keywords"]},
            {"Kubernetes"},
        )

    def test_ambiguous_requirement_negation_stays_positive(self):
        result = analyze_keywords(
            "Python is not necessarily required.",
            "Python is not necessarily required.",
        )

        self.assertEqual(result["job_keyword_count"], 1)
        self.assertIn(
            "Python", {item["keyword"] for item in result["matched_keywords"]}
        )


# ---------------------------------------------------------------------------
# Explicit "A or B" requirements count as one alternative requirement
# ---------------------------------------------------------------------------


class AlternativeRequirementTests(unittest.TestCase):
    def test_python_or_r_is_satisfied_by_either_side(self):
        job = "Python or R programming required."
        for resume in ("Python developer with SQL.", "R programming analyst."):
            with self.subTest(resume=resume):
                result = analyze_keywords(resume, job)
                self.assertEqual(result["job_keyword_count"], 1)
                self.assertEqual(result["matched_keyword_count"], 1)
                self.assertEqual(result["keyword_coverage"], 100.0)
                self.assertEqual(result["missing_keywords"], [])

    def test_unsatisfied_alternative_is_one_missing_requirement(self):
        result = analyze_keywords("Java developer.", "Python or R programming required.")

        self.assertEqual(result["job_keyword_count"], 1)
        self.assertEqual(
            [item["keyword"] for item in result["missing_keywords"]],
            ["Python or R"],
        )
        self.assertEqual(result["keyword_coverage"], 0.0)

    def test_react_or_angular_and_design_alternatives(self):
        cases = [
            ("React or Angular experience required.", "React frontend components.", "React"),
            (
                "Adobe Photoshop or Adobe Illustrator experience required.",
                "Adobe Photoshop design work.",
                "Adobe Photoshop",
            ),
        ]
        for job, resume, expected in cases:
            with self.subTest(job=job):
                result = analyze_keywords(resume, job)
                self.assertEqual(
                    [item["keyword"] for item in result["matched_keywords"]],
                    [expected],
                )
                self.assertEqual(result["job_keyword_count"], 1)
                self.assertEqual(result["keyword_coverage"], 100.0)

    def test_and_joined_requirements_are_not_alternatives(self):
        result = analyze_keywords("Python developer.", "Python and SQL required.")

        self.assertEqual(result["job_keyword_count"], 2)
        self.assertEqual(
            {item["keyword"] for item in result["missing_keywords"]}, {"SQL"}
        )
        self.assertEqual(result["keyword_coverage"], 50.0)

    def test_multiple_alternative_groups_are_counted_once_each(self):
        result = analyze_keywords(
            "React, R programming and SQL.",
            "React or Angular. Python or R programming. SQL required.",
        )

        self.assertEqual(result["job_keyword_count"], 3)
        self.assertEqual(result["matched_keyword_count"], 3)
        self.assertEqual(result["keyword_coverage"], 100.0)

    def test_or_between_unrelated_phrases_does_not_group_skills(self):
        result = analyze_keywords(
            "Python developer.",
            "Python is used here, or so the team says, alongside Excel.",
        )

        self.assertEqual(result["job_keyword_count"], 2)
        self.assertEqual(
            {item["keyword"] for item in result["missing_keywords"]}, {"Excel"}
        )

    def test_cross_category_or_is_not_assumed_interchangeable(self):
        result = analyze_keywords("Python developer.", "Python or Excel required.")

        self.assertEqual(result["job_keyword_count"], 2)
        self.assertEqual(
            {item["keyword"] for item in result["missing_keywords"]}, {"Excel"}
        )
        self.assertEqual(result["keyword_coverage"], 50.0)

    def test_alternative_grouping_keeps_counts_consistent(self):
        cases = [
            ("Python or R programming required.", "Python."),
            ("Python or R programming required.", "Java."),
            ("Python and SQL required.", "Python."),
            ("React or Angular. Python or R programming.", "React and R programming."),
        ]
        for job, resume in cases:
            with self.subTest(job=job, resume=resume):
                result = analyze_keywords(resume, job)
                self.assertEqual(
                    result["job_keyword_count"],
                    len(result["matched_keywords"]) + len(result["missing_keywords"]),
                )
                self.assertEqual(
                    result["matched_keyword_count"], len(result["matched_keywords"])
                )
                expected = round(
                    len(result["matched_keywords"])
                    / result["job_keyword_count"]
                    * 100.0,
                    1,
                )
                self.assertEqual(result["keyword_coverage"], expected)


# ---------------------------------------------------------------------------
# Required / preferred / optional interpretation
# ---------------------------------------------------------------------------


class RequirementImportanceTests(unittest.TestCase):
    def _levels(self, job):
        from nlp_engine import (
            _document_keyword_spans,
            _drop_nested_spans,
            _prepare_document,
            _requirement_levels,
        )

        clean, negated, boundaries = _prepare_document(job, need_boundaries=True)
        spans = _drop_nested_spans(_document_keyword_spans(clean, negated))
        return _requirement_levels(clean, boundaries, spans)

    def test_required_preferred_optional_and_ambiguous_phrasing(self):
        levels = self._levels(
            "Must have Python. Docker is preferred. AWS is a bonus. SQL."
        )

        self.assertEqual(levels["Python"], "required")
        self.assertEqual(levels["Docker"], "preferred")
        self.assertEqual(levels["AWS"], "optional")
        self.assertEqual(levels["SQL"], "unspecified")

    def test_strongly_preferred_and_nice_to_have_are_recognised(self):
        levels = self._levels(
            "Git is strongly preferred. Terraform is nice to have. Python is essential."
        )

        self.assertEqual(levels["Git"], "preferred")
        self.assertEqual(levels["Terraform"], "optional")
        self.assertEqual(levels["Python"], "required")

    def test_additive_plus_is_not_mistaken_for_optional_wording(self):
        levels = self._levels("Python plus SQL required.")
        self.assertEqual(levels["Python"], "required")
        self.assertEqual(levels["SQL"], "required")

    def test_required_missing_is_suggested_before_preferred_and_optional(self):
        result = analyze_full(
            "Python, Excel and Git.",
            "Required: SQL. Preferred: Tableau. Optional: AWS.",
        )
        suggestions = result["suggestions"]

        self.assertEqual(suggestions[0]["id"], "missing-sql")
        self.assertEqual(suggestions[1]["id"], "missing-tableau")
        self.assertIn("required skill", suggestions[0]["description"].casefold())
        self.assertIn("preferred", suggestions[1]["description"].casefold())
        self.assertNotIn("missing-aws", [item["id"] for item in suggestions])

    def test_optional_requirement_is_phrased_honestly(self):
        result = analyze_full("Python, Excel and Git.", "AWS is optional.")
        aws = next(
            item for item in result["suggestions"] if item["id"] == "missing-aws"
        )
        self.assertIn("optional", aws["description"].casefold())

    def test_unmarked_requirements_are_not_claimed_as_required(self):
        result = analyze_full("Java and Git.", "Python and SQL.")
        for item in result["suggestions"]:
            if item["id"].startswith("missing-"):
                description = item["description"].casefold()
                self.assertNotIn("required skill", description)
                self.assertNotIn("preferred rather than", description)
                self.assertNotIn("optional", description)

    def test_required_wording_does_not_leak_across_a_sentence(self):
        result = analyze_full(
            "Java and Git.",
            "Python is required. AWS is available on our platform.",
        )
        python = next(
            item for item in result["suggestions"] if item["id"] == "missing-python"
        )
        aws = next(
            item for item in result["suggestions"] if item["id"] == "missing-aws"
        )

        self.assertIn("required skill", python["description"].casefold())
        self.assertNotIn("required skill", aws["description"].casefold())

    def test_negated_requirement_is_not_given_an_importance(self):
        result = analyze_full(
            "Python and SQL.",
            "Kubernetes is not required. Python and SQL are essential.",
        )

        self.assertEqual(result["job_keyword_count"], 2)
        self.assertEqual(result["keyword_coverage"], 100.0)
        self.assertEqual(result["missing_keywords"], [])


# ---------------------------------------------------------------------------
# Weak evidence: thin mention vs missing vs strong evidence
# ---------------------------------------------------------------------------


class WeakEvidenceTests(unittest.TestCase):
    def test_basic_mention_is_weak_not_missing_for_an_advanced_request(self):
        result = analyze_full(
            "Basic Excel knowledge and monthly reporting.",
            "Advanced Excel skills required.",
        )
        weak = next(
            item for item in result["suggestions"] if item["id"] == "weak-excel"
        )

        self.assertEqual(result["keyword_coverage"], 100.0)
        self.assertIn("basic", weak["description"].casefold())
        self.assertNotIn("missing-excel", [i["id"] for i in result["suggestions"]])

    def test_a_stated_duration_suppresses_the_weak_flag(self):
        result = analyze_full(
            "3 years of Excel reporting experience.",
            "Advanced Excel required.",
        )
        self.assertNotIn("weak-excel", [i["id"] for i in result["suggestions"]])

    def test_familiar_wording_is_reported_for_a_repeated_requirement(self):
        result = analyze_full(
            "Familiar with Tableau.",
            "Tableau dashboards. Tableau reports. Tableau charts.",
        )
        weak = next(
            item for item in result["suggestions"] if item["id"] == "weak-tableau"
        )

        self.assertIn("familiar", weak["description"].casefold())

    def test_repetition_without_depth_is_not_treated_as_expertise(self):
        result = analyze_full("Excel, Excel, Excel.", "Advanced Excel required.")
        self.assertIn("weak-excel", [i["id"] for i in result["suggestions"]])

    def test_missing_and_weak_requirements_stay_distinct(self):
        result = analyze_full(
            "Basic Excel knowledge.", "Advanced Excel and SQL required."
        )
        ids = [item["id"] for item in result["suggestions"]]

        self.assertIn("weak-excel", ids)
        self.assertIn("missing-sql", ids)
        self.assertNotIn("missing-excel", ids)

    def test_strong_evidence_produces_no_weak_card(self):
        result = analyze_full(
            "Advanced Excel modelling and PivotTables.",
            "Advanced Excel required.",
        )
        self.assertNotIn("weak-excel", [i["id"] for i in result["suggestions"]])

    def test_plain_coverage_does_not_flag_every_keyword_as_weak(self):
        result = analyze_full(
            "Python, SQL and Git experience.",
            "Python, SQL and Git required.",
        )
        self.assertFalse(
            [item["id"] for item in result["suggestions"] if item["id"].startswith("weak-")]
        )


# ---------------------------------------------------------------------------
# PDF/DOCX normalisation: hyphenation, wrapped lines and Unicode
# ---------------------------------------------------------------------------


class PdfNormalizationTests(unittest.TestCase):
    def test_postgresql_split_across_a_line_is_joined(self):
        self.assertEqual(clean_extracted_text("Postgre-\nSQL"), "PostgreSQL")
        self.assertEqual(clean_extracted_text("Postgre\u00ad\nSQL"), "PostgreSQL")

    def test_dictionary_spellings_control_the_join(self):
        self.assertEqual(clean_extracted_text("Scikit-\nLearn"), "Scikit-learn")
        self.assertEqual(clean_extracted_text("Node-\nJS"), "Node.js")

    def test_legitimate_hyphenated_compounds_keep_their_hyphen(self):
        self.assertEqual(clean_extracted_text("full-\nstack"), "full-stack")
        self.assertEqual(clean_extracted_text("state-of-the-\nart"), "state-of-the-art")

    def test_technical_names_are_not_corrupted(self):
        cleaned = clean_extracted_text("C++\nC#\nASP.NET\n.NET")
        for term in ("C++", "C#", "ASP.NET", ".NET"):
            self.assertIn(term, cleaned)

    def test_bullets_and_sentence_boundaries_are_preserved(self):
        cleaned = clean_extracted_text(
            "\u2022 Built APIs\nand services\n\u2022 Led a team of five"
        )

        self.assertEqual(cleaned.count("\u2022"), 2)
        self.assertEqual(len(cleaned.splitlines()), 2)
        self.assertIn("Built APIs and services", cleaned)

        sentence = clean_extracted_text("Built APIs.\nnext lowercase line")
        self.assertIn("\nnext lowercase line", sentence)

    def test_unicode_punctuation_and_spacing_are_folded(self):
        cleaned = clean_extracted_text(
            "Unicode\u00a0space \u2014 \u201cquoted\u201d"
        )
        self.assertEqual(cleaned, 'Unicode space - "quoted"')
        self.assertNotIn("\u00a0", cleaned)

    def test_pdf_with_a_broken_word_matches_the_skill(self):
        text = extract_text_from_pdf(
            build_pdf_lines(
                [
                    "Jane Doe",
                    "Backend engineer with Postgre-",
                    "SQL and Python experience.",
                ]
            )
        )

        self.assertIn("PostgreSQL", text)
        matched = {
            item["keyword"]
            for item in analyze_keywords(text, "PostgreSQL and Python required.")
            ["matched_keywords"]
        }
        self.assertEqual(matched, {"PostgreSQL", "Python"})

    def test_docx_with_a_broken_word_matches_the_skill(self):
        text = extract_text_from_docx(
            build_docx_lines(
                [
                    "Jane Doe",
                    "Backend engineer with Postgre-",
                    "SQL and Python experience.",
                ]
            )
        )

        self.assertIn("PostgreSQL", text)
        matched = {
            item["keyword"]
            for item in analyze_keywords(text, "PostgreSQL and Python required.")
            ["matched_keywords"]
        }
        self.assertEqual(matched, {"PostgreSQL", "Python"})

    def test_pdf_and_docx_consistency_after_normalisation(self):
        lines = [
            "Jane Doe",
            "Backend engineer with Postgre-",
            "SQL, Python and Docker experience.",
        ]
        pdf_text = extract_text_from_pdf(build_pdf_lines(lines))
        docx_text = extract_text_from_docx(build_docx_lines(lines))
        job = "PostgreSQL, Python, Docker, Flask and Git required."

        pdf_result = analyze_keywords(pdf_text, job)
        docx_result = analyze_keywords(docx_text, job)

        self.assertEqual(pdf_result["keyword_coverage"], docx_result["keyword_coverage"])
        self.assertEqual(
            {item["keyword"] for item in pdf_result["matched_keywords"]},
            {item["keyword"] for item in docx_result["matched_keywords"]},
        )


# ---------------------------------------------------------------------------
# Terminology equivalence: aliases yes, related technologies no
# ---------------------------------------------------------------------------


class TerminologyEquivalenceTests(unittest.TestCase):
    def test_genuine_aliases_are_equivalent(self):
        result = analyze_keywords(
            "Microsoft Excel, Postgres and JS.",
            "MS Excel, PostgreSQL and JavaScript required.",
        )
        self.assertEqual(result["keyword_coverage"], 100.0)
        self.assertEqual(result["missing_keywords"], [])

    def test_full_form_accounting_aliases_are_equivalent(self):
        result = analyze_keywords(
            "Generally accepted accounting principles and international financial "
            "reporting standards.",
            "GAAP and IFRS required.",
        )
        self.assertEqual(result["keyword_coverage"], 100.0)

    def test_specific_database_does_not_prove_the_broader_sql_skill(self):
        result = analyze_keywords("PostgreSQL and MySQL.", "SQL required.")
        self.assertEqual(
            {item["keyword"] for item in result["missing_keywords"]}, {"SQL"}
        )
        self.assertEqual(result["keyword_coverage"], 0.0)

    def test_broad_sql_does_not_prove_a_specific_database(self):
        result = analyze_keywords("SQL queries.", "PostgreSQL required.")
        self.assertEqual(
            {item["keyword"] for item in result["missing_keywords"]},
            {"PostgreSQL"},
        )

    def test_frontend_framework_is_not_proven_by_javascript(self):
        result = analyze_keywords("JavaScript developer.", "React required.")
        self.assertEqual(
            {item["keyword"] for item in result["missing_keywords"]}, {"React"}
        )

    def test_office_suite_is_not_proven_by_excel(self):
        result = analyze_keywords("Excel modelling.", "Microsoft Office required.")
        self.assertEqual(
            {item["keyword"] for item in result["missing_keywords"]},
            {"Microsoft Office"},
        )

    def test_machine_learning_is_not_proven_by_python(self):
        result = analyze_keywords("Python developer.", "Machine Learning required.")
        self.assertEqual(
            {item["keyword"] for item in result["missing_keywords"]},
            {"Machine Learning"},
        )

    def test_cross_domain_equivalence_is_not_inferred(self):
        result = analyze_keywords(
            "Managed SEO, Google Ads and email marketing campaigns.",
            "Financial reporting and IFRS required.",
        )

        self.assertEqual(result["matched_keywords"], [])
        self.assertEqual(result["keyword_coverage"], 0.0)


if __name__ == "__main__":
    unittest.main()
