import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { canAny, canAdmin, canOps, isPartner } from "../auth/permissions";
import { Spinner } from "../components/ui";
import { P } from "./lazy";
import { Suspense } from "react";

const Center = () => <div className="flex min-h-[50dvh] items-center justify-center"><Spinner className="h-7 w-7" /></div>;

export function RequireAuth({ children, loginPath = "/signin" }) {
  const { status } = useAuth(); const loc = useLocation();
  if (status === "loading") return <Center />;
  if (status === "expired") return <Navigate to="/session-expired" replace state={{ from: loc.pathname }} />;
  if (status !== "authed") return <Navigate to={loginPath} replace state={{ from: loc.pathname }} />;
  return children;
}
/** Hides what a user cannot use. The backend still enforces every permission. */
export function RequireAccess({ check, children }) {
  const { user } = useAuth();
  if (!check(user)) return <Suspense fallback={<Center />}><P.Forbidden /></Suspense>;
  return children;
}
export const opsCheck = (u) => canOps(u);
export const adminCheck = (u) => canAdmin(u);
export const partnerCheck = (u) => isPartner(u);
export const permCheck = (...perms) => (u) => canAny(u, perms);
