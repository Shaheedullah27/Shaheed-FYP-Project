#!/usr/bin/env python3
"""Reproducible evaluation harness for ResumeMatch.

The harness is deliberately offline and read-only with respect to the product:
it imports the existing analysis function, runs the labelled pairs, compares
predictions with the independent annotations, and writes JSON/Markdown reports.
It never edits the engine, the dictionary, or application data.

Run from any directory:

    backend/venv/Scripts/python.exe evaluation/evaluation_runner.py

Outputs:
    evaluation/evaluation_results.json
    evaluation/evaluation_report.md
"""

from __future__ import annotations

import argparse
import json
import re
import statistics
import sys
import textwrap
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Set, Tuple

EVAL_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = EVAL_DIR.parent
BACKEND_DIR = PROJECT_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from nlp_engine import analyze_full, load_skills_dictionary  # noqa: E402

DEFAULT_DATASET = EVAL_DIR / "evaluation_dataset.json"
DEFAULT_OUTPUT_DIR = EVAL_DIR

EXPECTED_DOMAINS = [
    "Software Development",
    "Digital Marketing",
    "Graphic Design / UI-UX",
    "Data Analysis",
    "Human Resources",
    "Finance / Accounting",
    "Business & Administration",
]

REQUIRED_PAIR_FIELDS = [
    "id",
    "domain",
    "job_title",
    "seniority",
    "match_strength",
    "resume_style",
    "resume",
    "job_description",
    "expected_requirements",
    "expected_matched",
    "expected_missing",
    "expected_alternative_groups",
    "expected_excluded",
    "resume_negated_terms",
    "ambiguous",
    "unmeasured_requirements",
    "evidence",
    "expected_count",
    "notes",
]

SEVERITY = {
    "requirement_not_detected": "medium",
    "requirement_over_detection": "low",
    "resume_evidence_missed": "medium",
    "false_match_on_missing_requirement": "high",
    "spurious_match_not_a_requirement": "medium",
    "job_negation_leak": "high",
    "resume_negation_leak": "high",
    "alternative_group_split": "medium",
    "alternative_group_missed": "medium",
    "alternative_group_status_error": "high",
    "requirement_count_mismatch": "medium",
}

ERROR_LABELS = {
    "requirement_not_detected": "Requirement not recognised",
    "requirement_over_detection": "Requirement over-detected",
    "resume_evidence_missed": "Resume evidence missed",
    "false_match_on_missing_requirement": "Missing requirement credited",
    "spurious_match_not_a_requirement": "Match without a requirement",
    "job_negation_leak": "Posting negation leaked",
    "resume_negation_leak": "Resume negation leaked",
    "alternative_group_split": "Alternative group counted twice",
    "alternative_group_missed": "Alternative group not represented",
    "alternative_group_status_error": "Alternative group status wrong",
    "requirement_count_mismatch": "Requirement count wrong",
}


# ---------------------------------------------------------------------------
# Small metric helpers
# ---------------------------------------------------------------------------


def _ratio(numerator: int, denominator: int) -> Optional[float]:
    return None if denominator == 0 else numerator / denominator


def _f1(precision: Optional[float], recall: Optional[float]) -> Optional[float]:
    if precision is None or recall is None:
        return None
    if precision + recall == 0:
        return 0.0
    return 2 * precision * recall / (precision + recall)


def _metric(tp: int, fp: int, fn: int, tn: Optional[int] = None) -> Dict[str, Any]:
    precision = _ratio(tp, tp + fp)
    recall = _ratio(tp, tp + fn)
    result: Dict[str, Any] = {
        "tp": tp,
        "fp": fp,
        "fn": fn,
        "precision": _round(precision),
        "recall": _round(recall),
        "f1": _round(_f1(precision, recall)),
    }
    if tn is not None:
        result["tn"] = tn
        result["specificity"] = _round(_ratio(tn, tn + fp))
    return result


def _round(value: Optional[float], digits: int = 4) -> Optional[float]:
    return None if value is None else round(float(value), digits)


def _sum_metric(metrics: Sequence[Dict[str, Any]], with_tn: bool = False) -> Dict[str, Any]:
    tp = sum(item["tp"] for item in metrics)
    fp = sum(item["fp"] for item in metrics)
    fn = sum(item["fn"] for item in metrics)
    if with_tn:
        return _metric(tp, fp, fn, sum(item.get("tn", 0) for item in metrics))
    return _metric(tp, fp, fn)


def _macro_average(
    metrics: Sequence[Dict[str, Any]],
    key: str,
) -> Optional[float]:
    values = [item[key] for item in metrics if item.get(key) is not None]
    return _round(statistics.mean(values)) if values else None


def _pct(value: Optional[float]) -> str:
    return "n/a" if value is None else f"{value * 100:.1f}%"


def _num(value: Optional[float]) -> str:
    return "n/a" if value is None else f"{value:.2f}"


# ---------------------------------------------------------------------------
# Dataset loading and validation
# ---------------------------------------------------------------------------


def load_dataset(manifest_path: Path) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    pairs: List[Dict[str, Any]] = []
    base = manifest_path.parent

    for domain in manifest["domains"]:
        path = base / domain["file"]
        data = json.loads(path.read_text(encoding="utf-8"))
        if data.get("domain") != domain["name"]:
            raise ValueError(
                f"{path.name}: domain {data.get('domain')!r} does not match manifest "
                f"{domain['name']!r}"
            )
        if len(data.get("pairs", [])) != domain["pairs"]:
            raise ValueError(
                f"{path.name}: expected {domain['pairs']} pairs, found "
                f"{len(data.get('pairs', []))}"
            )
        pairs.extend(data["pairs"])

    return manifest, pairs


def dictionary_names() -> Set[str]:
    names: Set[str] = set()
    for category, entries in load_skills_dictionary().items():
        if category.startswith("_") or not isinstance(entries, list):
            continue
        for entry in entries:
            if isinstance(entry, dict):
                name = str(entry.get("name", "")).strip()
                if name:
                    names.add(name)
    return names


def validate_dataset(
    manifest: Dict[str, Any],
    pairs: Sequence[Dict[str, Any]],
    known_names: Set[str],
) -> List[str]:
    """Mechanical label-integrity checks. Not a substitute for human review."""
    errors: List[str] = []
    ids: List[str] = []
    seen_names = set(known_names)

    if manifest.get("totals", {}).get("pairs") != 70:
        errors.append("manifest totals.pairs must be 70")
    if manifest.get("totals", {}).get("domains") != 7:
        errors.append("manifest totals.domains must be 7")
    if len(manifest.get("domains", [])) != 7:
        errors.append("manifest must list seven domains")
    manifest_domains = [item["name"] for item in manifest.get("domains", [])]
    if manifest_domains != EXPECTED_DOMAINS:
        errors.append(f"manifest domain names/order differ: {manifest_domains}")
    if len(pairs) != 70:
        errors.append(f"dataset must contain 70 pairs, found {len(pairs)}")

    for pair in pairs:
        label = pair.get("id") or "<missing id>"
        for field in REQUIRED_PAIR_FIELDS:
            if field not in pair:
                errors.append(f"{label}: missing field {field}")
        if pair.get("id") in ids:
            errors.append(f"{label}: duplicate pair id")
        ids.append(pair.get("id"))
        if pair.get("domain") not in EXPECTED_DOMAINS:
            errors.append(f"{label}: unknown domain {pair.get('domain')!r}")
        if pair.get("match_strength") not in {"strong", "moderate", "weak"}:
            errors.append(f"{label}: invalid match_strength")

        requirements = list(pair.get("expected_requirements", []))
        group_labels = {group["label"] for group in pair.get("expected_alternative_groups", [])}
        matched = set(pair.get("expected_matched", []))
        missing = set(pair.get("expected_missing", []))
        if matched & missing:
            errors.append(f"{label}: matched and missing overlap: {sorted(matched & missing)}")
        if matched | missing != set(requirements):
            errors.append(
                f"{label}: matched+missing must equal expected_requirements "
                f"(extra={sorted((matched | missing) - set(requirements))}, "
                f"unlabelled={sorted(set(requirements) - (matched | missing))})"
            )
        if pair.get("expected_count") != len(requirements):
            errors.append(
                f"{label}: expected_count {pair.get('expected_count')} != "
                f"{len(requirements)} logical requirements"
            )
        if len(requirements) != len(set(requirements)):
            errors.append(f"{label}: duplicate expected_requirements")

        for requirement in requirements:
            if requirement not in seen_names and requirement not in group_labels:
                errors.append(f"{label}: unknown dictionary name {requirement!r}")
        for term, quote in pair.get("evidence", {}).items():
            if term not in matched:
                errors.append(f"{label}: evidence for non-matched term {term!r}")
            if not isinstance(quote, str) or not quote.strip():
                errors.append(f"{label}: empty evidence for {term!r}")
        for term in matched:
            if term not in pair.get("evidence", {}):
                errors.append(f"{label}: matched term {term!r} has no evidence quote")

        ambiguous = [item["term"] for item in pair.get("ambiguous", [])]
        if len(ambiguous) != len(set(ambiguous)):
            errors.append(f"{label}: duplicate ambiguous terms")
        for term in ambiguous:
            if term not in seen_names:
                errors.append(f"{label}: ambiguous term {term!r} is outside the dictionary")
            if term in requirements or term in matched or term in missing:
                errors.append(f"{label}: ambiguous term {term!r} also appears in labels")

        excluded = [item["term"] for item in pair.get("expected_excluded", [])]
        for term in excluded:
            if term not in seen_names:
                errors.append(f"{label}: excluded term {term!r} is outside the dictionary")
            if term in requirements:
                errors.append(f"{label}: excluded term {term!r} is also a requirement")

        for item in pair.get("expected_excluded", []):
            if item.get("source") != "job_description":
                errors.append(f"{label}: expected_excluded source must be job_description")

        negated = [item["term"] for item in pair.get("resume_negated_terms", [])]
        for term in negated:
            if term not in seen_names:
                errors.append(f"{label}: resume-negated term {term!r} is outside the dictionary")
            if term not in requirements:
                errors.append(f"{label}: resume-negated term {term!r} is not a requirement")
            if term not in missing:
                errors.append(f"{label}: resume-negated term {term!r} must be missing")

        found_group_labels: Set[str] = set()
        for group in pair.get("expected_alternative_groups", []):
            label_text = group.get("label", "")
            members = list(group.get("members", []))
            if label_text != " or ".join(members):
                errors.append(f"{label}: group label {label_text!r} != members {members}")
            if len(members) < 2:
                errors.append(f"{label}: group {label_text!r} needs two members")
            if len(members) != len(set(members)):
                errors.append(f"{label}: duplicate members in {label_text!r}")
            for member in members:
                if member not in seen_names:
                    errors.append(f"{label}: group member {member!r} outside dictionary")
                if member in requirements:
                    errors.append(f"{label}: group member {member!r} also listed separately")
                if member in ambiguous:
                    errors.append(f"{label}: group member {member!r} is ambiguous")
            if label_text in found_group_labels:
                errors.append(f"{label}: duplicate group {label_text!r}")
            found_group_labels.add(label_text)
            if label_text not in requirements:
                errors.append(f"{label}: group {label_text!r} absent from requirements")
            in_matched = label_text in matched
            if in_matched != bool(group.get("satisfied")):
                errors.append(f"{label}: group {label_text!r} satisfied flag disagrees with labels")
        if len(found_group_labels) != len(pair.get("expected_alternative_groups", [])):
            errors.append(f"{label}: duplicate alternative groups")

        for term in pair.get("unmeasured_requirements", []):
            if term in requirements:
                errors.append(f"{label}: unmeasured term {term!r} also counted as a requirement")

    for domain in EXPECTED_DOMAINS:
        count = sum(1 for pair in pairs if pair.get("domain") == domain)
        if count != 10:
            errors.append(f"{domain}: expected 10 pairs, found {count}")

    return errors


# ---------------------------------------------------------------------------
# Per-pair comparison
# ---------------------------------------------------------------------------


def _prediction_sets(
    pair: Dict[str, Any],
    result: Dict[str, Any],
) -> Dict[str, Any]:
    raw_matched = [item["keyword"] for item in result["matched_keywords"]]
    raw_missing = [item["keyword"] for item in result["missing_keywords"]]
    raw_requirements = raw_matched + raw_missing
    ambiguous = {item["term"] for item in pair.get("ambiguous", [])}

    member_to_group: Dict[str, str] = {}
    for group in pair.get("expected_alternative_groups", []):
        for member in group["members"]:
            member_to_group[member] = group["label"]

    def canonical(names: Sequence[str]) -> Set[str]:
        return {
            member_to_group.get(name, name)
            for name in names
            if name not in ambiguous
        }

    return {
        "raw_matched": raw_matched,
        "raw_missing": raw_missing,
        "raw_requirements": raw_requirements,
        "ambiguous": ambiguous,
        "member_to_group": member_to_group,
        "matched": canonical(raw_matched),
        "missing": canonical(raw_missing),
        "requirements": canonical(raw_requirements),
        "ambiguous_predicted": sorted(name for name in raw_requirements if name in ambiguous),
    }


def evaluate_pair(
    pair: Dict[str, Any],
    result: Dict[str, Any],
) -> Dict[str, Any]:
    predicted = _prediction_sets(pair, result)
    ambiguous = predicted["ambiguous"]
    expected_requirements = {
        name for name in pair["expected_requirements"] if name not in ambiguous
    }
    expected_matched = {
        name for name in pair["expected_matched"] if name not in ambiguous
    }
    expected_missing = {
        name for name in pair["expected_missing"] if name not in ambiguous
    }

    pred_req = predicted["requirements"]
    pred_matched = predicted["matched"]
    pred_missing = predicted["missing"]

    # Layer 1: is the right set of job requirements recognised?
    detection = _metric(
        len(pred_req & expected_requirements),
        len(pred_req - expected_requirements),
        len(expected_requirements - pred_req),
    )
    detection["fp_terms"] = sorted(pred_req - expected_requirements)
    detection["fn_terms"] = sorted(expected_requirements - pred_req)

    # Layer 2: matched-skill identification over the annotated universe.
    match_tp = len(expected_matched & pred_matched)
    match_fp = len(pred_matched - expected_matched)
    match_fn = len(expected_matched - pred_matched)
    match_tn = len((expected_missing) - pred_matched)
    matched_metrics = _metric(match_tp, match_fp, match_fn, match_tn)
    matched_metrics["fp_terms"] = sorted(pred_matched - expected_matched)
    matched_metrics["fn_terms"] = sorted(expected_matched - pred_matched)

    # Layer 3: missing-skill identification.
    missing_tp = len(expected_missing & pred_missing)
    missing_fp = len(pred_missing - expected_missing)
    missing_fn = len(expected_missing - pred_missing)
    missing_tn = len(expected_matched - pred_missing)
    missing_metrics = _metric(missing_tp, missing_fp, missing_fn, missing_tn)
    missing_metrics["fp_terms"] = sorted(pred_missing - expected_missing)
    missing_metrics["fn_terms"] = sorted(expected_missing - pred_missing)

    # Layer 4: logical requirement counts (ambiguous predictions removed).
    predicted_count = result["job_keyword_count"] - len(predicted["ambiguous_predicted"])
    expected_count = pair["expected_count"]
    count_record = {
        "expected": expected_count,
        "predicted_raw": result["job_keyword_count"],
        "predicted_adjusted": predicted_count,
        "exact": predicted_count == expected_count,
        "error": predicted_count - expected_count,
        "ambiguous_excluded": predicted["ambiguous_predicted"],
    }

    coverage_expected = (
        _round(len(expected_matched) / len(expected_requirements) * 100.0, 1)
        if expected_requirements
        else 0.0
    )
    coverage_record = {
        "predicted": result["keyword_coverage"],
        "expected": coverage_expected,
        "error": (
            _round(result["keyword_coverage"] - coverage_expected, 1)
            if not ambiguous
            else None
        ),
    }

    # Layer 5: alternative groups, evaluated as one unit each.
    group_records: List[Dict[str, Any]] = []
    raw_req = set(predicted["raw_requirements"])
    raw_matched = set(predicted["raw_matched"])
    for group in pair.get("expected_alternative_groups", []):
        label_text = group["label"]
        members = group["members"]
        label_present = label_text in raw_req
        members_present = [member for member in members if member in raw_req]
        if label_present:
            contribution = 1
            representation = "group_label"
            predicted_satisfied = label_text in raw_matched
        elif len(members_present) == 1:
            contribution = 1
            representation = "single_member"
            predicted_satisfied = members_present[0] in raw_matched
        elif len(members_present) > 1:
            contribution = len(members_present)
            representation = "split_members"
            predicted_satisfied = any(member in raw_matched for member in members_present)
        else:
            contribution = 0
            representation = "absent"
            predicted_satisfied = None
        counted_once = contribution == 1
        status_correct = predicted_satisfied == bool(group["satisfied"])
        group_records.append({
            "label": label_text,
            "members": members,
            "expected_satisfied": bool(group["satisfied"]),
            "predicted_satisfied": predicted_satisfied,
            "representation": representation,
            "contribution": contribution,
            "counted_once": counted_once,
            "status_correct": status_correct,
            "correct": counted_once and status_correct,
        })

    # Layer 6: negation/exclusion handling.
    exclusion_records: List[Dict[str, Any]] = []
    for item in pair.get("expected_excluded", []):
        term = item["term"]
        in_requirements = term in raw_req
        in_matched = term in raw_matched
        exclusion_records.append({
            "term": term,
            "source": "job_description",
            "correct": not in_requirements,
            "predicted_in_requirements": in_requirements,
            "predicted_matched": in_matched,
            "reason": item["reason"],
        })
    for item in pair.get("resume_negated_terms", []):
        term = item["term"]
        in_matched = term in raw_matched
        exclusion_records.append({
            "term": term,
            "source": "resume",
            "correct": not in_matched,
            "predicted_in_requirements": term in raw_req,
            "predicted_matched": in_matched,
            "reason": item["reason"],
        })

    errors: List[Dict[str, Any]] = []

    def add_error(category: str, term: str, detail: str) -> None:
        errors.append({
            "pair_id": pair["id"],
            "domain": pair["domain"],
            "category": category,
            "term": term,
            "severity": SEVERITY.get(category, "medium"),
            "detail": detail,
        })

    excluded_terms = {item["term"] for item in pair.get("expected_excluded", [])}
    for term in detection["fp_terms"]:
        if term in predicted["member_to_group"]:
            continue
        if term in excluded_terms:
            add_error(
                "job_negation_leak",
                term,
                "The posting excludes this term, but it was counted as a requirement.",
            )
        else:
            add_error(
                "requirement_over_detection",
                term,
                "The engine counted this dictionary term as a requirement; the annotation did not.",
            )
    for term in detection["fn_terms"]:
        if term in {group["label"] for group in pair.get("expected_alternative_groups", [])}:
            add_error(
                "alternative_group_missed",
                term,
                "The expected alternative group was not represented as one requirement.",
            )
        else:
            add_error(
                "requirement_not_detected",
                term,
                "The annotated requirement was not recognised in the posting.",
            )
    for term in matched_metrics["fp_terms"]:
        if term in excluded_terms:
            add_error("job_negation_leak", term, "An excluded term was also credited in the resume.")
        elif term in expected_requirements:
            add_error(
                "false_match_on_missing_requirement",
                term,
                "The annotation treats this requirement as missing, but the engine credited it.",
            )
        else:
            add_error(
                "spurious_match_not_a_requirement",
                term,
                "The engine credited a matched skill that the annotation does not treat as a requirement.",
            )
    for term in matched_metrics["fn_terms"]:
        if term not in pred_req:
            add_error(
                "resume_evidence_missed",
                term,
                "The annotated requirement is matched in the resume, but the engine did not detect the requirement at all.",
            )
        else:
            add_error(
                "resume_evidence_missed",
                term,
                "The resume evidences this requirement, but the engine did not match it.",
            )
    if not count_record["exact"]:
        add_error(
            "requirement_count_mismatch",
            "",
            f"Expected {expected_count} logical requirements, engine counted {predicted_count}.",
        )
    for group in group_records:
        if group["representation"] == "split_members":
            add_error(
                "alternative_group_split",
                group["label"],
                "The engine counted both alternatives as separate requirements.",
            )
        elif group["representation"] == "absent":
            add_error(
                "alternative_group_missed",
                group["label"],
                "The expected alternative group was absent from the engine's requirement set.",
            )
        elif not group["status_correct"]:
            add_error(
                "alternative_group_status_error",
                group["label"],
                "The group was counted once, but its satisfied/missing status is wrong.",
            )
    for record in exclusion_records:
        if record["correct"]:
            continue
        add_error(
            "job_negation_leak" if record["source"] == "job_description" else "resume_negation_leak",
            record["term"],
            record["reason"],
        )

    return {
        "pair_id": pair["id"],
        "domain": pair["domain"],
        "job_title": pair["job_title"],
        "seniority": pair["seniority"],
        "match_strength": pair["match_strength"],
        "resume_style": pair["resume_style"],
        "resume_words": len(pair["resume"].split()),
        "job_description_words": len(pair["job_description"].split()),
        "expected": {
            "requirements": sorted(expected_requirements),
            "matched": sorted(expected_matched),
            "missing": sorted(expected_missing),
            "count": expected_count,
            "unmeasured_requirements": list(pair.get("unmeasured_requirements", [])),
            "ambiguous": sorted(ambiguous),
        },
        "predicted": {
            "requirements": sorted(pred_req),
            "matched": sorted(pred_matched),
            "missing": sorted(pred_missing),
            "raw_matched": sorted(predicted["raw_matched"]),
            "raw_missing": sorted(predicted["raw_missing"]),
            "job_keyword_count": result["job_keyword_count"],
            "matched_keyword_count": result["matched_keyword_count"],
            "keyword_coverage": result["keyword_coverage"],
            "match_percentage": result["match_percentage"],
        },
        "detection": detection,
        "matched_identification": matched_metrics,
        "missing_identification": missing_metrics,
        "count": count_record,
        "coverage": coverage_record,
        "alternative_groups": group_records,
        "negation": exclusion_records,
        "errors": errors,
    }


# ---------------------------------------------------------------------------
# Aggregation
# ---------------------------------------------------------------------------


def _aggregate(records: Sequence[Dict[str, Any]]) -> Dict[str, Any]:
    detection = _sum_metric([record["detection"] for record in records])
    detection["macro_precision"] = _macro_average([record["detection"] for record in records], "precision")
    detection["macro_recall"] = _macro_average([record["detection"] for record in records], "recall")
    detection["macro_f1"] = _macro_average([record["detection"] for record in records], "f1")

    matched = _sum_metric(
        [record["matched_identification"] for record in records], with_tn=True
    )
    unmeasured = sum(len(record["expected"]["unmeasured_requirements"]) for record in records)
    detection_ceiling = _metric(
        detection["tp"], detection["fp"], detection["fn"] + unmeasured
    )
    matched_ceiling = _metric(
        matched["tp"], matched["fp"], matched["fn"] + unmeasured, matched["tn"]
    )
    matched["macro_precision"] = _macro_average(
        [record["matched_identification"] for record in records], "precision"
    )
    matched["macro_recall"] = _macro_average(
        [record["matched_identification"] for record in records], "recall"
    )
    matched["macro_f1"] = _macro_average(
        [record["matched_identification"] for record in records], "f1"
    )

    missing = _sum_metric(
        [record["missing_identification"] for record in records], with_tn=True
    )
    missing["macro_precision"] = _macro_average(
        [record["missing_identification"] for record in records], "precision"
    )
    missing["macro_recall"] = _macro_average(
        [record["missing_identification"] for record in records], "recall"
    )
    missing["macro_f1"] = _macro_average(
        [record["missing_identification"] for record in records], "f1"
    )

    exact_counts = sum(1 for record in records if record["count"]["exact"])
    coverage_errors = [
        abs(record["coverage"]["error"])
        for record in records
        if record["coverage"]["error"] is not None
    ]
    groups = [group for record in records for group in record["alternative_groups"]]
    negations = [item for record in records for item in record["negation"]]
    errors = [error for record in records for error in record["errors"]]

    return {
        "pairs": len(records),
        "detection": detection,
        "matched_identification": matched,
        "missing_identification": missing,
        "dictionary_ceiling": {
            "unmeasured_requirements": unmeasured,
            "detection_including_unmeasured": detection_ceiling,
            "matched_including_unmeasured": matched_ceiling,
        },
        "requirement_count": {
            "pairs_evaluated": len(records),
            "exact_matches": exact_counts,
            "accuracy": _round(exact_counts / len(records)) if records else None,
            "mean_absolute_error": _round(
                statistics.mean(abs(record["count"]["error"]) for record in records)
            ) if records else None,
        },
        "coverage": {
            "pairs_compared": len(coverage_errors),
            "mean_absolute_error_percentage_points": _round(
                statistics.mean(coverage_errors), 2
            ) if coverage_errors else None,
        },
        "alternative_groups": {
            "total": len(groups),
            "correct": sum(1 for group in groups if group["correct"]),
            "accuracy": _round(
                sum(1 for group in groups if group["correct"]) / len(groups)
            ) if groups else None,
            "counted_once": sum(1 for group in groups if group["counted_once"]),
            "status_correct": sum(1 for group in groups if group["status_correct"]),
        },
        "negation": {
            "total": len(negations),
            "correct": sum(1 for item in negations if item["correct"]),
            "accuracy": _round(
                sum(1 for item in negations if item["correct"]) / len(negations)
            ) if negations else None,
            "job_description_total": sum(1 for item in negations if item["source"] == "job_description"),
            "resume_total": sum(1 for item in negations if item["source"] == "resume"),
        },
        "error_count": len(errors),
        "errors_by_category": _errors_by_category(errors),
    }


def _errors_by_category(errors: Sequence[Dict[str, Any]]) -> List[Dict[str, Any]]:
    counts: Dict[str, int] = {}
    for error in errors:
        counts[error["category"]] = counts.get(error["category"], 0) + 1
    rows = []
    for category, count in sorted(counts.items(), key=lambda item: (-item[1], item[0])):
        rows.append({
            "category": category,
            "label": ERROR_LABELS.get(category, category),
            "count": count,
            "severity": SEVERITY.get(category, "medium"),
        })
    return rows


def _similarity_summary(records: Sequence[Dict[str, Any]]) -> Dict[str, Any]:
    summary: Dict[str, Any] = {}
    for strength in ("strong", "moderate", "weak"):
        values = [
            record["predicted"]["match_percentage"]
            for record in records
            if record["match_strength"] == strength
        ]
        if not values:
            summary[strength] = {"pairs": 0}
            continue
        summary[strength] = {
            "pairs": len(values),
            "mean": _round(statistics.mean(values), 2),
            "median": _round(statistics.median(values), 2),
            "min": _round(min(values), 2),
            "max": _round(max(values), 2),
        }
    return summary


def _length_buckets(records: Sequence[Dict[str, Any]]) -> Dict[str, Any]:
    def bucket(value: int, small: int, large: int) -> str:
        if value <= small:
            return "short"
        if value <= large:
            return "medium"
        return "long"

    definition = {
        "resume_words": {"short": "<=80", "medium": "81-140", "long": ">140"},
        "job_description_words": {"short": "<=60", "medium": "61-100", "long": ">100"},
    }
    result = {"definition": definition, "resume": {}, "job_description": {}}
    for field, key in (("resume_words", "resume"), ("job_description_words", "job_description")):
        groups: Dict[str, List[Dict[str, Any]]] = {"short": [], "medium": [], "long": []}
        for record in records:
            if field == "resume_words":
                name = bucket(record[field], 80, 140)
            else:
                name = bucket(record[field], 60, 100)
            groups[name].append(record)
        for name, subset in groups.items():
            if not subset:
                result[key][name] = {"pairs": 0}
                continue
            aggregate = _aggregate(subset)
            result[key][name] = {
                "pairs": len(subset),
                "detection_f1": aggregate["detection"]["f1"],
                "matched_precision": aggregate["matched_identification"]["precision"],
                "matched_recall": aggregate["matched_identification"]["recall"],
                "matched_f1": aggregate["matched_identification"]["f1"],
                "count_accuracy": aggregate["requirement_count"]["accuracy"],
            }
    return result


# ---------------------------------------------------------------------------
# Consistency and robustness checks
# ---------------------------------------------------------------------------


_ANALYSIS_TIMINGS: List[float] = []


def _analyse(resume: str, job_description: str) -> Dict[str, Any]:
    start = time.perf_counter()
    result = analyze_full(resume, job_description, "Evaluation resume", "Evaluation role")
    _ANALYSIS_TIMINGS.append((time.perf_counter() - start) * 1000.0)
    return result


def _signature(result: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "requirements": sorted(
            item["keyword"] for item in result["matched_keywords"] + result["missing_keywords"]
        ),
        "matched": sorted(item["keyword"] for item in result["matched_keywords"]),
        "count": result["job_keyword_count"],
    }


def _split_sentences(text: str) -> List[str]:
    return [part.strip() for part in re.split(r"(?<=[.!?])\s+", text) if part.strip()]


def _build_pdf(text: str) -> bytes:
    try:
        import pymupdf as fitz
    except ImportError:  # pragma: no cover - compatibility path
        import fitz
    document = fitz.open()
    page = document.new_page()
    y = 72
    for paragraph in text.split("\n"):
        for line in textwrap.wrap(paragraph, width=86) or [""]:
            if y > 760:
                page = document.new_page()
                y = 72
            page.insert_text((72, y), line)
            y += 16
    payload = document.tobytes()
    document.close()
    return payload


def _build_docx(text: str) -> bytes:
    from docx import Document

    document = Document()
    for paragraph in text.split("\n"):
        document.add_paragraph(paragraph)
    import io

    buffer = io.BytesIO()
    document.save(buffer)
    return buffer.getvalue()


def consistency_checks(pairs: Sequence[Dict[str, Any]]) -> Dict[str, Any]:
    """Invariants that harmless formatting/order changes must not break.

    Requirement sets and counts are expected to be invariant. TF-IDF similarity
    is a bag-of-words measure and normally is invariant to order/case too, but a
    duplicated mention legitimately changes term frequency, so its delta is
    recorded rather than asserted.
    """
    from parser import parse_uploaded_file

    by_id = {pair["id"]: pair for pair in pairs}
    base_pair = by_id["SD-01"]
    resume = base_pair["resume"]
    job = base_pair["job_description"]
    baseline = _analyse(resume, job)
    baseline_signature = _signature(baseline)

    def compare(label: str, variant_resume: str, variant_job: str, expect_similarity: Optional[bool]) -> Dict[str, Any]:
        result = _analyse(variant_resume, variant_job)
        signature = _signature(result)
        similarity_delta = round(result["match_percentage"] - baseline["match_percentage"], 2)
        detail = {
            "requirements_equal": signature["requirements"] == baseline_signature["requirements"],
            "matched_equal": signature["matched"] == baseline_signature["matched"],
            "count_equal": signature["count"] == baseline_signature["count"],
            "similarity_delta": similarity_delta,
        }
        passed = (
            detail["requirements_equal"]
            and detail["matched_equal"]
            and detail["count_equal"]
        )
        if expect_similarity is True:
            passed = passed and similarity_delta == 0.0
        return {"check": label, "passed": passed, **detail}

    checks = [
        compare(
            "job_description_reordered",
            resume,
            " ".join(reversed(_split_sentences(job))),
            True,
        ),
        compare(
            "job_description_bulleted",
            resume,
            "\n".join(f"- {sentence}" for sentence in _split_sentences(job)),
            None,
        ),
        compare(
            "job_description_duplicate_mentions",
            resume,
            job + " Python. Python. Python. Python.",
            None,
        ),
        compare(
            "resume_paragraphs_reordered",
            "\n".join(reversed(resume.split("\n"))),
            job,
            True,
        ),
        compare(
            "case_changed",
            resume.upper(),
            job.upper(),
            True,
        ),
        compare(
            "resume_duplicate_mentions",
            resume + "\nPython. Python. Python.",
            job,
            None,
        ),
        compare(
            "resume_bullets_to_prose",
            " ".join(resume.split("\n")),
            job,
            True,
        ),
    ]

    # PDF and DOCX extraction round-trips for three different domains.
    roundtrip_pairs = [by_id["SD-01"], by_id["DM-05"], by_id["FA-01"]]
    pdf_docx: List[Dict[str, Any]] = []
    for pair in roundtrip_pairs:
        direct = _analyse(pair["resume"], pair["job_description"])
        direct_signature = _signature(direct)
        for kind, builder, filename in (
            ("pdf", _build_pdf, "resume.pdf"),
            ("docx", _build_docx, "resume.docx"),
        ):
            record: Dict[str, Any] = {"pair_id": pair["id"], "format": kind}
            try:
                extracted = parse_uploaded_file(builder(pair["resume"]), filename)
                result = _analyse(extracted, pair["job_description"])
                signature = _signature(result)
                record.update({
                    "status": "pass" if signature == direct_signature else "fail",
                    "extracted_words": len(extracted.split()),
                    "requirements_equal": signature["requirements"] == direct_signature["requirements"],
                    "matched_equal": signature["matched"] == direct_signature["matched"],
                    "count_equal": signature["count"] == direct_signature["count"],
                })
            except Exception as exc:  # verified and reported, never hidden
                record.update({"status": "error", "error": f"{type(exc).__name__}: {exc}"})
            pdf_docx.append(record)

    # Malformed input and the unchanged API response contract.
    api_checks: List[Dict[str, Any]] = []
    try:
        from app import app

        app.config.update(TESTING=True)
        client = app.test_client()
        short = "Python developer."
        valid_job = base_pair["job_description"]
        cases = [
            ("empty_json", {}, 400),
            ("missing_job_description", {"resume_text": base_pair["resume"]}, 400),
            ("short_resume", {"resume_text": short, "job_description": valid_job}, 400),
            ("short_job_description", {"resume_text": base_pair["resume"], "job_description": short}, 400),
        ]
        for name, payload, expected_status in cases:
            response = client.post("/api/analyze", json=payload)
            body = response.get_json()
            api_checks.append({
                "check": name,
                "expected_status": expected_status,
                "actual_status": response.status_code,
                "error_shape": isinstance(body, dict) and set(body) == {"error"},
                "passed": response.status_code == expected_status
                and isinstance(body, dict)
                and set(body) == {"error"},
            })

        valid = client.post(
            "/api/analyze",
            json={"resume_text": base_pair["resume"], "job_description": valid_job},
        )
        expected_keys = {
            "id", "timestamp", "resume_title", "job_title", "match_percentage",
            "keyword_coverage", "job_keyword_count", "matched_keyword_count",
            "matched_keywords", "missing_keywords", "resume_keywords",
            "resume_word_count", "job_description_word_count", "suggestions",
            "disclaimer",
        }
        payload = valid.get_json()
        api_checks.append({
            "check": "valid_analyze_contract",
            "expected_status": 200,
            "actual_status": valid.status_code,
            "error_shape": False,
            "passed": valid.status_code == 200
            and isinstance(payload, dict)
            and set(payload) == expected_keys,
        })
    except Exception as exc:  # verified and reported, never hidden
        api_checks.append({
            "check": "api_checks",
            "passed": False,
            "error": f"{type(exc).__name__}: {exc}",
        })

    return {
        "checks": checks,
        "pdf_docx": pdf_docx,
        "api": api_checks,
        "length_buckets": None,  # filled by caller from all records
    }


# ---------------------------------------------------------------------------
# Report writer
# ---------------------------------------------------------------------------


def _error_examples(records: Sequence[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    examples: Dict[str, List[Dict[str, Any]]] = {}
    for record in records:
        for error in record["errors"]:
            examples.setdefault(error["category"], []).append(error)
    return examples


def build_report(
    manifest: Dict[str, Any],
    pairs: Sequence[Dict[str, Any]],
    records: Sequence[Dict[str, Any]],
    summary: Dict[str, Any],
    domains: Sequence[Dict[str, Any]],
    similarity: Dict[str, Any],
    errors: Dict[str, Any],
    consistency: Dict[str, Any],
    runtime: Dict[str, Any],
    known_names: Set[str],
) -> str:
    synthetic = manifest.get("synthetic", False)
    lines: List[str] = []
    lines.append("# ResumeMatch Evaluation Report")
    lines.append("")
    lines.append("Generated by `evaluation/evaluation_runner.py`. This file is regenerated")
    lines.append("from `evaluation/evaluation_dataset.json` and the domain files; numbers are")
    lines.append("computed, not hand-entered.")
    lines.append("")
    lines.append("## Status and disclosure")
    lines.append("")
    lines.append(
        f"- Dataset: **{len(pairs)} synthetic pairs**, {len(domains)} domains, "
        f"10 pairs per domain."
    )
    lines.append(
        "- The resumes and postings are **synthetic examples written for this"
        " evaluation**. They are not scraped vacancies, real applicants, or hiring"
        " outcomes."
    )
    lines.append(
        "- Annotation: **single AI annotator (the coding assistant), drafting from"
        " the documents under the project author's direction**. Labels were written"
        " before the harness was run. No independent human annotator or second"
        " reviewer was available, so no inter-annotator agreement is reported and"
        " the labels should be treated as AI-drafted until a human audit is done."
    )
    lines.append(
        "- Revision note: after the first harness run, some documents were lengthened"
        " and a few out-of-dictionary requirements were added so that length buckets"
        " and the dictionary ceiling were covered. No expected matched/missing label"
        " was changed."
    )
    lines.append(
        f"- Keyword metrics are bounded by the {len(known_names)}-entry dictionary. Human-identified"
        " requirements outside it are listed separately and excluded from keyword"
        " metrics rather than silently counted as successes or failures."
    )
    lines.append(
        "- TF-IDF similarity is reported descriptively. It is **not** an accuracy"
        " percentage and is not converted into one."
    )
    lines.append("")
    lines.append("## Dataset and annotation")
    lines.append("")
    lines.append("| Domain | Pairs | Strong | Moderate | Weak |")
    lines.append("| :-- | --: | --: | --: | --: |")
    for domain in domains:
        subset = [record for record in records if record["domain"] == domain["name"]]
        lines.append(
            f"| {domain['name']} | {len(subset)} | "
            f"{sum(1 for r in subset if r['match_strength'] == 'strong')} | "
            f"{sum(1 for r in subset if r['match_strength'] == 'moderate')} | "
            f"{sum(1 for r in subset if r['match_strength'] == 'weak')} |"
        )
    lines.append("")
    lines.append("Annotation policy, in short: a term is a requirement when the posting asks")
    lines.append("the candidate for it; company-context mentions and negations are excluded;")
    lines.append("`A or B` is one requirement; repetition never adds a requirement; a resume")
    lines.append("mention is evidence only when it is genuine experience. Ambiguous terms are")
    lines.append("recorded and excluded rather than guessed.")
    lines.append("")
    lines.append("## Metric definitions")
    lines.append("")
    lines.append("- **Requirement detection (keyword level):** predicted job requirements vs")
    lines.append("  annotated requirements. TP = both, FP = predicted only, FN = annotated only.")
    lines.append("- **Matched-skill identification:** over the annotated requirement universe,")
    lines.append("  TP = annotated matched and predicted matched, FP = predicted matched but not")
    lines.append("  annotated matched, FN = annotated matched but not predicted matched, TN =")
    lines.append("  annotated missing and not predicted matched.")
    lines.append("- **Missing-skill identification:** the complementary unit; predicted missing")
    lines.append("  vs annotated missing. Reported separately, not merged into one score.")
    lines.append("- **Alternative-group counting:** one unit per annotated `A or B` group. A")
    lines.append("  group is correct only when it contributes exactly one requirement and its")
    lines.append("  satisfied/missing status matches the annotation.")
    lines.append("- **Requirement count:** annotated logical requirements vs predicted")
    lines.append("  requirement count after removing annotated ambiguous terms.")
    lines.append("- **Negation:** one unit per annotated exclusion. A posting-side exclusion is")
    lines.append("  correct when the term is absent from predicted requirements; a resume-side")
    lines.append("  negation is correct when the term is absent from predicted matched skills.")
    lines.append("- **Micro** metrics sum counts; **macro** metrics average per-pair values.")
    lines.append("  Both are reported where meaningful.")
    lines.append("")
    lines.append("## Overall results")
    lines.append("")
    for title, key in (
        ("Requirement detection", "detection"),
        ("Matched-skill identification", "matched_identification"),
        ("Missing-skill identification", "missing_identification"),
    ):
        metric = summary[key]
        lines.append(f"### {title}")
        lines.append("")
        lines.append("| TP | FP | FN | TN | Precision | Recall | F1 | Macro F1 |")
        lines.append("| --: | --: | --: | --: | --: | --: | --: | --: |")
        lines.append(
            f"| {metric['tp']} | {metric['fp']} | {metric['fn']} | "
            f"{metric.get('tn', 'n/a')} | {_pct(metric['precision'])} | "
            f"{_pct(metric['recall'])} | {_pct(metric['f1'])} | "
            f"{_pct(metric.get('macro_f1'))} |"
        )
        lines.append("")
        if metric.get("specificity") is not None:
            lines.append(f"Specificity: {_pct(metric['specificity'])}.")
            lines.append("")
    lines.append("### Requirement count, groups and negation")
    lines.append("")
    lines.append("| Measurement | Result |")
    lines.append("| :-- | --: |")
    lines.append(
        f"| Requirement-count exact matches | "
        f"{summary['requirement_count']['exact_matches']}/"
        f"{summary['requirement_count']['pairs_evaluated']} "
        f"({_pct(summary['requirement_count']['accuracy'])}) |"
    )
    lines.append(
        f"| Mean absolute count error | "
        f"{_num(summary['requirement_count']['mean_absolute_error'])} |"
    )
    lines.append(
        f"| Coverage mean absolute error | "
        f"{_num(summary['coverage']['mean_absolute_error_percentage_points'])}"
        f" percentage points ({summary['coverage']['pairs_compared']} pairs without ambiguous labels) |"
    )
    lines.append(
        f"| Alternative groups correct | {summary['alternative_groups']['correct']}/"
        f"{summary['alternative_groups']['total']} "
        f"({_pct(summary['alternative_groups']['accuracy'])}) |"
    )
    lines.append(
        f"| Alternatives counted exactly once | {summary['alternative_groups']['counted_once']}/"
        f"{summary['alternative_groups']['total']} |"
    )
    lines.append(
        f"| Negation/exclusion units correct | {summary['negation']['correct']}/"
        f"{summary['negation']['total']} ({_pct(summary['negation']['accuracy'])}) |"
    )
    lines.append("")
    ceiling = summary["dictionary_ceiling"]
    lines.append("### Dictionary ceiling")
    lines.append("")
    lines.append(
        f"The annotations include {ceiling['unmeasured_requirements']} requirements that"
        f" are outside the {len(known_names)}-entry dictionary. The engine cannot represent them, so the"
        " table shows the same metrics with those requirements counted as missed. This is"
        " the more honest end-to-end ceiling; it is not a second accuracy claim."
    )
    lines.append("")
    lines.append("| Scope | Detection recall | Matched recall |")
    lines.append("| :-- | --: | --: |")
    lines.append(
        f"| Dictionary requirements only | {_pct(summary['detection']['recall'])} | "
        f"{_pct(summary['matched_identification']['recall'])} |"
    )
    lines.append(
        f"| Including out-of-dictionary requirements | "
        f"{_pct(ceiling['detection_including_unmeasured']['recall'])} | "
        f"{_pct(ceiling['matched_including_unmeasured']['recall'])} |"
    )
    lines.append("")
    lines.append("## Domain-wise results")
    lines.append("")
    lines.append("### Requirement detection")
    lines.append("")
    lines.append("| Domain | Test Pairs | Precision | Recall | F1-score | Main Errors |")
    lines.append("| :-- | --: | --: | --: | --: | :-- |")
    for row in domains:
        main = ", ".join(
            f"{item['label']} ({item['count']})" for item in row["errors_by_category"][:2]
        ) or "None"
        lines.append(
            f"| {row['name']} | {row['pairs']} | "
            f"{_pct(row['detection']['precision'])} | "
            f"{_pct(row['detection']['recall'])} | "
            f"{_pct(row['detection']['f1'])} | {main} |"
        )
    lines.append("")
    lines.append("### Matched and missing identification")
    lines.append("")
    lines.append("| Domain | Matched P | Matched R | Matched F1 | Missing P | Missing R | Missing F1 | Count Accuracy |")
    lines.append("| :-- | --: | --: | --: | --: | --: | --: | --: |")
    for row in domains:
        lines.append(
            f"| {row['name']} | "
            f"{_pct(row['matched_identification']['precision'])} | "
            f"{_pct(row['matched_identification']['recall'])} | "
            f"{_pct(row['matched_identification']['f1'])} | "
            f"{_pct(row['missing_identification']['precision'])} | "
            f"{_pct(row['missing_identification']['recall'])} | "
            f"{_pct(row['missing_identification']['f1'])} | "
            f"{_pct(row['requirement_count']['accuracy'])} |"
        )
    lines.append("")
    lines.append("## Similarity output (descriptive only)")
    lines.append("")
    lines.append("The TF-IDF cosine percentage is not compared with an accuracy target and is")
    lines.append("not treated as a correctness score. The table only shows how its distribution")
    lines.append("lines up with the human strong/moderate/weak labels.")
    lines.append("")
    lines.append("| Human label | Pairs | Mean | Median | Min | Max |")
    lines.append("| :-- | --: | --: | --: | --: | --: |")
    for strength in ("strong", "moderate", "weak"):
        values = similarity.get(strength, {})
        if values.get("pairs"):
            lines.append(
                f"| {strength.title()} | {values['pairs']} | {values['mean']:.1f}% | "
                f"{values['median']:.1f}% | {values['min']:.1f}% | {values['max']:.1f}% |"
            )
        else:
            lines.append(f"| {strength.title()} | 0 | n/a | n/a | n/a | n/a |")
    lines.append("")
    lines.append("## Alternative requirement evaluation")
    lines.append("")
    lines.append("| Pair | Group | Expected | Predicted | Representation | Counted once | Status correct | Correct |")
    lines.append("| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |")
    group_rows = [
        (record["pair_id"], group)
        for record in records
        for group in record["alternative_groups"]
    ]
    for pair_id, group in group_rows:
        lines.append(
            f"| {pair_id} | {group['label']} | "
            f"{'satisfied' if group['expected_satisfied'] else 'missing'} | "
            f"{'satisfied' if group['predicted_satisfied'] else ('missing' if group['predicted_satisfied'] is False else 'absent')} | "
            f"{group['representation']} | {'yes' if group['counted_once'] else 'no'} | "
            f"{'yes' if group['status_correct'] else 'no'} | "
            f"{'yes' if group['correct'] else 'no'} |"
        )
    lines.append("")
    lines.append("## Negation evaluation")
    lines.append("")
    lines.append("| Pair | Term | Source | Expected effect | Engine result | Correct |")
    lines.append("| :-- | :-- | :-- | :-- | :-- | :-- |")
    negation_rows = [
        (record["pair_id"], item)
        for record in records
        for item in record["negation"]
    ]
    for pair_id, item in negation_rows:
        if item["source"] == "job_description":
            engine_result = (
                "leaked into requirements" if item["predicted_in_requirements"] else "excluded"
            )
        else:
            engine_result = (
                "credited as matched" if item["predicted_matched"] else "excluded from evidence"
            )
        lines.append(
            f"| {pair_id} | {item['term']} | {item['source']} | "
            f"{'not a requirement' if item['source'] == 'job_description' else 'not evidence'} | "
            f"{engine_result} | {'yes' if item['correct'] else 'no'} |"
        )
    lines.append("")
    lines.append("## Error analysis")
    lines.append("")
    if not errors["by_category"]:
        lines.append("No annotation-vs-prediction errors were produced.")
    else:
        lines.append("| Category | Count | Severity |")
        lines.append("| :-- | --: | :-- |")
        for item in errors["by_category"]:
            lines.append(f"| {item['label']} | {item['count']} | {item['severity']} |")
        lines.append("")
        lines.append("All detected cases:")
        lines.append("")
        for category, examples in sorted(errors["examples"].items()):
            lines.append(f"**{ERROR_LABELS.get(category, category)}**")
            lines.append("")
            for example in examples:
                lines.append(
                    f"- `{example['pair_id']}` — {example['term'] or 'requirement count'}: "
                    f"{example['detail']}"
                )
            lines.append("")
    lines.append("## Robustness and consistency")
    lines.append("")
    lines.append("| Check | Requirements equal | Matched equal | Count equal | Similarity delta | Passed |")
    lines.append("| :-- | :--: | :--: | :--: | --: | :--: |")
    for check in consistency["checks"]:
        lines.append(
            f"| {check['check']} | {'yes' if check['requirements_equal'] else 'no'} | "
            f"{'yes' if check['matched_equal'] else 'no'} | "
            f"{'yes' if check['count_equal'] else 'no'} | "
            f"{check['similarity_delta']:+.2f} pp | {'pass' if check['passed'] else 'fail'} |"
        )
    lines.append("")
    lines.append("Requirement sets and counts are expected to be invariant under harmless")
    lines.append("order/case/formatting changes. Similarity is expected to be invariant under")
    lines.append("reordering and case, but a duplicated mention legitimately changes term")
    lines.append("frequency, so that delta is recorded rather than asserted.")
    lines.append("")
    lines.append("### PDF and DOCX extraction")
    lines.append("")
    lines.append("| Pair | Format | Status | Extracted words | Requirements equal | Matched equal | Count equal |")
    lines.append("| :-- | :-- | :-- | --: | :--: | :--: | :--: |")
    for item in consistency["pdf_docx"]:
        lines.append(
            f"| {item['pair_id']} | {item['format']} | {item.get('status', 'error')} | "
            f"{item.get('extracted_words', 'n/a')} | "
            f"{'yes' if item.get('requirements_equal') else 'no'} | "
            f"{'yes' if item.get('matched_equal') else 'no'} | "
            f"{'yes' if item.get('count_equal') else 'no'} |"
        )
    lines.append("")
    lines.append("### Input validation and API contract")
    lines.append("")
    lines.append("| Check | Expected | Actual | Passed |")
    lines.append("| :-- | --: | --: | :--: |")
    for item in consistency["api"]:
        lines.append(
            f"| {item['check']} | {item.get('expected_status', 'n/a')} | "
            f"{item.get('actual_status', 'n/a')} | {'pass' if item['passed'] else 'fail'} |"
        )
    lines.append("")
    lines.append("## Length buckets")
    lines.append("")
    lines.append("Descriptive only, not a pass/fail criterion.")
    lines.append("")
    lines.append("| Document | Bucket | Pairs | Detection F1 | Matched F1 | Count accuracy |")
    lines.append("| :-- | :-- | --: | --: | --: | --: |")
    for document, label in (("resume", "Resume"), ("job_description", "Job description")):
        for name in ("short", "medium", "long"):
            values = consistency["length_buckets"][document][name]
            if values.get("pairs"):
                lines.append(
                    f"| {label} | {name} | {values['pairs']} | "
                    f"{_pct(values['detection_f1'])} | {_pct(values['matched_f1'])} | "
                    f"{_pct(values['count_accuracy'])} |"
                )
            else:
                lines.append(f"| {label} | {name} | 0 | n/a | n/a | n/a |")
    lines.append("")
    lines.append("## Runtime")
    lines.append("")
    lines.append(
        f"- Analyses: {runtime['analyses']} (70 dataset pairs plus every enabled"
        " consistency/robustness analysis)."
    )
    lines.append(
        f"- Median per analysis: {runtime['median_ms']:.2f} ms; "
        f"95th percentile: {runtime['p95_ms']:.2f} ms."
    )
    lines.append(
        f"- Total harness wall time: {runtime['total_seconds']:.2f} s."
    )
    lines.append("- The harness is offline; it adds no runtime work to the application.")
    lines.append("")
    lines.append("## Known limitations")
    lines.append("")
    for item in manifest.get("known_dataset_limitations", []):
        lines.append(f"- {item}")
    lines.append("- The engine's documented shallow guards still apply: homographs,")
    lines.append("  morphology, implied duties, and alternative expressions outside the")
    lines.append("  grouping pattern can produce errors. Findings are not silently fixed.")
    lines.append("- Requirements outside the dictionary remain invisible to keyword")
    lines.append("  metrics; the dataset records them explicitly.")
    lines.append("")
    lines.append("## Reproduce")
    lines.append("")
    lines.append("```bash")
    lines.append("backend/venv/Scripts/python.exe evaluation/evaluation_runner.py")
    lines.append("# or on macOS/Linux")
    lines.append("backend/venv/bin/python evaluation/evaluation_runner.py")
    lines.append("```")
    lines.append("")
    lines.append(
        f"Dictionary entries at run time: {len(known_names)}. "
        f"Dataset version: {manifest.get('version')}."
    )
    lines.append("")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------


def run(
    dataset_path: Path = DEFAULT_DATASET,
    output_dir: Path = DEFAULT_OUTPUT_DIR,
    with_consistency: bool = True,
) -> Dict[str, Any]:
    started = time.perf_counter()
    manifest, pairs = load_dataset(dataset_path)
    known_names = dictionary_names()
    validation_errors = validate_dataset(manifest, pairs, known_names)
    if validation_errors:
        joined = "\n".join(f"- {error}" for error in validation_errors)
        raise SystemExit(f"Dataset validation failed:\n{joined}")

    records: List[Dict[str, Any]] = []
    _ANALYSIS_TIMINGS.clear()
    for pair in pairs:
        result = _analyse(pair["resume"], pair["job_description"])
        records.append(evaluate_pair(pair, result))

    summary = _aggregate(records)
    domains = []
    for name in EXPECTED_DOMAINS:
        subset = [record for record in records if record["domain"] == name]
        aggregate = _aggregate(subset)
        domains.append({
            "name": name,
            "pairs": len(subset),
            "detection": aggregate["detection"],
            "matched_identification": aggregate["matched_identification"],
            "missing_identification": aggregate["missing_identification"],
            "requirement_count": aggregate["requirement_count"],
            "errors_by_category": aggregate["errors_by_category"],
        })

    similarity = _similarity_summary(records)
    errors = {
        "by_category": summary["errors_by_category"],
        "examples": _error_examples(records),
        "total": summary["error_count"],
    }

    consistency = consistency_checks(pairs) if with_consistency else {
        "checks": [], "pdf_docx": [], "api": [], "length_buckets": None,
    }
    consistency["length_buckets"] = _length_buckets(records)

    timings = sorted(_ANALYSIS_TIMINGS)
    runtime = {
        "analyses": len(timings),
        "median_ms": statistics.median(timings) if timings else 0.0,
        "p95_ms": timings[max(0, int(len(timings) * 0.95) - 1)] if timings else 0.0,
        "total_seconds": time.perf_counter() - started,
    }

    payload = {
        "meta": {
            "dataset": manifest.get("name"),
            "dataset_version": manifest.get("version"),
            "dataset_created": manifest.get("created"),
            "synthetic": manifest.get("synthetic"),
            "annotator": manifest.get("annotator"),
            "second_review": manifest.get("second_review"),
            "dictionary_entries": len(known_names),
            "generated_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "engine": "backend/nlp_engine.py:analyze_full",
            "metric_units": {
                "requirement_detection": "pair x canonical dictionary requirement",
                "matched_identification": "pair x annotated requirement",
                "missing_identification": "pair x annotated requirement",
                "alternative_group": "pair x annotated A-or-B group",
                "negation": "pair x annotated exclusion",
                "requirement_count": "pair",
            },
        },
        "summary": summary,
        "domains": domains,
        "similarity": similarity,
        "errors": errors,
        "consistency": consistency,
        "runtime": runtime,
        "pairs": records,
    }

    output_dir.mkdir(parents=True, exist_ok=True)
    results_path = output_dir / "evaluation_results.json"
    report_path = output_dir / "evaluation_report.md"
    results_path.write_text(
        json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    report = build_report(
        manifest, pairs, records, summary, domains, similarity, errors,
        consistency, runtime, known_names,
    )
    report_path.write_text(report + "\n", encoding="utf-8")
    return payload


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Run the ResumeMatch evaluation harness.")
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument(
        "--skip-consistency",
        action="store_true",
        help="Skip PDF/DOCX/API/order robustness checks (dataset metrics only).",
    )
    args = parser.parse_args(argv)

    payload = run(args.dataset, args.output_dir, not args.skip_consistency)
    summary = payload["summary"]
    print(
        f"Pairs: {summary['pairs']} | "
        f"Detection P/R/F1: {_pct(summary['detection']['precision'])} / "
        f"{_pct(summary['detection']['recall'])} / {_pct(summary['detection']['f1'])} | "
        f"Matched P/R/F1: {_pct(summary['matched_identification']['precision'])} / "
        f"{_pct(summary['matched_identification']['recall'])} / "
        f"{_pct(summary['matched_identification']['f1'])} | "
        f"Count accuracy: {_pct(summary['requirement_count']['accuracy'])}"
    )
    print(f"Wrote {args.output_dir / 'evaluation_results.json'}")
    print(f"Wrote {args.output_dir / 'evaluation_report.md'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
