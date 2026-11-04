import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Power, RotateCcw } from "lucide-react";
import { Alert, Badge, Button, Card, ErrorState, PageHeader, SkeletonList, useToast } from "../../components/ui";
import { ReasonModal, Refresh } from "../../components/staff";
import { useReauth } from "../../components/staff/Reauth";
import { useI18n } from "../../i18n";
import { useAuth } from "../../auth/AuthProvider";
import { can } from "../../auth/permissions";
import { api } from "../../api/client";
import { friendlyError } from "../../api/errors";

const TONE = { ok: "ok", healthy: "ok", no_recent_failures: "ok", degraded: "warn", down: "danger", disabled: "danger", not_configured: "muted" };
const NAME = { nipost: "NIPOST postcodes", mapbox: "Mapbox", google_places: "Google Places", cloudinary: "Cloudinary (photos)", brevo: "Brevo (email)" };

/** Credentials never reach the browser. This page controls whether EmergeNG may call a provider, and lets an admin test it. */
export default function Integrations() {
  const { t, has } = useI18n(); const toast = useToast(); const qc = useQueryClient(); const { user } = useAuth(); const { run, dialog } = useReauth();
  const [m, setM] = useState(null); const [results, setResults] = useState({});
  const q = useQuery({ queryKey: ["admin", "integrations"], enabled: can(user, "integrations.manage") || can(user, "system.health.read"), queryFn: () => api.get("/admin/integrations"), refetchInterval: 60000 });
  const fail = (e) => { if (!e?.cancelled) toast.err(friendlyError(e, { t, has })); setM(null); };
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "integrations"] });
  const toggle = useMutation({ mutationFn: ({ provider, enabled, reason }) => run(() => api.put(`/admin/integrations/${provider}/enabled`, { enabled, reason })), onSuccess: () => { setM(null); toast.ok(t("admin.saved")); refresh(); }, onError: fail });
  const reset = useMutation({ mutationFn: ({ provider, reason }) => api.post(`/admin/integrations/${provider}/reset-circuit`, { reason }), onSuccess: () => { setM(null); toast.ok(t("admin.int_reset_done")); refresh(); }, onError: fail });
  const test = useMutation({ mutationFn: (provider) => api.post(`/admin/integrations/${provider}/test`, {}), onSuccess: (r) => { setResults((x) => ({ ...x, [r.provider]: r })); refresh(); }, onError: (e) => toast.err(friendlyError(e, { t, has })) });
  const manage = !!q.data?.can_manage;
  const label = (p) => NAME[p] || p;
  return (
    <div className="mx-auto max-w-4xl animate-rise">
      <PageHeader title={t("admin.nav.integrations")} subtitle={t("admin.int_sub")} actions={<Refresh onClick={() => q.refetch()} loading={q.isFetching} />} />
      <Alert tone="info" className="mb-4">{t("admin.int_note")}</Alert>
      {q.isLoading ? <SkeletonList /> : q.isError ? <ErrorState error={q.error} onRetry={q.refetch} /> : (<>
        {!manage && <Alert tone="warn" className="mb-4">{t("admin.int_view_only")}</Alert>}
        <div className="grid gap-3 sm:grid-cols-2">{q.data.items.map((p) => { const r = results[p.provider]; return (
          <Card key={p.provider} className="!p-4">
            <div className="flex items-center justify-between gap-2"><span className="font-semibold">{label(p.provider)}</span><Badge tone={TONE[p.state] || "muted"} dot>{p.configured ? p.state.replace(/_/g, " ") : t("ops.not_configured")}</Badge></div>
            <p className="mt-2 text-xs text-ink-3">circuit: {p.circuit} · {t("ops.failures_hour", { n: p.failures_last_hour })}</p>
            <p className="text-xs text-ink-3">ok {p.process_calls_ok} · err {p.process_calls_error}{p.avg_latency_ms ? ` · ${t("admin.int_latency", { ms: p.avg_latency_ms })}` : ""}</p>
            {p.last_error_category && <p className="text-xs text-ink-3">{t("admin.int_last_error", { e: p.last_error_category })}</p>}
            {p.disabled && <Alert tone="danger" className="mt-2">{t("admin.int_disabled_note")}</Alert>}
            {r && <p className={`mt-2 text-sm ${r.probed === false ? "text-ink-2" : r.ok ? "text-ok" : "text-danger"}`} role="status">{r.probed === false ? t("admin.int_test_none") : r.ok ? t("admin.int_test_ok", { ms: r.latency_ms }) : t("admin.int_test_fail", { error: r.error_category || "error" })}</p>}
            {manage && p.configured && <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" icon={Activity} loading={test.isPending && test.variables === p.provider} onClick={() => test.mutate(p.provider)}>{t("admin.int_test")}</Button>
              <Button size="sm" variant={p.disabled ? "primary" : "outline"} icon={Power} onClick={() => setM({ k: "toggle", provider: p.provider, enabled: !!p.disabled })}>{p.disabled ? t("admin.int_enable") : t("admin.int_disable")}</Button>
              {p.circuit !== "closed" && <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => setM({ k: "reset", provider: p.provider })}>{t("admin.int_reset")}</Button>}
            </div>}
          </Card>); })}</div></>)}
      <ReasonModal open={!!m} title={m?.k === "reset" ? t("admin.int_reset") : m?.enabled ? t("admin.int_enable_title", { provider: label(m?.provider) }) : t("admin.int_disable_title", { provider: label(m?.provider) })}
        danger={m?.k === "toggle" && !m?.enabled} loading={toggle.isPending || reset.isPending} onClose={() => setM(null)}
        onSubmit={(reason) => m.k === "reset" ? reset.mutate({ provider: m.provider, reason }) : toggle.mutate({ provider: m.provider, enabled: m.enabled, reason })} />
      {dialog}
    </div>
  );
}
