from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from src.auth import (
    get_current_user,
    hash_password,
    issue_session_api_key,
    user_from_api_key,
    verify_password,
)
from src.config import settings
from src.db import get_session
from src.models import User
from src.schemas import (
    LoginRequest,
    LoginResponse,
    RegisterOut,
    RegisterRequest,
    UserOut,
)

router = APIRouter(tags=["auth"])


@router.post("/api/login", response_model=LoginResponse)
def login(body: LoginRequest, session: Session = Depends(get_session)):
    api_key = (body.api_key or "").strip()
    if api_key:
        if not settings.enable_api_keys:
            raise HTTPException(status_code=403, detail="API keys are disabled on this server.")
        user = user_from_api_key(session, api_key)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid API key.")
        return LoginResponse(
            message="Login successful.",
            token=api_key,
            username=user.username,
            email=user.email,
            auth="api_key",
        )

    username = (body.username or "").strip()
    password = body.password or ""
    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password, or api_key, are required.")

    user = session.exec(select(User).where(User.username == username)).first()
    if not user:
        raise HTTPException(
            status_code=401,
            detail="User not found. Create one with backend or register.",
        )
    if not verify_password(password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials.")

    raw_key = issue_session_api_key(session, user)
    return LoginResponse(
        message="Login successful.",
        token=raw_key,
        username=user.username,
        email=user.email,
        auth="api_key",
    )


@router.post("/api/register", response_model=RegisterOut, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, session: Session = Depends(get_session)):
    if not settings.allow_registrations:
        raise HTTPException(status_code=403, detail="Registrations are disabled.")

    username = body.username.strip()
    email = body.email.strip()
    password = body.password or ""
    if not username or not email or not password:
        raise HTTPException(status_code=400, detail="username, email, and password are required.")
    if session.exec(select(User).where(User.username == username)).first():
        raise HTTPException(status_code=409, detail="A user with this username already exists.")
    if session.exec(select(User).where(User.email == email)).first():
        raise HTTPException(status_code=409, detail="A user with this email already exists.")

    user = User(
        username=username,
        email=email,
        password=hash_password(password),
        role=False,
    )
    session.add(user)
    session.commit()
    return RegisterOut(message="Account created.", username=username)


@router.get("/api/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return UserOut(
        username=user.username,
        email=user.email,
        role=bool(user.role),
        image=user.image,
    )
