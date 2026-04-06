import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.dataset import Dataset
from app.models.eval_result import EvalResult
from app.models.eval_run import EvalRun
from app.models.project import Project
from app.models.prompt_version import PromptVersion
from app.models.test_case import TestCase


async def clone_projects_to_user(
    db: AsyncSession, source_user_id: uuid.UUID, target_user_id: uuid.UUID
) -> int:
    """Deep-clone all projects from source user to target user.

    Clones the full chain: Project -> PromptVersion -> Dataset -> TestCase -> EvalRun -> EvalResult.
    Skips projects the target already has (matched by name).
    Returns the count of projects cloned.
    """
    # Get existing project names for target user (for idempotency)
    existing_result = await db.execute(
        select(Project.name).where(Project.user_id == target_user_id)
    )
    existing_names = set(existing_result.scalars().all())

    # Load source projects with all nested relationships
    source_result = await db.execute(
        select(Project)
        .where(Project.user_id == source_user_id)
        .options(
            selectinload(Project.prompt_versions),
            selectinload(Project.datasets).selectinload(Dataset.test_cases),
            selectinload(Project.eval_runs).selectinload(EvalRun.results),
        )
    )
    source_projects = source_result.scalars().all()

    cloned_count = 0

    for src_project in source_projects:
        if src_project.name in existing_names:
            continue

        now = datetime.now(timezone.utc)

        # --- Clone Project ---
        new_project_id = uuid.uuid4()
        new_project = Project(
            id=new_project_id,
            user_id=target_user_id,
            name=src_project.name,
            mode=src_project.mode,
            task_description=src_project.task_description,
            prompt_inputs_spec=src_project.prompt_inputs_spec,
            extra_criteria=src_project.extra_criteria,
            created_at=now,
            updated_at=now,
        )
        db.add(new_project)

        # --- Clone PromptVersions (build old->new ID map for EvalRun FK) ---
        pv_id_map: dict[uuid.UUID, uuid.UUID] = {}
        for src_pv in src_project.prompt_versions:
            new_pv_id = uuid.uuid4()
            pv_id_map[src_pv.id] = new_pv_id
            db.add(PromptVersion(
                id=new_pv_id,
                project_id=new_project_id,
                version_number=src_pv.version_number,
                label=src_pv.label,
                template=src_pv.template,
                created_at=now,
            ))

        # --- Clone Datasets + TestCases (build old->new ID maps) ---
        ds_id_map: dict[uuid.UUID, uuid.UUID] = {}
        tc_id_map: dict[uuid.UUID, uuid.UUID] = {}
        for src_ds in src_project.datasets:
            new_ds_id = uuid.uuid4()
            ds_id_map[src_ds.id] = new_ds_id
            db.add(Dataset(
                id=new_ds_id,
                project_id=new_project_id,
                name=src_ds.name,
                num_cases=src_ds.num_cases,
                status=src_ds.status,
                generation_model=src_ds.generation_model,
                created_at=now,
            ))
            for src_tc in src_ds.test_cases:
                new_tc_id = uuid.uuid4()
                tc_id_map[src_tc.id] = new_tc_id
                db.add(TestCase(
                    id=new_tc_id,
                    dataset_id=new_ds_id,
                    scenario=src_tc.scenario,
                    prompt_inputs=src_tc.prompt_inputs,
                    solution_criteria=src_tc.solution_criteria,
                    created_at=now,
                ))

        # --- Clone EvalRuns + EvalResults ---
        for src_run in src_project.eval_runs:
            new_run_id = uuid.uuid4()
            new_pv_id = pv_id_map.get(src_run.prompt_version_id)
            if new_pv_id is None:
                continue  # skip if prompt version wasn't cloned (shouldn't happen)
            new_ds_id = ds_id_map.get(src_run.dataset_id) if src_run.dataset_id else None

            db.add(EvalRun(
                id=new_run_id,
                project_id=new_project_id,
                prompt_version_id=new_pv_id,
                dataset_id=new_ds_id,
                user_id=target_user_id,
                run_model=src_run.run_model,
                grading_model=src_run.grading_model,
                temperature=src_run.temperature,
                extra_criteria=src_run.extra_criteria,
                status=src_run.status,
                total_cases=src_run.total_cases,
                completed_cases=src_run.completed_cases,
                avg_score=src_run.avg_score,
                pass_rate=src_run.pass_rate,
                error_message=src_run.error_message,
                created_at=now,
                completed_at=src_run.completed_at,
            ))

            for src_result in src_run.results:
                new_tc_id = tc_id_map.get(src_result.test_case_id) if src_result.test_case_id else None
                db.add(EvalResult(
                    id=uuid.uuid4(),
                    eval_run_id=new_run_id,
                    test_case_id=new_tc_id,
                    rendered_prompt=src_result.rendered_prompt,
                    output=src_result.output,
                    score=src_result.score,
                    reasoning=src_result.reasoning,
                    strengths=src_result.strengths,
                    weaknesses=src_result.weaknesses,
                    pillar_scores=src_result.pillar_scores,
                    created_at=now,
                ))

        cloned_count += 1

    await db.flush()
    return cloned_count
