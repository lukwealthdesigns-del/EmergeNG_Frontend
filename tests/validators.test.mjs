import test from "node:test";
import assert from "node:assert/strict";
import * as v from "../src/lib/validators.js";
import { deriveNet, NET } from "../src/offline/netState.js";

test("postcode normalisation matches backend NDAPS format", () => {
  assert.equal(v.normalizePostcode("fc01a01kp27"), "FC-01-A01-KP-27");
  assert.equal(v.normalizePostcode("FC 01 A01 KP 27"), "FC-01-A01-KP-27");
  assert.equal(v.normalizePostcode("EK-01-A03-FK-01"), "EK-01-A03-FK-01");
  assert.equal(v.normalizePostcode("123-4567-8901"), null);
  assert.equal(v.postcode(""), "val.required");
});
test("phone normalisation to E.164", () => {
  assert.equal(v.normalizePhone("0803 123 4567"), "+2348031234567");
  assert.equal(v.normalizePhone("2348031234567"), "+2348031234567");
  assert.equal(v.normalizePhone("8031234567"), "+2348031234567");
  assert.equal(v.normalizePhone("123"), null);
});
test("password rules mirror backend", () => {
  assert.equal(v.password("short"), "val.pw_len");
  assert.equal(v.password("aaaaaaaaaaaa"), "val.pw_simple");
  assert.equal(v.password(" abcdefghijk "), "val.pw_space");
  assert.equal(v.password("Correct-horse-9"), null);
});
test("email, otp, coords", () => {
  assert.equal(v.email("a@b.ng"), null); assert.equal(v.email("nope"), "val.email");
  assert.equal(v.otp("123456"), null); assert.equal(v.otp("12345"), "val.otp");
  assert.ok(v.validCoords(7.7, 4.5)); assert.ok(!v.validCoords(91, 0));
});
test("net state derivation", () => {
  assert.equal(deriveNet({ browserOnline: false }), NET.OFFLINE);
  assert.equal(deriveNet({ browserOnline: true, reachable: null }), NET.CONNECTING);
  assert.equal(deriveNet({ browserOnline: true, reachable: false }), NET.SERVER_UNAVAILABLE);
  assert.equal(deriveNet({ browserOnline: true, reachable: true, syncing: true }), NET.SYNCING);
  assert.equal(deriveNet({ browserOnline: true, reachable: true, syncError: true }), NET.SYNC_ERROR);
  assert.equal(deriveNet({ browserOnline: true, reachable: true }), NET.ONLINE);
});
