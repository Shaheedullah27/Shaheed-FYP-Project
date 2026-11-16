#!/usr/bin/env python3
"""Agreement and Cohen's kappa for two completed blind human reviews.

This script deliberately refuses files that contain expected or predicted
columns. Agreement must be computed between two human reviewers, never between a
reviewer and the AI-drafted provisional labels.

Usage:
    python evaluation/human_audit/agreement.py \
        --reviewer1 evaluation/human_audit/blind_review_reviewer1.csv \
        --reviewer2 evaluation/human_audit/blind_review_reviewer2.csv

Outputs:
    evaluation/human_audit/agreement_report.md
    evaluation/human_audit/disagreement_log.csv
"""

from __future__ import annotations

import argparse
import csv
from collections import Counter
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
ALLOWED = ["matched", "missing", "not_required", "ambiguous", "out_of_dictionary"]
REQUIRED_COLUMNS = {
    "requirement_id",
    "pair_id",
    "domain",
    "requirement_text",
    "reviewer_classification",
    "reviewer_notes",
}
FORBIDDEN_TOKENS = ("expected", "predicted", "provisional", "system", "evidence", "status")


def read_reviews(path: Path) -> tuple[list[str], dict[str, dict[str, str]]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        header = reader.fieldnames or []
        rows = list(reader)

    lowered = {column.lower() for column in header}
    forbidden = sorted(
        column
        for column in header
        if any(token in column.lower() for token in FORBIDDEN_TOKENS)
    )
    if forbidden:
        raise SystemExit(
            f"{path.name}: refusing to use a file with non-blind columns: {forbidden}. "
            "Agreement must use the blind human-review copies only."
        )
    if not REQUIRED_COLUMNS.issubset(lowered):
        missing = sorted(REQUIRED_COLUMNS - lowered)
        raise SystemExit(f"{path.name}: missing columns {missing}")
    if not rows:
        raise SystemExit(f"{path.name}: no review rows")

    by_id: dict[str, dict[str, str]] = {}
    for row in rows:
        rid = (row.get("requirement_id") or "").strip()
        if not rid:
            raise SystemExit(f"{path.name}: a row has no requirement_id")
        if rid in by_id:
            raise SystemExit(f"{path.name}: duplicate requirement_id {rid}")
        by_id[rid] = row
    return header, by_id


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reviewer1", type=Path, required=True)
    parser.add_argument("--reviewer2", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=HERE / "agreement_report.md")
    parser.add_argument(
        "--disagreements", type=Path, default=HERE / "disagreement_log.csv"
    )
    args = parser.parse_args()

    _, first = read_reviews(args.reviewer1)
    _, second = read_reviews(args.reviewer2)

    if set(first) != set(second):
        only_first = sorted(set(first) - set(second))
        only_second = sorted(set(second) - set(first))
        raise SystemExit(
            "Reviewer files cover different units. "
            f"Only in reviewer 1: {len(only_first)}; only in reviewer 2: {len(only_second)}. "
            "Both reviewers must classify the same units."
        )

    blanks: dict[str, list[str]] = {"reviewer1": [], "reviewer2": []}
    invalid: list[str] = []
    for rid in sorted(first):
        for label, rows, key in (
            ("reviewer1", first, "reviewer1"),
            ("reviewer2", second, "reviewer2"),
        ):
            value = (rows[rid].get("reviewer_classification") or "").strip()
            if not value:
                blanks[key].append(rid)
            elif value not in ALLOWED:
                invalid.append(f"{label} {rid}: {value!r}")
        for field in ("pair_id", "domain", "requirement_text"):
            if (first[rid].get(field) or "") != (second[rid].get(field) or ""):
                invalid.append(f"{rid}: {field} differs between reviewer files")
    if blanks["reviewer1"] or blanks["reviewer2"]:
        raise SystemExit(
            "Incomplete blind review: "
            f"{len(blanks['reviewer1'])} blank for reviewer 1, "
            f"{len(blanks['reviewer2'])} blank for reviewer 2. "
            "Do not compute agreement until both reviews are complete."
        )
    if invalid:
        raise SystemExit("Invalid review data:\n" + "\n".join(invalid))

    ids = sorted(first)
    n = len(ids)
    if n < 2:
        raise SystemExit("At least two review units are required.")

    a = [first[rid]["reviewer_classification"].strip() for rid in ids]
    b = [second[rid]["reviewer_classification"].strip() for rid in ids]
    disagreements = [rid for rid, x, y in zip(ids, a, b) if x != y]
    agreement_count = n - len(disagreements)
    observed = agreement_count / n

    count_a = Counter(a)
    count_b = Counter(b)
    expected = sum(
        (count_a[label] / n) * (count_b[label] / n) for label in set(count_a) | set(count_b)
    )
    kappa: float | None = None
    if len(set(a) | set(b)) == 1:
        kappa = None
        kappa_note = "Undefined: every unit received the same label from both reviewers (Pe = 1)."
    elif expected == 1:
        kappa = None
        kappa_note = "Undefined: expected chance agreement is 1."
    else:
        kappa = (observed - expected) / (1 - expected)
        kappa_note = "Point estimate only; no confidence interval or p-value is claimed."

    by_domain: dict[str, list[str]] = {}
    for rid in ids:
        by_domain.setdefault(first[rid]["domain"], []).append(rid)

    clusters = len({first[rid]["pair_id"] for rid in ids})

    args.disagreements.parent.mkdir(parents=True, exist_ok=True)
    with args.disagreements.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.writer(handle, lineterminator="\r\n")
        writer.writerow(
            [
                "requirement_id",
                "pair_id",
                "domain",
                "requirement_text",
                "reviewer_1_classification",
                "reviewer_2_classification",
                "disagreement_category",
                "resolution",
                "final_classification",
                "adjudication_notes",
            ]
        )
        for rid in disagreements:
            writer.writerow(
                [
                    rid,
                    first[rid]["pair_id"],
                    first[rid]["domain"],
                    first[rid]["requirement_text"],
                    a[ids.index(rid)],
                    b[ids.index(rid)],
                    "",
                    "",
                    "",
                    "",
                ]
            )

    lines: list[str] = []
    lines.append("# Inter-Annotator Agreement — Blind Human Review")
    lines.append("")
    lines.append("**Computed only from the two supplied blind human-review files.**")
    lines.append("")
    lines.append(f"- Reviewer 1 file: `{args.reviewer1.as_posix()}`")
    lines.append(f"- Reviewer 2 file: `{args.reviewer2.as_posix()}`")
    lines.append(f"- Review units compared: {n}")
    lines.append(f"- Pairs represented: {clusters}")
    lines.append("")
    lines.append("## Agreement")
    lines.append("")
    lines.append("| Measure | Value |")
    lines.append("| :-- | --: |")
    lines.append(f"| Identical classifications | {agreement_count} / {n} |")
    lines.append(f"| Observed agreement | {observed * 100:.1f}% |")
    lines.append(f"| Disagreements | {len(disagreements)} |")
    if kappa is None:
        lines.append("| Cohen's kappa | undefined |")
    else:
        lines.append(f"| Cohen's kappa | {kappa:.4f} |")
    lines.append(f"| Chance agreement (Pe) | {expected * 100:.1f}% |")
    lines.append("")
    lines.append(kappa_note)
    lines.append("")
    lines.append("## Classification distribution")
    lines.append("")
    lines.append("| Label | Reviewer 1 | Reviewer 2 |")
    lines.append("| :-- | --: | --: |")
    for label in ALLOWED:
        lines.append(f"| {label} | {count_a.get(label, 0)} | {count_b.get(label, 0)} |")
    lines.append("")
    lines.append("## Agreement by domain")
    lines.append("")
    lines.append("| Domain | Units | Agreements | Agreement % | Disagreements |")
    lines.append("| :-- | --: | --: | --: | --: |")
    for domain in sorted(by_domain):
        domain_ids = by_domain[domain]
        agree = sum(1 for rid in domain_ids if first[rid]["reviewer_classification"] == second[rid]["reviewer_classification"])
        lines.append(
            f"| {domain} | {len(domain_ids)} | {agree} | "
            f"{agree / len(domain_ids) * 100:.1f}% | {len(domain_ids) - agree} |"
        )
    lines.append("")
    lines.append("Domain-level agreement is descriptive; the cells are small.")
    lines.append("")
    lines.append("## Assumption audit")
    lines.append("")
    lines.append("| Assumption | Status |")
    lines.append("| :-- | :-- |")
    lines.append("| Exactly two raters | yes |")
    lines.append("| Same units, no missing classifications | yes (verified) |")
    lines.append("| Mutually exclusive nominal categories | yes (five labels) |")
    lines.append("| Independent coding | cannot be verified by this script; reviewers must attest |")
    lines.append(f"| Units independent | no — {n} units are clustered in {clusters} pairs |")
    lines.append("| Agreement computed without AI labels | yes — files with expected/predicted columns are rejected |")
    lines.append("")
    lines.append(
        f"Because units are clustered within {clusters} pairs, the kappa point estimate "
        "is descriptive only. Do not attach a confidence interval, p-value, or a claim "
        "of statistical independence. Report raw agreement and the disagreement log "
        "alongside kappa; kappa can be unstable when one label dominates."
    )
    lines.append("")
    lines.append("## Disagreements")
    lines.append("")
    lines.append(f"The adjudication worksheet is `{args.disagreements.name}`.")
    lines.append("")
    if disagreements:
        lines.append("| Unit | Pair | Domain | Requirement | Reviewer 1 | Reviewer 2 |")
        lines.append("| :-- | :-- | :-- | :-- | :-- | :-- |")
        for rid in disagreements:
            index = ids.index(rid)
            row = first[rid]
            lines.append(
                f"| {rid} | {row['pair_id']} | {row['domain']} | "
                f"{row['requirement_text']} | {a[index]} | {b[index]} |"
            )
    else:
        lines.append("No disagreements were recorded.")
    lines.append("")
    lines.append("## Next step")
    lines.append("")
    lines.append(
        "Assign a disagreement category and resolution to every row in the "
        "disagreement log, then fill `final_adjudicated_classification` and "
        "`adjudication_notes` for all units in `reviewer_audit.csv`. Do not edit the "
        "provisional dataset; build the audited dataset only after adjudication."
    )
    lines.append("")

    args.output.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Units: {n} | Agreement: {agreement_count}/{n} ({observed * 100:.1f}%) | Disagreements: {len(disagreements)}")
    print(f"Cohen's kappa: {'undefined' if kappa is None else f'{kappa:.4f}'} | Pe: {expected * 100:.1f}%")
    print(f"Wrote {args.output}")
    print(f"Wrote {args.disagreements}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
