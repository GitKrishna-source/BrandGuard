import json
from datetime import UTC, datetime, timedelta
from typing import Annotated, Literal

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash

from .config import get_settings

Role = Literal["creator", "manager", "legal"]
settings = get_settings()
password_hash = PasswordHash.recommended()
bearer = HTTPBearer(auto_error=False)


def _users() -> dict[str, dict[str, str]]:
    return json.loads(settings.auth_users_json)


def authenticate(username: str, password: str) -> dict[str, str] | None:
    for user in _users().values():
        if user.get("username") != username:
            continue
        if user.get("password_hash"):
            valid = password_hash.verify(password, user["password_hash"])
        else:
            valid = password == user.get("password")
        if valid:
            return {"username": username, "role": user["role"]}
    return None


def create_access_token(user: dict[str, str]) -> str:
    expires = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode({"sub": user["username"], "role": user["role"], "exp": expires}, settings.auth_secret, algorithm="HS256")


def get_current_user(credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]) -> dict[str, str]:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    try:
        payload = jwt.decode(credentials.credentials, settings.auth_secret, algorithms=["HS256"])
        username, role = payload.get("sub"), payload.get("role")
        if not isinstance(username, str) or role not in {"creator", "manager", "legal"}:
            raise ValueError("invalid claims")
        return {"username": username, "role": role}
    except (jwt.InvalidTokenError, ValueError) as error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token") from error


def require_roles(*roles: Role):
    def dependency(user: Annotated[dict[str, str], Depends(get_current_user)]) -> dict[str, str]:
        if user["role"] not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user

    return dependency
