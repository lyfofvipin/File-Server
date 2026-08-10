from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class HealthOut(BaseModel):
    status: str = "ok"


class MetaOut(BaseModel):
    allow_registrations: bool
    allow_delete: bool
    enable_api_keys: bool
    auth_modes: List[str]
    result_base_dir_path: str
    home_alias: str = "~"


class AboutOut(BaseModel):
    markdown: str


class LoginRequest(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    api_key: Optional[str] = None


class LoginResponse(BaseModel):
    message: str
    token: str
    token_type: str = "Bearer"
    username: str
    email: str
    auth: str


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str


class MessageOut(BaseModel):
    message: str


class RegisterOut(BaseModel):
    message: str
    username: str


class UserOut(BaseModel):
    username: str
    email: str
    role: bool = False
    image: str = "default.jpg"


class AccountUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None


class AccountUpdateOut(BaseModel):
    message: str
    username: str
    email: str
    role: bool = False


class PasswordChange(BaseModel):
    old_password: str
    new_password: str


class ApiKeyCreate(BaseModel):
    name: str = "default"


class ApiKeyOut(BaseModel):
    id: int
    name: str
    prefix: str
    created_at: Optional[str] = None
    last_used_at: Optional[str] = None


class ApiKeyListOut(BaseModel):
    keys: List[ApiKeyOut]


class ApiKeyCreated(BaseModel):
    message: str
    id: int
    name: str
    prefix: str
    api_key: str


class ProductsOut(BaseModel):
    products: List[str]


class EntryOut(BaseModel):
    name: str
    is_dir: bool
    mtime: str = ""
    comment: str = ""
    uploader: str = ""
    uploaded_at: str = ""
    thumbnailable: bool = False


class BrowseOut(BaseModel):
    available_files: Dict[str, str]
    entries: List[EntryOut]
    path: str


class UploadOut(BaseModel):
    message: str
    ok: bool = True


class RenameBody(BaseModel):
    path: str
    new_name: str


class RenameOut(BaseModel):
    message: str
    new_name: str


class MkdirBody(BaseModel):
    path: str = ""
    name: str


class MkdirOut(BaseModel):
    message: str
    path: str


class DeleteBody(BaseModel):
    path: Optional[str] = None
    file_to_delete: Optional[str] = None
    file_number: Optional[Any] = None


class DeleteOut(BaseModel):
    message: str
    deleted: Optional[str] = None
    matches: Optional[List[str]] = None
