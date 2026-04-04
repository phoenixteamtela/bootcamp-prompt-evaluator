from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse, UserInfo
from app.services.auth_service import authenticate_user, create_access_token

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest, db: Annotated[AsyncSession, Depends(get_db)]):
    user = await authenticate_user(db, body.username, body.password)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(str(user.id))
    return LoginResponse(
        access_token=token,
        user=UserInfo(
            id=str(user.id),
            username=user.username,
            display_name=user.display_name,
            is_admin=user.is_admin,
        ),
    )


@router.get("/me")
async def me(current_user: Annotated[User, Depends(get_current_user)]):
    return UserInfo(
        id=str(current_user.id),
        username=current_user.username,
        display_name=current_user.display_name,
        is_admin=current_user.is_admin,
    )
