import json

import pytest
from pydantic import ValidationError

from app import services
from app.evaluation import EVAL_DIR, AuditCase, check_baseline, evaluate, score_case, summarize
from app.schemas import Finding, RetrievedSource


def case(expected=None):
    return AuditCase(id="sample", policy="bootwear", content="These kicks are new.",
                     rationale="Use the approved terminology.", expected=expected or [])


def finding(evidence="kicks", source="[S1] guide.pdf, p. 2, p2-c1"):
    return Finding(category="terminology", severity="medium", message="Use shoes.",
                   evidence=evidence, suggestion="shoes", source=source)


def source(text="BW-03 / Terminology\nTERM: kicks => shoes"):
    return RetrievedSource(citation_id="S1", document_id="test", filename="guide.pdf", page=2,
                           chunk_id="p2-c1", text=text, document_sha256="a" * 64, relevance=1)


LABEL = {"category": "terminology", "evidence": "kicks", "rule_id": "BW-03"}


def test_scoring_counts_duplicates_misses_and_clean_false_alarms():
    detected = score_case(case([LABEL]), [finding(), finding()], [source()])
    missed = score_case(case([LABEL]), [], [source()])
    clean = score_case(case(), [finding()], [source()])
    metrics = summarize([detected, missed, clean])
    assert metrics["true_positives"] == 1
    assert metrics["false_positives"] == 2
    assert metrics["false_negatives"] == 1
    assert metrics["precision"] == 0.3333
    assert metrics["recall"] == 0.5
    assert metrics["false_alarm_rate"] == 1
    assert metrics["citation_accuracy"] == 1
    assert metrics["citation_coverage"] == 0.5


@pytest.mark.parametrize("citation,passage", [
    ("[S999] invented.pdf, p. 99", "BW-03 / Terminology"),
    ("[S1] guide.pdf, p. 2, p2-c1", "BW-05 / Product price"),
    ("[S1] guide.pdf, p. 99, p2-c1", "BW-03 / Terminology"),
    ("General content / no matching passage", "BW-03 / Terminology"),
])
def test_citation_accuracy_rejects_invented_ids_wrong_rules_wrong_pages_and_missing_sources(
    citation, passage,
):
    result = score_case(case([LABEL]), [finding(source=citation)], [source(passage)])
    assert result["true_positives"] == 1
    assert summarize([result])["citation_accuracy"] == 0
    assert summarize([result])["citation_coverage"] == 0


def test_larger_exact_quote_matches_but_hallucinated_evidence_does_not():
    assert score_case(case([LABEL]), [finding("These kicks are new.")], [source()])["true_positives"] == 1
    result = score_case(case([LABEL]), [finding("These kicks are waterproof.")], [source()])
    assert result["false_negatives"] == result["false_positives"] == 1


def test_empty_denominators_are_not_reported_as_perfect_accuracy():
    metrics = summarize([score_case(case(), [], [])])
    assert metrics["precision"] is None
    assert metrics["recall"] is None
    assert metrics["citation_accuracy"] is None
    assert metrics["false_alarm_rate"] == 0


def test_gold_labels_must_be_present_and_unique():
    with pytest.raises(ValidationError, match="absent"):
        case([{**LABEL, "evidence": "not in the draft"}])
    with pytest.raises(ValidationError, match="duplicate"):
        case([LABEL, LABEL])


def test_local_gold_benchmark_is_offline_and_does_not_regress(monkeypatch):
    original = services.settings.ai_provider

    def unexpected(*args, **kwargs):
        pytest.fail("The default evaluation must never make a provider request")

    monkeypatch.setattr(services.httpx, "post", unexpected)
    report = evaluate()
    baseline = json.loads((EVAL_DIR / "local_baseline.json").read_text())
    assert report["metrics"]["cases"] == 40
    assert report["metrics"]["false_negatives"] > 0  # Known gaps stay visible.
    assert report["metrics"]["false_positives"] > 0
    assert services.settings.ai_provider == original
    assert check_baseline(report, baseline) == []
    report["cases"][0]["false_positives"] += 1
    assert any("general-plain.false_positives" in item for item in check_baseline(report, baseline))
    report["dataset_sha256"] = "changed"
    assert any("Dataset changed" in item for item in check_baseline(report, baseline))


def test_configured_evaluation_requires_a_provider_key(monkeypatch):
    monkeypatch.setattr(services.settings, "ai_provider", "local")
    with pytest.raises(ValueError, match="requires an explicitly configured"):
        evaluate(engine="configured")
