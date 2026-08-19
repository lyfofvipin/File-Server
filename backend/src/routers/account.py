from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from src.auth import (
    generate_api_key,
    get_current_user,
    hash_password,
    revoke_all_api_keys,
    verify_password,
)
from src.config import settings
from src.db import get_session
from src.models import ApiKey, User
from src.schemas import (
    AccountUpdate,
    AccountUpdateOut,
    ApiKeyCreate,
    ApiKeyCreated,
    ApiKeyListOut,
    ApiKeyOut,
    MessageOut,
    PasswordChange,
)

router = APIRouter(tags=["account"])


@router.post("/api/account", response_model=AccountUpdateOut)
def update_account(
    body: AccountUpdate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    username = (body.username or user.username).strip()
    email = (body.email or user.email).strip()
    if username != user.username and session.exec(select(User).where(User.username == username)).first():
        raise HTTPException(status_code=409, detail="Username already taken.")
    if email != user.email and session.exec(select(User).where(User.email == email)).first():
        raise HTTPException(status_code=409, detail="Email already taken.")

    identity_changed = username != user.username or email != user.email
    user.username = username
    user.email = email
    session.add(user)
    if identity_changed:
        revoke_all_api_keys(session, user)
    session.commit()
    session.refresh(user)
    message = "Account updated."
    if identity_changed:
        message += " All API keys were revoked — log in again."
    return AccountUpdateOut(
        message=message,
        username=user.username,
        email=user.email,
        role=bool(user.role),
    )


@router.post("/api/account/password", response_model=MessageOut)
def change_password(
    body: PasswordChange,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    if not body.old_password or not body.new_password:
        raise HTTPException(status_code=400, detail="old_password and new_password are required.")
    if not verify_password(body.old_password, user.password):
        raise HTTPException(status_code=401, detail="Existing password is incorrect.")
    user.password = hash_password(body.new_password)
    session.add(user)
    revoke_all_api_keys(session, user)
    session.commit()
    return MessageOut(
        message="Password changed successfully. All API keys were revoked — log in again."
    )


@router.get("/api/account/api-keys", response_model=ApiKeyListOut)
def list_api_keys(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    if not settings.enable_api_keys:
        raise HTTPException(status_code=403, detail="API keys are disabled on this server.")
    rows = session.exec(
        select(ApiKey)
        .where(ApiKey.user_id == user.id, ApiKey.revoked == False)  # noqa: E712
        .order_by(ApiKey.created_at.desc())
    ).all()
    return ApiKeyListOut(
        keys=[
            ApiKeyOut(
                id=row.id,
                name=row.name,
                prefix=row.key_prefix,
                created_at=(row.created_at.isoformat() + "Z") if row.created_at else None,
                last_used_at=(row.last_used_at.isoformat() + "Z") if row.last_used_at else None,
            )
            for row in rows
        ]
    )


@router.post("/api/account/api-keys", response_model=ApiKeyCreated, status_code=status.HTTP_201_CREATED)
def create_api_key(
    body: ApiKeyCreate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    if not settings.enable_api_keys:
        raise HTTPException(status_code=403, detail="API keys are disabled on this server.")
    name = (body.name or "default").strip() or "default"
    raw, prefix, digest = generate_api_key()
    row = ApiKey(user_id=user.id, name=name[:80], key_prefix=prefix, key_hash=digest)
    session.add(row)
    session.commit()
    session.refresh(row)
    return ApiKeyCreated(
        message="API key created. Copy it now — it will not be shown again.",
        id=row.id,
        name=row.name,
        prefix=prefix,
        api_key=raw,
    )


@router.delete("/api/account/api-keys/{key_id}", response_model=MessageOut)
def revoke_api_key(
    key_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    if not settings.enable_api_keys:
        raise HTTPException(status_code=403, detail="API keys are disabled on this server.")
    row = session.exec(select(ApiKey).where(ApiKey.id == key_id, ApiKey.user_id == user.id)).first()
    if not row:
        raise HTTPException(status_code=404, detail="API key not found.")
    row.revoked = True
    session.add(row)
    session.commit()
    return MessageOut(message="API key revoked.")
