import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, ErrorState, PageHeader, Section, Segmented, SkeletonList, Stat } from "../../components/ui";
import { BarsChart, DonutChart, TrendChart } from "../../components/charts";
import { toSeries } from "../../components/charts/util";
import { Refresh, Def } from "../../components/staff";
import { useI18n, useLabels } from "../../i18n";
import { api } from "../../api/client";
import { useFormat, formatDuration } from "../../lib/format";
import { PRIORITY_COLOR } from "../../lib/enums";

const Dur = ({ label, d }) => { const { t } = useI18n(); return <Card className="!p-4"><p className="text-xs text-ink-3">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums">{d && d.median_seconds != null ? formatDuration(d.median_seconds) : "—"}</p><p className="text-xs text-ink-3">{d?.count != null ? `n=${d.count}` : ""} {d?.p90_seconds != null ? `· p90 ${formatDuration(d.p90_seconds)}` : ""}{d?.insufficient ? ` · ${t("state.not_enough_data")}` : ""}</p></Card>; };
export default function Analytics() {
  const { t } = useI18n(); const L = useLabels(); const f = useFormat(); const [days, setDays] = useState(30);
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const q = useQuery({ queryKey: ["ops", "analytics", days], queryFn: () => api.get("/operations/analytics", { params: { since, granularity: days > 14 ? "day" : "day" } }), staleTime: 60_000 });
  const d = q.data;
  return (
    <div className="mx-auto max-w-6xl animate-rise">
      <PageHeader title={t("ops.nav.analytics")} actions={<><Segmented value={days} onChange={setDays} label="range" options={[7, 30, 90].map((n) => ({ value: n, label: `${n} d` }))} /><Refresh onClick={() => q.refetch()} loading={q.isFetching} /></>} />
      {q.isLoading ? <SkeletonList rows={4} /> : q.isError ? <ErrorState error={q.error} onRetry={q.refetch} /> : (<div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Stat label={t("ops.an.total")} value={f.number(d.total_incidents)} /><Stat label={t("ops.an.pc_rate")} value={d.postcode_resolution?.success?.rate != null ? f.percent(d.postcode_resolution.success.rate) : "—"} sub={d.postcode_resolution?.success?.insufficient ? t("state.not_enough_data") : undefined} /></div>
        <Card><h2 className="mb-2 text-lg">{t("ops.an.trend")}</h2><TrendChart data={d.trend} /></Card>
        <div className="grid gap-4 md:grid-cols-2">
          <Card><h2 className="mb-2 text-lg">{t("ops.f.category")}</h2><BarsChart horizontal data={toSeries(d.by_category, L.category)} /></Card>
          <Card><h2 className="mb-2 text-lg">{t("ops.f.priority")}</h2><DonutChart colors={PRIORITY_COLOR} data={toSeries(d.by_priority, L.priority)} /></Card>
          <Card><h2 className="mb-2 text-lg">{t("ops.f.status")}</h2><BarsChart horizontal data={toSeries(d.by_status, L.status)} /></Card>
          <Card><h2 className="mb-2 text-lg">{t("ops.f.verification")}</h2><DonutChart data={toSeries(d.by_verification, L.verification)} /></Card>
        </div>
        <Section title={t("ops.an.durations")}><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Dur label={t("ops.an.d_receipt")} d={d.durations?.submitted_to_received} /><Dur label={t("ops.an.d_review")} d={d.durations?.submitted_to_first_review} /><Dur label={t("ops.an.d_resolve")} d={d.durations?.submitted_to_resolved_recorded} /><Dur label={t("ops.an.d_ack_real")} d={d.durations?.referral_to_partner_ack_real} /><Dur label={t("ops.an.d_ack_sim")} d={d.durations?.referral_to_partner_ack_simulated} />
        </div><Def text={d.durations?.note} /></Section>
        <Section title={t("ops.an.postcode")}><Card><BarsChart data={toSeries(d.postcode_resolution?.by_status, L.postcode)} /><Def text={d.postcode_resolution?.note} /></Card></Section>
        {d.integration_calls?.length > 0 && <Section title={t("ops.integrations")}><Card className="overflow-x-auto !p-2"><table className="w-full text-sm"><thead className="text-left text-xs text-ink-3"><tr><th className="p-2">Provider</th><th className="p-2">OK</th><th className="p-2">Errors</th><th className="p-2">Error rate</th></tr></thead><tbody>{d.integration_calls.map((p) => <tr key={p.provider} className="border-t border-line/70"><td className="p-2 capitalize">{p.provider}</td><td className="p-2 tabular-nums">{p.ok}</td><td className="p-2 tabular-nums">{p.errors}</td><td className="p-2 tabular-nums">{p.error_rate != null ? f.percent(p.error_rate, 1) : "—"}</td></tr>)}</tbody></table></Card></Section>}
        <details className="text-sm text-ink-3"><summary className="cursor-pointer">{t("ops.definitions")}</summary><dl className="mt-2 space-y-1">{Object.entries(d.definitions || {}).map(([k, v]) => <div key={k}><dt className="inline font-medium text-ink-2">{k}: </dt><dd className="inline">{String(v)}</dd></div>)}</dl></details>
      </div>)}
    </div>
  );
}
