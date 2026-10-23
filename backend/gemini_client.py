"""
Gemini AI insights client (optional add-on above the local NLP engine).

The local TF-IDF / cosine analysis remains the authoritative scoring engine.
This module only adds contextual commentary; it never replaces any numeric
score, and it fails closed: any problem raising GeminiUnavailableError (or
returning None from helpers) means callers run the local analysis instead.

Security notes:
- The API key is read ONLY from the GEMINI_API_KEY environment variable. It is
  never hardcoded, logged, or written to responses.
- Resume text and job descriptions are never logged or persisted by this module.
"""

import os
import re
from typing import Any, Dict, Optional, Tuple

# Import lazily-guarded SDK pieces so the module can be imported even when the
# SDK is not installed (tests and local analysis still work in that case).
try:
    from google import genai
    from google.genai import types as genai_types
    from google.genai import errors as genai_errors

    _SDK_IMPORT_ERROR: Optional[Exception] = None
except Exception as _sdk_exc:  # pragma: no cover - only hit without SDK installed
    _SDK_IMPORT_ERROR = _sdk_exc

# Pydantic is required by google-genai; if unavailable we degrade gracefully.
try:
    from pydantic import BaseModel, Field, ValidationError as PydanticValidationError

    _PYDANTIC_IMPORT_ERROR: Optional[Exception] = None
except Exception as _pyd_exc:  # pragma: no cover
    _PYDANTIC_IMPORT_ERROR = _pyd_exc
    BaseModel = object  # type: ignore[assignment, misc]

DEFAULT_MODEL = "gemini-3.5-flash-lite"
REQUEST_TIMEOUT_SECONDS = 45
MAX_RESUME_CHARS = 7000
MAX_JOB_DESC_CHARS = 7000
MAX_OUTPUT_TOKENS = 2048


class GeminiUnavailableError(Exception):
    """Raised when AI insights cannot be produced. `code` is a stable reason."""

    def __init__(self, code: str, message: str):
        super().__init__(message or code)
        self.code = code
        self.message = message or code

    def user_facing_message(self) -> str:
        return {
            "no_api_key": "AI insights are unconfigured: set GEMINI_API_KEY on the server to enable them.",
            "sdk_missing": "AI insights are unavailable: the Google GenAI SDK is not installed on the server.",
            "invalid_key": "AI insights are unavailable: the server rejected the configured API key.",
            "rate_limited": "AI insights are temporarily unavailable: the Gemini API is rate limiting the server.",
            "quota_exceeded": "AI insights are temporarily unavailable: the Gemini API quota is exhausted.",
            "timeout": "AI insights are temporarily unavailable: the Gemini request timed out.",
            "network": "AI insights are temporarily unavailable: the Gemini API could not be reached.",
            "invalid_response": "AI insights are unavailable: Gemini returned an unexpected response.",
            "model_error": "AI insights are temporarily unavailable: the configured Gemini model reported an error.",
        }.get(self.code, "AI insights are temporarily unavailable.")


# ---------------------------------------------------------------------------
# Structured output schema (validated pydantic models)
# ---------------------------------------------------------------------------

if _PYDANTIC_IMPORT_ERROR is None:

    class _InsightSection(BaseModel):
        title: str = Field(min_length=1, max_length=120)
        items: list[str] = Field(default_factory=list)

    class ResumeInsights(BaseModel):
        """Validated shape of every Gemini response (ENFORCED via response_schema)."""
        experience_alignment: str = Field(min_length=1, max_length=1200)
        strengths: _InsightSection
        skill_gaps: _InsightSection
        prioritized_improvements: _InsightSection
        ats_keyword_recommendations: _InsightSection
        bullet_point_improvements: _InsightSection


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

def get_gemini_model_name() -> str:
    """Configurable model id via GEMINI_MODEL; never hardcoded at call sites."""
    return os.environ.get("GEMINI_MODEL", "").strip() or DEFAULT_MODEL


def _load_env_file() -> None:
    """Load dotenv-like key=value lines from backend/.env.

    Uses python-dotenv when available; falls back to a tiny manual parser so a
    plain `python app.py` picks up GEMINI_API_KEY without extra wiring.
    """
    if os.environ.get("GEMINI_API_KEY"):
        return
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if not os.path.isfile(env_path):
        return
    try:
        try:
            from dotenv import load_dotenv

            load_dotenv(env_path, override=False)
        except ImportError:
            with open(env_path, "r", encoding="utf-8") as env_file:
                for raw_line in env_file:
                    line = raw_line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    key, _, value = line.partition("=")
                    key = key.strip()
                    value = value.strip().strip('"').strip("'")
                    if key and key not in os.environ:
                        os.environ[key] = value
    except Exception:
        # Missing/unreadable .env simply means no AI insights (fail closed).
        return


def has_api_key() -> bool:
    """True when a plausible non-empty GEMINI_API_KEY is configured."""
    _load_env_file()
    return bool(os.environ.get("GEMINI_API_KEY", "").strip())


def _make_client() -> Tuple[Optional[Any], Optional[str]]:
    """Returns (client, error_code). Skips all work without a configured key."""
    _load_env_file()
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None, "no_api_key"
    if _SDK_IMPORT_ERROR is not None:
        return None, "sdk_missing"
    try:
        client = genai.Client(
            api_key=api_key,
            http_options=genai_types.HttpOptions(timeout=REQUEST_TIMEOUT_SECONDS * 1000),
        )
        return client, None
    except Exception:
        return None, "no_api_key"


# ---------------------------------------------------------------------------
# Prompt construction
# ---------------------------------------------------------------------------

def _clean_for_prompt_text(candidate_text: str, max_chars: int) -> str:
    """Trim input documents so prompts stay small and calls stay cheap."""
    text = re.sub(r"\n{3,}", "\n\n", (candidate_text or "").strip())
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + " …[truncated]"


def build_insight_prompt(
    resume_text: str,
    job_description: str,
    job_title: str,
    local_summary: Dict[str, Any],
) -> str:
    """One compact prompt capturing all six insight areas in a single call."""
    local_skills = ", ".join(
        skill.get("name", "") for skill in local_summary.get("missing_skills", [])[:15]
    )
    return (
        "You are a career-advice assistant reviewing one candidate resume against one "
        "job posting for a job-application optimization tool.\n"
        "Rules:\n"
        "- Base every statement ONLY on the resume text and job description below.\n"
        "- NEVER invent achievements, employers, dates, metrics, qualifications, or "
        "skills the candidate has not shown. Improvements may only rephrase, "
        "reorganize, or sharpen wording that already exists in the resume.\n"
        "- ATS keyword recommendations must be terms literally present in the job "
        "description that the resume lacks or mentions weakly.\n"
        "- Be specific and concise; plain sentences, no markdown.\n\n"
        f"Target role: {job_title}\n\n"
        "Local keyword engine (deterministic baseline you must build upon, not "
        f"replace): overall score {local_summary.get('overall_score', 0)}/100, "
        f"cosine similarity {local_summary.get('cosine_similarity', 0)}%, "
        f"skill match {local_summary.get('skill_match_score', 0)}%. "
        f"Missing skill names: {local_skills or 'none detected'}.\n\n"
        "Write the following sections:\n"
        "- title: a short section heading.\n"
        "- items: bullet strings for that section.\n\n"
        "Sections to fill: experience_alignment (a paragraph, as string), "
        "strengths (transferable + relevant strengths), "
        "skill_gaps (missing or weakly demonstrated skills), "
        "prioritized_improvements (ranked, most impactful first), "
        "ats_keyword_recommendations (grounded JD keywords), "
        "bullet_point_improvements (rewrite suggestions for existing resume bullets "
        "without inventing new facts).\n\n"
        "=== RESUME ===\n"
        f"{_clean_for_prompt_text(resume_text, MAX_RESUME_CHARS)}\n\n"
        "=== JOB DESCRIPTION ===\n"
        f"{_clean_for_prompt_text(job_description, MAX_JOB_DESC_CHARS)}\n"
    )


def _classify_gemini_error(exc: Exception) -> GeminiUnavailableError:
    """Maps SDK/network failures to stable, user-safe reason codes."""
    status = getattr(exc, "code", None)
    message = str(exc).lower()
    if status == 429 or "quota" in message and "exceed" in message:
        return GeminiUnavailableError("quota_exceeded", str(exc))
    if status == 429 or "rate limit" in message or "resource_exhausted" in message:
        return GeminiUnavailableError("rate_limited", str(exc))
    if status in (401, 403) or "api key" in message or "permission" in message:
        return GeminiUnavailableError("invalid_key", str(exc))
    if status == 404 or "not found" in message or "not supported" in message:
        return GeminiUnavailableError("model_error", str(exc))
    if isinstance(getattr(exc, "args", None), tuple) and any(
        isinstance(a, (TimeoutError,)) or "timed out" in str(a).lower()
        for a in exc.args
    ):
        return GeminiUnavailableError("timeout", str(exc))
    if "connection" in message or "network" in message or "unreachable" in message:
        return GeminiUnavailableError("network", str(exc))
    return GeminiUnavailableError("model_error", str(exc))


def generate_resume_insights(
    resume_text: str,
    job_description: str,
    job_title: str = "Target Position",
    local_summary: Optional[Dict[str, Any]] = None,
    client: Optional[Any] = None,
    model_name: Optional[str] = None,
) -> Any:
    """Calls Gemini once and returns a validated ResumeInsights object.

    Raises GeminiUnavailableError on ANY failure (no key, SDK missing, rate
    limits, timeouts, invalid shape). Never raises on business logic; callers
    can safely present local results when this throws.

    Args:
        client: injects an existing genai.Client; used by tests with a fake.
    """
    if _PYDANTIC_IMPORT_ERROR is not None:
        raise GeminiUnavailableError("sdk_missing", "pydantic is not installed on the server")

    client, err = (client, None) if client is not None else _make_client()
    if err == "no_api_key":
        raise GeminiUnavailableError("no_api_key", "GEMINI_API_KEY is not configured on the server")
    if err == "sdk_missing":
        raise GeminiUnavailableError("sdk_missing", "google-genai is not installed")
    if client is None or err is not None:
        raise GeminiUnavailableError(err or "model_error", "client could not be created")

    prompt = build_insight_prompt(
        resume_text,
        job_description,
        job_title,
        local_summary or {},
    )

    try:
        response = client.models.generate_content(
            model=model_name or get_gemini_model_name(),
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=ResumeInsights,
                temperature=0.4,
                max_output_tokens=MAX_OUTPUT_TOKENS,
            ),
        )
    except GeminiUnavailableError:
        raise
    except genai_errors.APIError as exc:
        raise _classify_gemini_error(exc) from exc
    except Exception as exc:
        raise _classify_gemini_error(exc) from exc

    raw_text = getattr(response, "text", None)
    if not raw_text or not str(raw_text).strip():
        raise GeminiUnavailableError("invalid_response", "empty completion from Gemini")

    # If the model ignored the schema envelope, parse a best-effort JSON body.
    raw_text = str(raw_text).strip()
    if raw_text.startswith("```"):
        raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
        raw_text = re.sub(r"\s*```$", "", raw_text)

    try:
        return ResumeInsights.model_validate_json(raw_text)
    except PydanticValidationError as exc:
        raise GeminiUnavailableError("invalid_response", str(exc)) from exc


# ---------------------------------------------------------------------------
# Serialization helpers for API responses (camelCase for the React frontend)
# ---------------------------------------------------------------------------

def _serialize_section(section: Any) -> Dict[str, Any]:
    return {
        "title": str(section.title),
        "items": [str(item) for item in (section.items or [])],
    }


def insights_to_api_dict(insights: Any) -> Dict[str, Any]:
    return {
        "experienceAlignment": str(insights.experience_alignment),
        "strengths": _serialize_section(insights.strengths),
        "skillGaps": _serialize_section(insights.skill_gaps),
        "prioritizedImprovements": _serialize_section(insights.prioritized_improvements),
        "atsKeywordRecommendations": _serialize_section(insights.ats_keyword_recommendations),
        "bulletPointImprovements": _serialize_section(insights.bullet_point_improvements),
    }


def insights_error_block(error: GeminiUnavailableError) -> Dict[str, Any]:
    """Response payload shape for 'unavailable' | 'error' AI insight states."""
    return {
        "status": "unavailable",
        "insights": None,
        "reason": error.user_facing_message(),
    }
