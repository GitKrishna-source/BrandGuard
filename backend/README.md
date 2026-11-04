# BrandGuard API

FastAPI service for brand policies, explainable content audits, and human reviews.

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
