from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserInfo"


class UserInfo(BaseModel):
    id: str
    username: str
    display_name: str
    is_admin: bool

    model_config = {"from_attributes": True}


class TokenPayload(BaseModel):
    sub: str
    exp: int


LoginResponse.model_rebuild()
