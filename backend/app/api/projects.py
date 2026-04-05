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
from app.schemas.project import InputVarSpec, ProjectCreate, ProjectResponse, ProjectUpdate
from app.services.evaluator import normalize_spec

router = APIRouter()


async def _project_response(db: AsyncSession, project: Project) -> ProjectResponse:
    # Count versions
    result = await db.execute(
        select(func.count(PromptVersion.id)).where(PromptVersion.project_id == project.id)
    )
    version_count = result.scalar() or 0

    # Latest completed eval run score
    result = await db.execute(
        select(EvalRun.avg_score)
        .where(EvalRun.project_id == project.id, EvalRun.status == "completed")
        .order_by(EvalRun.created_at.desc())
        .limit(1)
    )
    latest_score = result.scalar_one_or_none()

    # Normalize old string-format specs to {description, type} dicts
    spec = None
    if project.prompt_inputs_spec:
        normalized = normalize_spec(project.prompt_inputs_spec)
        spec = {k: InputVarSpec(**v) for k, v in normalized.items()}

    return ProjectResponse(
        id=str(project.id),
        user_id=str(project.user_id),
        name=project.name,
        mode=project.mode,
        task_description=project.task_description,
        prompt_inputs_spec=spec,
        extra_criteria=project.extra_criteria,
        created_at=project.created_at,
        updated_at=project.updated_at,
        version_count=version_count,
        latest_avg_score=latest_score,
    )


@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(Project).where(Project.user_id == current_user.id).order_by(Project.updated_at.desc())
    )
    projects = result.scalars().all()
    return [await _project_response(db, p) for p in projects]


@router.post("", response_model=ProjectResponse, status_code=201)
async def create_project(
    body: ProjectCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    project = Project(
        user_id=current_user.id,
        name=body.name,
        mode=body.mode,
        task_description=body.task_description,
        prompt_inputs_spec={k: v.model_dump() for k, v in body.prompt_inputs_spec.items()} if body.prompt_inputs_spec else None,
        extra_criteria=body.extra_criteria,
    )
    db.add(project)
    await db.flush()
    return await _project_response(db, project)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(Project).where(Project.id == uuid.UUID(project_id)))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Access denied")
    return await _project_response(db, project)


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    body: ProjectUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(Project).where(Project.id == uuid.UUID(project_id)))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Access denied")
    if body.name is not None:
        project.name = body.name
    if body.task_description is not None:
        project.task_description = body.task_description
    if body.prompt_inputs_spec is not None:
        project.prompt_inputs_spec = {k: v.model_dump() for k, v in body.prompt_inputs_spec.items()}
    if body.extra_criteria is not None:
        project.extra_criteria = body.extra_criteria
    await db.flush()
    return await _project_response(db, project)


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(Project).where(Project.id == uuid.UUID(project_id)))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Access denied")
    await db.delete(project)
