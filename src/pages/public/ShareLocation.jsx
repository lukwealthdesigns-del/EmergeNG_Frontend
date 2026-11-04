import { useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Share2, Link2, Check, Phone, FileWarning, Ban } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import LocationCapture from "../../components/emergency/LocationCapture";
import { Alert, Button, Card, PageHeader, Toggle, Select, useToast } from "../../components/ui";
import { Call112 } from "../../components/common/bits";
import { useI18n } from "../../i18n";
import { useAuth } from "../../auth/AuthProvider";
import { useNet } from "../../hooks/useNet";
import { NET } from "../../offline/netState";
import { api } from "../../api/client";
import { friendlyError } from "../../api/errors";
import { fmtCoords, fmtMeters, geoUri } from "../../lib/geo";
import { useFormat } from "../../lib/format";

const mapsLink = (la, lo) => `https://www.google.com/maps?q=${la},${lo}`;

export default function ShareLocation() {
  const { t, has } = useI18n(); const f = useFormat(); const toast = useToast(); const { isAuthed } = useAuth(); const net = useNet(); const qc = useQueryClient();
  const [loc, setLoc] = useState(null); const [incName, setIncName] = useState(false); const [incCb, setIncCb] = useState(false); const [ttl, setTtl] = useState("120"); const [made, setMade] = useState(null); const [copied, setCopied] = useState(false);
  const online = net.net !== NET.OFFLINE && net.net !== NET.SERVER_UNAVAILABLE;
  const text = loc ? `${t("loc.share.text", { coords: fmtCoords(loc.latitude, loc.longitude), acc: fmtMeters(loc.accuracyMeters), pc: loc.postcode || t("loc.card.pc_pending"), time: f.dateTime(loc.capturedAt) })}\n${mapsLink(loc.latitude, loc.longitude)}${loc.addressText ? `\n${loc.addressText}` : ""}` : "";

  const links = useQuery({ queryKey: ["share-links"], enabled: isAuthed && online, queryFn: () => api.get("/location/share"), staleTime: 30_000 });
  const create = useMutation({
    mutationFn: () => api.post("/location/share", { latitude: loc.latitude, longitude: loc.longitude, accuracy_m: loc.accuracyMeters ?? undefined, address_text: loc.addressText || undefined, postcode: loc.postcode || undefined, include_name: incName, include_callback: incCb, ttl_minutes: Number(ttl) }),
    onSuccess: (r) => { setMade(r); qc.invalidateQueries({ queryKey: ["share-links"] }); toast.ok(t("loc.share.created")); },
    onError: (e) => toast.err(friendlyError(e, { t, has })),
  });
  const revoke = useMutation({ mutationFn: (id) => api.del(`/location/share/${id}`), onSuccess: () => { setMade(null); qc.invalidateQueries({ queryKey: ["share-links"] }); toast.ok(t("loc.share.revoked")); }, onError: (e) => toast.err(friendlyError(e, { t, has })) });

  const copy = async (s) => { try { await navigator.clipboard.writeText(s); setCopied(true); setTimeout(() => setCopied(false), 2000); toast.ok(t("act.copied")); } catch { toast.err(t("err.generic")); } };
  const nativeShare = async (s, url) => { try { if (navigator.share) await navigator.share({ title: t("loc.card.title"), text: s, url }); else await copy(s); } catch { /* user cancelled */ } };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8 animate-rise">
      <PageHeader center title={t("loc.title")} subtitle={t("home.share_sub")} />
      <Call112 className="mb-5 w-full sm:w-auto" />
      <LocationCapture value={loc} onChange={setLoc} autoStart />
      {loc && (
        <div className="mt-5 space-y-4">
          <Card>
            <h2 className="text-lg">{t("loc.share.title")}</h2>
            <ul className="mt-2 space-y-1 text-sm text-ink-2"><li>• {t("loc.share.location")}: <span className="font-mono">{fmtCoords(loc.latitude, loc.longitude)}</span></li><li>• {t("loc.share.postcode")}: {loc.postcode || t("loc.card.pc_pending")}</li>{loc.addressText && <li>• {t("loc.share.address")}</li>}<li>• {t("loc.share.time")}</li></ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button icon={Share2} onClick={() => nativeShare(text, mapsLink(loc.latitude, loc.longitude))}>{t("loc.share.native")}</Button>
              <Button variant="outline" icon={copied ? Check : Copy} onClick={() => copy(`${fmtCoords(loc.latitude, loc.longitude)}`)}>{t("loc.share.copy_coords")}</Button>
              <Button variant="outline" href={geoUri(loc.latitude, loc.longitude)}>geo:</Button>
            </div>
          </Card>

          <Card>
            <h2 className="flex items-center gap-2 text-lg"><Link2 className="h-5 w-5 text-ink-2" />{t("loc.share.create")}</h2>
            {!isAuthed ? (<Alert tone="info" className="mt-3" action={<div className="flex gap-2"><Button size="sm" to="/signin">{t("act.signin")}</Button><Button size="sm" variant="outline" to="/signup">{t("act.signup")}</Button></div>}>{t("loc.share.needs_account")}</Alert>)
              : !online ? (<Alert tone="info" className="mt-3">{t("loc.share.offline_link")}</Alert>)
              : made ? (
                <div className="mt-3 space-y-3">
                  <Alert tone="ok" title={t("loc.share.created")}>{t("loc.share.note")}</Alert>
                  <div className="break-all rounded-2xl bg-surface-3 p-3 font-mono text-xs">{made.url}</div>
                  <div className="flex flex-wrap gap-2"><Button icon={Share2} onClick={() => nativeShare(`${text}\n${made.url}`, made.url)}>{t("act.share")}</Button><Button variant="outline" icon={Copy} onClick={() => copy(made.url)}>{t("act.copy")}</Button><Button variant="dangerSoft" icon={Ban} onClick={() => revoke.mutate(made.id)} loading={revoke.isPending}>{t("loc.share.revoke")}</Button></div>
                  <p className="text-xs text-ink-3">{t("loc.share.expiry")}: {f.dateTime(made.expires_at)}</p>
                </div>)
              : (
                <div className="mt-3 space-y-1">
                  <Toggle checked={incName} onChange={setIncName} label={t("loc.share.name")} />
                  <Toggle checked={incCb} onChange={setIncCb} label={t("loc.share.callback")} />
                  <Select label={t("loc.share.expiry")} value={ttl} onChange={(e) => setTtl(e.target.value)}>{["30", "120", "360", "1440"].map((m) => <option key={m} value={m}>{t(`loc.expiry.${m}`)}</option>)}</Select>
                  <div className="pt-3"><Button onClick={() => create.mutate()} loading={create.isPending} icon={Link2}>{t("loc.share.create")}</Button></div>
                </div>)}
            {isAuthed && online && links.data?.items?.filter((l) => !l.revoked_at && new Date(l.expires_at) > new Date()).slice(0, 3).map((l) => (
              <div key={l.id} className="mt-3 flex items-center justify-between rounded-2xl border border-line px-3 py-2 text-sm"><span className="text-ink-2">{t("loc.share.expiry")}: {f.dateTime(l.expires_at)} · {l.views}×</span><button onClick={() => revoke.mutate(l.id)} className="text-danger underline">{t("loc.share.revoke")}</button></div>))}
          </Card>
          <Button to="/report" variant="soft" block icon={FileWarning} state={{ loc }}>{t("loc.share.open_report")}</Button>
        </div>)}
    </div>
  );
}
