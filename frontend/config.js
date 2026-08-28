/* Plugin knob: point this at any File-Server backend host.
   Runtime override (highest priority): FS_API_URL / FS_API_LABEL on the FE process.
   When the UI is served over HTTPS, only https:// API URLs work (mixed content blocks http://). */
window.FILE_SERVER = {
  apiBaseUrl: "http://127.0.0.1:5000",
  // Optional: preload multiple backends so tabs show for everyone by default.
  // You can use strings or { label, url } objects.
  // FS_API_URL is prepended ahead of this list when set.
  apiServers: [
    { label: "local", url: "http://127.0.0.1:5000" },
    // { label: "staging", url: "https://api.example.com" },
  ],
};
