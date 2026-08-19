"""API-key + Basic authentication for FastAPI."""
from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timezone
from typing import Optional, Tuple

import bcrypt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBasic, HTTPBasicCredentials, HTTPBearer
from sqlmodel import Session, select

from src.config import settings
from src.db import get_session
from src.models import ApiKey, User

bearer_scheme = HTTPBearer(auto_error=False)
basic_scheme = HTTPBasic(auto_error=False)

SESSION_KEY_NAME = "session"


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except Exception:
        return False


def hash_api_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


def generate_api_key() -> Tuple[str, str, str]:
    prefix = secrets.token_hex(4)
    secret = secrets.token_urlsafe(32)
    raw = "fs_%s_%s" % (prefix, secret)
    return raw, prefix, hash_api_key(raw)


def revoke_all_api_keys(session: Session, user: User) -> int:
    """Revoke every active API key for the user. Returns how many were revoked."""
    rows = session.exec(
        select(ApiKey).where(
            ApiKey.user_id == user.id,
            ApiKey.revoked == False,  # noqa: E712
        )
    ).all()
    for row in rows:
        row.revoked = True
        session.add(row)
    return len(rows)


def issue_session_api_key(session: Session, user: User) -> str:
    """Revoke prior browser session keys and mint a fresh one. Returns the raw key once."""
    if not settings.enable_api_keys:
        raise HTTPException(status_code=403, detail="API keys are disabled on this server.")
    existing = session.exec(
        select(ApiKey).where(
            ApiKey.user_id == user.id,
            ApiKey.name == SESSION_KEY_NAME,
            ApiKey.revoked == False,  # noqa: E712
        )
    ).all()
    for row in existing:
        row.revoked = True
        session.add(row)

    raw, prefix, digest = generate_api_key()
    session.add(
        ApiKey(
            user_id=user.id,
            name=SESSION_KEY_NAME,
            key_prefix=prefix,
            key_hash=digest,
            created_at=utcnow(),
        )
    )
    session.commit()
    return raw


def user_from_api_key(session: Session, raw_key: str) -> Optional[User]:
    if not settings.enable_api_keys:
        return None
    raw_key = (raw_key or "").strip()
    if not raw_key.startswith("fs_"):
        return None
    digest = hash_api_key(raw_key)
    row = session.exec(select(ApiKey).where(ApiKey.key_hash == digest, ApiKey.revoked == False)).first()  # noqa: E712
    if not row:
        return None
    row.last_used_at = utcnow()
    session.add(row)
    session.commit()
    return session.get(User, row.user_id)


def get_current_user(
    request: Request,
    session: Session = Depends(get_session),
    bearer: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    basic: Optional[HTTPBasicCredentials] = Depends(basic_scheme),
) -> User:
    """
    Resolve the caller from (in order):
      1) Authorization: Bearer <api_key>
      2) X-API-Key: <api_key>
      3) HTTP Basic (CLI compatibility)
    """
    token = ""
    if bearer and bearer.credentials:
        token = bearer.credentials.strip()
    if not token:
        token = (request.headers.get("X-API-Key") or "").strip()

    if token:
        user = user_from_api_key(session, token)
        if user:
            return user
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if basic and basic.username and basic.password:
        user = session.exec(select(User).where(User.username == basic.username)).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not Found.", headers={"WWW-Authenticate": "Basic"})
        if not verify_password(basic.password, user.password):
            raise HTTPException(status_code=401, detail="Invalid credentials.", headers={"WWW-Authenticate": "Basic"})
        return user

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Login fail please pass a Bearer API key, X-API-Key, or Basic credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )
