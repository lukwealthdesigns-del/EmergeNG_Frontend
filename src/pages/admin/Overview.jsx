import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Alert, Badge, Card, PageHeader, Skeleton, Stat } from "../../components/ui";
import { useI18n } from "../../i18n";
import { useAuth } from "../../auth/AuthProvider";
import { ADMIN_NAV, can, visibleNav } from "../../auth/permissions";
import { api } from "../../api/client";
import { NavIcon } from "../../components/common/bits";

export default function AdminOverview() {
  const { t } = useI18n(); const { user } = useAuth();
  const h = useQuery({ queryKey: ["admin", "health-lite"], enabled: can(user, "system.health.read"), queryFn: () => api.get("/admin/system/health"), staleTime: 30000 });
  const ap = useQuery({ queryKey: ["admin", "approvals", "pending"], enabled: can(user, "approvals.decide"), queryFn: () => api.get("/admin/approvals", { params: { status: "pending" } }), staleTime: 30000 });
  const items = visibleNav(user, ADMIN_NAV).filter((i) => !i.end);
  return (
    <div className="mx-auto max-w-5xl animate-rise">
      <PageHeader title={t("admin.nav.overview")} subtitle={t("admin.sub")} />
      <Alert tone="info" className="mb-4">{t("admin.note")}</Alert>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {can(user, "system.health.read") && (h.isLoading ? <Skeleton className="h-24 rounded-3xl" /> : h.data && <><Stat label="Database" value={h.data.database.reachable ? "OK" : "Down"} tone={h.data.database.reachable ? "ok" : "danger"} /><Stat label={t("admin.open_alerts")} value={h.data.open_alerts} tone={h.data.open_alerts ? "warn" : "ok"} /></>)}
        {can(user, "approvals.decide") && ap.data && <Stat label={t("admin.pending_approvals")} value={ap.data.items.length} tone={ap.data.items.length ? "warn" : "ok"} />}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map((i) => <Link key={i.to} to={i.to} className="focus-ring rounded-3xl"><Card className="!p-5 transition hover:shadow-soft"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-surface-3"><NavIcon name={i.icon} className="h-5 w-5" /></span><span className="font-medium">{t(i.key)}</span></div></Card></Link>)}</div>
    </div>
  );
}
