from pydantic import BaseModel


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    display_name: str
    best_avg_score: float
    version_number: int | None = None
    version_label: str | None = None
    model: str | None = None
    run_date: str | None = None
    project_name: str | None = None
