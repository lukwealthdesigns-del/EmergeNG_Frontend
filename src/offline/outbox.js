// Local outbox of emergency reports. Written BEFORE any network attempt so a lost connection can never lose an emergency.
import { idb } from "./idb";
import { uuid } from "../lib/utils";

const subs = new Set();
const notify = () => subs.forEach((f) => { try { f(); } catch { /* ignore */ } });
export const subscribeOutbox = (f) => { subs.add(f); return () => subs.delete(f); };
// Cross-tab change notification
const bc = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("emergeng-outbox") : null;
if (bc) bc.onmessage = notify;
const changed = () => { notify(); try { bc?.postMessage(1); } catch { /* ignore */ } };

export async function createLocalReport({ draft, ownerId, createdOffline }) {
  const now = new Date().toISOString();
  const rec = { clientIncidentId: uuid(), ownerId: ownerId || "guest", state: "LOCAL_PENDING_SYNC", draft, createdAt: now, createdOffline: !!createdOffline,
    attempts: 0, nextTryAt: null, permanent: false, events: [{ type: "created", at: now }, ...(draft.capturedAt ? [{ type: "location", at: draft.capturedAt }] : [])] };
  await idb.put("outbox", rec);
  changed();
  return rec;
}
export const listOutbox = async (ownerId) => (await idb.all("outbox")).filter((r) => !ownerId || r.ownerId === ownerId || r.ownerId === "guest").sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
export const getReport = (id) => idb.get("outbox", id);
export async function saveReport(rec) { await idb.put("outbox", rec); changed(); }
export async function removeReport(id) { await idb.del("outbox", id); changed(); }
/** Adopt guest reports created before sign-in into the signed-in user's scope (still synced anonymously unless a valid token is sent). */
export async function clearOwner(ownerId) {
  const all = await idb.all("outbox");
  for (const r of all) if (r.ownerId === ownerId && r.state === "SYNCED") await idb.del("outbox", r.clientIncidentId);
  changed();
}
