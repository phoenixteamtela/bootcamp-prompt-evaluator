import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models.eval_run import EvalRun
from app.models.project import Project
from app.models.prompt_version import PromptVersion
from app.models.user import User
from app.schemas.leaderboard import LeaderboardEntry

router = APIRouter()


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
async def global_leaderboard(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    mode: str | None = Query(None, description="Filter by project mode: template or conversation"),
):
    """Global leaderboard — best avg score per student across all projects."""
    # Build base filter conditions
    conditions = [EvalRun.status == "completed", EvalRun.avg_score.isnot(None), EvalRun.is_seeded == False]
    if mode:
        conditions.append(Project.mode == mode)

    # Subquery: best eval run per user (optionally filtered by mode)
    best_runs_query = (
        select(
            EvalRun.user_id,
            func.max(EvalRun.avg_score).label("best_score"),
        )
        .where(*conditions)
    )

    if mode:
        best_runs_query = best_runs_query.join(Project, EvalRun.project_id == Project.id)

    best_runs = best_runs_query.group_by(EvalRun.user_id).subquery()

    result = await db.execute(
        select(
            User.id,
            User.display_name,
            best_runs.c.best_score,
        )
        .join(best_runs, User.id == best_runs.c.user_id)
        .where(User.is_admin == False)
        .order_by(best_runs.c.best_score.desc())
    )

    entries = []
    for rank, row in enumerate(result.all(), 1):
        # Get the actual best run details
        detail_query = (
            select(EvalRun, PromptVersion.version_number, PromptVersion.label, Project.name, Project.mode)
            .join(PromptVersion, EvalRun.prompt_version_id == PromptVersion.id)
            .join(Project, EvalRun.project_id == Project.id)
            .where(EvalRun.user_id == row.id, EvalRun.avg_score == row.best_score, EvalRun.status == "completed")
        )
        if mode:
            detail_query = detail_query.where(Project.mode == mode)
        detail_query = detail_query.order_by(EvalRun.created_at.desc()).limit(1)

        run_result = await db.execute(detail_query)
        run_row = run_result.first()

        entries.append(LeaderboardEntry(
            rank=rank,
            user_id=str(row.id),
            display_name=row.display_name,
            best_avg_score=round(row.best_score, 2),
            version_number=run_row.version_number if run_row else None,
            version_label=run_row.label if run_row else None,
            model=run_row.EvalRun.run_model if run_row else None,
            run_date=str(run_row.EvalRun.created_at.date()) if run_row else None,
            project_name=run_row.name if run_row else None,
            mode=run_row.mode if run_row else None,
        ))

    return entries


@router.get("/projects/{project_id}/leaderboard", response_model=list[LeaderboardEntry])
async def project_leaderboard(
    project_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Per-project leaderboard — best score per student for this project."""
    pid = uuid.UUID(project_id)

    # Get project mode for response
    proj_result = await db.execute(select(Project.mode).where(Project.id == pid))
    project_mode = proj_result.scalar_one_or_none()

    best_runs = (
        select(
            EvalRun.user_id,
            func.max(EvalRun.avg_score).label("best_score"),
        )
        .where(EvalRun.project_id == pid, EvalRun.status == "completed", EvalRun.avg_score.isnot(None), EvalRun.is_seeded == False)
        .group_by(EvalRun.user_id)
        .subquery()
    )

    result = await db.execute(
        select(
            User.id,
            User.display_name,
            best_runs.c.best_score,
        )
        .join(best_runs, User.id == best_runs.c.user_id)
        .where(User.is_admin == False)
        .order_by(best_runs.c.best_score.desc())
    )

    entries = []
    for rank, row in enumerate(result.all(), 1):
        run_result = await db.execute(
            select(EvalRun, PromptVersion.version_number, PromptVersion.label)
            .join(PromptVersion, EvalRun.prompt_version_id == PromptVersion.id)
            .where(
                EvalRun.user_id == row.id,
                EvalRun.project_id == pid,
                EvalRun.avg_score == row.best_score,
                EvalRun.status == "completed",
            )
            .order_by(EvalRun.created_at.desc())
            .limit(1)
        )
        run_row = run_result.first()

        entries.append(LeaderboardEntry(
            rank=rank,
            user_id=str(row.id),
            display_name=row.display_name,
            best_avg_score=round(row.best_score, 2),
            version_number=run_row.version_number if run_row else None,
            version_label=run_row.label if run_row else None,
            model=run_row.EvalRun.run_model if run_row else None,
            run_date=str(run_row.EvalRun.created_at.date()) if run_row else None,
            mode=project_mode,
        ))

    return entries
