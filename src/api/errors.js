// Centralised API error normalisation + user-facing mapping. Internal details are never shown to users.

export class ApiError extends Error {
  constructor({ status = 0, code = "UNKNOWN", message = "", requestId = null, details = null, kind = "SERVER_ERROR", retryAfter = null }) {
    super(message || code);
    this.name = "ApiError";
    this.status = status; this.code = code; this.requestId = requestId; this.details = details; this.kind = kind; this.retryAfter = retryAfter;
  }
  get isNetwork() { return this.kind === "NETWORK_ERROR" || this.kind === "TIMEOUT"; }
  get isAuth() { return this.status === 401; }
  /** Failures that are worth retrying later (never auth / validation / permission problems). */
  get retryable() { return this.isNetwork || this.kind === "SERVER_UNAVAILABLE" || this.kind === "RATE_LIMIT" || (this.status >= 500 && this.status !== 501); }
}

export function kindFor(status, code) {
  if (status === 0) return "NETWORK_ERROR";
  if (status === 401) return "AUTH_ERROR";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 413) return "VALIDATION_ERROR";
  if (status === 422 || status === 400) return "VALIDATION_ERROR";
  if (status === 429) return "RATE_LIMIT";
  if (status === 502 || status === 503 || status === 504) return "SERVER_UNAVAILABLE";
  if (code === "PROVIDER_UNAVAILABLE") return "SERVER_UNAVAILABLE";
  return "SERVER_ERROR";
}

/** Build an ApiError from a fetch Response (parsing the backend's {error:{code,message,request_id}} envelope). */
export async function fromResponse(res) {
  let body = null;
  try { body = await res.clone().json(); } catch { /* not JSON */ }
  const e = body?.error || {};
  return new ApiError({
    status: res.status, code: e.code || (res.status === 401 ? "UNAUTHENTICATED" : "HTTP_ERROR"), message: e.message || "", details: e.details || null,
    requestId: e.request_id || res.headers.get("x-request-id"), kind: kindFor(res.status, e.code),
    retryAfter: Number(res.headers.get("retry-after")) || null,
  });
}

/** Message for a human, in their language. `t` and `has` come from useI18n(). */
export function friendlyError(err, { t, has }) {
  if (!err) return t("err.generic");
  if (!(err instanceof ApiError)) return t("err.generic");
  const byCode = `err.${err.code}`;
  if (has(byCode)) return t(byCode);
  if (err.kind === "NETWORK_ERROR") return t("err.network");
  if (err.kind === "TIMEOUT") return t("err.timeout");
  if (err.kind === "SERVER_UNAVAILABLE") return t("err.provider");
  if (err.status && has(`err.${err.status}`)) return t(`err.${err.status}`);
  if (err.status >= 500) return t("err.500");
  return t("err.generic");
}

/** Map backend field issues ({field, issue}) to a { field: i18nKey } object for forms. */
export function fieldErrors(err) {
  const out = {};
  if (err instanceof ApiError && Array.isArray(err.details)) {
    for (const d of err.details) if (d?.field) out[d.field.split(".").pop()] = "val.required";
  }
  return out;
}
