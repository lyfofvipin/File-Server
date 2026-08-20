/* Plugin knob: point this at any File-Server backend host.
   Runtime override (highest priority): FS_API_URL / FS_API_LABEL on the FE process. */
window.FILE_SERVER = {
  apiBaseUrl: "http://127.0.0.1:5000",
  // Optional: preload multiple backends so tabs show for everyone by default.
  // You can use strings or { label, url } objects.
  // FS_API_URL is prepended ahead of this list when set.
  apiServers: [
    { label: "local", url: "http://127.0.0.1:5000" },
    // { label: "staging", url: "http://10.10.10.20:5000" },
    // "http://192.168.1.55:5000",
  ],
};
