"""
Eval runner — async orchestration for dataset generation and evaluation runs.
Uses background tasks with SSE event broadcasting.
"""

import asyncio
import json
import uuid
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from statistics import mean

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session
from app.models.dataset import Dataset
from app.models.eval_result import EvalResult
from app.models.eval_run import EvalRun
from app.models.test_case import TestCase
from app.services import evaluator, llm_service, usage_service

# SSE event queues keyed by resource ID
_event_queues: dict[str, list[asyncio.Queue]] = defaultdict(list)
_executor = ThreadPoolExecutor(max_workers=4)


def subscribe(resource_id: str) -> asyncio.Queue:
    queue: asyncio.Queue = asyncio.Queue()
    _event_queues[resource_id].append(queue)
    return queue


def unsubscribe(resource_id: str, queue: asyncio.Queue) -> None:
    queues = _event_queues.get(resource_id, [])
    if queue in queues:
        queues.remove(queue)
    if not queues:
        _event_queues.pop(resource_id, None)


async def _broadcast(resource_id: str, event: str, data: dict) -> None:
    message = json.dumps(data)
    for queue in _event_queues.get(resource_id, []):
        await queue.put({"event": event, "data": message})


# ---------- Dataset Generation ----------

async def generate_dataset_background(
    dataset_id: uuid.UUID,
    task_description: str,
    prompt_inputs_spec: dict[str, str],
    num_cases: int,
    model: str,
    user_id: uuid.UUID,
) -> None:
    """Background task: generates test cases for a dataset."""
    resource_id = str(dataset_id)

    async with async_session() as db:
        try:
            # Update status
            result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
            dataset = result.scalar_one()
            dataset.status = "generating"
            await db.commit()

            await _broadcast(resource_id, "status", {"status": "generating"})

            # Step 1: Generate ideas
            loop = asyncio.get_event_loop()
            ideas, idea_response = await loop.run_in_executor(
                _executor,
                evaluator.generate_unique_ideas,
                task_description,
                prompt_inputs_spec,
                num_cases,
                model,
            )

            # Record usage for idea generation
            await usage_service.record_usage(
                db, user_id, idea_response.provider, idea_response.model,
                "generate_ideas", idea_response.input_tokens, idea_response.output_tokens,
            )
            await db.commit()

            await _broadcast(resource_id, "progress", {
                "step": "ideas_generated",
                "total": len(ideas),
                "completed": 0,
            })

            # Step 2: Generate test cases in parallel
            completed = 0
            for idea in ideas:
                # Check limits before each call
                allowed, reason = await usage_service.check_limits(db, user_id)
                if not allowed:
                    dataset.status = "failed"
                    await db.commit()
                    await _broadcast(resource_id, "error", {"message": reason})
                    return

                test_case_data, tc_response = await loop.run_in_executor(
                    _executor,
                    evaluator.generate_test_case,
                    task_description,
                    idea,
                    prompt_inputs_spec,
                    model,
                )

                await usage_service.record_usage(
                    db, user_id, tc_response.provider, tc_response.model,
                    "generate_test_case", tc_response.input_tokens, tc_response.output_tokens,
                )

                tc = TestCase(
                    dataset_id=dataset_id,
                    scenario=test_case_data.get("scenario", idea),
                    prompt_inputs=test_case_data["prompt_inputs"],
                    solution_criteria=test_case_data["solution_criteria"],
                )
                db.add(tc)
                await db.flush()

                completed += 1
                await _broadcast(resource_id, "progress", {
                    "step": "test_case_generated",
                    "total": len(ideas),
                    "completed": completed,
                    "test_case_id": str(tc.id),
                    "scenario": tc.scenario,
                })
                await db.commit()

            dataset.status = "ready"
            await db.commit()
            await _broadcast(resource_id, "complete", {"status": "ready", "total": completed})

        except Exception as e:
            result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
            dataset = result.scalar_one_or_none()
            if dataset:
                dataset.status = "failed"
                await db.commit()
            await _broadcast(resource_id, "error", {"message": str(e)})


# ---------- Eval Run ----------

# Track cancellable runs
_cancelled_runs: set[str] = set()


def cancel_run(run_id: str) -> None:
    _cancelled_runs.add(run_id)


async def run_evaluation_background(
    run_id: uuid.UUID,
    project_id: uuid.UUID,
    prompt_version_id: uuid.UUID,
    dataset_id: uuid.UUID,
    user_id: uuid.UUID,
    template: str,
    task_description: str,
    extra_criteria: str | None,
    run_model: str,
    grading_model: str,
    temperature: float,
) -> None:
    """Background task: runs evaluation for all test cases."""
    resource_id = str(run_id)

    async with async_session() as db:
        try:
            # Load test cases
            result = await db.execute(
                select(TestCase).where(TestCase.dataset_id == dataset_id)
            )
            test_cases = list(result.scalars().all())

            # Update run status
            result = await db.execute(select(EvalRun).where(EvalRun.id == run_id))
            eval_run = result.scalar_one()
            eval_run.status = "running"
            eval_run.total_cases = len(test_cases)
            await db.commit()

            await _broadcast(resource_id, "status", {
                "status": "running",
                "total": len(test_cases),
            })

            scores = []
            completed = 0
            loop = asyncio.get_event_loop()

            for tc in test_cases:
                # Check cancellation
                if str(run_id) in _cancelled_runs:
                    _cancelled_runs.discard(str(run_id))
                    eval_run.status = "cancelled"
                    await db.commit()
                    await _broadcast(resource_id, "complete", {"status": "cancelled"})
                    return

                # Check limits
                allowed, reason = await usage_service.check_limits(db, user_id)
                if not allowed:
                    eval_run.status = "failed"
                    eval_run.error_message = reason
                    await db.commit()
                    await _broadcast(resource_id, "error", {"message": reason})
                    return

                # Step 1: Run prompt
                output_text, run_response = await loop.run_in_executor(
                    _executor,
                    evaluator.run_prompt_with_template,
                    template,
                    tc.prompt_inputs,
                    run_model,
                    temperature,
                )

                await usage_service.record_usage(
                    db, user_id, run_response.provider, run_response.model,
                    "run_prompt", run_response.input_tokens, run_response.output_tokens,
                )
                await db.commit()

                # Check limits again before grading
                allowed, reason = await usage_service.check_limits(db, user_id)
                if not allowed:
                    eval_run.status = "failed"
                    eval_run.error_message = reason
                    await db.commit()
                    await _broadcast(resource_id, "error", {"message": reason})
                    return

                # Step 2: Grade output
                grade, grade_response = await loop.run_in_executor(
                    _executor,
                    evaluator.grade_output,
                    task_description,
                    tc.prompt_inputs,
                    tc.solution_criteria,
                    output_text,
                    extra_criteria,
                    grading_model,
                )

                await usage_service.record_usage(
                    db, user_id, grade_response.provider, grade_response.model,
                    "grade_output", grade_response.input_tokens, grade_response.output_tokens,
                )

                # Save result
                eval_result = EvalResult(
                    eval_run_id=run_id,
                    test_case_id=tc.id,
                    output=output_text,
                    score=grade["score"],
                    reasoning=grade["reasoning"],
                    strengths=grade.get("strengths", []),
                    weaknesses=grade.get("weaknesses", []),
                )
                db.add(eval_result)

                completed += 1
                scores.append(grade["score"])
                eval_run.completed_cases = completed
                await db.commit()

                await _broadcast(resource_id, "result", {
                    "completed": completed,
                    "total": len(test_cases),
                    "test_case_id": str(tc.id),
                    "scenario": tc.scenario,
                    "score": grade["score"],
                    "output": output_text[:500],
                    "reasoning": grade["reasoning"],
                })

            # Finalize
            eval_run.status = "completed"
            eval_run.avg_score = mean(scores) if scores else 0
            eval_run.pass_rate = (len([s for s in scores if s >= 7]) / len(scores) * 100) if scores else 0
            eval_run.completed_at = datetime.now(timezone.utc)
            await db.commit()

            await _broadcast(resource_id, "complete", {
                "status": "completed",
                "avg_score": eval_run.avg_score,
                "pass_rate": eval_run.pass_rate,
                "total": len(test_cases),
            })

        except Exception as e:
            result = await db.execute(select(EvalRun).where(EvalRun.id == run_id))
            eval_run = result.scalar_one_or_none()
            if eval_run:
                eval_run.status = "failed"
                eval_run.error_message = str(e)
                await db.commit()
            await _broadcast(resource_id, "error", {"message": str(e)})
