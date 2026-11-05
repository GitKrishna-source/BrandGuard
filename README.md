# BrandGuard

BrandGuard is a pre-publication brand-governance platform for organisations that need to keep content consistent, accurate, accessible, and trustworthy across employees, agencies, and AI tools.

It reviews content against approved brand guidelines, facts, terminology, and assets. Instead of only rejecting content, BrandGuard explains each issue and suggests a correction that preserves the creator’s intent. Human reviewers remain in control through comments, approvals, and role-based publishing gates.

## Product capabilities

- Start a general content audit immediately: paste text or upload a document, with no brand setup. Checks cover clarity, tone, grammar, and claims needing evidence.
- General audits use neutral rules. For a source-backed demo, choose **Use Bootwear PDF** in the audit studio, or import an approved PDF as a Manager or Legal reviewer.
- The Bootwear Brand Vault offers a six-page fictional shoe-brand source book and judge walkthrough. Retrieved PDF passages are cited in findings, saved with each revision, and included in audit reports.
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

## Bootwear PDF and RAG demo

1. Sign in with a demo role, launch the audit studio, and click **Use Bootwear PDF**.
2. Download the guidelines to inspect the fictional brand rules, product facts, and judge exercise.
3. Load the Bootwear test draft and audit it. Expand **PDF evidence used in this audit** to inspect the exact source pages and passages.
4. Load the source-consistent sample, save a revision, and compare the actual findings and score. Human review is still required.
5. Manager and Legal roles can expand **Import an approved guideline PDF** to define a separate source-backed brand policy.

This is lexical RAG: pypdf extraction, page-labelled chunks, local BM25 retrieval, then the configured Groq/Gemini audit using the retrieved passages. It does not require an embedding API or vector database. The judge exercise page is excluded from the evidence index so deliberately false test copy cannot become approved evidence.

The canonical demo PDF ships at `backend/app/assets/bootwear-brand-guidelines.pdf`. Rebuild it with `python backend/scripts/build_bootwear_pdf.py`; this also writes a judge handout under `output/pdf/`. Bootwear and all catalogue facts are fictional demo inputs, not independently verified real-world claims.

Source PDFs and extracted passages are retained in the database. Source-backed policies are immutable; importing a new PDF creates a new policy version. Creators cannot read or audit against another user's private imported source; Manager and Legal roles retain workspace review access. Relevant passages and the draft accompany configured external AI requests. Local fallback is explicitly labelled and applies limited rules rather than claiming a completed contextual AI review.

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
- Omit `policy_id` for a general audit; explicit policy IDs remain supported by the API. Uploads also accept an omitted `policy_id`. The versioned general policy is created automatically and cannot be edited.
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
