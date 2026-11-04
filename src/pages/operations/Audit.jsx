import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { Alert, Badge, Button, Card, EmptyState, ErrorState, PageHeader, Select, SkeletonList, TextInput } from "../../components/ui";
import { Refresh } from "../../components/staff";
import { useI18n } from "../../i18n";
import { useAuth } from "../../auth/AuthProvider";
import { can } from "../../auth/permissions";
import { api } from "../../api/client";
import { useFormat } from "../../lib/format";

export default function Audit() {
  const { t } = useI18n(); const f = useFormat(); const { user } = useAuth(); const [cat, setCat] = useState(""); const [action, setAction] = useState(""); const [page, setPage] = useState(0); const [verify, setVerify] = useState(null); const [vBusy, setVBusy] = useState(false);
  const q = useQuery({ queryKey: ["ops", "audit", cat, action, page], queryFn: () => api.get("/admin/audit-events", { params: { category: cat || undefined, action: action || undefined, limit: 50, offset: page * 50 } }), placeholderData: (p) => p });
  const runVerify = async () => { setVBusy(true); try { setVerify(await api.get("/admin/audit-events/verify")); } catch { setVerify({ error: true }); } finally { setVBusy(false); } };
  return (
    <div className="mx-auto max-w-6xl animate-rise">
      <PageHeader title={t("ops.nav.audit")} subtitle={t("ops.audit.sub")} actions={<>{can(user, "audit.verify") && <Button variant="outline" size="sm" icon={ShieldCheck} loading={vBusy} onClick={runVerify}>{t("ops.audit.verify")}</Button>}<Refresh onClick={() => q.refetch()} loading={q.isFetching} /></>} />
      {verify && <Alert tone={verify.error ? "danger" : verify.ok || verify.valid ? "ok" : "warn"} className="mb-4">{verify.error ? t("state.error") : <><pre className="whitespace-pre-wrap text-xs">{JSON.stringify(verify, null, 1)}</pre></>}</Alert>}
      <Card className="mb-4 !p-4"><div className="grid gap-3 sm:grid-cols-3"><Select aria-label="category" value={cat} onChange={(e) => { setCat(e.target.value); setPage(0); }}><option value="">{t("ops.audit.category")}</option>{["audit", "security", "access"].map((c) => <option key={c}>{c}</option>)}</Select><TextInput aria-label="action" placeholder={t("ops.audit.action")} value={action} maxLength={80} onChange={(e) => { setAction(e.target.value); setPage(0); }} /></div></Card>
      {q.isLoading ? <SkeletonList /> : q.isError && !q.data ? <ErrorState error={q.error} onRetry={q.refetch} /> : !q.data.items.length ? <Card><EmptyState title={t("state.empty")} /></Card> : (
        <Card className="overflow-x-auto !p-2"><table className="w-full min-w-[720px] text-sm"><thead className="text-left text-xs text-ink-3"><tr><th className="p-2">#</th><th className="p-2">{t("ops.audit.when")}</th><th className="p-2">{t("ops.audit.action")}</th><th className="p-2">{t("ops.audit.actor")}</th><th className="p-2">{t("ops.audit.resource")}</th><th className="p-2">{t("ops.audit.outcome")}</th></tr></thead>
          <tbody>{q.data.items.map((e) => <tr key={`${e.seq}-${e.at}`} className="border-t border-line/70 align-top"><td className="p-2 font-mono text-xs text-ink-3">{e.seq}</td><td className="p-2 whitespace-nowrap">{f.dateTime(e.at)}</td><td className="p-2"><span className="font-mono text-[13px]">{e.action}</span><Badge className="ml-2" tone="muted">{e.category}</Badge>{e.reason && <p className="text-xs text-ink-3">{e.reason}</p>}</td><td className="p-2 text-xs">{e.actor_type}{e.actor_user_id ? ` · ${String(e.actor_user_id).slice(0, 8)}` : ""}</td><td className="p-2 text-xs">{e.resource_type} {e.resource_id ? String(e.resource_id).slice(0, 12) : ""}</td><td className="p-2"><Badge tone={e.outcome === "success" ? "ok" : e.outcome === "denied" || e.outcome === "failure" ? "danger" : "muted"}>{e.outcome}</Badge></td></tr>)}</tbody></table></Card>)}
      <div className="mt-4 flex items-center justify-between"><Button variant="outline" icon={ChevronLeft} disabled={page === 0} onClick={() => setPage(page - 1)}>{t("act.back")}</Button><span className="text-sm text-ink-3">{page + 1}</span><Button variant="outline" disabled={(q.data?.items?.length || 0) < 50} onClick={() => setPage(page + 1)}>{t("act.next")}<ChevronRight className="h-4 w-4" /></Button></div>
    </div>
  );
}
