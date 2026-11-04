import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Select, SkeletonList, useToast } from "../../components/ui";
import { ReasonModal, Refresh } from "../../components/staff";
import { useReauth } from "../../components/staff/Reauth";
import { useI18n } from "../../i18n";
import { api } from "../../api/client";
import { friendlyError } from "../../api/errors";
import { useFormat } from "../../lib/format";

const TONE = { received: "info", in_progress: "warn", completed: "ok", rejected: "danger" };
export default function PrivacyRequests() {
  const { t, has } = useI18n(); const f = useFormat(); const toast = useToast(); const qc = useQueryClient(); const { run, dialog } = useReauth(); const [status, setStatus] = useState("received"); const [m, setM] = useState(null);
  const q = useQuery({ queryKey: ["admin", "privacy", status], queryFn: () => api.get("/admin/privacy/requests", { params: { status: status || undefined } }) });
  const done = () => { setM(null); qc.invalidateQueries({ queryKey: ["admin", "privacy"] }); toast.ok(t("admin.saved")); };
  const fail = (e) => { if (!e?.cancelled) toast.err(friendlyError(e, { t, has })); setM(null); };
  const fulfil = useMutation({ mutationFn: ({ id, note }) => run(() => api.post(`/admin/privacy/requests/${id}/fulfil`, { note: note || null })), onSuccess: done, onError: fail });
  const reject = useMutation({ mutationFn: ({ id, notes }) => api.post(`/admin/privacy/requests/${id}/reject`, { notes }), onSuccess: done, onError: fail });
  return (
    <div className="mx-auto max-w-4xl animate-rise">
      <PageHeader title={t("admin.nav.privacy")} subtitle={t("admin.priv_sub")} actions={<><Select aria-label="status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">{t("admin.status")}</option>{Object.keys(TONE).map((s) => <option key={s}>{s}</option>)}</Select><Refresh onClick={() => q.refetch()} loading={q.isFetching} /></>} />
      {q.isLoading ? <SkeletonList /> : q.isError ? <ErrorState error={q.error} onRetry={q.refetch} /> : !q.data.items.length ? <Card><EmptyState title={t("state.empty")} /></Card> : (
        <ul className="space-y-2">{q.data.items.map((r) => { const open = r.status === "received" || r.status === "in_progress"; return <li key={r.id}><Card className="!p-4"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium capitalize">{r.type}</span><Badge tone={TONE[r.status] || "muted"} dot>{r.status}</Badge></div>
          <p className="mt-1 text-xs text-ink-3">{f.dateTime(r.created_at)}{r.due_at ? ` · ${t("admin.due", { when: f.date(r.due_at) })}` : ""} · {r.user_id ? String(r.user_id).slice(0, 8) : "—"}</p>
          {open && <div className="mt-3 flex gap-2"><Button size="sm" onClick={() => setM({ k: "fulfil", id: r.id })}>{t("admin.fulfil")}</Button><Button size="sm" variant="outline" onClick={() => setM({ k: "reject", id: r.id })}>{t("admin.reject")}</Button></div>}</Card></li>; })}</ul>)}
      <ReasonModal open={!!m} title={m?.k === "fulfil" ? t("admin.fulfil") : t("admin.reject")} min={m?.k === "reject" ? 3 : 0} loading={fulfil.isPending || reject.isPending} onClose={() => setM(null)} onSubmit={(note) => m.k === "fulfil" ? fulfil.mutate({ id: m.id, note }) : reject.mutate({ id: m.id, notes: note })} />
      {dialog}
    </div>
  );
}
