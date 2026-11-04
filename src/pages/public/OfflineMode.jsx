import QRCodeView from "../../components/emergency/QRCodeView";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Phone, FilePlus2, LocateFixed, UserRound, CloudUpload, RefreshCw, Trash2, Ambulance, WifiOff, TriangleAlert, ChevronRight } from "lucide-react";
import { Alert, Badge, Button, Card, ConfirmDialog, EmptyState, KV, PageHeader, Section } from "../../components/ui";
import { useI18n, useLabels } from "../../i18n";
import { useNet, useOutbox, useTick } from "../../hooks/useNet";
import { useAuth } from "../../auth/AuthProvider";
import { idb, estimateStorage } from "../../offline/idb";
import { removeReport } from "../../offline/outbox";
import { syncNow } from "../../offline/syncManager";
import { syncLabelKey, needsAttention } from "../../offline/protocol";
import { readLastLoc } from "../../components/emergency/LocationCapture";
import { useFormat } from "../../lib/format";
import { fmtCoords, fmtMeters } from "../../lib/geo";
import { NET } from "../../offline/netState";

const EVT = { created: "off.event.created", location: "off.event.location", started: "off.event.started", ok: "off.event.ok", retry: "off.event.retry", rejected: "off.event.rejected", conflict: "off.event.conflict" };

export default function OfflineMode() {
  const { t } = useI18n(); const L = useLabels(); const f = useFormat(); const net = useNet(); const { user } = useAuth(); useTick(20000);
  const { items } = useOutbox(user?.id); const [last, setLast] = useState(null); const [card, setCard] = useState(null); const [nearby, setNearby] = useState(null); const [storage, setStorage] = useState(null); const [del, setDel] = useState(null);
  const [qr, setQr] = useState(null);
  useEffect(() => { if (user?.id) idb.get("card", `qr:${user.id}`).then((r) => setQr(r?.qr || null)).catch(() => {}); }, [user?.id]);
  useEffect(() => { readLastLoc().then(setLast); idb.get("card", user?.id || "none").then((c) => setCard(c || null)).catch(() => {}); idb.get("cache", "nearby:last").then((c) => setNearby(c || null)).catch(() => {}); estimateStorage().then(setStorage); }, [user?.id]);
  const pending = items.filter((r) => r.state !== "SYNCED" && r.state !== "CANCELLED_LOCAL");
  const done = items.filter((r) => r.state === "SYNCED").slice(0, 5);
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8 animate-rise">
      <PageHeader center title={t("off.mode_title")} subtitle={t("off.mode_sub")} />
      {net.net === NET.OFFLINE && <Alert tone="warn" className="mb-4" title={t("off.banner_title")}>{t("off.banner_body")}</Alert>}
      {storage?.ratio > 0.85 && <Alert tone="warn" className="mb-4">{t("off.storage_warn")}</Alert>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Button href="tel:112" variant="danger" size="lg" icon={Phone} className="sm:col-span-2">{t("home.call")}</Button>
        <Button to="/report" size="lg" icon={FilePlus2}>{t("off.create")}</Button>
        <Button to="/location" size="lg" variant="outline" icon={LocateFixed}>{t("off.capture")}</Button>
      </div>
      <p className="mt-2 text-xs text-ink-3">{t("off.call_note")}</p>

      <Section title={t("off.pending")} className="mt-8" actions={pending.length > 0 && <Button size="sm" variant="outline" icon={RefreshCw} onClick={() => syncNow({ force: true })} disabled={net.net === NET.OFFLINE}>{t("act.sync_now")}</Button>}>
        {pending.length === 0 ? <Card><p className="text-sm text-ink-2">{t("home.pending_many", { n: 0 })}</p></Card> : (
          <ul className="space-y-3">{pending.map((r) => (
            <li key={r.clientIncidentId}><Card className="!p-4">
              <div className="flex items-start justify-between gap-3"><div><p className="font-medium text-ink">{L.category(r.draft?.category)}</p><p className="text-xs text-ink-3">{f.dateTime(r.createdAt)}</p></div><Badge tone={needsAttention(r) ? "danger" : "info"} dot>{t(syncLabelKey(r))}</Badge></div>
              {r.nextTryAt && !r.permanent && <p className="mt-2 text-xs text-ink-3">{t("off.attempts")}: {r.attempts} · {t("off.next_try", { when: f.rel(r.nextTryAt) })}</p>}
              {needsAttention(r) && <p className="mt-2 text-sm text-danger">{t("report.needs_attention")}</p>}
              <details className="mt-2"><summary className="cursor-pointer text-xs text-ink-3">{t("off.sync_title")}</summary><ol className="mt-2 space-y-1 border-l border-line pl-3 text-xs text-ink-2">{(r.events || []).map((e, i) => <li key={i}>{f.dateTime(e.at)} · {t(EVT[e.type] || "off.event.waiting")}</li>)}</ol></details>
              <div className="mt-3 flex gap-2"><Button size="sm" variant="outline" to={`/report/done/${r.clientIncidentId}`}>{t("act.view")}</Button><Button size="sm" variant="dangerSoft" icon={Trash2} onClick={() => setDel(r)}>{t("act.delete")}</Button></div>
            </Card></li>))}</ul>)}
      </Section>
      {done.length > 0 && <Section title={t("off.submitted_c")} className="mt-6"><ul className="space-y-2">{done.map((r) => <li key={r.clientIncidentId}><Link to={`/report/done/${r.clientIncidentId}`} className="flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3 text-sm hover:bg-surface-2"><span className="font-mono">{r.serverIncidentId}</span><ChevronRight className="h-4 w-4 text-ink-3" /></Link></li>)}</ul></Section>}

      <Section title={t("off.profile")} className="mt-8">
        {card?.card ? (<Card><Alert tone="info" className="mb-3">{t("off.card_stale")} · {t("off.cached", { when: f.rel(card.savedAt) })}</Alert><dl><KV k={t("auth.full_name")} v={card.card.display_name} />{card.card.preferred_language && <KV k={t("ep.lang")} v={card.card.preferred_language} />}{card.card.blood_group && <KV k={t("ep.blood")} v={card.card.blood_group} />}{card.card.allergies && <KV k={t("ep.allergies")} v={[].concat(card.card.allergies).join(", ")} />}{card.card.emergency_notes && <KV k={t("ep.notes")} v={card.card.emergency_notes} />}</dl></Card>)
          : <Card><p className="text-sm text-ink-2">{t("off.no_card")}</p></Card>}
        {qr?.text && <Card className="mt-3 grid place-items-center gap-2 text-center"><h3 className="text-base">{t("qr.saved_title")}</h3><QRCodeView text={qr.text} size={240} /><p className="text-xs text-ink-3">{t("qr.saved_on", { when: f.dateTime(qr.savedAt) })}</p></Card>}
      </Section>
      <Section title={t("off.last_loc")} className="mt-6">
        {last ? <Card><dl><KV k={t("loc.coordinates")} v={fmtCoords(last.latitude, last.longitude)} mono /><KV k={t("loc.accuracy_label")} v={fmtMeters(last.accuracyMeters)} /><KV k={t("loc.captured_at")} v={f.dateTime(last.capturedAt)} />{last.postcode && <KV k={t("loc.pc.value")} v={last.postcode} mono />}</dl><p className="mt-2 text-xs text-warn">{t("off.not_current")}</p></Card> : <EmptyState icon={LocateFixed} title={t("state.empty")} />}
      </Section>
      <Section title={t("nearby.saved_help")} className="mt-6">
        {nearby?.data?.items?.length ? <Card><p className="mb-2 text-xs text-ink-3">{t("nearby.cached", { when: f.rel(nearby.savedAt) })}</p><ul className="divide-y divide-line/70">{nearby.data.items.slice(0, 8).map((i, n) => <li key={n} className="flex items-center justify-between gap-3 py-2.5 text-sm"><span className="min-w-0"><span className="block truncate font-medium text-ink">{i.name}</span><span className="text-xs text-ink-3">{L.facility(i.category)} · {fmtMeters(i.distance_m)}</span></span>{i.phone && <a href={`tel:${i.phone}`} className="shrink-0 rounded-full bg-surface-3 px-3 py-1.5 text-xs font-semibold">{t("act.call")}</a>}</li>)}</ul></Card>
          : <Card><p className="text-sm text-ink-2">{t("nearby.empty")} <Link className="underline" to="/nearby">{t("nav.nearby")}</Link></p></Card>}
      </Section>
      <ConfirmDialog open={!!del} danger title={t("off.delete_local")} body={t("off.delete_local_confirm")} onClose={() => setDel(null)} onConfirm={async () => { await removeReport(del.clientIncidentId); setDel(null); }} />
    </div>
  );
}
