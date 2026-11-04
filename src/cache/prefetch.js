// "On sign-in every page should be loaded so it is fast": (1) warm every route chunk the role can reach, (2) prefetch the role's key data
// into the in-memory react-query cache. Sensitive data stays in memory only (see lib/queryClient.js).
import { api } from "../api/client";
import { qk } from "../lib/queryClient";
import { preloadGroups } from "../app/lazy";
import { can, canOps, canAdmin, isPartner } from "../auth/permissions";

export function prefetchAfterLogin(qc, user) {
  if (!user) return;
  const groups = ["public", "citizen"];
  if (canOps(user)) groups.push("ops");
  if (isPartner(user)) groups.push("partner");
  if (canAdmin(user)) groups.push("admin");
  preloadGroups(groups);
  const pf = (key, path, params) => qc.prefetchQuery({ queryKey: key, queryFn: () => api.get(path, { params }), staleTime: 60_000 }).catch(() => {});
  setTimeout(() => {
    pf(qk.incidentsMine(1), "/incidents/mine", { page: 1 });
    pf(qk.contacts, "/trusted-contacts"); pf(qk.places, "/saved-locations"); pf(qk.profile, "/emergency-profile");
    if (can(user, "incident.read_all_authorized") || can(user, "incident.read_assigned")) {
      pf(["ops", "overview"], "/operations/overview");
      pf(["ops", "queue", {}], "/operations/incidents", { page: 1 });
      pf(["ops", "map", {}], "/operations/map");
    }
    if (can(user, "analytics.read")) pf(["ops", "analytics", 30], "/operations/analytics", { since: new Date(Date.now() - 30 * 86400000).toISOString(), granularity: "day" }); // same key + params as the Analytics page
    if (can(user, "users.read")) pf(["admin", "users", {}], "/admin/users");
  }, 300);
}
