// Service worker: app shell + hashed assets only. It NEVER caches /api responses (sensitive data stays out of generic caches).
export function registerSW() {
  if (!("serviceWorker" in navigator) || import.meta.env?.DEV) return;
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      reg.addEventListener("updatefound", () => {
        const w = reg.installing;
        w?.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) window.dispatchEvent(new CustomEvent("emergeng:update-ready", { detail: reg })); });
      });
      navigator.serviceWorker.addEventListener("message", (e) => { if (e.data?.type === "SYNC_OUTBOX") import("../offline/syncManager").then((m) => m.syncNow({ force: true })); });
    } catch { /* offline-first still works without SW (IndexedDB queue) */ }
  });
}
export function applyUpdate(reg) { reg?.waiting?.postMessage({ type: "SKIP_WAITING" }); setTimeout(() => location.reload(), 300); }
