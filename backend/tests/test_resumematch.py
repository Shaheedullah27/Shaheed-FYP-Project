import io
import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import app
from nlp_engine import (
    analyze_full,
    analyze_keywords,
    calculate_tfidf_similarity,
    clean_text,
    generate_suggestions,
)
from parser import extract_text_from_docx, extract_text_from_pdf


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
    try:
        import pymupdf as fitz
    except ImportError:
        import fitz

    document = fitz.open()
    page = document.new_page()
    page.insert_text((72, 72), "John Doe")
    page.insert_text((72, 92), "Python developer with Flask, SQL and React experience.")
    page.insert_text((72, 112), "Built a resume matching project using scikit-learn.")
    pdf_bytes = document.tobytes()
    document.close()
    return pdf_bytes


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

    def test_upload_filename_path_components_are_stripped(self):
        response = self.client.post(
            "/api/extract-resume",
            data={"file": (io.BytesIO(build_docx()), "C:\\Users\\me\\resume.docx")},
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


if __name__ == "__main__":
    unittest.main()
