from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Any, Dict

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.responses import JSONResponse

from src.config import settings
from src.db import init_db
from src.routers import account, auth_routes, files, health


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="File-Server API",
    description="File-Server backend (API key / Basic). Interactive docs at /docs.",
    version="2.0.0",
    lifespan=lifespan,
)

origins = settings.cors_origins or ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException):
    """Return {"message": ...} so the existing frontend keeps working."""
    detail = exc.detail
    if isinstance(detail, dict):
        body = detail
    else:
        body = {"message": detail}
    return JSONResponse(status_code=exc.status_code, content=body, headers=exc.headers)


def _swagger_file_picker_fix(node: Any) -> None:
    """
    FastAPI 0.129+ emits OAS 3.1 contentMediaType for UploadFile.
    Swagger UI still needs format: binary to show a real file picker
    (especially for List[UploadFile] → array items).
    """
    if isinstance(node, dict):
        if node.get("contentMediaType") == "application/octet-stream":
            node.pop("contentMediaType", None)
            node["format"] = "binary"
        for value in node.values():
            _swagger_file_picker_fix(value)
    elif isinstance(node, list):
        for item in node:
            _swagger_file_picker_fix(item)


def custom_openapi() -> Dict[str, Any]:
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    _swagger_file_picker_fix(schema)
    app.openapi_schema = schema
    return app.openapi_schema


app.openapi = custom_openapi

app.include_router(health.router)
app.include_router(auth_routes.router)
app.include_router(account.router)
app.include_router(files.router)
