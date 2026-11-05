# BrandGuard

BrandGuard is a pre-publication brand-governance platform for organisations that need to keep content consistent, accurate, accessible, and trustworthy across employees, agencies, and AI tools.

It reviews content against approved brand guidelines, facts, terminology, and assets. Instead of only rejecting content, BrandGuard explains each issue and suggests a correction that preserves the creator’s intent. Human reviewers remain in control through comments, approvals, and role-based publishing gates.

## Product capabilities

- Audit text for tone, terminology, unsupported claims, and approved facts.
- Upload and audit Markdown, plaintext, PDF, DOCX, and image assets.
- Explain findings with evidence, source policy, severity, and suggested corrections.
- Store audit history and collaborative review comments.
- Export saved audits as PDF or JSON with real findings, policy snapshots, and recorded reviews.
- Support creator, manager, and legal reviewer roles.
- Require manager or legal approval before content is marked approved.
- Persist policies, audits, and reviews in SQLite locally or PostgreSQL in deployment.
- Keep the frontend and backend independently deployable.

## Technology

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: Python, FastAPI, SQLAlchemy
- Database: SQLite for local development, PostgreSQL for deployment
- Authentication: JWT bearer tokens with Argon2 password-hash support
- File parsing: Pillow, pypdf, python-docx
- Tooling: Git, GitHub, ESLint, Ruff, pytest, Docker Compose

## Repository structure

```text
BrandGuard/
├── src/                  # React + TypeScript frontend
├── backend/
│   ├── app/              # FastAPI application, models, auth, services
│   ├── tests/            # Backend tests
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── pyproject.toml
├── index.html
├── package.json
└── vite.config.ts
```

## Run the frontend

From the repository root:

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

The frontend runs at [http://localhost:3000](http://localhost:3000).

The frontend uses `VITE_API_BASE_URL` to locate the backend. The local default is:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Useful frontend commands:

```powershell
npm run lint
npm run typecheck
npm run build
npm run preview
```

## Run the backend locally

Open a second terminal:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
Copy-Item .env.example .env
uvicorn app.main:app --reload --port 8000
```

The API runs at [http://localhost:8000](http://localhost:8000). Interactive documentation is available at [http://localhost:8000/docs](http://localhost:8000/docs).

The default local database is `backend/brandguard.db`. It is ignored by Git.

Useful backend commands:

```powershell
python -m pytest -q
ruff check app tests
```

## Local authentication

For the hackathon prototype, click a role card to enter the demo without credentials.
Creator, Manager, and Legal receive role-scoped sessions through `POST /api/auth/demo`.
The role persists after refresh, and the demo account button lets judges switch roles.
`DEMO_LOGIN_ENABLED` defaults to `true`; set it to `false` to disable passwordless demo entry.

The separate password login API retains these development accounts:

| Role | Username | Password |
|---|---|---|
| Creator | `creator@brandguard.local` | `creator-demo` |
| Manager | `manager@brandguard.local` | `manager-demo` |
| Legal | `legal@brandguard.local` | `legal-demo` |

The frontend signs in through `POST /api/auth/login`, stores the bearer token, and attaches it to protected API requests. `GET /api/auth/me` validates the current session.

Role permissions:

- Creator: run audits, upload content, and add review comments.
- Manager: review and approve standard content.
- Legal: approve high-risk or regulated content.

The backend always enforces permissions; hiding a button in the frontend is not treated as a security boundary.

## API overview

- `GET /health` — service health check
- `POST /api/auth/login` — issue a JWT
- `GET /api/auth/me` — return the authenticated user
- `GET /api/policies` — list brand policies
- `POST /api/policies` — create a policy
- `POST /api/audits` — audit text content
- `POST /api/audits/upload` — audit a document or image upload
- `GET /api/audits/{audit_id}/report` — report JSON for an accessible saved revision
- `GET /api/audits/{audit_id}/report.pdf` — downloadable PDF of the saved revision and its reviews
- `GET /api/audits` — list audit history
- `POST /api/audits/{audit_id}/reviews` — add a comment or approval decision
- `GET /api/audits/{audit_id}/reviews` — list review history

## Run with PostgreSQL and Docker

Set production secrets before starting the stack:

```powershell
cd backend
$env:AUTH_SECRET = "replace-with-a-long-random-secret"
$env:AUTH_USERS_JSON = "{...production user records with password_hash values...}"
docker compose up --build
```

The API is exposed at [http://localhost:8000](http://localhost:8000), and PostgreSQL runs on port `5432`. In production, set `FRONTEND_ORIGIN` to the deployed frontend URL and use a managed PostgreSQL database or a secured private database network.

## Environment variables

Frontend `.env.local`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Backend `.env`:

```env
APP_ENV=development
DATABASE_URL=sqlite:///./brandguard.db
FRONTEND_ORIGIN=http://localhost:3000
AUTH_SECRET=replace-this-with-a-long-random-secret
ACCESS_TOKEN_EXPIRE_MINUTES=30
AUTH_USERS_JSON={...}
GEMINI_API_KEY=your-google-ai-studio-key
GEMINI_MODEL=gemini-2.5-flash
```

Never commit `.env`, production secrets, plaintext production passwords, uploaded confidential content, or database files.

When `GEMINI_API_KEY` is set, audit requests use Gemini server-side with the active brand policy included in the review prompt. The browser never receives the key. If Gemini is unavailable, BrandGuard uses its deterministic policy engine and records the engine used in the audit result. Create the key in Google AI Studio and keep it only in the backend environment.

## Current implementation status

- Frontend migrated from JavaScript to strict TypeScript.
- FastAPI backend and SQLAlchemy persistence added.
- Brand policy, audit, upload, and review APIs added.
- Text, document, and image upload flows connected to the frontend.
- JWT authentication and role-based access control added.
- Frontend sign-in and protected API requests connected.
- Frontend lint, typecheck, and production build pass.
- Backend tests and Ruff checks pass.

The next product areas are production identity-provider integration, richer vision/LLM analysis, revision history, secure object storage, and deployment automation.
