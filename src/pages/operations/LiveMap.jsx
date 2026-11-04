import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Flame, Layers, Radio, Eye, EyeOff } from "lucide-react";
import MapView, { mapAvailable } from "../../components/maps/MapView";
import { Alert, Badge, Button, Card, ErrorState, Select, Toggle } from "../../components/ui";
import { LiveIndicator, PrioBadge, StatusBadge } from "../../components/staff";
import { Freshness } from "../../components/common/bits";
import { useOpsLive } from "../../hooks/useOpsLive";
import { useI18n, useLabels } from "../../i18n";
import { api } from "../../api/client";
import { useFormat, formatDuration } from "../../lib/format";
import { PRIORITIES } from "../../lib/enums";
import { cn } from "../../lib/utils";

export default function LiveMap() {
  const { t } = useI18n(); const L = useLabels(); const f = useFormat(); const live = useOpsLive();
  const [heat, setHeat] = useState(true); const [signals, setSignals] = useState(true); const [cluster, setCluster] = useState(true); const [hours, setHours] = useState(24); const [prio, setPrio] = useState(""); const [closed, setClosed] = useState(false); const [sel, setSel] = useState(null);
  const filters = { since_hours: hours, priority: prio || undefined, include_closed: closed || undefined, limit: 500 };
  const q = useQuery({ queryKey: ["ops", "map", filters], queryFn: () => api.get("/operations/map", { params: filters }), refetchInterval: 45000, placeholderData: (p) => p });
  const pts = useMemo(() => (q.data?.points || []).map((p) => ({ ...p, latitude: p.lat, longitude: p.lon, label: p.reference })), [q.data]);
  const selected = pts.find((p) => String(p.id) === String(sel));
  const stale = live.state !== "live" && live.state !== "polling";
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-3 animate-rise lg:h-[calc(100dvh-7.5rem)]">
      <div className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-2xl">{t("ops.nav.map")}</h1><div className="flex flex-wrap items-center gap-2"><LiveIndicator {...live} />{q.dataUpdatedAt > 0 && <Freshness at={new Date(q.dataUpdatedAt).toISOString()} stale={q.isError} />}</div></div>
      {stale && <Alert tone="warn">{t("ops.map.stale")}</Alert>}
      {q.data?.truncated && <Alert tone="info">{t("ops.map.truncated", { n: q.data.count })}</Alert>}
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[1fr_340px]">
        <div className="relative min-h-[420px]">
          <MapView className="absolute inset-0" points={pts} heat={heat} signals={signals} cluster={cluster} tactical selectedId={sel} onSelect={setSel} />
          <div className="absolute left-3 top-3 z-10 flex max-w-[calc(100%-5rem)] flex-wrap gap-2">
            {[[heat, setHeat, Flame, "ops.map.heat"], [signals, setSignals, Radio, "ops.map.signals"], [cluster, setCluster, Layers, "ops.map.cluster"]].map(([on, set, I, k]) => <button key={k} aria-pressed={on} onClick={() => set(!on)} className={cn("inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 text-xs font-medium backdrop-blur", on ? "border-radar/60 bg-primary/85 text-primary-fg" : "border-line bg-surface/85 text-ink")}><I className="h-3.5 w-3.5" />{t(k)}</button>)}
          </div>
          {!mapAvailable && <div className="absolute inset-x-3 bottom-3 z-10"><Alert tone="warn">{t("sys.map_token")}</Alert></div>}
          <div className="pointer-events-none absolute bottom-3 left-3 z-10 hidden rounded-2xl bg-surface/85 p-2.5 text-[11px] text-ink-2 backdrop-blur sm:block">{PRIORITIES.map((p) => <div key={p} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: { critical: "#dc2626", high: "#ea580c", medium: "#2563eb", low: "#16a34a", unassessed: "#6b7280" }[p] }} />{L.priority(p)}</div>)}</div>
        </div>
        <Card className="flex min-h-0 flex-col !p-4">
          <div className="grid grid-cols-2 gap-2"><Select aria-label={t("ops.map.window")} value={hours} onChange={(e) => setHours(Number(e.target.value))}>{[6, 24, 72, 168, 720].map((h) => <option key={h} value={h}>{h >= 24 ? `${h / 24} d` : `${h} h`}</option>)}</Select><Select aria-label={t("ops.f.priority")} value={prio} onChange={(e) => setPrio(e.target.value)}><option value="">{t("ops.f.priority")}</option>{PRIORITIES.map((p) => <option key={p} value={p}>{L.priority(p)}</option>)}</Select></div>
          <Toggle label={t("ops.map.closed")} checked={closed} onChange={setClosed} />
          <p className="mb-2 text-xs text-ink-3">{t("ops.map.precision_note")}</p>
          {selected && <div className="mb-3 rounded-2xl border border-primary/30 bg-surface-3 p-3"><div className="flex items-center justify-between"><span className="font-mono text-sm font-semibold">{selected.reference}</span><button aria-label={t("act.close")} onClick={() => setSel(null)}><EyeOff className="h-4 w-4 text-ink-3" /></button></div><p className="text-sm text-ink-2">{L.category(selected.category)}</p><div className="mt-2 flex flex-wrap gap-1.5"><PrioBadge v={selected.priority} /><StatusBadge v={selected.status} /></div><p className="mt-2 text-xs text-ink-3">{selected.postcode || L.postcode(selected.postcode_status || "pending")} · ±{Math.round(selected.accuracy_m ?? 0)} m · {selected.precision}</p><Button size="sm" className="mt-2" to={`/ops/incidents/${selected.id}`}>{t("act.open")}</Button></div>}
          <ul className="-mx-1 min-h-0 flex-1 space-y-1 overflow-y-auto px-1">
            {q.isError && !q.data ? <ErrorState error={q.error} onRetry={q.refetch} /> : pts.slice(0, 120).map((p) => <li key={p.id}><button onClick={() => setSel(String(p.id))} className={cn("flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-sm hover:bg-surface-2", String(sel) === String(p.id) && "bg-surface-3")}><span><span className="block font-mono text-[13px]">{p.reference}</span><span className="text-xs text-ink-3">{L.category(p.category)} · {formatDuration((Date.now() - new Date(p.submitted_at)) / 1000)}</span></span><PrioBadge v={p.priority} /></button></li>)}
            {q.data && pts.length === 0 && <li className="p-4 text-sm text-ink-3">{t("ops.queue.empty")}</li>}
          </ul>
          <p className="mt-2 text-xs text-ink-3">{t("ops.map.count", { n: q.data?.count ?? 0 })}</p>
        </Card>
      </div>
    </div>
  );
}
