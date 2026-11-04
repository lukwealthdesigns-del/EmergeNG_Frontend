import { useEffect, useMemo, useState } from "react";
import { Phone, Navigation, ShieldCheck, ShieldQuestion, Map as MapIcon, List, Search, LocateFixed, Hospital, Siren, Flame, Pill, Stethoscope, Ambulance, Building2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Badge, Button, Card, EmptyState, ErrorState, PageHeader, Segmented, Select, SkeletonList } from "../../components/ui";
import MapView from "../../components/maps/MapView";
import { useI18n, useLabels } from "../../i18n";
import { useGeoCapture } from "../../hooks/useGeoCapture";
import { useNet } from "../../hooks/useNet";
import { NET } from "../../offline/netState";
import { api } from "../../api/client";
import { idb } from "../../offline/idb";
import { readLastLoc } from "../../components/emergency/LocationCapture";
import { fmtMeters, mapsDirectionsUrl } from "../../lib/geo";
import { useFormat } from "../../lib/format";
import { cn } from "../../lib/utils";

const CATS = [["all", Building2], ["hospital", Hospital], ["police", Siren], ["fire_station", Flame], ["ambulance", Ambulance], ["clinic", Stethoscope], ["pharmacy", Pill], ["emergency_agency", ShieldCheck]];
const CACHE_KEY = "nearby:last";

export default function NearbyHelp() {
  const { t } = useI18n(); const L = useLabels(); const f = useFormat(); const net = useNet(); const geo = useGeoCapture({ refineMs: 3000 });
  const [pos, setPos] = useState(null); const [cat, setCat] = useState("all"); const [radius, setRadius] = useState(5000); const [view, setView] = useState("list"); const [cached, setCached] = useState(null); const [sel, setSel] = useState(null);
  const online = net.net !== NET.OFFLINE && net.net !== NET.SERVER_UNAVAILABLE;

  useEffect(() => { readLastLoc().then((l) => { if (l && !pos) setPos({ lat: l.latitude, lon: l.longitude }); }); idb.get("cache", CACHE_KEY).then((r) => r && setCached(r)).catch(() => {}); geo.capture(); }, []); // eslint-disable-line
  useEffect(() => { if (geo.fix) setPos({ lat: geo.fix.latitude, lon: geo.fix.longitude, accuracy: geo.fix.accuracyMeters }); }, [geo.fix?.capturedAt]);

  const q = useQuery({
    queryKey: ["public", "nearby", pos ? Math.round(pos.lat * 1000) : null, pos ? Math.round(pos.lon * 1000) : null, radius, cat], enabled: !!pos && online,
    queryFn: async () => { const r = await api.get("/facilities/nearby", { params: { lat: pos.lat, lon: pos.lon, radius_m: radius, categories: cat === "all" ? undefined : cat, limit: 30 } }); idb.put("cache", { key: CACHE_KEY, data: r, savedAt: new Date().toISOString(), pos }).catch(() => {}); return r; },
    staleTime: 5 * 60_000, placeholderData: (p) => p,
  });
  const showCached = !online && cached; const data = online ? q.data : cached?.data;
  const items = useMemo(() => (data?.items || []).filter((i) => cat === "all" || i.category === cat), [data, cat]);
  const partial = (data?.sources || []).some((s) => s.status && s.status !== "ok");
  const points = items.filter((i) => i.latitude != null).map((i, n) => ({ id: i.id || `x${n}`, latitude: i.latitude, longitude: i.longitude, priority: "low", status: "open", label: i.name, source: "gps", accuracy_m: 5 }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8 animate-rise">
      <PageHeader center title={t("nearby.title")} actions={<Button variant="outline" size="sm" icon={LocateFixed} onClick={geo.capture} loading={geo.state === "requesting"}>{t("nearby.use_my")}</Button>} />
      <Alert tone="info" className="mb-4">{t("nearby.note")}</Alert>
      {showCached && <Alert tone="warn" className="mb-4">{t("nearby.offline")} {t("nearby.cached", { when: f.rel(cached.savedAt) })}</Alert>}
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label={t("nearby.title")}>
        {CATS.map(([c, I]) => (<button key={c} role="tab" aria-selected={cat === c} onClick={() => setCat(c)} className={cn("inline-flex shrink-0 items-center gap-2 rounded-full border px-4 min-h-[40px] text-sm font-medium transition", cat === c ? "border-primary bg-primary text-primary-fg" : "border-line bg-surface text-ink-2 hover:bg-surface-2")}><I className="h-4 w-4" />{L.facility(c)}</button>))}
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Select aria-label={t("nearby.radius")} value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="w-40">{[2000, 5000, 10000, 25000].map((r) => <option key={r} value={r}>{t("nearby.radius")}: {fmtMeters(r)}</option>)}</Select>
        <Segmented value={view} onChange={setView} options={[{ value: "list", label: t("nearby.list"), icon: List }, { value: "map", label: t("nearby.map"), icon: MapIcon }]} label="view" />
      </div>
      {!pos && geo.state !== "requesting" && <EmptyState icon={LocateFixed} title={t("loc.perm.title")} body={geo.state === "denied" ? t("loc.perm.denied") : t("loc.perm.body")} action={<Button onClick={geo.capture}>{t("loc.perm.allow")}</Button>} />}
      {pos && online && q.isLoading && <SkeletonList rows={4} />}
      {pos && online && q.isError && !data && <ErrorState error={q.error} onRetry={q.refetch} title={t("nearby.unavailable")} />}
      {partial && <Alert tone="warn" className="mb-3">{t("nearby.partial")}</Alert>}
      {view === "map" && points.length > 0 && <MapView className="mb-4 h-80" points={points} pin={pos ? { latitude: pos.lat, longitude: pos.lon, accuracy_m: pos.accuracy } : null} cluster fit={false} onSelect={setSel} selectedId={sel} />}
      {data && items.length === 0 && <EmptyState icon={Search} title={t("nearby.empty")} />}
      <ul className="space-y-3">
        {items.map((i, n) => (
          <li key={i.id || n}><Card className={cn("!p-4", sel && sel === (i.id || `x${n}`) && "ring-2 ring-primary/30")}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><h3 className="font-sans text-base font-semibold text-ink">{i.name}</h3><p className="mt-0.5 text-sm text-ink-2">{i.address || "—"}</p></div>
              <span className="shrink-0 text-sm font-semibold text-ink">{t("nearby.distance", { d: fmtMeters(i.distance_m) })}</span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <Badge tone="neutral">{L.facility(i.category)}</Badge>
              <Badge tone={i.verified ? "ok" : "muted"}>{i.verified ? <ShieldCheck className="h-3 w-3" /> : <ShieldQuestion className="h-3 w-3" />}{i.verified ? t("nearby.verified") : t("nearby.unverified")}</Badge>
              <Badge tone="muted">{i.listing_type === "third_party_listing" ? t("nearby.third_party") : t("nearby.directory")}</Badge>
            </div>
            {i.verified && i.verified_at && <p className="mt-2 text-xs text-ink-3">{t("nearby.last_verified", { when: f.date(i.verified_at) })}</p>}
            {i.verified && i.operating_hours && <p className="mt-1 text-xs text-ink-3">{t("nearby.hours")}: {typeof i.operating_hours === "string" ? i.operating_hours : JSON.stringify(i.operating_hours)}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {i.phone ? <Button size="sm" href={`tel:${i.phone}`} icon={Phone}>{t("act.call")}</Button> : <span className="inline-flex items-center rounded-full bg-surface-3 px-3 text-xs text-ink-3 min-h-[36px]">{t("nearby.no_phone")}</span>}
              <Button size="sm" variant="outline" href={mapsDirectionsUrl(i.latitude, i.longitude)} target="_blank" rel="noreferrer noopener" icon={Navigation}>{t("act.directions")}</Button>
            </div>
          </Card></li>))}
      </ul>
    </div>
  );
}
