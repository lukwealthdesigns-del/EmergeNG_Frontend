export const NET = { OFFLINE: "OFFLINE", CONNECTING: "CONNECTING", ONLINE: "ONLINE", SERVER_UNAVAILABLE: "SERVER_UNAVAILABLE", SYNCING: "SYNCING", SYNC_ERROR: "SYNC_ERROR" };

/** Derived net state given facts — pure, for tests. */
export function deriveNet({ browserOnline, reachable, syncing, syncError }) {
  if (!browserOnline) return NET.OFFLINE;
  if (reachable === null) return NET.CONNECTING;
  if (!reachable) return NET.SERVER_UNAVAILABLE;
  if (syncing) return NET.SYNCING;
  if (syncError) return NET.SYNC_ERROR;
  return NET.ONLINE;
}
