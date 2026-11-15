"""Tests for the offline evaluation dataset and harness.

These tests do not change the application. They verify that the labelled dataset
is structurally coherent, that the metric arithmetic behaves as documented, and
that the harness can regenerate its outputs.
"""

import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = PROJECT_ROOT / "backend"
EVAL_DIR = PROJECT_ROOT / "evaluation"
for path in (str(BACKEND_DIR), str(EVAL_DIR)):
    if path not in sys.path:
        sys.path.insert(0, path)

import evaluation_runner as harness


def fake_result(matched, missing, coverage=None):
    def item(keyword, frequency=1):
        return {
            "keyword": keyword,
            "category": "Test",
            "job_frequency": frequency,
            "resume_frequency": frequency if keyword in matched else 0,
        }

    total = len(matched) + len(missing)
    return {
        "matched_keywords": [item(keyword) for keyword in matched],
        "missing_keywords": [item(keyword) for keyword in missing],
        "matched_keyword_count": len(matched),
        "job_keyword_count": total,
        "keyword_coverage": (
            round(len(matched) / total * 100.0, 1) if coverage is None and total else (coverage or 0.0)
        ),
        "match_percentage": 40.0,
    }


def minimal_pair(**overrides):
    pair = {
        "id": "TEST-01",
        "domain": "Software Development",
        "job_title": "Test role",
        "seniority": "Mid",
        "match_strength": "moderate",
        "resume_style": "prose",
        "resume": "Test resume",
        "job_description": "Test posting",
        "expected_requirements": ["Python or R", "SQL"],
        "expected_matched": ["Python or R"],
        "expected_missing": ["SQL"],
        "expected_alternative_groups": [
            {"label": "Python or R", "members": ["Python", "R"], "satisfied": True}
        ],
        "expected_excluded": [
            {"term": "Kubernetes", "source": "job_description", "reason": "not required"}
        ],
        "resume_negated_terms": [],
        "ambiguous": [],
        "unmeasured_requirements": [],
        "evidence": {"Python or R": "R programming"},
        "expected_count": 2,
        "notes": "fixture",
    }
    pair.update(overrides)
    return pair


class EvaluationDatasetTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest, cls.pairs = harness.load_dataset(harness.DEFAULT_DATASET)
        cls.names = harness.dictionary_names()

    def test_dataset_has_seventy_pairs_and_seven_domains(self):
        self.assertEqual(len(self.pairs), 70)
        self.assertEqual(len(self.manifest["domains"]), 7)
        counts = {domain: 0 for domain in harness.EXPECTED_DOMAINS}
        for pair in self.pairs:
            counts[pair["domain"]] += 1
        self.assertEqual(set(counts), set(harness.EXPECTED_DOMAINS))
        self.assertTrue(all(count == 10 for count in counts.values()))

    def test_dataset_validation_passes(self):
        self.assertEqual(
            harness.validate_dataset(self.manifest, self.pairs, self.names), []
        )

    def test_every_pair_has_a_complete_expected_classification(self):
        for pair in self.pairs:
            with self.subTest(pair=pair["id"]):
                requirements = set(pair["expected_requirements"])
                matched = set(pair["expected_matched"])
                missing = set(pair["expected_missing"])
                self.assertEqual(matched | missing, requirements)
                self.assertFalse(matched & missing)
                self.assertEqual(pair["expected_count"], len(requirements))
                self.assertTrue(pair["notes"])
                for term in matched:
                    self.assertIn(term, pair["evidence"])

    def test_dataset_covers_documented_edge_cases(self):
        groups = sum(len(pair["expected_alternative_groups"]) for pair in self.pairs)
        job_negations = sum(len(pair["expected_excluded"]) for pair in self.pairs)
        resume_negations = sum(len(pair["resume_negated_terms"]) for pair in self.pairs)
        ambiguous = sum(len(pair["ambiguous"]) for pair in self.pairs)
        unmeasured = sum(len(pair["unmeasured_requirements"]) for pair in self.pairs)

        self.assertGreaterEqual(groups, 10)
        self.assertGreaterEqual(job_negations, 5)
        self.assertGreaterEqual(resume_negations, 4)
        self.assertGreaterEqual(ambiguous, 2)
        self.assertGreaterEqual(unmeasured, 5)

    def test_unmeasured_and_ambiguous_terms_are_outside_requirement_lists(self):
        for pair in self.pairs:
            for term in pair["unmeasured_requirements"]:
                self.assertNotIn(term, pair["expected_requirements"])
            for item in pair["ambiguous"]:
                self.assertNotIn(item["term"], pair["expected_requirements"])

    def test_document_lengths_include_short_medium_and_long_examples(self):
        resume_lengths = [len(pair["resume"].split()) for pair in self.pairs]
        jd_lengths = [len(pair["job_description"].split()) for pair in self.pairs]
        self.assertLessEqual(min(resume_lengths), 30)
        self.assertGreater(max(resume_lengths), 140)
        self.assertLessEqual(min(jd_lengths), 20)
        self.assertGreater(max(jd_lengths), 100)

    def test_validation_detects_a_broken_label(self):
        broken = copy.deepcopy(self.pairs)
        broken[0]["expected_missing"] = list(broken[0]["expected_missing"]) + ["Docker"]
        if "Docker" in broken[0]["expected_requirements"]:
            broken[0]["expected_missing"] = list(broken[0]["expected_missing"]) + ["Terraform"]
        errors = harness.validate_dataset(self.manifest, broken, self.names)
        self.assertTrue(any("matched+missing" in error for error in errors))


class EvaluationMetricTests(unittest.TestCase):
    def test_one_evidenced_alternative_counts_as_the_group(self):
        record = harness.evaluate_pair(
            minimal_pair(), fake_result(["R"], ["SQL"])
        )
        self.assertEqual(record["predicted"]["requirements"], ["Python or R", "SQL"])
        self.assertEqual(record["count"]["exact"], True)
        self.assertEqual(record["detection"], {
            "tp": 2, "fp": 0, "fn": 0,
            "precision": 1.0, "recall": 1.0, "f1": 1.0,
            "fp_terms": [], "fn_terms": [],
        })
        group = record["alternative_groups"][0]
        self.assertTrue(group["counted_once"])
        self.assertEqual(group["representation"], "single_member")
        self.assertTrue(group["correct"])

    def test_split_alternatives_are_a_count_error_even_when_semantically_present(self):
        record = harness.evaluate_pair(
            minimal_pair(), fake_result(["Python", "R"], ["SQL"])
        )
        self.assertEqual(record["count"]["predicted_adjusted"], 3)
        self.assertFalse(record["count"]["exact"])
        group = record["alternative_groups"][0]
        self.assertFalse(group["counted_once"])
        self.assertFalse(group["correct"])
        self.assertEqual(group["representation"], "split_members")
        self.assertTrue(
            any(error["category"] == "alternative_group_split" for error in record["errors"])
        )

    def test_group_label_represents_one_satisfied_requirement(self):
        record = harness.evaluate_pair(
            minimal_pair(), fake_result(["Python or R"], ["SQL"])
        )
        self.assertEqual(record["count"]["predicted_adjusted"], 2)
        self.assertEqual(record["count"]["error"], 0)
        self.assertTrue(record["alternative_groups"][0]["correct"])

    def test_unsatisfied_group_is_one_missing_requirement(self):
        pair = minimal_pair(
            expected_matched=[],
            expected_missing=["Python or R", "SQL"],
            expected_alternative_groups=[
                {"label": "Python or R", "members": ["Python", "R"], "satisfied": False}
            ],
            evidence={},
        )
        record = harness.evaluate_pair(
            pair, fake_result([], ["Python or R", "SQL"])
        )
        self.assertEqual(record["count"]["exact"], True)
        self.assertEqual(record["matched_identification"]["tp"], 0)
        self.assertEqual(record["missing_identification"]["tp"], 2)
        self.assertTrue(record["alternative_groups"][0]["correct"])

    def test_negated_posting_term_is_not_a_requirement(self):
        record = harness.evaluate_pair(
            minimal_pair(), fake_result(["Python or R", "Kubernetes"], ["SQL"])
        )
        self.assertFalse(record["negation"][0]["correct"])
        self.assertEqual(record["count"]["predicted_adjusted"], 3)
        categories = {error["category"] for error in record["errors"]}
        self.assertIn("job_negation_leak", categories)

    def test_ambiguous_predicted_term_is_removed_from_metrics(self):
        pair = minimal_pair(
            expected_requirements=["SQL"],
            expected_matched=["SQL"],
            expected_missing=[],
            expected_alternative_groups=[],
            ambiguous=[{"term": "Tableau", "reason": "ambiguous"}],
            evidence={"SQL": "SQL experience"},
        )
        record = harness.evaluate_pair(
            pair, fake_result(["SQL", "Tableau"], [])
        )
        self.assertEqual(record["detection"]["tp"], 1)
        self.assertEqual(record["detection"]["fp"], 0)
        self.assertEqual(record["count"]["predicted_adjusted"], 1)
        self.assertEqual(record["count"]["ambiguous_excluded"], ["Tableau"])

    def test_dictionary_ceiling_counts_unmeasured_requirements_as_missed(self):
        pair = minimal_pair(unmeasured_requirements=["Airflow"])
        record = harness.evaluate_pair(pair, fake_result(["Python or R"], ["SQL"]))
        aggregate = harness._aggregate([record])
        ceiling = aggregate["dictionary_ceiling"]
        self.assertEqual(ceiling["unmeasured_requirements"], 1)
        self.assertEqual(ceiling["detection_including_unmeasured"]["fn"], 1)
        self.assertEqual(ceiling["matched_including_unmeasured"]["fn"], 1)
        self.assertLess(
            ceiling["matched_including_unmeasured"]["recall"],
            aggregate["matched_identification"]["recall"],
        )

    def test_micro_and_macro_are_not_conflated(self):
        first = harness.evaluate_pair(minimal_pair(), fake_result(["R"], ["SQL"]))
        second_pair = minimal_pair(
            id="TEST-02",
            expected_requirements=["Python"],
            expected_matched=["Python"],
            expected_missing=[],
            expected_alternative_groups=[],
            expected_excluded=[],
            evidence={"Python": "Python experience"},
            expected_count=1,
        )
        second = harness.evaluate_pair(second_pair, fake_result([], ["Python"]))
        aggregate = harness._aggregate([first, second])
        self.assertEqual(aggregate["pairs"], 2)
        self.assertEqual(aggregate["detection"]["tp"], 3)
        self.assertEqual(aggregate["detection"]["macro_precision"], 1.0)
        self.assertEqual(aggregate["matched_identification"]["tp"], 1)
        self.assertEqual(aggregate["matched_identification"]["fn"], 1)


class EvaluationRunnerTests(unittest.TestCase):
    def test_runner_regenerates_outputs(self):
        with tempfile.TemporaryDirectory() as directory:
            payload = harness.run(
                harness.DEFAULT_DATASET, Path(directory), with_consistency=False
            )
            results_path = Path(directory) / "evaluation_results.json"
            report_path = Path(directory) / "evaluation_report.md"

            self.assertTrue(results_path.exists())
            self.assertTrue(report_path.exists())
            self.assertEqual(payload["summary"]["pairs"], 70)
            self.assertEqual(
                json.loads(results_path.read_text(encoding="utf-8"))["meta"]["synthetic"],
                True,
            )
            report = report_path.read_text(encoding="utf-8")
            self.assertIn("synthetic examples", report)
            self.assertIn("accuracy percentage", report)
            self.assertIn("not converted into one", report)


if __name__ == "__main__":
    unittest.main()
