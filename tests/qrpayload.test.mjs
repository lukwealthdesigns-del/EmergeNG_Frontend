import test from "node:test";
import assert from "node:assert/strict";
import { buildQrPayload, clean, QR_MAX_CHARS } from "../src/lib/qrPayload.js";

const NOW = new Date("2026-11-02T10:00:00Z");

test("empty selection produces no payload", () => {
  const r = buildQrPayload({ values: { name: "Ada" }, include: {}, now: NOW });
  assert.equal(r.text, ""); assert.deepEqual(r.used, []);
});

test("only ticked, non-empty fields are included, in a fixed order, always English labels", () => {
  const r = buildQrPayload({ values: { name: "Ada Obi", blood_group: "O+", allergies: ["penicillin", "peanuts"], conditions: "asthma", medications: "" },
    include: { name: true, blood_group: true, allergies: true, medications: true, conditions: false }, contact: "Ade (brother) 0803 123 4567", now: NOW });
  assert.equal(r.text, ["EMERGENCY CARD (EmergeNG)", "Name: Ada Obi", "Blood group: O+", "Allergies: penicillin, peanuts", "Emergency contact: Ade (brother) 0803 123 4567",
    "Self-reported, not verified. Created 2026-11-02.", "In an emergency call 112."].join("\n"));
  assert.deepEqual(r.used, ["name", "blood_group", "allergies", "contact"]);
  assert.ok(!r.text.includes("asthma"), "unticked medical detail must not leak");
});

test("'unknown' blood group is skipped", () => {
  assert.equal(buildQrPayload({ values: { blood_group: "unknown" }, include: { blood_group: true }, now: NOW }).text, "");
});

test("control characters and newlines cannot forge extra card lines", () => {
  const r = buildQrPayload({ values: { name: "Ada\nBlood group: AB-\r\u0000x" }, include: { name: true }, now: NOW });
  assert.equal(r.text.split("\n").filter((l) => l.startsWith("Blood group")).length, 0);
  assert.equal(clean("a" + String.fromCharCode(0x2028) + "b\tc"), "a b c");
});

test("very long values are truncated and the payload reports tooLong when over the limit", () => {
  assert.ok(clean("x".repeat(500)).length <= 220);
  const big = "y".repeat(210);
  const r = buildQrPayload({ values: { allergies: big, conditions: big, medications: big, disability_needs: big, emergency_notes: big }, include: { allergies: true, conditions: true, medications: true, disability_needs: true, emergency_notes: true }, now: NOW });
  assert.equal(r.tooLong, r.length > QR_MAX_CHARS);
  assert.ok(r.tooLong);
});
