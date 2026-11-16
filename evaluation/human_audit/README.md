# ResumeMatch Human Audit Package

**Status: PREPARED, NOT COMPLETED.** This directory contains materials for a human
review of the evaluation labels. It contains no reviewer responses, no agreement
statistic and no adjudicated labels. The labels remain AI-drafted and
unverified until the workflow below is actually carried out by people.

This package does not modify the NLP engine, the skills dictionary, the scoring
formula, the API, the frontend or the existing evaluation results.

---

## 1. Why this package exists

The evaluation dataset has 70 synthetic pairs, 309 logical requirements, 11
alternative groups, 9 negations, 2 ambiguous terms and 9 out-of-dictionary
requirements. Its labels were drafted by an AI coding assistant. The existing
benchmark is therefore a benchmark against **provisional** labels, not against
independently validated ground truth.

The audit package lets the project author and, if available, a second reviewer:

1. classify every unit independently from the source texts;
2. compare the two reviews and measure agreement;
3. adjudicate disagreements with a written rationale;
4. build a separate audited dataset without altering the original;
5. re-run the same harness and compare provisional with audited results.

It cannot make the labels independent by itself. Only completed human work can do
that, and even then the result is a two-reviewer audit of synthetic data, not a
universal benchmark.

---

## 2. Files

| File | What it is | Safe to edit? |
| :-- | :-- | :-- |
| `annotation_guidelines.md` | Reviewer instructions, definitions, worked examples, agreement rules | Read only |
| `reviewer_audit.csv` | 325 units with provisional labels, evidence pointers and blank reviewer/adjudication columns | Fill reviewer and adjudication columns only |
| `blind_review.csv` | 325 candidate units with source texts and blank classification fields; no provisional labels, evidence or predictions | Copy per reviewer and fill the two reviewer columns |
| `audit_summary.md` | Counts, inventories, provenance hashes and verification status | Read only |
| `verify_audit_package.py` | Read-only structural and provenance checks | Read only |
| `agreement.py` | Agreement and Cohen's kappa calculator for two completed blind reviews | Read only |
| `../audited_dataset.json` | Template manifest/register for the audited dataset; no human labels | Fill only after adjudication |
| `../audited_dataset/` | Not created yet; will hold the audited copies of the seven domain files | Create only after adjudication |

`reviewer_audit.csv` and `blind_review.csv` contain the same 325 `requirement_id`
values. Use the ID, not row position, to join them.

The blind file hides the labels, not the candidate list: it still lists the 325
requirement terms derived from the provisional annotation. It therefore tests
classification and evidence judgement, not independent requirement discovery.
Reviewers can flag a missing requirement in their notes; the adjudicator handles
that as a label-set revision outside the per-unit agreement calculation.

The `resume_evidence` column is the provisional AI-drafted quote. The
`job_description_evidence` column is a mechanical verbatim sentence extraction,
not an annotation. Reviewers must check both against the full texts.

---

## 3. Before you start

- Use the project's existing Python environment. The scripts use only the
  standard library and add no dependencies.
- Read `annotation_guidelines.md` in full.
- Do not open `evaluation_results.json`, `evaluation_report.md` or the running
  application while doing the blind pass.
- Do not edit the original dataset, results or report at any point.
- Decide who the reviewers are. If the author is the only reviewer, record a
  single-reviewer audit and do not report kappa.

### Estimated workload

325 units across 70 pairs. Each unit requires reading the relevant parts of a
resume and posting. Do not split the work between reviewers by unit; both
reviewers must classify the same units for agreement to be computable.

---

## 4. Workflow

### Step 1 — Verify the blank package

```bash
backend/venv/Scripts/python.exe evaluation/human_audit/verify_audit_package.py
```

Expected result: `PASS`. This checks 70 pairs, 7 domains, 309 requirements, 325
review units, blank reviewer fields, blind-column restrictions and the protected
file hashes.

### Step 2 — Prepare two blind copies

Copy `blind_review.csv` twice:

```bash
cp evaluation/human_audit/blind_review.csv evaluation/human_audit/blind_review_reviewer1.csv
cp evaluation/human_audit/blind_review.csv evaluation/human_audit/blind_review_reviewer2.csv
```

Give each reviewer **only** their copy plus `annotation_guidelines.md`. Do not
give them each other's file or `reviewer_audit.csv` before both blind passes are
complete. The blind file repeats the full resume and posting for every unit so a
reviewer does not need the dataset files.

If two reviewers are not available, one reviewer can complete one copy. In that
case, record a single-reviewer audit and skip Step 4.

### Step 3 — Complete the blind reviews independently

Each reviewer fills:

- `reviewer_classification` with exactly one of `matched`, `missing`,
  `not_required`, `ambiguous`, `out_of_dictionary`;
- `reviewer_notes` with a quote and a reason for every ambiguous, not-required or
  non-obvious decision.

Do not leave a unit blank. Do not discuss units with the other reviewer until
both files are complete and saved. Record the reviewer identity and date outside
the CSV (for example in the final report), not by adding columns.

### Step 4 — Compute agreement (two reviewers only)

```bash
backend/venv/Scripts/python.exe evaluation/human_audit/agreement.py \
  --reviewer1 evaluation/human_audit/blind_review_reviewer1.csv \
  --reviewer2 evaluation/human_audit/blind_review_reviewer2.csv
```

The script:

- refuses incomplete files, duplicate IDs or mismatched unit sets;
- refuses files that contain expected or predicted columns, so agreement cannot
  be computed against the AI labels;
- reports the unit count, raw agreement, disagreement count, category
  distribution and Cohen's kappa;
- writes `agreement_report.md` and `disagreement_log.csv`.

Read the assumption audit in the report. The 325 units are clustered within 70
pairs, so no confidence interval or p-value is reported for kappa. If the
assumptions do not hold, report raw agreement and the disagreement log only.

### Step 5 — Adjudicate

Use `disagreement_log.csv` as the agenda. For each disagreement:

1. re-read the full posting and resume;
2. decide the final label from the text, not from the engine;
3. assign a disagreement category from the guidelines;
4. write a short rationale in `adjudication_notes`.

Then copy the agreed labels for the non-disputed units and fill
`final_adjudicated_classification` for **all 325 rows** in
`reviewer_audit.csv`. Also transcribe each reviewer's classification into
`reviewer_1_classification` and `reviewer_2_classification` if it is not already
there, so the audit form is self-contained.

Every row must have a final label. A blank final column means the audit is
incomplete.

Re-run verification in completed mode:

```bash
backend/venv/Scripts/python.exe evaluation/human_audit/verify_audit_package.py --allow-completed
```

This keeps the structural and provenance checks but allows reviewer fields to be
filled. It still fails on unknown labels, missing IDs, altered source texts or a
changed protected file.

### Step 6 — Build the audited dataset (do not overwrite the original)

Create copies of the seven domain files:

```bash
mkdir -p evaluation/audited_dataset
cp evaluation/dataset/*.json evaluation/audited_dataset/
```

Edit **only** `evaluation/audited_dataset/*.json`, applying the final labels.
`evaluation/dataset/*.json` and `evaluation/evaluation_dataset.json` must remain
byte-identical.

For each pair, map the adjudicated rows as follows:

| Final label | Change in the audited pair |
| :-- | :-- |
| `matched` | Put the requirement in `expected_matched`; add a short verbatim evidence quote to `evidence`. |
| `missing` | Put the requirement in `expected_missing`; no evidence entry. |
| `not_required` | Remove it from `expected_requirements`. If the posting explicitly negates it, add it to `expected_excluded` with `source: "job_description"` and the reason. If it was only company context or incidental, simply remove it. |
| `ambiguous` | Add it to `ambiguous` with a reason and remove it from `expected_requirements`, matched and missing. |
| `out_of_dictionary` | Add it to `unmeasured_requirements` and remove it from the counted requirement set. |

Then:

- set `expected_count` to the new `len(expected_requirements)`;
- ensure `expected_matched` and `expected_missing` are disjoint and together
  equal `expected_requirements`;
- ensure every matched requirement has a non-empty evidence quote;
- for each alternative-group row, set the group's `satisfied` flag to whether
  the group is in `expected_matched`; keep the group as one requirement;
- if reviewers changed the grouping itself, keep the label exactly
  `" or ".join(members)` and ensure every member is a dictionary name;
- update `notes` to mention the audit date and any structural change;
- do not add a requirement term that is not in the dictionary or an existing
  group label; use `unmeasured_requirements` instead.

Finally update `evaluation/audited_dataset.json`:

- change `name` to `ResumeMatch Audited Evaluation Dataset` and remove the word
  TEMPLATE from the name and description;
- set `"status": "AUDITED"`;
- set `"human_review_completed": true`;
- fill `human_review` with reviewer completion, agreement and kappa;
- fill `annotator` with the reviewer identities and date in neutral wording;
- fill `second_review` with what was actually done (or state that only one
  reviewer participated);
- update `annotation_date` and set `version` to an audited version such as
  `1.0.0-audited`;
- remove the two template-only statements from `known_dataset_limitations`
  ("Audited labels do not exist..." and "This template must not be loaded...")
  and correct the single-annotator limitation to match what was actually done;
- fill each `audit_register` entry: `audited_expected_count`,
  `audited_matched`, `audited_missing`, and set `adjudication_status` to
  `complete`.

Do not mark it audited if any register entry is pending or any final label is
blank.

### Step 7 — Re-run the harness against the audited dataset

```bash
backend/venv/Scripts/python.exe evaluation/evaluation_runner.py \
  --dataset evaluation/audited_dataset.json \
  --output-dir evaluation/audited_results
```

This writes `evaluation/audited_results/evaluation_results.json` and
`evaluation/audited_results/evaluation_report.md`. It does not touch
`evaluation/evaluation_results.json` or `evaluation/evaluation_report.md`.

The runner validates the audited dataset before evaluating. If it stops with a
dataset-validation error, fix the labels, not the runner. Do not weaken the
validator to make a label pass.

### Step 8 — Compare provisional and audited results

Produce a comparison table with both runs side by side:

| Measure | Provisional labels | Audited labels |
| :-- | --: | --: |
| Requirement detection P / R / F1 | | |
| Matched identification P / R / F1 | | |
| Missing identification P / R / F1 | | |
| Requirement-count exact matches | | |
| Coverage MAE (percentage points) | | |
| Alternative groups correct | | |
| Negation units correct | | |

Also report how many labels changed, in which direction, and in which domains.
The engine is unchanged between the two runs, so any difference is a label
effect. Do not present the audited run as a new model result, and do not tune the
engine in the same change as the audit. If a label change reveals a genuine
engine limitation, document it separately and request approval before changing
production code.

Keep both reports. The provisional report is not deleted or overwritten; it is
the before state of the audit.

### Step 9 — Update the evaluation documentation

Only after the audit is complete, update `evaluation/README.md` with:

- who reviewed the labels and when;
- the number of units reviewed and the number changed;
- raw agreement and, if justified, kappa with its limitations;
- a link to `evaluation/human_audit/` and the audited results;
- an explicit statement of what remains unvalidated (synthetic data, dictionary
  boundary, small sample).

Also correct the dataset manifest's top-level `description`, which currently says
the pairs were "labelled by a human annotator" even though the `annotator` field
and the README say the labels were AI-drafted. That sentence is inconsistent and
must not be used as evidence of human validation. Correct it as part of the
audited revision, not by silently editing the provisional dataset.

---

## 5. What counts as done

The audit is complete only when all of the following are true:

- both blind review copies exist and are complete, or the report explicitly says
  a single reviewer performed the audit;
- `agreement_report.md` exists if two reviewers participated;
- every one of the 325 rows has a final adjudicated label;
- `disagreement_log.csv` has a category and resolution for every disagreement;
- `evaluation/audited_dataset/` contains seven files and
  `audited_dataset.json` is marked audited with no pending register entries;
- the audited harness run completes and writes to `evaluation/audited_results/`;
- the original dataset and results are unchanged;
- the evaluation README states the new provenance accurately.

Until then, describe the work as "audit package prepared" or "audit in progress",
never as "human-validated".

---

## 6. Commands

```bash
# 1. Structural verification of the blank package
backend/venv/Scripts/python.exe evaluation/human_audit/verify_audit_package.py

# 2. Agreement for two completed blind reviews
backend/venv/Scripts/python.exe evaluation/human_audit/agreement.py \
  --reviewer1 evaluation/human_audit/blind_review_reviewer1.csv \
  --reviewer2 evaluation/human_audit/blind_review_reviewer2.csv

# 3. Verification after review and adjudication
backend/venv/Scripts/python.exe evaluation/human_audit/verify_audit_package.py --allow-completed

# 4. Audited evaluation (preserves the original results)
backend/venv/Scripts/python.exe evaluation/evaluation_runner.py \
  --dataset evaluation/audited_dataset.json \
  --output-dir evaluation/audited_results

# 5. Existing backend tests
backend/venv/Scripts/python.exe -m unittest discover -s backend/tests
```

On macOS/Linux use `backend/venv/bin/python` instead.

---

## 7. Constraints

- Do not modify the production NLP engine, dictionary, TF-IDF/cosine logic,
  scoring formula, frontend or API contract as part of the audit.
- Do not overwrite `evaluation/evaluation_dataset.json`,
  `evaluation/dataset/`, `evaluation/evaluation_results.json` or
  `evaluation/evaluation_report.md`.
- Do not add dependencies.
- Do not edit the provisional labels in place. Build the audited dataset from
  adjudicated decisions.
- Do not fabricate reviewers, notes, agreement statistics or adjudications.
- Do not compute agreement against the AI labels.
- Do not report kappa without checking its assumptions.

---

## 8. Current limitations

- The labels are still AI-drafted; this package only prepares the audit.
- There is no second reviewer yet, and no agreement statistic exists.
- The 325 units are clustered inside 70 pairs, which limits inferential claims
  from kappa.
- The dataset is synthetic and dictionary-scoped; an audit does not make it
  representative of real hiring.
- The provisional evidence quotes were also AI-drafted; reviewers must verify
  them against the source text rather than trusting them.
