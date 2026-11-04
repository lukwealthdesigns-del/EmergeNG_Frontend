// Minimal promise wrapper over IndexedDB. Stores: outbox (offline reports), cache (non-sensitive query cache), card (offline emergency card), meta.
const DB = "emergeng", VERSION = 2;
const STORES = { outbox: "clientIncidentId", cache: "key", card: "ownerId", meta: "key", media: "id" };
let dbp = null;

export const idbAvailable = () => typeof indexedDB !== "undefined";

function open() {
  if (!idbAvailable()) return Promise.reject(new Error("IDB_UNAVAILABLE"));
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const [name, keyPath] of Object.entries(STORES)) if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath });
    };
    req.onsuccess = () => { const db = req.result; db.onversionchange = () => { db.close(); dbp = null; }; resolve(db); };
    req.onerror = () => { dbp = null; reject(req.error); };
    req.onblocked = () => reject(new Error("IDB_BLOCKED"));
  });
  return dbp;
}

async function tx(store, mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode); const s = t.objectStore(store);
    let out; try { out = fn(s); } catch (e) { reject(e); return; }
    t.oncomplete = () => resolve(out && "result" in out ? out.result : out);
    t.onerror = () => reject(t.error); t.onabort = () => reject(t.error || new Error("IDB_ABORT"));
  });
}

export const idb = {
  get: (store, key) => tx(store, "readonly", (s) => s.get(key)),
  all: (store) => tx(store, "readonly", (s) => s.getAll()),
  put: (store, value) => tx(store, "readwrite", (s) => { s.put(value); }),
  del: (store, key) => tx(store, "readwrite", (s) => { s.delete(key); }),
  clear: (store) => tx(store, "readwrite", (s) => { s.clear(); }),
};
export async function estimateStorage() {
  try { const e = await navigator.storage?.estimate?.(); return e ? { usage: e.usage, quota: e.quota, ratio: e.quota ? e.usage / e.quota : 0 } : null; } catch { return null; }
}
export async function requestPersistence() { try { return await navigator.storage?.persist?.(); } catch { return false; } }
