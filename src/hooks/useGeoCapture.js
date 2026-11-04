import { useCallback, useEffect, useRef, useState } from "react";

/** GPS capture with progressive refinement. States: idle | requesting | ok | denied | unavailable | timeout | unsupported.
 *  Works offline (GPS needs no internet). The raw reading is never replaced; manual correction is stored separately by callers. */
export function useGeoCapture({ refineMs = 8000 } = {}) {
  const [state, setState] = useState("idle"); const [fix, setFix] = useState(null); const watch = useRef(null); const timer = useRef(null);
  const stop = useCallback(() => { if (watch.current != null) navigator.geolocation?.clearWatch(watch.current); watch.current = null; clearTimeout(timer.current); }, []);
  useEffect(() => stop, [stop]);
  const toFix = (p) => ({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracyMeters: p.coords.accuracy, capturedAt: new Date(p.timestamp || Date.now()).toISOString(), source: "gps" });
  const capture = useCallback(() => {
    stop();
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) { setState("unsupported"); return; }
    setState("requesting");
    let best = null;
    const fail = (e) => { if (best) return; stop(); setState(e.code === 1 ? "denied" : e.code === 3 ? "timeout" : "unavailable"); };
    watch.current = navigator.geolocation.watchPosition((p) => {
      const f = toFix(p);
      if (!best || f.accuracyMeters < best.accuracyMeters) { best = f; setFix(f); setState("ok"); }
      if (f.accuracyMeters <= 10) stop();
    }, fail, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
    timer.current = setTimeout(() => { if (best) stop(); }, refineMs);
  }, [stop, refineMs]);
  const reset = useCallback(() => { stop(); setFix(null); setState("idle"); }, [stop]);
  return { state, fix, capture, reset, setFix };
}
