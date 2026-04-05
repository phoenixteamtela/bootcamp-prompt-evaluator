"""Add conversation mode support

Revision ID: 003
Revises: 002
Create Date: 2026-04-04

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add mode column to projects, default existing rows to 'template'
    op.add_column(
        "projects",
        sa.Column("mode", sa.String(20), nullable=False, server_default="template"),
    )

    # Make prompt_inputs_spec nullable (conversation projects don't need it)
    op.alter_column("projects", "prompt_inputs_spec", existing_type=sa.JSON(), nullable=True)

    # Make dataset_id nullable on eval_runs (conversation evals have no dataset)
    op.alter_column("eval_runs", "dataset_id", existing_type=sa.UUID(), nullable=True)

    # Make test_case_id nullable on eval_results (conversation results have no test case)
    op.alter_column("eval_results", "test_case_id", existing_type=sa.UUID(), nullable=True)

    # Add pillar_scores JSON column to eval_results for conversation grading breakdown
    op.add_column(
        "eval_results",
        sa.Column("pillar_scores", sa.JSON(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("eval_results", "pillar_scores")
    op.alter_column("eval_results", "test_case_id", existing_type=sa.UUID(), nullable=False)
    op.alter_column("eval_runs", "dataset_id", existing_type=sa.UUID(), nullable=False)
    op.alter_column("projects", "prompt_inputs_spec", existing_type=sa.JSON(), nullable=False)
    op.drop_column("projects", "mode")
