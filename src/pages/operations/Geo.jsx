import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Badge, Card, ErrorState, PageHeader, Segmented, SkeletonList } from "../../components/ui";
import { BarsChart } from "../../components/charts";
import { Refresh } from "../../components/staff";
import { useI18n } from "../../i18n";
import { api } from "../../api/client";
import { useFormat } from "../../lib/format";

export default function Geo() {
  const { t } = useI18n(); const f = useFormat(); const [days, setDays] = useState(30);
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const q = useQuery({ queryKey: ["ops", "geo", days], queryFn: () => api.get("/operations/analytics/geographic", { params: { since } }) });
  const areas = (q.data?.areas || []).slice().sort((a, b) => (b.incidents ?? -1) - (a.incidents ?? -1));
  return (
    <div className="mx-auto max-w-5xl animate-rise">
      <PageHeader title={t("ops.nav.geo")} subtitle={t("ops.geo.sub")} actions={<><Segmented value={days} onChange={setDays} label="range" options={[7, 30, 90].map((n) => ({ value: n, label: `${n} d` }))} /><Refresh onClick={() => q.refetch()} loading={q.isFetching} /></>} />
      <Alert tone="info" className="mb-4">{q.data?.interpretation || t("ops.geo.interp")}</Alert>
      {q.isLoading ? <SkeletonList /> : q.isError ? <ErrorState error={q.error} onRetry={q.refetch} /> : (<>
        <Card className="mb-4"><h2 className="mb-2 text-lg">{t("ops.geo.by_state")}</h2><BarsChart horizontal data={areas.filter((a) => !a.suppressed).map((a) => ({ name: a.area, value: a.incidents }))} /></Card>
        <Card className="overflow-x-auto !p-2"><table className="w-full text-sm"><thead className="text-left text-xs text-ink-3"><tr><th className="p-2">{t("ops.geo.area")}</th><th className="p-2">{t("ops.an.total")}</th><th className="p-2">{t("ops.an.pc_rate")}</th></tr></thead>
          <tbody>{areas.map((a) => <tr key={a.area} className="border-t border-line/70"><td className="p-2 font-medium">{a.area}</td><td className="p-2 tabular-nums">{a.suppressed ? <Badge tone="muted">{t("ops.geo.suppressed")}</Badge> : f.number(a.incidents)}</td><td className="p-2 tabular-nums">{a.postcode_resolution_rate != null ? f.percent(a.postcode_resolution_rate) : "—"}</td></tr>)}</tbody></table></Card>
        <p className="mt-3 text-xs text-ink-3">{t("ops.geo.suppress_note")}</p></>)}
    </div>
  );
}
