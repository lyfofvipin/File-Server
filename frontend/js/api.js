(function (global) {
  const SERVERS_KEY = "fs_servers";
  const ACTIVE_KEY = "fs_active_server";
  const SIDEBAR_W_KEY = "fs_sidebar_w";
  const SPLIT_KEY = "fs_split";
  const LEGACY_CRED = "fs_credentials";
  const LEGACY_ROLE = "fs_role";

  function envUrl() {
    return normalizeUrl((global.FILE_SERVER || {}).apiBaseUrlFromEnv || "");
  }

  function defaultUrl() {
    return envUrl() || ((global.FILE_SERVER || {}).apiBaseUrl || "http://127.0.0.1:5000").replace(/\/$/, "");
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

    const env = envUrl();
    if (env) {
      const envEntry = {
        url: env,
        label: String(cfg.apiBaseUrlFromEnvLabel || "").trim() || shortHost(env),
      };
      return [envEntry].concat(normalized.filter(function (s) { return s.url !== env; }));
    }

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
    const byUrl = {};
    list.forEach(function (s) { byUrl[s.url] = s; });
    const merged = [];
    const seen = {};
    cfg.forEach(function (c) {
      const existing = byUrl[c.url];
      if (existing) {
        // Keep config label in sync unless user manually renamed this host in local storage.
        if (!existing.label || existing.label === shortHost(existing.url)) {
          existing.label = c.label || shortHost(existing.url);
        }
        merged.push(existing);
      } else {
        merged.push({ id: uid(), label: c.label || shortHost(c.url), url: c.url });
      }
      seen[c.url] = true;
    });
    list.forEach(function (s) {
      if (!seen[s.url]) merged.push(s);
    });
    list = merged;

    if (!list.length) {
      const fallback = defaultUrl();
      list = [{ id: uid(), label: shortHost(fallback), url: fallback }];
    }

    const q = queryServerId();
    const env = envUrl();
    const stored = localStorage.getItem(ACTIVE_KEY) || "";
    if (q && list.some(function (s) { return s.id === q; })) {
      if (stored !== q) setActiveServerId(q);
    } else if (env) {
      const envSrv = list.find(function (s) { return s.url === env; });
      if (envSrv && stored !== envSrv.id) setActiveServerId(envSrv.id);
    } else if (!stored || !list.some(function (s) { return s.id === stored; })) {
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

  function formatBytes(n) {
    if (n == null || isNaN(n)) return "";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    let v = Number(n);
    while (v >= 1024 && i < units.length - 1) {
      v /= 1024;
      i += 1;
    }
    return (i ? v.toFixed(1) : String(Math.round(v))) + " " + units[i];
  }

  function ensureTransferProgressUi() {
    let root = document.getElementById("fs-transfer-progress");
    if (root) return root;
    root = document.createElement("div");
    root.id = "fs-transfer-progress";
    root.className = "download-progress";
    root.hidden = true;
    root.innerHTML =
      '<div class="download-progress__card">' +
      '<div class="download-progress__label">Transferring…</div>' +
      '<div class="download-progress__track">' +
      '<div class="download-progress__bar"></div>' +
      "</div>" +
      '<div class="download-progress__meta">Starting…</div>' +
      "</div>";
    document.body.appendChild(root);
    return root;
  }

  function showTransferProgress(label) {
    const root = ensureTransferProgressUi();
    const labelEl = root.querySelector(".download-progress__label");
    const bar = root.querySelector(".download-progress__bar");
    const meta = root.querySelector(".download-progress__meta");
    if (labelEl) labelEl.textContent = label;
    if (bar) bar.style.width = "0%";
    if (meta) meta.textContent = "Starting…";
    root.classList.remove("download-progress--indeterminate");
    root.hidden = false;
  }

  function updateTransferProgress(loaded, total, verb) {
    const root = document.getElementById("fs-transfer-progress");
    if (!root || root.hidden) return;
    const bar = root.querySelector(".download-progress__bar");
    const meta = root.querySelector(".download-progress__meta");
    const action = verb === "sent" ? "sent" : "received";
    if (total && total > 0) {
      const pct = Math.min(100, Math.round((loaded / total) * 100));
      root.classList.remove("download-progress--indeterminate");
      if (bar) bar.style.width = pct + "%";
      if (meta) {
        meta.textContent = pct + "% · " + formatBytes(loaded) + " / " + formatBytes(total);
      }
    } else {
      root.classList.add("download-progress--indeterminate");
      if (bar) bar.style.width = "100%";
      if (meta) meta.textContent = formatBytes(loaded) + " " + action;
    }
  }

  function hideTransferProgress() {
    const root = document.getElementById("fs-transfer-progress");
    if (!root) return;
    root.hidden = true;
    root.classList.remove("download-progress--indeterminate");
    const bar = root.querySelector(".download-progress__bar");
    if (bar) bar.style.width = "0%";
  }

  function uploadProgressLabel(files) {
    const list = Array.from(files || []);
    if (!list.length) return "files";
    if (list.length === 1) return list[0].name;
    return list.length + " files";
  }

  function filesTotalSize(files) {
    let total = 0;
    Array.from(files || []).forEach(function (f) {
      total += f.size || 0;
    });
    return total;
  }

  function xhrJsonError(xhr, reject) {
    const ct = xhr.getResponseHeader("content-type") || "";
    let body = xhr.responseText;
    if (ct.indexOf("application/json") >= 0) {
      try {
        body = JSON.parse(xhr.responseText);
      } catch (e) {}
    }
    const message =
      (body && body.message) ||
      (typeof body === "string" && body.trim()) ||
      ("Request failed (" + xhr.status + ")");
    const err = new Error(message);
    err.status = xhr.status;
    err.body = body;
    reject(err);
  }

  function sendFormWithProgress(path, formData, onProgress) {
    return new Promise(function (resolve, reject) {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", apiBase() + path);
      const headers = authHeader();
      Object.keys(headers).forEach(function (k) {
        xhr.setRequestHeader(k, headers[k]);
      });
      xhr.upload.onprogress = function (e) {
        if (typeof onProgress === "function") {
          onProgress(e.loaded, e.lengthComputable ? e.total : null);
        }
      };
      xhr.onload = function () {
        const ct = xhr.getResponseHeader("content-type") || "";
        let body = xhr.responseText;
        if (ct.indexOf("application/json") >= 0) {
          try {
            body = JSON.parse(xhr.responseText);
          } catch (e) {}
        }
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(body);
          return;
        }
        xhrJsonError(xhr, reject);
      };
      xhr.onerror = function () {
        reject(new Error("Network error while uploading"));
      };
      xhr.onabort = function () {
        reject(new Error("Upload cancelled"));
      };
      xhr.send(formData);
    });
  }

  function fetchBlobWithProgress(path, onProgress) {
    return new Promise(function (resolve, reject) {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", apiBase() + path);
      xhr.responseType = "blob";
      const headers = authHeader();
      Object.keys(headers).forEach(function (k) {
        xhr.setRequestHeader(k, headers[k]);
      });
      xhr.onprogress = function (e) {
        if (typeof onProgress === "function") {
          onProgress(e.loaded, e.lengthComputable ? e.total : null);
        }
      };
      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.response);
          return;
        }
        const blob = xhr.response;
        if (blob && blob.type && blob.type.indexOf("json") >= 0) {
          blob.text().then(function (text) {
            let message = "Request failed (" + xhr.status + ")";
            try {
              const body = JSON.parse(text);
              if (body && body.message) message = body.message;
            } catch (e) {}
            const err = new Error(message);
            err.status = xhr.status;
            reject(err);
          }).catch(function () {
            reject(new Error("Request failed (" + xhr.status + ")"));
          });
          return;
        }
        const err = new Error("Request failed (" + xhr.status + ")");
        err.status = xhr.status;
        reject(err);
      };
      xhr.onerror = function () {
        reject(new Error("Network error while downloading"));
      };
      xhr.onabort = function () {
        reject(new Error("Download cancelled"));
      };
      xhr.send();
    });
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
    const dlPath = "/api/download?" + q.toString();
    showTransferProgress("Downloading " + file);
    try {
      const blob = await fetchBlobWithProgress(dlPath, function (loaded, total) {
        updateTransferProgress(loaded, total, "received");
      });
      updateTransferProgress(blob.size || 0, blob.size || 0, "received");
      const a = document.createElement("a");
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = file;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      await new Promise(function (resolve) { setTimeout(resolve, 300); });
    } finally {
      hideTransferProgress();
    }
  }
  async function upload(path, files, comment) {
    const q = new URLSearchParams();
    if (path) q.set("path", path);
    if (comment) q.set("comment", comment);
    const form = new FormData();
    const list = Array.from(files);
    list.forEach(function (f) { form.append("file", f); });
    const totalBytes = filesTotalSize(list);
    showTransferProgress("Uploading " + uploadProgressLabel(list));
    try {
      const result = await sendFormWithProgress(
        "/api/upload?" + q.toString(),
        form,
        function (loaded, total) {
          updateTransferProgress(loaded, total || totalBytes || null, "sent");
        }
      );
      if (totalBytes) updateTransferProgress(totalBytes, totalBytes, "sent");
      await new Promise(function (resolve) { setTimeout(resolve, 300); });
      return result;
    } finally {
      hideTransferProgress();
    }
  }
  async function replace(fileToReplace, file, fileNumber, comment) {
    const q = new URLSearchParams();
    q.set("file_to_replace", fileToReplace);
    if (fileNumber) q.set("file_number", String(fileNumber));
    if (comment) q.set("comment", comment);
    const form = new FormData();
    form.append("file", file);
    const totalBytes = file ? file.size || 0 : 0;
    showTransferProgress("Uploading " + (file ? file.name : "file"));
    try {
      const result = await sendFormWithProgress(
        "/api/replace?" + q.toString(),
        form,
        function (loaded, total) {
          updateTransferProgress(loaded, total || totalBytes || null, "sent");
        }
      );
      if (totalBytes) updateTransferProgress(totalBytes, totalBytes, "sent");
      await new Promise(function (resolve) { setTimeout(resolve, 300); });
      return result;
    } finally {
      hideTransferProgress();
    }
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
