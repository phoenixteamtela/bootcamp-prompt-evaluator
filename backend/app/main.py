from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, admin, projects, versions, datasets, eval_runs, leaderboard, export, models, usage
from app.config import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.database import async_session
    from app.services.auth_service import get_or_create_seed_admin
    async with async_session() as db:
        await get_or_create_seed_admin(db)
    yield


app = FastAPI(title="Prompt Evaluator", version="1.0.0", lifespan=lifespan)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(versions.router, prefix="/api/projects", tags=["versions"])
app.include_router(datasets.router, prefix="/api/projects", tags=["datasets"])
app.include_router(eval_runs.router, prefix="/api/projects", tags=["eval-runs"])
app.include_router(leaderboard.router, prefix="/api", tags=["leaderboard"])
app.include_router(export.router, prefix="/api/projects", tags=["export"])
app.include_router(models.router, prefix="/api", tags=["models"])
app.include_router(usage.router, prefix="/api", tags=["usage"])


@app.get("/api/health")
async def health():
    return {"status": "ok"}
