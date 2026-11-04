import { useSyncExternalStore, useEffect, useState } from "react";
import { getNet, subscribeNet } from "../offline/connectivity";
import { listOutbox, subscribeOutbox } from "../offline/outbox";

export const useNet = () => useSyncExternalStore(subscribeNet, getNet, getNet);

/** Live list of local reports (this device). */
export function useOutbox(ownerId) {
  const [items, setItems] = useState([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    const load = () => listOutbox(ownerId).then((l) => { if (live) { setItems(l); setReady(true); } }).catch(() => { if (live) setReady(true); });
    load(); const un = subscribeOutbox(load);
    return () => { live = false; un(); };
  }, [ownerId]);
  return { items, ready };
}

/** Re-render every `ms` so relative times stay fresh. */
export function useTick(ms = 30000) {
  const [, set] = useState(0);
  useEffect(() => { const t = setInterval(() => set((n) => n + 1), ms); return () => clearInterval(t); }, [ms]);
}
