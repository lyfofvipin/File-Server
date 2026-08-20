#!/usr/bin/env python3
"""Serve the static frontend on port 8080 (override with PORT env).

Pretty URLs: /about → about.html, / → index.html (no .html in the address bar).

Backend URL: FS_API_URL (optional FS_API_LABEL) is injected into /config.js and
takes priority over the static apiServers list in config.js.
"""
import json
import os
from urllib.parse import urlparse, unquote
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

ROOT = os.path.dirname(os.path.abspath(__file__))

STATIC_PREFIXES = ("/js/", "/css/", "/assets/")
STATIC_EXACT = {"/config.js", "/favicon.ico", "/robots.txt"}


def env_api_url():
    return os.environ.get("FS_API_URL", "").strip().rstrip("/")


def env_api_label():
    return os.environ.get("FS_API_LABEL", "").strip()


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def _rewrite_pretty(self):
        parsed = urlparse(self.path)
        # Decode %xx so spaces etc. do not break file lookup
        path = unquote(parsed.path or "/")
        query = ("?" + parsed.query) if parsed.query else ""

        if path in STATIC_EXACT or any(path.startswith(p) for p in STATIC_PREFIXES):
            self.path = path + query
            return

        if path == "/" or path == "":
            self.path = "/index.html" + query
            return

        # Strip trailing slash: /about/ → /about
        if path != "/" and path.endswith("/"):
            path = path.rstrip("/")

        base = os.path.basename(path)
        # Real static file with extension → leave as-is
        if "." in base:
            self.path = path + query
            return

        candidate = path + ".html"
        abs_candidate = os.path.normpath(os.path.join(ROOT, candidate.lstrip("/")))
        # Stay inside ROOT
        if abs_candidate.startswith(ROOT) and os.path.isfile(abs_candidate):
            self.path = candidate + query
            return

        # Fall through: let the stock handler 404
        self.path = path + query

    def _serve_config_js(self, include_body):
        path = os.path.join(ROOT, "config.js")
        try:
            with open(path, "r", encoding="utf-8") as fh:
                body = fh.read()
        except OSError:
            self.send_error(404)
            return

        url = env_api_url()
        if url:
            body += (
                "\nwindow.FILE_SERVER = window.FILE_SERVER || {};\n"
                "window.FILE_SERVER.apiBaseUrlFromEnv = %s;\n"
                "window.FILE_SERVER.apiBaseUrlFromEnvLabel = %s;\n"
                "window.FILE_SERVER.apiBaseUrl = window.FILE_SERVER.apiBaseUrlFromEnv;\n"
            ) % (json.dumps(url), json.dumps(env_api_label()))

        data = body.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/javascript; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if include_body:
            self.wfile.write(data)

    def do_GET(self):
        self._rewrite_pretty()
        if urlparse(self.path).path == "/config.js":
            return self._serve_config_js(include_body=True)
        return super().do_GET()

    def do_HEAD(self):
        self._rewrite_pretty()
        if urlparse(self.path).path == "/config.js":
            return self._serve_config_js(include_body=False)
        return super().do_HEAD()

    def log_message(self, fmt, *args):
        # Keep default logging
        super().log_message(fmt, *args)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8080"))
    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print("Frontend listening on http://0.0.0.0:%s" % port)
    print("Document root: %s" % ROOT)
    print("Pretty URLs: /about → about.html")
    api_url = env_api_url()
    if api_url:
        label = env_api_label() or api_url
        print("FS_API_URL=%s (%s) — overrides config.js as the default backend" % (api_url, label))
    else:
        print("Set FS_API_URL or frontend/config.js apiBaseUrl to your backend host.")
    server.serve_forever()
