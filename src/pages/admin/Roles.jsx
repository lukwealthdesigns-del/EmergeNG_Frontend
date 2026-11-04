import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { Alert, Badge, Card, ErrorState, PageHeader, SkeletonList, TextInput } from "../../components/ui";
import { Refresh } from "../../components/staff";
import { useI18n } from "../../i18n";
import { api } from "../../api/client";

const GROUPS = ["incident", "medical_profile", "partner", "partners", "facilities", "audit", "security_events", "users", "roles", "configuration", "auth_settings", "integrations", "system", "exports", "analytics", "abuse", "notifications", "alerts", "approvals", "privacy", "support", "offline_sync"];
const group = (p) => p.split(".")[0];

export default function Roles() {
  const { t } = useI18n(); const [filter, setFilter] = useState("");
  const q = useQuery({ queryKey: ["admin", "roles"], queryFn: () => api.get("/admin/roles"), staleTime: 300000 });
  const perms = useMemo(() => { const s = new Set(); (q.data?.items || []).forEach((r) => r.permissions.forEach((p) => s.add(p))); return [...s].sort((a, b) => GROUPS.indexOf(group(a)) - GROUPS.indexOf(group(b)) || a.localeCompare(b)); }, [q.data]);
  const shown = perms.filter((p) => p.includes(filter.trim().toLowerCase()));
  return (
    <div className="mx-auto max-w-6xl animate-rise">
      <PageHeader title={t("admin.nav.roles")} subtitle={t("admin.roles_sub")} actions={<Refresh onClick={() => q.refetch()} loading={q.isFetching} />} />
      <Alert tone="info" className="mb-4">{t("admin.roles_note")}</Alert>
      {q.isLoading ? <SkeletonList /> : q.isError ? <ErrorState error={q.error} onRetry={q.refetch} /> : (<>
        <div className="mb-3 max-w-xs"><TextInput aria-label={t("admin.filter_perm")} placeholder={t("admin.filter_perm")} maxLength={60} value={filter} onChange={(e) => setFilter(e.target.value)} /></div>
        <Card className="overflow-auto !p-0"><table className="w-full border-separate border-spacing-0 text-sm"><thead><tr><th className="sticky left-0 top-0 z-20 min-w-[220px] border-b border-line bg-surface p-3 text-left text-xs text-ink-3">{t("admin.permission")}</th>{q.data.items.map((r) => <th key={r.code} className="sticky top-0 z-10 min-w-[110px] border-b border-line bg-surface p-3 text-left align-bottom text-xs font-medium" title={r.description}>{r.name}{r.privileged && <Badge className="ml-1" tone="warn">★</Badge>}</th>)}</tr></thead>
          <tbody>{shown.map((p) => <tr key={p} className="hover:bg-surface-2/60"><th scope="row" className="sticky left-0 z-10 border-b border-line/70 bg-surface p-3 text-left font-mono text-[12px] font-normal">{p}</th>{q.data.items.map((r) => <td key={r.code} className="border-b border-line/70 p-3">{r.permissions.includes(p) ? <Check className="h-4 w-4 text-ok" aria-label="yes" /> : <span className="text-ink-3/50" aria-label="no">·</span>}</td>)}</tr>)}</tbody></table></Card>
        <p className="mt-3 text-xs text-ink-3">★ {t("admin.privileged_note")}</p></>)}
    </div>
  );
}
