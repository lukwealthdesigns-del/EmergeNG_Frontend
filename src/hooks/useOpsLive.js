import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, API_BASE } from "../api/client";

/** Live updates for operations: SSE via a 60 s single-use ticket; on repeated failure fall back to polling /operations/updates.
 *  state: connecting | live | reconnecting | polling | offline. Always exposes lastEventAt so the UI can show data freshness. */
export function useOpsLive({ onEvent, enabled = true } = {}) {
  const qc = useQueryClient(); const [state, setState] = useState("connecting"); const [lastEventAt, setLast] = useState(null);
  const cb = useRef(onEvent); cb.current = onEvent;
  useEffect(() => {
    if (!enabled) return; let es = null, timer = null, poll = null, dead = false, fails = 0, since = new Date().toISOString(), inval = null;
    const refresh = () => { clearTimeout(inval); inval = setTimeout(() => qc.invalidateQueries({ queryKey: ["ops"] }), 600); }; // coalesce bursts
    const startPolling = () => { if (poll) return; setState("polling"); poll = setInterval(async () => { try { const r = await api.get("/operations/updates", { params: { since } }); since = r.server_time; setLast(new Date().toISOString()); if (r.items?.length || r.truncated) { r.items.forEach((i) => cb.current?.(i)); refresh(); } } catch { /* keep trying */ } }, 15000); };
    const connect = async () => {
      if (dead) return; if (typeof navigator !== "undefined" && navigator.onLine === false) { setState("offline"); timer = setTimeout(connect, 5000); return; }
      try {
        setState((s) => (s === "live" ? s : fails ? "reconnecting" : "connecting"));
        const { ticket } = await api.post("/operations/stream-ticket", {});
        es = new EventSource(`${API_BASE}/operations/stream?ticket=${encodeURIComponent(ticket)}`);
        es.addEventListener("ready", () => { fails = 0; clearInterval(poll); poll = null; setState("live"); setLast(new Date().toISOString()); });
        es.addEventListener("incident", (e) => { setLast(new Date().toISOString()); try { cb.current?.(JSON.parse(e.data)); } catch { /* ignore */ } refresh(); });
        es.addEventListener("resync", () => { refresh(); });
        es.addEventListener("revoked", () => { es.close(); setState("offline"); });
        es.addEventListener("end", () => { es.close(); if (!dead) timer = setTimeout(connect, 1000); }); // server recycles streams every 15 min so permissions are re-checked
        es.onerror = () => { es.close(); fails++; if (fails >= 3) startPolling(); else setState("reconnecting"); if (!dead) timer = setTimeout(connect, Math.min(30000, 2000 * 2 ** fails)); };
      } catch { fails++; if (fails >= 2) startPolling(); if (!dead) timer = setTimeout(connect, Math.min(30000, 2000 * 2 ** fails)); }
    };
    connect();
    const on = () => connect(); window.addEventListener("online", on);
    return () => { dead = true; es?.close(); clearTimeout(timer); clearTimeout(inval); clearInterval(poll); window.removeEventListener("online", on); };
  }, [enabled, qc]);
  return { state, lastEventAt };
}
