# File-Server backend (FastAPI)

API-only service using FastAPI + SQLModel. Interactive Swagger UI: `/docs`.

## Run

```bash
cd backend
pip install -r requirements.txt
python run.py
```

Listens on `0.0.0.0:5000` by default (`src/config.py` → `Settings.port`).

Open:

- Swagger UI: `http://127.0.0.1:5000/docs`
- ReDoc: `http://127.0.0.1:5000/redoc`

## Configure

Edit [`src/config.py`](src/config.py) (`Settings`) or set env vars with prefix `FS_` (e.g. `FS_PORT=5000`):

- `result_base_dir_path` — filesystem root for files
- `port` — API port
- `cors_origins` — browser origins allowed
- `allow_registrations` / `allow_delete` / `enable_api_keys`
- `secret_key`
- `database_url` — optional; defaults to `backend/src/site.db`
- `data_retention_days` — delete files older than N days (default `90`; `0` disables)
- `cleanup_interval_hours` — retention sweep interval (default `24`)
- `cleanup_exclude_dirs` — share-relative dirs to never clean (JSON list)

## Auth

- **API key** — `POST /api/login` with `{username, password}` mints a browser `session` key (returned as `token`); or login with `{api_key}`. Send as `Authorization: Bearer <key>` or `X-API-Key`
- **Basic** — still accepted for CLI compatibility
- Manage long-lived keys under `/api/account/api-keys`

## Endpoints (summary)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/health` | no | Liveness |
| GET | `/api/meta` | no | Public flags |
| GET | `/api/about` | no | README markdown |
| POST | `/api/login` | no | Password or API-key login (returns API key as `token`) |
| POST | `/api/register` | no* | Register (*if enabled) |
| GET | `/api/me` | API key/Basic | Current user |
| POST | `/api/account` | API key/Basic | Update username/email |
| POST | `/api/account/password` | API key/Basic | Change password |
| GET/POST/DELETE | `/api/account/api-keys` | API key/Basic | Manage API keys |
| GET | `/api` | no | List root products |
| GET | `/api/download?path=&file=` | yes | List path or download |
| GET | `/api/preview?path=` | yes | Inline preview |
| GET | `/api/thumbnail?path=` | yes | JPEG thumbnail |
| POST | `/api/upload?path=&comment=` | yes | Upload (multi-file) |
| POST | `/api/replace?file_to_replace=` | yes | Replace |
| POST | `/api/rename` | yes | JSON `{path, new_name}` |
| POST | `/api/mkdir` | yes | JSON `{path, name}` |
| POST | `/api/delete` | yes* | Delete (*`allow_delete`) |

## Plug any frontend

Point the FE `apiBaseUrl` at this host, e.g. `http://127.0.0.1:5000`.
