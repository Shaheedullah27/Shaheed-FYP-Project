"""Resume document parsing for the simplified workflow.

Only PDF and DOCX are accepted. Text extraction happens on the backend so the
frontend never has to trust a client-side parser.

Extracted text is normalised, never the uploaded file. The normalisation is
deliberately conservative because a wrong join can invent a skill:

* a word split as ``Postgre-`` / ``SQL`` is joined when the continuation starts
  uppercase or the joined form is a known dictionary term;
* ``full-`` / ``stack`` keeps its hyphen, because removing a real hyphen would
  corrupt compounds such as ``state-of-the-art``;
* a lowercase continuation of an unfinished line is joined back into the
  sentence, while bullets, headings ending in punctuation and blank lines stay
  separate;
* Unicode ligatures, quotes, dashes, non-breaking spaces, zero-width characters
  and soft hyphens are folded to their plain equivalents.
"""

import io
import json
import os
import re
import unicodedata
import zipfile
from functools import lru_cache

from docx import Document

DICT_PATH = os.path.join(os.path.dirname(__file__), "skills_dictionary.json")

_TYPOGRAPHIC_TRANSLATION = str.maketrans({
    "\u2018": "'", "\u2019": "'", "\u201b": "'",
    "\u201c": '"', "\u201d": '"',
    "\u2010": "-", "\u2011": "-", "\u2012": "-",
    "\u2013": "-", "\u2014": "-", "\u2015": "-", "\u2212": "-",
    "\u2026": "...", "\u00a0": " ",
})

# A hyphen at the end of a visual line with a word on both sides.
_LINE_HYPHEN_RE = re.compile(
    r"([A-Za-z][A-Za-z0-9]*)-[ \t]*\n[ \t]*([A-Za-z][A-Za-z0-9]*)"
)

# Lines that visibly start a new list item or numbered block.
_BULLET_RE = re.compile(r"^[ \t]*(?:[\u2022\u25aa\u25e6\u2023\u2219\u00b7*+\u2013\u2014-]|\d{1,2}[.)])\s+")

# Punctuation that means the previous line was a complete statement.
_TERMINAL_RE = re.compile(r"[.!?;:]\s*$")


def _compact(value: str) -> str:
    """Lower-case a term and drop separators, for lookup only."""
    return re.sub(r"[^a-z0-9]+", "", value.casefold())


@lru_cache(maxsize=1)
def _known_compound_joins() -> dict[str, str]:
    """Dictionary spellings that may be split across a PDF line.

    Maps a compact form (``scikitlearn``) to a normal spelling from the
    dictionary (``scikit learn``), so the joined text does not become a token
    the matcher cannot recognise. A term that is not in this map keeps its
    hyphen, so the rule cannot silently glue two unrelated words together.
    """
    try:
        with open(DICT_PATH, "r", encoding="utf-8") as handle:
            data = json.load(handle)
    except (OSError, json.JSONDecodeError):
        return {}

    joins: dict[str, str] = {}
    if not isinstance(data, dict):
        return {}

    for category, entries in data.items():
        if category.startswith("_") or not isinstance(entries, list):
            continue
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            values = [entry.get("name", "")]
            values.extend(entry.get("terms", []) or [])
            values.extend(entry.get("aliases", []) or [])
            for value in values:
                spelling = str(value).strip()
                compact = _compact(spelling)
                if len(compact) > 2 and compact not in joins:
                    joins[compact] = spelling
    return joins


def _dehyphenate_line_breaks(text: str) -> str:
    """Join words split by a visual line break without corrupting compounds."""

    def replace(match: "re.Match[str]") -> str:
        left, right = match.group(1), match.group(2)
        joined = left + right
        canonical = _known_compound_joins().get(_compact(joined))
        if canonical:
            return canonical
        if right[0].isupper():
            return joined
        # A genuine compound: keep the hyphen, drop only the line break.
        return f"{left}-{right}"

    return _LINE_HYPHEN_RE.sub(replace, text)


def _join_wrapped_lines(text: str) -> str:
    """Join a lowercase continuation line back onto the sentence above it."""
    merged: list[str] = []
    for raw_line in text.split("\n"):
        line = raw_line.strip()
        if not line:
            merged.append("")
            continue

        if merged and merged[-1]:
            previous = merged[-1]
            if (
                not _TERMINAL_RE.search(previous)
                and not _BULLET_RE.match(line)
                and line[0].islower()
            ):
                merged[-1] = f"{previous} {line}"
                continue

        merged.append(line)
    return "\n".join(merged)


def clean_extracted_text(text: str) -> str:
    """Normalise extracted PDF/DOCX text without changing the source file."""
    if not isinstance(text, str):
        return ""

    # A soft hyphen is an invisible break opportunity; at a line end it should
    # disappear rather than leave a stray character in the middle of a word.
    text = text.replace("\u00ad\n", "").replace("\u00ad", "")
    text = text.replace("\x00", " ")
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = unicodedata.normalize("NFKC", text)
    text = text.translate(_TYPOGRAPHIC_TRANSLATION)
    text = text.replace("\u200b", "").replace("\u200c", "").replace("\u200d", "")
    text = text.replace("\ufeff", "")

    text = _dehyphenate_line_breaks(text)
    text = _join_wrapped_lines(text)

    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n[ \t]+", "\n", text)
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract selectable text from a PDF using PyMuPDF."""
    if not file_bytes.lstrip().startswith(b"%PDF-"):
        raise RuntimeError("This file is not a valid PDF document.")

    try:
        try:
            import pymupdf as fitz
        except ImportError:  # Older PyMuPDF releases expose only the fitz name.
            import fitz

        document = fitz.open(stream=file_bytes, filetype="pdf")
        try:
            if document.needs_pass:
                raise RuntimeError("This PDF is password protected. Remove the password and upload it again.")
            if document.page_count == 0:
                raise RuntimeError("This PDF contains no pages.")

            pages = [page.get_text("text") for page in document]
        finally:
            document.close()
    except RuntimeError:
        raise
    except Exception as exc:
        raise RuntimeError(f"Could not read this PDF: {exc}") from exc

    return clean_extracted_text("\n".join(pages))


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract paragraphs and table text from a DOCX package."""
    if not file_bytes:
        raise RuntimeError("The uploaded Word document is empty.")
    if not zipfile.is_zipfile(io.BytesIO(file_bytes)):
        raise RuntimeError("This file is not a valid DOCX document.")

    try:
        document = Document(io.BytesIO(file_bytes))
    except Exception as exc:
        raise RuntimeError(f"Could not read this Word document: {exc}") from exc

    parts = [paragraph.text for paragraph in document.paragraphs if paragraph.text.strip()]

    for table in document.tables:
        for row in table.rows:
            cells = [cell.text.strip() for cell in row.cells if cell.text.strip()]
            if cells:
                parts.append(" | ".join(cells))

    return clean_extracted_text("\n".join(parts))


def parse_uploaded_file(file_bytes: bytes, filename: str) -> str:
    """Route a validated upload to the matching parser."""
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if extension == "pdf":
        return extract_text_from_pdf(file_bytes)
    if extension == "docx":
        return extract_text_from_docx(file_bytes)

    raise ValueError("Unsupported file type. Upload a PDF or DOCX resume.")
