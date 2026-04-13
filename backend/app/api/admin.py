import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import require_admin
from app.models.api_limit import ApiLimit
from app.models.api_usage import ApiUsage
from app.models.user import User
from app.schemas.usage import LimitResponse, LimitUpdate
from app.schemas.user import BulkUserCreate, BulkUserResult, BulkUserError, UserCreate, UserResponse, UserUpdate
from app.services.auth_service import create_user, hash_password
from app.services.clone_service import clone_projects_to_user

router = APIRouter()


# ---- User Management ----

@router.get("/users", response_model=list[UserResponse])
async def list_users(
    _admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(User).order_by(User.created_at))
    users = result.scalars().all()
    return [UserResponse(id=str(u.id), username=u.username, display_name=u.display_name,
                         is_admin=u.is_admin, is_active=u.is_active, created_at=u.created_at) for u in users]


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_new_user(
    body: UserCreate,
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    existing = await db.execute(select(User).where(User.username == body.username))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already exists")
    user = await create_user(db, body.username, body.display_name, body.password, body.is_admin)
    # Auto-seed starter projects from the admin who created this user
    await clone_projects_to_user(db, source_user_id=admin.id, target_user_id=user.id)
    return UserResponse(id=str(user.id), username=user.username, display_name=user.display_name,
                        is_admin=user.is_admin, is_active=user.is_active, created_at=user.created_at)


@router.post("/users/bulk", response_model=BulkUserResult)
async def bulk_create_users(
    body: BulkUserCreate,
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    # Collect all requested usernames and check for duplicates within the batch
    seen: dict[str, int] = {}
    errors: list[BulkUserError] = []
    for i, u in enumerate(body.users):
        lower = u.username.lower()
        if lower in seen:
            errors.append(BulkUserError(username=u.username, detail="Duplicate within batch"))
        else:
            seen[lower] = i

    # Check which usernames already exist in DB
    if seen:
        result = await db.execute(
            select(User.username).where(
                func.lower(User.username).in_(list(seen.keys()))
            )
        )
        existing_usernames = {row.lower() for row in result.scalars().all()}
        for username_lower in existing_usernames:
            idx = seen.pop(username_lower, None)
            if idx is not None:
                errors.append(BulkUserError(
                    username=body.users[idx].username,
                    detail="Username already exists",
                ))

    # Create valid users
    created: list[UserResponse] = []
    valid_indices = set(seen.values())
    for i, u in enumerate(body.users):
        if i not in valid_indices:
            continue
        user = await create_user(db, u.username, u.display_name, u.password, False)
        await clone_projects_to_user(db, source_user_id=admin.id, target_user_id=user.id)
        created.append(UserResponse(
            id=str(user.id), username=user.username, display_name=user.display_name,
            is_admin=user.is_admin, is_active=user.is_active, created_at=user.created_at,
        ))

    return BulkUserResult(created=created, errors=errors)


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    body: UserUpdate,
    _admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if body.display_name is not None:
        user.display_name = body.display_name
    if body.password is not None:
        user.password_hash = hash_password(body.password)
    if body.is_admin is not None:
        user.is_admin = body.is_admin
    if body.is_active is not None:
        user.is_active = body.is_active
    await db.flush()
    return UserResponse(id=str(user.id), username=user.username, display_name=user.display_name,
                        is_admin=user.is_admin, is_active=user.is_active, created_at=user.created_at)


@router.post("/users/{user_id}/seed-projects")
async def seed_projects(
    user_id: str,
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    uid = uuid.UUID(user_id)
    result = await db.execute(select(User).where(User.id == uid))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="User not found")
    count = await clone_projects_to_user(db, source_user_id=admin.id, target_user_id=uid)
    return {"cloned": count}


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    _admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.delete(user)


# ---- Usage Stats ----

@router.get("/usage")
async def get_usage_stats(
    _admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(
            ApiUsage.user_id,
            User.username,
            User.display_name,
            func.count(ApiUsage.id).label("total_calls"),
            func.coalesce(func.sum(ApiUsage.input_tokens), 0).label("total_input_tokens"),
            func.coalesce(func.sum(ApiUsage.output_tokens), 0).label("total_output_tokens"),
        )
        .join(User, User.id == ApiUsage.user_id)
        .group_by(ApiUsage.user_id, User.username, User.display_name)
        .order_by(func.count(ApiUsage.id).desc())
    )
    rows = result.all()
    return [
        {
            "user_id": str(r.user_id),
            "username": r.username,
            "display_name": r.display_name,
            "total_calls": r.total_calls,
            "total_input_tokens": r.total_input_tokens,
            "total_output_tokens": r.total_output_tokens,
        }
        for r in rows
    ]


# ---- Limits ----

@router.get("/limits", response_model=list[LimitResponse])
async def get_limits(
    _admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(ApiLimit).order_by(ApiLimit.user_id.is_(None).desc()))
    limits = result.scalars().all()
    out = []
    for lim in limits:
        username = None
        if lim.user_id:
            u_result = await db.execute(select(User.username).where(User.id == lim.user_id))
            username = u_result.scalar_one_or_none()
        out.append(LimitResponse(
            id=str(lim.id),
            user_id=str(lim.user_id) if lim.user_id else None,
            username=username,
            max_calls_per_day=lim.max_calls_per_day,
            max_calls_per_hour=lim.max_calls_per_hour,
        ))
    return out


@router.put("/limits/global", response_model=LimitResponse)
async def set_global_limits(
    body: LimitUpdate,
    _admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(ApiLimit).where(ApiLimit.user_id.is_(None)))
    limit = result.scalar_one_or_none()
    if limit is None:
        limit = ApiLimit(user_id=None)
        db.add(limit)
    if body.max_calls_per_day is not None:
        limit.max_calls_per_day = body.max_calls_per_day
    if body.max_calls_per_hour is not None:
        limit.max_calls_per_hour = body.max_calls_per_hour
    await db.flush()
    return LimitResponse(
        id=str(limit.id),
        user_id=None,
        username=None,
        max_calls_per_day=limit.max_calls_per_day,
        max_calls_per_hour=limit.max_calls_per_hour,
    )


@router.put("/limits/users/{user_id}", response_model=LimitResponse)
async def set_user_limits(
    user_id: str,
    body: LimitUpdate,
    _admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    uid = uuid.UUID(user_id)
    result = await db.execute(select(ApiLimit).where(ApiLimit.user_id == uid))
    limit = result.scalar_one_or_none()
    if limit is None:
        limit = ApiLimit(user_id=uid)
        db.add(limit)
    if body.max_calls_per_day is not None:
        limit.max_calls_per_day = body.max_calls_per_day
    if body.max_calls_per_hour is not None:
        limit.max_calls_per_hour = body.max_calls_per_hour
    await db.flush()
    return LimitResponse(
        id=str(limit.id),
        user_id=user_id,
        max_calls_per_day=limit.max_calls_per_day,
        max_calls_per_hour=limit.max_calls_per_hour,
    )
