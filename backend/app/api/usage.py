from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.usage import UsageResponse
from app.services.usage_service import get_user_usage

router = APIRouter()


@router.get("/usage", response_model=UsageResponse)
async def my_usage(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    data = await get_user_usage(db, current_user.id)
    return UsageResponse(**data)
