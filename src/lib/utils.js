// Small, dependency-free helpers shared across the app.

export const cn = (...a) => a.flat(Infinity).filter(Boolean).join(" ");

/** localStorage that never throws (private mode, blocked storage). Only for tiny NON-sensitive UI prefs. */
export const ls = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};
export const ss = {
  get(k, d = null) { try { const v = sessionStorage.getItem(k); return v === null ? d : v; } catch { return d; } },
  set(k, v) { try { sessionStorage.setItem(k, v); return true; } catch { return false; } },
  del(k) { try { sessionStorage.removeItem(k); } catch { /* ignore */ } },
};

export const uuid = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const b = new Uint8Array(16); globalThis.crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
export const debounce = (fn, ms = 300) => { let t; const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; d.cancel = () => clearTimeout(t); return d; };

/** Plain-text only: React escapes text nodes; this strips control characters before display/storage. */
export const cleanText = (s, max = 2000) =>
  String(s ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/‮/g, "").trim().slice(0, max);

export const safeJson = (s, d = null) => { try { return JSON.parse(s); } catch { return d; } };

export const groupBy = (arr, fn) => arr.reduce((m, x) => { (m[fn(x)] ||= []).push(x); return m; }, {});

export const initials = (n) => String(n || "?").trim().split(/\s+/).slice(0, 2).map((x) => x[0]?.toUpperCase()).join("") || "?";
