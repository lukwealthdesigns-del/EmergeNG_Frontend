// Pure role/permission helpers. The UI only HIDES what a user cannot do; the backend remains the authority.
export const PRIVILEGED_ROLES = ["support_agent", "incident_operator", "operations_supervisor", "geographic_analyst", "security_analyst", "auditor", "platform_administrator", "security_administrator"];
export const PARTNER_ROLES = ["partner_responder", "partner_admin"];

export const can = (user, perm) => !!user && Array.isArray(user.permissions) && user.permissions.includes(perm);
export const canAny = (user, perms) => perms.some((p) => can(user, p));
export const hasRole = (user, ...roles) => !!user && (user.roles || []).some((r) => roles.includes(r));
export const isPrivileged = (user) => hasRole(user, ...PRIVILEGED_ROLES);
export const isPartner = (user) => hasRole(user, ...PARTNER_ROLES);

/** Operations area: anyone who can read incidents/analytics/alerts beyond their own. */
export const canOps = (user) => canAny(user, ["incident.read_all_authorized", "incident.read_assigned", "analytics.read", "analytics.geographic", "abuse.review", "security_events.read", "audit.read", "alerts.read", "notifications.monitor", "offline_sync.monitor", "support.read"]);
export const canAdmin = (user) => canAny(user, ["users.read", "roles.read", "configuration.manage", "partners.manage", "integrations.manage", "system.health.read", "approvals.decide", "privacy.manage", "auth_settings.manage", "facilities.manage"]);

/** Where should a freshly signed-in user land? */
export function homeFor(user) {
  if (!user) return "/";
  if (isPartner(user) && !isPrivileged(user)) return "/partner";
  if (canAny(user, ["incident.read_all_authorized", "incident.read_assigned"])) return "/ops";
  if (isPrivileged(user)) return canAdmin(user) && !canOps(user) ? "/admin" : "/ops";
  return "/app";
}

/** Nav model: each item is shown only when the user holds the permission (any of). */
export const OPS_NAV = [
  { to: "/ops", key: "ops.nav.overview", icon: "LayoutDashboard", end: true, perms: ["incident.read_all_authorized", "incident.read_assigned", "analytics.read"] },
  { to: "/ops/queue", key: "ops.nav.queue", icon: "ListChecks", perms: ["incident.read_all_authorized", "incident.read_assigned"] },
  { to: "/ops/map", key: "ops.nav.map", icon: "Radar", perms: ["incident.read_all_authorized", "incident.read_assigned"] },
  { to: "/ops/analytics", key: "ops.nav.analytics", icon: "BarChart3", perms: ["analytics.read"] },
  { to: "/ops/geo", key: "ops.nav.geo", icon: "Map", perms: ["analytics.geographic"] },
  { to: "/ops/partners", key: "ops.nav.partners", icon: "Handshake", perms: ["partners.manage", "partner_referral.create", "incident.read_all_authorized"] },
  { to: "/ops/notifications", key: "ops.nav.notifications", icon: "BellRing", perms: ["notifications.monitor"] },
  { to: "/ops/abuse", key: "ops.nav.abuse", icon: "ShieldAlert", perms: ["abuse.review"] },
  { to: "/ops/health", key: "ops.nav.health", icon: "Activity", perms: ["system.health.read", "offline_sync.monitor"] },
  { to: "/ops/audit", key: "ops.nav.audit", icon: "ScrollText", perms: ["audit.read"] },
];
export const ADMIN_NAV = [
  { to: "/admin", key: "admin.nav.overview", icon: "LayoutDashboard", end: true, perms: ["users.read", "roles.read", "configuration.manage", "partners.manage", "approvals.decide", "system.health.read"] },
  { to: "/admin/users", key: "admin.nav.users", icon: "Users", perms: ["users.read"] },
  { to: "/admin/roles", key: "admin.nav.roles", icon: "KeyRound", perms: ["roles.read"] },
  { to: "/admin/organizations", key: "admin.nav.orgs", icon: "Building2", perms: ["partners.manage"] },
  { to: "/admin/integrations", key: "admin.nav.integrations", icon: "Plug", perms: ["integrations.manage", "system.health.read"] },
  { to: "/admin/security", key: "admin.nav.security", icon: "Lock", perms: ["auth_settings.manage", "security_events.read"] },
  { to: "/admin/settings", key: "admin.nav.settings", icon: "SlidersHorizontal", perms: ["configuration.manage"] },
  { to: "/admin/privacy", key: "admin.nav.privacy", icon: "UserX", perms: ["privacy.manage"] },
  { to: "/admin/approvals", key: "admin.nav.approvals", icon: "BadgeCheck", perms: ["approvals.decide", "approvals.request"] },
];
export const visibleNav = (user, items) => items.filter((i) => canAny(user, i.perms));
