#!/usr/bin/env python3
"""Serve the static frontend on port 8080 (override with PORT env).

Pretty URLs: /about → about.html, / → index.html (no .html in the address bar).
"""
import os
from urllib.parse import urlparse, unquote
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

ROOT = os.path.dirname(os.path.abspath(__file__))

STATIC_PREFIXES = ("/js/", "/css/", "/assets/")
STATIC_EXACT = {"/config.js", "/favicon.ico", "/robots.txt"}


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

    def do_GET(self):
        self._rewrite_pretty()
        return super().do_GET()

    def do_HEAD(self):
        self._rewrite_pretty()
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
    print("Set frontend/config.js apiBaseUrl to your backend host.")
    server.serve_forever()
