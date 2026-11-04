import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Select, SkeletonList, TextInput } from "../../components/ui";
import { LiveIndicator, PrioBadge, StatusBadge, VerifBadge } from "../../components/staff";
import { useOpsLive } from "../../hooks/useOpsLive";
import { useI18n, useLabels } from "../../i18n";
import { api } from "../../api/client";
import { useFormat, formatDuration } from "../../lib/format";
import { CATEGORIES, OPERATIONAL_STATUSES, PRIORITIES, VERIFICATION_STATUSES } from "../../lib/enums";
import { debounce } from "../../lib/utils";

const KEYS = ["status", "priority", "category", "verification", "owner", "sort", "q", "state"];
export default function Queue() {
  const { t } = useI18n(); const L = useLabels(); const f = useFormat(); const [sp, setSp] = useSearchParams(); const live = useOpsLive();
  const params = useMemo(() => { const p = {}; KEYS.forEach((k) => { if (sp.get(k)) p[k] = sp.get(k); }); p.page = Number(sp.get("page") || 1); p.page_size = 25; if (!p.sort) p.sort = "priority"; return p; }, [sp]);
  const [q, setQ] = useState(sp.get("q") || "");
  const setParam = (k, v) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); if (k !== "page") n.delete("page"); setSp(n, { replace: true }); };
  const deb = useMemo(() => debounce((v) => setParam("q", v.trim().toUpperCase()), 450), [sp]); // eslint-disable-line
  const qr = useQuery({ queryKey: ["ops", "queue", params], queryFn: () => api.get("/operations/incidents", { params }), placeholderData: (p) => p });
  const d = qr.data; const pages = d ? Math.max(1, Math.ceil(d.total / d.page_size)) : 1; const active = KEYS.filter((k) => k !== "sort" && sp.get(k)).length;
  return (
    <div className="mx-auto max-w-6xl animate-rise">
      <PageHeader title={t("ops.nav.queue")} subtitle={d ? t("ops.queue.total", { n: d.total }) : undefined} actions={<LiveIndicator {...live} />} />
      <Card className="mb-4 !p-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative lg:col-span-2"><Search className="pointer-events-none absolute left-4 top-[15px] h-[18px] w-[18px] text-ink-3" /><input aria-label={t("act.search")} placeholder={t("ops.queue.search")} className="w-full rounded-2xl border border-line bg-surface py-3 pl-11 pr-4 text-ink placeholder:text-ink-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" value={q} maxLength={24} onChange={(e) => { setQ(e.target.value); deb(e.target.value); }} /></div>
        <Select aria-label={t("ops.f.status")} value={sp.get("status") || ""} onChange={(e) => setParam("status", e.target.value)}><option value="">{t("ops.f.status")}</option><option value="submitted,received,under_review,assigned,response_underway">{t("inc.active")}</option>{OPERATIONAL_STATUSES.map((s) => <option key={s} value={s}>{L.status(s)}</option>)}</Select>
        <Select aria-label={t("ops.f.priority")} value={sp.get("priority") || ""} onChange={(e) => setParam("priority", e.target.value)}><option value="">{t("ops.f.priority")}</option>{PRIORITIES.map((s) => <option key={s} value={s}>{L.priority(s)}</option>)}</Select>
        <Select aria-label={t("ops.f.category")} value={sp.get("category") || ""} onChange={(e) => setParam("category", e.target.value)}><option value="">{t("ops.f.category")}</option>{CATEGORIES.map((s) => <option key={s} value={s}>{L.category(s)}</option>)}</Select>
        <Select aria-label={t("ops.f.verification")} value={sp.get("verification") || ""} onChange={(e) => setParam("verification", e.target.value)}><option value="">{t("ops.f.verification")}</option>{VERIFICATION_STATUSES.map((s) => <option key={s} value={s}>{L.verification(s)}</option>)}</Select>
        <Select aria-label={t("ops.f.owner")} value={sp.get("owner") || ""} onChange={(e) => setParam("owner", e.target.value)}><option value="">{t("ops.f.owner")}</option><option value="me">{t("ops.f.mine")}</option><option value="unowned">{t("ops.f.unowned")}</option></Select>
        <Select aria-label={t("ops.f.sort")} value={params.sort} onChange={(e) => setParam("sort", e.target.value)}>{["priority", "oldest", "newest"].map((s) => <option key={s} value={s}>{t(`ops.sort.${s}`)}</option>)}</Select>
        {active > 0 && <Button variant="ghost" icon={X} onClick={() => { setQ(""); setSp({}, { replace: true }); }}>{t("act.clear")} ({active})</Button>}
      </div></Card>
      {qr.isLoading ? <SkeletonList rows={6} /> : qr.isError && !d ? <ErrorState error={qr.error} onRetry={qr.refetch} /> : !d?.items.length ? <Card><EmptyState icon={Filter} title={t("ops.queue.empty")} /></Card> : (
        <>
          <ul className="space-y-2">{d.items.map((i) => (
            <li key={i.id}><Link to={`/ops/incidents/${i.id}`} className="grid gap-2 rounded-3xl border border-line bg-surface p-4 shadow-soft transition hover:bg-surface-2 md:grid-cols-[1.2fr_1fr_auto] md:items-center">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm font-semibold">{i.reference}</span>{i.is_demo && <Badge tone="warn">DEMO</Badge>}{i.referral_state && <Badge tone="info">{i.referral_state}</Badge>}</div><p className="mt-0.5 text-sm text-ink-2">{L.category(i.category)} · {i.state_code || "—"} · <span className="font-mono">{i.postcode || L.postcode(i.postcode_status || "pending")}</span></p></div>
              <div className="flex flex-wrap gap-1.5"><PrioBadge v={i.priority} /><StatusBadge v={i.operational_status} /><VerifBadge v={i.verification_status} />{i.precision && i.precision !== "gps_high" && <Badge tone="muted">≈ {i.precision}</Badge>}</div>
              <div className="text-right text-xs text-ink-3"><div>{formatDuration(i.age_seconds)}</div><div>{f.dateTime(i.submitted_at)}</div></div>
            </Link></li>))}</ul>
          <div className="mt-4 flex items-center justify-between"><Button variant="outline" icon={ChevronLeft} disabled={params.page <= 1} onClick={() => setParam("page", String(params.page - 1))}>{t("act.back")}</Button><span className="text-sm text-ink-3">{params.page} / {pages}</span><Button variant="outline" disabled={params.page >= pages} onClick={() => setParam("page", String(params.page + 1))}>{t("act.next")}<ChevronRight className="h-4 w-4" /></Button></div>
        </>)}
    </div>
  );
}
