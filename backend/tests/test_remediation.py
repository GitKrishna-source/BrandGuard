import json
from itertools import combinations, pairwise

import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app import services
from app.auth import create_access_token
from app.db import Base, get_db
from app.main import app
from app.models import Audit, BrandPolicy, Revision
from app.remediation import build_remediation_edits
from app.schemas import RemediationExplanation, RetrievedSource


@pytest.fixture
def policy():
    return BrandPolicy(name="Selected brand", banned_terms=["kicks"],
                       approved_terms={"kicks": "shoes"}, approved_facts=[],
                       guidelines=["TONE: dirt cheap => fairly priced",
                                   "MESSAGING: racing shoes => walking shoes"])


def utf16_slice(text, start, end=None):
    encoded = text.encode("utf-16-le")
    return encoded[2 * start:None if end is None else 2 * end].decode("utf-16-le")


def apply_edits(original, edits):
    """Emulate JavaScript slice offsets while retaining all unselected text verbatim."""
    text = original
    for edit in sorted(edits, key=lambda item: item.start, reverse=True):
        assert utf16_slice(text, edit.start, edit.end) == edit.original
        text = (utf16_slice(text, 0, edit.start) + edit.replacement
                + utf16_slice(text, edit.end))
    return text


@pytest.mark.parametrize("original,proposed", [
    ("These kicks are dirt cheap.", "These shoes are fairly priced."),
    ("Visit today.", "Visit our store today."),
    ("We offer guaranteed results.", "We offer results."),
    ("Visit now!", "Visit now."),
    ("one  two\r\nthree\tfour", "one two\nthree four"),
    ("👟 Try kicks. café e\u0301.", "👟 Try shoes. café e\u0301!"),
    ("kicks and kicks and kicks", "shoes and kicks and boots"),
    ("", "new draft"),
    ("remove this", ""),
])
def test_actual_diff_reconstructs_exact_proposal_without_normalising_text(policy, original, proposed):
    edits = build_remediation_edits(original, proposed, policy)
    assert apply_edits(original, edits) == proposed
    assert len({edit.id for edit in edits}) == len(edits)
    assert all(left.end <= right.start for left, right in pairwise(edits))
    assert all(edit.explanation for edit in edits)


def test_each_subset_applies_only_its_exact_ranges_to_original(policy):
    original = "👟 These kicks are new. The price is low. Visit today!"
    proposed = "👟 These shoes are new. The price is fair. Visit today."
    edits = build_remediation_edits(original, proposed, policy)
    assert len(edits) == 3
    for size in range(len(edits) + 1):
        for selected in combinations(edits, size):
            result = apply_edits(original, selected)
            for edit in edits:
                # Three distinct edits let us verify selecting one never leaks another.
                expected = edit.replacement if edit in selected else edit.original
                assert expected in result
    assert apply_edits(original, [edits[0]]) == (
        "👟 These shoes are new. The price is low. Visit today!"
    )


def test_non_bmp_characters_use_utf16_offsets_not_python_codepoints(policy):
    original = "👟 kicks 🛡️"
    edits = build_remediation_edits(original, "👟 shoes 🛡️", policy)
    assert len(edits) == 1
    assert (edits[0].start, edits[0].end) == (3, 8)
    assert utf16_slice(original, edits[0].start, edits[0].end) == "kicks"


def test_repeated_identical_phrases_remain_independently_addressable(policy):
    original = "Try kicks first. Keep this sentence. Try kicks later."
    proposed = "Try shoes first. Keep this sentence. Try shoes later."
    edits = build_remediation_edits(original, proposed, policy)
    assert len(edits) == 2
    assert edits[0].original == edits[1].original == "kicks"
    assert apply_edits(original, [edits[1]]) == (
        "Try kicks first. Keep this sentence. Try shoes later."
    )


def test_unchanged_draft_returns_no_synthetic_edits(policy):
    original = "👟 Keep punctuation,  spaces and\r\nnewlines."
    assert build_remediation_edits(original, original, policy) == []


def passage(text):
    return RetrievedSource(citation_id="S1", document_id="guide", filename="guide.pdf", page=2,
                           chunk_id="p2-c3", text=text, document_sha256="a" * 64, relevance=1)


@pytest.mark.parametrize("before,after,rule,kind", [
    ("kicks", "shoes", "TERM: kicks => shoes", "terminology"),
    ("dirt cheap", "fairly priced", "TONE: dirt cheap => fairly priced", "tone"),
    ("racing shoes", "walking shoes", "MESSAGING: racing shoes => walking shoes", "messaging"),
])
def test_explicit_policy_replacements_have_a_rule_explanation_and_pdf_source(
    policy, before, after, rule, kind,
):
    edits = build_remediation_edits(before, after, policy, [passage(rule)])
    assert len(edits) == 1
    assert kind in edits[0].explanation
    assert edits[0].source == "[S1] guide.pdf, p. 2, p2-c3"


def test_same_words_in_unrelated_passage_are_not_pdf_rule_evidence(policy):
    edits = build_remediation_edits(
        "kicks", "shoes", policy, [passage("A photograph shows kicks beside shoes.")],
    )
    assert edits[0].source == "Brand policy: Selected brand"


def test_partial_rule_words_elsewhere_do_not_attribute_unrelated_edit(policy):
    edits = build_remediation_edits(
        "These are racing shoes. A racing car is red.",
        "These are racing shoes. A walking car is red.",
        policy, [passage("MESSAGING: racing shoes => walking shoes")],
    )
    assert len(edits) == 1
    assert edits[0].source is None
    assert "messaging replacement" not in edits[0].explanation


def test_anchored_model_explanation_is_a_suggestion_without_fabricated_source(policy):
    explanation = RemediationExplanation(before="best", after="practical",
                                         reason="Remove an unsubstantiated superiority claim.")
    edits = build_remediation_edits("The best option.", "The practical option.", policy,
                                    explanations=[explanation])
    assert edits[0].explanation == explanation.reason
    assert edits[0].source is None


@pytest.mark.parametrize("before,after", [
    ("not present", "practical"), ("best", "not present"), ("", "practical"),
    ("best", ""), ("", ""),
])
def test_unanchored_or_wrong_change_explanations_do_not_attach(policy, before, after):
    edits = build_remediation_edits(
        "The best option.", "The practical option.", policy,
        explanations=[RemediationExplanation(before=before, after=after, reason="FAKE REASON")],
    )
    assert edits[0].explanation != "FAKE REASON"
    assert edits[0].source is None


@pytest.mark.parametrize("before,after,old,new", [
    ("Visit today.", "Visit our store today.", "", "our store "),
    ("Hello needless world.", "Hello world.", "needless ", ""),
    ("Guaranteed results.", "Results.", "Guaranteed results", "Results"),
])
def test_anchored_model_explanations_support_insertions_and_deletions(policy, before, after, old, new):
    edits = build_remediation_edits(before, after, policy, explanations=[
        RemediationExplanation(before=old, after=new, reason="A reason for this exact change."),
    ])
    assert edits[0].explanation == "A reason for this exact change."


def test_local_fallback_only_uses_explicit_rules_and_respects_term_boundaries(policy, monkeypatch):
    monkeypatch.setattr(services.settings, "ai_provider", "local")
    original = ("Our sidekicks say these KICKS are dirt cheap racing shoes. "
                "They are 100% waterproof, guaranteed 100% bug-free and 10x faster.")
    fixed, summary, engine, explanations = services.remediate_text_with_provider(original, policy)
    assert fixed == ("Our sidekicks say these shoes are fairly priced walking shoes. "
                     "They are 100% waterproof, guaranteed 100% bug-free and 10x faster.")
    assert "claims needing evidence" in summary
    assert engine == services.LOCAL_ENGINE
    assert explanations == []
    assert "water-resistant" not in fixed
    assert "internal tests" not in fixed


def test_local_fallback_preserves_claims_without_inventing_a_replacement(monkeypatch):
    monkeypatch.setattr(services.settings, "ai_provider", "local")
    policy = BrandPolicy(name="No replacement", banned_terms=["kicks"], approved_terms={},
                         guidelines=[], approved_facts=[])
    original = "Our kicks are guaranteed 100% waterproof and 10x faster."
    fixed, summary, _, _ = services.remediate_text_with_provider(original, policy)
    assert fixed == original
    assert "No explicit policy replacements" in summary
    assert build_remediation_edits(original, fixed, policy) == []


@pytest.fixture
def client(monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)

    def database():
        with Session(engine) as db:
            yield db

    monkeypatch.setattr(services.settings, "ai_provider", "local")
    app.dependency_overrides[get_db] = database
    try:
        with TestClient(app) as test_client:
            yield test_client, engine
    finally:
        app.dependency_overrides.pop(get_db, None)
        engine.dispose()


def auth():
    token = create_access_token({"username": "creator@example.test", "role": "creator"})
    return {"Authorization": f"Bearer {token}"}


def test_remediation_endpoint_returns_review_edits_without_mutating_saved_audit(client):
    test_client, engine = client
    policy_response = test_client.post("/api/policies", headers=auth(), json={
        "name": "Review policy", "banned_terms": ["kicks"], "approved_terms": {"kicks": "shoes"},
    })
    assert policy_response.status_code == 201
    policy_id = policy_response.json()["id"]
    content = "👟 Try our kicks."
    audit = test_client.post("/api/audits", headers=auth(), json={
        "content": content, "policy_id": policy_id,
    }).json()
    old_report = test_client.get(f"/api/audits/{audit['id']}/report", headers=auth()).json()
    response = test_client.post("/api/audits/remediate", headers=auth(), json={
        "content": content, "policy_id": policy_id,
    })
    assert response.status_code == 200
    proposed = response.json()
    assert proposed["original"] == content
    assert proposed["fixed_content"] == "👟 Try our shoes."
    assert proposed["edits"][0]["original"] == "kicks"
    assert proposed["edits"][0]["replacement"] == "shoes"
    assert "terminology" in proposed["edits"][0]["explanation"]
    assert proposed["edits"][0]["source"] == "Brand policy: Review policy"
    assert "No external AI service" in proposed["data_handling"]
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(Audit)) == 1
        assert db.scalar(select(func.count()).select_from(Revision)) == 0
        assert db.get(Audit, audit["id"]).content == content
    new_report = test_client.get(f"/api/audits/{audit['id']}/report", headers=auth()).json()
    assert old_report["content"] == new_report["content"]
    assert old_report["audit"] == new_report["audit"]
    assert old_report["reviews"] == new_report["reviews"]


@pytest.fixture
def groq(monkeypatch):
    monkeypatch.setattr(services.settings, "ai_provider", "groq")
    monkeypatch.setattr(services.settings, "groq_api_key", "DO-NOT-LEAK-SECRET")
    monkeypatch.setattr(services.settings, "groq_model", "test-model")


def groq_response(url, output, finish="stop"):
    return httpx.Response(200, request=httpx.Request("POST", url), json={"choices": [{
        "finish_reason": finish, "message": {"content": json.dumps(output)},
    }]})


def test_provider_success_includes_explanations_and_preserves_draft_prompt(policy, groq, monkeypatch):
    output = {"fixed_content": "A practical option.", "changes_summary": "Qualify the claim.",
              "edit_explanations": [{"before": "best", "after": "practical",
                                     "reason": "No evidence establishes superiority."}]}

    def post(url, **kwargs):
        prompt = kwargs["json"]["messages"][1]["content"]
        assert "A best option." in prompt
        assert "Do not invent facts" in prompt
        assert "edit_explanations" in prompt
        return groq_response(url, output)

    monkeypatch.setattr(services.httpx, "post", post)
    fixed, summary, engine, explanations = services.remediate_text_with_provider("A best option.", policy)
    assert fixed == output["fixed_content"]
    assert summary == output["changes_summary"]
    assert engine == "Groq test-model"
    assert explanations[0].reason == "No evidence establishes superiority."


def test_gemini_success_combines_visible_parts_and_preserves_explanations(policy, monkeypatch):
    monkeypatch.setattr(services.settings, "ai_provider", "gemini")
    monkeypatch.setattr(services.settings, "gemini_api_key", "DO-NOT-LEAK-SECRET")
    monkeypatch.setattr(services.settings, "gemini_model", "test-gemini")
    output = json.dumps({
        "fixed_content": "A practical option.", "changes_summary": "Remove unsupported superiority.",
        "edit_explanations": [{"before": "best", "after": "practical", "reason": "Needs evidence."}],
    })
    monkeypatch.setattr(services.httpx, "post", lambda url, **kwargs: httpx.Response(
        200, request=httpx.Request("POST", url), json={"candidates": [{
            "finishReason": "STOP", "content": {"parts": [
                {"thought": True, "text": "private reasoning"},
                {"text": output[:25]}, {"text": output[25:]},
            ]},
        }]},
    ))
    fixed, _, engine, explanations = services.remediate_text_with_provider("A best option.", policy)
    assert fixed == "A practical option."
    assert engine == "Gemini test-gemini"
    assert explanations[0].reason == "Needs evidence."


@pytest.mark.parametrize("output,finish", [
    ({}, "stop"),
    ({"fixed_content": "", "changes_summary": "Empty draft"}, "stop"),
    ({"fixed_content": "A rewrite.", "changes_summary": "Partial"}, "length"),
])
def test_invalid_or_truncated_provider_result_falls_back_visibly(policy, groq, monkeypatch, output, finish):
    monkeypatch.setattr(services.httpx, "post", lambda url, **kwargs: groq_response(url, output, finish))
    fixed, _, engine, explanations = services.remediate_text_with_provider("Try kicks.", policy)
    assert fixed == "Try shoes."
    assert "Groq fallback" in engine
    assert "invalid audit response" in engine
    assert explanations == []


def test_provider_exception_does_not_leak_secret_or_private_draft(policy, groq, monkeypatch, caplog):
    def fail(url, **kwargs):
        request = httpx.Request("POST", url)
        raise httpx.HTTPStatusError("DO-NOT-LEAK-SECRET PRIVATE-DRAFT", request=request,
                                    response=httpx.Response(429, request=request))

    monkeypatch.setattr(services.httpx, "post", fail)
    fixed, _, engine, _ = services.remediate_text_with_provider("PRIVATE-DRAFT kicks.", policy)
    assert fixed == "PRIVATE-DRAFT shoes."
    assert "Groq fallback: HTTP 429" in engine
    assert "DO-NOT-LEAK-SECRET" not in caplog.text + engine
    assert "PRIVATE-DRAFT" not in caplog.text + engine
    assert "transmission was attempted" in services.audit_data_handling(engine)


def test_gemini_truncation_is_not_accepted_as_a_complete_rewrite(policy, monkeypatch):
    monkeypatch.setattr(services.settings, "ai_provider", "gemini")
    monkeypatch.setattr(services.settings, "gemini_api_key", "DO-NOT-LEAK-SECRET")
    monkeypatch.setattr(services.httpx, "post", lambda url, **kwargs: httpx.Response(
        200, request=httpx.Request("POST", url), json={"candidates": [{
            "finishReason": "MAX_TOKENS", "content": {"parts": [{"text": json.dumps({
                "fixed_content": "An incomplete rewrite.", "changes_summary": "Partial output",
            })}]},
        }]},
    ))
    fixed, _, engine, _ = services.remediate_text_with_provider("Try kicks.", policy)
    assert fixed == "Try shoes."
    assert "Gemini fallback" in engine
