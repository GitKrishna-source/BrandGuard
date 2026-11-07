"""Build reviewable edits from actual text differences, never model-supplied offsets."""

import re
from difflib import SequenceMatcher

from .models import BrandPolicy
from .schemas import RemediationEdit, RemediationExplanation, RetrievedSource


def _normal(text: str) -> str:
    return " ".join(text.casefold().split())


def _utf16_length(text: str) -> int:
    return len(text.encode("utf-16-le", errors="surrogatepass")) // 2


def _explain(before: str, after: str, original: str, proposed: str, policy: BrandPolicy,
             sources: list[RetrievedSource], explanations: list[RemediationExplanation],
             start: int, end: int, new_start: int, new_end: int):
    # Only explicit policy replacements can receive a rule attribution here.
    # Free-form provider explanations remain labelled as suggestions by the UI.
    rules = [(term, (policy.approved_terms or {}).get(term), "terminology")
             for term in policy.banned_terms or []]
    for rule in policy.guidelines or []:
        kind, _, value = rule.partition(":")
        phrase, separator, replacement = value.partition("=>")
        if kind.casefold() in {"tone", "messaging"} and separator:
            rules.append((phrase.strip(), replacement.strip(), kind.casefold()))
    for phrase, replacement, kind in rules:
        if not phrase or not replacement:
            continue
        pattern = r"(?<!\w)" + r"\s+".join(map(re.escape, phrase.split())) + r"(?!\w)"
        supported = False
        for match in re.finditer(pattern, original, re.IGNORECASE):
            if match.start() <= start < end <= match.end():
                prefix, suffix = original[match.start():start], original[end:match.end()]
                # A minimal word diff can implement a longer explicit rule. Only
                # attribute it if the surrounding old AND new phrase establish
                # that this exact edit performs that policy replacement.
                supported = (_normal(prefix + after + suffix) == _normal(replacement)
                             and new_start >= len(prefix)
                             and _normal(proposed[new_start - len(prefix):new_end + len(suffix)])
                             == _normal(replacement))
                if supported:
                    break
        if supported:
            marker = "TERM" if kind == "terminology" else kind.upper()
            explicit_rule = _normal(f"{marker}: {phrase} => {replacement}")
            passage = next((source for source in sources
                            if explicit_rule in _normal(source.text)), None)
            label = (f"[{passage.citation_id}] {passage.filename}, p. {passage.page}, {passage.chunk_id}"
                     if passage else f"Brand policy: {policy.name}")
            return f"Use the explicit {kind} replacement from the selected policy: {replacement}.", label
    for explanation in explanations:
        # A supplied explanation must refer to actual old/new text. Never trust an
        # LLM's locations, or turn its advisory prose into a draft replacement.
        old, new = _normal(explanation.before), _normal(explanation.after)
        if (old or new) and old in _normal(original) and new in _normal(proposed) \
                and _normal(before) in old and _normal(after) in new \
                and (bool(before.strip()) == bool(old)) and (bool(after.strip()) == bool(new)):
            return explanation.reason, None
    repeated = re.fullmatch(r"\s*(\w+)\s+\1\s*", before, flags=re.IGNORECASE)
    if repeated and _normal(after) == repeated.group(1).casefold():
        return "Remove an accidental repeated word while preserving the sentence.", None
    return ("Suggested wording change. Check that it preserves your meaning and adds no unsupported facts.",
            None)


def build_remediation_edits(original: str, proposed: str, policy: BrandPolicy,
                            sources: list[RetrievedSource] | None = None,
                            explanations: list[RemediationExplanation] | None = None) -> list[RemediationEdit]:
    # Whitespace is retained verbatim so any accepted subset reconstructs without
    # normalising punctuation, line endings, repeated phrases, or Unicode.
    old_tokens = re.findall(r"\w+|[^\w\s]|\s+", original)
    new_tokens = re.findall(r"\w+|[^\w\s]|\s+", proposed)
    old_offsets, new_offsets = [0], [0]
    for token in old_tokens:
        old_offsets.append(old_offsets[-1] + len(token))
    for token in new_tokens:
        new_offsets.append(new_offsets[-1] + len(token))
    changes = []
    for tag, left, right, new_left, new_right in SequenceMatcher(
        None, old_tokens, new_tokens, autojunk=True,
    ).get_opcodes():
        if tag != "equal":
            # Combine changes separated only by unchanged whitespace into one
            # readable phrase, rather than separate word and punctuation edits.
            if changes and "".join(old_tokens[changes[-1][1]:left]).isspace():
                changes[-1] = (changes[-1][0], right, changes[-1][2], new_right)
            else:
                changes.append((left, right, new_left, new_right))
    edits = []
    for left, right, new_left, new_right in changes:
        start, end = old_offsets[left], old_offsets[right]
        before = original[start:end]
        new_start, new_end = new_offsets[new_left], new_offsets[new_right]
        after = proposed[new_start:new_end]
        explanation, source = _explain(before, after, original, proposed, policy,
                                       sources or [], explanations or [], start, end, new_start, new_end)
        edits.append(RemediationEdit(
            id=f"edit-{len(edits) + 1}", start=_utf16_length(original[:start]),
            end=_utf16_length(original[:end]), original=before, replacement=after,
            explanation=explanation, source=source,
        ))
    return edits
