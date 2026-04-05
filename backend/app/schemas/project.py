from datetime import datetime
from typing import Literal

from pydantic import BaseModel, model_validator


class InputVarSpec(BaseModel):
    description: str
    type: str = "short_text"


class ProjectCreate(BaseModel):
    name: str
    task_description: str
    mode: Literal["template", "conversation"] = "template"
    prompt_inputs_spec: dict[str, InputVarSpec] | None = None
    extra_criteria: str | None = None

    @model_validator(mode="after")
    def validate_mode_fields(self):
        if self.mode == "template":
            if not self.prompt_inputs_spec:
                raise ValueError("Template projects require prompt_inputs_spec")
        elif self.mode == "conversation":
            self.prompt_inputs_spec = None
        return self


class ProjectUpdate(BaseModel):
    name: str | None = None
    task_description: str | None = None
    prompt_inputs_spec: dict[str, InputVarSpec] | None = None
    extra_criteria: str | None = None


class ProjectResponse(BaseModel):
    id: str
    user_id: str
    name: str
    mode: str
    task_description: str
    prompt_inputs_spec: dict[str, InputVarSpec] | None
    extra_criteria: str | None
    created_at: datetime
    updated_at: datetime
    version_count: int = 0
    latest_avg_score: float | None = None

    model_config = {"from_attributes": True}


class ProjectListResponse(BaseModel):
    projects: list[ProjectResponse]
