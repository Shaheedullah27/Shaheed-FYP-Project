# ResumeMatch Evaluation and Benchmarking

This directory contains an offline, reproducible evaluation of the existing
ResumeMatch pipeline. It does **not** change the engine, the dictionary, the
API, the frontend or the scoring formulas. It measures what the current
implementation actually does on a dataset labelled independently of its predictions.

> The dataset is synthetic. It is not scraped hiring data, it is not a random
> sample of the job market, and no result here is a hiring prediction or a
> universal ATS accuracy claim.

## Contents

| Path | Purpose |
| :-- | :-- |
| `evaluation_dataset.json` | Manifest, annotation policy, domain index, disclosure |
| `dataset/*.json` | Seven domain files, 10 labelled pairs each |
| `evaluation_runner.py` | Loads labels, runs `analyze_full`, computes metrics, checks invariants, writes outputs |
| `evaluation_results.json` | Full per-pair predictions, labels, metrics, errors and checks |
| `evaluation_report.md` | Generated report with tables, domain results and all detected errors |
| `../backend/tests/test_evaluation.py` | Dataset contract and metric-arithmetic tests |

Run it with:

```bash
backend/venv/Scripts/python.exe evaluation/evaluation_runner.py
# macOS/Linux
backend/venv/bin/python evaluation/evaluation_runner.py
```

The harness uses only the existing Python environment (standard library,
scikit-learn, Flask, PyMuPDF and python-docx already used by the project).

## Dataset

- **70 resume/job-description pairs**, seven domains, 10 per domain:
  Software Development, Digital Marketing, Graphic Design / UI-UX, Data
  Analysis, Human Resources, Finance / Accounting, Business & Administration.
- **Synthetic but realistic**: every document was written for this evaluation.
  No real applicant or vacancy is represented.
- **Varied**: junior to senior roles; prose, bullets and mixed formats;
  resume lengths from 10 to 162 words and postings from 6 to 113 words; strong,
  moderate and weak matches (34 / 22 / 14).
- **Edge cases are deliberate**: 11 `A or B` alternative groups, 5
  posting-side negations, 4 resume-side negations, 2 ambiguous terms,
  homograph traps (`excel at`, `accounting for`, `react to`), duplicate
  mentions, learning-only mentions and 9 requirements outside the dictionary.

### Domain distribution

| Domain | Pairs | Strong | Moderate | Weak |
| :-- | --: | --: | --: | --: |
| Software Development | 10 | 5 | 2 | 3 |
| Digital Marketing | 10 | 4 | 4 | 2 |
| Graphic Design / UI-UX | 10 | 4 | 4 | 2 |
| Data Analysis | 10 | 6 | 2 | 2 |
| Human Resources | 10 | 5 | 3 | 2 |
| Finance / Accounting | 10 | 6 | 2 | 2 |
| Business & Administration | 10 | 4 | 5 | 1 |

## How the labels were produced

The labels were drafted from the document text **before the harness was run**.
The engine was never used to generate, repair or validate an expected label.
Each pair records expected requirements, matched requirements, missing
requirements, alternative groups, excluded terms, resume negations, evidence
quotes and notes.

**Who annotated, and what that means for the claim.** The labels were drafted
by the AI coding assistant under the project author's direction. This is not
independent human annotation, and the project author has not yet re-annotated
the labels. The assistant had read the engine and dictionary while building the
dataset, so the labels are independent of the engine's *predictions* but not of
knowledge of the implementation. Treat every result as provisional until a
human audit of the labels is complete.

Annotation policy:

1. A dictionary term is a requirement when the posting asks the candidate for
   it (required, preferred or optional), or when a core duty clearly needs it.
2. Company-context mentions, negations and incidental prose that does not state
   a candidate expectation are excluded, or recorded as ambiguous.
3. Two alternatives joined by exactly `or` are one requirement. Individual
   members are not separate requirements.
4. Repetition never creates an additional requirement.
5. A resume mention is evidence only when it reads as genuine experience.
   Learning-only, negated, homograph and unrelated uses do not count.
6. Requirements outside the 182-entry dictionary are recorded as
   `unmeasured_requirements` and excluded from keyword metrics. They are
   reported separately as a dictionary ceiling.
7. Genuinely uncertain terms are recorded as `ambiguous` and excluded rather
   than forced into matched or missing.

**Independence and review.** This is a single-annotator dataset, and that
annotator is an AI assistant. No independent human second reviewer was
available, so no inter-annotator agreement statistic is reported. The harness
performs mechanical integrity checks (requirements = matched + missing, group
membership, evidence presence, unique IDs, domain counts) but those are not a
second human review. Labels were not changed in response to engine predictions.

**Post-run dataset completion.** After the first harness run, document length
and out-of-dictionary coverage were expanded so that short, medium and long
documents were represented and the dictionary ceiling could be measured. Those
additions did not change any expected matched/missing label, and no requirement
was added to make a prediction correct. This is disclosed rather than hidden.

## Metric units

The harness keeps unrelated units separate:

- **Requirement detection** — pair × canonical requirement. Predicted job
  requirements (matched + missing) vs annotated requirements. TP = both,
  FP = predicted only, FN = annotated only. No natural true-negative universe,
  so TN is not reported for this layer.
- **Matched-skill identification** — pair × annotated requirement. TP = both
  matched, FP = predicted matched but not annotated matched, FN = annotated
  matched but not predicted matched, TN = annotated missing and not predicted
  matched. Specificity is reported.
- **Missing-skill identification** — pair × annotated requirement, the
  complementary unit, reported separately.
- **Alternative group** — one unit per annotated `A or B` group. Correct means
  it contributes exactly one requirement and its satisfied/missing status
  matches the annotation.
- **Negation** — one unit per annotated exclusion. A posting-side exclusion is
  correct when the term is absent from predicted requirements; a resume-side
  negation is correct when the term is absent from predicted matched skills.
- **Requirement count** — pair. Predicted count vs logical annotated count
  (ambiguous predicted terms removed).
- **Coverage** — pair. The production `keyword_coverage` vs the coverage implied
  by the annotation; mean absolute error in percentage points, over pairs with
  no ambiguous labels.
- **Micro** sums counts; **macro** averages per-pair values. Both are included
  in `evaluation_results.json`.

For comparison only, one alternative evidenced on one side is canonicalised to
the group label before requirement detection. The group's label form
(`single_member` vs `group_label`) is recorded separately, so semantic counting
and representation are not conflated.

## Overall results

Dictionary-scoped, 70 pairs, 309 annotated requirements.

| Layer | TP | FP | FN | TN | Precision | Recall | F1 | Macro F1 |
| :-- | --: | --: | --: | --: | --: | --: | --: | --: |
| Requirement detection | 309 | 5 | 0 | — | 98.4% | 100.0% | 99.2% | 99.2% |
| Matched-skill identification | 227 | 5 | 7 | 73 | 97.8% | 97.0% | 97.4% | 97.2% |
| Missing-skill identification | 73 | 9 | 2 | 227 | 89.0% | 97.3% | 93.0% | 96.9% |

Matched specificity is 93.6%; missing specificity is 96.2%. Macro precision/recall are 98.2%/97.1% for matched identification and 84.9%/94.3% for missing identification.

| Measurement | Result |
| :-- | --: |
| Requirement-count exact matches | 65/70 (92.9%) |
| Mean absolute count error | 0.07 requirements |
| Coverage mean absolute error | 3.46 percentage points (68 pairs) |
| Alternative groups correct | 11/11 |
| Negation/exclusion units correct | 9/9 |

**Dictionary ceiling.** Nine annotated requirements are outside the dictionary
(for example Storybook, Airflow, Workday, Anaplan). Treating them as missed
gives detection recall 97.2% and matched recall 93.4%. The dictionary-scoped
figures above are therefore optimistic end-to-end.

## Domain-wise results

### Requirement detection

| Domain | Test Pairs | Precision | Recall | F1-score | Main Errors |
| :-- | --: | --: | --: | --: | :-- |
| Software Development | 10 | 98.2% | 100.0% | 99.1% | 1 over-detection, 1 count error |
| Digital Marketing | 10 | 100.0% | 100.0% | 100.0% | 1 missing requirement credited |
| Graphic Design / UI-UX | 10 | 100.0% | 100.0% | 100.0% | 1 missing requirement credited |
| Data Analysis | 10 | 100.0% | 100.0% | 100.0% | 1 missed evidence |
| Human Resources | 10 | 95.5% | 100.0% | 97.7% | 2 over-detections, 2 count errors |
| Finance / Accounting | 10 | 97.6% | 100.0% | 98.8% | 2 missed evidence, 1 count error |
| Business & Administration | 10 | 97.8% | 100.0% | 98.9% | 4 missed evidence, 1 count error |

### Matched and missing identification

| Domain | Matched P | Matched R | Matched F1 | Missing P | Missing R | Missing F1 | Count accuracy |
| :-- | --: | --: | --: | --: | --: | --: | --: |
| Software Development | 100.0% | 100.0% | 100.0% | 92.9% | 100.0% | 96.3% | 90.0% |
| Digital Marketing | 96.7% | 100.0% | 98.3% | 100.0% | 92.3% | 96.0% | 100.0% |
| Graphic Design / UI-UX | 97.0% | 100.0% | 98.5% | 100.0% | 90.9% | 95.2% | 100.0% |
| Data Analysis | 100.0% | 97.1% | 98.6% | 90.0% | 100.0% | 94.7% | 100.0% |
| Human Resources | 97.0% | 100.0% | 98.5% | 90.9% | 100.0% | 95.2% | 80.0% |
| Finance / Accounting | 96.7% | 93.5% | 95.1% | 81.8% | 100.0% | 90.0% | 90.0% |
| Business & Administration | 96.9% | 88.6% | 92.5% | 71.4% | 100.0% | 83.3% | 90.0% |

Do **not** compare domains by a single number: requirement counts differ, and
one pair can move a domain percentage by several points.

## Error analysis

There are 22 error records, but they are counted **per metric layer**, so the
same term can appear once as an over-detection and once as a spurious match.
There are 14 distinct failing pair–term combinations.

### False negatives (7 matched requirements)

| Pair | Requirement | Resume evidence | Likely cause |
| :-- | :-- | :-- | :-- |
| DA-02 | Data Cleaning | "cleaned messy datasets" | Phrase variation not covered by the dictionary aliases |
| FA-03 | Auditing | "External auditor", "statutory audits" | Inflection (`auditor`, `audits`) not matched; only `auditing` and specific audit phrases are listed |
| FA-05 | Financial Reporting | "statutory reporting" | Near-synonym outside the alias list |
| BA-03 | Budgeting | "annual budget" | Noun form not covered by `budgeting`/`budget planning` aliases |
| BA-03 | Risk Management | "risk register" | Domain phrase outside the alias list |
| BA-06 | Negotiation | "negotiate contracts" | Verb inflection outside `negotiating`/`negotiated` |
| BA-07 | Project Management | "Project manager" | Job-title form not in the alias list |

All seven are **documented dictionary/phrase coverage limits**, not crashes or
logic defects. They are the main reason to avoid claiming universal recall.
Fixing them would require dictionary or morphology changes, which is outside
the approved scope of this evaluation stage.

### False positives and over-detections (5 requirement terms)

| Pair | Term | Posting wording | Cause |
| :-- | :-- | :-- | :-- |
| SD-10 | Reporting | "Excel skills are a plus for reporting tasks" | Duty mention counted as a requirement |
| HR-04 | Human Resources | "HR coordinator" | Job title counted through the `HR` alias |
| HR-05 | Human Resources | "HR operations assistant" | Job title counted through the `HR` alias |
| FA-09 | Accounting | "Cost accountant" | Job title counted through the `accountant` alias |
| BA-06 | Business Development | "Business development executive" | Job title counted as a requirement |

Root cause: the engine treats any surviving dictionary mention in the posting as
a requirement. It does not classify the sentence as a requirement, duty or job
title. This is a **documented presence-based limitation**, not a scoring bug.
It also explains all 5 requirement-count mismatches and the corresponding 3
spurious matched entries. A human could argue that some job titles imply the
skill; under this dataset's policy (an explicit ask), they are over-detections.

### False matches (2 requirements credited without evidence)

| Pair | Term | Resume wording | Cause |
| :-- | :-- | :-- | :-- |
| DM-08 | Tableau | "Currently learning Tableau" | Presence-only matching treats learning as evidence |
| GD-05 | UI/UX Design | "UX researcher" | Broad `UX` alias matches a research title, not design evidence |

Both are **presence/alias limits**. They are high-severity for interpretation
because they can make a missing skill look satisfied, but the weak-evidence
suggestion layer is not designed to override coverage.

### Missing-identification precision (89.0%)

Nine predicted-missing terms were not annotated missing: the seven missed
matched requirements above are also reported as missing, plus the duty-implied
Reporting (SD-10) and Human Resources (HR-04) terms. Missing recall remains
97.3%. This is why missing precision is lower than matched precision and why
the two layers are reported separately.

## Alternative requirements

All 11 annotated groups were counted once and classified correctly:

- 8 groups were satisfied by one alternative and represented by that single
  member (`single_member`);
- 2 groups (`Python or R`, `Power BI or Tableau`) were satisfied by both
  alternatives and represented as one `A or B` entry;
- 1 group (`React or Vue.js`) was unsatisfied and represented as one missing
  `A or B` entry.

The label form differs for the one-member case, but the requirement count is
one. The harness records representation and counting separately. This is
evidence for the 11 cases in this dataset, not proof that every natural-language
alternative is grouped; comma chains, three-item chains and `and/or` remain
outside the pattern.

## Negation

All 9 annotated exclusions passed:

- 5 posting-side exclusions (Kubernetes, Google Ads, Tableau, SAP, PMP) were
  absent from predicted requirements;
- 4 resume-side negations (Swift, CRO, Adobe Illustrator, Payroll) were absent
  from predicted matched skills.

These are clause-local, explicit negations. Long-distance references, sarcasm,
double negation and negation inside subordinate clauses are not covered, and
the dataset does not claim to test them.

## PDF and DOCX extraction

Three pairs (SD-01, DM-05, FA-01) were rendered as real in-memory PDF and DOCX
files, parsed through the existing parser, and analysed. All 6 checks passed:
extracted word counts and requirement sets, matched sets and counts were
identical to direct text analysis. The parser tests in the backend suite also
cover hyphenated line breaks and DOCX/PDF parity.

A separate end-to-end smoke check uploaded generated PDF and DOCX bytes through
`POST /api/extract-resume`, then submitted the extracted text to
`POST /api/analyze`. Both formats returned 200, 28 extracted words, 100%
keyword coverage, 6 of 6 requirements matched, and the unchanged 15-field
analysis response. That check is manual rather than part of the harness, but it
exercises the real API upload path.

## Robustness and consistency

Seven invariants passed:

| Change | Requirement set | Matched set | Count | Similarity |
| :-- | :--: | :--: | :--: | --: |
| Job description reordered | same | same | same | 0.00 pp |
| Job description bulleted | same | same | same | 0.00 pp |
| Job description duplicate mentions | same | same | same | +0.50 pp |
| Resume paragraphs reordered | same | same | same | 0.00 pp |
| Case changed | same | same | same | 0.00 pp |
| Resume duplicate mentions | same | same | same | +0.90 pp |
| Resume bullets to prose | same | same | same | 0.00 pp |

Requirement sets and counts must be invariant under order, case and formatting.
Similarity is a bag-of-words measure, so it is invariant under reordering and
case, but a duplicated mention legitimately changes term frequency and may move
the cosine score. The harness records those deltas rather than asserting zero.
An identical repeat of the same analysis also returned byte-identical fields in
a manual determinism check.

Length buckets (descriptive only): short resumes (62 pairs) matched F1 97.5%,
medium (4) 100%, long (4) 95.0%; short postings (60) matched F1 97.5%, medium
(6) 98.3%, long (4) 95.0%. Count accuracy is 100% in every medium/long bucket
and 91.7–91.9% in the short bucket. The buckets are small; do not over-read
them.

## Similarity output

The cosine percentage is **not** treated as accuracy and has no ground-truth
target in this evaluation. Descriptive distribution by human match label:

| Human label | Pairs | Mean | Median | Min | Max |
| :-- | --: | --: | --: | --: | --: |
| Strong | 34 | 31.87% | 32.45% | 13.8% | 53.8% |
| Moderate | 22 | 31.85% | 31.45% | 14.2% | 63.7% |
| Weak | 14 | 8.14% | 5.85% | 0.0% | 21.6% |

Weak matches are clearly separated, but strong and moderate labels are
**not** separated by the cosine mean. Similarity also falls when long resumes
add relevant detail, because the score is length-sensitive. The correct
conclusion is that TF-IDF measures lexical overlap, not resume quality or
hiring probability. No accuracy number is derived from it.

## API and integration

The harness checks malformed input responses and the exact `/api/analyze`
response keys:

- empty JSON → 400 `{"error": ...}`
- missing job description → 400
- too-short resume → 400
- too-short job description → 400
- valid analysis → 200 with exactly the 15 existing top-level fields

The full backend suite (166 tests: the original 150 plus 16 evaluation tests)
also covers the unchanged API contract, PDF/DOCX extraction and the existing
engine behaviour. The evaluation harness imports the analysis function and the
parser; it adds no work to the running application.

## Runtime

The harness performs 87 timed analyses (70 dataset pairs + 17 baseline,
consistency and PDF/DOCX round-trip analyses) on the development machine; the
five API checks also exercise the endpoint but are outside the per-analysis
timings:

- per-analysis median is single-digit to low-double-digit milliseconds; a quiet
  run measured 5.72 ms median and 14.17 ms at the 95th percentile, while a
  loaded run measured 13.28 ms and 31.03 ms. The generated report records the
  exact figures for its own run;
- total harness wall time is a few seconds (1.70 s quiet, 3.13 s loaded).

This is offline evaluation cost only. The application's request path is
unchanged.

## Known limitations

1. **Synthetic and small.** 70 pairs across seven domains cannot represent the
   job market. Domain percentages move by several points per pair.
2. **AI-drafted, single annotator.** The labels were drafted by the coding
   assistant, not an independent human; there is no second reviewer and no
   inter-annotator agreement statistic. They are documented and mechanically
   checked, not independently replicated. A human audit is required before
   these figures are presented as independently validated.
3. **Dictionary-scoped.** Keyword metrics only cover the 182 dictionary entries.
   Nine human-identified requirements are outside it; the dictionary ceiling is
   reported separately (detection recall 97.2%, matched recall 93.4%).
4. **Dictionary-consistent vocabulary.** Because labels use canonical names,
   requirement detection is optimistic compared with an unrestricted crawl of
   real postings. The 100% detection recall on this set is not a universal
   claim.
5. **Edge-case enrichment.** Negation, alternatives and homographs are
   deliberately over-represented relative to a random sample.
6. **Presence is not depth.** "Currently learning Tableau" and equivalent
   phrasing can still be credited; coverage does not measure proficiency.
7. **Requirement sentences are not parsed.** Job titles and duty phrases can be
   counted as requirements, as the five over-detections show.
8. **Alternative grouping is narrow.** Adjacent same-category pairs joined by
   exactly `or`, one mention each; comma chains, three-item chains, `and/or`
   and sentence-spanning alternatives are not grouped.
9. **Negation is clause-local.** Long-distance and ambiguous negation is not
   modelled.
10. **Similarity has no accuracy target.** Do not report its percentage as
    accuracy; it is descriptive and length-sensitive.
11. **Detection is canonicalised for alternatives.** When one side of an
    annotated `A or B` group is evidenced, requirement detection compares it
    under the group label. That measures whether the posting's requirement was
    recognised, not whether the engine grouped it; grouping and counting are
    scored separately in the alternative-group unit.

## Reproduction checklist

1. Use the project's existing backend virtual environment.
2. Run `backend/venv/Scripts/python.exe evaluation/evaluation_runner.py`.
3. Compare `evaluation_results.json`; metrics are deterministic apart from
   runtime and the generation timestamp.
4. Run `backend/venv/Scripts/python.exe -m unittest discover -s backend/tests`
   to confirm the 166-test suite.
5. Do not modify labels to improve scores. If a production algorithm change is
   suggested by a finding, document it and request approval first.
