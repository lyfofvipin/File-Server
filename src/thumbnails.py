"""Generate JPEG thumbnails for images (incl. HEIC/HEIF) and videos."""
import hashlib
import io
import os
import shutil
import subprocess
from typing import Optional

try:
    from pillow_heif import register_heif_opener

    register_heif_opener()
except ImportError:
    pass

from PIL import Image, ImageOps

IMAGE_EXTENSIONS = frozenset(
    {
        "jpg",
        "jpeg",
        "png",
        "gif",
        "webp",
        "bmp",
        "tif",
        "tiff",
        "heic",
        "heif",
        "avif",
    }
)
VIDEO_EXTENSIONS = frozenset(
    {
        "mp4",
        "mov",
        "m4v",
        "webm",
        "mkv",
        "avi",
        "mpg",
        "mpeg",
        "wmv",
        "flv",
        "3gp",
    }
)

THUMB_MAX = 320
JPEG_QUALITY = 85


def file_extension_lower(name: str) -> str:
    if "." not in name:
        return ""
    return name.rsplit(".", 1)[-1].lower()


def is_image_thumbnailable(name: str) -> bool:
    return file_extension_lower(name) in IMAGE_EXTENSIONS


def is_video_thumbnailable(name: str) -> bool:
    return file_extension_lower(name) in VIDEO_EXTENSIONS


def is_media_thumbnailable(name: str) -> bool:
    return is_image_thumbnailable(name) or is_video_thumbnailable(name)


def resolve_safe_file_path(base_dir: str, rel_path: str) -> Optional[str]:
    """Return absolute file path if it exists under base_dir, else None."""
    base = os.path.realpath(base_dir)
    candidate = os.path.realpath(os.path.normpath(os.path.join(base, rel_path)))
    if not candidate.startswith(base + os.sep) and candidate != base:
        return None
    if not os.path.isfile(candidate):
        return None
    return candidate


def _cache_file_path(base_dir: str, source_abs: str) -> str:
    cache_dir = os.path.join(base_dir, ".file_server", "thumbnail_cache")
    os.makedirs(cache_dir, exist_ok=True)
    mtime = os.path.getmtime(source_abs)
    digest = hashlib.sha256(f"{source_abs}\0{mtime}".encode("utf-8", errors="replace")).hexdigest()
    return os.path.join(cache_dir, f"{digest}.jpg")


def _image_to_jpeg_bytes(im: Image.Image) -> bytes:
    im = ImageOps.exif_transpose(im)
    im = im.convert("RGB")
    im.thumbnail((THUMB_MAX, THUMB_MAX), Image.Resampling.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    return buf.getvalue()


def generate_image_thumbnail(source_abs: str) -> Optional[bytes]:
    try:
        with Image.open(source_abs) as im:
            return _image_to_jpeg_bytes(im)
    except Exception:
        return None


def generate_video_thumbnail(source_abs: str) -> Optional[bytes]:
    if not shutil.which("ffmpeg"):
        return None
    try:
        proc = subprocess.run(
            [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "error",
                "-y",
                "-ss",
                "0.5",
                "-i",
                source_abs,
                "-frames:v",
                "1",
                "-vf",
                f"scale={THUMB_MAX}:{THUMB_MAX}:force_original_aspect_ratio=decrease",
                "-f",
                "image2pipe",
                "-vcodec",
                "mjpeg",
                "pipe:1",
            ],
            capture_output=True,
            timeout=60,
            check=False,
        )
        if proc.returncode != 0 or not proc.stdout:
            proc2 = subprocess.run(
                [
                    "ffmpeg",
                    "-hide_banner",
                    "-loglevel",
                    "error",
                    "-y",
                    "-i",
                    source_abs,
                    "-frames:v",
                    "1",
                    "-vf",
                    f"scale={THUMB_MAX}:{THUMB_MAX}:force_original_aspect_ratio=decrease",
                    "-f",
                    "image2pipe",
                    "-vcodec",
                    "mjpeg",
                    "pipe:1",
                ],
                capture_output=True,
                timeout=60,
                check=False,
            )
            if proc2.returncode != 0 or not proc2.stdout:
                return None
            return proc2.stdout
        return proc.stdout
    except (subprocess.TimeoutExpired, OSError, FileNotFoundError):
        return None


def get_or_create_thumbnail_jpeg(base_dir: str, source_abs: str, filename: str) -> Optional[bytes]:
    cache_path = _cache_file_path(base_dir, source_abs)
    if os.path.isfile(cache_path):
        try:
            with open(cache_path, "rb") as f:
                return f.read()
        except OSError:
            pass

    ext = file_extension_lower(filename)
    if ext in IMAGE_EXTENSIONS:
        data = generate_image_thumbnail(source_abs)
    elif ext in VIDEO_EXTENSIONS:
        data = generate_video_thumbnail(source_abs)
    else:
        return None

    if not data:
        return None
    try:
        with open(cache_path, "wb") as f:
            f.write(data)
    except OSError:
        pass
    return data
