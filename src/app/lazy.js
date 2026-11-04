import { lazy } from "react";

// One entry per route chunk. `preload` is used after sign-in to warm every chunk the user may visit, so navigation is instant.
const defs = {
  Onboarding: () => import("../pages/public/Onboarding"),
  Home: () => import("../pages/public/Home"),
  ShareLocation: () => import("../pages/public/ShareLocation"),
  NearbyHelp: () => import("../pages/public/NearbyHelp"),
  Report: () => import("../pages/public/Report"),
  ReportDone: () => import("../pages/public/ReportDone"),
  Track: () => import("../pages/public/Track"),
  About: () => import("../pages/public/About"),
  OfflineMode: () => import("../pages/public/OfflineMode"),
  Privacy: () => import("../pages/public/Legal").then((m) => ({ default: m.Privacy })),
  Terms: () => import("../pages/public/Legal").then((m) => ({ default: m.Terms })),
  SignIn: () => import("../pages/auth/SignIn"),
  AdminSignIn: () => import("../pages/auth/AdminSignIn"),
  SignUp: () => import("../pages/auth/SignUp"),
  VerifyEmail: () => import("../pages/auth/VerifyEmail"),
  Forgot: () => import("../pages/auth/Forgot"),
  Dashboard: () => import("../pages/citizen/Dashboard"),
  EmergencyProfile: () => import("../pages/citizen/EmergencyProfile"),
  Contacts: () => import("../pages/citizen/Contacts"),
  Places: () => import("../pages/citizen/Places"),
  Incidents: () => import("../pages/citizen/Incidents"),
  IncidentDetail: () => import("../pages/citizen/IncidentDetail"),
  Notifications: () => import("../pages/citizen/Notifications"),
  EmergencyCard: () => import("../pages/citizen/EmergencyCard"),
  Settings: () => import("../pages/citizen/Settings"),
  OpsOverview: () => import("../pages/operations/Overview"),
  OpsQueue: () => import("../pages/operations/Queue"),
  OpsMap: () => import("../pages/operations/LiveMap"),
  OpsIncident: () => import("../pages/operations/IncidentDetail"),
  OpsAnalytics: () => import("../pages/operations/Analytics"),
  OpsGeo: () => import("../pages/operations/Geo"),
  OpsPartners: () => import("../pages/operations/Partners"),
  OpsNotifications: () => import("../pages/operations/Notifications"),
  OpsAbuse: () => import("../pages/operations/Abuse"),
  OpsHealth: () => import("../pages/operations/Health"),
  OpsAudit: () => import("../pages/operations/Audit"),
  Partner: () => import("../pages/partner/Workspace"),
  AdminOverview: () => import("../pages/admin/Overview"),
  AdminUsers: () => import("../pages/admin/Users"),
  AdminRoles: () => import("../pages/admin/Roles"),
  AdminOrgs: () => import("../pages/admin/Orgs"),
  AdminIntegrations: () => import("../pages/admin/Integrations"),
  AdminSecurity: () => import("../pages/admin/Security"),
  AdminSettings: () => import("../pages/admin/ConfigSettings"),
  AdminPrivacy: () => import("../pages/admin/PrivacyRequests"),
  AdminApprovals: () => import("../pages/admin/Approvals"),
  NotFound: () => import("../pages/system/NotFound"),
  Forbidden: () => import("../pages/system/Forbidden"),
  ServerError: () => import("../pages/system/ServerError"),
  OfflinePage: () => import("../pages/system/OfflinePage"),
  SessionExpired: () => import("../pages/system/SessionExpired"),
};
export const loaders = defs;
export const P = Object.fromEntries(Object.entries(defs).map(([k, f]) => [k, lazy(f)]));

export const GROUPS = {
  public: ["Home", "ShareLocation", "NearbyHelp", "Report", "ReportDone", "Track", "About", "OfflineMode", "Privacy", "Terms", "SignIn", "AdminSignIn", "SignUp", "VerifyEmail", "Forgot", "NotFound", "Forbidden", "ServerError", "OfflinePage", "SessionExpired"],
  citizen: ["Dashboard", "EmergencyProfile", "Contacts", "Places", "Incidents", "IncidentDetail", "Notifications", "EmergencyCard", "Settings"],
  ops: ["OpsOverview", "OpsQueue", "OpsMap", "OpsIncident", "OpsAnalytics", "OpsGeo", "OpsPartners", "OpsNotifications", "OpsAbuse", "OpsHealth", "OpsAudit"],
  partner: ["Partner"],
  admin: ["AdminOverview", "AdminUsers", "AdminRoles", "AdminOrgs", "AdminIntegrations", "AdminSecurity", "AdminSettings", "AdminPrivacy", "AdminApprovals"],
};
const idle = (fn) => (typeof requestIdleCallback === "function" ? requestIdleCallback(fn, { timeout: 4000 }) : setTimeout(fn, 400));
/** Warm route chunks sequentially while the browser is idle (failures are ignored: it is only an optimisation). */
export function preloadGroups(names) {
  const list = [...new Set(names.flatMap((g) => GROUPS[g] || []))];
  let i = 0;
  const next = () => { if (i >= list.length) return; const k = list[i++]; Promise.resolve(loaders[k]?.()).catch(() => {}).finally(() => idle(next)); };
  idle(next);
}
