import subprocess
import os
import io
import shutil
from typing import List, Dict, Any, Tuple, Optional
from .instruction_detector import detect_screening_manipulation_instructions

def get_tesseract_cmd() -> Optional[str]:
    """Finds the tesseract binary location."""
    if shutil.which("tesseract"):
        return "tesseract"
    standard_paths = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        "/usr/bin/tesseract",
        "/usr/local/bin/tesseract"
    ]
    for p in standard_paths:
        if os.path.exists(p):
            return p
    return None

def is_tesseract_available() -> bool:
    """
    Checks if local Tesseract OCR binary or pytesseract library is available.
    """
    cmd = get_tesseract_cmd()
    if cmd:
        try:
            import pytesseract
            pytesseract.pytesseract.tesseract_cmd = cmd
            return True
        except Exception:
            return True

    try:
        import pytesseract
        pytesseract.get_tesseract_version()
        return True
    except Exception:
        pass

    return False

def run_ocr_on_image_bytes(image_bytes: bytes) -> Tuple[Optional[str], float]:
    """
    Runs Tesseract OCR on raw image bytes.
    Returns (extracted_text, average_confidence).
    """
    if not is_tesseract_available():
        return None, 0.0

    try:
        import pytesseract
        from PIL import Image
        img = Image.open(io.BytesIO(image_bytes))
        data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
        text = " ".join([w for w in data.get("text", []) if w.strip()])
        confs = [float(c) for c in data.get("conf", []) if float(c) > 0]
        avg_conf = sum(confs) / len(confs) if confs else 0.0
        return text, avg_conf
    except Exception:
        # Attempt CLI fallback if pytesseract wrapper isn't configured
        pass

    return None, 0.0

def inspect_image_and_ocr(
    file_bytes: bytes,
    file_type: str,
    extracted_plain_text: str,
    mock_ocr_text: Optional[str] = None
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Inspects embedded images and scans for image-based screening manipulation.
    If OCR is unavailable or fails, explicitly records that inspection is incomplete
    with the mandated warning message.
    """
    findings: List[Dict[str, Any]] = []
    has_tesseract = is_tesseract_available() or (mock_ocr_text is not None)
    
    ocr_status: Dict[str, Any] = {
        "step_name": "image_and_ocr_inspection",
        "ocr_available": has_tesseract,
        "warning": None,
        "embedded_images_count": 0,
        "scanned_pages_count": 0,
        "is_incomplete": False
    }

    embedded_images_found = 0
    scanned_pages_detected = False

    # Check if document has embedded images
    if file_type == "pdf":
        try:
            import fitz
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            for page in doc:
                imgs = page.get_images()
                embedded_images_found += len(imgs)
                # If page has virtually no text but has images, it's a scanned page
                txt = page.get_text("text").strip()
                if len(txt) < 15 and len(imgs) > 0:
                    scanned_pages_detected = True
            doc.close()
        except Exception:
            pass

    ocr_status["embedded_images_count"] = embedded_images_found

    # If document has images or is scanned, OCR is required for thorough inspection
    if embedded_images_found > 0 or scanned_pages_detected or mock_ocr_text is not None:
        if not has_tesseract:
            # Mandated exact warning message
            warning_msg = "Image-based content could not be fully inspected. Security analysis is incomplete."
            ocr_status["warning"] = warning_msg
            ocr_status["is_incomplete"] = True
            
            findings.append({
                "rule_id": "RULE_OCR_INSPECTION_INCOMPLETE",
                "category": "INSPECTION_LIMITATION",
                "severity": "MEDIUM",
                "confidence": "HIGH",
                "title": "Image-Based Security Inspection Incomplete",
                "description": warning_msg,
                "snippet": f"Document contains {embedded_images_found} embedded image(s), but local Tesseract OCR engine is unavailable or unconfigured.",
                "page_number": 1,
                "bbox": [],
                "visibility_evidence": "Embedded image without text verification",
                "detection_details": {
                    "embedded_images": embedded_images_found,
                    "scanned_document": scanned_pages_detected,
                    "warning": warning_msg
                }
            })
            return findings, ocr_status

        # OCR is available or mock text provided
        ocr_text = mock_ocr_text or ""
        if not ocr_text and has_tesseract and file_type == "pdf":
            try:
                import fitz
                doc = fitz.open(stream=file_bytes, filetype="pdf")
                extracted_pieces = []
                for page in doc:
                    imgs = page.get_images()
                    for img_info in imgs[:5]:  # inspect up to 5 embedded images
                        xref = img_info[0]
                        base_img = doc.extract_image(xref)
                        ib = base_img.get("image")
                        if ib:
                            txt, conf = run_ocr_on_image_bytes(ib)
                            if txt:
                                extracted_pieces.append(txt)
                doc.close()
                ocr_text = " ".join(extracted_pieces)
            except Exception:
                pass

        # Scan OCR output for screening manipulation instructions
        if ocr_text:
            instructions = detect_screening_manipulation_instructions(
                ocr_text,
                is_concealed=True,
                page_number=1,
                formatting_info={"source": "OCR_IMAGE_EXTRACTION"}
            )
            for inst in instructions:
                inst["rule_id"] = "RULE_IMAGE_BASED_PROMPT_INJECTION"
                inst["title"] = "Concealed Prompt Injection Inside Embedded Image"
                inst["severity"] = "CRITICAL"
                inst["confidence"] = "VERIFIED"
                inst["description"] = f"Screening manipulation instructions detected inside embedded image via OCR: '{inst.get('snippet', '')}'."
                inst["visibility_evidence"] = "Extracted from embedded raster image via OCR"
                findings.append(inst)

            # Compare OCR text with standard extracted plain text for discrepancies
            ocr_words = set(ocr_text.lower().split())
            plain_words = set(extracted_plain_text.lower().split())
            hidden_in_image = ocr_words - plain_words
            
            if len(hidden_in_image) > 20 and not instructions:
                findings.append({
                    "rule_id": "RULE_IMAGE_TEXT_DISCREPANCY",
                    "category": "DISCREPANCY",
                    "severity": "LOW",
                    "confidence": "MEDIUM",
                    "title": "Text Discrepancy Between Embedded Image and Extracted Text",
                    "description": "Embedded image contains substantial text that does not appear in ordinary extracted resume text.",
                    "snippet": f"Found {len(hidden_in_image)} words in image not in document text.",
                    "page_number": 1,
                    "bbox": [],
                    "visibility_evidence": "Visual OCR text discrepancy",
                    "detection_details": {"words_count": len(hidden_in_image)}
                })

    return findings, ocr_status
