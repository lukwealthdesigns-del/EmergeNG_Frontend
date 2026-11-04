// Pure offline-sync protocol logic (no browser APIs) so it can be unit-tested.
// Rule from the backend: a report becomes SYNCED only when the result status is accepted/already_synced AND server_incident_id is present.
import { nextDelayMs, delayWithRetryAfter } from "../lib/backoff.js";

export const STATES = ["LOCAL_DRAFT", "LOCAL_PENDING_SYNC", "SYNCING", "SYNC_FAILED", "SYNCED", "SYNC_CONFLICT", "CANCELLED_LOCAL"];
export const ACTIVE_STATES = ["LOCAL_PENDING_SYNC", "SYNCING", "SYNC_FAILED"];

const LOCATION_SOURCE_OUT = { gps: "GPS", network: "NETWORK", manual: "MANUAL", postcode_derived: "POSTCODE", geocoded: "GEOCODED", saved_location: "SAVED_LOCATION" };

/** Build the CREATE_INCIDENT operation from a local draft. Never includes status/identity fields (server ignores them anyway). */
export function buildCreateOperation(rec, { deviceMeta } = {}) {
  const d = rec.draft;
  const payload = {
    incident_category: d.category,
    description: d.description || undefined,
    latitude: d.latitude, longitude: d.longitude,
    gps_accuracy_meters: Number.isFinite(d.accuracyM) ? Math.round(d.accuracyM) : undefined,
    location_captured_at: d.capturedAt,
    location_source: LOCATION_SOURCE_OUT[d.locationSource] || "GPS",
    address: d.addressText || undefined,
    postcode: d.postcode || undefined,
    reported_severity: d.severity || undefined,
    reporter_name: d.reporterName || undefined,
    callback_phone: d.callbackPhone || undefined,
    callback_email: d.callbackEmail || undefined,
    manually_corrected: !!d.manuallyCorrected || undefined,
    trusted_contact_preferences: d.notifyContactIds?.length || d.shareMedicalFields?.length
      ? { notify_contact_ids: d.notifyContactIds || [], include_medical_fields: d.shareMedicalFields || [] } : undefined,
    attachments: (d.attachments || []).map((a) => ({ client_media_id: a.id, mime: a.mime, bytes: a.bytes })),
    device_metadata: deviceMeta,
    offline_created: !!rec.createdOffline,
  };
  for (const k of Object.keys(payload)) if (payload[k] === undefined) delete payload[k];
  return { client_incident_id: rec.clientIncidentId, operation: "CREATE_INCIDENT", client_created_at: rec.createdAt, payload };
}

export function buildCancelOperation(rec, operationId, reason) {
  return { client_incident_id: rec.clientIncidentId, operation_id: operationId, operation: "CANCEL_INCIDENT", client_created_at: new Date().toISOString(), payload: { reason: reason || undefined } };
}

const ev = (type, at, extra) => ({ type, at, ...extra });

/** Apply one per-operation result to a local record. Returns a NEW record. */
export function applyResult(rec, result, now = new Date(), rand = Math.random) {
  const at = now.toISOString();
  const events = [...(rec.events || [])];
  const base = { ...rec, events, lastResultAt: at };
  const status = result && result.status;
  if ((status === "accepted" || status === "already_synced") && result.server_incident_id) {
    events.push(ev("ok", at));
    return { ...base, state: "SYNCED", serverIncidentId: result.server_incident_id, serverIncidentUuid: result.server_incident_uuid || null,
      trackingToken: result.tracking_token || rec.trackingToken || null, serverStatus: result.incident_status || "submitted",
      serverReceivedAt: result.server_received_at || at, offlineDelaySeconds: result.offline_delay_seconds ?? null, nextTryAt: null, lastError: null, permanent: false, message: result.message || null };
  }
  if (status === "retry") {
    const attempts = (rec.attempts || 0) + 1;
    const delay = delayWithRetryAfter(attempts, result.retry_after_seconds, rand);
    events.push(ev("retry", at, { code: result.error_code }));
    return { ...base, state: "SYNC_FAILED", attempts, nextTryAt: new Date(now.getTime() + delay).toISOString(), lastError: result.error_code || "RETRY", permanent: false };
  }
  if (status === "conflict") { events.push(ev("conflict", at)); return { ...base, state: "SYNC_CONFLICT", nextTryAt: null, lastError: result.error_code || "SYNC_CONFLICT", permanent: true }; }
  // rejected, or a malformed "accepted" without a server id: never mark SYNCED
  events.push(ev("rejected", at, { code: result && result.error_code }));
  return { ...base, state: "SYNC_FAILED", attempts: (rec.attempts || 0) + 1, nextTryAt: null, lastError: (result && result.error_code) || "REJECTED", permanent: true };
}

/** A transport/HTTP-level failure of the whole batch. Auth/validation envelope errors are not retried blindly. */
export function applyTransportFailure(rec, err, now = new Date(), rand = Math.random) {
  const at = now.toISOString();
  const attempts = (rec.attempts || 0) + 1;
  const retryable = !err || err.retryable !== false;
  const events = [...(rec.events || []), ev(retryable ? "retry" : "rejected", at, { code: err && err.code })];
  if (!retryable) return { ...rec, events, state: "SYNC_FAILED", attempts, nextTryAt: null, lastError: err.code || "REJECTED", permanent: true };
  const delay = delayWithRetryAfter(attempts, err && err.retryAfter, rand);
  return { ...rec, events, state: "SYNC_FAILED", attempts, nextTryAt: new Date(now.getTime() + delay).toISOString(), lastError: (err && err.code) || "NETWORK_ERROR", permanent: false };
}

/** Which records should be sent right now? */
export function dueRecords(records, now = new Date(), { force = false } = {}) {
  return records
    .filter((r) => r.state === "LOCAL_PENDING_SYNC" || (r.state === "SYNC_FAILED" && !r.permanent && (force || !r.nextTryAt || new Date(r.nextTryAt) <= now)) || (r.state === "SYNCING" && r.syncStartedAt && now - new Date(r.syncStartedAt) > 120000))
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

export const needsAttention = (r) => r.state === "SYNC_CONFLICT" || (r.state === "SYNC_FAILED" && r.permanent);
export const isPending = (r) => ACTIVE_STATES.includes(r.state) && !r.permanent;

/** Honest, citizen-facing sync label key (see en common sync.*). */
export function syncLabelKey(r) {
  if (r.state === "SYNCED") return "sync.submitted";
  if (r.state === "SYNCING") return "sync.syncing";
  if (r.state === "SYNC_CONFLICT") return "sync.conflict";
  if (r.state === "CANCELLED_LOCAL") return "sync.cancelled_local";
  if (r.state === "SYNC_FAILED" && r.permanent) return "sync.attention";
  if (r.state === "SYNC_FAILED") return "sync.waiting";
  return "sync.local_saved";
}

export const nextRetryPreview = (attempts) => nextDelayMs(attempts + 1, () => 0.5);
