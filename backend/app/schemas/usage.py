from pydantic import BaseModel


class UsageResponse(BaseModel):
    calls_today: int
    calls_this_hour: int
    max_calls_per_day: int
    max_calls_per_hour: int
    total_input_tokens: int
    total_output_tokens: int


class LimitResponse(BaseModel):
    id: str | None = None
    user_id: str | None = None
    username: str | None = None
    max_calls_per_day: int
    max_calls_per_hour: int


class LimitUpdate(BaseModel):
    max_calls_per_day: int | None = None
    max_calls_per_hour: int | None = None
