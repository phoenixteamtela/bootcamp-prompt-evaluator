import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.api_limit import ApiLimit
from app.models.api_usage import ApiUsage


async def record_usage(
    db: AsyncSession,
    user_id: uuid.UUID,
    provider: str,
    model: str,
    operation: str,
    input_tokens: int,
    output_tokens: int,
) -> None:
    usage = ApiUsage(
        user_id=user_id,
        provider=provider,
        model=model,
        operation=operation,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
    )
    db.add(usage)
    await db.flush()


async def check_limits(db: AsyncSession, user_id: uuid.UUID) -> tuple[bool, str]:
    """Check if user is within API limits. Returns (allowed, reason)."""
    now = datetime.now(timezone.utc)
    hour_ago = now - timedelta(hours=1)
    day_ago = now - timedelta(days=1)

    # Get user-specific limit, fall back to global
    result = await db.execute(select(ApiLimit).where(ApiLimit.user_id == user_id))
    user_limit = result.scalar_one_or_none()

    if user_limit is None:
        result = await db.execute(select(ApiLimit).where(ApiLimit.user_id.is_(None)))
        user_limit = result.scalar_one_or_none()

    if user_limit is None:
        # No limits configured — allow
        return True, ""

    # Count calls in the last hour
    result = await db.execute(
        select(func.count(ApiUsage.id)).where(
            ApiUsage.user_id == user_id,
            ApiUsage.created_at >= hour_ago,
        )
    )
    hourly_count = result.scalar() or 0

    if hourly_count >= user_limit.max_calls_per_hour:
        return False, f"Hourly API limit reached ({user_limit.max_calls_per_hour} calls/hour)"

    # Count calls in the last day
    result = await db.execute(
        select(func.count(ApiUsage.id)).where(
            ApiUsage.user_id == user_id,
            ApiUsage.created_at >= day_ago,
        )
    )
    daily_count = result.scalar() or 0

    if daily_count >= user_limit.max_calls_per_day:
        return False, f"Daily API limit reached ({user_limit.max_calls_per_day} calls/day)"

    return True, ""


async def get_user_usage(db: AsyncSession, user_id: uuid.UUID) -> dict:
    """Get usage stats for a user."""
    now = datetime.now(timezone.utc)
    hour_ago = now - timedelta(hours=1)
    day_ago = now - timedelta(days=1)

    # Calls today
    result = await db.execute(
        select(func.count(ApiUsage.id)).where(
            ApiUsage.user_id == user_id,
            ApiUsage.created_at >= day_ago,
        )
    )
    calls_today = result.scalar() or 0

    # Calls this hour
    result = await db.execute(
        select(func.count(ApiUsage.id)).where(
            ApiUsage.user_id == user_id,
            ApiUsage.created_at >= hour_ago,
        )
    )
    calls_this_hour = result.scalar() or 0

    # Total tokens
    result = await db.execute(
        select(
            func.coalesce(func.sum(ApiUsage.input_tokens), 0),
            func.coalesce(func.sum(ApiUsage.output_tokens), 0),
        ).where(ApiUsage.user_id == user_id)
    )
    row = result.one()
    total_input_tokens = row[0]
    total_output_tokens = row[1]

    # Limits
    limit_result = await db.execute(select(ApiLimit).where(ApiLimit.user_id == user_id))
    user_limit = limit_result.scalar_one_or_none()
    if user_limit is None:
        limit_result = await db.execute(select(ApiLimit).where(ApiLimit.user_id.is_(None)))
        user_limit = limit_result.scalar_one_or_none()

    max_day = user_limit.max_calls_per_day if user_limit else 999999
    max_hour = user_limit.max_calls_per_hour if user_limit else 999999

    return {
        "calls_today": calls_today,
        "calls_this_hour": calls_this_hour,
        "max_calls_per_day": max_day,
        "max_calls_per_hour": max_hour,
        "total_input_tokens": total_input_tokens,
        "total_output_tokens": total_output_tokens,
    }
