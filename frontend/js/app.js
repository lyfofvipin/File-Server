(function () {
  const THEME_KEY = "fs_theme";

  function getTheme() {
    try {
      const t = localStorage.getItem(THEME_KEY);
      return t === "light" ? "light" : "dark";
    } catch (e) {
      return "dark";
    }
  }

  function applyTheme(theme) {
    const next = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    document.documentElement.style.background = "";
    document.documentElement.style.color = "";
    if (document.body) {
      document.body.style.background = "";
      document.body.style.color = "";
    }
    const app = document.getElementById("app-shell");
    if (app) {
      app.style.background = "";
      app.style.color = "";
    }
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    return next;
  }

  function toggleTheme() {
    return applyTheme(getTheme() === "light" ? "dark" : "light");
  }

  applyTheme(getTheme());

  function $(sel, root) { return (root || document).querySelector(sel); }
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function showAlert(el, message, type) {
    if (!el) return;
    el.hidden = !message;
    el.textContent = message || "";
    el.className = "alert" + (type ? " alert--" + type : "");
  }
  function pathFromQuery() {
    return (new URLSearchParams(location.search).get("path") || "").replace(/^\/+|\/+$/g, "");
  }
  function joinPath(base, name) {
    return [base, name].filter(Boolean).join("/");
  }
  const serverRuntimeState = {};

  function markServerOffline(serverId, offline) {
    if (!serverId) return;
    if (!serverRuntimeState[serverId]) serverRuntimeState[serverId] = {};
    serverRuntimeState[serverId].offline = !!offline;
  }

  function isServerOffline(serverId) {
    return !!(serverRuntimeState[serverId] && serverRuntimeState[serverId].offline);
  }

  function setServerLastError(serverId, message) {
    if (!serverId) return;
    if (!serverRuntimeState[serverId]) serverRuntimeState[serverId] = {};
    serverRuntimeState[serverId].lastError = String(message || "").trim();
    serverRuntimeState[serverId].lastErrorAt = new Date().toISOString();
  }

  function clearServerLastError(serverId) {
    if (!serverId || !serverRuntimeState[serverId]) return;
    serverRuntimeState[serverId].lastError = "";
    serverRuntimeState[serverId].lastErrorAt = "";
  }

  function setServerAlertState(serverId, message, type) {
    const st = getServerState(serverId);
    st.alertMessage = message || "";
    st.alertType = type || "";
  }

  function getServerState(serverId) {
    if (!serverId) return {};
    if (!serverRuntimeState[serverId]) serverRuntimeState[serverId] = {};
    return serverRuntimeState[serverId];
  }

  function parseCdInput(raw, cwd) {
    let val = (raw || "").trim();
    if (val.toLowerCase().indexOf("cd ") === 0) val = val.slice(3).trim();
    if (val.toLowerCase() === "cd") val = "";

    // Absolute from ~
    if (val === "~" || val === "~/" || val === "~/browse" || val === "browse") {
      return { basePath: "", partial: "", absolute: true, goHome: true };
    }
    if (val.indexOf("~/") === 0) {
      val = val.slice(2);
      const parts = val.split("/").filter(Boolean);
      const partial = val.endsWith("/") ? "" : (parts.pop() || "");
      const basePath = parts.join("/");
      return { basePath: basePath, partial: partial, absolute: true, goHome: false };
    }
    if (val.charAt(0) === "~") {
      return { basePath: "", partial: val.slice(1), absolute: true, goHome: false };
    }

    // Relative to current browse folder
    const parts = val.split("/").filter(function (p, i, arr) {
      return p || i === arr.length - 1;
    });
    // keep empty trailing for "foo/" meaning list inside foo
    const endsWithSlash = /\/$/.test(val);
    const segs = val.split("/");
    if (endsWithSlash) {
      const baseRel = segs.filter(Boolean).join("/");
      return { basePath: joinPath(cwd, baseRel), partial: "", absolute: false, goHome: false };
    }
    const partial = segs.pop() || "";
    const baseRel = segs.filter(Boolean).join("/");
    return { basePath: joinPath(cwd, baseRel), partial: partial, absolute: false, goHome: false };
  }

  function resolveRelPath(path) {
    const parts = [];
    String(path || "")
      .replace(/\\/g, "/")
      .split("/")
      .forEach(function (seg) {
        if (!seg || seg === ".") return;
        if (seg === "..") {
          if (parts.length) parts.pop();
          return;
        }
        parts.push(seg);
      });
    return parts.join("/");
  }

  function navigateCd(raw, cwd) {
    let val = (raw || "").trim();
    // Bare "cd" → Home (~)
    if (/^cd$/i.test(val) || val === "") {
      location.href = hrefWithServer("index.html");
      return;
    }
    if (val.toLowerCase().indexOf("cd ") === 0) val = val.slice(3).trim();
    if (!val || val === "~" || val === "~/" || val === "~/browse" || val === "browse" || val === "home" || /^cd$/i.test(val)) {
      location.href = hrefWithServer("index.html");
      return;
    }
    if (val.indexOf("~/") === 0) val = val.slice(2);
    else if (val.charAt(0) === "~") val = val.slice(1);
    else if (cwd) val = joinPath(cwd, val);
    val = resolveRelPath(val);
    if (!val || val === "browse" || val === "home") {
      location.href = hrefWithServer("index.html");
      return;
    }
    location.href = hrefWithServer("index.html?path=" + encodeURIComponent(val));
  }

  function renderClickablePath(el, path, rootHint) {
    if (!el) return;
    const clean = resolveRelPath(path || "");
    const segs = clean ? clean.split("/") : [];
    let html = '<a class="path-seg" href="' + hrefWithServer("index.html") + '" title="Home (' + escapeHtml(rootHint || "result_base_dir_path") + ')">~</a>';
    let acc = "";
    segs.forEach(function (seg) {
      acc = acc ? acc + "/" + seg : seg;
      html += '/<a class="path-seg" href="' + hrefWithServer("index.html?path=" + encodeURIComponent(acc)) + '">' + escapeHtml(seg) + "</a>";
    });
    el.innerHTML = html;
    el.title = (rootHint || "") + (clean ? clean : "");
  }

  async function loadDirNames(path) {
    if (!FSApi.isLoggedIn()) return [];
    try {
      if (!path) {
        const root = await FSApi.listRoot();
        return (root.products || []).slice().sort(function (a, b) {
          return a.toLowerCase().localeCompare(b.toLowerCase());
        });
      }
      const data = await FSApi.listPath(path);
      return (data.entries || [])
        .filter(function (e) { return e.is_dir; })
        .map(function (e) { return e.name; })
        .sort(function (a, b) { return a.toLowerCase().localeCompare(b.toLowerCase()); });
    } catch (e) {
      return [];
    }
  }

  function wireCdAutocomplete(jump, cwd) {
    if (!jump) return;
    let suggest = document.getElementById("cd-suggest");
    if (!suggest) {
      const wrap = document.createElement("div");
      wrap.className = "cd-wrap";
      jump.parentNode.insertBefore(wrap, jump);
      wrap.appendChild(jump);
      suggest = document.createElement("ul");
      suggest.className = "cd-suggest";
      suggest.id = "cd-suggest";
      suggest.hidden = true;
      wrap.appendChild(suggest);
    }

    const cache = {};
    let activeIdx = -1;
    let currentMatches = [];

    async function dirsFor(path) {
      const key = path || "";
      if (cache[key]) return cache[key];
      const names = await loadDirNames(path);
      cache[key] = names;
      return names;
    }

    function hideSuggest() {
      suggest.hidden = true;
      suggest.innerHTML = "";
      activeIdx = -1;
      currentMatches = [];
    }

    function renderSuggest(matches, prefixPath) {
      currentMatches = matches;
      activeIdx = matches.length ? 0 : -1;
      if (!matches.length) {
        hideSuggest();
        return;
      }
      suggest.innerHTML = matches.map(function (name, i) {
        return '<li class="' + (i === 0 ? "is-active" : "") + '" data-name="' + escapeHtml(name) + '">' +
          '<span>📁</span><span><span class="cd-prefix">' + escapeHtml(prefixPath ? prefixPath + "/" : "") +
          "</span>" + escapeHtml(name) + "</span></li>";
      }).join("");
      suggest.hidden = false;
      Array.prototype.forEach.call(suggest.querySelectorAll("li[data-name]"), function (li) {
        li.onmousedown = function (e) {
          e.preventDefault();
          applySuggestion(li.getAttribute("data-name"));
        };
      });
    }

    function applySuggestion(name) {
      const parsed = parseCdInput(jump.value, cwd);
      const hadCd = /^\s*cd\s+/i.test(jump.value);
      let next;
      if (parsed.absolute || /^\s*(cd\s+)?~/.test(jump.value)) {
        next = "~/" + (parsed.basePath ? parsed.basePath + "/" : "") + name + "/";
      } else if (cwd) {
        // Keep path relative to cwd for the input display
        const fromCwd = parsed.basePath === cwd
          ? ""
          : parsed.basePath.slice(cwd.length).replace(/^\/+/, "");
        next = (fromCwd ? fromCwd + "/" : "") + name + "/";
      } else {
        next = (parsed.basePath ? parsed.basePath + "/" : "") + name + "/";
      }
      jump.value = (hadCd ? "cd " : "") + next;
      hideSuggest();
      jump.focus();
      refreshSuggest();
    }

    async function refreshSuggest() {
      const raw = jump.value;
      // Dropdown only while typing a cd command (e.g. "cd", "cd ", "cd foo/")
      if (!/^\s*cd(\s|$)/i.test(raw)) {
        hideSuggest();
        return;
      }
      const parsed = parseCdInput(raw, cwd);
      if (parsed.goHome && (!parsed.partial || parsed.partial === "")) {
        const names = await dirsFor("");
        renderSuggest(names.slice(0, 50), "");
        return;
      }
      // Bare "cd" / "cd " → list dirs in current folder
      if (/^\s*cd\s*$/i.test(raw)) {
        const names = await dirsFor(cwd);
        renderSuggest(names.slice(0, 50), cwd);
        return;
      }
      const names = await dirsFor(parsed.basePath);
      const partial = (parsed.partial || "").toLowerCase();
      const matches = names.filter(function (n) {
        return !partial || n.toLowerCase().indexOf(partial) === 0;
      }).slice(0, 50);
      renderSuggest(matches, parsed.basePath);
    }

    jump.addEventListener("input", function () { refreshSuggest(); });
    jump.addEventListener("focus", function () { refreshSuggest(); });
    jump.addEventListener("blur", function () {
      setTimeout(hideSuggest, 150);
    });

    jump.onkeydown = function (e) {
      const open = !suggest.hidden && currentMatches.length;
      if (e.key === "ArrowDown" && open) {
        e.preventDefault();
        activeIdx = (activeIdx + 1) % currentMatches.length;
        Array.prototype.forEach.call(suggest.querySelectorAll("li[data-name]"), function (li, i) {
          li.classList.toggle("is-active", i === activeIdx);
        });
        return;
      }
      if (e.key === "ArrowUp" && open) {
        e.preventDefault();
        activeIdx = (activeIdx - 1 + currentMatches.length) % currentMatches.length;
        Array.prototype.forEach.call(suggest.querySelectorAll("li[data-name]"), function (li, i) {
          li.classList.toggle("is-active", i === activeIdx);
        });
        return;
      }
      if ((e.key === "Tab" || e.key === "ArrowRight") && open && activeIdx >= 0) {
        e.preventDefault();
        applySuggestion(currentMatches[activeIdx]);
        return;
      }
      if (e.key === "Escape") {
        hideSuggest();
        return;
      }
      if (e.key === "Enter") {
        if (open && activeIdx >= 0 && currentMatches[activeIdx]) {
          const parsed = parseCdInput(jump.value, cwd);
          // If partial doesn't fully match selected, complete then navigate on second enter;
          // if exact or ends with /, navigate now.
          const chosen = currentMatches[activeIdx];
          if (parsed.partial && chosen.toLowerCase() !== parsed.partial.toLowerCase()) {
            e.preventDefault();
            applySuggestion(chosen);
            return;
          }
        }
        e.preventDefault();
        hideSuggest();
        navigateCd(jump.value, cwd);
      }
    };
  }

  // Keep ?server= in sync with the active API client target
  (function syncServerParam() {
    try {
      // Strip .html from the address bar when present
      if (/\.html$/i.test(location.pathname)) {
        let pretty = location.pathname.replace(/\.html$/i, "");
        if (/\/index$/i.test(pretty)) pretty = pretty.replace(/\/index$/i, "/") || "/";
        if (!pretty) pretty = "/";
        history.replaceState(null, "", pretty + location.search + location.hash);
      }
      const q = new URLSearchParams(location.search).get("server");
      if (q) FSApi.setActiveServerId(q);
      else {
        const sid = FSApi.getActiveServerId() || (FSApi.loadServers()[0] || {}).id;
        if (sid) {
          FSApi.setActiveServerId(sid);
          const url = new URL(location.href);
          if (!url.searchParams.get("server")) {
            url.searchParams.set("server", sid);
            history.replaceState(null, "", url.pathname.replace(/\.html$/i, "") + url.search + url.hash);
          }
        }
      }
    } catch (e) {}
  })();

  function hrefWithServer(href, serverId) {
    try {
      const u = new URL(href, "http://local/");
      let page = (u.pathname || "/").replace(/^\//, "") || "index.html";
      const query = {};
      u.searchParams.forEach(function (v, k) { query[k] = v; });
      if (serverId) query.server = serverId;
      if (FSApi.pageUrl) return FSApi.pageUrl(page, query);
      // fallback
      if (page.endsWith(".html")) page = page === "index.html" ? "" : page.slice(0, -5);
      const qs = new URLSearchParams(query).toString();
      return (page || "./") + (qs ? (page ? "?" : "?") + qs : (page ? "" : ""));
    } catch (e) {
      return href;
    }
  }

  function promptApiHtml() {
    const srv = FSApi.getServer();
    const url = srv.url || FSApi.apiBase();
    const label = (srv.label || "").trim();
    const host = FSApi.shortHost(url);
    const custom = label && label !== host;
    return (
      '<span class="api-label">api</span>' +
      '<span class="api-arrow"> → </span>' +
      (custom
        ? '<span class="api-name" title="Server label">' + escapeHtml(label) + "</span>" +
          '<span class="api-arrow"> · </span>'
        : "") +
      '<span class="api-url-wrap">' +
      '<span class="api-url" title="' + escapeHtml(url) + '">' + escapeHtml(url) + "</span>" +
      '<button type="button" class="api-label-btn" data-act="set-label" title="Set a label for this server">' +
      (custom ? "rename" : "label") +
      "</button>" +
      "</span>"
    );
  }

  function bindPromptApiActions() {
    const el = document.getElementById("term-api");
    if (!el || el._fsLabelBound) return;
    el._fsLabelBound = true;
    el.addEventListener("click", function (ev) {
      const btn = ev.target && ev.target.closest ? ev.target.closest("[data-act='set-label']") : null;
      if (!btn) return;
      ev.preventDefault();
      ev.stopPropagation();
      openServerModal(FSApi.getServer(), "label");
    });
  }

  function ensureServerModal() {
    let modal = document.getElementById("server-modal");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "server-modal";
    modal.className = "server-modal";
    modal.hidden = true;
    modal.innerHTML =
      '<div class="server-modal__backdrop" data-close="1"></div>' +
      '<div class="server-modal__card panel" role="dialog" aria-labelledby="server-modal-title">' +
      '<h2 id="server-modal-title">Add backend server</h2>' +
      '<p class="subtitle">Point the API client at another File-Server host.</p>' +
      '<form id="server-form" class="form">' +
      '<label>label <input id="server-label" type="text" placeholder="local / staging" /></label>' +
      '<label>api url <input id="server-url" type="url" placeholder="http://127.0.0.1:5000" required /></label>' +
      '<input type="hidden" id="server-edit-id" />' +
      '<div class="toolbar">' +
      '<button type="submit" class="btn">save</button>' +
      '<button type="button" class="btn btn--ghost" data-close="1">cancel</button>' +
      "</div></form>" +
      '<div id="server-modal-alert" class="alert" hidden></div>' +
      "</div>";
    document.body.appendChild(modal);
    modal.addEventListener("click", function (e) {
      if (e.target && e.target.getAttribute("data-close")) closeServerModal();
    });
    $("#server-form", modal).addEventListener("submit", function (ev) {
      ev.preventDefault();
      const alertEl = $("#server-modal-alert", modal);
      const editId = $("#server-edit-id", modal).value;
      const url = $("#server-url", modal).value.trim();
      const label = $("#server-label", modal).value.trim();
      try {
        let server;
        if (editId) {
          server = FSApi.updateServer(editId, url, label);
          if (server.id === FSApi.getActiveServerId()) {
            updatePromptApi();
            renderServerTabs();
          }
          closeServerModal();
        } else {
          server = FSApi.addServer(url, label);
          closeServerModal();
          FSApi.switchServer(server.id, { soft: true });
          updatePromptApi();
          renderServerTabs();
        }
      } catch (err) {
        showAlert(alertEl, err.message, "danger");
      }
    });
    return modal;
  }

  function openServerModal(edit, focusField) {
    const modal = ensureServerModal();
    const title = $("#server-modal-title", modal);
    const alertEl = $("#server-modal-alert", modal);
    showAlert(alertEl, "", "");
    if (edit) {
      title.textContent = "Edit backend server";
      $("#server-edit-id", modal).value = edit.id;
      $("#server-label", modal).value = edit.label || "";
      $("#server-url", modal).value = edit.url || "";
    } else {
      title.textContent = "Add backend server";
      $("#server-edit-id", modal).value = "";
      $("#server-label", modal).value = "";
      $("#server-url", modal).value = "http://";
    }
    modal.hidden = false;
    setTimeout(function () {
      const focusEl =
        focusField === "label" ? $("#server-label", modal) : $("#server-url", modal);
      if (focusEl) {
        focusEl.focus();
        if (focusField === "label" && focusEl.select) focusEl.select();
      }
    }, 0);
  }

  function closeServerModal() {
    const modal = document.getElementById("server-modal");
    if (modal) modal.hidden = true;
  }

  function renderServerTabs() {
    const bar = document.getElementById("server-tabs");
    if (!bar) return;
    const servers = FSApi.loadServers();
    const active = FSApi.getActiveServerId();
    const split = FSApi.getSplit();
    bar.innerHTML =
      servers.map(function (s) {
        const isActive = s.id === active;
        const isSplit = split && split.right === s.id;
        const isOffline = isServerOffline(s.id);
        const state = serverRuntimeState[s.id] || {};
        const tooltip = state.lastError
          ? (s.url + " | last_error: " + state.lastError + " | at: " + (state.lastErrorAt || ""))
          : s.url;
        return (
          '<button type="button" class="server-tab' +
          (isActive ? " is-active" : "") +
          (isSplit ? " is-split" : "") +
          (isOffline ? " is-offline" : "") +
          '" data-server="' + escapeHtml(s.id) + '" title="' + escapeHtml(tooltip) + '">' +
          '<span class="server-tab__dot"></span>' +
          '<span class="server-tab__label">' + escapeHtml(s.label || FSApi.shortHost(s.url)) + "</span>" +
          '<span class="server-tab__url">' + escapeHtml(FSApi.shortHost(s.url)) + (isOffline ? " · offline" : "") + "</span>" +
          "</button>"
        );
      }).join("") +
      '<button type="button" class="server-tab server-tab--add" id="server-tab-add" title="Add backend">+</button>';

    Array.prototype.forEach.call(bar.querySelectorAll(".server-tab[data-server]"), function (btn) {
      btn.onclick = function () {
        const id = btn.getAttribute("data-server");
        if (id === FSApi.getActiveServerId()) return;
        FSApi.switchServer(id, { soft: true });
        updatePromptApi();
        renderServerTabs();
      };
      btn.oncontextmenu = function (e) {
        e.preventDefault();
        const id = btn.getAttribute("data-server");
        const srv = FSApi.getServer(id);
        openTrafficMenu(e.clientX, e.clientY, srv);
      };
    });
    const addBtn = document.getElementById("server-tab-add");
    if (addBtn) addBtn.onclick = function () { openServerModal(null); };
  }

  function closeTrafficMenu() {
    const m = document.getElementById("traffic-menu");
    if (m) m.hidden = true;
  }

  function openTrafficMenu(x, y, forServer) {
    let menu = document.getElementById("traffic-menu");
    if (!menu) {
      menu = document.createElement("div");
      menu.id = "traffic-menu";
      menu.className = "traffic-menu";
      document.body.appendChild(menu);
      document.addEventListener("click", function (ev) {
        if (!menu.contains(ev.target) && !(ev.target.closest && ev.target.closest(".traffic"))) {
          closeTrafficMenu();
        }
      });
    }
    const srv = forServer || FSApi.getServer();
    const servers = FSApi.loadServers();
    const split = FSApi.getSplit();
    menu.innerHTML =
      '<button type="button" data-act="add">Add server…</button>' +
      '<button type="button" data-act="edit">Edit “' + escapeHtml(srv.label) + '”…</button>' +
      (servers.length > 1
        ? '<button type="button" data-act="remove">Remove “' + escapeHtml(srv.label) + '”</button>'
        : "") +
      '<hr />' +
      (split
        ? '<button type="button" data-act="unsplit">Close split view</button>'
        : '<div class="traffic-menu__label">Open beside</div>' +
          servers
            .filter(function (s) { return s.id !== FSApi.getActiveServerId(); })
            .map(function (s) {
              return (
                '<button type="button" data-act="split" data-id="' + escapeHtml(s.id) + '">' +
                escapeHtml(s.label) + " · " + escapeHtml(FSApi.shortHost(s.url)) +
                "</button>"
              );
            })
            .join("") || '<div class="traffic-menu__hint">Add another server to split</div>');
    menu.hidden = false;
    const pad = 8;
    menu.style.left = Math.min(x, window.innerWidth - 240) + "px";
    menu.style.top = Math.min(y + pad, window.innerHeight - 200) + "px";
    Array.prototype.forEach.call(menu.querySelectorAll("[data-act]"), function (btn) {
      btn.onclick = function (e) {
        e.stopPropagation();
        const act = btn.getAttribute("data-act");
        closeTrafficMenu();
        if (act === "add") openServerModal(null);
        else if (act === "edit") openServerModal(srv);
        else if (act === "remove") {
          if (!confirm("Remove server " + srv.url + "?")) return;
          try {
            FSApi.removeServer(srv.id);
            location.href = hrefWithServer("index.html");
          } catch (err) {
            alert(err.message);
          }
        } else if (act === "split") {
          FSApi.setSplit(btn.getAttribute("data-id"));
          applySplitLayout();
          renderServerTabs();
        } else if (act === "unsplit") {
          FSApi.setSplit(null);
          applySplitLayout();
          renderServerTabs();
        }
      };
    });
  }

  function wireTrafficMenu() {
    const traffic = document.querySelector(".traffic");
    if (!traffic || traffic.dataset.wired) return;
    traffic.dataset.wired = "1";
    traffic.setAttribute("role", "button");
    traffic.setAttribute("title", "Servers menu");
    traffic.setAttribute("tabindex", "0");
    traffic.onclick = function (e) {
      e.stopPropagation();
      const rect = traffic.getBoundingClientRect();
      openTrafficMenu(rect.left, rect.bottom, FSApi.getServer());
    };
    traffic.onkeydown = function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        traffic.click();
      }
    };
  }

  function applySidebarWidth() {
    const app = document.getElementById("app-shell");
    if (!app) return;
    const w = FSApi.getSidebarWidth();
    app.style.gridTemplateColumns = w + "px 1fr";
    const handle = document.getElementById("sidebar-resizer");
    if (handle) handle.style.left = Math.max(0, w - 3) + "px";
  }

  function wireSidebarResize() {
    const app = document.getElementById("app-shell");
    if (!app || document.getElementById("sidebar-resizer")) {
      applySidebarWidth();
      return;
    }
    if (window !== window.top) return;
    const handle = document.createElement("div");
    handle.id = "sidebar-resizer";
    handle.className = "sidebar-resizer";
    handle.title = "Drag to resize sidebar";
    app.appendChild(handle);
    applySidebarWidth();
    let startX = 0;
    let startW = 0;
    handle.addEventListener("mousedown", function (e) {
      e.preventDefault();
      startX = e.clientX;
      startW = FSApi.getSidebarWidth();
      document.body.classList.add("is-resizing");
      function onMove(ev) {
        FSApi.setSidebarWidth(startW + (ev.clientX - startX));
        applySidebarWidth();
      }
      function onUp() {
        document.body.classList.remove("is-resizing");
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      }
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }

  function applySplitLayout() {
    // Never nest splits inside the secondary iframe pane
    if (window !== window.top) return;
    const main = document.querySelector(".main");
    if (!main) return;
    let workspace = document.getElementById("workspace");
    const content = document.getElementById("page-content");
    if (!content) return;
    const split = FSApi.getSplit();

    if (!workspace) {
      workspace = document.createElement("div");
      workspace.id = "workspace";
      workspace.className = "workspace";
      content.parentNode.insertBefore(workspace, content);
      workspace.appendChild(content);
    }

    let right = document.getElementById("split-pane");
    let gutter = document.getElementById("split-resizer");

    if (!split || !split.right || split.right === FSApi.getActiveServerId()) {
      if (right) right.remove();
      if (gutter) gutter.remove();
      workspace.classList.remove("workspace--split");
      workspace.style.gridTemplateColumns = "";
      return;
    }

    workspace.classList.add("workspace--split");
    if (!gutter) {
      gutter = document.createElement("div");
      gutter.id = "split-resizer";
      gutter.className = "split-resizer";
      gutter.title = "Drag to resize panes";
      workspace.appendChild(gutter);
      let startX = 0;
      let startPct = 50;
      gutter.addEventListener("mousedown", function (e) {
        e.preventDefault();
        startX = e.clientX;
        const rect = workspace.getBoundingClientRect();
        const leftW = content.getBoundingClientRect().width;
        startPct = (leftW / rect.width) * 100;
        document.body.classList.add("is-resizing");
        function onMove(ev) {
          const rect2 = workspace.getBoundingClientRect();
          const pct = Math.min(80, Math.max(20, startPct + ((ev.clientX - startX) / rect2.width) * 100));
          workspace.style.gridTemplateColumns = "minmax(0," + pct + "%) 6px minmax(0," + (100 - pct) + "%)";
          localStorage.setItem("fs_split_pct", String(pct));
        }
        function onUp() {
          document.body.classList.remove("is-resizing");
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
        }
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      });
    } else if (gutter.parentNode !== workspace) {
      workspace.appendChild(gutter);
    }

    if (!right) {
      right = document.createElement("div");
      right.id = "split-pane";
      right.className = "split-pane";
      workspace.appendChild(right);
    } else if (right.parentNode !== workspace) {
      workspace.appendChild(right);
    }

    // Order: content | gutter | right
    workspace.appendChild(content);
    workspace.appendChild(gutter);
    workspace.appendChild(right);

    const pct = parseFloat(localStorage.getItem("fs_split_pct") || "50");
    workspace.style.gridTemplateColumns =
      "minmax(0," + pct + "%) 6px minmax(0," + (100 - pct) + "%)";

    const rightUrl = hrefWithServer("index.html", split.right);
    if (!right.querySelector("iframe") || right.dataset.server !== split.right) {
      right.dataset.server = split.right;
      right.innerHTML =
        '<div class="split-pane__bar">' +
        '<span>api → ' + escapeHtml(FSApi.getServer(split.right).url) + "</span>" +
        '<button type="button" class="btn btn--ghost btn--small" id="split-close">close</button>' +
        "</div>" +
        '<iframe class="split-frame" title="Secondary server" src="' + escapeHtml(rightUrl) + '"></iframe>';
      const closeBtn = document.getElementById("split-close");
      if (closeBtn) {
        closeBtn.onclick = function () {
          FSApi.setSplit(null);
          applySplitLayout();
          renderServerTabs();
        };
      }
    }
  }

  function updatePromptApi() {
    const el = document.getElementById("term-api");
    if (el) el.innerHTML = promptApiHtml();
    bindPromptApiActions();
  }

  async function injectShell(active) {
    const host = document.getElementById("app-shell");
    if (!host) return null;
    let meta = { allow_registrations: false, allow_delete: false };
    try { meta = await FSApi.meta(); } catch (e) {}
    const creds = FSApi.getCredentials();
    const loggedIn = !!creds;

    const places = [
      { id: "browse", href: hrefWithServer("index.html"), label: "~  (Home)" },
      { id: "about", href: hrefWithServer("about.html"), label: "~/about" },
    ];
    let account = [];
    if (loggedIn) {
      account.push({ id: "account", href: hrefWithServer("account.html"), label: "~/account" });
      account.push({ id: "upload", href: hrefWithServer("upload.html"), label: "~/upload" });
      account.push({ id: "replace", href: hrefWithServer("replace.html"), label: "~/replace" });
      if (meta.allow_delete) account.push({ id: "delete", href: hrefWithServer("delete.html"), label: "~/delete" });
    } else {
      account.push({ id: "login", href: hrefWithServer("login.html"), label: "~/login" });
      if (meta.allow_registrations) account.push({ id: "register", href: hrefWithServer("register.html"), label: "~/register" });
    }

    function items(list) {
      return list.map(function (it) {
        return '<a class="sidebar-item' + (it.id === active ? " is-active" : "") + '" href="' + it.href + '" title="' +
          (it.id === "browse" ? ("Home = result_base_dir_path: " + (meta.result_base_dir_path || "")) : "") +
          '">' + it.label + "</a>";
      }).join("");
    }

    function themeToggleHtml() {
      return (
        '<div class="sidebar-theme">' +
        '<label class="theme-toggle" for="theme-toggle-input">' +
        '<span class="theme-toggle__label">theme</span>' +
        '<input id="theme-toggle-input" class="theme-toggle__input" type="checkbox" ' + (getTheme() === "light" ? "checked" : "") + " />" +
        '<span class="theme-toggle__track"><span class="theme-toggle__thumb"></span></span>' +
        '<span class="theme-toggle__mode">' + (getTheme() === "light" ? "light" : "dark") + "</span>" +
        "</label>" +
        "</div>"
      );
    }

    const apiLine = promptApiHtml();
    const terminalChrome =
      '<div class="terminal-bar">' +
      '<div class="traffic" title="Servers menu"><span class="r"></span><span class="y"></span><span class="g"></span></div>' +
      '<div class="prompt"><span class="api-endpoint" id="term-api">' + apiLine + "</span>" +
      '<span class="prompt-sep">:</span><span class="path" id="term-path"><a class="path-seg" href="' +
      hrefWithServer("index.html") + '">~</a></span>$</div>' +
      '<div class="cd-wrap"><input class="prompt-input" id="term-jump" placeholder="cd  → Home   |   type a dir name…" spellcheck="false" autocomplete="off" />' +
      '<ul class="cd-suggest" id="cd-suggest" hidden></ul></div>' +
      "</div>" +
      '<div class="server-tabs" id="server-tabs"></div>';

    const sidebar = document.getElementById("sidebar");
    const pageAlreadyMounted = document.getElementById("page-content") && document.getElementById("page-body");

    if (sidebar && pageAlreadyMounted) {
      sidebar.innerHTML =
        '<div class="brand"><span class="brand-dot"></span>file-server</div>' +
        themeToggleHtml() +
        '<p class="sidebar-heading">Places</p>' + items(places) +
        '<p class="sidebar-heading">Session</p>' + items(account) +
        (loggedIn ? '<a class="sidebar-item" href="#" id="nav-logout">~/logout</a>' : "") +
        '<div class="sidebar-foot">Home (~) → ' + escapeHtml(meta.result_base_dir_path || "result_base_dir_path") +
        "<br>api → " + escapeHtml(FSApi.apiBase()) + "</div>";

      const main = document.querySelector(".main");
      let termBar = document.querySelector(".terminal-bar");
      if (termBar) {
        const hostEl = document.getElementById("term-user");
        const atFs = termBar.querySelector(".prompt .host");
        // Replace legacy user@fs markup with api endpoint
        const prompt = termBar.querySelector(".prompt");
        if (prompt) {
          let pathEl = document.getElementById("term-path");
          const pathHtml = pathEl ? pathEl.outerHTML : '<span class="path" id="term-path"><a class="path-seg" href="' + hrefWithServer("index.html") + '">~</a></span>';
          prompt.innerHTML =
            '<span class="api-endpoint" id="term-api">' + apiLine + "</span>" +
            '<span class="prompt-sep">:</span>' + pathHtml + "$";
        }
        if (hostEl && atFs) { /* cleaned via innerHTML */ }
        if (!document.getElementById("server-tabs")) {
          const tabs = document.createElement("div");
          tabs.className = "server-tabs";
          tabs.id = "server-tabs";
          termBar.after(tabs);
        }
      } else if (main) {
        main.insertAdjacentHTML("afterbegin", terminalChrome);
      }
    } else {
      host.innerHTML =
        '<aside class="sidebar" id="sidebar">' +
        '<div class="brand"><span class="brand-dot"></span>file-server</div>' +
        themeToggleHtml() +
        '<p class="sidebar-heading">Places</p>' + items(places) +
        '<p class="sidebar-heading">Session</p>' + items(account) +
        (loggedIn ? '<a class="sidebar-item" href="#" id="nav-logout">~/logout</a>' : "") +
        '<div class="sidebar-foot">Home (~) → ' + escapeHtml(meta.result_base_dir_path || "result_base_dir_path") +
        "<br>api → " + escapeHtml(FSApi.apiBase()) + "</div>" +
        "</aside>" +
        '<div class="main">' +
        terminalChrome +
        '<div class="content" id="page-content"></div>' +
        "</div>";
      const page = document.getElementById("page-body");
      const content = document.getElementById("page-content");
      if (page && content && page.parentElement !== content) {
        content.appendChild(page);
        page.hidden = false;
      }
    }

    applyTheme(getTheme());

    updatePromptApi();
    renderServerTabs();
    wireTrafficMenu();
    wireSidebarResize();
    applySplitLayout();

    const logout = document.getElementById("nav-logout");
    if (logout) {
      logout.onclick = function (e) {
        e.preventDefault();
        FSApi.clearCredentials();
        location.href = hrefWithServer("login.html");
      };
    }

    const themeToggle = document.getElementById("theme-toggle-input");
    if (themeToggle && !themeToggle.dataset.wired) {
      themeToggle.dataset.wired = "1";
      themeToggle.onchange = function () {
        const next = themeToggle.checked ? "light" : "dark";
        applyTheme(next);
        const mode = document.querySelector(".theme-toggle__mode");
        if (mode) mode.textContent = next;
      };
    }

    const jump = document.getElementById("term-jump");
    if (jump) {
      const rootHint = meta.result_base_dir_path || "result_base_dir_path";
      jump.placeholder = "cd  → Home   |   type a dir name…   (~ = Home)";
      jump.title = "~ means Home (" + rootHint + ")";
      const cwd = pathFromQuery();
      wireCdAutocomplete(jump, cwd);
      setTimeout(function () { jump.focus(); }, 0);
    }
    return {
      meta: meta,
      setPath: function (path) {
        renderClickablePath(
          document.getElementById("term-path"),
          path,
          meta.result_base_dir_path || "result_base_dir_path"
        );
      },
      focusPrompt: function () {
        const j = document.getElementById("term-jump");
        if (j) j.focus();
      },
    };
  }

  function openPreview(relPath, name) {
    let modal = document.getElementById("preview-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "preview-modal";
      modal.className = "preview-modal";
      modal.hidden = true;
      modal.innerHTML =
        '<div class="preview-modal__backdrop" data-close="1"></div>' +
        '<div class="preview-modal__card panel" role="dialog" aria-modal="true">' +
        '<div class="preview-modal__bar">' +
        '<span id="preview-title" class="preview-modal__title"></span>' +
        '<div class="toolbar" style="margin:0">' +
        '<button type="button" class="btn btn--ghost btn--small" id="preview-open">open</button>' +
        '<button type="button" class="btn btn--ghost btn--small" data-close="1">close</button>' +
        "</div></div>" +
        '<div class="preview-modal__body" id="preview-body"></div>' +
        "</div>";
      document.body.appendChild(modal);
      modal.addEventListener("click", function (e) {
        if (e.target && e.target.getAttribute("data-close")) {
          modal.hidden = true;
          const b = $("#preview-body", modal);
          if (b) b.innerHTML = "";
        }
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && !modal.hidden) {
          modal.hidden = true;
          const b = $("#preview-body", modal);
          if (b) b.innerHTML = "";
        }
      });
    }
    $("#preview-title", modal).textContent = name || relPath;
    const body = $("#preview-body", modal);
    body.innerHTML = '<p class="subtitle">loading preview…</p>';
    modal.hidden = false;

    FSApi.previewBlob(relPath)
      .then(function (blob) {
        const url = URL.createObjectURL(blob);
        const openBtn = $("#preview-open", modal);
        openBtn.onclick = function () { window.open(url, "_blank", "noopener"); };
        const lower = String(name || relPath).toLowerCase();
        if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(lower)) {
          body.innerHTML = '<img class="preview-img" alt="" src="' + url + '" />';
        } else if (/\.(mp4|webm|ogg)$/i.test(lower)) {
          body.innerHTML = '<video class="preview-media" controls src="' + url + '"></video>';
        } else if (/\.(mp3|wav|flac)$/i.test(lower)) {
          body.innerHTML = '<audio class="preview-media" controls src="' + url + '"></audio>';
        } else if (/\.pdf$/i.test(lower)) {
          body.innerHTML = '<iframe class="preview-frame" title="preview" src="' + url + '"></iframe>';
        } else {
          body.innerHTML =
            '<iframe class="preview-frame" title="preview" src="' + url + '"></iframe>' +
            '<p class="subtitle">If this does not render, use <strong>open</strong> or <strong>get</strong>.</p>';
        }
      })
      .catch(function (err) {
        body.innerHTML = '<p class="subtitle">' + escapeHtml(err.message || "Preview failed") + "</p>";
      });
  }

  async function initBrowse() {
    if (!FSApi.requireAuth()) return;
    const shell = await injectShell("browse");
    const path = pathFromQuery();
    if (shell) shell.setPath(path);
    if (shell) shell.focusPrompt();
    const page = document.getElementById("page-body");
    const alertEl = $("#alert", page);
    const tableBody = $("#entry-tbody", page);
    const allowDelete = !!(shell && shell.meta && shell.meta.allow_delete);
    const canWrite = FSApi.isLoggedIn();

    function showBrowseAlert(message, type) {
      const sid = FSApi.getActiveServerId();
      setServerAlertState(sid, message, type);
      showAlert(alertEl, message, type);
    }

    function showBrowseAlertFor(serverId, message, type) {
      setServerAlertState(serverId, message, type);
      if (FSApi.getActiveServerId() === serverId) {
        showAlert(alertEl, message, type);
      }
    }

    function restoreBrowseAlert() {
      const sid = FSApi.getActiveServerId();
      const st = getServerState(sid);
      showAlert(alertEl, st.alertMessage || "", st.alertType || "");
    }

    const toolbar = $(".toolbar", page);
    if (toolbar && canWrite) {
      toolbar.innerHTML =
        '<a class="btn" id="upload-here" href="' +
        hrefWithServer("upload.html" + (path ? "?path=" + encodeURIComponent(path) : "")) +
        '">upload here</a>' +
        '<button type="button" class="btn btn--ghost" id="mkdir-btn" title="Create folder">mkdir</button>';
      const mkdirBtn = $("#mkdir-btn", page);
      if (mkdirBtn) {
        mkdirBtn.onclick = async function () {
          const name = prompt("New folder name:");
          if (!name) return;
          try {
            await FSApi.mkdir(path, name.trim());
            location.reload();
          } catch (err) {
            showBrowseAlert(err.message, "danger");
          }
        };
      }
    } else if (toolbar) {
      toolbar.innerHTML = "";
    }

    function wireRename(btn, fullPath, currentName) {
      if (!btn) return;
      btn.onclick = async function () {
        const next = prompt("Rename to:", currentName);
        if (!next || next === currentName) return;
        try {
          await FSApi.rename(fullPath, next.trim());
          location.reload();
        } catch (err) {
          showBrowseAlert(err.message, "danger");
        }
      };
    }

    function wireDelete(btn, fullPath) {
      if (!btn) return;
      btn.onclick = async function () {
        if (!confirm("Delete " + fullPath + "?")) return;
        try {
          await FSApi.deletePath(fullPath);
          location.reload();
        } catch (err) {
          showBrowseAlert(err.message, "danger");
        }
      };
    }

    function writeActions(full, name, isDir) {
      let actions = "";
      if (!isDir) {
        actions +=
          '<button type="button" class="btn btn--ghost btn--small act-get" title="Download">get</button>';
        actions +=
          '<button type="button" class="btn btn--ghost btn--small act-view" title="Preview">view</button>';
        if (canWrite) {
          actions +=
            '<a class="btn btn--ghost btn--small act-rep" href="' +
            hrefWithServer(
              "replace.html?file=" + encodeURIComponent(name) +
              (path ? "&path=" + encodeURIComponent(path) : "")
            ) +
            '" title="Replace">rep</a>';
        }
      }
      if (canWrite) {
        actions +=
          '<button type="button" class="btn btn--ghost btn--small act-mv" title="Rename">mv</button>';
        if (allowDelete) {
          actions +=
            '<button type="button" class="btn btn--danger btn--small act-dl" title="Delete">dl</button>';
        }
      }
      return actions;
    }

    async function renderEntries(expectedServerId) {
      function isStaleServer() {
        return expectedServerId && FSApi.getActiveServerId() !== expectedServerId;
      }
      if (isStaleServer()) return false;
      tableBody.innerHTML = '<tr><td colspan="4" class="empty">Loading…</td></tr>';
      const data = path ? await FSApi.listPath(path) : await FSApi.listRoot();
      if (isStaleServer()) return false;
      tableBody.innerHTML = "";
      if (!path) {
        const rootEntries = Array.isArray(data.entries) ? data.entries : [];
        if (rootEntries.length) {
          rootEntries.forEach(function (entry) {
            const full = entry.name;
            const tr = document.createElement("tr");
            let nameHtml;
            if (entry.is_dir) {
              nameHtml =
                '<a class="entry-name dir" href="' +
                hrefWithServer("index.html?path=" + encodeURIComponent(full)) +
                '">📁 ' +
                escapeHtml(entry.name) +
                "</a>";
            } else {
              let thumb = "";
              if (entry.thumbnailable) {
                thumb = '<img class="thumb" alt="" data-thumb="' + escapeHtml(full) + '" /> ';
              }
              nameHtml =
                thumb +
                '<a class="entry-name act-download" href="#">' +
                "📄 " +
                escapeHtml(entry.name) +
                "</a>";
            }
            const actions = writeActions(full, entry.name, entry.is_dir);
            tr.innerHTML =
              "<td>" + nameHtml + "</td>" +
              '<td class="entry-meta">' + escapeHtml(entry.mtime || (entry.is_dir ? "dir" : "")) + "</td>" +
              '<td class="entry-comment">' +
              escapeHtml(entry.comment || "") +
              (entry.uploader
                ? '<div class="entry-uploader">by ' + escapeHtml(entry.uploader) + "</div>"
                : "") +
              "</td>" +
              '<td class="entry-actions">' + actions + "</td>";
            const thumbImg = tr.querySelector("img[data-thumb]");
            if (thumbImg) {
              const thumbPath = thumbImg.getAttribute("data-thumb");
              FSApi.thumbnailBlob(thumbPath)
                .then(function (blob) {
                  if (blob) thumbImg.src = URL.createObjectURL(blob);
                })
                .catch(function () {});
            }
            if (!entry.is_dir) {
              function doRootDownload(e) {
                if (e) e.preventDefault();
                FSApi.download("", entry.name).catch(function (err) {
                  showBrowseAlert(err.message, "danger");
                });
              }
              const downloadLink = tr.querySelector(".act-download");
              if (downloadLink) downloadLink.onclick = doRootDownload;
              const getBtn = tr.querySelector(".act-get");
              if (getBtn) getBtn.onclick = doRootDownload;
              const viewBtn = tr.querySelector(".act-view");
              if (viewBtn) {
                viewBtn.onclick = function () {
                  openPreview(full, entry.name);
                };
              }
            }
            wireRename(tr.querySelector(".act-mv"), full, entry.name);
            wireDelete(tr.querySelector(".act-dl"), full);
            tableBody.appendChild(tr);
          });
          return true;
        }

        const products = data.products || [];
        if (!products.length) {
          tableBody.innerHTML =
            '<tr><td colspan="4" class="empty">No folders yet.' +
            (canWrite ? " Use mkdir to create one." : "") +
            "</td></tr>";
          return true;
        }
        products.forEach(function (name) {
          const tr = document.createElement("tr");
          const actions = writeActions(name, name, true);
          tr.innerHTML =
            '<td><a class="entry-name dir" href="' + hrefWithServer("index.html?path=" + encodeURIComponent(name)) + '">📁 ' + escapeHtml(name) + "</a></td>" +
            '<td class="entry-meta">dir</td><td></td>' +
            '<td class="entry-actions">' + actions + "</td>";
          wireRename(tr.querySelector(".act-mv"), name, name);
          wireDelete(tr.querySelector(".act-dl"), name);
          tableBody.appendChild(tr);
        });
        return true;
      }
      const entries = data.entries || [];
      if (!entries.length) {
        tableBody.innerHTML =
          '<tr><td colspan="4" class="empty">This folder is empty.' +
          (canWrite ? " Use mkdir or upload." : "") +
          "</td></tr>";
        return true;
      }
      entries.forEach(function (entry) {
        const full = joinPath(path, entry.name);
        const tr = document.createElement("tr");
        let nameHtml;
        if (entry.is_dir) {
          nameHtml =
            '<a class="entry-name dir" href="' +
            hrefWithServer("index.html?path=" + encodeURIComponent(full)) +
            '">📁 ' +
            escapeHtml(entry.name) +
            "</a>";
        } else {
          let thumb = "";
          if (entry.thumbnailable) {
            thumb = '<img class="thumb" alt="" data-thumb="' + escapeHtml(full) + '" /> ';
          }
          nameHtml =
            thumb +
            '<a class="entry-name act-download" href="#">' +
            "📄 " +
            escapeHtml(entry.name) +
            "</a>";
        }
        const actions = writeActions(full, entry.name, entry.is_dir);
        tr.innerHTML =
          "<td>" + nameHtml + "</td>" +
          '<td class="entry-meta">' + escapeHtml(entry.mtime || (entry.is_dir ? "dir" : "")) + "</td>" +
          '<td class="entry-comment">' +
          escapeHtml(entry.comment || "") +
          (entry.uploader
            ? '<div class="entry-uploader">by ' + escapeHtml(entry.uploader) + "</div>"
            : "") +
          "</td>" +
          '<td class="entry-actions">' + actions + "</td>";
        const thumbImg = tr.querySelector("img[data-thumb]");
        if (thumbImg) {
          const thumbPath = thumbImg.getAttribute("data-thumb");
          FSApi.thumbnailBlob(thumbPath)
            .then(function (blob) {
              if (blob) thumbImg.src = URL.createObjectURL(blob);
            })
            .catch(function () {});
        }
        function doDownload(e) {
          if (e) e.preventDefault();
          FSApi.download(path, entry.name).catch(function (err) {
            showBrowseAlert(err.message, "danger");
          });
        }
        const downloadLink = tr.querySelector(".act-download");
        if (downloadLink) downloadLink.onclick = doDownload;
        const getBtn = tr.querySelector(".act-get");
        if (getBtn) getBtn.onclick = doDownload;
        const viewBtn = tr.querySelector(".act-view");
        if (viewBtn) {
          viewBtn.onclick = function () {
            openPreview(full, entry.name);
          };
        }
        wireRename(tr.querySelector(".act-mv"), full, entry.name);
        wireDelete(tr.querySelector(".act-dl"), full);
        tableBody.appendChild(tr);
      });
      return true;
    }

    async function refreshEntries(source) {
      const serverIdAtStart = FSApi.getActiveServerId();
      const st = getServerState(serverIdAtStart);
      st.consecutiveFailures = st.consecutiveFailures || 0;
      st.pausedUntilMs = st.pausedUntilMs || 0;
      st.pauseNotified = !!st.pauseNotified;
      try {
        const rendered = await renderEntries(serverIdAtStart);
        if (!rendered) return;
        st.consecutiveFailures = 0;
        st.pausedUntilMs = 0;
        st.pauseNotified = false;
        markServerOffline(serverIdAtStart, false);
        clearServerLastError(serverIdAtStart);
        setServerAlertState(serverIdAtStart, "", "");
        if (FSApi.getActiveServerId() === serverIdAtStart) showAlert(alertEl, "", "");
        renderServerTabs();
      } catch (err) {
        if (err.status === 401) {
          FSApi.clearCredentials();
          const nextPath = location.pathname + location.search;
          location.href = hrefWithServer(
            "login.html?reason=expired&next=" + encodeURIComponent(nextPath)
          );
          return;
        }
        st.consecutiveFailures += 1;
        setServerLastError(serverIdAtStart, err && err.message ? err.message : "request failed");
        if (st.consecutiveFailures >= 3) {
          st.pausedUntilMs = Date.now() + 30000;
          markServerOffline(serverIdAtStart, true);
          renderServerTabs();
          if (!st.pauseNotified && FSApi.getActiveServerId() === serverIdAtStart) {
            showBrowseAlertFor(
              serverIdAtStart,
              "Active backend looks offline. Auto-refresh paused for 30s; it will retry automatically.",
              "warning"
            );
            st.pauseNotified = true;
          }
          return;
        }
        if (source !== "poll") showBrowseAlertFor(serverIdAtStart, err.message, "danger");
      }
    }

    restoreBrowseAlert();
    await refreshEntries("initial");

    let refreshTimer = null;
    function startAutoRefresh() {
      if (refreshTimer) clearInterval(refreshTimer);
      refreshTimer = setInterval(function () {
        if (document.hidden) return;
        const sid = FSApi.getActiveServerId();
        const st = getServerState(sid);
        if (st.pausedUntilMs && Date.now() < st.pausedUntilMs) return;
        refreshEntries("poll");
      }, 3000);
    }
    startAutoRefresh();

    window.addEventListener("fs:server-changed", function () {
      const next = new URL(location.href);
      const sid = FSApi.getActiveServerId();
      if (sid) next.searchParams.set("server", sid);
      history.replaceState(null, "", next.pathname.replace(/\.html$/i, "") + next.search + next.hash);
      showAlert(alertEl, "", "");
      refreshEntries("switch");
      if (shell) shell.setPath(pathFromQuery());
    });
  }

  async function initLogin() {
    const form = $("#login-form");
    const alertEl = $("#alert");
    const statusEl = $("#api-status");
    const regLink = $("#register-link");
    const reason = new URLSearchParams(location.search).get("reason");
    if (reason === "expired") {
      showAlert(
        alertEl,
        "Session expired or backend data was reset. Please login again.",
        "warning"
      );
    }
    try {
      const h = await FSApi.health();
      statusEl.textContent = "api online · " + FSApi.apiBase() + " · " + h.status;
      statusEl.className = "status status--ok";
      const meta = await FSApi.meta();
      if (regLink) {
        regLink.hidden = !meta.allow_registrations;
        regLink.href = hrefWithServer("register.html");
      }
    } catch (e) {
      statusEl.textContent = "cannot reach " + FSApi.apiBase() + " — add/edit server via tabs or config.js";
      statusEl.className = "status status--err";
    }
    if (FSApi.isLoggedIn()) { location.href = hrefWithServer("index.html"); return; }
    form.addEventListener("submit", async function (ev) {
      ev.preventDefault();
      const username = $("#username").value.trim();
      const password = $("#password").value;
      const apiKey = ($("#api-key") && $("#api-key").value.trim()) || "";
      try {
        if (apiKey) await FSApi.loginWithApiKey(apiKey);
        else await FSApi.login(username, password);
        const next = new URLSearchParams(location.search).get("next") || hrefWithServer("index.html");
        location.href = next;
      } catch (err) {
        FSApi.clearCredentials();
        showAlert(alertEl, err.message, "danger");
      }
    });
  }

  async function initRegister() {
    const form = $("#register-form");
    const alertEl = $("#alert");
    try {
      const meta = await FSApi.meta();
      if (!meta.allow_registrations) {
        showAlert(alertEl, "Registrations are disabled on this backend.", "warning");
        form.hidden = true;
        return;
      }
    } catch (e) {}
    form.addEventListener("submit", async function (ev) {
      ev.preventDefault();
      try {
        await FSApi.register($("#username").value.trim(), $("#email").value.trim(), $("#password").value);
        showAlert(alertEl, "Account created. You can login now.", "success");
        setTimeout(function () { location.href = hrefWithServer("login.html"); }, 700);
      } catch (err) { showAlert(alertEl, err.message, "danger"); }
    });
  }

  async function initUpload() {
    if (!FSApi.requireAuth()) return;
    const shell = await injectShell("upload");
    const path = pathFromQuery();
    if (shell) shell.setPath(path);
    if (shell) shell.focusPrompt();
    const page = document.getElementById("page-body");
    $("#upload-path", page).value = path;
    $("#upload-form", page).addEventListener("submit", async function (ev) {
      ev.preventDefault();
      const alertEl = $("#alert", page);
      const files = $("#file", page).files;
      const dest = $("#upload-path", page).value.trim().replace(/^\/+|\/+$/g, "");
      if (!files.length) { showAlert(alertEl, "Select at least one file.", "danger"); return; }
      try {
        const result = await FSApi.upload(dest, files, $("#comment", page).value);
        showAlert(alertEl, result.message || "Uploaded", result.ok === false ? "warning" : "success");
        if (result.ok !== false) setTimeout(function () {
          location.href = hrefWithServer("index.html" + (dest ? "?path=" + encodeURIComponent(dest) : ""));
        }, 700);
      } catch (err) { showAlert(alertEl, err.message, "danger"); }
    });
  }

  async function initReplace() {
    if (!FSApi.requireAuth()) return;
    const shell = await injectShell("replace");
    if (shell) { shell.setPath(pathFromQuery()); shell.focusPrompt(); }
    const page = document.getElementById("page-body");
    const params = new URLSearchParams(location.search);
    const prefill = params.get("file") || params.get("file_to_replace") || "";
    if (prefill) $("#file-to-replace", page).value = prefill;
    $("#replace-form", page).addEventListener("submit", async function (ev) {
      ev.preventDefault();
      const alertEl = $("#alert", page);
      const name = $("#file-to-replace", page).value.trim();
      const file = $("#file", page).files[0];
      if (!name || !file) { showAlert(alertEl, "Need existing name and new file.", "danger"); return; }
      try {
        const result = await FSApi.replace(name, file, $("#file-number", page).value.trim() || null, $("#comment", page).value);
        const multi = "Found multiple files, pass the `file_number` with which you want to replace the file from the given list: ";
        if (result && result[multi]) {
          showAlert(alertEl, "Multiple matches:\n" + result[multi].join("\n"), "warning");
          return;
        }
        showAlert(alertEl, result.message || "Replaced", "success");
      } catch (err) { showAlert(alertEl, err.message, "danger"); }
    });
  }

  async function initDelete() {
    if (!FSApi.requireAuth()) return;
    const shell = await injectShell("delete");
    if (shell) { shell.setPath(pathFromQuery()); shell.focusPrompt(); }
    const page = document.getElementById("page-body");
    $("#delete-form", page).addEventListener("submit", async function (ev) {
      ev.preventDefault();
      const alertEl = $("#alert", page);
      const name = $("#file-to-delete", page).value.trim();
      if (!name) { showAlert(alertEl, "Enter a file name.", "danger"); return; }
      try {
        const result = await FSApi.deleteByName(name, $("#file-number", page).value.trim() || null);
        if (result.matches) {
          showAlert(alertEl, "Multiple matches:\n" + result.matches.map(function (m, i) { return (i + 1) + " → " + m; }).join("\n"), "warning");
          return;
        }
        showAlert(alertEl, result.message || "Deleted", "success");
      } catch (err) { showAlert(alertEl, err.message, "danger"); }
    });
  }

  async function initAccount() {
    if (!FSApi.requireAuth()) return;
    const shell = await injectShell("account");
    if (shell) { shell.setPath(pathFromQuery()); shell.focusPrompt(); }
    const page = document.getElementById("page-body");
    const alertEl = $("#alert", page);
    const keysSection = $("#api-keys-section", page);
    try {
      const me = await FSApi.me();
      $("#username", page).value = me.username;
      $("#email", page).value = me.email;
    } catch (err) { showAlert(alertEl, err.message, "danger"); }

    $("#account-form", page).addEventListener("submit", async function (ev) {
      ev.preventDefault();
      try {
        const res = await FSApi.updateAccount($("#username", page).value.trim(), $("#email", page).value.trim());
        if (res.message && res.message.indexOf("revoked") >= 0) {
          FSApi.clearSession();
          showAlert(alertEl, res.message, "success");
          setTimeout(function () { window.location.href = "/login"; }, 900);
          return;
        }
        const s = FSApi.getSession();
        if (s && s.token) FSApi.setSession(s.token, res.username);
        showAlert(alertEl, res.message, "success");
      } catch (err) { showAlert(alertEl, err.message, "danger"); }
    });
    $("#password-form", page).addEventListener("submit", async function (ev) {
      ev.preventDefault();
      try {
        const res = await FSApi.changePassword($("#old-password", page).value, $("#new-password", page).value);
        FSApi.clearSession();
        showAlert(alertEl, res.message, "success");
        $("#old-password", page).value = "";
        $("#new-password", page).value = "";
        setTimeout(function () { window.location.href = "/login"; }, 900);
      } catch (err) { showAlert(alertEl, err.message, "danger"); }
    });

    async function refreshKeys() {
      const tbody = $("#api-key-tbody", page);
      if (!tbody) return;
      try {
        const meta = await FSApi.meta();
        if (keysSection) keysSection.hidden = !meta.enable_api_keys;
        if (!meta.enable_api_keys) return;
        const data = await FSApi.listApiKeys();
        const keys = data.keys || [];
        if (!keys.length) {
          tbody.innerHTML = '<tr><td colspan="5" class="empty">No API keys yet.</td></tr>';
          return;
        }
        tbody.innerHTML = keys.map(function (k) {
          return (
            "<tr>" +
            "<td>" + escapeHtml(k.name) + "</td>" +
            "<td><code>fs_" + escapeHtml(k.prefix) + "_…</code></td>" +
            "<td class=\"entry-meta\">" + escapeHtml(k.created_at || "") + "</td>" +
            "<td class=\"entry-meta\">" + escapeHtml(k.last_used_at || "—") + "</td>" +
            '<td class="entry-actions"><button type="button" class="btn btn--danger btn--small act-revoke" data-id="' +
            k.id +
            '">revoke</button></td>' +
            "</tr>"
          );
        }).join("");
        Array.prototype.forEach.call(tbody.querySelectorAll(".act-revoke"), function (btn) {
          btn.onclick = async function () {
            if (!confirm("Revoke this API key?")) return;
            try {
              await FSApi.revokeApiKey(btn.getAttribute("data-id"));
              refreshKeys();
            } catch (err) {
              showAlert(alertEl, err.message, "danger");
            }
          };
        });
      } catch (err) {
        showAlert(alertEl, err.message, "danger");
      }
    }

    const keyForm = $("#api-key-form", page);
    if (keyForm) {
      keyForm.addEventListener("submit", async function (ev) {
        ev.preventDefault();
        const once = $("#api-key-once", page);
        try {
          const res = await FSApi.createApiKey($("#api-key-name", page).value.trim() || "default");
          if (once) {
            once.hidden = false;
            once.textContent = "Copy now (shown once):\n" + res.api_key;
          }
          showAlert(alertEl, res.message, "success");
          refreshKeys();
        } catch (err) {
          showAlert(alertEl, err.message, "danger");
        }
      });
    }
    refreshKeys();
  }

  async function initAbout() {
    const shell = await injectShell("about");
    if (shell) { shell.setPath(pathFromQuery()); shell.focusPrompt(); }
    const page = document.getElementById("page-body");
    const body = $("#about-body", page);
    try {
      const data = await FSApi.about();
      const md = data.markdown || "No README found.";
      if (window.FSMarkdown && FSMarkdown.toHtml) {
        body.innerHTML = FSMarkdown.toHtml(md);
      } else {
        body.textContent = md;
      }
      renderMermaid(body);
    } catch (err) {
      body.textContent = err.message;
    }
  }

  function renderMermaid(root) {
    const nodes = root.querySelectorAll(".mermaid");
    if (!nodes.length) return;

    function run() {
      try {
        window.mermaid.initialize({
          startOnLoad: false,
          theme: getTheme() === "light" ? "default" : "dark",
          securityLevel: "loose",
          flowchart: { curve: "basis", htmlLabels: true },
        });
        window.mermaid.run({ nodes: nodes });
      } catch (e) {
        Array.prototype.forEach.call(nodes, function (n) {
          n.classList.add("mermaid-error");
        });
      }
    }

    if (window.mermaid) {
      run();
      return;
    }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js";
    s.onload = run;
    s.onerror = function () {
      Array.prototype.forEach.call(nodes, function (n) {
        n.outerHTML =
          '<pre class="md-code"><code>' + escapeHtml(n.textContent) + "</code></pre>" +
          '<p class="subtitle">Mermaid CDN unavailable — showing source.</p>';
      });
    };
    document.head.appendChild(s);
  }

  const page = document.body && document.body.dataset.page;
  if (window !== window.top) document.body.classList.add("is-split-frame");
  if (page === "browse") initBrowse();
  if (page === "login") initLogin();
  if (page === "register") initRegister();
  if (page === "upload") initUpload();
  if (page === "replace") initReplace();
  if (page === "delete") initDelete();
  if (page === "account") initAccount();
  if (page === "about") initAbout();
})();
