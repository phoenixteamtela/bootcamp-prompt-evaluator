import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models.dataset import Dataset
from app.models.eval_result import EvalResult
from app.models.eval_run import EvalRun
from app.models.project import Project
from app.models.prompt_version import PromptVersion
from app.models.test_case import TestCase
from app.models.user import User
from app.services.export_service import build_eval_run_zip, build_project_zip, generate_html_report

router = APIRouter()


async def _get_run_results(db: AsyncSession, run: EvalRun) -> list[dict]:
    result = await db.execute(
        select(EvalResult).where(EvalResult.eval_run_id == run.id).order_by(EvalResult.created_at)
    )
    eval_results = result.scalars().all()
    out = []
    for er in eval_results:
        tc_result = await db.execute(select(TestCase).where(TestCase.id == er.test_case_id))
        tc = tc_result.scalar_one_or_none()
        out.append({
            "scenario": tc.scenario if tc else "",
            "prompt_inputs": tc.prompt_inputs if tc else {},
            "solution_criteria": tc.solution_criteria if tc else [],
            "rendered_prompt": er.rendered_prompt,
            "output": er.output,
            "score": er.score,
            "reasoning": er.reasoning,
            "strengths": er.strengths,
            "weaknesses": er.weaknesses,
        })
    return out


@router.get("/{project_id}/export")
async def export_project(
    project_id: str,
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

    # Gather all data
    v_result = await db.execute(
        select(PromptVersion).where(PromptVersion.project_id == pid).order_by(PromptVersion.version_number)
    )
    versions = [{"version_number": v.version_number, "label": v.label, "template": v.template}
                for v in v_result.scalars().all()]

    d_result = await db.execute(select(Dataset).where(Dataset.project_id == pid))
    datasets_data = []
    for d in d_result.scalars().all():
        tc_result = await db.execute(select(TestCase).where(TestCase.dataset_id == d.id))
        test_cases = [{"scenario": tc.scenario, "prompt_inputs": tc.prompt_inputs, "solution_criteria": tc.solution_criteria}
                      for tc in tc_result.scalars().all()]
        datasets_data.append({"name": d.name, "test_cases": test_cases})

    r_result = await db.execute(
        select(EvalRun).where(EvalRun.project_id == pid, EvalRun.status == "completed")
    )
    runs_data = []
    for run in r_result.scalars().all():
        results = await _get_run_results(db, run)
        runs_data.append({
            "id": str(run.id),
            "run_model": run.run_model,
            "grading_model": run.grading_model,
            "temperature": run.temperature,
            "avg_score": run.avg_score,
            "pass_rate": run.pass_rate,
            "results": results,
        })

    zip_bytes = build_project_zip({
        "name": project.name,
        "task_description": project.task_description,
        "prompt_inputs_spec": project.prompt_inputs_spec,
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "versions": versions,
        "datasets": datasets_data,
        "eval_runs": runs_data,
    })

    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{project.name}.zip"'},
    )


@router.get("/{project_id}/eval-runs/{run_id}/export")
async def export_eval_run(
    project_id: str,
    run_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(EvalRun).where(EvalRun.id == uuid.UUID(run_id), EvalRun.project_id == uuid.UUID(project_id))
    )
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Eval run not found")

    results = await _get_run_results(db, run)
    run_data = {
        "run_model": run.run_model,
        "grading_model": run.grading_model,
        "temperature": run.temperature,
        "avg_score": run.avg_score,
        "pass_rate": run.pass_rate,
    }

    zip_bytes = build_eval_run_zip(run_data, results)
    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="eval_run_{run_id[:8]}.zip"'},
    )


@router.get("/{project_id}/versions/{version_id}/export")
async def export_version(
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

    # Get all eval runs for this version
    runs_result = await db.execute(
        select(EvalRun).where(EvalRun.prompt_version_id == version.id, EvalRun.status == "completed")
    )

    import json
    export_data = {
        "version_number": version.version_number,
        "label": version.label,
        "template": version.template,
        "eval_runs": [],
    }
    for run in runs_result.scalars().all():
        export_data["eval_runs"].append({
            "id": str(run.id),
            "run_model": run.run_model,
            "grading_model": run.grading_model,
            "avg_score": run.avg_score,
            "pass_rate": run.pass_rate,
            "created_at": run.created_at.isoformat() if run.created_at else None,
        })

    return Response(
        content=json.dumps(export_data, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="v{version.version_number}_export.json"'},
    )
