# BrandGuard API

FastAPI service for brand policies, explainable content audits, and human reviews.

In the frontend, open **Brand Vault** as a manager or legal reviewer to edit the active policy.
Use exact approved sentences for facts, and guideline entries such as
`tone: cheap => cost-effective`, `messaging: old name => current name`, or
`palette: #112233, #FFFFFF`. Without the selected provider's key, the engine applies rules locally.
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

Authentication uses bearer JWTs. Local development includes three demo accounts:

- `creator@brandguard.local` / `creator-demo`
- `manager@brandguard.local` / `manager-demo`
- `legal@brandguard.local` / `legal-demo`

Replace `AUTH_SECRET` and `AUTH_USERS_JSON` before deployment. Production user records
should contain Argon2 `password_hash` values rather than plaintext passwords.

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

## Deployment

`docker compose up --build` starts the API and PostgreSQL database together. The frontend
should be configured to call the deployed API base URL.
