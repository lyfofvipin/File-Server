from __future__ import annotations

from collections.abc import Generator

from sqlmodel import Session, SQLModel, create_engine

from src.config import settings

connect_args = {"check_same_thread": False} if settings.resolved_database_url().startswith("sqlite") else {}
engine = create_engine(settings.resolved_database_url(), echo=False, connect_args=connect_args)


def init_db() -> None:
    # Import models so metadata is registered.
    from src import models  # noqa: F401

    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
