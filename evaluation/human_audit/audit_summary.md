# Human Audit Summary

**Status: AUDIT PACKAGE PREPARED — HUMAN REVIEW NOT COMPLETED.**

The expected labels in this package are the existing provisional labels drafted by the AI coding assistant. They have not been independently verified by a human. No reviewer responses, agreement statistics or adjudicated labels exist yet. Until the steps in `README.md` are completed, every precision, recall and F1 figure produced from these labels remains provisional.

## 1. Dataset coverage

| Measure | Count |
| :-- | --: |
| Resume/job-description pairs | 70 |
| Domains | 7 |
| Logical dictionary-representable requirements | 309 |
| Alternative (`A or B`) groups counted once | 11 |
| Job-description negations (excluded terms) | 5 |
| Resume negations (missing requirements) | 4 |
| Ambiguous terms | 2 |
| Out-of-dictionary requirements | 9 |
| Total review units in the audit CSVs | 325 |

The 309 requirements include the 11 alternative groups as one logical unit each. The 4 resume-negated terms are requirements already counted there; they are not additional units. The 5 job-negated terms, 2 ambiguous terms and 9 out-of-dictionary requirements are additional review units, which is why the audit forms contain 325 rows.

## 2. Pairs and review units per domain

| Domain | Pairs | Requirements | Alternative groups | Job-side negations | Resume-side negations | Ambiguous | Out-of-dictionary | Review units |
| :-- | --: | --: | --: | --: | --: | --: | --: | --: |
| Software Development | 10 | 53 | 4 | 1 | 1 | 0 | 2 | 56 |
| Digital Marketing | 10 | 42 | 1 | 1 | 1 | 0 | 1 | 44 |
| Graphic Design / UI-UX | 10 | 43 | 1 | 0 | 1 | 1 | 1 | 45 |
| Data Analysis | 10 | 44 | 2 | 1 | 0 | 0 | 2 | 47 |
| Human Resources | 10 | 42 | 1 | 0 | 1 | 0 | 1 | 43 |
| Finance / Accounting | 10 | 40 | 1 | 1 | 0 | 1 | 1 | 43 |
| Business & Administration | 10 | 45 | 1 | 1 | 0 | 0 | 1 | 47 |
| **Total** | **70** | **309** | **11** | **5** | **4** | **2** | **9** | **325** |

## 3. Alternative-group inventory

| Pair | Domain | Group | Members | Provisional status |
| :-- | :-- | :-- | :-- | :-- |
| SD-02 | Software Development | React or Angular | React, Angular | satisfied |
| SD-03 | Software Development | Django or Flask | Django, Flask | satisfied |
| SD-09 | Software Development | Python or R | Python, R | satisfied |
| SD-10 | Software Development | React or Vue.js | React, Vue.js | missing |
| DM-06 | Digital Marketing | Google Ads or Meta Ads | Google Ads, Meta Ads | satisfied |
| GD-04 | Graphic Design / UI-UX | Adobe Photoshop or Adobe Illustrator | Adobe Photoshop, Adobe Illustrator | satisfied |
| DA-03 | Data Analysis | Power BI or Tableau | Power BI, Tableau | satisfied |
| DA-06 | Data Analysis | Power BI or Tableau | Power BI, Tableau | satisfied |
| HR-05 | Human Resources | Excel or Google Sheets | Excel, Google Sheets | satisfied |
| FA-06 | Finance / Accounting | QuickBooks or Xero | QuickBooks, Xero | satisfied |
| BA-05 | Business & Administration | Jira or Trello | Jira, Trello | satisfied |

## 4. Negation inventory

| Pair | Term | Side | Provisional effect |
| :-- | :-- | :-- | :-- |
| SD-01 | Kubernetes | job description | not a requirement |
| DM-07 | Google Ads | job description | not a requirement |
| DA-08 | Tableau | job description | not a requirement |
| FA-07 | SAP | job description | not a requirement |
| BA-07 | PMP | job description | not a requirement |
| SD-06 | Swift | resume | not resume evidence; requirement is missing |
| DM-09 | Conversion Rate Optimization | resume | not resume evidence; requirement is missing |
| GD-08 | Adobe Illustrator | resume | not resume evidence; requirement is missing |
| HR-06 | Payroll | resume | not resume evidence; requirement is missing |

## 5. Ambiguous and out-of-dictionary inventory

| Pair | Term | Provisional treatment | Reason |
| :-- | :-- | :-- | :-- |
| GD-09 | Figma | ambiguous, excluded from metrics | named as a team tool, not clearly stated as a candidate requirement |
| FA-02 | Xero | ambiguous, excluded from metrics | named as a team tool, not clearly stated as a candidate requirement |
| SD-02 | Storybook | out of dictionary, excluded from keyword metrics | reported separately as the dictionary ceiling |
| SD-07 | Airflow | out of dictionary, excluded from keyword metrics | reported separately as the dictionary ceiling |
| DM-01 | Screaming Frog | out of dictionary, excluded from keyword metrics | reported separately as the dictionary ceiling |
| GD-01 | UserTesting | out of dictionary, excluded from keyword metrics | reported separately as the dictionary ceiling |
| DA-01 | Looker | out of dictionary, excluded from keyword metrics | reported separately as the dictionary ceiling |
| DA-04 | dbt | out of dictionary, excluded from keyword metrics | reported separately as the dictionary ceiling |
| HR-01 | Workday | out of dictionary, excluded from keyword metrics | reported separately as the dictionary ceiling |
| FA-01 | Anaplan | out of dictionary, excluded from keyword metrics | reported separately as the dictionary ceiling |
| BA-03 | Asana | out of dictionary, excluded from keyword metrics | reported separately as the dictionary ceiling |

## 6. What this package can and cannot support

**Can support, once completed:**

- Independent human verification of each provisional classification.
- A documented disagreement and adjudication record.
- Observed agreement between two blind reviewers and, if the assumptions hold, Cohen's kappa.
- A transparent comparison between provisional and audited evaluation results.

**Cannot support yet:**

- Any claim that the labels are human-validated.
- Any inter-annotator agreement statistic; none has been computed.
- Any claim of independent verification or of a second reviewer having participated.
- Any claim that the benchmark generalises beyond these 70 synthetic pairs.
- Independent discovery of requirements the provisional annotation missed; the blind file fixes the candidate unit list, though reviewers may flag omissions in their notes.

## 7. Label provenance and a documentation inconsistency to correct

The dataset's `annotator` field, the evaluation README and the results metadata all state that the labels were drafted by the AI coding assistant and are not human-validated. However, the dataset manifest's top-level `description` says the pairs were "labelled by a human annotator". That sentence is inconsistent with the `annotator` field and with the actual provenance.

The audit package deliberately does **not** edit the dataset. Correct that sentence only as part of a separately reviewed dataset revision, and never before the human audit is complete. Do not use the description sentence as evidence of human annotation.

## 8. Provenance snapshot (files that must not change)

| File | SHA-256 |
| :-- | :-- |
| `evaluation/evaluation_dataset.json` | `08eeaebe168acb662ac4c5c42cb18088c1c629ad276bd3b9e0bd15e78397a79e` |
| `evaluation/dataset/01_software_development.json` | `8e21b344f55a36418fdffff822e017f25ab78993571427334f17d7468a7b838d` |
| `evaluation/dataset/02_digital_marketing.json` | `b4b366988d205f566f0c3227ecde39748da8016546f17852bed74373ec79afde` |
| `evaluation/dataset/03_graphic_design_uiux.json` | `6a0b1ea077c95c9c58467e2b302c7bb82f69379d3c97499d45dc6624c3f73ae2` |
| `evaluation/dataset/04_data_analysis.json` | `d35c14f8d679e1fe86bf25dd564103e03b8c0690c34c4a78732aa29caaf49732` |
| `evaluation/dataset/05_human_resources.json` | `9f7635c39cf45902ffbddda44fe4f7d59abf28c3e5c058913d8f72b653dbba7d` |
| `evaluation/dataset/06_finance_accounting.json` | `ecb38df1a2d8855694751c3b711ce33c471e4a45098bce8377948c241a4ad79f` |
| `evaluation/dataset/07_business_administration.json` | `d6a2381cd8f53338323cbf2492ae7340169de202d6eb1adbf18d7cf97e587776` |
| `evaluation/evaluation_results.json` | `52b9b36d66d55506f721e53b64510e2efcedb80b5f31a6653ffc37c35c346d2a` |
| `evaluation/evaluation_report.md` | `d96ab6d104a10937d36c337467e4266082e64ba8c6d746af4fbde855a8618261` |

`verify_audit_package.py` embeds these digests and fails if any protected file changes. This is the evidence that the audit package was derived without modifying the original dataset or the original benchmark results.

## 9. Package contents

| File | Purpose |
| :-- | :-- |
| `annotation_guidelines.md` | Reviewer instructions, category definitions, worked examples, agreement and adjudication process |
| `reviewer_audit.csv` | 325 review units with provisional labels and blank reviewer/adjudication fields |
| `blind_review.csv` | 325 units with source texts only; no provisional labels, evidence or system predictions |
| `audit_summary.md` | This document |
| `README.md` | Workflow, commands and evaluation-integration procedure |
| `verify_audit_package.py` | Read-only structural and provenance verification |
| `agreement.py` | Agreement and Cohen's kappa calculator for two completed blind reviews |
| `../audited_dataset.json` | Template for the audited dataset; contains no human labels and cannot be evaluated as-is |

## 10. Verification performed at preparation time

Structural verification is performed by `verify_audit_package.py`; its output is reproduced in the final preparation report. It checks pair/domain coverage, the 325 units, label fidelity, blank reviewer fields, blind-file column restrictions and the protected-file digests. It does not verify meaning: only a human reviewer can do that.

