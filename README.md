# BrandGuard AI 🛡️
### *AI-Powered Brand Governance, Content Compliance & Real-Time RAG Safety Engine*

[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-blue?logo=github)](https://github.com/GitKrishna-source/BrandGuard)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React%20%7C%20TypeScript-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Groq](https://img.shields.io/badge/AI%20Provider-Groq%20%7C%20Gemini-F05A28)](https://groq.com/)

---

## 💡 1. Basic Idea of the Project

When marketing teams, copywriters, or generative AI create content (product announcements, press releases, social ads, blogs, or investor disclosures), critical mistakes often slip through:
- **Unsupported & Absolute Claims:** *"100% bug-free"*, *"#1 ranking in the world"*, or fabricated financial metrics (violating legal and SEC regulations).
- **Prohibited Slang & Banned Nomenclature:** Outdated product names, slang (e.g., *"kicks"* instead of *"shoes"*), or unapproved customer support designations.
- **AI Hallucinations:** Fabricated certifications, fake ISO endorsements, or incorrect pricing/warranty terms.
- **Tone & Style Drift:** Inconsistent voice, non-compliant brand colors, or broken image accessibility.

**BrandGuard AI** acts as an autonomous brand safety officer. It ingests company brand guidelines, audits drafts in real-time using **Local PDF RAG + Groq/Gemini LLM reasoning**, pinpoints violations with **exact page-level citations**, and provides **1-Click AI Auto-Fix (Remediation)** to rewrite statements into 100% compliant copy while preserving the creator's voice.

---

## 🔄 2. Project Flow (How It Works)

```mermaid
graph TD
    A[Content Input: Text / PDF / DOCX / Image] --> B[Brand Policy & Guideline Vault]
    B --> C[BM25 Local PDF RAG: Page-Level Chunk Retrieval]
    C --> D[AI Audit Engine: Groq Qwen / Google Gemini]
    D --> E[Violation Findings with Exact Page Citations]
    E --> F["✨ 1-Click AI Auto-Fix (Remediation)"]
    F --> G[Compliance Score 100% + Confetti]
    G --> H[Multi-Stage Role Approval: Creator -> Manager -> Legal]
    H --> I[Export Audited Report as PDF / JSON]
```

1. **Content Input:**
   - Paste custom copy, upload creative assets (PDF, DOCX, PNG/JPG images), or load the interactive **Bootwear Brand Guidelines** demo.
2. **Local BM25 PDF RAG Retrieval:**
   - The backend extracts page-labelled chunks from the brand guidelines PDF. Relevant evidence passages and rules are retrieved without needing an external vector DB.
3. **Deep LLM Audit:**
   - The draft and retrieved evidence are evaluated by **Groq (`qwen/qwen3.8-27b`)** or **Google Gemini**.
   - Findings report exact evidence, severity, explanation, and source citations (e.g., `[S2] bootwear-brand-guidelines.pdf, p. 4, p4-c13`).
4. **1-Click AI Auto-Fix (Remediation):**
   - Click **"✨ AI Auto-Fix Statement"** — the AI automatically rewrites the draft, replacing banned words and unverified claims with audited guidelines facts.
   - Includes full **"Undo Fix"** support and per-finding **"Apply Fix"** buttons.
5. **Human Governance & Approval Pipeline:**
   - Role-based permissions (**Creator**, **Manager**, **Legal**).
   - Real-time review comments, approval sign-offs, and compliance history.
6. **Report Export:**
   - Download verifiable audit certificates in **PDF** or **JSON** format with recorded review logs.

---

## ⚡ 3. How to Start the Server with ONE Line

You can launch both the **FastAPI Backend (port 8000)** and the **React + Vite Frontend (port 3000)** concurrently using a single command:

```powershell
npm run dev
```

*(Alternatively, you can run `npm start`, execute `.\start.ps1`, or double-click `start.bat` in File Explorer).*

### What happens behind the scenes:
- Terminal shows color-coded prefixes: `[BACKEND]` (cyan) and `[FRONTEND]` (magenta).
- Backend runs at: **[http://localhost:8000](http://localhost:8000)** (Swagger API Docs: `http://localhost:8000/docs`)
- Frontend runs at: **[http://localhost:3000](http://localhost:3000)**
- Pressing `Ctrl + C` cleanly stops both servers together.

---

## 🔗 4. GitHub Repository Link

- **Official Repository:** [https://github.com/GitKrishna-source/BrandGuard](https://github.com/GitKrishna-source/BrandGuard)

---

## 🛠️ 5. Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript (strict), Vite, Tailwind CSS, Lucide Icons, Canvas Confetti |
| **Backend** | Python 3.11+, FastAPI, SQLAlchemy, Uvicorn, Pydantic v2 |
| **AI & RAG** | Groq Cloud (`qwen/qwen3.8-27b`), Google Gemini (`gemini-2.5-flash`), Local BM25 Page-Level PDF RAG |
| **Parsers** | `pypdf` (PDF), `python-docx` (Word), `Pillow` (Image & Palette), `reportlab` (PDF generation) |
| **Security & Auth** | JWT Bearer tokens, Argon2 password hashing, Role-Based Access Control (RBAC) |
| **Database** | SQLite (local development) / PostgreSQL (production Docker Compose ready) |
| **Testing & Quality** | Pytest (65 unit tests, 100% pass), ESLint, Ruff linter |

---

## 🧪 6. Quick Verification Guide

1. Open **[http://localhost:3000](http://localhost:3000)** in your browser.
2. Click **"Sign In"** in the top navigation bar and pick **Creator** or **Manager** demo role.
3. Click **"Run Custom Audit"** -> Click **"Load Bootwear test draft"**.
4. Click **"Audit content"** to see live Groq LLM violations with page citations.
5. Click **"✨ AI Auto-Fix Statement"** to watch the AI rewrite the draft into verified compliant copy!
6. Click **"Save Revision & Re-audit"** to see the 100% green readiness score.
