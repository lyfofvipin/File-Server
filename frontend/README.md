# File-Server frontend

Terminal-style static UI that uses **only** backend APIs (HTTP Basic auth after login).

## Run

```bash
cd frontend
python serve.py
```

Open `http://localhost:8080`.

## Connect to any backend

Edit [`config.js`](config.js):

```js
window.FILE_SERVER = {
  apiBaseUrl: "http://127.0.0.1:5000"
};
```

## Features

- Sidebar Places navigation (`~/browse`, `~/upload`, …)
- Prompt bar: `user@fs:~/path$` + `cd path` jump
- Browse with download / preview / rename / delete
- Upload (multi-file), replace, delete-by-name
- Login, register, account, password change, about
