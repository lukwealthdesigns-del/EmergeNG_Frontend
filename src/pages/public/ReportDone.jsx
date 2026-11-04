import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { CheckCircle2, CloudUpload, TriangleAlert, Copy, Phone, RefreshCw, Trash2 } from "lucide-react";
import { Alert, Badge, Button, Card, ConfirmDialog, KV, SkeletonList, useToast } from "../../components/ui";
import { useI18n, useLabels } from "../../i18n";
import { useFormat } from "../../lib/format";
import { getReport, removeReport, subscribeOutbox } from "../../offline/outbox";
import { syncNow } from "../../offline/syncManager";
import { syncLabelKey, needsAttention } from "../../offline/protocol";
import { useNet, useTick } from "../../hooks/useNet";

/** Honest outcome page. Wording never claims dispatch; "submitted" appears only after a server-confirmed reference. */
export default function ReportDone() {
  const { id } = useParams(); const { t } = useI18n(); const L = useLabels(); const f = useFormat(); const toast = useToast(); const loc = useLocation(); const net = useNet(); useTick(20000);
  const [rec, setRec] = useState(loc.state?.record || null); const [loading, setLoading] = useState(!loc.state?.record); const [del, setDel] = useState(false);
  useEffect(() => { let live = true; const load = () => getReport(id).then((r) => { if (live && r) setRec(r); }).catch(() => {}).finally(() => live && setLoading(false)); load(); const un = subscribeOutbox(load); return () => { live = false; un(); }; }, [id]);
  if (loading) return <div className="mx-auto max-w-xl p-6"><SkeletonList rows={3} /></div>;
  if (!rec) return <div className="mx-auto max-w-xl p-6"><Alert tone="warn">{t("inc.empty")}</Alert><Button to="/" className="mt-4">{t("report.go_home")}</Button></div>;
  const synced = rec.state === "SYNCED"; const attention = needsAttention(rec);
  const copy = async (s) => { try { await navigator.clipboard.writeText(s); toast.ok(t("act.copied")); } catch { /* ignore */ } };
  const delay = rec.offlineDelaySeconds != null ? Math.round(rec.offlineDelaySeconds / 60) : null;
  return (
    <div className="mx-auto max-w-xl px-4 py-8 animate-rise">
      <div className="text-center">
        <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${synced ? "bg-ok-soft" : attention ? "bg-danger-soft" : "bg-info-soft"}`}>
          {synced ? <CheckCircle2 className="h-8 w-8 text-ok" /> : attention ? <TriangleAlert className="h-8 w-8 text-danger" /> : <CloudUpload className="h-8 w-8 text-info" />}</div>
        <h1 className="text-2xl sm:text-3xl">{synced ? t("report.submitted") : attention ? t("report.needs_attention") : rec.state === "SYNCING" ? t("net.syncing") : t("report.saved_local")}</h1>
        {!synced && !attention && <p className="mt-2 text-ink-2">{t("report.saved_local_sub")}</p>}
        {attention && <p className="mt-2 text-ink-2">{t(rec.state === "SYNC_CONFLICT" ? "off.conflict" : "report.retry_soon")}</p>}
      </div>
      <Card className="mt-6">
        <div className="mb-2 flex items-center justify-between"><span className="text-sm text-ink-3">{t("report.status_now")}</span><Badge tone={synced ? "ok" : attention ? "danger" : "info"} dot>{synced ? L.status(rec.serverStatus || "submitted") : t(syncLabelKey(rec))}</Badge></div>
        <dl>
          {synced && <KV k={t("report.reference")} v={<span className="inline-flex items-center gap-2 font-mono">{rec.serverIncidentId}<button aria-label={t("act.copy")} onClick={() => copy(rec.serverIncidentId)}><Copy className="h-4 w-4 text-ink-3" /></button></span>} />}
          <KV k={t("report.captured_at")} v={f.dateTime(rec.draft?.capturedAt || rec.createdAt)} />
          {synced && <KV k={t("report.received_at")} v={f.dateTime(rec.serverReceivedAt)} />}
          {!synced && rec.nextTryAt && <KV k={t("off.attempts")} v={`${rec.attempts || 0} · ${t("off.next_try", { when: f.dateTime(rec.nextTryAt) })}`} />}
        </dl>
        {synced && delay > 1 && <p className="mt-3 text-sm text-ink-2">{t("report.offline_delay", { mins: delay })}</p>}
        {synced && <p className="mt-3 text-sm text-ink-2">{t("report.awaiting_review")}</p>}
      </Card>
      {synced && rec.trackingToken && (
        <Alert tone="warn" className="mt-4" title={t("report.tracking")}><p className="break-all font-mono text-sm text-ink">{rec.trackingToken}</p><p className="mt-1">{t("report.tracking_note")}</p><Button size="sm" variant="outline" className="mt-2" icon={Copy} onClick={() => copy(rec.trackingToken)}>{t("act.copy")}</Button></Alert>)}
      {!synced && (<div className="mt-4 flex flex-wrap gap-2">{!attention || rec.state === "SYNC_FAILED" ? <Button icon={RefreshCw} variant="outline" onClick={() => syncNow({ force: true })} disabled={net.net === "OFFLINE"}>{t("act.sync_now")}</Button> : null}<Button variant="dangerSoft" icon={Trash2} onClick={() => setDel(true)}>{t("off.delete_local")}</Button></div>)}
      <Card className="mt-6"><h2 className="text-lg">{t("report.what_next")}</h2><ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-ink-2"><li>{t("report.next_1")}</li><li>{t("report.next_2")}</li><li className="font-medium text-ink">{t("report.next_3")}</li></ol></Card>
      <div className="mt-6 flex flex-wrap justify-center gap-2"><Button href="tel:112" variant="danger" icon={Phone}>{t("home.call")}</Button><Button to="/report" variant="outline">{t("report.another")}</Button><Button to="/" variant="ghost">{t("report.go_home")}</Button></div>
      <p className="mt-4 text-center text-xs text-ink-3">{t("off.call_note")}</p>
      <ConfirmDialog open={del} danger title={t("off.delete_local")} body={t("off.delete_local_confirm")} onClose={() => setDel(false)} onConfirm={async () => { await removeReport(rec.clientIncidentId); window.location.assign("/"); }} />
    </div>
  );
}
