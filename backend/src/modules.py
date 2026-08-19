import os
import time
from typing import Optional, List, Dict, Any

from src.config import settings

convert_to_url = lambda x: '<a href="{0}">{1}</a>'.format(x, x)
description_file_name = ".file_server/{0}.text"
description_dir_name = ".file_server"
if_none_then_empty_str = lambda x: x if x else ""


def list_dirs(result_base_dir_path):
    if not os.path.isdir(result_base_dir_path):
        return
    for name in os.listdir(result_base_dir_path):
        file_path = os.path.join(result_base_dir_path, name)
        if os.path.isdir(file_path) and not name.startswith("."):
            yield name


def normalize_relative_path(rel_path: str) -> Optional[str]:
    if rel_path is None:
        return ""
    rel_path = str(rel_path).replace("\\", "/").strip().strip("/")
    if not rel_path:
        return ""
    parts = [part for part in rel_path.split("/") if part and part != "."]
    if ".." in parts:
        return None
    return "/".join(parts)


def resolve_safe_dir_path(base_dir: str, rel_path: str = "") -> Optional[str]:
    norm = normalize_relative_path(rel_path)
    if norm is None:
        return None
    base = os.path.realpath(base_dir)
    candidate = base if not norm else os.path.realpath(os.path.join(base, norm))
    if candidate == base or candidate.startswith(base + os.sep):
        return candidate
    return None


def ensure_dir_under_base(base_dir: str, rel_path: str = "") -> Optional[str]:
    target = resolve_safe_dir_path(base_dir, rel_path)
    if target is None:
        return None
    os.makedirs(target, exist_ok=True)
    return target


def file_validater(file_name=""):
    for ext in settings.non_supported_file_extension:
        if file_name.endswith(ext):
            return False
    if not settings.supported_file_extension:
        return True
    _, ext = os.path.splitext(file_name)
    ext = ext.lstrip(".").lower()
    allowed = {item.lstrip(".").lower() for item in settings.supported_file_extension}
    return ext in allowed


def get_value(item):
    return item if item else ""


def find_files(file_to_replace, root_dir):
    available_files = []
    for root, dirs, files in os.walk(root_dir):
        if file_to_replace in files:
            available_files.append(os.path.join(root, file_to_replace).replace(root_dir, ""))
    print("Find files : " + str(available_files))
    return available_files


def get_the_description(path, folder_content, called_from="gui"):
    file_descriptions = []
    for x in folder_content:
        if called_from == "gui":
            description_file_path = os.path.join(path, description_file_name.format(x[0]))
        else:
            description_file_path = os.path.join(path, description_file_name.format(x))
        if os.path.exists(description_file_path):
            with open(description_file_path) as desc_file:
                description = desc_file.read()
                if called_from == "gui":
                    description = " ".join(
                        [convert_to_url(x) if x.startswith("http") else x for x in description.split()]
                    )
            file_descriptions.append(description)
        else:
            file_descriptions.append("")
    return file_descriptions


META_MARKER = "[fs-meta]"


def parse_description(raw: str) -> Dict[str, str]:
    """Split comment body from sidecar metadata (uploader, uploaded_at)."""
    text = raw or ""
    if META_MARKER not in text:
        return {"comment": text, "uploader": "", "uploaded_at": ""}
    comment, _, meta = text.partition(META_MARKER)
    uploader = ""
    uploaded_at = ""
    for line in meta.splitlines():
        line = line.strip()
        if line.startswith("uploader="):
            uploader = line.split("=", 1)[1].strip()
        elif line.startswith("uploaded_at="):
            uploaded_at = line.split("=", 1)[1].strip()
    return {"comment": comment.strip(), "uploader": uploader, "uploaded_at": uploaded_at}


def set_the_description(file_path, file_name, comment, uploader=None):
    file_path_with_no_file_name = file_path.replace(file_name, "")
    meta_dir = os.path.join(file_path_with_no_file_name, description_dir_name)
    if not os.path.exists(meta_dir):
        os.mkdir(meta_dir)
    body = comment or ""
    if uploader:
        from datetime import datetime, timezone

        stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        body = (body.rstrip() + "\n\n" if body.strip() else "") + "%s\nuploader=%s\nuploaded_at=%s\n" % (
            META_MARKER,
            uploader,
            stamp,
        )
    with open(
        os.path.join(file_path_with_no_file_name, description_file_name.format(file_name)), "w+"
    ) as description_file:
        description_file.write(body)


def list_path_entries(dir_path: str) -> List[Dict[str, Any]]:
    """Return enriched directory listing for the FE browse UI."""
    try:
        from src.thumbnails import is_media_thumbnailable
    except ImportError:
        def is_media_thumbnailable(name):
            return False

    names = [
        name
        for name in os.listdir(dir_path)
        if name != "site.db" and not name.startswith(".")
    ]
    raw_comments = get_the_description(dir_path, names, called_from="api")
    entries = []
    for name, raw in zip(names, raw_comments):
        meta = parse_description(raw)
        full = os.path.join(dir_path, name)
        try:
            mtime = time.ctime(os.path.getmtime(full))
        except OSError:
            mtime = ""
        is_dir = os.path.isdir(full)
        entries.append(
            {
                "name": name,
                "is_dir": is_dir,
                "mtime": mtime,
                "comment": meta["comment"],
                "uploader": meta["uploader"],
                "uploaded_at": meta["uploaded_at"],
                "thumbnailable": (not is_dir) and is_media_thumbnailable(name),
            }
        )
    entries.sort(key=lambda e: (not e["is_dir"], e["name"].lower()))
    return entries
