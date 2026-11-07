# Audit reliability benchmark

Run from `backend` with the installed backend environment:

```powershell
.\.venv\Scripts\python.exe -m app.evaluation --check --output ../output/evals/audit-reliability.json
```

On Linux/macOS use `python -m app.evaluation` with the same arguments.
The default is always **local**, even when `.env` contains a provider key. It makes
no network calls, uses no database, and does not change saved audits or policies.
The terminal shows aggregate metrics; the JSON includes policy breakdowns, every
finding, missed gold labels, false alarms, source checks, and the actual engine.

## Gold labels and metrics

`audit_cases.json` contains 40 manually labelled, synthetic cases (general and
fictional Bootwear). Expectations describe intended behaviour, including known
limitations; they are not generated from the engine's output. Cases cover clean
copy, third-party mentions, contextual disclaimers, quotes, term boundaries,
approved facts and paraphrases, rankings, terminology, tone, positioning, prices,
medical/environmental claims, returns, grammar, alt text, mixed issues, and draft
instructions. Review labels against the supplied PDF before extending the set.

- **Precision:** matched findings / all emitted findings. Unmatched and duplicate
  findings count as false positives, including extra findings on positive cases.
- **Recall:** matched findings / all expected violations. Unmatched expectations
  count as false negatives (misses).
- **False alarm rate:** clean cases with at least one finding / all clean cases.
  This is case-level, not `1 - precision` or a claim about all possible negatives.
- **Citation accuracy:** correctly cited matched source-backed findings / all
  matched findings requiring a citation. A citation must resolve to the retrieved
  passage, match filename/page/chunk, and cite the manually expected `BW-XX` rule.
  A valid source ID alone does not count as correct evidence.
- **Citation coverage:** correct citations / all expected source-backed findings,
  including missed violations. Read this alongside citation accuracy.
- **Citation ID validity:** valid retrieved IDs / all emitted bracketed source IDs,
  including those on false alarms.
- **Retrieval rule recall:** expected rule blocks present in the top six retrieved
  passages / expected rule blocks per case. This separates retrieval misses from
  detection and citation failures.

Matching is one-to-one: category must match and the exact gold evidence phrase
(case/whitespace normalised) must appear in the finding's evidence, which must
itself occur in the draft. Larger exact quotes are accepted. This conservative
matcher can count a semantically correct differently categorised finding as a
miss and false alarm; inspect per-case output when evaluating AI providers.
No eligible observations produces `null`, never an artificial 100% score.

This small text benchmark is a development baseline, not a production accuracy
estimate. It does not measure image/OCR performance, all types of grammar, legal
compliance, or full semantic entailment. Citation labels check the expected rule
block, not whether an arbitrary generated explanation is logically sound.

## Regression gate and known limitations

`local_baseline.json` records the initial observed error counts, dataset/source
hashes, and errors per case. `--check` fails when any case or policy/overall error
count increases, or the dataset/source changes. It permits improvements while
keeping existing misses and false alarms visible. Passing means **no regression
against this baseline**, not perfect audits. CI runs the same gate and uploads its
JSON report alongside the backend tests.

Known local gaps include negation/quoted-example false alarms, exact-string fact
matching, substring terminology matches, and missed contextual grammar, medical,
returns, recycled-material and lifetime claims. The report shows the actual gaps
for this dataset. Tighten the baseline after improvements. When updating labels,
review the diff and resulting errors before updating hashes and counts; do not
change expectations merely to make the engine pass.

## Optional live AI evaluation

```powershell
.\.venv\Scripts\python.exe -m app.evaluation --engine configured --output ../output/evals/provider-reliability.json
```

This explicitly sends the synthetic drafts and retrieved passages to the selected
configured provider, consumes its quota, and requires its key. It is separate from
the local regression baseline; actual engines and fallback counts are recorded.
Any local fallback makes this command exit nonzero so it cannot silently become
a successful AI evaluation. Provider scores vary; review unmatched findings and
gold labels before drawing conclusions. CI never runs this mode.
