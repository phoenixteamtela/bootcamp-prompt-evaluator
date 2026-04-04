from datetime import datetime

from pydantic import BaseModel


class ProjectCreate(BaseModel):
    name: str
    task_description: str
    prompt_inputs_spec: dict[str, str]
    extra_criteria: str | None = None


class ProjectUpdate(BaseModel):
    name: str | None = None
    task_description: str | None = None
    prompt_inputs_spec: dict[str, str] | None = None
    extra_criteria: str | None = None


class ProjectResponse(BaseModel):
    id: str
    user_id: str
    name: str
    task_description: str
    prompt_inputs_spec: dict[str, str]
    extra_criteria: str | None
    created_at: datetime
    updated_at: datetime
    version_count: int = 0
    latest_avg_score: float | None = None

    model_config = {"from_attributes": True}


class ProjectListResponse(BaseModel):
    projects: list[ProjectResponse]
