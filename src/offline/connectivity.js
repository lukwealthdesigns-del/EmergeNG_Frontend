// Connectivity state machine. navigator.onLine alone is not trusted: reachability of the backend is probed (/health/live).
import { API_ORIGIN } from "../api/client";

import { NET, deriveNet } from "./netState.js";
export { NET };
let state = { net: typeof navigator !== "undefined" && navigator.onLine === false ? NET.OFFLINE : NET.CONNECTING, lastOnlineAt: null, lastCheckAt: null, pending: 0, syncError: false };
const subs = new Set();
export const getNet = () => state;
export const subscribeNet = (f) => { subs.add(f); return () => subs.delete(f); };
function set(patch) { const next = { ...state, ...patch }; if (JSON.stringify(next) === JSON.stringify(state)) return; state = next; subs.forEach((f) => f()); }

const facts = { reachable: null, syncing: false, syncError: false };
function recompute() {
  const browserOnline = typeof navigator === "undefined" ? true : navigator.onLine !== false;
  const net = deriveNet({ browserOnline, ...facts });
  set({ net, syncError: facts.syncError, ...(net === NET.ONLINE || net === NET.SYNCING ? { lastOnlineAt: new Date().toISOString() } : {}) });
}
export const setSyncing = (v) => { facts.syncing = v; recompute(); };
export const setSyncError = (v) => { facts.syncError = v; recompute(); };
export const setPending = (n) => set({ pending: n });
export function reportReachable(v) { facts.reachable = v; recompute(); }   // called by the API client observer on any response/failure

let probing = null;
export async function probe() {
  if (typeof navigator !== "undefined" && navigator.onLine === false) { facts.reachable = false; recompute(); return false; }
  if (probing) return probing;
  probing = (async () => {
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 6000);
    try {
      const r = await fetch(`${API_ORIGIN}/health/live`, { cache: "no-store", signal: ctl.signal, credentials: "omit" });
      facts.reachable = r.ok;
    } catch { facts.reachable = false; } finally { clearTimeout(to); }
    set({ lastCheckAt: new Date().toISOString() }); recompute(); probing = null; return facts.reachable;
  })();
  return probing;
}

let started = false;
export function startConnectivity(onRestored) {
  if (started || typeof window === "undefined") return;
  started = true;
  window.addEventListener("online", async () => { recompute(); const ok = await probe(); if (ok) onRestored?.(); });
  window.addEventListener("offline", () => { facts.reachable = false; recompute(); });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") probe().then((ok) => ok && onRestored?.()); });
  setInterval(() => { if (document.visibilityState === "visible") probe().then((ok) => ok && state.pending > 0 && onRestored?.()); }, 45000);
  probe().then((ok) => ok && onRestored?.());
}
