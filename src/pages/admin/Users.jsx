import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, ShieldCheck } from "lucide-react";
import { Alert, Badge, Button, Card, EmptyState, ErrorState, Modal, PageHeader, Select, SkeletonList, TextInput, useToast, KV } from "../../components/ui";
import { ReasonModal, Refresh } from "../../components/staff";
import { useReauth, isApprovalRequired } from "../../components/staff/Reauth";
import { useI18n } from "../../i18n";
import { useAuth } from "../../auth/AuthProvider";
import { can } from "../../auth/permissions";
import { api } from "../../api/client";
import { friendlyError } from "../../api/errors";
import { useFormat } from "../../lib/format";
import { useDebounced } from "../../hooks/useDebounced";

function UserModal({ id, onClose }) {
  const { t, has } = useI18n(); const f = useFormat(); const toast = useToast(); const qc = useQueryClient(); const { user: me } = useAuth(); const { run, dialog } = useReauth();
  const [m, setM] = useState(null); const [grant, setGrant] = useState({ role: "", states: "" });
  const u = useQuery({ queryKey: ["admin", "user", id], queryFn: () => api.get(`/admin/users/${id}`), gcTime: 0 });
  const roles = useQuery({ queryKey: ["admin", "roles"], enabled: can(me, "roles.read"), queryFn: () => api.get("/admin/roles"), staleTime: 300000 });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin", "user", id] }); qc.invalidateQueries({ queryKey: ["admin", "users"] }); setM(null); };
  const fail = (e) => { if (!e?.cancelled) toast.err(friendlyError(e, { t, has })); };
  const status = useMutation({ mutationFn: ({ reason, to }) => run(() => api.put(`/admin/users/${id}/status`, { status: to, reason })), onSuccess: refresh, onError: fail });
  const logout = useMutation({ mutationFn: () => api.post(`/admin/users/${id}/force-logout`, {}), onSuccess: () => toast.ok(t("admin.logged_out")), onError: fail });
  const verified = useMutation({ mutationFn: (reason) => api.post(`/admin/users/${id}/mark-email-verified`, { reason }), onSuccess: refresh, onError: fail });
  const doGrant = useMutation({ mutationFn: ({ reason }) => run(() => api.post(`/admin/users/${id}/roles`, { role_code: grant.role, reason, states: grant.states.trim() ? grant.states.split(/[\s,]+/).filter(Boolean) : undefined })),
    onSuccess: (r) => { toast.ok(isApprovalRequired(r) ? t("admin.approval_requested") : t("admin.saved")); setGrant({ role: "", states: "" }); refresh(); }, onError: fail });
  const revoke = useMutation({ mutationFn: ({ role }) => api.del(`/admin/users/${id}/roles/${role}`), onSuccess: refresh, onError: fail });
  const d = u.data; const self = d?.id === me?.id; const manage = can(me, "users.manage");
  const statesOk = !grant.states.trim() || grant.states.split(/[\s,]+/).filter(Boolean).every((s) => /^[A-Za-z]{2}$/.test(s));
  return (
    <Modal open onClose={onClose} wide title={d?.full_name || t("state.loading")}>
      {u.isLoading ? <SkeletonList rows={3} /> : u.isError ? <ErrorState error={u.error} onRetry={u.refetch} /> : (<div className="space-y-5">
        <Card className="!p-4"><dl><KV k={t("auth.email")} v={d.email} mono /><KV k={t("auth.phone")} v={d.phone || "—"} mono /><KV k={t("admin.status")} v={<Badge tone={d.status === "active" ? "ok" : "danger"} dot>{d.status}</Badge>} /><KV k="MFA" v={d.mfa_enabled ? t("state.yes") : t("state.no")} /><KV k={t("admin.email_verified")} v={d.email_verified ? t("state.yes") : t("state.no")} /><KV k={t("admin.last_login")} v={d.last_login_at ? f.dateTime(d.last_login_at) : "—"} /></dl><p className="mt-2 text-xs text-ink-3">{t("admin.masked_note")}</p></Card>
        <div><h3 className="mb-2 text-base">{t("admin.roles")}</h3><div className="flex flex-wrap gap-2">{d.roles.map((r) => <Badge key={r} tone="info">{r}{manage && !self && <button className="ml-1.5 opacity-70 hover:opacity-100" aria-label={`${t("act.remove")} ${r}`} onClick={() => revoke.mutate({ role: r })}>×</button>}</Badge>)}{!d.roles.length && <span className="text-sm text-ink-3">{t("state.none")}</span>}</div></div>
        {manage && !self && (<Card className="!p-4 space-y-3"><h3 className="text-base">{t("admin.grant_role")}</h3>
          <div className="grid gap-3 sm:grid-cols-2"><Select label={t("admin.role")} value={grant.role} onChange={(e) => setGrant({ ...grant, role: e.target.value })}><option value="">—</option>{(roles.data?.items || []).filter((r) => !d.roles.includes(r.code)).map((r) => <option key={r.code} value={r.code}>{r.name}{r.privileged ? " ★" : ""}</option>)}</Select>
            <TextInput label={t("admin.states")} optional hint={t("admin.states_hint")} maxLength={120} value={grant.states} error={statesOk ? "" : t("val.states")} onChange={(e) => setGrant({ ...grant, states: e.target.value.toUpperCase() })} /></div>
          <Button size="sm" disabled={!grant.role || !statesOk} icon={ShieldCheck} onClick={() => setM({ k: "grant" })}>{t("admin.grant_role")}</Button></Card>)}
        {manage && !self && <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={d.status === "active" ? "danger" : "primary"} onClick={() => setM({ k: "status", to: d.status === "active" ? "suspended" : "active" })}>{d.status === "active" ? t("admin.suspend") : t("admin.reactivate")}</Button>
          <Button size="sm" variant="outline" icon={LogOut} loading={logout.isPending} onClick={() => logout.mutate()}>{t("admin.force_logout")}</Button>
          {!d.email_verified && <Button size="sm" variant="outline" onClick={() => setM({ k: "verify" })}>{t("admin.mark_verified")}</Button>}</div>}
        {self && <Alert tone="info">{t("admin.self_note")}</Alert>}
      </div>)}
      <ReasonModal open={!!m} title={t("admin.reason_title")} min={3} loading={status.isPending || doGrant.isPending || verified.isPending} onClose={() => setM(null)}
        onSubmit={(reason) => m.k === "status" ? status.mutate({ reason, to: m.to }) : m.k === "grant" ? doGrant.mutate({ reason }) : verified.mutate(reason)} />
      {dialog}
    </Modal>
  );
}

export default function Users() {
  const { t } = useI18n(); const f = useFormat(); const [q, setQ] = useState(""); const [status, setStatus] = useState(""); const [page, setPage] = useState(0); const [open, setOpen] = useState(null);
  const dq = useDebounced(q.trim(), 350); const valid = dq.length === 0 || dq.length >= 2;
  const list = useQuery({ queryKey: ["admin", "users", dq, status, page], enabled: valid, queryFn: () => api.get("/admin/users", { params: { q: dq || undefined, status: status || undefined, limit: 25, offset: page * 25 } }), placeholderData: (p) => p });
  return (
    <div className="mx-auto max-w-5xl animate-rise">
      <PageHeader title={t("admin.nav.users")} actions={<Refresh onClick={() => list.refetch()} loading={list.isFetching} />} />
      <Card className="mb-4 !p-4"><div className="grid gap-3 sm:grid-cols-[1fr_200px]"><TextInput aria-label={t("act.search")} placeholder={t("admin.search_email")} maxLength={100} value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} /><Select aria-label={t("admin.status")} value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}><option value="">{t("admin.status")}</option><option value="active">active</option><option value="suspended">suspended</option></Select></div></Card>
      {list.isLoading ? <SkeletonList /> : list.isError && !list.data ? <ErrorState error={list.error} onRetry={list.refetch} /> : !list.data?.items.length ? <Card><EmptyState title={t("state.empty")} /></Card> : (
        <Card className="overflow-x-auto !p-2"><table className="w-full min-w-[600px] text-sm"><thead className="text-left text-xs text-ink-3"><tr><th className="p-2">{t("auth.full_name")}</th><th className="p-2">{t("auth.email")}</th><th className="p-2">{t("admin.status")}</th><th className="p-2">{t("admin.last_login")}</th></tr></thead><tbody>{list.data.items.map((u) => <tr key={u.id} tabIndex={0} role="button" onClick={() => setOpen(u.id)} onKeyDown={(e) => e.key === "Enter" && setOpen(u.id)} className="cursor-pointer border-t border-line/70 hover:bg-surface-2 focus-ring"><td className="p-2 font-medium">{u.full_name}</td><td className="p-2 font-mono text-xs">{u.email}</td><td className="p-2"><Badge tone={u.status === "active" ? "ok" : "danger"}>{u.status}</Badge></td><td className="p-2 text-xs text-ink-3">{u.last_login_at ? f.rel(u.last_login_at) : "—"}</td></tr>)}</tbody></table></Card>)}
      <div className="mt-4 flex justify-between"><Button variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>{t("act.back")}</Button><Button variant="outline" disabled={(list.data?.items?.length || 0) < 25} onClick={() => setPage(page + 1)}>{t("act.next")}</Button></div>
      {open && <UserModal id={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
