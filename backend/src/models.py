from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    __tablename__ = "user"

    id: Optional[int] = Field(default=None, primary_key=True)
    role: bool = Field(default=False)
    username: str = Field(max_length=30, unique=True, index=True)
    email: str = Field(max_length=120, unique=True, index=True)
    image: str = Field(default="default.jpg", max_length=20)
    password: str = Field(max_length=60)


class ApiKey(SQLModel, table=True):
    __tablename__ = "api_key"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    name: str = Field(default="default", max_length=80)
    key_prefix: str = Field(max_length=16)
    key_hash: str = Field(max_length=64, unique=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_used_at: Optional[datetime] = Field(default=None)
    revoked: bool = Field(default=False)
