from __future__ import annotations

import os
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, JSONResponse, Response
from pydantic import WithJsonSchema

from src.auth import get_current_user
from src.config import settings
from src.models import User
from src.modules import (
    ensure_dir_under_base,
    file_validater,
    find_files,
    if_none_then_empty_str,
    list_dirs,
    list_path_entries,
    normalize_relative_path,
    resolve_safe_dir_path,
    set_the_description,
)
from src.schemas import (
    BrowseOut,
    DeleteBody,
    DeleteOut,
    EntryOut,
    MessageOut,
    MkdirBody,
    MkdirOut,
    ProductsOut,
    RenameBody,
    RenameOut,
    UploadOut,
)

try:
    from src.thumbnails import (
        get_or_create_thumbnail_jpeg,
        is_media_thumbnailable,
        resolve_safe_file_path,
    )
except ImportError:
    def is_media_thumbnailable(name):
        return False

    def get_or_create_thumbnail_jpeg(*args, **kwargs):
        return None

    def resolve_safe_file_path(base_dir, rel_path):
        from src.modules import normalize_relative_path
        import os

        norm = normalize_relative_path(rel_path)
        if norm is None or not norm:
            return None
        base = os.path.realpath(base_dir)
        candidate = os.path.realpath(os.path.join(base, norm))
        if not candidate.startswith(base + os.sep):
            return None
        if not os.path.isfile(candidate):
            return None
        return candidate

router = APIRouter(tags=["files"])
ROOT = settings.result_base_dir_path

# Swagger UI needs format:binary; FastAPI 0.129+ emits contentMediaType instead.
BinaryUpload = Annotated[UploadFile, WithJsonSchema({"type": "string", "format": "binary"})]


@router.get("/api", response_model=ProductsOut)
def list_root():
    entries = list_path_entries(ROOT)
    return ProductsOut(
        products=[e["name"] for e in entries if e.get("is_dir")],
        entries=[EntryOut(**e) for e in entries],
    )


@router.get("/api/download")
def download(
    path: str = Query(""),
    file: Optional[str] = Query(None),
    user: User = Depends(get_current_user),
):
    rel_path = normalize_relative_path(path)
    if rel_path is None:
        raise HTTPException(status_code=404, detail="Invalid path.")
    dir_path = resolve_safe_dir_path(ROOT, rel_path)
    if not dir_path or not os.path.isdir(dir_path):
        raise HTTPException(status_code=404, detail="Directory not found.")
    if not file:
        entries = list_path_entries(dir_path)
        legacy = {e["name"]: e["comment"] for e in entries}
        return BrowseOut(
            available_files=legacy,
            entries=[EntryOut(**e) for e in entries],
            path=rel_path,
        )
    file_path = os.path.join(dir_path, os.path.basename(file))
    if os.path.isfile(file_path):
        return FileResponse(
            file_path,
            filename=os.path.basename(file),
            media_type="application/octet-stream",
        )
    raise HTTPException(status_code=404, detail="File not found.")


@router.get("/api/preview")
def preview(path: str = Query(...), user: User = Depends(get_current_user)):
    rel = normalize_relative_path(path)
    if rel is None or not rel:
        raise HTTPException(status_code=404, detail="Invalid path.")
    abs_path = resolve_safe_file_path(ROOT, rel)
    if not abs_path:
        raise HTTPException(status_code=404, detail="File not found.")
    return FileResponse(abs_path)


@router.get("/api/thumbnail")
def thumbnail(path: str = Query(...), user: User = Depends(get_current_user)):
    rel = normalize_relative_path(path)
    if rel is None or not rel:
        raise HTTPException(status_code=404, detail="Invalid path.")
    abs_path = resolve_safe_file_path(ROOT, rel)
    if not abs_path:
        raise HTTPException(status_code=404, detail="File not found.")
    name = os.path.basename(abs_path)
    if not is_media_thumbnailable(name):
        raise HTTPException(status_code=404, detail="Not thumbnailable.")
    data = get_or_create_thumbnail_jpeg(ROOT, abs_path, name)
    if not data:
        raise HTTPException(status_code=404, detail="Thumbnail unavailable.")
    return Response(content=data, media_type="image/jpeg", headers={"Cache-Control": "private, max-age=3600"})


@router.post("/api/upload")
async def upload(
    file: Annotated[
        List[BinaryUpload],
        File(description="One or more files (same form field name: file)"),
    ],
    path: str = Query(""),
    comment: str = Query(""),
    need_url: Optional[str] = Query(None),
    user: User = Depends(get_current_user),
):
    files = [f for f in (file or []) if f is not None and f.filename]
    if not files:
        raise HTTPException(status_code=404, detail="No file part in the request")
    rel_path = normalize_relative_path(path)
    if rel_path is None:
        raise HTTPException(status_code=404, detail="Invalid path.")
    dest_dir = ensure_dir_under_base(ROOT, rel_path)
    if not dest_dir:
        raise HTTPException(status_code=404, detail="Upload path must stay inside the file server root.")

    messages = []
    ok = True
    last_name = ""
    for upload_file in files:
        file_name = os.path.basename(upload_file.filename.replace("\\", "/"))
        last_name = file_name
        if not file_validater(file_name):
            messages.append("%s: Invalid file" % file_name)
            ok = False
            continue
        dest_file = os.path.join(dest_dir, file_name)
        if os.path.exists(dest_file):
            messages.append("%s: already on the server" % file_name)
            ok = False
            continue
        set_the_description(dest_file, file_name, comment or "", uploader=user.username)
        content = await upload_file.read()
        with open(dest_file, "wb") as fh:
            fh.write(content)
        messages.append("%s: uploaded successfully" % file_name)

    if not messages:
        raise HTTPException(status_code=404, detail="No file selected for uploading")
    if need_url and ok and last_name:
        return "/home/" + "/".join(filter(None, [if_none_then_empty_str(rel_path), last_name]))
    return UploadOut(message="\n".join(messages), ok=ok)


@router.post("/api/replace")
async def replace(
    file: Annotated[BinaryUpload, File(description="Replacement file")],
    file_to_replace: str = Query(...),
    file_number: Optional[str] = Query(None),
    comment: Optional[str] = Query(None),
    user: User = Depends(get_current_user),
):
    if not file or not file.filename:
        raise HTTPException(
            status_code=404,
            detail="Looks like You are either missing the new file or the file name you want to replace.",
        )
    file_name = file.filename
    available_files = find_files(file_to_replace, ROOT)
    if not available_files:
        raise HTTPException(status_code=404, detail="File not found on the File Server.")

    if len(available_files) > 1 and not file_number:
        return JSONResponse(
            {
                "Found multiple files, pass the `file_number` with which you want to replace the file from the given list: ": [
                    str(number + 1) + " --> " + f for number, f in enumerate(available_files)
                ]
            }
        )

    idx = int(file_number) - 1 if file_number else 0
    try:
        target = available_files[idx]
    except (IndexError, ValueError):
        raise HTTPException(
            status_code=404,
            detail="You are passing the wrong file number. Retry without passing file number to see the list of files.",
        )

    if not file_validater(file_name):
        raise HTTPException(status_code=404, detail="Invalid file please select a valid type of file.")

    old_path = os.path.join(ROOT, target.lstrip("/"))
    if os.path.isfile(old_path):
        os.remove(old_path)
    parent = os.path.dirname(old_path)
    dest = os.path.join(parent, os.path.basename(file_name))
    set_the_description(dest, os.path.basename(file_name), comment, uploader=user.username)
    content = await file.read()
    with open(dest, "wb") as fh:
        fh.write(content)
    return MessageOut(message="File Replaced Successfully.")


@router.post("/api/rename", response_model=RenameOut)
def rename(body: RenameBody, user: User = Depends(get_current_user)):
    rel = normalize_relative_path(body.path)
    new_name = os.path.basename((body.new_name or "").strip())
    if rel is None or not rel:
        raise HTTPException(status_code=404, detail="Invalid path.")
    if not new_name or new_name.startswith(".") or "/" in new_name or "\\" in new_name:
        raise HTTPException(status_code=400, detail="Invalid new file name.")
    abs_path = resolve_safe_file_path(ROOT, rel)
    if not abs_path:
        abs_path = resolve_safe_dir_path(ROOT, rel)
        if not abs_path or abs_path == os.path.realpath(ROOT) or not os.path.exists(abs_path):
            raise HTTPException(status_code=404, detail="Path not found.")
    parent = os.path.dirname(abs_path)
    dest = os.path.join(parent, new_name)
    if os.path.exists(dest):
        raise HTTPException(status_code=409, detail="A file/folder with that name already exists.")
    os.rename(abs_path, dest)
    return RenameOut(message="Renamed successfully.", new_name=new_name)


@router.post("/api/mkdir", response_model=MkdirOut)
def mkdir(body: MkdirBody, user: User = Depends(get_current_user)):
    parent = normalize_relative_path(body.path or "")
    name = os.path.basename((body.name or "").strip())
    if parent is None:
        raise HTTPException(status_code=404, detail="Invalid path.")
    if not name or name.startswith(".") or "/" in name or "\\" in name or name in (".", ".."):
        raise HTTPException(status_code=400, detail="Invalid folder name.")
    parent_abs = ensure_dir_under_base(ROOT, parent)
    if not parent_abs:
        raise HTTPException(status_code=404, detail="Parent path must stay inside the file server root.")
    dest = os.path.join(parent_abs, name)
    if os.path.exists(dest):
        raise HTTPException(status_code=409, detail="A file/folder with that name already exists.")
    os.mkdir(dest)
    rel = "/".join(filter(None, [parent, name]))
    return MkdirOut(message="Folder created.", path=rel)


@router.post("/api/delete", response_model=DeleteOut)
def delete(body: DeleteBody, user: User = Depends(get_current_user)):
    if not settings.allow_delete:
        raise HTTPException(status_code=403, detail="Delete is disabled on this server.")

    if body.path:
        rel = normalize_relative_path(body.path)
        if rel is None or not rel:
            raise HTTPException(status_code=404, detail="Invalid path.")
        abs_path = resolve_safe_file_path(ROOT, rel)
        if not abs_path:
            abs_path = resolve_safe_dir_path(ROOT, rel)
            if not abs_path or abs_path == os.path.realpath(ROOT):
                raise HTTPException(status_code=404, detail="Path not found.")
            if os.path.isdir(abs_path):
                try:
                    os.rmdir(abs_path)
                except OSError:
                    raise HTTPException(status_code=409, detail="Folder is not empty.")
                return DeleteOut(message="Folder deleted.")
            raise HTTPException(status_code=404, detail="File not found.")
        os.remove(abs_path)
        return DeleteOut(message="File deleted.")

    file_to_delete = body.file_to_delete
    if not file_to_delete:
        raise HTTPException(status_code=400, detail="Provide path or file_to_delete.")
    available = find_files(file_to_delete, ROOT)
    if not available:
        raise HTTPException(status_code=404, detail="File not found on the File Server.")
    if len(available) > 1 and not body.file_number:
        return DeleteOut(
            message="Multiple matches. Pass file_number to delete one.",
            matches=available,
        )
    try:
        idx = int(body.file_number) - 1 if body.file_number else 0
        target = available[idx]
    except (IndexError, ValueError, TypeError):
        raise HTTPException(status_code=404, detail="Invalid file_number.")
    os.remove(os.path.join(ROOT, target.lstrip("/")))
    return DeleteOut(message="File deleted.", deleted=target)
