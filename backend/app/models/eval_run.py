import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class EvalRun(Base):
    __tablename__ = "eval_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    prompt_version_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("prompt_versions.id"), nullable=False)
    dataset_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("datasets.id"), nullable=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Config snapshot
    run_model: Mapped[str] = mapped_column(String(100), nullable=False)
    grading_model: Mapped[str] = mapped_column(String(100), nullable=False)
    temperature: Mapped[float] = mapped_column(Float, default=1.0)
    extra_criteria: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Status & results
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")  # pending, running, completed, failed, cancelled
    total_cases: Mapped[int] = mapped_column(Integer, default=0)
    completed_cases: Mapped[int] = mapped_column(Integer, default=0)
    avg_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    pass_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    project = relationship("Project", back_populates="eval_runs")
    prompt_version = relationship("PromptVersion", back_populates="eval_runs")
    dataset = relationship("Dataset", back_populates="eval_runs")
    user = relationship("User", back_populates="eval_runs")
    results = relationship("EvalResult", back_populates="eval_run", cascade="all, delete-orphan")
