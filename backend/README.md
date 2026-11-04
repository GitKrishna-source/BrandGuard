# BrandGuard API

FastAPI service for brand policies, explainable content audits, and human reviews.

In the frontend, open **Brand Vault** as a manager or legal reviewer to edit the active policy.
Use exact approved sentences for facts, and guideline entries such as
`tone: cheap => cost-effective`, `messaging: old name => current name`, or
`palette: #112233, #FFFFFF`. The audit engine applies explicit rules locally without sending
drafts to an external AI provider. Text and extracted excerpts are stored for review.
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

## Deployment

`docker compose up --build` starts the API and PostgreSQL database together. The frontend
should be configured to call the deployed API base URL; authentication and an external LLM
provider are intentionally isolated as the next implementation step.
