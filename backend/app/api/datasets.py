import asyncio
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from app.database import get_db
from app.deps import get_current_user
from app.models.dataset import Dataset
from app.models.project import Project
from app.models.test_case import TestCase
from app.models.user import User
from app.schemas.dataset import DatasetCreate, DatasetResponse, TestCaseResponse
from app.services.eval_runner import generate_dataset_background, subscribe, unsubscribe

router = APIRouter()


@router.get("/{project_id}/datasets", response_model=list[DatasetResponse])
async def list_datasets(
    project_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(Dataset).where(Dataset.project_id == uuid.UUID(project_id)).order_by(Dataset.created_at.desc())
    )
    datasets = result.scalars().all()
    out = []
    for d in datasets:
        tc_result = await db.execute(select(TestCase).where(TestCase.dataset_id == d.id))
        test_cases = tc_result.scalars().all()
        out.append(DatasetResponse(
            id=str(d.id), project_id=str(d.project_id), name=d.name, num_cases=d.num_cases,
            status=d.status, generation_model=d.generation_model, created_at=d.created_at,
            test_cases=[TestCaseResponse(id=str(tc.id), scenario=tc.scenario, prompt_inputs=tc.prompt_inputs,
                                         solution_criteria=tc.solution_criteria, created_at=tc.created_at) for tc in test_cases],
        ))
    return out


@router.post("/{project_id}/datasets", response_model=DatasetResponse, status_code=201)
async def create_dataset(
    project_id: str,
    body: DatasetCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    pid = uuid.UUID(project_id)
    result = await db.execute(select(Project).where(Project.id == pid))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Access denied")

    dataset = Dataset(
        project_id=pid,
        name=body.name,
        num_cases=body.num_cases,
        status="pending",
        generation_model=body.generation_model,
    )
    db.add(dataset)
    await db.flush()
    await db.commit()

    # Launch background generation
    asyncio.create_task(
        generate_dataset_background(
            dataset_id=dataset.id,
            task_description=project.task_description,
            prompt_inputs_spec=project.prompt_inputs_spec,
            num_cases=body.num_cases,
            model=body.generation_model,
            user_id=current_user.id,
        )
    )

    return DatasetResponse(
        id=str(dataset.id), project_id=str(dataset.project_id), name=dataset.name,
        num_cases=dataset.num_cases, status=dataset.status, generation_model=dataset.generation_model,
        created_at=dataset.created_at, test_cases=[],
    )


@router.get("/{project_id}/datasets/{dataset_id}", response_model=DatasetResponse)
async def get_dataset(
    project_id: str,
    dataset_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(Dataset).where(Dataset.id == uuid.UUID(dataset_id), Dataset.project_id == uuid.UUID(project_id))
    )
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    tc_result = await db.execute(select(TestCase).where(TestCase.dataset_id == dataset.id))
    test_cases = tc_result.scalars().all()

    return DatasetResponse(
        id=str(dataset.id), project_id=str(dataset.project_id), name=dataset.name,
        num_cases=dataset.num_cases, status=dataset.status, generation_model=dataset.generation_model,
        created_at=dataset.created_at,
        test_cases=[TestCaseResponse(id=str(tc.id), scenario=tc.scenario, prompt_inputs=tc.prompt_inputs,
                                     solution_criteria=tc.solution_criteria, created_at=tc.created_at) for tc in test_cases],
    )


@router.get("/{project_id}/datasets/{dataset_id}/progress")
async def dataset_progress(
    project_id: str,
    dataset_id: str,
    request: Request,
):
    resource_id = dataset_id
    queue = subscribe(resource_id)

    async def event_generator():
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield event
                    if event.get("event") in ("complete", "error"):
                        break
                except asyncio.TimeoutError:
                    yield {"event": "ping", "data": "{}"}
        finally:
            unsubscribe(resource_id, queue)

    return EventSourceResponse(event_generator())
