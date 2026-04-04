import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models.eval_run import EvalRun
from app.models.project import Project
from app.models.prompt_version import PromptVersion
from app.models.user import User
from app.schemas.prompt_version import PromptVersionCreate, PromptVersionResponse

router = APIRouter()


async def _version_response(db: AsyncSession, v: PromptVersion) -> PromptVersionResponse:
    result = await db.execute(
        select(EvalRun.avg_score, EvalRun.pass_rate)
        .where(EvalRun.prompt_version_id == v.id, EvalRun.status == "completed")
        .order_by(EvalRun.created_at.desc())
        .limit(1)
    )
    row = result.first()
    return PromptVersionResponse(
        id=str(v.id),
        project_id=str(v.project_id),
        version_number=v.version_number,
        label=v.label,
        template=v.template,
        created_at=v.created_at,
        latest_avg_score=row.avg_score if row else None,
        latest_pass_rate=row.pass_rate if row else None,
    )


@router.get("/{project_id}/versions", response_model=list[PromptVersionResponse])
async def list_versions(
    project_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(PromptVersion)
        .where(PromptVersion.project_id == uuid.UUID(project_id))
        .order_by(PromptVersion.version_number.desc())
    )
    versions = result.scalars().all()
    return [await _version_response(db, v) for v in versions]


@router.post("/{project_id}/versions", response_model=PromptVersionResponse, status_code=201)
async def create_version(
    project_id: str,
    body: PromptVersionCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    pid = uuid.UUID(project_id)
    # Verify project ownership
    result = await db.execute(select(Project).where(Project.id == pid))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Access denied")

    # Get next version number
    result = await db.execute(
        select(func.coalesce(func.max(PromptVersion.version_number), 0))
        .where(PromptVersion.project_id == pid)
    )
    next_version = (result.scalar() or 0) + 1

    version = PromptVersion(
        project_id=pid,
        version_number=next_version,
        label=body.label,
        template=body.template,
    )
    db.add(version)
    await db.flush()
    return await _version_response(db, version)


@router.get("/{project_id}/versions/{version_id}", response_model=PromptVersionResponse)
async def get_version(
    project_id: str,
    version_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(PromptVersion).where(
            PromptVersion.id == uuid.UUID(version_id),
            PromptVersion.project_id == uuid.UUID(project_id),
        )
    )
    version = result.scalar_one_or_none()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    return await _version_response(db, version)
