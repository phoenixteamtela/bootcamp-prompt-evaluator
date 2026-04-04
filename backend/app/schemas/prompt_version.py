from datetime import datetime

from pydantic import BaseModel


class PromptVersionCreate(BaseModel):
    template: str
    label: str | None = None


class PromptVersionResponse(BaseModel):
    id: str
    project_id: str
    version_number: int
    label: str | None
    template: str
    created_at: datetime
    latest_avg_score: float | None = None
    latest_pass_rate: float | None = None

    model_config = {"from_attributes": True}
