import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle } from "lucide-react";
import { Alert, Badge, Card, ErrorState, KV, PageHeader, Section, SkeletonList } from "../../components/ui";
import { Refresh, Def } from "../../components/staff";
import { Freshness } from "../../components/common/bits";
import { useI18n } from "../../i18n";
import { useAuth } from "../../auth/AuthProvider";
import { can } from "../../auth/permissions";
import { api } from "../../api/client";
import { useFormat } from "../../lib/format";

const S = { ok: "ok", healthy: "ok", no_recent_failures: "ok", degraded: "warn", down: "danger", disabled: "danger", unconfigured: "muted", not_configured: "muted" };
export default function Health() {
  const { t } = useI18n(); const f = useFormat(); const { user } = useAuth(); const canHealth = can(user, "system.health.read");
  const q = useQuery({ queryKey: ["ops", "health"], enabled: canHealth, queryFn: () => api.get("/admin/system/health"), refetchInterval: 30000 });
  const r = useQuery({ queryKey: ["ops", "readiness"], enabled: canHealth, queryFn: () => api.get("/admin/system/readiness") });
  const m = useQuery({ queryKey: ["ops", "offline-metrics"], enabled: can(user, "offline_sync.monitor"), queryFn: () => api.get("/operations/offline/metrics").catch(() => null), retry: false });
  const d = q.data;
  return (
    <div className="mx-auto max-w-5xl animate-rise">
      <PageHeader title={t("ops.nav.health")} actions={<><Freshness at={q.dataUpdatedAt ? new Date(q.dataUpdatedAt).toISOString() : null} /><Refresh onClick={() => { q.refetch(); r.refetch(); }} loading={q.isFetching} /></>} />
      {!canHealth ? <Alert tone="info">{t("sys.403.body")}</Alert> : q.isLoading ? <SkeletonList /> : q.isError ? <ErrorState error={q.error} onRetry={q.refetch} /> : (<div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="!p-4"><p className="text-xs text-ink-3">Database</p><Badge tone={d.database.reachable ? "ok" : "danger"} dot>{d.database.reachable ? "reachable" : "down"}</Badge><p className="mt-1 text-xs text-ink-3">{d.database.ping_ms} ms</p></Card>
          <Card className="!p-4"><p className="text-xs text-ink-3">Rate limiter</p><Badge tone={d.rate_limiter.reachable ? "ok" : "warn"} dot>{d.rate_limiter.backend}</Badge></Card>
          <Card className="!p-4"><p className="text-xs text-ink-3">Workers</p><p className="text-xl font-semibold">{d.workers.workers_alive}/{d.workers.workers_known}</p><p className="text-xs text-ink-3">{d.workers.last_seen_at ? f.rel(d.workers.last_seen_at) : "—"}</p></Card>
          <Card className="!p-4"><p className="text-xs text-ink-3">SSE</p><p className="text-xl font-semibold">{d.realtime.sse_connections}</p><p className="text-xs text-ink-3">alerts: {d.open_alerts}</p></Card></div>
        <Section title={t("ops.integrations")}><div className="grid gap-3 sm:grid-cols-2">{d.providers.map((p) => <Card key={p.provider} className="!p-4"><div className="flex items-center justify-between"><span className="font-medium capitalize">{p.provider}</span><Badge tone={S[p.state] || "muted"} dot>{p.configured ? p.state : t("ops.not_configured")}</Badge></div><p className="mt-1 text-xs text-ink-3">circuit {p.circuit} · {p.failures_last_hour} fail/h · ok {p.process_calls_ok} err {p.process_calls_error}</p></Card>)}</div><Def text={d.providers[0]?.note} /></Section>
        <Section title={t("ops.queues")}><Card><dl>{Object.entries(d.queues.notifications_by_status || {}).map(([k, v]) => <KV key={k} k={`notifications · ${k}`} v={v} />)}<KV k="oldest queued (s)" v={d.queues.oldest_queued_age_s} />{Object.entries(d.queues.outbox_by_status || {}).map(([k, v]) => <KV key={k} k={`outbox · ${k}`} v={v} />)}</dl></Card></Section>
        {m.data && <Section title={t("ops.offline_sync")}><Card><dl>{Object.entries(m.data).filter(([, v]) => typeof v !== "object").map(([k, v]) => <KV key={k} k={k} v={String(v)} />)}</dl></Card></Section>}
        {r.data && <Section title={t("ops.readiness")}><Alert tone={r.data.all_ok ? "ok" : "warn"} className="mb-3">{r.data.note}</Alert><Card className="!p-2"><ul className="divide-y divide-line/70">{r.data.items.map((i) => <li key={i.control} className="flex items-start gap-3 p-3 text-sm">{i.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-warn" />}<span><span className="font-medium">{i.control}</span><span className="block text-xs text-ink-3">{i.detail}</span></span></li>)}</ul></Card></Section>}
        <p className="text-xs text-ink-3">{d.backups?.note}</p></div>)}
    </div>
  );
}
