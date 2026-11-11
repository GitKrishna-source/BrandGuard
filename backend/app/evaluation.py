"""Offline gold-set evaluation; opt in to external AI with --engine configured."""

import argparse
import hashlib
import json
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from . import services
from .evidence import source_label
from .models import BrandPolicy, GuidelineDocument
from .policies import BASIC_GUIDELINES, BASIC_POLICY_ID
from .retrieval import BOOTWEAR_PDF, extract_chunks, policy_from_chunks, retrieve
from .schemas import Finding, RetrievedSource

EVAL_DIR = Path(__file__).resolve().parents[1] / "evals"


class ExpectedFinding(BaseModel):
    model_config = ConfigDict(extra="forbid")
    category: str
    evidence: str = Field(min_length=1)
    rule_id: str | None = None


class AuditCase(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    policy: Literal["general", "bootwear"]
    content: str = Field(min_length=1)
    rationale: str = Field(min_length=1)
    expected: list[ExpectedFinding]

    @model_validator(mode="after")
    def validate_labels(self):
        labels = set()
        for expected in self.expected:
            if normalize(expected.evidence) not in normalize(self.content):
                raise ValueError(f"{self.id}: labelled evidence is absent from the draft")
            label = (expected.category, normalize(expected.evidence))
            if label in labels:
                raise ValueError(f"{self.id}: duplicate expected finding")
            labels.add(label)
            if expected.rule_id and self.policy != "bootwear":
                raise ValueError("Only source-backed cases can require PDF citations")
        return self


def normalize(value: str) -> str:
    return " ".join(value.casefold().split())


def ratio(numerator: int, denominator: int) -> float | None:
    return round(numerator / denominator, 4) if denominator else None


def score_case(case: AuditCase, findings: list[Finding], sources: list[RetrievedSource]):
    """One-to-one category + exact gold phrase matching, independent of citation quality.

    A provider may quote a larger span containing the labelled phrase. Evidence must
    still be copied from the draft. Duplicate or unmatched findings are false alarms.
    Citation correctness is measured against manually labelled rule blocks, not IDs alone.
    """
    remaining = set(range(len(findings)))
    matched, missed, citations = [], [], []
    by_id = {source.citation_id: source for source in sources}
    for expected in case.expected:
        candidates = [index for index in sorted(remaining)
                      if findings[index].category == expected.category
                      and normalize(expected.evidence) in normalize(findings[index].evidence)
                      and normalize(findings[index].evidence) in normalize(case.content)]
        if not candidates:
            missed.append(expected.model_dump())
            continue
        index = candidates[0]
        remaining.remove(index)
        matched.append(index)
        if expected.rule_id:
            cited_ids = re.findall(r"\[(S\d+)\]", findings[index].source)
            correct = bool(cited_ids) and all(
                citation in by_id
                and expected.rule_id in re.findall(r"\bBW-\d{2}\b", by_id[citation].text)
                and source_label(by_id[citation]) in findings[index].source
                for citation in cited_ids
            )
            citations.append({"expected_rule": expected.rule_id, "correct": correct,
                              "finding_index": index, "actual_source": findings[index].source})
    rules = {expected.rule_id for expected in case.expected if expected.rule_id}
    retrieved_rules = set(re.findall(r"\bBW-\d{2}\b", " ".join(s.text for s in sources)))
    # Include all emitted citations in validity, even on unmatched (false alarm) findings.
    all_ids = [citation for finding in findings
               for citation in re.findall(r"\[(S\d+)\]", finding.source)]
    return {
        "id": case.id, "policy": case.policy, "rationale": case.rationale,
        "expected_count": len(case.expected), "true_positives": len(matched),
        "false_negatives": len(missed), "false_positives": len(remaining),
        "clean_case": not case.expected, "clean_case_false_alarm": not case.expected and bool(findings),
        "missed": missed, "false_alarms": [findings[i].model_dump() for i in sorted(remaining)],
        "citation_checks": citations, "citation_required": len(rules),
        "retrieved_expected_rules": len(rules & retrieved_rules),
        "emitted_citation_ids": len(all_ids),
        "valid_citation_ids": sum(citation in by_id for citation in all_ids),
        "findings": [finding.model_dump() for finding in findings],
    }


def summarize(results: list[dict]) -> dict:
    tp = sum(row["true_positives"] for row in results)
    fp = sum(row["false_positives"] for row in results)
    fn = sum(row["false_negatives"] for row in results)
    citations = [check for row in results for check in row["citation_checks"]]
    required = sum(sum(bool(expected.get("rule_id")) for expected in row["missed"])
                   + len(row["citation_checks"]) for row in results)
    correct = sum(check["correct"] for check in citations)
    return {
        "cases": len(results), "expected_violations": tp + fn,
        "true_positives": tp, "false_positives": fp, "false_negatives": fn,
        "precision": ratio(tp, tp + fp), "recall": ratio(tp, tp + fn),
        "false_alarm_rate": ratio(sum(row["clean_case_false_alarm"] for row in results),
                                  sum(row["clean_case"] for row in results)),
        "citation_accuracy": ratio(correct, len(citations)),
        "citation_coverage": ratio(correct, required),
        "citation_id_validity": ratio(sum(row["valid_citation_ids"] for row in results),
                                      sum(row["emitted_citation_ids"] for row in results)),
        "incorrect_or_missing_citations": required - correct,
        "invalid_citation_ids": sum(row["emitted_citation_ids"] - row["valid_citation_ids"]
                                    for row in results),
        "retrieval_misses": sum(row["citation_required"] - row["retrieved_expected_rules"]
                                for row in results),
        "retrieval_rule_recall": ratio(sum(row["retrieved_expected_rules"] for row in results),
                                       sum(row["citation_required"] for row in results)),
    }


def evaluate(cases_path: Path = EVAL_DIR / "audit_cases.json", engine: str = "local") -> dict:
    raw = cases_path.read_bytes()
    cases = [AuditCase.model_validate(row) for row in json.loads(raw)]
    if not cases or len({case.id for case in cases}) != len(cases):
        raise ValueError("The evaluation needs nonempty cases with unique IDs")
    pdf = BOOTWEAR_PDF.read_bytes()
    _, chunks = extract_chunks(pdf)
    document = GuidelineDocument(id="eval-bootwear", filename=BOOTWEAR_PDF.name,
                                sha256=hashlib.sha256(pdf).hexdigest(), chunks=chunks)
    policies = {
        "bootwear": policy_from_chunks("Bootwear evaluation", chunks, "eval-bootwear"),
        "general": BrandPolicy(id=BASIC_POLICY_ID, name="General content audit",
                               guidelines=BASIC_GUIDELINES, approved_facts=[],
                               banned_terms=[], approved_terms={}),
    }
    available_rules = set(re.findall(r"\bBW-\d{2}\b", " ".join(c["text"] for c in chunks)))
    for case in cases:
        if any(item.rule_id and item.rule_id not in available_rules for item in case.expected):
            raise ValueError(f"{case.id}: unknown PDF rule label")
    original_provider = services.settings.ai_provider
    if engine == "configured":
        provider, key, _ = services._provider_details()
        if not key or provider == "Local":
            raise ValueError("Configured evaluation requires an explicitly configured AI provider and key")
    elif engine == "local":
        services.settings.ai_provider = "local"
    else:
        raise ValueError("Choose local or configured evaluation")
    results = []
    try:
        for case in cases:
            sources = retrieve(document, case.content) if case.policy == "bootwear" else None
            score, findings, actual_engine = services.audit_text_with_provider(
                case.content, policies[case.policy], sources)
            results.append({**score_case(case, findings, sources or []),
                            "score": score, "analysis_engine": actual_engine})
    finally:
        services.settings.ai_provider = original_provider
    return {
        "report_version": 1, "generated_at": datetime.now(UTC).isoformat(),
        "engine_mode": engine, "dataset_sha256": hashlib.sha256(raw).hexdigest(),
        "source_sha256": document.sha256,
        "provider_fallback_cases": sum(row["analysis_engine"].startswith(services.LOCAL_ENGINE)
                                       for row in results) if engine == "configured" else 0,
        "metrics": summarize(results),
        "by_policy": {name: summarize([row for row in results if row["policy"] == name])
                      for name in policies},
        "cases": results,
    }


def check_baseline(report: dict, baseline: dict) -> list[str]:
    failures = []
    if report["dataset_sha256"] != baseline["dataset_sha256"]:
        failures.append("Dataset changed; review labels and explicitly refresh the baseline")
    if report["source_sha256"] != baseline["source_sha256"]:
        failures.append("Source PDF changed; review expected citations and refresh the baseline")
    if report["engine_mode"] != "local":
        failures.append("The deterministic baseline only applies to local evaluations")
    for scope, actual in {"overall": report["metrics"], **report["by_policy"]}.items():
        for metric, limit in baseline["maximum_errors"][scope].items():
            if actual[metric] > limit:
                failures.append(f"{scope}.{metric}: {actual[metric]} exceeds {limit}")
    for actual in report["cases"]:
        expected = baseline["cases"].get(actual["id"])
        if expected is None:
            failures.append(f"{actual['id']}: absent from baseline")
            continue
        errors = {"false_positives": actual["false_positives"],
                  "false_negatives": actual["false_negatives"],
                  "citation_errors": sum(not c["correct"] for c in actual["citation_checks"]),
                  "retrieval_misses": actual["citation_required"] - actual["retrieved_expected_rules"]}
        for metric, count in errors.items():
            if count > expected[metric]:
                failures.append(f"{actual['id']}.{metric}: {count} exceeds {expected[metric]}")
    return failures


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--engine", choices=["local", "configured"], default="local")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--check", action="store_true", help="Fail on local baseline regressions")
    args = parser.parse_args()
    if args.check and args.engine != "local":
        parser.error("--check uses the local baseline; run configured evaluations separately")
    report = evaluate(engine=args.engine)
    failures = check_baseline(report, json.loads((EVAL_DIR / "local_baseline.json").read_text())) \
        if args.check else []
    report["baseline_failures"] = failures
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"engine_mode": report["engine_mode"], "metrics": report["metrics"],
                      "provider_fallback_cases": report["provider_fallback_cases"],
                      "baseline_failures": failures}, indent=2))
    return 1 if failures or report["provider_fallback_cases"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
