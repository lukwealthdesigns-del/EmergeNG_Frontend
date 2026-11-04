// Pure map geometry helpers (no mapbox import) so they are unit-testable.
import { PRIORITY_COLOR } from "./enums.js";

const R = 6371008.8;
/** GeoJSON polygon approximating a circle of `radiusM` metres around lat/lon. */
export function circlePolygon(lat, lon, radiusM, steps = 48) {
  const ring = [];
  const d = radiusM / R; const la = (lat * Math.PI) / 180; const lo = (lon * Math.PI) / 180;
  for (let i = 0; i <= steps; i++) {
    const b = (i / steps) * 2 * Math.PI;
    const la2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(b));
    const lo2 = lo + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2));
    ring.push([(lo2 * 180) / Math.PI, (la2 * 180) / Math.PI]);
  }
  return { type: "Polygon", coordinates: [ring] };
}

/** Which points are drawn as an exact marker vs an uncertainty circle. Only high-precision GPS is "exact". */
export function precisionOf(p) {
  const tier = p.precision || p.precision_class || null;
  if (tier === "gps_high" || tier === "high") return "high";
  if (tier) return tier === "medium" || tier === "gps_low" ? "medium" : "low";
  const a = Number(p.accuracy_m);
  if (p.source === "gps" && Number.isFinite(a) && a <= 50) return "high";
  if ((p.source === "gps" || p.source === "network") && Number.isFinite(a) && a <= 500) return "medium";
  return "low";
}
/** Radius in metres to draw for uncertain positions. */
export function uncertaintyRadius(p) {
  const a = Number(p.accuracy_m); const t = precisionOf(p);
  if (t === "high") return Math.max(a || 0, 0);
  if (Number.isFinite(a) && a > 0) return Math.min(a, 5000);
  return t === "medium" ? 250 : 1000; // postcode-level / manual: area, not point
}

export const HEAT_WEIGHT = { critical: 1, high: 0.75, medium: 0.45, low: 0.25, unassessed: 0.6 };
export const heatWeight = (priority) => HEAT_WEIGHT[priority] ?? 0.5;

const validPt = (p) => Number.isFinite(Number(p.latitude ?? p.lat)) && Number.isFinite(Number(p.longitude ?? p.lon ?? p.lng));
export const ll = (p) => [Number(p.longitude ?? p.lon ?? p.lng), Number(p.latitude ?? p.lat)];

export function pointsToFeatures(points) {
  return { type: "FeatureCollection", features: (points || []).filter(validPt).map((p) => ({
    type: "Feature", id: p.id, geometry: { type: "Point", coordinates: ll(p) },
    properties: { id: String(p.id ?? ""), priority: p.priority || "unassessed", status: p.status || "", weight: heatWeight(p.priority), color: PRIORITY_COLOR[p.priority] || PRIORITY_COLOR.unassessed, precision: precisionOf(p), label: p.label || p.reference || "" },
  })) };
}
export function uncertaintyFeatures(points) {
  return { type: "FeatureCollection", features: (points || []).filter(validPt).filter((p) => precisionOf(p) !== "high" || Number(p.accuracy_m) > 25).map((p) => {
    const [lon, lat] = ll(p);
    return { type: "Feature", geometry: circlePolygon(lat, lon, uncertaintyRadius(p)), properties: { id: String(p.id ?? ""), precision: precisionOf(p), color: PRIORITY_COLOR[p.priority] || "#3858ce" } };
  }) };
}
/** Bounds [[minLon,minLat],[maxLon,maxLat]] or null. */
export function boundsOf(points) {
  const v = (points || []).filter(validPt).map(ll);
  if (!v.length) return null;
  return [[Math.min(...v.map((c) => c[0])), Math.min(...v.map((c) => c[1]))], [Math.max(...v.map((c) => c[0])), Math.max(...v.map((c) => c[1]))]];
}
/** Only the most urgent open points get an animated "live signal" marker (keeps the map fast and readable). */
export function signalPoints(points, max = 40) {
  const rank = { critical: 0, unassessed: 1, high: 2, medium: 3, low: 4 };
  return (points || []).filter(validPt).filter((p) => !["resolved", "closed", "cancelled"].includes(p.status)).sort((a, b) => (rank[a.priority] ?? 5) - (rank[b.priority] ?? 5)).slice(0, max);
}
