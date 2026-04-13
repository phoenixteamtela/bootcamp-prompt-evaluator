# CLAUDE.md

Project-specific guidance for the Prompt Evaluator codebase.

## Development Commands

### Database

```bash
docker-compose up db -d          # Start PostgreSQL only
docker-compose down -v           # Reset database (destroys data)
```

### Backend

```bash
cd backend
pip install -r requirements.txt
alembic upgrade head             # Run migrations
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev                      # Vite dev server on :5173
npm run build                    # Production build
```

### Migrations

```bash
cd backend
alembic revision --autogenerate -m "description"
alembic upgrade head
alembic downgrade -1             # Rollback one
```

### Full Stack (Docker)

```bash
docker-compose up                # db + backend + frontend
docker-compose down
```

## Environment Variables

### Backend (`backend/.env`)

```
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/prompt_evaluator
JWT_SECRET=change-me-in-production
SEED_ADMIN_PASSWORD=changeme
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
CORS_ORIGINS=http://localhost:5173
```

Additional config in `app/config.py`: `JWT_ALGORITHM` (default HS256), `JWT_EXPIRY_HOURS` (default 24).

### Frontend

`VITE_API_URL` — defaults to `http://localhost:8000`, overridden in `docker-compose.yml`.

## Architecture

**Stack:** FastAPI + React (Vite/TypeScript) + PostgreSQL + SQLAlchemy async (asyncpg) + Alembic

### Backend (`backend/app/`)

| Directory   | Purpose                                          |
|-------------|--------------------------------------------------|
| `api/`      | Route handlers (auth, admin, projects, datasets, eval_runs, export, leaderboard, models, usage, versions) |
| `models/`   | SQLAlchemy ORM (User, Project, PromptVersion, Dataset, TestCase, EvalRun, EvalResult, ApiUsage, ApiLimit) |
| `schemas/`  | Pydantic request/response models                 |
| `services/` | Business logic (auth, LLM routing, evaluator pipeline, eval runner, export, usage tracking, clone) |

Key files: `main.py` (app setup, lifespan), `config.py` (Pydantic settings), `deps.py` (auth dependencies).

### Frontend (`frontend/src/`)

| Directory      | Purpose                                      |
|----------------|----------------------------------------------|
| `pages/`       | Route-level components (Login, Projects, Workspace, Admin, Leaderboard, About) |
| `components/`  | UI components — `workspace/` (stepper steps), `layout/` (AppLayout), `common/` (ScoreBadge, Tooltip) |
| `hooks/`       | `useSSE.ts` — generic SSE listener            |
| `contexts/`    | `AuthContext.tsx` — JWT state                  |
| `api/`         | `client.ts` — HTTP client, SSE helper          |
| `types/`       | TypeScript interfaces                          |

### Key Patterns

**LLM Routing** — `llm_service.py` provides a unified `chat()` interface. `get_provider(model)` checks model ID against known sets to route to Anthropic or OpenAI SDK.

**Evaluator Pipeline** — Faithful reimplementation of `assets/002_prompting_completed.ipynb`:
1. `generate_unique_ideas()` → scenario ideas
2. `generate_test_case()` → `{scenario, prompt_inputs, solution_criteria}`
3. `render()` → substitutes `{variable}` placeholders (use `{{`/`}}` for literal braces)
4. LLM call → output
5. `grade_output()` → `{score, reasoning, strengths, weaknesses, pillar_scores}`

**SSE Pub/Sub** — `eval_runner.py` manages `_event_queues` (resource_id → list of `asyncio.Queue`). Background tasks broadcast progress; frontend `useSSE` hook consumes events. Event types: `status`, `progress`, `complete`, `error`, `ping`.

**Two Evaluation Modes:**
- **Template** (`project.mode = "template"`) — User defines `prompt_inputs_spec`, writes prompt with `{variable}` placeholders, generates dataset of test cases, runs eval across all cases. Steps: Define Task → Dataset → Write Prompt → Run Eval → Results.
- **Conversation** (`project.mode = "conversation"`) — No dataset or template variables. User writes a single prompt, eval generates one scenario on-the-fly. Steps: Define Task → Write & Run → Results.

**Background Tasks** — `asyncio.create_task()` + `ThreadPoolExecutor(max_workers=4)` for blocking LLM calls. Each task creates a fresh `async_session()`. Lifespan startup resets interrupted runs to `failed`.

## API Routes

All routes prefixed with `/api`. Key groups:

- **Auth** — `POST /api/auth/login`, `GET /api/auth/me`
- **Admin** — `/api/admin/users` CRUD, limits, seed projects
- **Projects** — `/api/projects` CRUD
- **Versions** — `/api/projects/{id}/versions`
- **Datasets** — `/api/projects/{id}/datasets` (POST triggers background gen, GET `…/progress` for SSE)
- **Eval Runs** — `/api/projects/{id}/eval-runs` (POST triggers background eval, GET `…/progress` for SSE, POST `…/cancel`)
- **Export** — project ZIP, run ZIP, HTML report
- **Leaderboard** — `GET /api/leaderboard?mode=template|conversation`, per-project
- **Models** — `GET /api/models`
- **Usage** — `GET /api/usage`
- **Health** — `GET /api/health`

## Brand Identity

### Visual Standards

- Modern, clean UI — no browser-default styling on any element (dropdowns, selects, inputs, buttons)
- Consistent with PhoenixTeam branding across all outputs

### Typography

- **Primary font:** Sofia Pro (located in `assets/fonts/`)
- Apply Sofia Pro globally — never fall back to system fonts without explicit override

### Color Palette

- **Navy (PHOENIX):** `#2B3A57`
- **Orange (TEAM):** `#E8832A`
- **Phoenix Gradient:** orange `#E8832A` to deep orange `#D4691A`
- **Dark backgrounds:** `#000000` or `#1A1A2E`
- **Light text (reverse variants):** `#FFFFFF`

### Logo Assets

- All logo variants located in `assets/logos/`
- **Horizontal:** `PhoenixTeam_Horizontal_Gradient.png` (dark bg: use `_Reverse_Gradient`)
- **Horizontal w/ Bird in O:** `PhoenixTeam_Horizontal_O_Bird_Gradient.png` (dark bg: use `_Reverse_Gradient`)
- **Stacked:** `PhoenixTeam_Stacked_Gradient.png` (dark bg: use `_Reverse_Gradient`)
- **Bird icon only:** `PhoenixTeam_Bird_Gradient.png`
- Use gradient variants on light backgrounds, reverse gradient variants on dark backgrounds
