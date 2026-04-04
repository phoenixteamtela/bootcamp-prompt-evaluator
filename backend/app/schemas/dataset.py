from datetime import datetime

from pydantic import BaseModel


class DatasetCreate(BaseModel):
    name: str
    num_cases: int = 5
    generation_model: str = "claude-haiku-4-5-20251001"


class TestCaseResponse(BaseModel):
    id: str
    scenario: str
    prompt_inputs: dict
    solution_criteria: list[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class DatasetResponse(BaseModel):
    id: str
    project_id: str
    name: str
    num_cases: int
    status: str
    generation_model: str | None
    created_at: datetime
    test_cases: list[TestCaseResponse] = []

    model_config = {"from_attributes": True}
