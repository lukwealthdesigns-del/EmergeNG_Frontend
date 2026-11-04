import { useCallback, useEffect, useRef, useState } from "react";
import { Crosshair, LocateFixed, Loader2, Search, MapPin, RotateCcw, ShieldAlert, Bookmark } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button, Alert, TextInput, TextArea, KV, Badge } from "../ui";
import MapView, { MapFallback } from "../maps/MapView";
import { useI18n, useLabels } from "../../i18n";
import { useGeoCapture } from "../../hooks/useGeoCapture";
import { useNet } from "../../hooks/useNet";
import { useAuth } from "../../auth/AuthProvider";
import { NET } from "../../offline/netState";
import { api } from "../../api/client";
import { idb } from "../../offline/idb";
import { LAST_LOC_KEY } from "../../lib/constants";
import { accuracyClass, fmtCoords, fmtMeters, freshness } from "../../lib/geo";
import { useFormat } from "../../lib/format";
import { normalizePostcode, optionalPostcode } from "../../lib/validators";
import { debounce, cn } from "../../lib/utils";

/** loc model: { latitude, longitude, accuracyMeters, capturedAt, source: gps|manual|geocoded|saved_location, manuallyCorrected, originalGps, postcode, postcodeStatus, addressText } */
export const saveLastLoc = (loc) => idb.put("meta", { key: LAST_LOC_KEY, loc }).catch(() => {});
export const readLastLoc = () => idb.get("meta", LAST_LOC_KEY).then((r) => r?.loc || null).catch(() => null);

export default function LocationCapture({ value, onChange, autoStart = false, compact = false, showDescribe = true, mapHeight = "h-72" }) {
  const { t } = useI18n(); const L = useLabels(); const f = useFormat(); const net = useNet(); const { isAuthed } = useAuth();
  const geo = useGeoCapture(); const [mode, setMode] = useState("gps"); const [pcBusy, setPcBusy] = useState(false);
  const online = net.net !== NET.OFFLINE && net.net !== NET.SERVER_UNAVAILABLE;
  const reqId = useRef(0);

  const resolvePostcode = useCallback(async (loc) => {
    if (!online) { onChange({ ...loc, postcodeStatus: loc.postcode ? loc.postcodeStatus : "pending" }); return; }
    const id = ++reqId.current; setPcBusy(true);
    try {
      const r = await api.post("/location/reverse", { latitude: loc.latitude, longitude: loc.longitude, accuracy_m: loc.accuracyMeters ?? undefined }, { timeout: 12000 });
      if (id !== reqId.current) return;
      onChange({ ...loc, postcode: r.postcode?.value || loc.postcode || null, postcodeStatus: r.postcode?.status || "failed", addressText: loc.addressText || r.address?.text || "", addressProvider: r.address?.text || null });
    } catch { if (id === reqId.current) onChange({ ...loc, postcodeStatus: "failed" }); } finally { if (id === reqId.current) setPcBusy(false); }
  }, [online, onChange]);

  // new GPS fix → loc
  useEffect(() => {
    if (!geo.fix) return;
    const loc = { latitude: geo.fix.latitude, longitude: geo.fix.longitude, accuracyMeters: geo.fix.accuracyMeters, capturedAt: geo.fix.capturedAt, source: "gps", manuallyCorrected: false, originalGps: null, postcode: null, postcodeStatus: online ? "pending" : "pending", addressText: value?.addressText || "" };
    onChange(loc); saveLastLoc(loc); resolvePostcode(loc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.fix?.capturedAt, geo.fix?.accuracyMeters]);
  useEffect(() => { if (autoStart && geo.state === "idle" && !value) geo.capture(); }, []); // eslint-disable-line

  const onPinMove = useCallback((lat, lon) => {
    if (!value) return;
    const original = value.originalGps || { latitude: value.latitude, longitude: value.longitude, accuracyMeters: value.accuracyMeters, capturedAt: value.capturedAt };
    const loc = { ...value, latitude: lat, longitude: lon, source: "manual", manuallyCorrected: true, originalGps: original, postcode: null, postcodeStatus: "pending" };
    onChange(loc); saveLastLoc(loc); resolvePostcode(loc);
  }, [value, onChange, resolvePostcode]);
  const resetToGps = () => { if (value?.originalGps) { const g = value.originalGps; const loc = { ...value, ...g, source: "gps", manuallyCorrected: false, originalGps: null, postcode: null, postcodeStatus: "pending" }; onChange(loc); resolvePostcode(loc); } };

  const has = !!value;
  const fr = value ? freshness(value.capturedAt) : "unknown";
  const denied = ["denied", "unavailable", "timeout", "unsupported"].includes(geo.state);

  return (
    <div className="space-y-4">
      {!has && mode === "gps" && (
        <div className="rounded-3xl border border-line bg-surface p-5 text-center sm:p-7">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-3">{geo.state === "requesting" ? <Loader2 className="h-7 w-7 animate-spin text-ink" /> : <LocateFixed className="h-7 w-7 text-ink" />}</div>
          <h2 className="text-xl">{geo.state === "requesting" ? t("loc.capturing") : t("loc.perm.title")}</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-2">{t("loc.perm.body")}</p>
          {denied && <Alert tone="warn" className="mx-auto mt-4 max-w-md text-left">{geo.state === "unsupported" ? t("loc.perm.unsupported") : t("loc.perm.denied")}{geo.state === "denied" && <p className="mt-1 text-ink-3">{t("loc.perm.howto")}</p>}</Alert>}
          <div className="mt-5 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
            <Button size="lg" onClick={geo.capture} loading={geo.state === "requesting"} icon={Crosshair}>{t("loc.perm.allow")}</Button>
            <Button variant="outline" size="lg" onClick={() => setMode("manual")}>{t("loc.manual")}</Button>
          </div>
        </div>)}

      {!has && mode === "manual" && <ManualLocation online={online} onPick={(loc) => { onChange(loc); saveLastLoc(loc); resolvePostcode(loc); }} onBack={() => setMode("gps")} allowSaved={isAuthed} />}

      {has && (<>
        {fr !== "recent" && fr !== "unknown" && <Alert tone="warn">{t("loc.stale", { when: f.rel(value.capturedAt) })}</Alert>}
        <MapView className={mapHeight} pin={{ latitude: value.latitude, longitude: value.longitude, accuracy_m: value.accuracyMeters }} draggable onPinMove={onPinMove} />
        <p className="text-center text-xs text-ink-3">{t("loc.map.adjust")}</p>
        {value.manuallyCorrected && <Alert tone="info" action={value.originalGps && <Button size="sm" variant="outline" icon={RotateCcw} onClick={resetToGps}>{t("loc.map.reset")}</Button>}>{t("loc.map.adjusted")}</Alert>}
        <div className="rounded-3xl border border-line bg-surface p-5">
          <dl>
            <KV k={t("loc.coordinates")} v={fmtCoords(value.latitude, value.longitude)} mono />
            <KV k={t("loc.accuracy_label")} v={<span className="inline-flex items-center gap-2">{fmtMeters(value.accuracyMeters)}<Badge tone={{ excellent: "ok", good: "ok", moderate: "warn", poor: "danger", unknown: "muted" }[accuracyClass(value.accuracyMeters)]}>{L.accuracy(accuracyClass(value.accuracyMeters))}</Badge></span>} />
            <KV k={t("loc.captured_at")} v={f.rel(value.capturedAt)} />
            <KV k={t("loc.pc.value")} v={pcBusy ? <span className="inline-flex items-center gap-1.5 text-ink-3"><Loader2 className="h-3.5 w-3.5 animate-spin" />{t("loc.pc.resolving")}</span> : value.postcode ? <span className="font-mono">{value.postcode}</span> : <span className="text-ink-3">{L.postcode(value.postcodeStatus || "pending")}</span>} />
            {value.addressProvider && <KV k={t("loc.pc.area")} v={value.addressProvider} />}
          </dl>
          {!online && <p className="mt-3 text-xs text-ink-3">{t("loc.pc.offline")}</p>}
          {online && !pcBusy && !value.postcode && value.postcodeStatus && !["pending"].includes(value.postcodeStatus) && (
            <div className="mt-3"><p className="text-xs text-ink-3">{t("loc.pc.failed")}</p><Button size="sm" variant="outline" className="mt-2" onClick={() => resolvePostcode(value)}>{t("loc.pc.retry")}</Button></div>)}
          <p className="mt-3 text-xs text-ink-3">{t("loc.pc.note")}</p>
          {value.accuracyMeters > 100 && <p className="mt-2 text-xs font-medium text-warn">{t("loc.accuracy_poor")}</p>}
          <div className="mt-4 flex flex-wrap gap-2"><Button size="sm" variant="outline" icon={LocateFixed} onClick={() => { geo.reset(); setTimeout(geo.capture, 0); }}>{t("loc.refresh")}</Button></div>
        </div>
        {showDescribe && <TextArea label={t("loc.describe")} optional rows={2} maxLength={300} placeholder={t("loc.describe_ph")} value={value.addressText || ""} onChange={(e) => onChange({ ...value, addressText: e.target.value })} />}
      </>)}
    </div>
  );
}

function ManualLocation({ online, onPick, onBack, allowSaved }) {
  const { t } = useI18n(); const [q, setQ] = useState(""); const [dq, setDq] = useState(""); const [pc, setPc] = useState(""); const [busy, setBusy] = useState(false);
  const deb = useRef(debounce((v) => setDq(v), 450)).current;
  const search = useQuery({ queryKey: ["places-search", dq], enabled: online && dq.trim().length >= 2, queryFn: () => api.get("/location/places/search", { params: { q: dq.trim() } }), staleTime: 5 * 60_000 });
  const saved = useQuery({ queryKey: ["places"], enabled: allowSaved, queryFn: () => api.get("/saved-locations"), staleTime: 60_000 });
  const pcErr = pc ? optionalPostcode(pc) : null;
  const pick = (la, lo, src, text) => onPick({ latitude: la, longitude: lo, accuracyMeters: null, capturedAt: new Date().toISOString(), source: src, manuallyCorrected: src !== "saved_location", originalGps: null, postcode: pc && !pcErr ? normalizePostcode(pc) : null, postcodeStatus: "pending", addressText: text || "" });
  const items = search.data?.results || [];
  const savedItems = saved.data?.items || [];
  return (
    <div className="space-y-4 rounded-3xl border border-line bg-surface p-5">
      <button onClick={onBack} className="text-sm text-ink-2 underline">{t("act.back")}</button>
      <h2 className="text-xl">{t("loc.manual")}</h2>
      {!online && <Alert tone="warn">{t("loc.pc.offline")}</Alert>}
      <div className="relative"><Search className="pointer-events-none absolute left-4 top-[15px] h-[18px] w-[18px] text-ink-3" /><input className="w-full rounded-2xl border border-line bg-surface py-3 pl-11 pr-4 text-ink placeholder:text-ink-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" placeholder={t("loc.manual_address")} value={q} onChange={(e) => { setQ(e.target.value); deb(e.target.value); }} aria-label={t("loc.manual_address")} disabled={!online} /></div>
      {search.isFetching && <p className="text-sm text-ink-3">{t("state.loading")}</p>}
      {search.data?.status && search.data.status !== "ok" && <p className="text-sm text-ink-3">{search.data.note || t("nearby.unavailable")}</p>}
      <ul className="space-y-2">{items.slice(0, 6).map((p, i) => (<li key={i}><button onClick={() => pick(p.latitude, p.longitude, "geocoded", [p.name, p.address].filter(Boolean).join(", "))} className="flex w-full items-start gap-3 rounded-2xl border border-line p-3 text-left hover:bg-surface-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" /><span className="min-w-0 text-sm"><span className="block font-medium text-ink">{p.name}</span><span className="block text-ink-3">{p.address}</span></span></button></li>))}</ul>
      <TextInput label={t("loc.manual_postcode")} optional value={pc} onChange={(e) => setPc(e.target.value.toUpperCase())} placeholder="EK-01-A03-FK-01" error={pcErr && t(pcErr)} autoCapitalize="characters" spellCheck={false} />
      {allowSaved && savedItems.length > 0 && (<div><p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-ink"><Bookmark className="h-4 w-4" />{t("loc.use_saved")}</p><ul className="space-y-2">{savedItems.map((s) => (<li key={s.id}><button onClick={() => pick(s.latitude, s.longitude, "saved_location", s.address_text || s.label)} className="w-full rounded-2xl border border-line p-3 text-left text-sm hover:bg-surface-2"><span className="font-medium text-ink">{s.label}</span><span className="block text-ink-3">{s.address_text}</span></button></li>))}</ul></div>)}
    </div>
  );
}
