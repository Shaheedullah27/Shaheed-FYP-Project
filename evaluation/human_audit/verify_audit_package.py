#!/usr/bin/env python3
"""Read-only verification of the ResumeMatch human-audit package.

Checks coverage, label fidelity, blank reviewer fields, blind-file column
restrictions, the audited-dataset template and the hashes of files the audit
must not change. It does not judge annotation meaning.

Usage:
    python evaluation/human_audit/verify_audit_package.py
    python evaluation/human_audit/verify_audit_package.py --allow-completed
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
EVAL = HERE.parent
PROJECT = EVAL.parent

ALLOWED = {"matched", "missing", "not_required", "ambiguous", "out_of_dictionary"}
EXPECTED_DOMAINS = [
    "Software Development",
    "Digital Marketing",
    "Graphic Design / UI-UX",
    "Data Analysis",
    "Human Resources",
    "Finance / Accounting",
    "Business & Administration",
]
AUDIT_COLUMNS = [
    "pair_id",
    "domain",
    "job_title",
    "requirement_id",
    "requirement_text",
    "requirement_type",
    "expected_classification",
    "expected_status",
    "resume_evidence",
    "job_description_evidence",
    "alternative_group_id",
    "alternative_group_members",
    "negation_status",
    "reviewer_1_classification",
    "reviewer_1_notes",
    "reviewer_2_classification",
    "reviewer_2_notes",
    "final_adjudicated_classification",
    "adjudication_notes",
]
BLIND_COLUMNS = [
    "pair_id",
    "domain",
    "job_title",
    "requirement_id",
    "requirement_text",
    "resume_text",
    "job_description_text",
    "reviewer_classification",
    "reviewer_notes",
]
BLANK_FIELDS = [
    "reviewer_1_classification",
    "reviewer_1_notes",
    "reviewer_2_classification",
    "reviewer_2_notes",
    "final_adjudicated_classification",
    "adjudication_notes",
]
FORBIDDEN_BLIND_TOKENS = (
    "expected",
    "predicted",
    "provisional",
    "system",
    "evidence",
    "status",
    "match_strength",
)

PROTECTED = {
    "evaluation/evaluation_dataset.json": "08eeaebe168acb662ac4c5c42cb18088c1c629ad276bd3b9e0bd15e78397a79e",
    "evaluation/dataset/01_software_development.json": "8e21b344f55a36418fdffff822e017f25ab78993571427334f17d7468a7b838d",
    "evaluation/dataset/02_digital_marketing.json": "b4b366988d205f566f0c3227ecde39748da8016546f17852bed74373ec79afde",
    "evaluation/dataset/03_graphic_design_uiux.json": "6a0b1ea077c95c9c58467e2b302c7bb82f69379d3c97499d45dc6624c3f73ae2",
    "evaluation/dataset/04_data_analysis.json": "d35c14f8d679e1fe86bf25dd564103e03b8c0690c34c4a78732aa29caaf49732",
    "evaluation/dataset/05_human_resources.json": "9f7635c39cf45902ffbddda44fe4f7d59abf28c3e5c058913d8f72b653dbba7d",
    "evaluation/dataset/06_finance_accounting.json": "ecb38df1a2d8855694751c3b711ce33c471e4a45098bce8377948c241a4ad79f",
    "evaluation/dataset/07_business_administration.json": "d6a2381cd8f53338323cbf2492ae7340169de202d6eb1adbf18d7cf97e587776",
    "evaluation/evaluation_results.json": "52b9b36d66d55506f721e53b64510e2efcedb80b5f31a6653ffc37c35c346d2a",
    "evaluation/evaluation_report.md": "d96ab6d104a10937d36c337467e4266082e64ba8c6d746af4fbde855a8618261",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_table(path: Path, errors: list[str]) -> tuple[list[str], list[dict[str, str]]]:
    """Read a CSV strictly and check that every row has the header width."""
    try:
        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            rows = list(csv.reader(handle, strict=True))
    except Exception as exc:  # noqa: BLE001 - report the parse failure
        errors.append(f"{path.name}: cannot parse CSV: {exc}")
        return [], []
    if not rows:
        errors.append(f"{path.name}: file is empty")
        return [], []
    header = rows[0]
    records: list[dict[str, str]] = []
    for number, row in enumerate(rows[1:], start=2):
        if len(row) != len(header):
            errors.append(
                f"{path.name}: row {number} has {len(row)} fields, expected {len(header)}"
            )
            continue
        records.append(dict(zip(header, row)))
    return header, records


def load_dataset(errors: list[str]) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    manifest_path = EVAL / "evaluation_dataset.json"
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        errors.append(f"evaluation_dataset.json: {exc}")
        return {}, []
    pairs: list[dict[str, Any]] = []
    for domain in manifest.get("domains", []):
        path = EVAL / domain["file"]
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{domain['file']}: {exc}")
            continue
        if data.get("domain") != domain["name"]:
            errors.append(f"{domain['file']}: domain mismatch")
        if len(data.get("pairs", [])) != domain.get("pairs"):
            errors.append(f"{domain['file']}: pair count mismatch")
        pairs.extend(data.get("pairs", []))
    return manifest, pairs


def expected_units(pair: dict[str, Any]) -> list[dict[str, str]]:
    """Recompute the review units from the source labels, independently."""
    matched = set(pair["expected_matched"])
    groups = {group["label"]: group for group in pair["expected_alternative_groups"]}
    negated = {item["term"] for item in pair["resume_negated_terms"]}
    units: list[dict[str, str]] = []

    for term in pair["expected_requirements"]:
        group = groups.get(term)
        if group:
            kind = "alternative_group"
            alt_id = f"{pair['id']}-ALT1"
            members = " | ".join(group["members"])
            negation = "none"
        elif term in negated:
            kind = "resume_negated_requirement"
            alt_id = ""
            members = ""
            negation = "resume_negated"
        else:
            kind = "single_requirement"
            alt_id = ""
            members = ""
            negation = "none"
        units.append(
            {
                "pair_id": pair["id"],
                "domain": pair["domain"],
                "job_title": pair["job_title"],
                "requirement_text": term,
                "requirement_type": kind,
                "expected_classification": "matched" if term in matched else "missing",
                "expected_status": "matched" if term in matched else "missing",
                "resume_evidence": pair.get("evidence", {}).get(term, ""),
                "alternative_group_id": alt_id,
                "alternative_group_members": members,
                "negation_status": negation,
            }
        )
    for item in pair["expected_excluded"]:
        units.append(
            {
                "pair_id": pair["id"],
                "domain": pair["domain"],
                "job_title": pair["job_title"],
                "requirement_text": item["term"],
                "requirement_type": "job_negated_term",
                "expected_classification": "not_required",
                "expected_status": "not_counted",
                "resume_evidence": "",
                "alternative_group_id": "",
                "alternative_group_members": "",
                "negation_status": "job_negated",
            }
        )
    for item in pair["ambiguous"]:
        units.append(
            {
                "pair_id": pair["id"],
                "domain": pair["domain"],
                "job_title": pair["job_title"],
                "requirement_text": item["term"],
                "requirement_type": "ambiguous_term",
                "expected_classification": "ambiguous",
                "expected_status": "ambiguous",
                "resume_evidence": "",
                "alternative_group_id": "",
                "alternative_group_members": "",
                "negation_status": "none",
            }
        )
    for term in pair["unmeasured_requirements"]:
        units.append(
            {
                "pair_id": pair["id"],
                "domain": pair["domain"],
                "job_title": pair["job_title"],
                "requirement_text": term,
                "requirement_type": "out_of_dictionary_requirement",
                "expected_classification": "out_of_dictionary",
                "expected_status": "unmeasured",
                "resume_evidence": "",
                "alternative_group_id": "",
                "alternative_group_members": "",
                "negation_status": "none",
            }
        )
    for index, unit in enumerate(units, start=1):
        unit["requirement_id"] = f"{pair['id']}-R{index:02d}"
    return units


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify the human-audit package.")
    parser.add_argument(
        "--allow-completed",
        action="store_true",
        help="Allow reviewer and adjudication fields to be filled (post-audit check).",
    )
    args = parser.parse_args()
    errors: list[str] = []
    notes: list[str] = []

    manifest, pairs = load_dataset(errors)
    if len(pairs) != 70:
        errors.append(f"expected 70 pairs, found {len(pairs)}")
    if [domain.get("name") for domain in manifest.get("domains", [])] != EXPECTED_DOMAINS:
        errors.append("domain names or order differ from the seven expected domains")

    counts_by_domain = {name: 0 for name in EXPECTED_DOMAINS}
    for pair in pairs:
        if pair.get("domain") in counts_by_domain:
            counts_by_domain[pair["domain"]] += 1
        else:
            errors.append(f"{pair.get('id')}: unknown domain")
        requirements = pair.get("expected_requirements", [])
        matched = set(pair.get("expected_matched", []))
        missing = set(pair.get("expected_missing", []))
        if matched & missing:
            errors.append(f"{pair.get('id')}: matched/missing overlap")
        if matched | missing != set(requirements):
            errors.append(f"{pair.get('id')}: matched+missing != requirements")
        if pair.get("expected_count") != len(requirements):
            errors.append(f"{pair.get('id')}: expected_count mismatch")
        if set(pair.get("evidence", {})) != matched:
            errors.append(f"{pair.get('id')}: evidence keys != matched")
    for name, count in counts_by_domain.items():
        if count != 10:
            errors.append(f"{name}: expected 10 pairs, found {count}")

    total_requirements = sum(len(pair["expected_requirements"]) for pair in pairs)
    total_groups = sum(len(pair["expected_alternative_groups"]) for pair in pairs)
    total_job_negations = sum(len(pair["expected_excluded"]) for pair in pairs)
    total_resume_negations = sum(len(pair["resume_negated_terms"]) for pair in pairs)
    total_ambiguous = sum(len(pair["ambiguous"]) for pair in pairs)
    total_unmeasured = sum(len(pair["unmeasured_requirements"]) for pair in pairs)
    total_units = (
        total_requirements
        + total_job_negations
        + total_ambiguous
        + total_unmeasured
    )
    if total_requirements != 309:
        errors.append(f"expected 309 requirements, found {total_requirements}")
    if total_groups != 11:
        errors.append(f"expected 11 alternative groups, found {total_groups}")
    if total_job_negations != 5:
        errors.append(f"expected 5 job negations, found {total_job_negations}")
    if total_resume_negations != 4:
        errors.append(f"expected 4 resume negations, found {total_resume_negations}")
    if total_ambiguous != 2:
        errors.append(f"expected 2 ambiguous terms, found {total_ambiguous}")
    if total_unmeasured != 9:
        errors.append(f"expected 9 unmeasured terms, found {total_unmeasured}")
    if total_units != 325:
        errors.append(f"expected 325 review units, found {total_units}")

    expected: dict[str, dict[str, str]] = {}
    for pair in pairs:
        for unit in expected_units(pair):
            expected[unit["requirement_id"]] = unit

    audit_header, audit_rows = read_table(HERE / "reviewer_audit.csv", errors)
    if audit_header != AUDIT_COLUMNS:
        errors.append("reviewer_audit.csv: unexpected header")
    if len(audit_rows) != 325:
        errors.append(f"reviewer_audit.csv: expected 325 rows, found {len(audit_rows)}")
    seen: dict[str, dict[str, str]] = {}
    for row in audit_rows:
        rid = row.get("requirement_id", "")
        if rid in seen:
            errors.append(f"reviewer_audit.csv: duplicate id {rid}")
        seen[rid] = row
        if rid not in expected:
            errors.append(f"reviewer_audit.csv: unexpected id {rid}")
            continue
        unit = expected[rid]
        for field in (
            "pair_id",
            "domain",
            "job_title",
            "requirement_text",
            "requirement_type",
            "expected_classification",
            "expected_status",
            "alternative_group_id",
            "alternative_group_members",
            "negation_status",
        ):
            if row.get(field, "") != unit[field]:
                errors.append(
                    f"reviewer_audit.csv: {rid} field {field} is "
                    f"{row.get(field, '')!r}, expected {unit[field]!r}"
                )
        if unit["expected_status"] == "matched":
            if row.get("resume_evidence", "") != unit["resume_evidence"]:
                errors.append(f"reviewer_audit.csv: {rid} matched evidence changed")
        elif unit["requirement_type"] != "resume_negated_requirement":
            if row.get("resume_evidence", "") != "":
                errors.append(f"reviewer_audit.csv: {rid} has evidence for a non-match")
        if not args.allow_completed:
            for field in BLANK_FIELDS:
                if row.get(field, "").strip():
                    errors.append(f"reviewer_audit.csv: {rid} field {field} is not blank")
        else:
            final = row.get("final_adjudicated_classification", "").strip()
            if not final:
                errors.append(f"reviewer_audit.csv: {rid} has no final classification")
            elif final not in ALLOWED:
                errors.append(f"reviewer_audit.csv: {rid} final label {final!r} invalid")
            for field in ("reviewer_1_classification", "reviewer_2_classification"):
                value = row.get(field, "").strip()
                if value and value not in ALLOWED:
                    errors.append(f"reviewer_audit.csv: {rid} {field} {value!r} invalid")
    missing_ids = set(expected) - set(seen)
    if missing_ids:
        errors.append(f"reviewer_audit.csv: missing {len(missing_ids)} units")

    blind_header, blind_rows = read_table(HERE / "blind_review.csv", errors)
    if blind_header != BLIND_COLUMNS:
        errors.append("blind_review.csv: unexpected header")
    for column in blind_header:
        lowered = column.lower()
        if any(token in lowered for token in FORBIDDEN_BLIND_TOKENS):
            errors.append(f"blind_review.csv: forbidden column {column!r}")
    if len(blind_rows) != 325:
        errors.append(f"blind_review.csv: expected 325 rows, found {len(blind_rows)}")
    blind_ids: set[str] = set()
    pair_text = {pair["id"]: pair for pair in pairs}
    for row in blind_rows:
        rid = row.get("requirement_id", "")
        if rid in blind_ids:
            errors.append(f"blind_review.csv: duplicate id {rid}")
        blind_ids.add(rid)
        if rid not in expected:
            errors.append(f"blind_review.csv: unexpected id {rid}")
            continue
        unit = expected[rid]
        if row.get("requirement_text", "") != unit["requirement_text"]:
            errors.append(f"blind_review.csv: {rid} requirement text changed")
        pair = pair_text.get(row.get("pair_id", ""))
        if not pair:
            errors.append(f"blind_review.csv: {rid} unknown pair")
        else:
            if row.get("resume_text", "") != pair["resume"]:
                errors.append(f"blind_review.csv: {rid} resume text changed")
            if row.get("job_description_text", "") != pair["job_description"]:
                errors.append(f"blind_review.csv: {rid} job-description text changed")
        if not args.allow_completed:
            for field in ("reviewer_classification", "reviewer_notes"):
                if row.get(field, "").strip():
                    errors.append(f"blind_review.csv: {rid} field {field} is not blank")
        else:
            value = row.get("reviewer_classification", "").strip()
            if value and value not in ALLOWED:
                errors.append(f"blind_review.csv: {rid} label {value!r} invalid")
    if blind_ids != set(expected):
        errors.append("blind_review.csv: unit set differs from reviewer_audit.csv")

    template_path = EVAL / "audited_dataset.json"
    try:
        audited = json.loads(template_path.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        errors.append(f"audited_dataset.json: {exc}")
        audited = {}
    if not args.allow_completed:
        if audited.get("status") != "TEMPLATE_NOT_VALIDATED":
            errors.append("audited_dataset.json: status must be TEMPLATE_NOT_VALIDATED")
        if audited.get("human_review_completed") is not False:
            errors.append("audited_dataset.json: human_review_completed must be false")
        for item in audited.get("audit_register", []):
            if any(
                item.get(field) is not None
                for field in ("audited_expected_count", "audited_matched", "audited_missing")
            ):
                errors.append(
                    f"audited_dataset.json: {item.get('pair_id')} contains audited labels"
                )
            if item.get("adjudication_status") != "pending":
                errors.append(
                    f"audited_dataset.json: {item.get('pair_id')} is not pending"
                )
    else:
        if audited.get("human_review_completed") is not True:
            errors.append("audited_dataset.json: human review is not marked complete")
        pending = [
            item.get("pair_id")
            for item in audited.get("audit_register", [])
            if item.get("adjudication_status") != "complete"
        ]
        if pending:
            errors.append(f"audited_dataset.json: {len(pending)} register entries pending")
        for domain in audited.get("domains", []):
            path = EVAL / domain["file"]
            if not path.exists():
                errors.append(f"audited_dataset.json: missing audited file {domain['file']}")
                continue
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
            except Exception as exc:  # noqa: BLE001
                errors.append(f"{domain['file']}: {exc}")
                continue
            if data.get("domain") != domain["name"]:
                errors.append(f"{domain['file']}: domain mismatch")
            if len(data.get("pairs", [])) != 10:
                errors.append(f"{domain['file']}: expected 10 pairs")
    if len(audited.get("audit_register", [])) != 70:
        errors.append("audited_dataset.json: register must contain 70 pairs")
    if audited.get("totals") != {"domains": 7, "pairs": 70}:
        errors.append("audited_dataset.json: totals must be 7 domains / 70 pairs")

    for relative, digest in PROTECTED.items():
        path = PROJECT / relative
        if not path.exists():
            errors.append(f"protected file missing: {relative}")
            continue
        actual = sha256(path)
        if actual != digest:
            errors.append(f"protected file changed: {relative}")

    counts = {
        "pairs": len(pairs),
        "domains": len([name for name, count in counts_by_domain.items() if count]),
        "requirements": total_requirements,
        "alternative_groups": total_groups,
        "job_negations": total_job_negations,
        "resume_negations": total_resume_negations,
        "ambiguous": total_ambiguous,
        "out_of_dictionary": total_unmeasured,
        "review_units": total_units,
        "audit_rows": len(audit_rows),
        "blind_rows": len(blind_rows),
    }
    for key, value in counts.items():
        print(f"{key}: {value}")

    if errors:
        print("\nFAIL")
        for error in errors:
            print(f"  - {error}")
        return 1
    print("\nPASS - audit package structure, label fidelity, blank fields and provenance hashes verified.")
    if args.allow_completed:
        print("Completed-mode checks accepted filled reviewer and adjudication fields.")
    else:
        print("No reviewer or adjudication responses are present.")
    for note in notes:
        print(f"note: {note}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
