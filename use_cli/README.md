# File-Server CLI container

Runs [`file_server`](../../file_server) in a small image with `click` and `requests` pre-installed. No local `pip install` on the host.

## Build

```bash
podman build -f Dockerfile -t file-server-cli .
```

Image name defaults to `file-server-cli`.

## Run

Point `--host` at your **backend** URL (without `/api`). Auth via `-k` / `FS_API_KEY` or `-U` / `-P`.

**List root:**

```bash
podman run --rm file-server-cli \
  --host http://127.0.0.1:5000 \
  download -k "$FS_API_KEY"
```

**Download a file:**

```bash
podman run --rm file-server-cli \
  --host http://127.0.0.1:5000 \
  download -k "$FS_API_KEY" --path Product1/01 -f report.xml
```

**Upload** (mount the directory that contains your local files):

```bash
podman run --rm -v "$(pwd):/work:Z" -w /work file-server-cli \
  --host http://127.0.0.1:5000 \
  upload -k "$FS_API_KEY" --path Product1/01 -f report.xml --comment "CI run"
```

**Replace:**

```bash
podman run --rm -v "$(pwd):/work:Z" -w /work file-server-cli \
  --host http://127.0.0.1:5000 \
  replace -k "$FS_API_KEY" -o report.xml -f report-new.xml
```
