import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.user import User


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_access_token(user_id: str) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expiry_hours)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


async def authenticate_user(db: AsyncSession, username: str, password: str) -> User | None:
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


async def create_user(
    db: AsyncSession,
    username: str,
    display_name: str,
    password: str,
    is_admin: bool = False,
) -> User:
    user = User(
        id=uuid.uuid4(),
        username=username,
        display_name=display_name,
        password_hash=hash_password(password),
        is_admin=is_admin,
    )
    db.add(user)
    await db.flush()
    return user


async def get_or_create_seed_admin(db: AsyncSession) -> None:
    """Create default admin user if no users exist."""
    result = await db.execute(select(User).limit(1))
    if result.scalar_one_or_none() is not None:
        return
    await create_user(db, "admin", "Admin", "admin123", is_admin=True)
    await db.commit()
