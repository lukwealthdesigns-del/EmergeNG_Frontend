import test from "node:test";
import assert from "node:assert/strict";
import { can, homeFor, visibleNav, OPS_NAV, ADMIN_NAV, canOps } from "../src/auth/permissions.js";
const u = (roles, permissions) => ({ roles, permissions });
test("citizen lands on /app, no ops/admin nav", () => {
  const c = u(["citizen"], ["incident.create", "incident.read_own"]);
  assert.equal(homeFor(c), "/app"); assert.equal(visibleNav(c, OPS_NAV).length, 0); assert.equal(visibleNav(c, ADMIN_NAV).length, 0); assert.ok(!canOps(c));
});
test("operator sees queue and map but not audit/admin", () => {
  const o = u(["incident_operator"], ["incident.read_all_authorized", "incident.read_assigned", "analytics.read", "alerts.read", "offline_sync.monitor"]);
  const keys = visibleNav(o, OPS_NAV).map((i) => i.to);
  assert.ok(keys.includes("/ops/queue") && keys.includes("/ops/map")); assert.ok(!keys.includes("/ops/audit")); assert.equal(homeFor(o), "/ops");
});
test("platform admin goes to /admin and cannot see incident queue", () => {
  const a = u(["platform_administrator"], ["users.read", "users.manage", "roles.read", "configuration.manage", "partners.manage", "system.health.read", "analytics.read"]);
  assert.ok(!visibleNav(a, OPS_NAV).some((i) => i.to === "/ops/queue")); assert.ok(visibleNav(a, ADMIN_NAV).some((i) => i.to === "/admin/users"));
});
test("partner responder lands in /partner; null user safe", () => {
  assert.equal(homeFor(u(["partner_responder"], ["partner_referral.acknowledge"])), "/partner");
  assert.equal(can(null, "x"), false); assert.equal(homeFor(null), "/");
});
