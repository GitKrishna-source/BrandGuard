# BrandGuard API

FastAPI service for brand policies, explainable content audits, and human reviews.

The frontend starts general content audits with no brand setup or policy selection.
Omit `policy_id` on text or upload requests to use neutral clarity, tone, grammar,
accessibility, and evidence rules. Existing company policies are never selected automatically.
The sample Brand Vault is illustrative only; optional brand guidelines in the UI will come later.

The API still accepts an explicit `policy_id` for callers with custom rules. Old audit records,
policy snapshots, review decisions, and revision links remain intact. General defaults are
versioned and protected from policy edits. No database schema migration or environment change
is required. Without the selected provider's key, the engine applies limited rules locally.
Local checks detect common promotional claims, rankings, accidental repeated words, and empty
Markdown image descriptions; contextual clarity and tone review needs the AI provider.
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

Local rule checks match phrases and do not provide contextual interpretation.

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
