import test from "node:test";
import assert from "node:assert/strict";
import { circlePolygon, precisionOf, uncertaintyRadius, pointsToFeatures, boundsOf, signalPoints, uncertaintyFeatures } from "../src/lib/mapgeo.js";
import { haversineM } from "../src/lib/geo.js";

test("circle polygon radius is accurate and ring is closed", () => {
  const g = circlePolygon(7.78, 4.54, 500); const ring = g.coordinates[0];
  assert.deepEqual(ring[0], ring[ring.length - 1]);
  for (const [lo, la] of ring) assert.ok(Math.abs(haversineM(7.78, 4.54, la, lo) - 500) < 2);
});
test("only high-precision GPS is treated as exact", () => {
  assert.equal(precisionOf({ source: "gps", accuracy_m: 12 }), "high");
  assert.equal(precisionOf({ source: "gps", accuracy_m: 300 }), "medium");
  assert.equal(precisionOf({ source: "postcode_derived" }), "low");
  assert.equal(precisionOf({ precision: "gps_high" }), "high");
  assert.equal(uncertaintyRadius({ source: "manual" }), 1000);
});
test("features skip invalid points and carry priority weight", () => {
  const fc = pointsToFeatures([{ id: 1, latitude: 7, longitude: 4, priority: "critical" }, { id: 2, latitude: "x", longitude: 4 }, { id: 3 }]);
  assert.equal(fc.features.length, 1); assert.equal(fc.features[0].properties.weight, 1);
  assert.equal(uncertaintyFeatures([{ id: 1, latitude: 7, longitude: 4, source: "manual" }]).features.length, 1);
});
test("bounds and signal ranking", () => {
  assert.equal(boundsOf([]), null);
  assert.deepEqual(boundsOf([{ latitude: 1, longitude: 2 }, { latitude: 3, longitude: 4 }]), [[2, 1], [4, 3]]);
  const s = signalPoints([{ id: "a", latitude: 1, longitude: 1, priority: "low", status: "submitted" }, { id: "b", latitude: 1, longitude: 1, priority: "critical", status: "submitted" }, { id: "c", latitude: 1, longitude: 1, priority: "critical", status: "resolved" }]);
  assert.deepEqual(s.map((x) => x.id), ["b", "a"]);
});
