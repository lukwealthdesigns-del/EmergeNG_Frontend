// Client-side validation. Helpful, immediate feedback only — the backend remains the authority.
// Every validator returns an i18n KEY (string) when invalid, or null when valid.

const EMAIL = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;

export const required = (v) => (String(v ?? "").trim() ? null : "val.required");
export const email = (v) => (!v ? "val.required" : v.length > 254 || !EMAIL.test(v.trim()) ? "val.email" : null);
export const optionalEmail = (v) => (!v ? null : email(v));

/** Normalise Nigerian numbers to E.164 where possible. Accepts 0803…, 803…, +234803…, 234803… */
export function normalizePhone(raw) {
  if (!raw) return null;
  let d = String(raw).replace(/[\s\-().]/g, "");
  if (d.startsWith("00")) d = "+" + d.slice(2);
  if (d.startsWith("+")) { return /^\+\d{8,15}$/.test(d) ? d : null; }
  if (/^234\d{10}$/.test(d)) return "+" + d;
  if (/^0\d{10}$/.test(d)) return "+234" + d.slice(1);
  if (/^[789]\d{9}$/.test(d)) return "+234" + d;
  return null;
}
export const phone = (v) => (!v ? "val.required" : normalizePhone(v) ? null : "val.phone");
export const optionalPhone = (v) => (!v ? null : phone(v));

/** Mirrors the backend policy (app/core/security.py): 10-128 chars, not a common password, no leading/trailing space.
 *  The backend also rejects passwords containing the email name or with too few distinct characters. */
export function passwordIssues(p) {
  const out = [];
  const s = p || "";
  if (s.length < 10) out.push("val.pw_len");
  if (s.length > 128) out.push("val.pw_max");
  if (s && s.trim() !== s) out.push("val.pw_space");
  if (s && new Set(s).size < 5) out.push("val.pw_simple");
  return out;
}
export const password = (v) => (!v ? "val.required" : passwordIssues(v)[0] || null);
export const passwordStrength = (p) => {
  let s = 0; if ((p || "").length >= 10) s++; if ((p || "").length >= 14) s++; if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++; if (/\d/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++;
  return Math.min(4, s);
};
export const otp = (v) => (/^\d{6}$/.test(String(v || "")) ? null : "val.otp");

// NDAPS postcode, e.g. EK-01-A03-FK-01 (state 2 letters, LGA 2 digits, district 3 alnum, area 2 letters, unit 2 digits)
const PC = /^([A-Z]{2})[\s-]?(\d{2})[\s-]?([A-Z0-9]{3})[\s-]?([A-Z]{2})[\s-]?(\d{2})$/;
export function normalizePostcode(v) {
  const m = PC.exec(String(v || "").trim().toUpperCase());
  return m ? m.slice(1).join("-") : null;
}
export const postcode = (v) => (!v ? "val.required" : normalizePostcode(v) ? null : "val.postcode");
export const optionalPostcode = (v) => (!v ? null : postcode(v));

export const lat = (n) => (typeof n === "number" && n >= -90 && n <= 90 ? null : "val.coord");
export const lon = (n) => (typeof n === "number" && n >= -180 && n <= 180 ? null : "val.coord");
export const validCoords = (la, lo) => Number.isFinite(la) && Number.isFinite(lo) && !lat(la) && !lon(lo);
export const maxLen = (n) => (v) => (String(v || "").length > n ? "val.too_long" : null);
export const minLen = (n) => (v) => (String(v || "").trim().length < n ? "val.too_short" : null);

/** Run a map of field → [validators] over values. Returns { field: errorKey }. */
export function validate(values, rules) {
  const errs = {};
  for (const [f, vs] of Object.entries(rules)) {
    for (const v of [].concat(vs)) { const e = v(values[f], values); if (e) { errs[f] = e; break; } }
  }
  return errs;
}

// File validation for evidence uploads (backend accepts jpeg/png/webp; it re-checks signatures server-side)
export const MAX_UPLOAD_BYTES = 5_000_000;
export const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/webp"];
export function validateImage(file) {
  if (!file) return "val.required";
  if (!ALLOWED_IMAGE.includes(file.type)) return "val.file_type";
  if (file.size > MAX_UPLOAD_BYTES) return "val.file_size";
  return null;
}
