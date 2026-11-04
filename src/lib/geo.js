// Geo helpers. Raw GPS is never replaced by derived values; we only classify and display it.

export const toRad = (d) => (d * Math.PI) / 180;
export function haversineM(a, b, c, d) {
  const R = 6371008.8, dLat = toRad(c - a), dLon = toRad(d - b);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a)) * Math.cos(toRad(c)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** Matches the backend's accuracy classes: excellent ≤10 m, good ≤30, moderate ≤100, otherwise poor. */
export function accuracyClass(m) {
  if (m == null || !Number.isFinite(m)) return "unknown";
  if (m <= 10) return "excellent";
  if (m <= 30) return "good";
  if (m <= 100) return "moderate";
  return "poor";
}

export const fmtCoord = (n, d = 5) => (Number.isFinite(n) ? n.toFixed(d) : "—");
export const fmtCoords = (la, lo) => `${fmtCoord(la, 5)}, ${fmtCoord(lo, 5)}`;
export const fmtMeters = (m) => (m == null ? "—" : m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`);

/** Freshness of a captured-at timestamp: recent ≤ 5 min, aging ≤ 30 min, else stale. */
export function freshness(iso, now = Date.now()) {
  if (!iso) return "unknown";
  const age = (now - new Date(iso).getTime()) / 60000;
  if (!Number.isFinite(age)) return "unknown";
  return age <= 5 ? "recent" : age <= 30 ? "aging" : "stale";
}

export const mapsDirectionsUrl = (lat, lon) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lon}`)}`;
export const geoUri = (lat, lon) => `geo:${lat},${lon}`;

/** Nigeria bounds for initial map framing. */
export const NIGERIA_CENTER = [8.6753, 9.082];
export const NIGERIA_BOUNDS = [[2.6, 4.2], [14.7, 13.9]];

/** Promise wrapper for the browser Geolocation API. Works offline (GPS does not need internet). */
export function getPosition({ timeout = 15000, highAccuracy = true, maximumAge = 0 } = {}) {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(Object.assign(new Error("unsupported"), { code: "UNSUPPORTED" }));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({
        latitude: p.coords.latitude, longitude: p.coords.longitude, accuracyMeters: p.coords.accuracy,
        capturedAt: new Date(p.timestamp || Date.now()).toISOString(), source: "GPS",
      }),
      (e) => reject(Object.assign(new Error(e.message), { code: e.code === 1 ? "DENIED" : e.code === 2 ? "UNAVAILABLE" : e.code === 3 ? "TIMEOUT" : "UNKNOWN" })),
      { enableHighAccuracy: highAccuracy, timeout, maximumAge },
    );
  });
}
