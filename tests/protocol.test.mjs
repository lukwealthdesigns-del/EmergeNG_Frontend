import test from "node:test";
import assert from "node:assert/strict";
import { applyResult, applyTransportFailure, dueRecords, buildCreateOperation, syncLabelKey, needsAttention } from "../src/offline/protocol.js";
import { nextDelayMs, delayWithRetryAfter, RETRY_SCHEDULE_MS } from "../src/lib/backoff.js";

const rec = (o = {}) => ({ clientIncidentId: "c1", state: "SYNCING", attempts: 0, events: [], createdAt: "2026-11-01T10:00:00Z",
  draft: { category: "fire", latitude: 7.78, longitude: 4.54, accuracyM: 18.4, capturedAt: "2026-11-01T09:59:00Z", locationSource: "gps", postcode: "OS-01-A01-AB-01" }, ...o });

test("accepted with server id -> SYNCED", () => {
  const r = applyResult(rec(), { status: "accepted", server_incident_id: "EMG-2026-AAAAAA", incident_status: "submitted", tracking_token: "tok" });
  assert.equal(r.state, "SYNCED"); assert.equal(r.serverIncidentId, "EMG-2026-AAAAAA"); assert.equal(r.trackingToken, "tok");
});
test("accepted WITHOUT server id is never SYNCED", () => {
  const r = applyResult(rec(), { status: "accepted" });
  assert.notEqual(r.state, "SYNCED"); assert.equal(r.permanent, true);
});
test("already_synced with id -> SYNCED", () => {
  assert.equal(applyResult(rec(), { status: "already_synced", server_incident_id: "EMG-1" }).state, "SYNCED");
});
test("retry keeps the report queued and schedules next try (honours retry_after)", () => {
  const now = new Date("2026-11-01T10:00:00Z");
  const r = applyResult(rec(), { status: "retry", error_code: "TEMPORARY_SERVICE_FAILURE", retry_after_seconds: 900 }, now, () => 0.5);
  assert.equal(r.state, "SYNC_FAILED"); assert.equal(r.permanent, false); assert.equal(r.attempts, 1);
  assert.ok(new Date(r.nextTryAt) - now >= 900000);
});
test("rejected is permanent and needs attention", () => {
  const r = applyResult(rec(), { status: "rejected", error_code: "INVALID_COORDINATES" });
  assert.equal(r.permanent, true); assert.ok(needsAttention(r)); assert.equal(syncLabelKey(r), "sync.attention");
});
test("conflict -> SYNC_CONFLICT", () => { assert.equal(applyResult(rec(), { status: "conflict" }).state, "SYNC_CONFLICT"); });
test("network failure is retryable; non-retryable stops", () => {
  const now = new Date("2026-11-01T10:00:00Z");
  const a = applyTransportFailure(rec(), { code: "NETWORK_ERROR", retryable: true }, now, () => 0.5);
  assert.equal(a.permanent, false); assert.ok(a.nextTryAt);
  const b = applyTransportFailure(rec(), { code: "PAYLOAD_TOO_LARGE", retryable: false }, now);
  assert.equal(b.permanent, true);
});
test("dueRecords honours nextTryAt, skips permanent and synced", () => {
  const now = new Date("2026-11-01T10:10:00Z");
  const list = [
    rec({ clientIncidentId: "a", state: "LOCAL_PENDING_SYNC" }),
    rec({ clientIncidentId: "b", state: "SYNC_FAILED", nextTryAt: "2026-11-01T10:30:00Z" }),
    rec({ clientIncidentId: "c", state: "SYNC_FAILED", nextTryAt: "2026-11-01T10:05:00Z" }),
    rec({ clientIncidentId: "d", state: "SYNC_FAILED", permanent: true }),
    rec({ clientIncidentId: "e", state: "SYNCED" }),
  ];
  assert.deepEqual(dueRecords(list, now).map((r) => r.clientIncidentId), ["a", "c"]);
  assert.deepEqual(dueRecords(list, now, { force: true }).map((r) => r.clientIncidentId), ["a", "b", "c"]);
});
test("create operation never carries server-authoritative fields and uses backend names", () => {
  const op = buildCreateOperation({ ...rec(), createdOffline: true });
  assert.equal(op.operation, "CREATE_INCIDENT"); assert.equal(op.client_incident_id, "c1");
  assert.equal(op.payload.location_source, "GPS"); assert.equal(op.payload.gps_accuracy_meters, 18); assert.equal(op.payload.offline_created, true);
  for (const k of ["status", "user_id", "verification_status", "dispatched", "server_incident_id"]) assert.ok(!(k in op.payload));
});
test("backoff schedule 30s..30m with jitter within 20%", () => {
  assert.deepEqual(RETRY_SCHEDULE_MS, [30000, 60000, 120000, 300000, 600000, 1800000]);
  assert.equal(nextDelayMs(1, () => 0.5), 30000);
  assert.equal(nextDelayMs(99, () => 0.5), 1800000);
  assert.ok(nextDelayMs(2, () => 1) <= 72000 && nextDelayMs(2, () => 0) >= 48000);
  assert.equal(delayWithRetryAfter(1, 120, () => 0.5), 120000);
});
