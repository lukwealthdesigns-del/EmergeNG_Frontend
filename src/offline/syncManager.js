// Sync manager: sends queued reports through POST /offline/sync. Single-flight across tabs (Web Locks), retry with backoff,
// honest state transitions (see protocol.js). Never deletes a pending report on failure.
import { api, getAccessToken } from "../api/client";
import { config } from "./syncConfig";
import { listOutbox, saveReport, subscribeOutbox } from "./outbox";
import { buildCreateOperation, applyResult, applyTransportFailure, dueRecords, isPending } from "./protocol";
import { setSyncing, setSyncError, setPending, probe, getNet, NET } from "./connectivity";
import { safeSyncToken } from "./syncToken";
import { uploadPendingMedia } from "./media";

let running = false; let timer = null; const listeners = new Set();
export const onSynced = (f) => { listeners.add(f); return () => listeners.delete(f); };

async function withLock(fn) {
  if (typeof navigator !== "undefined" && navigator.locks?.request) {
    return navigator.locks.request("emergeng-sync", { ifAvailable: true }, async (lock) => (lock ? fn() : { skipped: "other_tab" }));
  }
  // Fallback: localStorage lease (best effort)
  const k = "emergeng.synclock"; const now = Date.now();
  try { const v = Number(localStorage.getItem(k) || 0); if (now - v < 30000) return { skipped: "other_tab" }; localStorage.setItem(k, String(now)); } catch { /* ignore */ }
  try { return await fn(); } finally { try { localStorage.removeItem(k); } catch { /* ignore */ } }
}

export async function refreshPending() {
  try { const all = await listOutbox(); setPending(all.filter(isPending).length); } catch { /* IDB unavailable */ }
}
subscribeOutbox(refreshPending);

export async function syncNow({ force = false } = {}) {
  if (running) return { skipped: "running" };
  if (getNet().net === NET.OFFLINE) return { skipped: "offline" };
  return withLock(async () => {
    running = true;
    try {
      let all; try { all = await listOutbox(); } catch { return { skipped: "idb" }; }
      const batch = dueRecords(all, new Date(), { force }).slice(0, config.maxBatch);
      if (!batch.length) { schedule(all); return { sent: 0 }; }
      setSyncing(true); setSyncError(false);
      const now = new Date();
      for (const r of batch) await saveReport({ ...r, state: "SYNCING", syncStartedAt: now.toISOString(), events: [...r.events, { type: "started", at: now.toISOString() }] });
      const ops = batch.map((r) => buildCreateOperation(r, { deviceMeta: { platform: "web", app_version: config.appVersion } }));
      let res;
      try {
        const headers = {}; const st = config.sendSyncToken ? await safeSyncToken() : null; if (st) headers["X-Sync-Token"] = st;
        const attempt = (auth) => api.post("/offline/sync", { operations: ops }, { headers, auth, timeout: 30000 });
        try { res = await attempt(getAccessToken() ? "auto" : "none"); }
        catch (e) { if (e.status === 401 && e.code === "TOKEN_INVALID_OR_EXPIRED") res = await attempt("none"); else throw e; } // anonymous fallback: report will NOT be linked to the account
      } catch (e) {
        for (const r of batch) await saveReport(applyTransportFailure(await freshOf(r), e));
        setSyncError(true); await probe(); await refreshPending(); schedule(await listOutbox()); return { error: e };
      }
      const byId = new Map((res.results || []).map((x) => [x.client_incident_id, x]));
      let ok = 0;
      for (const r of batch) {
        const cur = await freshOf(r); const result = byId.get(r.clientIncidentId);
        const next = result ? applyResult(cur, result) : applyTransportFailure(cur, { code: "NO_RESULT", retryable: true });
        if (next.state === "SYNCED") ok++;
        await saveReport(next);
      }
      setSyncError(ok < batch.length && (await listOutbox()).some((r) => r.state === "SYNC_FAILED"));
      await refreshPending(); listeners.forEach((f) => f({ synced: ok }));
      for (const r of (await listOutbox()).filter((x) => x.state === "SYNCED" && (x.draft?.attachments || []).length)) uploadPendingMedia(r).catch(() => {}); // fire-and-forget: never blocks or fails the report
      schedule(await listOutbox());
      return { sent: batch.length, synced: ok };
    } finally { running = false; setSyncing(false); }
  });
}
async function freshOf(r) { const all = await listOutbox(); return all.find((x) => x.clientIncidentId === r.clientIncidentId) || r; }

function schedule(all) {
  clearTimeout(timer);
  const times = all.filter((r) => r.state === "SYNC_FAILED" && !r.permanent && r.nextTryAt).map((r) => new Date(r.nextTryAt).getTime());
  if (!times.length) return;
  const wait = Math.max(2000, Math.min(...times) - Date.now());
  timer = setTimeout(() => syncNow(), wait);
}

/** Ask the service worker for Background Sync where supported (best effort; foreground sync remains primary). */
export async function registerBackgroundSync() {
  try { const reg = await navigator.serviceWorker?.ready; await reg?.sync?.register("emergeng-outbox"); } catch { /* unsupported */ }
}
