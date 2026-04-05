from datetime import datetime

from pydantic import BaseModel


class EvalRunCreate(BaseModel):
    prompt_version_id: str
    dataset_id: str | None = None
    run_model: str = "claude-haiku-4-5-20251001"
    grading_model: str = "claude-haiku-4-5-20251001"
    temperature: float = 1.0
    extra_criteria: str | None = None


class EvalResultResponse(BaseModel):
    id: str
    test_case_id: str | None = None
    scenario: str = ""
    prompt_inputs: dict = {}
    solution_criteria: list[str] = []
    rendered_prompt: str | None = None
    output: str
    score: float
    reasoning: str
    strengths: list[str]
    weaknesses: list[str]
    pillar_scores: dict | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class EvalRunResponse(BaseModel):
    id: str
    project_id: str
    prompt_version_id: str
    dataset_id: str | None = None
    user_id: str
    run_model: str
    grading_model: str
    temperature: float
    extra_criteria: str | None
    status: str
    total_cases: int
    completed_cases: int
    avg_score: float | None
    pass_rate: float | None
    error_message: str | None
    created_at: datetime
    completed_at: datetime | None
    results: list[EvalResultResponse] = []
    version_number: int | None = None
    version_label: str | None = None

    model_config = {"from_attributes": True}


class EvalRunListResponse(BaseModel):
    eval_runs: list[EvalRunResponse]
