// Centralised API client. All privileged third-party access (NIPOST, Mapbox server, Google, Brevo, Cloudinary) goes through the backend.
import { ApiError, fromResponse } from "./errors";
import { currentLang } from "../i18n";
import { uuid, sleep } from "../lib/utils";

const RAW_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
export const API_BASE = RAW_BASE.replace(/\/+$/, "");
export const API_ORIGIN = (() => { try { return new URL(API_BASE).origin; } catch { return ""; } })();

// ---- token state (access token lives in memory only) ----
const tokens = { access: null, refresh: null, expiresAt: 0 };
const listeners = new Set();
let observer = { onSuccess() {}, onNetworkFailure() {}, onServerUnavailable() {} };
let refreshImpl = null; // set by AuthProvider (persists new refresh token according to role policy)
let refreshing = null;

export const setObserver = (o) => { observer = { ...observer, ...o }; };
export const setRefreshHandler = (fn) => { refreshImpl = fn; };
export const onAuthEvent = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = (type) => listeners.forEach((fn) => { try { fn(type); } catch { /* ignore */ } });

export const getAccessToken = () => tokens.access;
export const getRefreshToken = () => tokens.refresh;
export function setTokens(t) {
  tokens.access = t?.access_token ?? t?.access ?? null;
  tokens.refresh = t?.refresh_token ?? t?.refresh ?? tokens.refresh;
  tokens.expiresAt = t?.expires_in ? Date.now() + t.expires_in * 1000 : 0;
}
export function clearTokens() { tokens.access = null; tokens.refresh = null; tokens.expiresAt = 0; }
export const accessExpiresInMs = () => (tokens.access ? tokens.expiresAt - Date.now() : -1);

function buildUrl(path, params) {
  const u = path.startsWith("http") ? path : API_BASE + (path.startsWith("/") ? path : "/" + path);
  if (!params) return u;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) { if (v.length) q.set(k, v.join(",")); } else q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `${u}${u.includes("?") ? "&" : "?"}${s}` : u;
}

async function doRefresh() {
  if (!refreshImpl || !tokens.refresh) return false;
  if (!refreshing) refreshing = refreshImpl(tokens.refresh).then((ok) => ok, () => false).finally(() => { refreshing = null; });
  return refreshing;
}

/**
 * request(path, opts)
 *  opts: method, body (object → JSON | Blob/ArrayBuffer → raw), params, headers, signal, timeout (ms, default 15000),
 *        auth: "auto" (default; sends bearer if present) | "none", idempotencyKey, retries (GET only, default 1), raw (return Response)
 */
export async function request(path, opts = {}) {
  const { method = "GET", body, params, headers = {}, signal, timeout = 15000, auth = "auto", idempotencyKey, retries, raw = false, _retried = false } = opts;
  const isRawBody = body instanceof Blob || body instanceof ArrayBuffer;
  const h = { Accept: "application/json", "Accept-Language": currentLang(), "X-Request-ID": uuid(), ...headers };
  if (body !== undefined && !isRawBody && !h["Content-Type"]) h["Content-Type"] = "application/json";
  if (auth !== "none" && tokens.access && !h.Authorization) h.Authorization = `Bearer ${tokens.access}`;
  if (idempotencyKey) h["Idempotency-Key"] = idempotencyKey;

  const maxAttempts = method === "GET" ? 1 + (retries ?? 1) : 1; // never auto-retry writes: use idempotency keys instead
  let lastErr;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const ctl = new AbortController();
    const onAbort = () => ctl.abort(signal.reason);
    if (signal) { if (signal.aborted) throw signal.reason ?? new DOMException("Aborted", "AbortError"); signal.addEventListener("abort", onAbort, { once: true }); }
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; ctl.abort(); }, timeout);
    try {
      const res = await fetch(buildUrl(path, params), { method, headers: h, body: body === undefined ? undefined : isRawBody ? body : JSON.stringify(body), signal: ctl.signal, credentials: "omit", cache: "no-store" });
      clearTimeout(timer);
      if (!res.ok) {
        const err = await fromResponse(res);
        if (err.status === 401 && err.code !== "REAUTH_REQUIRED" && auth !== "none" && !_retried && tokens.refresh && !String(path).includes("/auth/")) {
          if (await doRefresh()) return request(path, { ...opts, _retried: true, headers: { ...headers, Authorization: undefined } });
          emit("session-expired");
        }
        if (err.kind === "SERVER_UNAVAILABLE") observer.onServerUnavailable?.(err); else observer.onSuccess?.(); // server answered → reachable
        if (err.retryable && attempt < maxAttempts - 1) { lastErr = err; await sleep(400 * 2 ** attempt + Math.random() * 200); continue; }
        throw err;
      }
      observer.onSuccess?.();
      if (raw) return res;
      if (res.status === 204) return null;
      const ct = res.headers.get("content-type") || "";
      return ct.includes("json") ? await res.json() : await res.text();
    } catch (e) {
      clearTimeout(timer);
      if (e instanceof ApiError) throw e;
      if (signal?.aborted && !timedOut) throw e; // caller cancelled — not an error to report
      const err = new ApiError({ status: 0, code: timedOut ? "TIMEOUT" : "NETWORK_ERROR", kind: timedOut ? "TIMEOUT" : "NETWORK_ERROR", message: timedOut ? "timeout" : "network" });
      observer.onNetworkFailure?.(err);
      lastErr = err;
      if (attempt < maxAttempts - 1) { await sleep(500 * 2 ** attempt + Math.random() * 250); continue; }
      throw err;
    } finally { if (signal) signal.removeEventListener("abort", onAbort); }
  }
  throw lastErr;
}

export const api = {
  get: (p, o) => request(p, { ...o, method: "GET" }),
  post: (p, body, o) => request(p, { ...o, method: "POST", body: body ?? {} }),
  put: (p, body, o) => request(p, { ...o, method: "PUT", body: body ?? {} }),
  patch: (p, body, o) => request(p, { ...o, method: "PATCH", body: body ?? {} }),
  del: (p, o) => request(p, { ...o, method: "DELETE" }),
};

/** Upload raw bytes with progress (XHR gives upload progress; fetch does not). */
export function uploadRaw(path, blob, { headers = {}, onProgress, signal } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", buildUrl(path));
    xhr.setRequestHeader("Content-Type", blob.type || "application/octet-stream");
    xhr.setRequestHeader("Accept-Language", currentLang());
    if (tokens.access && !headers.Authorization) xhr.setRequestHeader("Authorization", `Bearer ${tokens.access}`);
    for (const [k, v] of Object.entries(headers)) if (v) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.timeout = 60000;
    xhr.onload = () => {
      let data = null; try { data = JSON.parse(xhr.responseText); } catch { /* empty */ }
      if (xhr.status >= 200 && xhr.status < 300) return resolve(data);
      const e = data?.error || {};
      reject(new ApiError({ status: xhr.status, code: e.code || "HTTP_ERROR", message: e.message, requestId: e.request_id, kind: xhr.status === 413 ? "VALIDATION_ERROR" : xhr.status >= 500 ? "SERVER_ERROR" : "VALIDATION_ERROR" }));
    };
    xhr.onerror = () => reject(new ApiError({ code: "NETWORK_ERROR", kind: "NETWORK_ERROR" }));
    xhr.ontimeout = () => reject(new ApiError({ code: "TIMEOUT", kind: "TIMEOUT" }));
    if (signal) signal.addEventListener("abort", () => { xhr.abort(); reject(new DOMException("Aborted", "AbortError")); }, { once: true });
    xhr.send(blob);
  });
}
