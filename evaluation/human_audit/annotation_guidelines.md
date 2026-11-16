# Annotation Guidelines — ResumeMatch Human Audit

**Status of the labels:** the expected labels in `reviewer_audit.csv` were drafted by
an AI coding assistant. They are provisional. Nothing in this package constitutes
human validation, and no reviewer response has been recorded.

These guidelines tell a human reviewer how to check those labels independently.
Read all of this document before opening a review file.

---

## 1. What you are auditing

You are auditing **the labels**, not the ResumeMatch engine.

For each review unit you decide one question:

> Reading the job description as a whole and the resume as a whole, is this
> requirement genuinely asked for, and does the resume provide reasonable
> evidence that the candidate has it?

You are not deciding whether the engine's keyword list looks plausible, whether
the score feels right, or whether the candidate would be hired. You are deciding
what a careful human reader would accept as the ground truth for this pair.

Do not open the application, run the engine, or read `evaluation_results.json`
before completing a blind review. The point of the audit is to find places where
the labels and the engine are both wrong, not to make them agree.

### Two passes

1. **Blind pass (required for independence).** Work from `blind_review.csv`
   only. It contains the resume text, the job description and the candidate
   review units, but no provisional labels, no evidence quotes and no engine
   predictions.
2. **Open audit pass (for adjudication).** Compare your blind decisions with
   `reviewer_audit.csv`, which shows the provisional labels and evidence. Record
   agreement or disagreement. This pass is where you explain a disagreement, not
   where you change a blind decision to match the AI label.

If you have already seen the provisional labels or the engine output for a pair,
say so in your notes. That pair's blind decision is no longer fully independent.

**Scope limitation.** The blind file lists the 325 candidate units derived from
the provisional annotation. It hides the labels, not the existence of the
candidates. The blind pass therefore tests classification and evidence
judgement; it does not independently discover the requirement set. If you
believe a requirement is missing from the list, record it in the notes for that
pair. The adjudicator can handle it as a label-set revision, but it is outside
the per-unit agreement calculation.

---

## 2. The evaluation unit

### 2.1 Logical requirement

One review unit is one **logical requirement**, expressed with the canonical
dictionary term used in the dataset. Repetition of the same term in a posting
does not create a second requirement. A duty sentence can imply a requirement
even when the word is not in a "Required:" list, but only when the duty clearly
demands that capability from the candidate.

### 2.2 Additive requirements

Requirements joined by **and**, or listed separately, are **additive**: each one
counts, and evidence for one does not satisfy another.

> Job: "Kotlin and Swift are required."
> Resume: "Android developer with Kotlin experience."
> Result: Kotlin = matched; Swift = missing. Two requirements, one satisfied.

> Job: "Python, SQL and Docker."
> Resume: "Python and Docker."
> Result: Python matched, Docker matched, SQL missing. Three requirements.

### 2.3 Alternative requirements

Two alternatives joined by exactly **or** form **one** logical requirement. The
whole group is one review unit, and its label is the group text, for example
`Python or R`.

| Resume evidence | Requirements counted | Status of the group |
| :-- | --: | :-- |
| Python only | 1 | matched |
| R only | 1 | matched |
| Python and R | 1 | matched (not two) |
| Neither | 1 | missing |

A group is satisfied when at least one alternative is genuinely evidenced. Do
not mark a group matched just because the candidate lists both alternatives
without evidence of use. Do not split a group into two rows; the individual
members are recorded in `alternative_group_members` for context only.

Alternative groups in this dataset use exactly the pattern `A or B`. Chains such
as `A, B or C`, `and/or`, and alternatives spread across sentences are outside
the dataset's grouping policy. If you find one, record it as a disagreement in
the notes rather than silently inventing a group.

### 2.4 Requirement strength

"Required", "preferred" and "nice to have" all count as requirements under this
dataset's policy. The engine's coverage metric counts every recognised job
requirement, so importance does not remove a unit from the review set. Note the
strength in your notes if it affected your decision; do not drop a preferred
skill from the audit.

### 2.5 Dictionary boundary

The keyword metrics can only represent the 182 entries in
`backend/skills_dictionary.json`. A genuine requirement outside that dictionary
is recorded as `out_of_dictionary` and excluded from keyword metrics. It is not
"missing" and it is not "not required". The evaluation reports it separately as
the dictionary ceiling. Appendix A lists all 182 canonical names; use it only for
this boundary decision.

Do not force an out-of-dictionary term into a dictionary synonym. If the posting
asks for Workday and the dictionary only has generic HRIS, those are different
requirements for this audit.

---

## 3. Classification labels

Use exactly one of these five values in every classification field.

| Label | Meaning | Typical evidence |
| :-- | :-- | :-- |
| `matched` | The posting genuinely requires it **and** the resume gives reasonable evidence of it. | A duty, project or tool use that shows the capability. |
| `missing` | The posting genuinely requires it **and** the resume does not give sufficient evidence. | No mention, negated mention, learning-only mention, title-only mention, unrelated homograph. |
| `not_required` | The posting does not actually ask the candidate for it. | "X is not required", company context, a tool the team uses, incidental prose, a job title with no duty. |
| `ambiguous` | A careful reader cannot reliably decide requirement status or evidence sufficiency from the text. | Team-tool mention, generic phrase that may or may not imply the skill, contradictory wording. |
| `out_of_dictionary` | It is a genuine requirement, but it has no representable entry in the 182-term dictionary. | Workday, Airflow, Storybook, Anaplan. |

`not_required` and `missing` are not interchangeable:

- `not_required` is about the **posting**: the employer never asked for it.
- `missing` is about the **resume**: the employer asked, but the resume does not
  show it.

A term that appears only in the resume, never in the posting, is not a review
unit at all. It should not be added as a requirement.

---

## 4. Evidence standard

### 4.1 What counts as reasonable evidence

Mark `matched` when the resume provides **reasonable textual evidence of the
relevant skill or experience**, judged from meaning rather than keyword overlap.
Reasonable evidence can be:

- a direct tool or technology mention tied to work ("built REST APIs with Flask");
- a duty that plainly requires the skill ("reconciled supplier accounts" for
  accounts payable);
- a recognisable synonym or standard abbreviation ("GA4" for Google Analytics 4,
  "statutory audits" for auditing);
- a project, internship or volunteer role where the work is described, not just
  the title.

Quotes in the `resume_evidence` column are provisional evidence recorded with the
AI label. Treat them as a pointer to check, not as proof. If the quote does not
support the label, that is a disagreement.

### 4.2 What is not sufficient evidence

Do not mark `matched` on any of the following alone:

- **Homographs and unrelated senses.** "I excel at communication", "react to
  feedback", "accounting for delays", "swift delivery", "rust removal", "express
  ideas". The word is present; the skill is not.
- **Negated mentions.** "No Kubernetes experience", "never used Docker", "not
  familiar with AWS".
- **Learning-only mentions.** "Currently learning Tableau", "completed a short
  Git course", "reading about dbt". See section 5.1 for the nuance.
- **Job-title-only mentions.** A title such as "HR Coordinator" or "Cost
  Accountant" does not by itself prove HRIS, payroll or cost-accounting skill.
  See section 5.2.
- **Company or team context.** "Our team uses Xero", "we work in Figma day to
  day", "you will partner with the sales team". The candidate is not being asked
  to bring that skill unless the posting says so.
- **Adjacent but different skills.** Java does not satisfy C#, generic Excel
  reconciliations do not automatically satisfy bank reconciliation, and
  supporting the sales team is not owning a sales target.

### 4.3 Thin but genuine evidence

A single genuine mention can be enough for a junior or entry-level requirement.
"Supported a recruitment fair once" is thin but is real recruitment exposure; it
may satisfy an entry-level `Recruitment` requirement while being insufficient for
a senior recruiter role. Record the reasoning in the notes.

If the requirement is senior or emphatic ("extensive", "expert", "5+ years") and
the evidence is a single peripheral mention, `ambiguous` is usually more honest
than `matched`. Do not use `ambiguous` to avoid making a decision, however: if
the text clearly supports one answer, choose it.

---

## 5. Special cases

### 5.1 Learning-only mentions

A phrase such as "currently learning Tableau" does **not** automatically count
as demonstrated professional experience. The default for a requirement that asks
for experience or proficiency is `missing`.

But do not mechanically mark every learning mention missing. Distinguish:

| Posting asks for | Resume says | Suggested label |
| :-- | :-- | :-- |
| "Tableau experience required" | "Currently learning Tableau" | `missing` — learning is not demonstrated experience |
| "Familiarity with Tableau" | "Currently learning Tableau" | `matched` or `ambiguous` — the posting asks for familiarity, and active learning is some familiarity; explain |
| "Willingness to learn Tableau" | "Currently learning Tableau" | `matched` — the requirement is willingness, which is evidenced |
| "Tableau required" | "Completed a Tableau course with a dashboard project" | likely `matched` — course plus applied project is more than passive learning |

The test is what the posting asks for and whether the resume shows applied use.
State which reading you used in the notes.

### 5.2 Job-title mention

A skill appearing only as part of a job title does not automatically prove
proficiency.

> Posting: "HR Coordinator. Required: HRIS, onboarding, recruitment."
> Resume: "HR Coordinator" with calendar and supply duties, no HRIS work.
> HRIS = `missing`; recruitment may be `matched` only if the resume describes
> recruitment work, not merely the title.

A title can support context, and a duty described under that title can be
evidence. The title alone is not.

Be careful with titles that are also tool names: "Illustrator", "Accountant",
"Project Manager". "Illustrator" as a job title is not proof of Adobe
Illustrator. If the posting asks for the Adobe tool and the resume only says
"Illustrator" as a role, mark `ambiguous` and explain, unless other text settles
it.

### 5.3 Negation

**Posting-side negation.** A requirement explicitly described as not required
must not be counted as required. Mark it `not_required` even if the resume
mentions it.

> "Kubernetes is not required for this role." → Kubernetes = `not_required`.
> A resume mention of Kubernetes does not turn it into a requirement.

**Resume-side negation.** A skill the resume explicitly denies must not be
credited. Mark it `missing`.

> "I have no Swift experience but I am eager to learn iOS." → Swift = `missing`.
> eagerness to learn is not Swift experience.

**Double negation and litotes.** "Not unfamiliar with Docker", "no problem using
Python", "not only Python but also SQL" are not negations of the skill. Read the
sentence's meaning. If the construction is genuinely confusing, `ambiguous` with
a note is acceptable.

**Long-distance negation.** If the negation appears in a different sentence or
clause and the reference is unclear, do not guess. Mark `ambiguous` and quote
both parts.

### 5.4 Alternatives

See section 2.3. One group is one unit. Check both directions:

- one alternative evidenced → group `matched`, counted once;
- both alternatives evidenced → group `matched`, still counted once;
- neither evidenced → group `missing`, counted once;
- one alternative negated in the resume and the other evidenced → group
  `matched`, because at least one alternative is satisfied.

### 5.5 Additive requirements

See section 2.2. Each additive requirement is its own row. Do not merge
"Kotlin and Swift" into one unit, and do not let Kotlin evidence satisfy Swift.

### 5.6 Ambiguity

Mark `ambiguous` only when the text genuinely does not support a reliable
classification, and explain why in the notes. Good reasons:

- the posting names a tool only as something the team uses, not as a candidate
  requirement;
- a duty could imply the skill but does not state it, and the implication is not
  strong enough to count;
- the resume evidence could be the skill or an unrelated homograph, and the rest
  of the document does not resolve it;
- the posting contradicts itself about whether the skill is required.

Poor reasons:

- the decision is time-consuming;
- the term is outside the dictionary (use `out_of_dictionary`);
- you disagree with the AI label but the text is clear (use `matched`,
  `missing` or `not_required` and explain).

Ambiguous units are excluded from the keyword metrics. Using `ambiguous` too
freely shrinks the usable benchmark; using it never hides a genuine edge case.
Report the count in your notes.

### 5.7 Preferred, optional and duty-implied requirements

A preferred or optional skill is still a requirement for coverage purposes.
A duty-implied requirement counts only when the duty plainly needs the skill:

> "You will maintain the general ledger" implies general-ledger accounting.
> "You will attend team meetings" does not imply project management.

### 5.8 Tools named as benefits or company context

"We offer a learning budget" is not a requirement for learning. "Our finance
team uses Xero" is not necessarily a requirement that the candidate know Xero.
When the posting is genuinely unclear about whether the candidate must bring the
tool, `ambiguous` is appropriate. Do not convert company context into a
requirement merely because the term is in the dictionary.

---

## 6. Worked examples by domain

These examples are illustrative and are **not** copied from the audit units.
They show the reasoning standard, not the answers for any particular pair.

### 6.1 Software development

> **Job:** "Backend engineer. Python or Java required. Docker required.
> Kubernetes is not required."
> **Resume:** "Built Flask services in Python. Containerised them with Docker.
> I have never used Kubernetes."

- `Python or Java` = **matched**. Python alone satisfies the group; counted once.
- `Docker` = **matched** ("containerised them with Docker").
- `Kubernetes` = **not_required**. The posting explicitly excludes it. The
  resume negation is consistent but does not make it a requirement.

> **Job:** "Go required. You will build high-throughput services."
> **Resume:** "Currently learning Go; built services in Python."

- `Go` = **missing**. Learning is not demonstrated Go experience for a role that
  asks for it. If the posting had said "familiarity with Go or willingness to
  learn", the answer could differ.

### 6.2 Digital marketing

> **Job:** "Google Ads required. Meta Ads is not required. GA4 required."
> **Resume:** "Ran Meta Ads campaigns and reported results in GA4."

- `Google Ads` = **missing**. Meta Ads is a different platform.
- `Meta Ads` = **not_required**. The posting explicitly excludes it; a resume
  match does not create a requirement.
- `GA4` = **matched**. GA4 is the standard abbreviation for Google Analytics 4.

> **Job:** "CRO required."
> **Resume:** "Improved landing-page conversion; I have not run formal CRO tests."

- `CRO` = **missing**. The resume describes related work but explicitly denies
  formal CRO experience. If the posting asked for "conversion awareness", the
  answer might be `matched`; the wording matters.

### 6.3 Graphic design / UI-UX

> **Job:** "Adobe Illustrator required. Figma or Adobe XD required."
> **Resume:** "Designed brand identities in Adobe Illustrator. Built wireframes
> in Figma."

- `Adobe Illustrator` = **matched** (tool tied to design work).
- `Figma or Adobe XD` = **matched**, counted once, even though only Figma is
  evidenced.

> **Job:** "Strong portfolio and typography required."
> **Resume:** "Graphic designer with print layouts and brand identities."

- `Typography` = **ambiguous** if the resume never mentions type work; the title
  alone does not prove it. `Portfolio` may be `out_of_dictionary` if the
  dictionary has no entry, even though it is a genuine requirement.

> **Homograph:** resume says "Illustrator with five years of experience" but
> never names Adobe. `Adobe Illustrator` = **ambiguous**, not automatic match.

### 6.4 Data analysis

> **Job:** "SQL required. Power BI or Tableau required. Tableau preferred is not
> required." *(read the posting carefully: the last phrase is a negation)*
> **Resume:** "Wrote SQL queries. Built dashboards in Power BI and Tableau."

- `SQL` = **matched**.
- `Power BI or Tableau` = **matched**, counted once even though both are present.
- `Tableau` as a separate excluded term = **not_required** if the posting says it
  is not required. Do not count it twice.

> **Job:** "ETL pipelines required."
> **Resume:** "Built nightly data loads from several sources into a warehouse."

- `ETL` = **ambiguous**. The work may be ETL, but the resume does not say
  extract-transform-load or describe the stages. A reviewer who knows the domain
  may accept it; record the reasoning. Do not mark matched solely because "data"
  appears.

### 6.5 Human resources

> **Job:** "Payroll required. HRIS required. Recruitment support required."
> **Resume:** "Processed monthly payroll for 120 staff. Coordinated interview
> scheduling for three roles. No HRIS experience."

- `Payroll` = **matched**.
- `Recruitment` = **matched** (coordination of interviews is recruitment support),
  though thin; note the scope.
- `HRIS` = **missing**. The resume explicitly denies it.

> **Job:** "HRIS administration required."
> **Resume:** "HR Coordinator. Managed calendars and onboarding paperwork."

- `HRIS` = **missing** or **ambiguous**. The title and onboarding paperwork do not
  name an HRIS. Use `missing` if the posting demands hands-on HRIS administration
  and nothing suggests it; use `ambiguous` only if the onboarding system is
  plausibly an HRIS but unnamed.

### 6.6 Finance / accounting

> **Job:** "IFRS required. Bank reconciliation required. SAP is not required."
> **Resume:** "Prepared statutory accounts under IFRS. Completed month-end Excel
> reconciliations. Used SAP in a previous role."

- `IFRS` = **matched** ("statutory accounts under IFRS").
- `Bank reconciliation` = **missing**. "Excel reconciliations" does not establish
  bank reconciliation specifically; generic reconciliation is a different unit.
- `SAP` = **not_required**. The posting excludes it; the resume mention is
  irrelevant to the requirement set.

> **Job:** "Auditing required" for a senior audit lead.
> **Resume:** "Supported the internal audit team with evidence requests."

- Likely **ambiguous** or **missing** for a senior lead requirement: supporting
  evidence requests is exposure, not leading audits. For an entry-level audit
  assistant, the same sentence could be `matched`. State the role context.

### 6.7 Business and administration

> **Job:** "Team management required. Sales required. PMP is not required."
> **Resume:** "Managed a team of twelve. Worked closely with the sales team on
> handovers. PMP certified."

- `Team management` = **matched**.
- `Sales` = **missing** or **ambiguous**. Working with sales is not owning a sales
  target; if the posting only asks for sales awareness, the answer may differ.
- `PMP` = **not_required** despite the certification. The posting excludes it.

> **Job:** "Project management required."
> **Resume:** "Project manager. Coordinated a supplier review and kept the
> timetable current."

- `Project management` = **ambiguous**. The title plus coordination may be
  project work, but the resume does not describe end-to-end project ownership.
  If it said "led a cross-functional project from initiation to delivery", that
  would be **matched**.

---

## 7. Recording decisions

Use the exact column names in the CSV. Do not add, remove or reorder columns; the
verification and agreement scripts rely on them.

| Column | What to write |
| :-- | :-- |
| `reviewer_1_classification` / `reviewer_2_classification` | One of `matched`, `missing`, `not_required`, `ambiguous`, `out_of_dictionary`. Leave blank only until that reviewer has judged the unit. |
| `reviewer_1_notes` / `reviewer_2_notes` | Required for every `ambiguous`, `not_required` or non-obvious decision, and for every disagreement. Quote the relevant phrase and give one sentence of reasoning. |
| `final_adjudicated_classification` | Filled only during adjudication, after both reviews. One of the five labels. |
| `adjudication_notes` | Why the final label was chosen, especially when it differs from one or both reviewers. Reference the evidence, not the engine. |

Do not edit `expected_classification`, `expected_status`, `resume_evidence`,
`job_description_evidence` or any other provisional field. If a provisional
label is wrong, record the disagreement; the audited dataset is built later from
the adjudicated column, not by editing the source dataset.

Keep `requirement_id` unchanged. It is the join key between the audit form, the
blind form and the agreement script.

The two evidence columns are pointers, not authority. `resume_evidence` is the
provisional evidence quote recorded with the AI label; `job_description_evidence`
is a mechanically extracted verbatim sentence from the posting. Verify both
against the full text. An empty resume-evidence cell for a `missing` unit is
expected; a quote in a resume-negated unit is the negation itself, not supporting
evidence.

### Notes style

Good: `not_required — "Our finance team uses Xero" describes the team's tool,
not a candidate requirement.`

Poor: `wrong`, `disagree`, `AI error`.

The note should let a reader who has not seen the pair understand the decision.

---

## 8. Two reviewers, agreement and adjudication

### 8.1 Independence

Reviewer 1 and Reviewer 2 must complete the blind pass **without discussing the
pairs or seeing each other's answers**. Each gets a separate copy of
`blind_review.csv` (for example `blind_review_reviewer1.csv` and
`blind_review_reviewer2.csv`). Do not send `reviewer_audit.csv`,
`evaluation_results.json` or `evaluation_report.md` to a blind reviewer.

If only the project author completes the audit, say so. That is a
single-reviewer audit, not inter-annotator agreement, and no kappa should be
reported. The author is also not independent of the system being evaluated; a
second reviewer is what makes the agreement statistic meaningful.

### 8.2 Agreement percentage

For two completed blind reviews over the same units:

```
agreement % = units with identical classifications / total units × 100
```

Report the numerator and denominator, not only the percentage. Also report the
number of disagreements and their distribution by category. A high percentage
can hide class imbalance: if 90% of units are `matched`, two reviewers who both
default to `matched` will look highly agreeable.

The helper script computes this and refuses to run on incomplete files:

```bash
backend/venv/Scripts/python.exe evaluation/human_audit/agreement.py \
  --reviewer1 evaluation/human_audit/blind_review_reviewer1.csv \
  --reviewer2 evaluation/human_audit/blind_review_reviewer2.csv
```

It writes `agreement_report.md` and `disagreement_log.csv` in
`evaluation/human_audit/`. It never reads the provisional labels; it rejects
input files that contain expected or predicted columns.

### 8.3 Cohen's kappa and its assumptions

Cohen's kappa compares observed agreement with agreement expected by chance for
two raters using nominal categories:

```
kappa = (Po - Pe) / (1 - Pe)
```

Report kappa only when **all** of these hold:

1. exactly two reviewers;
2. the same units, with no missing classifications;
3. independent coding (no discussion before both finish);
4. mutually exclusive nominal categories (the five labels here);
5. the units are the objects of measurement.

Condition 5 is only partly satisfied in this dataset: 325 requirement units are
clustered inside 70 pairs, so units within a pair are not independent. The kappa
point estimate is still descriptive, but do not attach a confidence interval,
p-value or strong inferential claim to it. State the clustering limitation next
to the number.

Kappa is also unstable when one category dominates. Always report raw agreement
and the category counts alongside kappa. Do not describe a kappa using
"substantial" or "almost perfect" as if those words were validity thresholds;
they are conventions, not evidence that the labels are correct.

If the assumptions do not hold, report raw agreement and the disagreement log
only. Do not calculate kappa anyway "for completeness".

Never compute agreement between a reviewer and the AI-drafted labels. That is
not inter-annotator agreement, and it would treat the provisional labels as a
rater.

### 8.4 Disagreement categories

Assign one category to each disagreement during adjudication. Use these labels
consistently:

| Category | Meaning |
| :-- | :-- |
| `requirement_scope` | One reviewer counts a term as a requirement; the other does not. |
| `evidence_sufficiency` | Both accept the requirement; they differ on whether the resume evidence is enough. |
| `negation` | The disagreement turns on a posting-side or resume-side negation. |
| `alternative_grouping` | The disagreement turns on whether alternatives form one unit or how a group is satisfied. |
| `ambiguity` | One reviewer can classify; the other believes the text is genuinely ambiguous. |
| `dictionary_boundary` | The disagreement is about whether a term is representable in the dictionary. |
| `other` | Anything else; explain in the notes. |

### 8.5 Adjudication

After both blind reviews and the agreement calculation:

1. Discuss only the disagreements (plus any unit either reviewer marked
   `ambiguous`).
2. Re-read the full posting and resume. Do not consult the engine's prediction
   while deciding. The engine's output is not evidence about the text.
3. Choose a final label for **every** unit, including agreed units. Copy the
   agreed label or record the adjudicated one.
4. Write a note for every disagreement explaining the evidence that settled it.
   If it cannot be settled, use `ambiguous` and say why.
5. If a third adjudicator is available, they decide unresolved disagreements and
   their reasoning is recorded. Do not invent a third reviewer.
6. Freeze the adjudicated file and record the date and reviewer identities in
   `audited_dataset.json`.

Final labels may differ from both reviewers. That is allowed and should be
explained, not hidden.

---

## 9. Common mistakes to avoid

- **Matching words, not meaning.** "Excel at communication" is not Excel.
- **Treating a job title as a skill.** "HR Coordinator" is not HRIS.
- **Counting both alternatives as two requirements.** `Python or R` is one.
- **Counting an additive list as one requirement.** `Kotlin and Swift` is two.
- **Turning a posting negation into a requirement** because the resume mentions
  the term.
- **Crediting a resume negation** because the skill word appears.
- **Marking learning as professional experience** for an experience requirement.
- **Using `ambiguous` for every hard call.** Decide when the text supports a
  decision and explain the edge.
- **Using `out_of_dictionary` as a synonym for missing.** It is a measurement
  boundary, not a resume judgement.
- **Editing provisional labels instead of recording a disagreement.**
- **Computing agreement against the AI labels.**
- **Reporting kappa from one reviewer or from incomplete files.**

---

## 10. Limits of this audit

Completing this package improves the transparency of the evaluation; it does not
turn a synthetic, 70-pair dataset into a representative benchmark. Even after a
perfect audit:

- the pairs are synthetic and were written to exercise documented behaviours;
- the labels use canonical dictionary names, so dictionary coverage remains part
  of the measurement boundary;
- 325 units across 70 pairs are too few for stable domain-level inference;
- two reviewers auditing AI-drafted labels reduce, but do not eliminate, the
  original annotator's framing;
- agreement measures consistency between these two reviewers, not correctness
  against the world.

Report the audit as a label-verification exercise, not as proof that the system
generalises.

---

## Appendix A — Canonical dictionary names (182)

Use this list only to decide whether a genuine requirement is representable. It is
not a list of requirements for any pair, and a name appearing here does not mean
the posting asks for it.

.NET; Accounting; Accounts Payable; Accounts Receivable; Active Listening; Adobe
Illustrator; Adobe InDesign; Adobe Photoshop; Adobe XD; Agile; Angular; Auditing;
AWS; Azure; Bank Reconciliation; Bash; BigQuery; Bookkeeping; Branding; Budgeting;
Business Development; C#; C++; Campaign Management; Canva; CI/CD; Client Relations;
Cloud Computing; Code Review; Communication; Conflict Resolution; Confluence;
Content Marketing; Conversion Rate Optimization; Copywriting; Cosine Similarity;
CRM; Cross-Functional Collaboration; CSS3; Cypress; Data Analysis; Data Cleaning;
Data Modeling; Data Structures & Algorithms; Data Visualization; Deep Learning;
Django; Docker; DynamoDB; Elasticsearch; Email Marketing; Employee Relations; ERP;
ETL; Excel; Express.js; FastAPI; Figma; Financial Analysis; Financial Reporting;
Firebase; Flask; Forecasting; GAAP; General Ledger; Git; Go (Golang); Google Ads;
Google Analytics; Google Cloud Platform; Google Search Console; Google Sheets;
Grafana; GraphQL; Helm; HRIS; HTML5; Human Resources; IFRS; Integration Testing;
Java; JavaScript; Jenkins; Jira; Jupyter; Kanban; Keyword Research; Kotlin;
KPI Tracking; Kubernetes; Lead Generation; Leadership; Linux; Machine Learning;
Market Research; Marketing Automation; Marketing Strategy; MATLAB; Mentorship;
Meta Ads; Microservices; Microsoft Office; MongoDB; Motion Graphics; MySQL;
Natural Language Processing; Negotiation; Next.js; Nginx; Node.js; NumPy;
Object-Oriented Programming; Onboarding; Oracle Database; Pandas; Payroll;
Performance Management; PHP; PMP; PostgreSQL; Postman; Power BI; Problem Solving;
Product Roadmap; Project Management; Prometheus; Prototyping; Public Speaking;
Python; PyTorch; QuickBooks; R; React; Recruitment; Redis; Redux; Reporting;
REST APIs; Risk Management; Ruby; Rust; Sales; SAP; Scala; Scikit-learn; Scrum;
Selenium; SEM & PPC; SEO; Shopify; Snowflake; Social Media Marketing;
Sprint Planning; SQL; SQLite; Stakeholder Management; Statistics;
Strategic Planning; Streamlit; Swift; Tableau; Tailwind CSS; Tally; Taxation;
Team Management; TensorFlow; Terraform; TF-IDF; Time Management;
Training and Development; Trello; TypeScript; Typography; UI/UX Design;
Unit Testing; Video Editing; Vite; Vue.js; Webpack; Wireframing; WordPress; Xero.
