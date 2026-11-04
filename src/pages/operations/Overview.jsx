import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle, Inbox, Eye, UserCheck, CheckCircle2, Handshake, Siren, Activity } from "lucide-react";
import { Alert, Badge, Card, ErrorState, PageHeader, Section, SkeletonList, Stat } from "../../components/ui";
import { LiveIndicator, PrioBadge, StatusBadge, Refresh } from "../../components/staff";
import { useOpsLive } from "../../hooks/useOpsLive";
import { useI18n, useLabels } from "../../i18n";
import { api } from "../../api/client";
import { useFormat } from "../../lib/format";
import { can } from "../../auth/permissions";
import { useAuth } from "../../auth/AuthProvider";

export default function Overview() {
  const { t } = useI18n(); const L = useLabels(); const f = useFormat(); const { user } = useAuth(); const live = useOpsLive();
  const canQueue = can(user, "incident.read_all_authorized") || can(user, "incident.read_assigned");
  const ov = useQuery({ queryKey: ["ops", "overview"], queryFn: () => api.get("/operations/overview"), refetchInterval: 60000 });
  const qq = useQuery({ queryKey: ["ops", "queue", {}], enabled: canQueue, queryFn: () => api.get("/operations/incidents", { params: { page: 1, page_size: 8, sort: "priority", status: "submitted,received,under_review,assigned,response_underway" } }) });
  const m = ov.data?.metrics || {};
  const tiles = [["ops.m.open", m.open_incidents, Inbox], ["ops.m.critical", m.critical_open, Siren, "danger"], ["ops.m.high", m.high_open, AlertTriangle, "warn"], ["ops.m.unassessed", m.unassessed_open, Eye], ["ops.m.awaiting_review", m.awaiting_review, Eye, "warn"], ["ops.m.awaiting_assign", m.awaiting_assignment, UserCheck], ["ops.m.today", m.incidents_today, Activity], ["ops.m.resolved_today", m.resolved_today, CheckCircle2, "ok"]];
  return (
    <div className="mx-auto max-w-6xl animate-rise">
      <PageHeader title={t("ops.nav.overview")} subtitle={ov.data ? `${ov.data.timezone}` : undefined} actions={<><LiveIndicator {...live} /><Refresh onClick={() => ov.refetch()} loading={ov.isFetching} /></>} />
      {ov.data?.demo_mode && <Alert tone="warn" className="mb-4">{t("app.demo")}</Alert>}
      {ov.isLoading ? <SkeletonList rows={3} /> : ov.isError ? <ErrorState error={ov.error} onRetry={ov.refetch} /> : (<>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{tiles.map(([k, v, I, tone]) => <Stat key={k} label={t(k)} value={v} tone={tone && (v > 0 ? tone : undefined)} />)}</div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <Stat label={t("ops.m.partner_real")} value={m.active_partner_assignments_real} /><Stat label={t("ops.m.partner_sim")} value={m.active_partner_assignments_simulated} sub={t("inc.simulated")} /><Stat label={t("ops.m.referrals_waiting")} value={m.referrals_awaiting_ack} />
        </div>
        <p className="mt-2 text-xs text-ink-3">{t("state.updated", { when: f.rel(ov.data.generated_at) })}</p>
        {canQueue && <Section title={t("ops.priority_queue")} className="mt-8" actions={<Link to="/ops/queue" className="text-sm underline">{t("act.view")}</Link>}>
          <Card className="!p-2">{qq.isLoading ? <SkeletonList rows={3} /> : (qq.data?.items || []).length === 0 ? <p className="p-4 text-sm text-ink-3">{t("ops.queue.empty")}</p> : (
            <ul className="divide-y divide-line/70">{qq.data.items.map((i) => <li key={i.id}><Link to={`/ops/incidents/${i.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl px-3 py-3 hover:bg-surface-2"><span><span className="font-mono text-sm">{i.reference}</span><span className="ml-2 text-sm text-ink-2">{L.category(i.category)}</span>{i.is_demo && <Badge tone="warn" className="ml-2">DEMO</Badge>}</span><span className="flex items-center gap-2"><PrioBadge v={i.priority} /><StatusBadge v={i.operational_status} /><span className="text-xs text-ink-3">{f.rel(i.submitted_at)}</span></span></Link></li>)}</ul>)}</Card></Section>}
        <Section title={t("ops.integrations")} className="mt-8"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{(ov.data.integrations || []).map((p) => <Card key={p.provider} className="!p-4"><div className="flex items-center justify-between"><span className="font-medium capitalize">{p.provider}</span><Badge tone={!p.configured ? "muted" : p.state === "healthy" || p.state === "ok" ? "ok" : "warn"} dot>{p.configured ? p.state : t("ops.not_configured")}</Badge></div><p className="mt-1 text-xs text-ink-3">{t("ops.failures_hour", { n: p.failures_last_hour })}</p></Card>)}</div></Section>
        <details className="mt-6 text-sm text-ink-3"><summary className="cursor-pointer">{t("ops.definitions")}</summary><dl className="mt-2 space-y-1">{Object.entries(ov.data.definitions || {}).map(([k, v]) => <div key={k}><dt className="inline font-medium text-ink-2">{k}: </dt><dd className="inline">{String(v)}</dd></div>)}</dl></details>
      </>)}
    </div>
  );
}
