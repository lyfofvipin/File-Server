from __future__ import annotations

import os

from fastapi import APIRouter

from src.config import settings
from src.schemas import AboutOut, HealthOut, MetaOut

router = APIRouter(tags=["meta"])


@router.get("/api/health", response_model=HealthOut)
def health():
    return HealthOut(status="ok")


@router.get("/api/meta", response_model=MetaOut)
def meta():
    return MetaOut(
        allow_registrations=settings.allow_registrations,
        allow_delete=settings.allow_delete,
        enable_api_keys=bool(settings.enable_api_keys),
        auth_modes=["api_key", "basic"],
        result_base_dir_path=settings.result_base_dir_path,
        home_alias="~",
    )


@router.get("/api/about", response_model=AboutOut)
def about():
    candidates = [
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "README.md"),
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "README.md"),
        "README.md",
    ]
    text = ""
    for path in candidates:
        if os.path.isfile(path):
            with open(path, "r", encoding="utf-8", errors="replace") as fh:
                text = fh.read()
            break
    return AboutOut(markdown=text)
