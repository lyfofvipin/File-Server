(function (global) {
  const SERVERS_KEY = "fs_servers";
  const ACTIVE_KEY = "fs_active_server";
  const SIDEBAR_W_KEY = "fs_sidebar_w";
  const SPLIT_KEY = "fs_split";
  const LEGACY_CRED = "fs_credentials";
  const LEGACY_ROLE = "fs_role";

  function defaultUrl() {
    return ((global.FILE_SERVER || {}).apiBaseUrl || "http://127.0.0.1:5000").replace(/\/$/, "");
  }

  function configuredServers() {
    const cfg = (global.FILE_SERVER || {});
    const list = Array.isArray(cfg.apiServers) ? cfg.apiServers : [];
    const normalized = list
      .map(function (s) {
        if (!s) return null;
        if (typeof s === "string") {
          const u = normalizeUrl(s);
          return u ? { url: u, label: shortHost(u) } : null;
        }
        const u = normalizeUrl(s.url);
        if (!u) return null;
        const lbl = String(s.label || "").trim() || shortHost(u);
        return { url: u, label: lbl };
      })
      .filter(Boolean);

    if (normalized.length) return normalized;
    const fallback = defaultUrl();
    return [{ url: fallback, label: shortHost(fallback) }];
  }

  function uid() {
    return "srv_" + Math.random().toString(36).slice(2, 10);
  }

  function normalizeUrl(url) {
    return String(url || "").trim().replace(/\/$/, "");
  }

  function shortHost(url) {
    try {
      const u = new URL(url);
      return u.host || url;
    } catch (e) {
      return url;
    }
  }

  function loadServers() {
    let list = [];
    try {
      list = JSON.parse(localStorage.getItem(SERVERS_KEY) || "[]");
    } catch (e) {
      list = [];
    }
    if (!Array.isArray(list)) list = [];

    list = list
      .map(function (s) {
        if (!s || !s.url) return null;
        const u = normalizeUrl(s.url);
        if (!u) return null;
        return {
          id: s.id || uid(),
          label: (s.label || shortHost(u)),
          url: u,
        };
      })
      .filter(Boolean);

    const cfg = configuredServers();
    cfg.forEach(function (c) {
      const existing = list.find(function (s) { return s.url === c.url; });
      if (existing) {
        // Keep config label in sync unless user manually renamed this host in local storage.
        if (!existing.label || existing.label === shortHost(existing.url)) {
          existing.label = c.label || shortHost(existing.url);
        }
      } else {
        list.push({ id: uid(), label: c.label || shortHost(c.url), url: c.url });
      }
    });

    if (!list.length) {
      const fallback = defaultUrl();
      list = [{ id: uid(), label: shortHost(fallback), url: fallback }];
    }

    const active = getActiveServerId();
    if (!active || !list.some(function (s) { return s.id === active; })) {
      setActiveServerId(list[0].id);
    }

    saveServers(list);
    return list.map(function (s) {
      return {
        id: s.id,
        label: s.label || shortHost(s.url),
        url: normalizeUrl(s.url),
      };
    });
  }

  function saveServers(list) {
    localStorage.setItem(SERVERS_KEY, JSON.stringify(list));
  }

  function queryServerId() {
    try {
      return new URLSearchParams(location.search).get("server") || "";
    } catch (e) {
      return "";
    }
  }

  function getActiveServerId() {
    const q = queryServerId();
    if (q) return q;
    return localStorage.getItem(ACTIVE_KEY) || "";
  }

  function setActiveServerId(id) {
    localStorage.setItem(ACTIVE_KEY, id);
    try {
      global.dispatchEvent(new CustomEvent("fs:server-changed", { detail: { id: id } }));
    } catch (e) {}
  }

  function getServer(id) {
    const list = loadServers();
    const sid = id || getActiveServerId();
    let found = list.find(function (s) { return s.id === sid; });
    if (!found) found = list[0];
    return found || { id: "default", label: "local", url: defaultUrl() };
  }

  function addServer(url, label) {
    const list = loadServers();
    const normalized = normalizeUrl(url);
    if (!normalized) throw new Error("URL is required");
    const existing = list.find(function (s) { return s.url === normalized; });
    if (existing) return existing;
    const server = {
      id: uid(),
      label: (label || shortHost(normalized)).trim() || shortHost(normalized),
      url: normalized,
    };
    list.push(server);
    saveServers(list);
    return server;
  }

  function updateServer(id, url, label) {
    const list = loadServers();
    const idx = list.findIndex(function (s) { return s.id === id; });
    if (idx < 0) throw new Error("Server not found");
    if (url) list[idx].url = normalizeUrl(url) || list[idx].url;
    if (label !== undefined && label !== null) {
      const trimmed = String(label).trim();
      list[idx].label = trimmed || shortHost(list[idx].url);
    }
    saveServers(list);
    return list[idx];
  }

  function removeServer(id) {
    let list = loadServers();
    if (list.length <= 1) throw new Error("Keep at least one server");
    list = list.filter(function (s) { return s.id !== id; });
    saveServers(list);
    if (getActiveServerId() === id) setActiveServerId(list[0].id);
    sessionStorage.removeItem(credKey(id));
    sessionStorage.removeItem(roleKey(id));
    sessionStorage.removeItem(tokenKey(id));
    return list;
  }

  function apiBase() {
    return getServer().url;
  }

  function credKey(id) {
    return "fs_credentials_" + (id || getServer().id);
  }

  function roleKey(id) {
    return "fs_role_" + (id || getServer().id);
  }

  function tokenKey(id) {
    return "fs_token_" + (id || getServer().id);
  }

  function migrateLegacyCreds() {
    try {
      // Drop legacy username/password session storage — force re-login for API key.
      const sid = getServer().id;
      sessionStorage.removeItem(credKey(sid));
      sessionStorage.removeItem(roleKey(sid));
      sessionStorage.removeItem(LEGACY_CRED);
      sessionStorage.removeItem(LEGACY_ROLE);
    } catch (e) {}
  }

  migrateLegacyCreds();

  function getSession() {
    try {
      return JSON.parse(sessionStorage.getItem(tokenKey()) || "null");
    } catch (e) {
      return null;
    }
  }

  function setSession(token, username) {
    sessionStorage.setItem(
      tokenKey(),
      JSON.stringify({ token: token, username: username || "" })
    );
    // Never keep passwords in the browser
    sessionStorage.removeItem(credKey());
    sessionStorage.removeItem(roleKey());
  }

  function clearSession() {
    sessionStorage.removeItem(tokenKey());
    sessionStorage.removeItem(credKey());
    sessionStorage.removeItem(roleKey());
  }

  /** @deprecated use getSession — kept so callers still get username */
  function getCredentials() {
    const s = getSession();
    if (!s || !s.token) return null;
    return { username: s.username || "user", token: s.token };
  }

  /** @deprecated passwords are no longer stored */
  function setCredentials(username, password, role) {
    if (password && String(password).indexOf("eyJ") === 0) {
      // mistaking token for password
      setSession(password, username);
      return;
    }
    // Ignore password storage — login() must set the API key instead.
    if (username) {
      const s = getSession();
      if (s && s.token) setSession(s.token, username);
    }
  }

  function clearCredentials() {
    clearSession();
  }

  function isLoggedIn() {
    const s = getSession();
    return !!(s && s.token);
  }

  function isQE() {
    return isLoggedIn();
  }

  function authHeader() {
    const s = getSession();
    if (!s || !s.token) return {};
    return { Authorization: "Bearer " + s.token };
  }

  async function request(path, options) {
    const opts = options || {};
    const headers = Object.assign({}, opts.headers || {});
    if (!opts.skipAuth) Object.assign(headers, authHeader());
    if (opts.jsonBody) headers["Content-Type"] = "application/json";
    const fetchOpts = { method: opts.method || "GET", headers: headers };
    if (opts.jsonBody) fetchOpts.body = JSON.stringify(opts.jsonBody);
    if (opts.body) fetchOpts.body = opts.body;
    const res = await fetch(apiBase() + path, fetchOpts);
    const ct = res.headers.get("content-type") || "";
    let body;
    if (opts.expectBlob) body = await res.blob();
    else if (ct.includes("application/json")) body = await res.json();
    else body = await res.text();
    if (!res.ok) {
      const message = (body && body.message) || (typeof body === "string" && body.trim()) || ("Request failed (" + res.status + ")");
      const err = new Error(message);
      err.status = res.status;
      err.body = body;
      throw err;
    }
    return body;
  }

  async function fetchAuthorizedBlob(path, query) {
    const q = new URLSearchParams(query || {});
    return request(path + (q.toString() ? "?" + q.toString() : ""), { expectBlob: true });
  }

  async function health() { return request("/api/health", { skipAuth: true }); }
  async function meta() { return request("/api/meta", { skipAuth: true }); }
  async function about() { return request("/api/about", { skipAuth: true }); }
  async function login(username, password) {
    const res = await request("/api/login", {
      method: "POST",
      skipAuth: true,
      jsonBody: { username: username, password: password },
    });
    if (!res.token) throw new Error("Login response missing token.");
    setSession(res.token, res.username || username);
    return res;
  }
  async function loginWithApiKey(apiKey) {
    const res = await request("/api/login", {
      method: "POST",
      skipAuth: true,
      jsonBody: { api_key: apiKey },
    });
    if (!res.token) throw new Error("Login response missing token.");
    setSession(res.token, res.username || "api");
    return res;
  }
  async function register(username, email, password) {
    return request("/api/register", {
      method: "POST",
      skipAuth: true,
      jsonBody: { username: username, email: email, password: password },
    });
  }
  async function me() { return request("/api/me"); }
  async function updateAccount(username, email) {
    return request("/api/account", { method: "POST", jsonBody: { username: username, email: email } });
  }
  async function changePassword(oldPassword, newPassword) {
    return request("/api/account/password", { method: "POST", jsonBody: { old_password: oldPassword, new_password: newPassword } });
  }
  async function listApiKeys() { return request("/api/account/api-keys"); }
  async function createApiKey(name) {
    return request("/api/account/api-keys", { method: "POST", jsonBody: { name: name || "default" } });
  }
  async function revokeApiKey(id) {
    return request("/api/account/api-keys/" + id, { method: "DELETE" });
  }
  async function listRoot() { return request("/api"); }
  async function listPath(path) {
    const q = new URLSearchParams();
    if (path) q.set("path", path);
    return request("/api/download?" + q.toString());
  }
  async function download(path, file) {
    const q = new URLSearchParams();
    if (path) q.set("path", path);
    q.set("file", file);
    const blob = await request("/api/download?" + q.toString(), { expectBlob: true });
    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url; a.download = file; document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }
  async function upload(path, files, comment) {
    const q = new URLSearchParams();
    if (path) q.set("path", path);
    if (comment) q.set("comment", comment);
    const form = new FormData();
    Array.from(files).forEach(function (f) { form.append("file", f); });
    return request("/api/upload?" + q.toString(), { method: "POST", body: form });
  }
  async function replace(fileToReplace, file, fileNumber, comment) {
    const q = new URLSearchParams();
    q.set("file_to_replace", fileToReplace);
    if (fileNumber) q.set("file_number", String(fileNumber));
    if (comment) q.set("comment", comment);
    const form = new FormData();
    form.append("file", file);
    return request("/api/replace?" + q.toString(), { method: "POST", body: form });
  }
  async function rename(path, newName) {
    return request("/api/rename", { method: "POST", jsonBody: { path: path, new_name: newName } });
  }
  async function mkdir(path, name) {
    return request("/api/mkdir", { method: "POST", jsonBody: { path: path || "", name: name } });
  }
  async function deletePath(path) {
    return request("/api/delete", { method: "POST", jsonBody: { path: path } });
  }
  async function deleteByName(fileToDelete, fileNumber) {
    return request("/api/delete", { method: "POST", jsonBody: { file_to_delete: fileToDelete, file_number: fileNumber || null } });
  }
  async function previewBlob(path) {
    return fetchAuthorizedBlob("/api/preview", { path: path });
  }
  async function thumbnailBlob(path) {
    return fetchAuthorizedBlob("/api/thumbnail", { path: path });
  }

  function pageUrl(page, queryObj) {
    let name = String(page || "index").replace(/^\//, "");
    if (name.endsWith(".html")) name = name.slice(0, -5);
    if (name === "index" || name === "") name = "";
    const q = new URLSearchParams();
    if (queryObj && typeof queryObj === "object") {
      Object.keys(queryObj).forEach(function (k) {
        if (queryObj[k] !== undefined && queryObj[k] !== null && queryObj[k] !== "") {
          q.set(k, queryObj[k]);
        }
      });
    }
    const sid = getActiveServerId();
    if (sid && !q.has("server")) q.set("server", sid);
    const qs = q.toString();
    // Root-relative so links work from any page (/about → /upload)
    if (!name) return "/" + (qs ? ("?" + qs) : "");
    return "/" + name + (qs ? "?" + qs : "");
  }

  function requireAuth() {
    if (!isLoggedIn()) {
      const next = encodeURIComponent(location.pathname + location.search);
      location.href = pageUrl("login", { next: location.pathname + location.search });
      return false;
    }
    return true;
  }

  function switchServer(id, options) {
    const opts = options || {};
    setActiveServerId(id);
    const url = new URL(location.href);
    url.searchParams.set("server", id);
    const next = url.pathname.replace(/\.html$/, "") + url.search + url.hash;
    if (opts.soft) {
      history.replaceState(null, "", next);
      return;
    }
    location.href = next;
  }

  function getSplit() {
    try {
      return JSON.parse(localStorage.getItem(SPLIT_KEY) || "null");
    } catch (e) {
      return null;
    }
  }

  function setSplit(rightServerId) {
    if (!rightServerId) localStorage.removeItem(SPLIT_KEY);
    else localStorage.setItem(SPLIT_KEY, JSON.stringify({ right: rightServerId }));
  }

  function getSidebarWidth() {
    const w = parseInt(localStorage.getItem(SIDEBAR_W_KEY) || "240", 10);
    return isNaN(w) ? 240 : Math.min(480, Math.max(160, w));
  }

  function setSidebarWidth(w) {
    localStorage.setItem(SIDEBAR_W_KEY, String(Math.min(480, Math.max(160, w))));
  }

  global.FSApi = {
    apiBase, getCredentials, setCredentials, clearCredentials, clearSession, getSession, setSession,
    isLoggedIn, isQE, authHeader,
    health, meta, about, login, loginWithApiKey, register, me, updateAccount, changePassword,
    listApiKeys, createApiKey, revokeApiKey,
    listRoot, listPath, download, upload, replace, rename, mkdir, deletePath, deleteByName,
    previewBlob, thumbnailBlob, requireAuth, pageUrl,
    loadServers, addServer, updateServer, removeServer, getServer, getActiveServerId,
    setActiveServerId, switchServer, shortHost, normalizeUrl, defaultUrl,
    getSplit, setSplit, getSidebarWidth, setSidebarWidth,
  };
})(window);
