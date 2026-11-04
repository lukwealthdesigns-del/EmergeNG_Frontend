import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, CloudUpload } from "lucide-react";
import { Alert, Badge, Button, Card, EmptyState, ErrorState, PageHeader, Segmented, SkeletonList } from "../../components/ui";
import { useI18n, useLabels } from "../../i18n";
import { useAuth } from "../../auth/AuthProvider";
import { useNet, useOutbox } from "../../hooks/useNet";
import { api } from "../../api/client";
import { qk } from "../../lib/queryClient";
import { useFormat } from "../../lib/format";
import { STATUS_TONE, isOpen } from "../../lib/enums";
import { syncLabelKey } from "../../offline/protocol";
import { NET } from "../../offline/netState";

export default function Incidents() {
  const { t } = useI18n(); const L = useLabels(); const f = useFormat(); const { user } = useAuth(); const net = useNet(); const [tab, setTab] = useState("active"); const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: qk.incidentsMine(page), queryFn: () => api.get("/incidents/mine", { params: { page, page_size: 20 } }), placeholderData: (p) => p });
  const { items: local } = useOutbox(user.id); const pend = local.filter((r) => !["SYNCED", "CANCELLED_LOCAL"].includes(r.state));
  const all = q.data?.items || []; const items = all.filter((i) => (tab === "all" ? true : tab === "active" ? isOpen(i.status) : !isOpen(i.status)));
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8 animate-rise">
      <PageHeader title={t("inc.title")} actions={<Button to="/report" size="sm">{t("home.report")}</Button>} />
      <Segmented value={tab} onChange={setTab} label={t("inc.title")} options={[{ value: "active", label: t("inc.active") }, { value: "past", label: t("inc.past") }, { value: "all", label: t("inc.all") }]} />
      {net.net === NET.OFFLINE && <Alert tone="warn" className="mt-4">{t("inc.offline_note")}</Alert>}
      {pend.length > 0 && <div className="mt-4 space-y-2">{pend.map((r) => <Link key={r.clientIncidentId} to={`/report/done/${r.clientIncidentId}`} className="flex items-center justify-between gap-3 rounded-2xl border border-info/30 bg-info-soft px-4 py-3"><span className="flex items-center gap-2 text-sm"><CloudUpload className="h-4 w-4 text-info" />{L.category(r.draft?.category)} · {f.rel(r.createdAt)}</span><Badge tone="info">{t("inc.local")} · {t(syncLabelKey(r))}</Badge></Link>)}</div>}
      <div className="mt-4">{q.isLoading ? <SkeletonList /> : q.isError && !q.data ? <ErrorState error={q.error} onRetry={q.refetch} /> : items.length === 0 ? <Card><EmptyState icon={ClipboardList} title={t("inc.empty")} /></Card> : (
        <ul className="space-y-2">{items.map((i) => <li key={i.id}><Link to={`/app/incidents/${i.id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5 hover:bg-surface-2"><span><span className="block font-medium">{L.category(i.category)}</span><span className="font-mono text-xs text-ink-3">{i.reference} · {f.dateTime(i.submitted_at)}</span>{i.demo && <span className="ml-2 text-xs text-warn">DEMO</span>}</span><Badge tone={STATUS_TONE[i.status]} dot>{L.status(i.status)}</Badge></Link></li>)}</ul>)}</div>
      {(page > 1 || all.length === 20) && <div className="mt-4 flex justify-between"><Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>{t("act.back")}</Button><Button variant="outline" disabled={all.length < 20} onClick={() => setPage(page + 1)}>{t("act.next")}</Button></div>}
    </div>
  );
}
