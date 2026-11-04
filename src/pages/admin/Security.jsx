import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Badge, Card, EmptyState, ErrorState, PageHeader, Section, SkeletonList, Toggle, useToast } from "../../components/ui";
import { ReasonModal, Refresh } from "../../components/staff";
import { useReauth, isApprovalRequired } from "../../components/staff/Reauth";
import { useI18n } from "../../i18n";
import { useAuth } from "../../auth/AuthProvider";
import { can } from "../../auth/permissions";
import { api } from "../../api/client";
import { friendlyError } from "../../api/errors";
import { useFormat } from "../../lib/format";

export default function Security() {
  const { t, has } = useI18n(); const f = useFormat(); const toast = useToast(); const qc = useQueryClient(); const { user } = useAuth(); const { run, dialog } = useReauth(); const [m, setM] = useState(null);
  const sw = can(user, "auth_settings.manage");
  const flags = useQuery({ queryKey: ["admin", "verification"], enabled: sw, queryFn: () => api.get("/admin/settings/verification") });
  const ev = useQuery({ queryKey: ["admin", "sec-events"], enabled: can(user, "security_events.read"), queryFn: () => api.get("/admin/security-events", { params: { limit: 50 } }) });
  const set = useMutation({ mutationFn: ({ key, value, reason }) => run(() => api.put("/admin/settings/verification", { [key]: value, reason })),
    onSuccess: (r) => { toast.ok(isApprovalRequired(r) ? t("admin.approval_requested") : t("admin.saved")); setM(null); qc.invalidateQueries({ queryKey: ["admin", "verification"] }); },
    onError: (e) => { if (!e?.cancelled) toast.err(friendlyError(e, { t, has })); setM(null); } });
  const d = flags.data;
  return (
    <div className="mx-auto max-w-4xl animate-rise space-y-8">
      <PageHeader title={t("admin.nav.security")} subtitle={t("admin.sec_sub")} actions={<Refresh onClick={() => { flags.refetch(); ev.refetch(); }} loading={flags.isFetching || ev.isFetching} />} />
      {sw && <Section title={t("admin.verification")}>
        {flags.isLoading ? <SkeletonList rows={2} /> : flags.isError ? <ErrorState error={flags.error} onRetry={flags.refetch} /> : (<Card className="space-y-4 !p-5">
          <Toggle label={t("admin.req_email")} hint={d.email_provider_ready ? t("admin.req_email_hint") : t("admin.provider_missing")} checked={d.require_email_verification} disabled={!d.email_provider_ready && !d.require_email_verification} onChange={(v) => setM({ key: "require_email_verification", value: v })} />
          <Toggle label={t("admin.req_phone")} hint={d.sms_provider_ready ? t("admin.req_phone_hint") : t("admin.provider_missing")} checked={d.require_phone_verification} disabled={!d.sms_provider_ready && !d.require_phone_verification} onChange={(v) => setM({ key: "require_phone_verification", value: v })} />
          <p className="text-xs text-ink-3">{t("admin.verification_note")}</p></Card>)}</Section>}
      {can(user, "security_events.read") && <Section title={t("admin.sec_events")}>
        {ev.isLoading ? <SkeletonList /> : ev.isError ? <ErrorState error={ev.error} onRetry={ev.refetch} /> : !ev.data.items.length ? <Card><EmptyState title={t("state.empty")} /></Card> : <Card className="!p-2"><ul className="divide-y divide-line/70">{ev.data.items.map((e) => <li key={e.seq} className="p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-mono text-[13px]">{e.action}</span><Badge tone={e.outcome === "success" ? "ok" : "danger"}>{e.outcome}</Badge></div><p className="text-xs text-ink-3">{f.dateTime(e.at)} · {e.actor_type}{e.reason ? ` · ${e.reason}` : ""}</p></li>)}</ul></Card>}</Section>}
      {!sw && !can(user, "security_events.read") && <Alert tone="warn">{t("sys.403.body")}</Alert>}
      <ReasonModal open={!!m} title={t("admin.verification")} loading={set.isPending} onClose={() => setM(null)} onSubmit={(reason) => set.mutate({ ...m, reason })} />
      {dialog}
    </div>
  );
}
