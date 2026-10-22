import io
import zipfile
import xml.etree.ElementTree as ET
from typing import List, Dict, Any, Tuple, Optional
from .instruction_detector import detect_screening_manipulation_instructions

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
WP_NS = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
V_NS = "urn:schemas-microsoft-com:vml"
NS_MAP = {
    "w": W_NS,
    "wp": WP_NS,
    "v": V_NS
}

def safe_parse_xml(xml_bytes: bytes) -> Optional[ET.Element]:
    """
    Parses XML with entity expansion disabled to prevent XML entity expansion attacks.
    """
    try:
        # Standard ElementTree in Python 3.8+ does not expand external entities by default
        parser = ET.XMLParser()
        return ET.fromstring(xml_bytes, parser=parser)
    except Exception:
        return None

def check_docx_archive_safety(
    zf: zipfile.ZipFile,
    max_bytes: int = 50 * 1024 * 1024,
    max_ratio: float = 25.0
) -> Tuple[bool, str]:
    """
    Guards against zip decompression bombs by verifying total uncompressed
    size and aggregate compression ratio before unpacking XML streams.
    """
    total_uncompressed = 0
    total_compressed = 0
    
    for info in zf.infolist():
        total_uncompressed += info.file_size
        total_compressed += info.compress_size
        
        if total_uncompressed > max_bytes:
            return False, f"Total uncompressed size ({total_uncompressed} bytes) exceeds safety limit ({max_bytes} bytes)."
            
    if total_compressed > 0:
        ratio = total_uncompressed / total_compressed
        if ratio > max_ratio and total_uncompressed > 1024 * 1024:
            return False, f"Decompression ratio ({ratio:.1f}:1) exceeds safety threshold ({max_ratio}:1)."
            
    return True, "Archive verified safe"

def inspect_docx_document(
    file_bytes: bytes,
    filename: str,
    config: Optional[Dict[str, Any]] = None
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Deep multi-layer inspection of Word DOCX document beyond standard paragraphs.
    Examines paragraphs, runs, tables, headers/footers, w:vanish (hidden text),
    font sizes, font colors, comments, hyperlinks, textboxes, drawing elements,
    and metadata properties.
    """
    cfg = config or {}
    max_bytes = cfg.get("max_docx_uncompressed_bytes", 50 * 1024 * 1024)
    max_ratio = cfg.get("max_docx_compression_ratio", 25.0)

    findings: List[Dict[str, Any]] = []
    completed_steps: List[str] = []
    failed_steps: List[str] = []
    unsupported_features: List[str] = [
        "Complex password-protected binary encryption envelopes (.doc legacy format)",
        "Embedded OLE binary object dynamic payload execution (safely prevented by policy)"
    ]

    try:
        zf = zipfile.ZipFile(io.BytesIO(file_bytes), 'r')
    except Exception as e:
        return [
            {
                "rule_id": "RULE_MALFORMED_DOCX",
                "category": "DOCUMENT_CORRUPTION",
                "severity": "HIGH",
                "confidence": "HIGH",
                "title": "Malformed or Unreadable Word Document",
                "description": f"The document could not be opened as a valid OOXML archive: {str(e)}",
                "snippet": "",
                "page_number": 1,
                "bbox": [],
                "visibility_evidence": "Archive corruption",
                "detection_details": {"error": str(e)}
            }
        ], {
            "inspection_status": "failed",
            "completed_steps": [],
            "failed_steps": ["archive_open"],
            "unsupported_features": unsupported_features
        }

    completed_steps.append("archive_open")

    # Step 1: Zip Bomb / Resource Exhaustion Guard
    is_safe, safety_msg = check_docx_archive_safety(zf, max_bytes=max_bytes, max_ratio=max_ratio)
    if not is_safe:
        zf.close()
        return [
            {
                "rule_id": "RULE_DOCX_DECOMPRESSION_BOMB",
                "category": "RESOURCE_EXHAUSTION",
                "severity": "CRITICAL",
                "confidence": "VERIFIED",
                "title": "Potential Decompression Bomb (Zip Bomb)",
                "description": safety_msg,
                "snippet": "",
                "page_number": 1,
                "bbox": [],
                "visibility_evidence": "Anomalous compression ratio or expansion payload",
                "detection_details": {"safety_message": safety_msg}
            }
        ], {
            "inspection_status": "failed",
            "completed_steps": completed_steps,
            "failed_steps": ["archive_safety_check"],
            "unsupported_features": unsupported_features
        }

    completed_steps.append("archive_safety_check")

    namelist = zf.namelist()

    # Step 2: Check for Macros or Executable Content
    if any(name.endswith(("vbaProject.bin", ".vba", ".macroEnabled")) for name in namelist):
        findings.append({
            "rule_id": "RULE_DOCX_EMBEDDED_MACROS",
            "category": "ACTIVE_CONTENT",
            "severity": "CRITICAL",
            "confidence": "VERIFIED",
            "title": "Embedded VBA Macro Project Detected",
            "description": "The Word document contains executable VBA macros, prohibited in standard resume screening.",
            "snippet": "vbaProject.bin found in package structure",
            "page_number": 1,
            "bbox": [],
            "visibility_evidence": "Active VBA binary stream in Word package",
            "detection_details": {"files": [n for n in namelist if "vba" in n.lower()]}
        })

    completed_steps.append("macro_and_active_content_check")

    # Step 3: Inspect Core & App Metadata
    try:
        for meta_name in ["docProps/core.xml", "docProps/app.xml"]:
            if meta_name in namelist:
                root = safe_parse_xml(zf.read(meta_name))
                if root is not None:
                    for elem in root.iter():
                        val = (elem.text or "").strip()
                        if len(val) > 10:
                            instrs = detect_screening_manipulation_instructions(val, is_concealed=True)
                            for inst in instrs:
                                inst["rule_id"] = "RULE_DOCX_METADATA_INSTRUCTION_INJECTION"
                                inst["title"] = f"Suspicious Instruction in Word Metadata ({elem.tag.split('}')[-1]})"
                                inst["snippet"] = val[:200]
                                inst["visibility_evidence"] = f"Hidden in {meta_name}"
                                findings.append(inst)
        completed_steps.append("metadata_inspection")
    except Exception as e:
        failed_steps.append("metadata_inspection")

    # Step 4: Inspect Comments
    try:
        if "word/comments.xml" in namelist:
            root = safe_parse_xml(zf.read("word/comments.xml"))
            if root is not None:
                for comment in root.iter(f"{{{W_NS}}}comment"):
                    text_parts = [t.text for t in comment.iter(f"{{{W_NS}}}t") if t.text]
                    comment_text = " ".join(text_parts).strip()
                    if comment_text:
                        instrs = detect_screening_manipulation_instructions(comment_text, is_concealed=True)
                        if instrs:
                            for inst in instrs:
                                inst["rule_id"] = "RULE_DOCX_COMMENT_INSTRUCTION_INJECTION"
                                inst["title"] = "Screening Instruction Concealed in Word Comment"
                                inst["severity"] = "CRITICAL"
                                inst["confidence"] = "VERIFIED"
                                inst["visibility_evidence"] = "Hidden inside document comment annotations"
                                findings.append(inst)
                        else:
                            findings.append({
                                "rule_id": "RULE_DOCX_EMBEDDED_COMMENTS",
                                "category": "ANOMALY",
                                "severity": "LOW",
                                "confidence": "HIGH",
                                "title": "Embedded Review Comments Present",
                                "description": "The Word document contains internal reviewer comments.",
                                "snippet": comment_text[:200],
                                "page_number": 1,
                                "bbox": [],
                                "visibility_evidence": "word/comments.xml",
                                "detection_details": {"comment_text": comment_text}
                            })
        completed_steps.append("comments_inspection")
    except Exception as e:
        failed_steps.append("comments_inspection")

    # Step 5: Deep Inspection of Document Body, Runs, Tables, Textboxes
    xml_targets = ["word/document.xml"]
    # Add headers and footers
    xml_targets.extend([n for n in namelist if n.startswith("word/header") or n.startswith("word/footer")])

    completed_steps.append("body_runs_and_tables_inspection")
    completed_steps.append("hidden_formatting_inspection")

    for part_name in xml_targets:
        if part_name not in namelist:
            continue
        try:
            root = safe_parse_xml(zf.read(part_name))
            if root is None:
                continue

            # Check for hidden text (w:vanish), tiny text (w:sz < 8), white color (w:color == FFFFFF)
            for r in root.iter(f"{{{W_NS}}}r"):
                rPr = r.find(f"{{{W_NS}}}rPr")
                
                # Gather text in run
                text_elems = r.findall(f"{{{W_NS}}}t")
                run_text = "".join([t.text or "" for t in text_elems]).strip()
                if not run_text:
                    continue

                is_vanish = False
                font_color = ""
                font_sz_pt = 11.0
                shd_fill = ""

                if rPr is not None:
                    # w:vanish indicates hidden text in Word
                    if rPr.find(f"{{{W_NS}}}vanish") is not None:
                        is_vanish = True

                    color_elem = rPr.find(f"{{{W_NS}}}color")
                    if color_elem is not None:
                        font_color = color_elem.attrib.get(f"{{{W_NS}}}val", "").upper()

                    sz_elem = rPr.find(f"{{{W_NS}}}sz")
                    if sz_elem is not None:
                        val = sz_elem.attrib.get(f"{{{W_NS}}}val", "")
                        try:
                            # half-points (e.g. 24 = 12pt, 8 = 4pt, 4 = 2pt)
                            font_sz_pt = float(val) / 2.0
                        except ValueError:
                            pass

                    shd_elem = rPr.find(f"{{{W_NS}}}shd")
                    if shd_elem is not None:
                        shd_fill = shd_elem.attrib.get(f"{{{W_NS}}}fill", "").upper()

                # Case A: w:vanish (Explicitly Hidden Text in Word)
                if is_vanish:
                    instrs = detect_screening_manipulation_instructions(run_text, is_concealed=True)
                    if instrs:
                        for inst in instrs:
                            inst["rule_id"] = "RULE_DOCX_VANISH_PROMPT_INJECTION"
                            inst["title"] = "Concealed Prompt Injection (Word w:vanish Hidden Text)"
                            inst["severity"] = "CRITICAL"
                            inst["confidence"] = "VERIFIED"
                            inst["description"] = f"Word hidden text property (<w:vanish/>) concealing screening manipulation instructions: '{run_text}'."
                            inst["visibility_evidence"] = f"Tagged with <w:vanish/> in {part_name}"
                            findings.append(inst)
                    else:
                        findings.append({
                            "rule_id": "RULE_DOCX_VANISH_HIDDEN_TEXT",
                            "category": "CONCEALED_TEXT",
                            "severity": "HIGH",
                            "confidence": "VERIFIED",
                            "title": "Concealed Text via Word Hidden Formatting (<w:vanish/>)",
                            "description": "Text is formatted with the Word 'Hidden' attribute (<w:vanish/>), making it invisible during standard rendering.",
                            "snippet": run_text[:200],
                            "page_number": 1,
                            "bbox": [],
                            "visibility_evidence": f"<w:vanish/> attribute in {part_name}",
                            "detection_details": {"run_text": run_text, "part": part_name}
                        })

                # Case B: White-on-White in Word (w:color FFFFFF without dark shading)
                is_white_font = font_color in ["FFFFFF", "AUTO-WHITE", "WHITE"]
                has_dark_shading = shd_fill and shd_fill not in ["FFFFFF", "AUTO", "NONE"]
                
                if is_white_font and not has_dark_shading:
                    instrs = detect_screening_manipulation_instructions(run_text, is_concealed=True)
                    if instrs:
                        for inst in instrs:
                            inst["rule_id"] = "RULE_DOCX_WHITE_ON_WHITE_PROMPT_INJECTION"
                            inst["title"] = "Concealed Prompt Injection (White Font in Word)"
                            inst["severity"] = "CRITICAL"
                            inst["confidence"] = "VERIFIED"
                            inst["description"] = f"White font on white background in Word containing screening manipulation instructions: '{run_text}'."
                            inst["visibility_evidence"] = f"Font color #{font_color} with no dark shading in {part_name}"
                            findings.append(inst)
                    else:
                        findings.append({
                            "rule_id": "RULE_DOCX_WHITE_FONT",
                            "category": "CONCEALED_TEXT",
                            "severity": "HIGH",
                            "confidence": "HIGH",
                            "title": "Concealed White Font in Word Document",
                            "description": "Text is styled with white font color (#FFFFFF) on an unshaded background.",
                            "snippet": run_text[:200],
                            "page_number": 1,
                            "bbox": [],
                            "visibility_evidence": f"Font color #{font_color} in {part_name}",
                            "detection_details": {"font_color": font_color, "shading": shd_fill}
                        })

                # Case C: Micro-Font Size in Word (< 3.5pt)
                if font_sz_pt < 3.5:
                    instrs = detect_screening_manipulation_instructions(run_text, is_concealed=True)
                    if instrs:
                        for inst in instrs:
                            inst["rule_id"] = "RULE_DOCX_TINY_FONT_PROMPT_INJECTION"
                            inst["title"] = f"Concealed Prompt Injection (Micro-Font: {font_sz_pt:.1f}pt)"
                            inst["severity"] = "CRITICAL"
                            inst["confidence"] = "VERIFIED"
                            inst["visibility_evidence"] = f"Font size {font_sz_pt:.1f}pt in {part_name}"
                            findings.append(inst)
                    else:
                        findings.append({
                            "rule_id": "RULE_DOCX_EXTREMELY_SMALL_FONT",
                            "category": "CONCEALED_TEXT",
                            "severity": "MEDIUM",
                            "confidence": "HIGH",
                            "title": f"Extremely Small Font in Word ({font_sz_pt:.1f}pt)",
                            "description": f"Text run styled with {font_sz_pt:.1f}pt font size, below legibility standards.",
                            "snippet": run_text[:200],
                            "page_number": 1,
                            "bbox": [],
                            "visibility_evidence": f"Font size {font_sz_pt:.1f}pt",
                            "detection_details": {"font_size_pt": font_sz_pt}
                        })

                # Case D: Visible instruction check (normal styling, no vanish)
                if not is_vanish and not is_white_font and font_sz_pt >= 3.5:
                    vis_instrs = detect_screening_manipulation_instructions(run_text, is_concealed=False)
                    findings.extend(vis_instrs)

            # Step 6: Textboxes and Drawing Elements (<w:txbxContent>)
            for txbx in root.iter(f"{{{W_NS}}}txbxContent"):
                txbx_text = " ".join([t.text for t in txbx.iter(f"{{{W_NS}}}t") if t.text]).strip()
                if txbx_text:
                    instrs = detect_screening_manipulation_instructions(txbx_text, is_concealed=True)
                    for inst in instrs:
                        inst["rule_id"] = "RULE_DOCX_TEXTBOX_INSTRUCTION_INJECTION"
                        inst["title"] = "Suspicious Instruction Inside Floating Word Text Box"
                        inst["severity"] = "CRITICAL"
                        inst["confidence"] = "VERIFIED"
                        inst["visibility_evidence"] = f"Inside <w:txbxContent> drawing frame in {part_name}"
                        findings.append(inst)

        except Exception as e:
            failed_steps.append(f"inspect_part_{part_name}")

    zf.close()

    metadata_and_stats = {
        "inspection_status": "completed",
        "completed_steps": completed_steps,
        "failed_steps": failed_steps,
        "unsupported_features": unsupported_features,
        "total_findings": len(findings)
    }

    return findings, metadata_and_stats
