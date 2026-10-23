"""
Tests for the optional Gemini AI insights integration.

These tests NEVER hit the network and NEVER use the real GEMINI_API_KEY:
- All Gemini calls run through an injected fake client (no paid API usage).
- No assertion needs a valid key; key-dependent paths are exercised with the
  environment variable explicitly emptied.

Run from the backend directory:
    python -m unittest discover -s tests -v
"""

import json
import os
import sys
import unittest
from unittest.mock import patch

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import gemini_client
from gemini_client import (
    GeminiUnavailableError,
    ResumeInsights,
    build_insight_prompt,
    generate_resume_insights,
    insights_error_block,
    insights_to_api_dict,
)


VALID_INSIGHTS_JSON = json.dumps({
    "experience_alignment": "Most listed projects mirror the backend + cloud stack the posting asks for.",
    "strengths": {
        "title": "Strengths & transferable skills",
        "items": [
            "Three years of Python work transfers directly to the API development duties.",
            "Docker and CI familiarity covers the deployment requirements."
        ]
    },
    "skill_gaps": {
        "title": "Missing or weakly demonstrated skills",
        "items": [
            "Kubernetes is required by the posting but never appears in the resume."
        ]
    },
    "prioritized_improvements": {
        "title": "Prioritized improvements",
        "items": [
            "1. Add a Skills entry line for the cloud tooling you already used in the side project."
        ]
    },
    "ats_keyword_recommendations": {
        "title": "ATS keyword recommendations",
        "items": [
            "Add the term 'distributed systems', which appears four times in the posting."
        ]
    },
    "bullet_point_improvements": {
        "title": "Bullet point improvements",
        "items": [
            "Rewrite 'helped with testing' as 'authored manual test cases for the REST endpoints'."
        ]
    }
})


class _FakeModels:
    """Stands in for genai.Client().models without touching the network."""

    def __init__(self, text: str = VALID_INSIGHTS_JSON, exc: Exception | None = None):
        self.text = text
        self.exc = exc
        self.calls: list[dict] = []

    def generate_content(self, *, model, contents, config):
        self.calls.append({"model": model, "contents": contents, "config": config})
        if self.exc is not None:
            raise self.exc
        class _Response:
            def __init__(self, text):
                self.text = text
        return _Response(self.text)


class _FakeClient:
    def __init__(self, text: str = VALID_INSIGHTS_JSON, exc: Exception | None = None):
        self.models = _FakeModels(text, exc)


SAMPLE_RESUME = "Backend developer with Python, Flask, SQL and Docker experience building REST APIs."
SAMPLE_JD = "Looking for a backend engineer skilled in Python, Docker, distributed systems, Kubernetes."
SAMPLE_LOCAL = {
    "overall_score": 64.0,
    "cosine_similarity": 58.0,
    "skill_match_score": 70.0,
    "missing_skills": [{"name": "Kubernetes", "importance": "Required"}],
}


class NoRealKey(unittest.TestCase):
    """Belt-and-braces guard: these tests must never use a real key."""

    def setUp(self):
        os.environ['GEMINI_API_KEY'] = ''
        os.environ.pop('GEMINI_MODEL', None)


class TestSchemaValidation(NoRealKey):

    def test_valid_payload_parses(self):
        parsed = ResumeInsights.model_validate_json(VALID_INSIGHTS_JSON)
        self.assertIn("Kubernetes", parsed.skill_gaps.items[0])
        self.assertTrue(parsed.experience_alignment)

    def test_missing_section_rejected(self):
        broken = json.dumps({
            "experience_alignment": "ok",
            "strengths": {"title": "t", "items": []},
            "prioritized_improvements": {"title": "t", "items": []},
            "ats_keyword_recommendations": {"title": "t", "items": []},
            "bullet_point_improvements": {"title": "t", "items": []}
        })
        with self.assertRaises(Exception):
            ResumeInsights.model_validate_json(broken)

    def test_garbage_rejected(self):
        with self.assertRaises(Exception):
            ResumeInsights.model_validate_json("not json at all")


class ErrorMessage(unittest.TestCase):

    def test_user_facing_messages_are_safe(self):
        self.assertIn("GEMINI_API_KEY", GeminiUnavailableError("no_api_key", "x").user_facing_message())
        self.assertIn("rate limit", GeminiUnavailableError("rate_limited", "x").user_facing_message())


class TestGeneration(NoRealKey):

    def test_happy_path_returns_validated_insights(self):
        fake = _FakeClient()
        result = generate_resume_insights(
            SAMPLE_RESUME, SAMPLE_JD, "Backend Engineer", SAMPLE_LOCAL, client=fake
        )
        self.assertEqual(result.skill_gaps.items, [
            "Kubernetes is required by the posting but never appears in the resume."
        ])

    def test_single_call_only(self):
        fake = _FakeClient()
        generate_resume_insights(SAMPLE_RESUME, SAMPLE_JD, "Backend Engineer", SAMPLE_LOCAL, client=fake)
        self.assertEqual(len(fake.models.calls), 1)

    def test_call_uses_structured_json_output(self):
        fake = _FakeClient()
        generate_resume_insights(SAMPLE_RESUME, SAMPLE_JD, "Backend Engineer", SAMPLE_LOCAL, client=fake)
        call = fake.models.calls[0]
        self.assertEqual(call["config"].response_mime_type, "application/json")

    def test_call_uses_configured_model(self):
        fake = _FakeClient()
        os.environ['GEMINI_MODEL'] = 'gemini-3.5-flash-lite'
        generate_resume_insights(SAMPLE_RESUME, SAMPLE_JD, "Backend Engineer", SAMPLE_LOCAL, client=fake)
        self.assertEqual(fake.models.calls[0]["model"], "gemini-3.5-flash-lite")

    def test_prompt_contains_both_documents_but_is_truncated(self):
        prompt = build_insight_prompt("R" * 20000, "J" * 20000, "Role", SAMPLE_LOCAL)
        self.assertIn("RESUME", prompt)
        self.assertIn("JOB DESCRIPTION", prompt)
        self.assertLess(len(prompt), 22000)
        self.assertNotIn("R" * 8000, prompt)

    def test_markdown_fenced_json_is_still_parsed(self):
        fake = _FakeClient(text="```json\n" + VALID_INSIGHTS_JSON + "\n```")
        result = generate_resume_insights(SAMPLE_RESUME, SAMPLE_JD, "Role", SAMPLE_LOCAL, client=fake)
        self.assertTrue(result.strengths.items)

    def test_missing_key_fails_closed_without_network(self):
        with self.assertRaises(GeminiUnavailableError) as ctx:
            generate_resume_insights(SAMPLE_RESUME, SAMPLE_JD, "Role", SAMPLE_LOCAL, client=None)
        self.assertEqual(ctx.exception.code, "no_api_key")

    def test_empty_response_is_invalid_response(self):
        fake = _FakeClient(text="")
        with self.assertRaises(GeminiUnavailableError) as ctx:
            generate_resume_insights(SAMPLE_RESUME, SAMPLE_JD, "Role", SAMPLE_LOCAL, client=fake)
        self.assertEqual(ctx.exception.code, "invalid_response")

    def test_wrong_shape_is_invalid_response(self):
        fake = _FakeClient(text=json.dumps({"foo": "bar"}))
        with self.assertRaises(GeminiUnavailableError) as ctx:
            generate_resume_insights(SAMPLE_RESUME, SAMPLE_JD, "Role", SAMPLE_LOCAL, client=fake)
        self.assertEqual(ctx.exception.code, "invalid_response")

    def test_sdk_exception_maps_to_rate_limited(self):
        class ApiLike(Exception):
            def __init__(self):
                self.code = 429
                super().__init__("resource_exhausted: quota exceeded")
        fake = _FakeClient(exc=ApiLike())
        with self.assertRaises(GeminiUnavailableError) as ctx:
            generate_resume_insights(SAMPLE_RESUME, SAMPLE_JD, "Role", SAMPLE_LOCAL, client=fake)
        self.assertIn(ctx.exception.code, ("rate_limited", "quota_exceeded"))

    def test_auth_error_maps_to_invalid_key(self):
        class ApiLike(Exception):
            def __init__(self):
                self.code = 401
                super().__init__("invalid api key")
        fake = _FakeClient(exc=ApiLike())
        with self.assertRaises(GeminiUnavailableError) as ctx:
            generate_resume_insights(SAMPLE_RESUME, SAMPLE_JD, "Role", SAMPLE_LOCAL, client=fake)
        self.assertEqual(ctx.exception.code, "invalid_key")


class TestSerialization(NoRealKey):

    def test_api_dict_uses_camel_case(self):
        parsed = ResumeInsights.model_validate_json(VALID_INSIGHTS_JSON)
        api = insights_to_api_dict(parsed)
        for key in (
            "experienceAlignment", "strengths", "skillGaps",
            "prioritizedImprovements", "atsKeywordRecommendations",
            "bulletPointImprovements"
        ):
            self.assertIn(key, api)
        self.assertNotIn("experience_alignment", api)

    def test_error_block_shape(self):
        block = insights_error_block(GeminiUnavailableError("timeout", "boom"))
        self.assertEqual(block["status"], "unavailable")
        self.assertIsNone(block["insights"])
        self.assertIn("timed out", block["reason"])


class TestAnalyzeEndpoint(unittest.TestCase):
    """/api/analyze must always return local results; AI is additive only."""

    @classmethod
    def setUpClass(cls):
        os.environ['GEMINI_API_KEY'] = ''
        from app import app as flask_app
        cls.app = flask_app
        cls.client = flask_app.test_client()

    def setUp(self):
        os.environ['GEMINI_API_KEY'] = ''

    def _analyze(self, payload):
        return self.client.post('/api/analyze', json=payload)

    def test_no_consent_returns_declined_block(self):
        res = self._analyze({
            "resume_text": "Python Flask developer with SQL and Docker REST API experience plus Git.",
            "job_description": "Backend engineer with Python Flask SQL Docker REST API Git CI skills.",
            "resume_title": "T1",
            "job_title": "Backend Engineer"
        })
        self.assertEqual(res.status_code, 200)
        body = res.get_json()
        self.assertEqual(body["ai_insights"]["status"], "declined")
        self.assertIsNone(body["ai_insights"]["insights"])
        self.assertGreaterEqual(float(body["overall_score"]), 0)

    def test_consent_with_mocked_gemini_attaches_insights(self):
        parsed = ResumeInsights.model_validate_json(VALID_INSIGHTS_JSON)
        with patch.object(
            self.app.config.get('_gemini') or gemini_client,
            'generate_resume_insights',
            return_value=parsed
        ), patch.object(
            self.app.config.get('_gemini') or gemini_client,
            'get_gemini_model_name',
            return_value='gemini-3.5-flash-lite'
        ):
            res = self._analyze({
                "resume_text": "Python Flask developer with SQL and Docker REST API experience plus Git.",
                "job_description": "Backend engineer with Python Flask SQL Docker REST API Git CI skills.",
                "resume_title": "T2",
                "job_title": "Backend Engineer",
                "use_gemini": True
            })
        self.assertEqual(res.status_code, 200)
        body = res.get_json()
        self.assertEqual(body["ai_insights"]["status"], "available")
        self.assertEqual(
            body["ai_insights"]["insights"]["skillGaps"]["items"],
            ["Kubernetes is required by the posting but never appears in the resume."]
        )

    def test_consent_with_gemini_failure_still_returns_local_analysis(self):
        with patch.object(
            gemini_client,
            'generate_resume_insights',
            side_effect=GeminiUnavailableError("timeout", "boom")
        ):
            res = self._analyze({
                "resume_text": "Python Flask developer with SQL and Docker REST API experience plus Git.",
                "job_description": "Backend engineer with Python Flask SQL Docker REST API Git CI skills.",
                "resume_title": "T3",
                "job_title": "Backend Engineer",
                "use_gemini": True
            })
        self.assertEqual(res.status_code, 200)
        body = res.get_json()
        self.assertEqual(body["ai_insights"]["status"], "unavailable")
        self.assertGreaterEqual(float(body["overall_score"]), 0)


if __name__ == '__main__':
    unittest.main()
