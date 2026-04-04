import asyncio
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from app.database import get_db
from app.deps import get_current_user
from app.models.eval_result import EvalResult
from app.models.eval_run import EvalRun
from app.models.project import Project
from app.models.prompt_version import PromptVersion
from app.models.test_case import TestCase
from app.models.user import User
from app.schemas.eval_run import EvalResultResponse, EvalRunCreate, EvalRunResponse
from app.services.eval_runner import cancel_run, run_evaluation_background, subscribe, unsubscribe

router = APIRouter()


async def _run_response(db: AsyncSession, run: EvalRun, include_results: bool = False) -> EvalRunResponse:
    results = []
    version_number = None
    version_label = None

    # Get version info
    v_result = await db.execute(select(PromptVersion).where(PromptVersion.id == run.prompt_version_id))
    version = v_result.scalar_one_or_none()
    if version:
        version_number = version.version_number
        version_label = version.label

    if include_results:
        r_result = await db.execute(
            select(EvalResult).where(EvalResult.eval_run_id == run.id).order_by(EvalResult.created_at)
        )
        eval_results = r_result.scalars().all()
        for er in eval_results:
            # Get test case data for enrichment
            tc_result = await db.execute(select(TestCase).where(TestCase.id == er.test_case_id))
            tc = tc_result.scalar_one_or_none()
            results.append(EvalResultResponse(
                id=str(er.id),
                test_case_id=str(er.test_case_id),
                scenario=tc.scenario if tc else "",
                prompt_inputs=tc.prompt_inputs if tc else {},
                solution_criteria=tc.solution_criteria if tc else [],
                rendered_prompt=er.rendered_prompt,
                output=er.output,
                score=er.score,
                reasoning=er.reasoning,
                strengths=er.strengths,
                weaknesses=er.weaknesses,
                created_at=er.created_at,
            ))

    return EvalRunResponse(
        id=str(run.id),
        project_id=str(run.project_id),
        prompt_version_id=str(run.prompt_version_id),
        dataset_id=str(run.dataset_id),
        user_id=str(run.user_id),
        run_model=run.run_model,
        grading_model=run.grading_model,
        temperature=run.temperature,
        extra_criteria=run.extra_criteria,
        status=run.status,
        total_cases=run.total_cases,
        completed_cases=run.completed_cases,
        avg_score=run.avg_score,
        pass_rate=run.pass_rate,
        error_message=run.error_message,
        created_at=run.created_at,
        completed_at=run.completed_at,
        results=results,
        version_number=version_number,
        version_label=version_label,
    )


@router.post("/{project_id}/eval-runs", response_model=EvalRunResponse, status_code=201)
async def create_eval_run(
    project_id: str,
    body: EvalRunCreate,
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

    # Verify version and dataset belong to project
    v_result = await db.execute(
        select(PromptVersion).where(
            PromptVersion.id == uuid.UUID(body.prompt_version_id),
            PromptVersion.project_id == pid,
        )
    )
    version = v_result.scalar_one_or_none()
    if not version:
        raise HTTPException(status_code=404, detail="Prompt version not found")

    eval_run = EvalRun(
        project_id=pid,
        prompt_version_id=uuid.UUID(body.prompt_version_id),
        dataset_id=uuid.UUID(body.dataset_id),
        user_id=current_user.id,
        run_model=body.run_model,
        grading_model=body.grading_model,
        temperature=body.temperature,
        extra_criteria=body.extra_criteria or project.extra_criteria,
        status="pending",
    )
    db.add(eval_run)
    await db.flush()
    await db.commit()

    # Launch background evaluation
    asyncio.create_task(
        run_evaluation_background(
            run_id=eval_run.id,
            project_id=pid,
            prompt_version_id=version.id,
            dataset_id=uuid.UUID(body.dataset_id),
            user_id=current_user.id,
            template=version.template,
            task_description=project.task_description,
            extra_criteria=eval_run.extra_criteria,
            run_model=body.run_model,
            grading_model=body.grading_model,
            temperature=body.temperature,
        )
    )

    return await _run_response(db, eval_run)


@router.get("/{project_id}/eval-runs", response_model=list[EvalRunResponse])
async def list_eval_runs(
    project_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(EvalRun)
        .where(EvalRun.project_id == uuid.UUID(project_id))
        .order_by(EvalRun.created_at.desc())
    )
    runs = result.scalars().all()
    return [await _run_response(db, r) for r in runs]


@router.get("/{project_id}/eval-runs/{run_id}", response_model=EvalRunResponse)
async def get_eval_run(
    project_id: str,
    run_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(EvalRun).where(
            EvalRun.id == uuid.UUID(run_id),
            EvalRun.project_id == uuid.UUID(project_id),
        )
    )
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Eval run not found")
    return await _run_response(db, run, include_results=True)


@router.get("/{project_id}/eval-runs/{run_id}/progress")
async def eval_run_progress(
    project_id: str,
    run_id: str,
    request: Request,
):
    resource_id = run_id
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


@router.post("/{project_id}/eval-runs/{run_id}/cancel", status_code=200)
async def cancel_eval_run(
    project_id: str,
    run_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(EvalRun).where(
            EvalRun.id == uuid.UUID(run_id),
            EvalRun.project_id == uuid.UUID(project_id),
        )
    )
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Eval run not found")
    if run.status not in ("pending", "running"):
        raise HTTPException(status_code=400, detail="Run is not in progress")
    cancel_run(run_id)
    return {"status": "cancelling"}
