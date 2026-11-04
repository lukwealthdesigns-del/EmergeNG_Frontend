// Optional device-bound sync token (POST /offline/sync-session). Sent only when VITE_SEND_SYNC_TOKEN=true (needs backend CORS allow_headers to include X-Sync-Token).
import { idb } from "./idb";
import { api } from "../api/client";
export async function safeSyncToken() {
  try {
    const m = await idb.get("meta", "syncToken");
    if (m && m.expiresAt > Date.now() + 86400000) return m.token;
    const r = await api.post("/offline/sync-session", {}, { auth: "none", timeout: 8000 });
    await idb.put("meta", { key: "syncToken", token: r.sync_token, expiresAt: Date.now() + (r.expires_in || 0) * 1000 });
    return r.sync_token;
  } catch { return null; }
}
