import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCw } from "lucide-react";
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Select, SkeletonList, useToast } from "../../components/ui";
import { Refresh } from "../../components/staff";
import { useI18n } from "../../i18n";
import { useAuth } from "../../auth/AuthProvider";
import { can } from "../../auth/permissions";
import { api } from "../../api/client";
import { friendlyError } from "../../api/errors";
import { useFormat } from "../../lib/format";

const TONE = { delivered: "ok", provider_accepted: "info", queued: "muted", sending: "info", failed: "danger" };
export default function OpsNotifications() {
  const { t, has } = useI18n(); const f = useFormat(); const toast = useToast(); const qc = useQueryClient(); const { user } = useAuth(); const [st, setSt] = useState("");
  const q = useQuery({ queryKey: ["ops", "notifications", st], queryFn: () => api.get("/operations/notifications", { params: { status: st || undefined, limit: 100 } }) });
  const retry = useMutation({ mutationFn: (id) => api.post(`/operations/notifications/${id}/retry`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["ops", "notifications"] }), onError: (e) => toast.err(friendlyError(e, { t, has })) });
  return (
    <div className="mx-auto max-w-5xl animate-rise">
      <PageHeader title={t("ops.nav.notifications")} subtitle={t("ops.notif.sub")} actions={<><Select aria-label="status" value={st} onChange={(e) => setSt(e.target.value)}><option value="">{t("ops.f.status")}</option>{["queued", "sending", "provider_accepted", "delivered", "failed"].map((s) => <option key={s} value={s}>{s}</option>)}</Select><Refresh onClick={() => q.refetch()} loading={q.isFetching} /></>} />
      {q.isLoading ? <SkeletonList /> : q.isError ? <ErrorState error={q.error} onRetry={q.refetch} /> : !q.data.items.length ? <Card><EmptyState title={t("state.empty")} /></Card> : (
        <ul className="space-y-2">{q.data.items.map((j) => <li key={j.id}><Card className="!p-4"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm"><span className="font-medium">{j.kind}</span> · {j.channel} → <span className="font-mono">{j.recipient}</span></span><Badge tone={TONE[j.status] || "muted"} dot>{j.status}</Badge></div>
          <p className="mt-1 text-xs text-ink-3">{j.provider || "—"} · {j.attempts}/{j.max_attempts} · {f.dateTime(j.created_at)}{j.error ? ` · ${j.error}` : ""}</p>{j.meaning && <p className="mt-1 text-xs text-ink-2">{j.meaning}</p>}
          {j.status === "failed" && can(user, "notifications.retry") && <Button size="sm" variant="outline" className="mt-2" icon={RotateCw} loading={retry.isPending && retry.variables === j.id} onClick={() => retry.mutate(j.id)}>{t("act.retry")}</Button>}</Card></li>)}</ul>)}
    </div>
  );
}
