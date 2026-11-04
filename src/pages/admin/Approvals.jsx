import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { Alert, Badge, Button, Card, EmptyState, ErrorState, PageHeader, Select, SkeletonList, useToast } from "../../components/ui";
import { ReasonModal, Refresh } from "../../components/staff";
import { useReauth } from "../../components/staff/Reauth";
import { useI18n } from "../../i18n";
import { useAuth } from "../../auth/AuthProvider";
import { can } from "../../auth/permissions";
import { api } from "../../api/client";
import { friendlyError } from "../../api/errors";
import { useFormat } from "../../lib/format";

const TONE = { pending: "warn", approved: "ok", rejected: "danger", expired: "muted" };
export default function Approvals() {
  const { t, has } = useI18n(); const f = useFormat(); const toast = useToast(); const qc = useQueryClient(); const { user } = useAuth(); const { run, dialog } = useReauth(); const [status, setStatus] = useState("pending"); const [m, setM] = useState(null);
  const q = useQuery({ queryKey: ["admin", "approvals", status], queryFn: () => api.get("/admin/approvals", { params: { status: status || undefined } }) });
  const decide = useMutation({ mutationFn: ({ id, approve, note }) => run(() => api.post(`/admin/approvals/${id}/decision`, { approve, note: note || null })), onSuccess: () => { setM(null); qc.invalidateQueries({ queryKey: ["admin"] }); toast.ok(t("admin.saved")); }, onError: (e) => { if (!e?.cancelled) toast.err(friendlyError(e, { t, has })); setM(null); } });
  const canDecide = can(user, "approvals.decide");
  return (
    <div className="mx-auto max-w-4xl animate-rise">
      <PageHeader title={t("admin.nav.approvals")} subtitle={t("admin.appr_sub")} actions={<><Select aria-label="status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">{t("admin.status")}</option>{Object.keys(TONE).map((s) => <option key={s}>{s}</option>)}</Select><Refresh onClick={() => q.refetch()} loading={q.isFetching} /></>} />
      <Alert tone="info" className="mb-4">{t("admin.appr_note")}</Alert>
      {q.isLoading ? <SkeletonList /> : q.isError ? <ErrorState error={q.error} onRetry={q.refetch} /> : !q.data.items.length ? <Card><EmptyState title={t("state.empty")} /></Card> : (
        <ul className="space-y-2">{q.data.items.map((a) => { const mine = a.requested_by === user?.id; return <li key={a.id}><Card className="!p-4"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-mono text-[13px]">{a.action}</span><Badge tone={TONE[a.status] || "muted"} dot>{a.status}</Badge></div>
          <p className="mt-1 text-sm text-ink-2">{a.reason}</p><pre className="mt-2 overflow-x-auto rounded-xl bg-surface-2 p-2 text-xs">{JSON.stringify(a.payload, null, 1)}</pre>
          <p className="mt-1 text-xs text-ink-3">{t("admin.expires", { when: f.rel(a.expires_at) })}</p>
          {a.status === "pending" && canDecide && (mine ? <p className="mt-2 text-xs text-ink-3">{t("admin.own_request")}</p> : <div className="mt-3 flex gap-2"><Button size="sm" icon={Check} onClick={() => setM({ id: a.id, approve: true })}>{t("admin.approve")}</Button><Button size="sm" variant="outline" icon={X} onClick={() => setM({ id: a.id, approve: false })}>{t("admin.reject")}</Button></div>)}</Card></li>; })}</ul>)}
      <ReasonModal open={!!m} title={m?.approve ? t("admin.approve") : t("admin.reject")} min={0} label={t("ops.reason_optional")} loading={decide.isPending} danger={m && !m.approve} onClose={() => setM(null)} onSubmit={(note) => decide.mutate({ ...m, note })} />
      {dialog}
    </div>
  );
}
