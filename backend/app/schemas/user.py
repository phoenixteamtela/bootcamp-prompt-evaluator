from datetime import datetime

from pydantic import BaseModel


class UserCreate(BaseModel):
    username: str
    display_name: str
    password: str
    is_admin: bool = False


class UserUpdate(BaseModel):
    display_name: str | None = None
    password: str | None = None
    is_admin: bool | None = None
    is_active: bool | None = None


class UserResponse(BaseModel):
    id: str
    username: str
    display_name: str
    is_admin: bool
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class BulkUserCreate(BaseModel):
    users: list[UserCreate]


class BulkUserError(BaseModel):
    username: str
    detail: str


class BulkUserResult(BaseModel):
    created: list[UserResponse]
    errors: list[BulkUserError]
