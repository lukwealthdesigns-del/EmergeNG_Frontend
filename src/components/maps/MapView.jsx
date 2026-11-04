import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { MapPinOff, ExternalLink } from "lucide-react";
import { cn } from "../../lib/utils";
import { useI18n } from "../../i18n";
import { useTheme } from "../../theme/ThemeProvider";
import { NIGERIA_CENTER, NIGERIA_BOUNDS, fmtCoords, mapsDirectionsUrl } from "../../lib/geo";
import { pointsToFeatures, uncertaintyFeatures, boundsOf, signalPoints, ll } from "../../lib/mapgeo";
import { PRIORITY_COLOR } from "../../lib/enums";
import ErrorBoundary from "../common/ErrorBoundary";

const TOKEN = import.meta.env?.VITE_MAPBOX_PUBLIC_TOKEN || "";
const usable = TOKEN.startsWith("pk.");
let mapboxPromise = null;
const loadMapbox = () => (mapboxPromise ||= Promise.all([import("mapbox-gl"), import("mapbox-gl/dist/mapbox-gl.css")]).then(([m]) => { const mb = m.default || m; mb.accessToken = TOKEN; return mb; }));

/** Shown instead of the map when there is no public token, WebGL, or the map failed. The location itself is never lost. */
export function MapFallback({ lat, lon, accuracyM, className, note }) {
  const { t } = useI18n();
  const has = Number.isFinite(lat) && Number.isFinite(lon);
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 rounded-3xl border border-line bg-surface-2 p-6 text-center", className)}>
      <MapPinOff className="h-6 w-6 text-ink-3" aria-hidden />
      <p className="text-sm font-medium text-ink">{note || t("loc.fallback.title")}</p>
      {has && (<>
        <p className="font-mono text-sm text-ink">{fmtCoords(lat, lon)}</p>
        {accuracyM != null && <p className="text-xs text-ink-3">±{Math.round(accuracyM)} m</p>}
        <a className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-info underline" href={mapsDirectionsUrl(lat, lon)} target="_blank" rel="noreferrer noopener"><ExternalLink className="h-3.5 w-3.5" />{t("act.open")}</a>
      </>)}
    </div>
  );
}

/**
 * Props
 *  points: [{id, latitude, longitude, priority, status, accuracy_m, source, precision, label}]
 *  heat: draw a heat map layer from points · cluster: cluster markers · signals: animated "live signal" markers for urgent points
 *  pin: {latitude, longitude, accuracy_m} single position (citizen) · draggable + onPinMove(lat, lon)
 *  tactical: dark radar styling with grid + sweep (operations) · selectedId · onSelect(id) · fit: fit to points
 */
const MapInner = forwardRef(function MapInner({ points = [], heat = false, cluster = false, signals = false, pin = null, draggable = false, onPinMove, tactical = false, selectedId = null, onSelect, fit = true, interactive = true, className, onError, onLoaded, zoom = 14 }, ref) {
  const el = useRef(null); const map = useRef(null); const mb = useRef(null); const markers = useRef([]); const pinMarker = useRef(null); const ready = useRef(false);
  const { resolved } = useTheme(); const dark = tactical || resolved === "dark";
  const [rev, bump] = useState(0); // `rev` changes when the map/style becomes ready, so the data effects below re-run
  const cb = useRef({ onSelect, onPinMove }); cb.current = { onSelect, onPinMove };
  const style = dark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/streets-v12";

  useImperativeHandle(ref, () => ({
    flyTo: (lat, lon, z = 15) => map.current?.flyTo({ center: [lon, lat], zoom: z, essential: true }),
    fit: (pts) => { const b = boundsOf(pts || points); if (b && map.current) map.current.fitBounds(b, { padding: 60, maxZoom: 15, duration: 600 }); },
    setPin: (lat, lon) => pinMarker.current?.setLngLat([lon, lat]),
  }));

  // create the map once
  useEffect(() => {
    let dead = false;
    loadMapbox().then((m) => {
      if (dead || !el.current) return; mb.current = m;
      if (!m.supported?.({ failIfMajorPerformanceCaveat: false }) && m.supported) { onError?.(new Error("webgl")); return; }
      const start = pin ? [pin.longitude, pin.latitude] : NIGERIA_CENTER;
      const mp = new m.Map({ container: el.current, style, center: start, zoom: pin ? zoom : 5.2, attributionControl: true, interactive, cooperativeGestures: false, maxBounds: [[0, 2], [17, 16]] });
      map.current = mp;
      if (interactive) { mp.addControl(new m.NavigationControl({ showCompass: false }), "top-right"); mp.addControl(new m.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false }), "top-right"); }
      mp.on("error", (e) => {
        const st = e?.error?.status;
        if (st === 401 || st === 403) onError?.(e.error); // bad / URL-restricted / expired token
        else if (!mp.isStyleLoaded() && !ready.current && (st === 404 || /style|Failed to fetch|NetworkError/i.test(String(e?.error?.message || "")))) onError?.(e.error); // style never loaded: show the fallback instead of a blank box
      });
      mp.on("load", () => { ready.current = true; bump((n) => n + 1); onLoaded?.(mp); });
      mp.on("style.load", () => { ready.current = true; bump((n) => n + 1); });
    }).catch((e) => onError?.(e));
    return () => { dead = true; markers.current.forEach((x) => x.remove()); pinMarker.current?.remove(); map.current?.remove(); map.current = null; ready.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // theme change → restyle
  useEffect(() => { if (map.current && ready.current) { ready.current = false; map.current.setStyle(style); } }, [style]);

  // data layers
  const fc = useMemo(() => pointsToFeatures(points), [points]);
  const unc = useMemo(() => uncertaintyFeatures(points), [points]);
  const sig = useMemo(() => (signals ? signalPoints(points, 40) : []), [signals, points]);

  useEffect(() => {
    const mp = map.current; const m = mb.current; if (!mp || !m || !ready.current) return;
    const once = (k, fn) => { mp.__h ||= {}; if (!mp.__h[k]) { mp.__h[k] = true; fn(); } };
    const setSrc = (id, data, opts) => { const s = mp.getSource(id); if (s) s.setData(data); else mp.addSource(id, { type: "geojson", data, ...opts }); };
    try {
      setSrc("uncertainty", unc);
      if (!mp.getLayer("uncertainty-fill")) {
        mp.addLayer({ id: "uncertainty-fill", type: "fill", source: "uncertainty", paint: { "fill-color": ["get", "color"], "fill-opacity": 0.12 } });
        mp.addLayer({ id: "uncertainty-line", type: "line", source: "uncertainty", paint: { "line-color": ["get", "color"], "line-width": 1.2, "line-dasharray": [2, 2], "line-opacity": 0.8 } });
      }
      setSrc("pts", fc, cluster ? { cluster: true, clusterMaxZoom: 13, clusterRadius: 48 } : {});
      if (heat && !mp.getLayer("heat")) {
        mp.addLayer({ id: "heat", type: "heatmap", source: "pts", maxzoom: 15, paint: {
          "heatmap-weight": ["get", "weight"], "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 12, 3],
          "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(0,0,0,0)", 0.15, "rgba(56,88,206,.55)", 0.35, "rgba(52,211,153,.7)", 0.55, "rgba(250,204,21,.8)", 0.8, "rgba(249,115,22,.9)", 1, "rgba(220,38,38,.95)"],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 8, 9, 28, 14, 46], "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 11, 0.95, 15, 0.25] } });
      }
      if (cluster && !mp.getLayer("clusters")) {
        mp.addLayer({ id: "clusters", type: "circle", source: "pts", filter: ["has", "point_count"], paint: { "circle-color": "#3858ce", "circle-opacity": 0.85, "circle-stroke-color": "#fff", "circle-stroke-width": 2, "circle-radius": ["step", ["get", "point_count"], 16, 10, 22, 50, 28] } });
        mp.addLayer({ id: "cluster-count", type: "symbol", source: "pts", filter: ["has", "point_count"], layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 12 }, paint: { "text-color": "#fff" } });
        once("clusters", () => mp.on("click", "clusters", (e) => { const f = mp.queryRenderedFeatures(e.point, { layers: ["clusters"] })[0]; mp.getSource("pts").getClusterExpansionZoom(f.properties.cluster_id, (err, z) => { if (!err) mp.easeTo({ center: f.geometry.coordinates, zoom: z + 0.5 }); }); }));
      }
      if (!mp.getLayer("pt-circles")) {
        mp.addLayer({ id: "pt-circles", type: "circle", source: "pts", filter: ["!", ["has", "point_count"]], paint: { "circle-color": ["get", "color"], "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 3, 12, 7, 16, 9], "circle-stroke-color": "#fff", "circle-stroke-width": 1.5, "circle-opacity": ["interpolate", ["linear"], ["zoom"], 8, heat ? 0 : 0.95, 11, 0.95] } });
        once("pt-click", () => mp.on("click", "pt-circles", (e) => { const id = e.features?.[0]?.properties?.id; if (id) cb.current.onSelect?.(id); }));
        once("pt-mouseenter", () => mp.on("mouseenter", "pt-circles", () => { mp.getCanvas().style.cursor = "pointer"; }));
        once("pt-mouseleave", () => mp.on("mouseleave", "pt-circles", () => { mp.getCanvas().style.cursor = ""; }));
      }
    } catch { /* style not ready yet: next effect run will add layers */ }
    if (fit && !pin && points.length) { const b = boundsOf(points); if (b && !map.current.__fitted) { map.current.__fitted = true; mp.fitBounds(b, { padding: 70, maxZoom: 13, duration: 0 }); } }
  }, [fc, unc, heat, cluster, fit, pin, points, rev]); // eslint-disable-line react-hooks/exhaustive-deps

  // animated live-signal markers
  useEffect(() => {
    const mp = map.current; const m = mb.current; if (!mp || !m) return;
    markers.current.forEach((x) => x.remove()); markers.current = [];
    for (const p of sig) {
      const div = document.createElement("div"); div.className = "sig" + (String(p.id) === String(selectedId) ? " sel" : "");
      div.style.setProperty("--sig", PRIORITY_COLOR[p.priority] || PRIORITY_COLOR.unassessed);
      div.innerHTML = "<i></i><i></i><b></b>"; div.setAttribute("role", "button"); div.setAttribute("aria-label", p.label || "incident");
      div.addEventListener("click", (e) => { e.stopPropagation(); cb.current.onSelect?.(String(p.id)); });
      markers.current.push(new m.Marker({ element: div }).setLngLat(ll(p)).addTo(mp));
    }
  }, [sig, selectedId, rev]);

  // single (citizen) pin with accuracy circle
  useEffect(() => {
    const mp = map.current; const m = mb.current; if (!mp || !m || !ready.current) return;
    if (!pin) { pinMarker.current?.remove(); pinMarker.current = null; return; }
    const pos = [pin.longitude, pin.latitude];
    if (!pinMarker.current) {
      const div = document.createElement("div"); div.className = "sig"; div.style.setProperty("--sig", "#2563eb"); div.innerHTML = "<i></i><i></i><b></b>";
      pinMarker.current = new m.Marker({ element: div, draggable }).setLngLat(pos).addTo(mp);
      pinMarker.current.on("dragend", () => { const c = pinMarker.current.getLngLat(); cb.current.onPinMove?.(c.lat, c.lng); });
      mp.jumpTo({ center: pos, zoom });
    } else { pinMarker.current.setLngLat(pos); }
    const acc = { type: "FeatureCollection", features: pin.accuracy_m ? [{ type: "Feature", geometry: circleOf(pin), properties: {} }] : [] };
    try {
      const s = mp.getSource("pin-acc"); if (s) s.setData(acc); else { mp.addSource("pin-acc", { type: "geojson", data: acc }); mp.addLayer({ id: "pin-acc-fill", type: "fill", source: "pin-acc", paint: { "fill-color": "#2563eb", "fill-opacity": 0.14 } }); mp.addLayer({ id: "pin-acc-line", type: "line", source: "pin-acc", paint: { "line-color": "#2563eb", "line-width": 1.5, "line-dasharray": [2, 2] } }); }
    } catch { /* ignore */ }
  }, [pin?.latitude, pin?.longitude, pin?.accuracy_m, draggable, rev]);

  useEffect(() => { // focus selected
    if (selectedId == null || !map.current) return; const p = points.find((x) => String(x.id) === String(selectedId)); if (p) map.current.easeTo({ center: ll(p), zoom: Math.max(map.current.getZoom(), 12.5), duration: 500 });
  }, [selectedId]); // eslint-disable-line

  return (
    <div className={cn("relative overflow-hidden rounded-3xl border border-line bg-surface-2", className)}>
      <div ref={el} style={{ position: "absolute", inset: 0 }} role="application" aria-label="Map" />
      {tactical && (<><div className="tac-grid" /><div className="tac-sweep" /><div className="tac-vignette" /></>)}
    </div>
  );
});
function circleOf(pin) { // lazy import avoided: tiny inline circle for the accuracy ring
  const steps = 48, R = 6371008.8, d = (pin.accuracy_m || 0) / R, la = pin.latitude * Math.PI / 180, lo = pin.longitude * Math.PI / 180, ring = [];
  for (let i = 0; i <= steps; i++) { const b = (i / steps) * 2 * Math.PI; const la2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(b)); const lo2 = lo + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2)); ring.push([lo2 * 180 / Math.PI, la2 * 180 / Math.PI]); }
  return { type: "Polygon", coordinates: [ring] };
}

/** Public component: handles missing token / WebGL failure / runtime errors with a graceful fallback. */
const MapView = forwardRef(function MapView(props, ref) {
  const [failed, setFailed] = useState(usable ? null : "token_missing"); // null = working, else the reason
  const { t } = useI18n();
  const note = failed === "token_missing" ? t("sys.map_token") : failed === "token_rejected" ? t("loc.map.token_rejected") : t("loc.map.unavailable");
  const fb = <MapFallback lat={props.pin?.latitude} lon={props.pin?.longitude} accuracyM={props.pin?.accuracy_m} className={props.className} note={note} />;
  if (failed) return fb;
  const fail = (e) => {
    const st = e?.status; const why = st === 401 || st === 403 ? "token_rejected" : "error";
    if (import.meta.env?.DEV) console.warn("[map] disabled:", why, e?.message || e); // developer hint only; never logged in production
    setFailed(why);
  };
  return <ErrorBoundary fallback={fb}><MapInner ref={ref} {...props} onError={fail} /></ErrorBoundary>;
});
export default MapView;
export { usable as mapAvailable };
