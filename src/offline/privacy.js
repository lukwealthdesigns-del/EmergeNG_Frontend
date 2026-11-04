// Sensitive-data cleanup on sign-out. Unsent emergency reports are deliberately KEPT: deleting them silently could lose an emergency.
import { idb, idbAvailable } from "./idb";
export async function wipePrivateLocalData(ownerId) {
  if (!idbAvailable()) return;
  try { await idb.clear("card"); await idb.clear("cache"); } catch { /* ignore */ }
  try { await idb.del("meta", "syncToken"); await idb.del("meta", "lastLoc"); } catch { /* ignore */ }
  try {
    const all = await idb.all("outbox");
    for (const r of all) if (r.state === "SYNCED" && (!ownerId || r.ownerId === ownerId)) await idb.del("outbox", r.clientIncidentId);
  } catch { /* ignore */ }
  try { if ("caches" in window) for (const k of await caches.keys()) if (k.startsWith("emergeng-private")) await caches.delete(k); } catch { /* ignore */ }
}
