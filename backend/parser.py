"""Resume document parsing for the simplified workflow.

Only PDF and DOCX are accepted. Text extraction happens on the backend so the
frontend never has to trust a client-side parser.
"""

import io
import re
import zipfile

from docx import Document


def clean_extracted_text(text: str) -> str:
    """Remove NULs, normalise line endings, and collapse excess whitespace."""
    if not isinstance(text, str):
        return ""
    text = text.replace("\x00", " ")
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n[ \t]+", "\n", text)
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
