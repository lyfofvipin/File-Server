"""Delete files under result_base_dir_path older than the configured retention."""
from __future__ import annotations

import logging
import os
import time
from typing import Iterable, List, Optional, Set

from src.config import settings
from src.modules import normalize_relative_path, resolve_safe_dir_path

logger = logging.getLogger("uvicorn.error")

DESCRIPTION_DIR = ".file_server"
THUMB_CACHE_DIR = "thumbnail_cache"
SQLITE_PREFIX = "sqlite:///"


def sqlite_db_realpath() -> Optional[str]:
    url = settings.resolved_database_url()
    if not url.startswith(SQLITE_PREFIX):
        return None
    path = url[len(SQLITE_PREFIX) :]
    if path.startswith("/") and os.name == "nt":
        path = path.lstrip("/")
    return os.path.realpath(path)


def resolve_exclude_dirs(base: str, entries: Iterable[str]) -> List[str]:
    base_real = os.path.realpath(base)
    resolved: List[str] = []
    seen: Set[str] = set()
    for raw in entries or []:
        norm = normalize_relative_path(raw)
        if norm is None:
            logger.warning("cleanup: ignoring invalid exclude dir %r", raw)
            continue
        if not norm:
            logger.warning("cleanup: ignoring exclude of share root %r", raw)
            continue
        target = resolve_safe_dir_path(base, norm)
        if not target:
            logger.warning("cleanup: ignoring exclude dir outside share %r", raw)
            continue
        if target == base_real:
            logger.warning("cleanup: ignoring exclude of share root %r", raw)
            continue
        if target in seen:
            continue
        seen.add(target)
        resolved.append(target)
    return resolved


def is_protected(path: str, excluded: Iterable[str], base: str) -> bool:
    real = os.path.realpath(path)
    base_real = os.path.realpath(base)
    if real == base_real:
        return False
    for ex in excluded:
        if real == ex or real.startswith(ex + os.sep):
            return True
    return False


def _unlink(path: str) -> bool:
    try:
        os.unlink(path)
        logger.info("cleanup: deleted file %s", path)
        return True
    except OSError as exc:
        logger.warning("cleanup: could not delete file %s: %s", path, exc)
        return False


def _rmdir(path: str) -> bool:
    try:
        os.rmdir(path)
        logger.info("cleanup: removed empty dir %s", path)
        return True
    except OSError as exc:
        logger.debug("cleanup: could not remove dir %s: %s", path, exc)
        return False


def _should_expire_file(dirpath: str) -> bool:
    """True for user files and thumbnail cache; False for comment metadata."""
    parent = os.path.basename(dirpath)
    grand = os.path.basename(os.path.dirname(dirpath))
    if parent == THUMB_CACHE_DIR and grand == DESCRIPTION_DIR:
        return True
    if parent == DESCRIPTION_DIR:
        return False
    return True


def run_cleanup(root: Optional[str] = None) -> dict:
    """Delete expired files and prune empty dirs. Returns a summary dict."""
    days = int(settings.data_retention_days or 0)
    summary = {"deleted_files": 0, "pruned_dirs": 0, "skipped": True, "days": days}
    if days <= 0:
        logger.info("cleanup: disabled (FS_DATA_RETENTION_DAYS=%s)", days)
        return summary

    base = os.path.realpath(root or settings.result_base_dir_path)
    if not os.path.isdir(base):
        logger.warning("cleanup: share path is not a directory: %s", base)
        return summary

    excluded = resolve_exclude_dirs(base, settings.cleanup_exclude_dirs)
    db_path = sqlite_db_realpath()
    cutoff = time.time() - (days * 86400)
    deleted = 0
    pruned = 0
    summary["skipped"] = False
    summary["excluded"] = excluded

    for dirpath, dirnames, filenames in os.walk(base, topdown=True, followlinks=False):
        if is_protected(dirpath, excluded, base):
            dirnames[:] = []
            continue

        keep_dirs: List[str] = []
        for d in dirnames:
            child = os.path.join(dirpath, d)
            if os.path.islink(child):
                continue
            if is_protected(child, excluded, base):
                continue
            if d == DESCRIPTION_DIR:
                keep_dirs.append(d)
                continue
            keep_dirs.append(d)
        if os.path.basename(dirpath) == DESCRIPTION_DIR:
            keep_dirs = [d for d in keep_dirs if d == THUMB_CACHE_DIR]
        dirnames[:] = keep_dirs

        for name in filenames:
            full = os.path.join(dirpath, name)
            if os.path.islink(full):
                continue
            if not os.path.isfile(full):
                continue
            real = os.path.realpath(full)
            if not (real == base or real.startswith(base + os.sep)):
                continue
            if is_protected(real, excluded, base):
                continue
            if db_path and real == db_path:
                continue
            if name == "site.db" and os.path.dirname(real) == base:
                continue
            if not _should_expire_file(dirpath):
                continue
            try:
                mtime = os.path.getmtime(full)
            except OSError as exc:
                logger.warning("cleanup: could not stat %s: %s", full, exc)
                continue
            if mtime >= cutoff:
                continue
            if _unlink(full):
                deleted += 1
                comment = os.path.join(dirpath, DESCRIPTION_DIR, name + ".text")
                if os.path.isfile(comment) and not os.path.islink(comment):
                    if _unlink(comment):
                        deleted += 1

    for dirpath, dirnames, filenames in os.walk(base, topdown=False, followlinks=False):
        if os.path.realpath(dirpath) == base:
            continue
        if is_protected(dirpath, excluded, base):
            continue
        try:
            if os.listdir(dirpath):
                continue
        except OSError:
            continue
        if _rmdir(dirpath):
            pruned += 1

    summary["deleted_files"] = deleted
    summary["pruned_dirs"] = pruned
    logger.info(
        "cleanup: finished deleted_files=%s pruned_dirs=%s root=%s",
        deleted,
        pruned,
        base,
    )
    return summary


def cleanup_enabled_message() -> str:
    days = int(settings.data_retention_days or 0)
    if days <= 0:
        return "cleanup disabled (FS_DATA_RETENTION_DAYS=%s)" % days
    excludes = [str(x).strip() for x in (settings.cleanup_exclude_dirs or []) if str(x).strip()]
    extra = " (excluding %s)" % ", ".join(excludes) if excludes else ""
    return "cleanup enabled: files older than %s days under %s%s" % (
        days,
        settings.result_base_dir_path,
        extra,
    )
