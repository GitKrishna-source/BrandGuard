# BrandGuard API

FastAPI service for brand policies, explainable content audits, and human reviews.

The frontend starts general content audits with no brand setup or policy selection.
Omit `policy_id` on text or upload requests to use neutral clarity, tone, grammar,
accessibility, and evidence rules. Existing company policies are never selected automatically.
The Bootwear Brand Vault offers a downloadable, fictional shoe-brand guideline PDF and a judge walkthrough.
Use **Use Bootwear PDF** in the studio to activate the shared demo, or import a text-based guideline
PDF as a Manager or Legal reviewer. General audits remain available.

The API still accepts an explicit `policy_id` for callers with custom rules. Old audit records,
policy snapshots, review decisions, and revision links remain intact. General defaults are
versioned and protected from policy edits. No database schema migration or environment change
is required. Without the selected provider's key, the engine applies limited rules locally.
Local checks detect common promotional claims, rankings, accidental repeated words, and empty
Markdown image descriptions; contextual clarity and tone review needs the AI provider.

## Source-backed audits (RAG)

- `POST /api/demo/bootwear` ingests the bundled PDF once and returns its source/policy IDs.
- `GET /api/demo/bootwear/guidelines.pdf` downloads the judge handout (requires a session).
- `POST /api/guidelines/import` accepts `brand_name` and a PDF `file` from Manager/Legal users.
- `GET /api/guidelines/{document_id}/pdf` downloads an accessible retained source PDF.
- Pass the returned `policy_id` to the existing text or upload audit endpoints. Revisions reuse
  that policy and retrieve passages again for their new content.

PDFs are limited to the configured upload size, 100 pages, and 250,000 extracted characters.
Scanned, empty, encrypted, malformed, and non-PDF sources are rejected. Pages marked as the
Bootwear evaluation exercise are excluded from indexing. The remaining page-labelled passages
are ranked locally by combining BM25 keyword scores with matches on English concepts such as
ranking, waterproofing, medical benefits, and returns. Each selected passage records which
signals matched. Up to six passages are sent to the configured audit provider.

For findings that cite the PDF, a separate provider request checks the conclusion against the
draft and each cited passage. Text evidence must appear in the draft. Passage quotes must match
the saved PDF excerpt. The studio and report record **supported**, **weak**, **unsupported**,
**unverified**, or **uncited**, with per-citation reasons and quotes. If verification times out
or returns unusable data, the findings are retained with incomplete checks. Invented citation
IDs in the initial audit still trigger the local fallback.

The keyless path checks explicit terminology, tone, messaging and price rules, plus evidence
requirements for recognised claim concepts. In the Bootwear studio, use **Try paraphrased claims**
to see these checks on alternate wording. Local concept matching covers a finite English
vocabulary. The configured provider handles contextual interpretation of free-form guidelines.
Evidence verification assesses support within the supplied material. Independent fact checking
and the approval decision remain human review steps.

The `guideline_documents` table is created on startup alongside the existing tables. Source PDFs,
their SHA-256 digests, and extracted passages are retained; policies are immutable and a new
import creates a separate version. Creators can use the shared Bootwear fixture, while another
user's private imports are hidden from them. Manager/Legal workspace reviewers can access
imports. Every saved audit stores its actual retrieved passages and source hashes; reports read
that snapshot without another retrieval or AI call. Configure database persistence on deployment
to retain imports and audits across service restarts.
Text and extracted excerpts are stored for review.
Image palette matching is approximate and visual accessibility still needs manual review.

Creators can access their own new audits. Reviewers can access the shared workspace audit queue,
including older audits without an owner. High-severity approvals require the legal role.
Approval is recorded in BrandGuard and does not publish to a CMS.

## Local development

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

The default database is a local SQLite file. Set `DATABASE_URL` to PostgreSQL for deployment.
Interactive API documentation is available at `http://localhost:8000/docs`.

The hackathon UI uses one-click demo login. Choose Creator, Manager, or Legal to start
a session without entering an email or password. The backend issues a role-scoped JWT
through `POST /api/auth/demo`; refresh keeps the session and the account button lets judges
switch roles. Approval permissions still apply, including legal approval for high-risk findings.

`DEMO_LOGIN_ENABLED=true` is the prototype default, including on deployed instances. Set it
to `false` to disable the demo endpoint. The separate password login API remains available
for configured `AUTH_USERS_JSON` accounts, but is not shown in the demo UI.

## AI analysis

Configure Groq in `backend/.env`, then restart the backend:

```env
AI_PROVIDER=groq
GROQ_API_KEY=your-key
GROQ_MODEL=qwen/qwen3.8-27b
GROQ_VISION_MODEL=qwen/qwen3.8-27b
```

Text and extracted PDF/DOCX/Markdown content use `GROQ_MODEL`. Image uploads use the separate
vision model. Groq's [text API](https://console.groq.com/docs/text-chat) and
[vision API](https://console.groq.com/docs/vision) use Chat Completions; JSON output is
validated against the audit schema before the result is accepted.

The env file is resolved relative to the backend code, regardless of the launch directory.
Process environment variables override it. Docker Compose also forwards these settings.
Keep API keys in the backend environment, never frontend code.

Content is sent only to the explicitly selected provider. Groq does not fall back to Gemini.
To explicitly select Gemini, use `AI_PROVIDER=gemini` with `GEMINI_API_KEY` and `GEMINI_MODEL`.
For local checks only, use `AI_PROVIDER=local`.

Check the result's **Analysis engine** to confirm which provider handled the audit. If the
selected provider fails, local rules still run and the result and server log explain the
fallback (for example HTTP 404 for an unavailable model or HTTP 429 for quota limits).
Provider errors do not include the key, raw provider response, or draft. The provider label
and data handling notice are saved with new audits.

Local rule checks match explicit phrases and recognised claim concepts. Contextual interpretation
uses the configured provider.

## Audit reliability evaluation

Run `python -m app.evaluation --check --output ../output/evals/audit-reliability.json`
from `backend` using its virtual environment. The offline gold benchmark measures
missed violations, false alarms, citation accuracy/coverage, and retrieval recall
across 40 labelled cases. Known local limitations remain visible; the regression
gate prevents increases over the reviewed baseline. See [the evaluation guide](evals/README.md)
for metric definitions, per-case reports, and optional configured-provider evaluation.

## Auto-Fix review

After auditing a text draft or an uploaded document's extracted text, choose
**Review Auto-Fix edits**. The studio shows the original and proposed text, each
change's explanation and any explicit policy source, and a preview containing
only accepted edits. Accept or reject edits individually, then choose **Use
accepted edits** to change the draft. Rejected and undecided edits retain the
original wording. **Undo Fix** restores the draft from before applying that batch.
The saved audit and its score stay unchanged until **Save Revision & Re-audit**;
the studio labels the previous results when the current text has changed.

`POST /api/audits/remediate` returns proposals without creating an audit, revision,
or approval. Its response includes `edits` with immutable-original UTF-16 offsets,
exact `original`/`replacement` strings, explanations, optional policy sources,
and the actual analysis engine/data handling. Edits are computed from the returned
texts, not model-supplied locations. The frontend verifies that applying all edits
reconstructs the proposal and rejects stale or inconsistent responses.

Local remediation only proposes explicit terminology, tone, and messaging
replacements from the selected policy. It does not invent tests, benefits, or
replacement claims; unresolved claims need evidence or manual revision. AI
explanations are suggestions, not independent verification. No-change proposals
leave the draft untouched. Run the edit-selection checks with
`npm run test:remediation` on Node.js 22.6+.

## Audit reports

`GET /api/audits/{id}/report` returns JSON and `GET /api/audits/{id}/report.pdf` downloads a
PDF. Both require a session and use the same ownership/reviewer access rules as audit reviews.
Export reads saved data and never runs AI again. A readiness score and human approval are
separate fields; reports do not claim compliance certification, digital signatures, or publication.

New audits capture their policy snapshot and retain full extracted document text. The standard
audit API still returns a 4,000-character preview; the report contains all retained text.
New reviews record the authenticated account alongside the decision in audit metadata. No
database schema migration is required. Historical audits without policy snapshots or complete
document text are explicitly identified. Original image uploads are not retained or hashed.

PDFs use embedded fonts and automatic pagination. Unsupported font characters appear as Unicode
code labels; JSON retains the original Unicode. ReportLab is included in backend dependencies.

## Deployment

`docker compose up --build` starts the API and PostgreSQL database together. The frontend
should be configured to call the deployed API base URL.
