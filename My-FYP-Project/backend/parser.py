import io
import os
from typing import Optional

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extracts plain text from PDF using PyMuPDF (fitz).
    Handles multi-column text and cleans whitespace.
    """
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        text_parts = []
        for page in doc:
            text_parts.append(page.get_text("text"))
        doc.close()
        return "\n".join(text_parts).strip()
    except ImportError:
        # Graceful fallback if fitz is not installed in local environment
        raise RuntimeError("PyMuPDF (fitz) is not installed. Install via: pip install PyMuPDF")
    except Exception as e:
        raise RuntimeError(f"Error parsing PDF file: {str(e)}")

def extract_text_from_docx(file_bytes: bytes) -> str:
    """
    Extracts text paragraphs and tables from Word DOCX using python-docx.
    """
    try:
        import docx
        doc = docx.Document(io.BytesIO(file_bytes))
        full_text = []
        for para in doc.paragraphs:
            if para.text.strip():
                full_text.append(para.text)
        for table in doc.tables:
            for row in table.rows:
                row_text = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                if row_text:
                    full_text.append(" | ".join(row_text))
        return "\n".join(full_text).strip()
    except ImportError:
        raise RuntimeError("python-docx is not installed. Install via: pip install python-docx")
    except Exception as e:
        raise RuntimeError(f"Error parsing DOCX file: {str(e)}")

def parse_uploaded_file(file_bytes: bytes, filename: str) -> str:
    """Routes uploaded file bytes to appropriate parser based on extension."""
    ext = os.path.splitext(filename)[1].lower()
    if ext == '.pdf':
        return extract_text_from_pdf(file_bytes)
    elif ext in ['.docx', '.doc']:
        return extract_text_from_docx(file_bytes)
    elif ext in ['.txt', '.rtf', '.md']:
        return file_bytes.decode('utf-8', errors='ignore')
    else:
        raise ValueError(f"Unsupported file format '{ext}'. Supported formats: .pdf, .docx, .txt")
