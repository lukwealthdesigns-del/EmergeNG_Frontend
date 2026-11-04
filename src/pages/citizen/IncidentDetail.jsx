import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Share2 } from "lucide-react";
import { Alert, Badge, Button, Card, ConfirmDialog, ErrorState, KV, PageHeader, SkeletonList, TextArea, useToast } from "../../components/ui";
import { BackLink, Freshness } from "../../components/common/bits";
import MapView from "../../components/maps/MapView";
import { useI18n, useLabels } from "../../i18n";
import { api } from "../../api/client";
import { friendlyError } from "../../api/errors";
import { qk } from "../../lib/queryClient";
import { useFormat } from "../../lib/format";
import { fmtCoords, fmtMeters } from "../../lib/geo";
import { STATUS_TONE, isOpen } from "../../lib/enums";

export default function IncidentDetail() {
  const { id } = useParams(); const { t, has } = useI18n(); const L = useLabels(); const f = useFormat(); const toast = useToast(); const qc = useQueryClient();
  const q = useQuery({ queryKey: qk.incident(id), queryFn: () => api.get(`/incidents/${id}`), refetchInterval: (d) => (d?.state?.data && isOpen(d.state.data.status) ? 30000 : false) });
  const [cancel, setCancel] = useState(false); const [reason, setReason] = useState("");
  const cancelM = useMutation({ mutationFn: () => api.post(`/incidents/${id}/cancel`, { reason: reason || null }), onSuccess: () => { setCancel(false); qc.invalidateQueries({ queryKey: qk.incident(id) }); qc.invalidateQueries({ queryKey: ["incidents"] }); }, onError: (e) => toast.err(friendlyError(e, { t, has })) });
  if (q.isLoading) return <div className="mx-auto max-w-2xl p-6"><SkeletonList /></div>;
  if (q.isError) return <div className="mx-auto max-w-2xl p-6"><ErrorState error={q.error} onRetry={q.refetch} /></div>;
  const r = q.data; const loc = r.location;
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8 animate-rise">
      <PageHeader back={<BackLink to="/app/incidents">{t("inc.title")}</BackLink>} title={L.category(r.category)} subtitle={<span className="font-mono">{r.reference}</span>} actions={<Badge tone={STATUS_TONE[r.status]} dot>{L.status(r.status)}</Badge>} />
      {r.demo && <Alert tone="warn" className="mb-4">{t("inc.simulated")}</Alert>}
      <Card><p className="text-ink">{r.status_message}</p><p className="mt-2 text-sm text-ink-2">{r.response_confirmed ? t("inc.response_confirmed") : t("inc.no_response")}</p><div className="mt-2"><Freshness at={new Date(q.dataUpdatedAt).toISOString()} /></div></Card>
      {loc && (<Card className="mt-4"><h2 className="mb-3 text-lg">{t("inc.location")}</h2>{loc.latitude != null && <MapView className="mb-3 h-52" pin={{ latitude: loc.latitude, longitude: loc.longitude, accuracy_m: loc.accuracy_m }} interactive />}
        <dl><KV k={t("loc.coordinates")} v={loc.latitude != null ? fmtCoords(loc.latitude, loc.longitude) : "—"} mono /><KV k={t("loc.accuracy_label")} v={`${fmtMeters(loc.accuracy_m)} · ${L.accuracy(loc.accuracy_class)}`} /><KV k={t("loc.pc.value")} v={loc.postcode || L.postcode(loc.postcode_status)} mono /><KV k={t("src.title")} v={L.source(loc.source)} />{loc.address_text && <KV k={t("loc.share.address")} v={loc.address_text} />}</dl></Card>)}
      <Card className="mt-4"><h2 className="mb-2 text-lg">{t("inc.timeline")}</h2><p className="mb-2 text-xs text-ink-3">{t("inc.captured_received", { a: f.dateTime(loc?.captured_at), b: f.dateTime(r.received_by_operations_at || r.submitted_at) })}</p>
        <ol className="space-y-3 border-l border-line pl-4">{(r.timeline || []).map((e, i) => <li key={i}><p className="text-sm text-ink">{L.status(e.to)}{e.simulated && <span className="ml-2 text-xs text-warn">({t("inc.simulated")})</span>}</p><p className="text-xs text-ink-3">{f.dateTime(e.at)}</p>{e.message && <p className="text-sm text-ink-2">{e.message}</p>}</li>)}</ol></Card>
      <p className="mt-4 text-xs text-ink-3">{r.emergency_notice}</p>
      {isOpen(r.status) && <Button variant="dangerSoft" icon={Ban} className="mt-4" onClick={() => setCancel(true)}>{t("inc.cancel")}</Button>}
      <ConfirmDialog open={cancel} danger title={t("inc.cancel")} body={<span className="block"><span className="mb-3 block">{t("inc.cancel_confirm")}</span><TextArea label={t("inc.cancel_reason")} optional rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} /></span>} loading={cancelM.isPending} onClose={() => setCancel(false)} onConfirm={() => cancelM.mutate()} />
    </div>
  );
}
