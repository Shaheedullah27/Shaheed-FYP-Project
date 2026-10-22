import fitz  # PyMuPDF
import json
import os
import io
import re
from typing import List, Dict, Any, Tuple, Optional
from .instruction_detector import detect_screening_manipulation_instructions

def calculate_luminance(r: float, g: float, b: float) -> float:
    """Calculates perceived relative luminance (0.0 to 1.0)."""
    return 0.299 * r + 0.587 * g + 0.114 * b

def int_color_to_rgb(color_int: int) -> Tuple[float, float, float]:
    """Converts 24-bit integer color from PyMuPDF span to (r, g, b) floats (0.0 to 1.0)."""
    r = ((color_int >> 16) & 255) / 255.0
    g = ((color_int >> 8) & 255) / 255.0
    b = (color_int & 255) / 255.0
    return r, g, b

def rgb_to_hex(r: float, g: float, b: float) -> str:
    """Formats RGB float tuple as #RRGGBB hex string."""
    ir = min(255, max(0, int(round(r * 255))))
    ig = min(255, max(0, int(round(g * 255))))
    ib = min(255, max(0, int(round(b * 255))))
    return f"#{ir:02X}{ig:02X}{ib:02X}"

def bbox_iou(b1: List[float], b2: List[float]) -> float:
    """Computes Intersection over Union for two [x0, y0, x1, y1] bboxes."""
    x0 = max(b1[0], b2[0])
    y0 = max(b1[1], b2[1])
    x1 = min(b1[2], b2[2])
    y1 = min(b1[3], b2[3])
    
    inter_w = max(0.0, x1 - x0)
    inter_h = max(0.0, y1 - y0)
    inter_area = inter_w * inter_h
    if inter_area <= 0:
        return 0.0

    a1 = (b1[2] - b1[0]) * (b1[3] - b1[1])
    a2 = (b2[2] - b2[0]) * (b2[3] - b2[1])
    union_area = a1 + a2 - inter_area
    return inter_area / union_area if union_area > 0 else 0.0

def find_background_color_for_bbox(
    bbox: List[float],
    drawings: List[Dict[str, Any]],
    default_bg_luminance: float = 1.0
) -> Tuple[float, str]:
    """
    Examines vector drawings/rectangles under or overlapping the bbox
    to determine if there is a dark fill (e.g. inverted header, colored badge).
    Returns (background_luminance, hex_color).
    """
    span_rect = fitz.Rect(bbox)
    matched_bg_lum = default_bg_luminance
    matched_hex = "#FFFFFF"

    for d in drawings:
        fill = d.get("fill")
        rect = d.get("rect")
        if not fill or not rect:
            continue
            
        d_rect = fitz.Rect(rect)
        if d_rect.intersects(span_rect):
            # Check intersection area vs span area
            intersection = d_rect & span_rect
            inter_area = intersection.get_area()
            span_area = span_rect.get_area()
            
            if span_area > 0 and (inter_area / span_area) >= 0.5:
                # Convert fill to RGB
                if isinstance(fill, (list, tuple)):
                    if len(fill) >= 3:
                        fr, fg, fb = fill[0], fill[1], fill[2]
                    elif len(fill) == 1:
                        fr, fg, fb = fill[0], fill[0], fill[0]
                    else:
                        fr, fg, fb = 1.0, 1.0, 1.0
                elif isinstance(fill, (float, int)):
                    fr, fg, fb = float(fill), float(fill), float(fill)
                else:
                    continue

                lum = calculate_luminance(fr, fg, fb)
                matched_bg_lum = lum
                matched_hex = rgb_to_hex(fr, fg, fb)

    return matched_bg_lum, matched_hex

def inspect_pdf_document(
    file_bytes: bytes,
    filename: str,
    config: Optional[Dict[str, Any]] = None
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Deep multi-layer inspection of PDF document using PyMuPDF.
    Examines text formatting, font sizes, colors, geometry, background fills,
    metadata, embedded actions, and screening manipulation directives.
    """
    cfg = config or {}
    min_font_size = cfg.get("min_visible_font_size_pt", 3.5)
    margin_tolerance = cfg.get("off_page_margin_tolerance_pt", 2.0)
    white_lum_thresh = cfg.get("white_text_luminance_threshold", 0.91)
    bg_light_thresh = cfg.get("background_light_threshold", 0.88)

    findings: List[Dict[str, Any]] = []
    completed_steps: List[str] = []
    failed_steps: List[str] = []

    doc = None
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
    except Exception as e:
        failed_steps.append("pdf_open")
        return [
            {
                "rule_id": "RULE_MALFORMED_PDF",
                "category": "DOCUMENT_CORRUPTION",
                "severity": "HIGH",
                "confidence": "HIGH",
                "title": "Malformed or Unreadable PDF Document",
                "description": f"The document could not be decoded by the PDF engine: {str(e)}",
                "snippet": "",
                "page_number": 1,
                "bbox": [],
                "visibility_evidence": "File corrupt or encrypted",
                "detection_details": {"error": str(e)}
            }
        ], {
            "inspection_status": "failed",
            "completed_steps": completed_steps,
            "failed_steps": ["pdf_open"],
            "total_pages": 0
        }

    total_pages = len(doc)
    completed_steps.append("pdf_open")
    completed_steps.append("structure_and_metadata_inspection")

    # Layer 1 & 6: Inspect Document Metadata & Actions
    try:
        meta = doc.metadata or {}
        suspicious_meta_fields = []
        for key, val in meta.items():
            if val and isinstance(val, str):
                instrs = detect_screening_manipulation_instructions(val, is_concealed=True)
                if instrs:
                    suspicious_meta_fields.append((key, val, instrs))

        for key, val, instrs in suspicious_meta_fields:
            for inst in instrs:
                inst["rule_id"] = "RULE_METADATA_INSTRUCTION_INJECTION"
                inst["title"] = f"Suspicious Instruction in PDF Metadata ({key})"
                inst["description"] = f"Screening manipulation directive discovered in PDF document metadata '{key}'."
                inst["snippet"] = val[:200]
                inst["visibility_evidence"] = "Hidden inside document metadata stream"
                findings.append(inst)

        # Check for Javascript or Launch actions in PDF
        raw_pdf_text = file_bytes.decode("latin1", errors="ignore")
        if "/JavaScript" in raw_pdf_text or "/JS " in raw_pdf_text:
            findings.append({
                "rule_id": "RULE_PDF_EMBEDDED_JAVASCRIPT",
                "category": "ACTIVE_CONTENT",
                "severity": "HIGH",
                "confidence": "HIGH",
                "title": "Embedded JavaScript Action in PDF",
                "description": "The PDF contains interactive JavaScript action streams, which are anomalous for standard candidate resumes.",
                "snippet": "/JavaScript directive found in PDF catalog",
                "page_number": 1,
                "bbox": [],
                "visibility_evidence": "Embedded action object",
                "detection_details": {"action_type": "JavaScript"}
            })

        if "/Launch" in raw_pdf_text:
            findings.append({
                "rule_id": "RULE_PDF_LAUNCH_ACTION",
                "category": "ACTIVE_CONTENT",
                "severity": "CRITICAL",
                "confidence": "VERIFIED",
                "title": "Embedded External Launch Action in PDF",
                "description": "PDF contains a /Launch directive capable of executing external binaries.",
                "snippet": "/Launch directive in PDF stream",
                "page_number": 1,
                "bbox": [],
                "visibility_evidence": "Embedded action object",
                "detection_details": {"action_type": "Launch"}
            })

    except Exception as e:
        failed_steps.append("metadata_action_inspection")

    # Inspect each page
    completed_steps.append("page_geometry_and_text_inspection")
    completed_steps.append("contrast_and_color_inspection")

    all_page_spans = []

    for page_idx in range(total_pages):
        page = doc[page_idx]
        page_num = page_idx + 1
        page_rect = page.rect
        page_w = page_rect.width
        page_h = page_rect.height

        drawings = page.get_drawings()
        expanded_clip = fitz.Rect(-2500, -2500, page_w + 2500, page_h + 2500)
        page_dict = page.get_text("dict", clip=expanded_clip)

        page_spans_for_overlap = []

        for block in page_dict.get("blocks", []):
            if block.get("type") == 0:  # Text block
                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        text = span.get("text", "").strip()
                        if not text:
                            continue

                        font_size = span.get("size", 10.0)
                        font_name = span.get("font", "Unknown")
                        bbox = list(span.get("bbox", [0, 0, 0, 0]))
                        color_int = span.get("color", 0)
                        tr, tg, tb = int_color_to_rgb(color_int)
                        text_lum = calculate_luminance(tr, tg, tb)
                        text_hex = rgb_to_hex(tr, tg, tb)

                        bg_lum, bg_hex = find_background_color_for_bbox(bbox, drawings)

                        span_meta = {
                            "text": text,
                            "page": page_num,
                            "bbox": bbox,
                            "font_size": font_size,
                            "font_name": font_name,
                            "font_color": text_hex,
                            "background_color": bg_hex,
                            "text_lum": text_lum,
                            "bg_lum": bg_lum
                        }
                        page_spans_for_overlap.append(span_meta)

                        # --- Check A: White on White / Low Contrast ---
                        # Text is white/light and background is also white/light
                        is_white_on_white = (text_lum >= white_lum_thresh and bg_lum >= bg_light_thresh)
                        # Low contrast: difference between text and bg is minimal
                        contrast_ratio = (max(text_lum, bg_lum) + 0.05) / (min(text_lum, bg_lum) + 0.05)
                        is_low_contrast = (contrast_ratio < 1.45)

                        if is_white_on_white or (is_low_contrast and bg_lum >= 0.7):
                            # Scan for screening manipulation instructions
                            instructions = detect_screening_manipulation_instructions(
                                text,
                                is_concealed=True,
                                page_number=page_num,
                                bbox=bbox,
                                formatting_info={
                                    "font_name": font_name,
                                    "font_size": font_size,
                                    "font_color": text_hex,
                                    "background_color": bg_hex
                                }
                            )

                            if instructions:
                                for inst in instructions:
                                    inst["rule_id"] = "RULE_WHITE_ON_WHITE_PROMPT_INJECTION"
                                    inst["title"] = "Concealed Prompt Injection (White-on-White Text)"
                                    inst["severity"] = "CRITICAL"
                                    inst["confidence"] = "VERIFIED"
                                    inst["description"] = f"White or near-white text on a light background containing screening manipulation directives: '{text}'."
                                    inst["visibility_evidence"] = f"Text color {text_hex} (lum {text_lum:.2f}) on background {bg_hex} (lum {bg_lum:.2f}) [Contrast: {contrast_ratio:.2f}:1]"
                                    findings.append(inst)
                            else:
                                # White-on-white text without explicit prompt injection
                                findings.append({
                                    "rule_id": "RULE_WHITE_ON_WHITE_TEXT",
                                    "category": "CONCEALED_TEXT",
                                    "severity": "HIGH",
                                    "confidence": "HIGH",
                                    "title": "Concealed White-on-White Text",
                                    "description": "Text rendered in white or near-white font against a light background, rendering it invisible to human reviewers.",
                                    "snippet": text[:200],
                                    "page_number": page_num,
                                    "bbox": bbox,
                                    "font_name": font_name,
                                    "font_size": font_size,
                                    "font_color": text_hex,
                                    "background_color": bg_hex,
                                    "visibility_evidence": f"Text color {text_hex} on background {bg_hex} [Contrast: {contrast_ratio:.2f}:1]",
                                    "detection_details": {
                                        "text_luminance": text_lum,
                                        "background_luminance": bg_lum,
                                        "contrast_ratio": contrast_ratio
                                    }
                                })

                        # --- Check B: Extremely Small Text ---
                        if font_size < min_font_size:
                            instructions = detect_screening_manipulation_instructions(
                                text,
                                is_concealed=True,
                                page_number=page_num,
                                bbox=bbox,
                                formatting_info={
                                    "font_name": font_name,
                                    "font_size": font_size,
                                    "font_color": text_hex,
                                    "background_color": bg_hex
                                }
                            )

                            if instructions:
                                for inst in instructions:
                                    inst["rule_id"] = "RULE_TINY_FONT_PROMPT_INJECTION"
                                    inst["title"] = f"Concealed Prompt Injection (Micro-Font: {font_size:.1f}pt)"
                                    inst["severity"] = "CRITICAL"
                                    inst["confidence"] = "VERIFIED"
                                    inst["description"] = f"Micro-font ({font_size:.1f}pt) text containing screening manipulation directives."
                                    inst["visibility_evidence"] = f"Font size {font_size:.1f}pt is below human legibility threshold ({min_font_size}pt)"
                                    findings.append(inst)
                            else:
                                # Determine if this is normal small footnote or suspicious
                                is_suspicious_length = len(text) > 40
                                findings.append({
                                    "rule_id": "RULE_EXTREMELY_SMALL_TEXT",
                                    "category": "CONCEALED_TEXT",
                                    "severity": "MEDIUM" if is_suspicious_length else "LOW",
                                    "confidence": "HIGH",
                                    "title": f"Extremely Small Text ({font_size:.1f}pt)",
                                    "description": f"Text font size ({font_size:.1f}pt) is below the configured legibility threshold ({min_font_size}pt).",
                                    "snippet": text[:200],
                                    "page_number": page_num,
                                    "bbox": bbox,
                                    "font_name": font_name,
                                    "font_size": font_size,
                                    "font_color": text_hex,
                                    "background_color": bg_hex,
                                    "visibility_evidence": f"Font size {font_size:.1f}pt",
                                    "detection_details": {"font_size": font_size, "min_threshold": min_font_size}
                                })

                        # --- Check C: Off-Page and Geometry Boundary Inspection ---
                        x0, y0, x1, y1 = bbox
                        is_off_page = (
                            x0 < -margin_tolerance or
                            y0 < -margin_tolerance or
                            x0 > page_w or
                            y0 > page_h or
                            x1 > page_w + 35.0 or
                            y1 > page_h + 35.0
                        )

                        if is_off_page:
                            instructions = detect_screening_manipulation_instructions(
                                text,
                                is_concealed=True,
                                page_number=page_num,
                                bbox=bbox,
                                formatting_info={
                                    "font_name": font_name,
                                    "font_size": font_size,
                                    "font_color": text_hex,
                                    "background_color": bg_hex
                                }
                            )

                            if instructions:
                                for inst in instructions:
                                    if not inst.get("detection_details", {}).get("is_legitimate_context"):
                                        inst["rule_id"] = "RULE_OFF_PAGE_PROMPT_INJECTION"
                                        inst["title"] = "Concealed Prompt Injection (Off-Page Placement)"
                                        inst["severity"] = "CRITICAL"
                                        inst["confidence"] = "VERIFIED"
                                        inst["description"] = f"Text placed outside page boundaries [{x0:.1f}, {y0:.1f}, {x1:.1f}, {y1:.1f}] containing manipulation instructions."
                                        inst["visibility_evidence"] = f"Coordinates outside page viewport (0..{page_w:.1f}, 0..{page_h:.1f})"
                                    findings.append(inst)
                            else:
                                findings.append({
                                    "rule_id": "RULE_OFF_PAGE_TEXT",
                                    "category": "CONCEALED_TEXT",
                                    "severity": "HIGH",
                                    "confidence": "VERIFIED",
                                    "title": "Text Positioned Outside Page Viewport",
                                    "description": f"Text coordinates [{x0:.1f}, {y0:.1f}, {x1:.1f}, {y1:.1f}] lie outside the printable page boundary (width: {page_w:.1f}, height: {page_h:.1f}).",
                                    "snippet": text[:200],
                                    "page_number": page_num,
                                    "bbox": bbox,
                                    "font_name": font_name,
                                    "font_size": font_size,
                                    "font_color": text_hex,
                                    "background_color": bg_hex,
                                    "visibility_evidence": f"BBox [{x0:.1f}, {y0:.1f}, {x1:.1f}, {y1:.1f}] extends outside (0..{page_w:.1f}, 0..{page_h:.1f})",
                                    "detection_details": {
                                        "page_dimensions": [page_w, page_h],
                                        "bbox": bbox
                                    }
                                })

                        # Visible screening instructions check (normal font, normal contrast, inside page)
                        if not is_white_on_white and not is_off_page and font_size >= min_font_size:
                            vis_inst = detect_screening_manipulation_instructions(
                                text,
                                is_concealed=False,
                                page_number=page_num,
                                bbox=bbox,
                                formatting_info={
                                    "font_name": font_name,
                                    "font_size": font_size,
                                    "font_color": text_hex,
                                    "background_color": bg_hex
                                }
                            )
                            findings.extend(vis_inst)

        # Check for overlapping text in page
        for i in range(len(page_spans_for_overlap)):
            for j in range(i + 1, min(i + 15, len(page_spans_for_overlap))):
                s1 = page_spans_for_overlap[i]
                s2 = page_spans_for_overlap[j]
                if s1["text"] != s2["text"]:
                    iou = bbox_iou(s1["bbox"], s2["bbox"])
                    if iou > 0.85:
                        findings.append({
                            "rule_id": "RULE_OVERLAPPING_TEXT",
                            "category": "CONCEALED_TEXT",
                            "severity": "MEDIUM",
                            "confidence": "HIGH",
                            "title": "Suspicious Overlapping Text Spans",
                            "description": "Two distinct text strings occupy identical spatial coordinates, potentially masking concealed content.",
                            "snippet": f"Span 1: '{s1['text']}' | Span 2: '{s2['text']}'",
                            "page_number": page_num,
                            "bbox": s1["bbox"],
                            "font_name": s1["font_name"],
                            "font_size": s1["font_size"],
                            "font_color": s1["font_color"],
                            "background_color": s1["background_color"],
                            "visibility_evidence": f"Spatial overlap IoU: {iou:.2f}",
                            "detection_details": {"iou": iou, "span1": s1["text"], "span2": s2["text"]}
                        })

    doc.close()

    metadata_and_stats = {
        "inspection_status": "completed",
        "completed_steps": completed_steps,
        "failed_steps": failed_steps,
        "total_pages": total_pages,
        "total_findings": len(findings)
    }

    return findings, metadata_and_stats

def render_page_with_highlight(
    file_bytes: bytes,
    page_number: int,
    bboxes_to_highlight: List[List[float]],
    dpi: int = 150
) -> Optional[bytes]:
    """
    Safely renders a PDF page into PNG image bytes with semi-transparent
    amber/red bounding box overlays highlighting suspicious regions.
    """
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        if page_number < 1 or page_number > len(doc):
            doc.close()
            return None

        page = doc[page_number - 1]

        # Draw semi-transparent bounding box overlays
        for bbox in bboxes_to_highlight:
            if len(bbox) == 4:
                rect = fitz.Rect(bbox)
                # Ensure rect has positive area
                if rect.width <= 0:
                    rect.x1 = rect.x0 + 50
                if rect.height <= 0:
                    rect.y1 = rect.y0 + 15
                page.draw_rect(
                    rect,
                    color=(0.95, 0.2, 0.2),
                    fill=(1.0, 0.3, 0.3),
                    fill_opacity=0.35,
                    width=2.0
                )

        pix = page.get_pixmap(dpi=dpi)
        png_bytes = pix.tobytes("png")
        doc.close()
        return png_bytes
    except Exception as e:
        return None
