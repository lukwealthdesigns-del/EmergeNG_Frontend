import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Badge, Button, Card, ErrorState, PageHeader, SkeletonList, TextInput, Toggle, useToast } from "../../components/ui";
import { ReasonModal, Refresh } from "../../components/staff";
import { useReauth, isApprovalRequired } from "../../components/staff/Reauth";
import { useI18n } from "../../i18n";
import { api } from "../../api/client";
import { friendlyError } from "../../api/errors";

const SKIP = new Set(["auth.require_email_verification", "auth.require_phone_verification", "integrations.disabled"]); // verification: Security page; integrations.disabled: Integrations page
const coerce = (orig, raw) => Array.isArray(orig) ? raw.split(/[\s,]+/).filter(Boolean) : typeof orig === "number" ? (raw.trim() === "" || !/^\d+$/.test(raw.trim()) ? NaN : Number(raw)) : raw;

export default function ConfigSettings() {
  const { t, has } = useI18n(); const toast = useToast(); const qc = useQueryClient(); const { run, dialog } = useReauth(); const [draft, setDraft] = useState({}); const [m, setM] = useState(null);
  const q = useQuery({ queryKey: ["admin", "settings"], queryFn: () => api.get("/admin/settings") });
  const save = useMutation({ mutationFn: ({ key, value, reason }) => run(() => api.put(`/admin/settings/${key}`, { value, reason })),
    onSuccess: (r, v) => { toast.ok(isApprovalRequired(r) ? t("admin.approval_requested") : t("admin.saved")); setDraft((d) => { const n = { ...d }; delete n[v.key]; return n; }); setM(null); qc.invalidateQueries({ queryKey: ["admin", "settings"] }); },
    onError: (e) => { if (!e?.cancelled) toast.err(friendlyError(e, { t, has })); setM(null); } });
  const items = (q.data?.items || []).filter((i) => !SKIP.has(i.key));
  return (
    <div className="mx-auto max-w-3xl animate-rise">
      <PageHeader title={t("admin.nav.settings")} subtitle={t("admin.cfg_sub")} actions={<Refresh onClick={() => q.refetch()} loading={q.isFetching} />} />
      <Alert tone="info" className="mb-4">{t("admin.cfg_note")}</Alert>
      {q.isLoading ? <SkeletonList /> : q.isError ? <ErrorState error={q.error} onRetry={q.refetch} /> : (
        <div className="space-y-3">{items.map((i) => { const drafted = i.key in draft; const raw = drafted ? draft[i.key] : Array.isArray(i.value) ? i.value.join(", ") : String(i.value); const val = typeof i.value === "boolean" ? i.value : coerce(i.value, raw); const invalid = typeof i.value === "number" && Number.isNaN(val);
          return (<Card key={i.key} className="!p-4"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-mono text-[13px]">{i.key}</span>{i.security_sensitive && <Badge tone="warn">{t("admin.sensitive")}</Badge>}</div><p className="mt-1 text-xs text-ink-3">{i.description}</p>
            <div className="mt-3">{typeof i.value === "boolean" ? <Toggle label={String(i.value ? t("state.yes") : t("state.no"))} checked={i.value} onChange={(v) => setM({ key: i.key, value: v })} /> : (<div className="flex flex-wrap items-end gap-2"><TextInput className="min-w-[200px] flex-1" aria-label={i.key} inputMode={typeof i.value === "number" ? "numeric" : "text"} maxLength={400} value={raw} error={invalid ? t("val.coord") : ""} onChange={(e) => setDraft({ ...draft, [i.key]: e.target.value })} /><Button size="sm" disabled={!drafted || invalid || raw === (Array.isArray(i.value) ? i.value.join(", ") : String(i.value))} onClick={() => setM({ key: i.key, value: val })}>{t("act.save")}</Button></div>)}</div></Card>); })}</div>)}
      <ReasonModal open={!!m} title={m?.key || ""} loading={save.isPending} onClose={() => setM(null)} onSubmit={(reason) => save.mutate({ ...m, reason })} />
      {dialog}
    </div>
  );
}
