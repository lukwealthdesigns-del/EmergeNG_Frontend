import { useQuery } from "@tanstack/react-query";
import { Alert, Badge, Card, EmptyState, ErrorState, PageHeader, SkeletonList } from "../../components/ui";
import { Refresh } from "../../components/staff";
import { useI18n } from "../../i18n";
import { api } from "../../api/client";
import { useFormat } from "../../lib/format";

export default function OpsPartners() {
  const { t } = useI18n(); const f = useFormat();
  const q = useQuery({ queryKey: ["ops", "orgs"], queryFn: () => api.get("/admin/partners") });
  return (
    <div className="mx-auto max-w-5xl animate-rise">
      <PageHeader title={t("ops.nav.partners")} subtitle={t("ops.partners.sub")} actions={<Refresh onClick={() => q.refetch()} loading={q.isFetching} />} />
      <Alert tone="warn" className="mb-4">{t("ops.partners.sim_note")}</Alert>
      {q.isLoading ? <SkeletonList /> : q.isError ? <ErrorState error={q.error} onRetry={q.refetch} /> : !q.data.items.length ? <Card><EmptyState title={t("state.empty")} /></Card> : (
        <div className="grid gap-3 sm:grid-cols-2">{q.data.items.map((o) => <Card key={o.id} className="!p-4"><div className="flex items-start justify-between gap-2"><div><p className="font-semibold">{o.name}</p><p className="text-xs text-ink-3">{o.org_type} · {o.integration_mode}</p></div><Badge tone={o.live_enabled ? "ok" : "warn"} dot>{o.live_enabled ? "LIVE" : "SIMULATION"}</Badge></div>
          <p className="mt-2 text-xs text-ink-2">{o.mode_label}</p><p className="mt-1 text-xs text-ink-3">{o.status} · ack ≤ {o.ack_timeout_minutes} min{o.verified_at ? ` · ${t("nearby.last_verified", { when: f.date(o.verified_at) })}` : ""}</p>{o.categories?.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{o.categories.map((c) => <Badge key={c} tone="muted">{c}</Badge>)}</div>}</Card>)}</div>)}
    </div>
  );
}
