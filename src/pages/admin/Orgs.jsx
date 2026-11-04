import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Alert, Badge, Button, Card, EmptyState, ErrorState, Modal, PageHeader, Select, SkeletonList, TextInput, useToast } from "../../components/ui";
import { ReasonModal, Refresh } from "../../components/staff";
import { useReauth, isApprovalRequired } from "../../components/staff/Reauth";
import { useI18n } from "../../i18n";
import { useAuth } from "../../auth/AuthProvider";
import { can } from "../../auth/permissions";
import { api } from "../../api/client";
import { friendlyError } from "../../api/errors";
import { CATEGORIES } from "../../lib/enums";
import { useLabels } from "../../i18n";

const TYPES = ["hospital", "clinic", "police", "fire_service", "ambulance", "emergency_agency", "ngo", "other"];
const MODES = ["simulation", "portal", "human_assisted", "notification"];
const parseStates = (s) => s.split(/[\s,]+/).filter(Boolean);

function CreateOrg({ onClose, onDone }) {
  const { t, has } = useI18n(); const L = useLabels(); const toast = useToast();
  const [v, setV] = useState({ name: "", org_type: "hospital", integration_mode: "simulation", states: "", categories: [], agreement_ref: "", ack: 10, email: "", phone: "" });
  const set = (k, x) => setV((o) => ({ ...o, [k]: x }));
  const errs = { name: v.name.trim().length < 2 ? t("val.too_short") : "", states: parseStates(v.states).every((s) => /^[A-Za-z]{2}$/.test(s)) ? "" : t("val.states"), ack: v.ack >= 1 && v.ack <= 240 ? "" : t("val.coord") };
  const bad = Object.values(errs).some(Boolean);
  const m = useMutation({ mutationFn: () => api.post("/admin/partners", { name: v.name.trim(), org_type: v.org_type, integration_mode: v.integration_mode, service_states: parseStates(v.states), categories: v.categories, agreement_ref: v.agreement_ref.trim() || null, ack_timeout_minutes: Number(v.ack),
    contact: { ...(v.email.trim() ? { email: v.email.trim() } : {}), ...(v.phone.trim() ? { phone: v.phone.trim() } : {}) } }), onSuccess: onDone, onError: (e) => toast.err(friendlyError(e, { t, has })) });
  const toggle = (c) => set("categories", v.categories.includes(c) ? v.categories.filter((x) => x !== c) : [...v.categories, c]);
  return (
    <Modal open onClose={onClose} wide title={t("admin.org_new")} footer={<><Button variant="ghost" onClick={onClose}>{t("act.cancel")}</Button><Button disabled={bad} loading={m.isPending} onClick={() => m.mutate()}>{t("act.save")}</Button></>}>
      <div className="space-y-4"><Alert tone="info">{t("admin.org_new_note")}</Alert>
        <TextInput label={t("admin.org_name")} maxLength={200} value={v.name} error={v.name && errs.name} onChange={(e) => set("name", e.target.value)} />
        <div className="grid gap-3 sm:grid-cols-2"><Select label={t("admin.org_type")} value={v.org_type} onChange={(e) => set("org_type", e.target.value)}>{TYPES.map((x) => <option key={x}>{x}</option>)}</Select><Select label={t("admin.org_mode")} value={v.integration_mode} onChange={(e) => set("integration_mode", e.target.value)}>{MODES.map((x) => <option key={x}>{x}</option>)}</Select></div>
        <TextInput label={t("admin.states")} hint={t("admin.states_hint")} maxLength={200} value={v.states} error={errs.states} onChange={(e) => set("states", e.target.value.toUpperCase())} />
        <div><p className="mb-1 text-sm font-medium">{t("ops.f.category")}</p><div className="flex flex-wrap gap-2">{CATEGORIES.map((c) => <button type="button" key={c} aria-pressed={v.categories.includes(c)} onClick={() => toggle(c)} className={`focus-ring rounded-full border px-3 py-1.5 text-sm ${v.categories.includes(c) ? "border-primary bg-primary text-primary-fg" : "border-line bg-surface"}`}>{L.category(c)}</button>)}</div></div>
        <div className="grid gap-3 sm:grid-cols-2"><TextInput label={t("auth.email")} optional type="email" maxLength={254} value={v.email} onChange={(e) => set("email", e.target.value)} /><TextInput label={t("auth.phone")} optional type="tel" maxLength={20} value={v.phone} onChange={(e) => set("phone", e.target.value)} /></div>
        <div className="grid gap-3 sm:grid-cols-2"><TextInput label={t("admin.agreement")} optional maxLength={100} value={v.agreement_ref} onChange={(e) => set("agreement_ref", e.target.value)} /><TextInput label={t("admin.ack_timeout")} type="number" min={1} max={240} value={v.ack} error={errs.ack} onChange={(e) => set("ack", e.target.value)} /></div>
      </div>
    </Modal>
  );
}

export default function Orgs() {
  const { t, has } = useI18n(); const toast = useToast(); const qc = useQueryClient(); const { user } = useAuth(); const { run, dialog } = useReauth();
  const [create, setCreate] = useState(false); const [m, setM] = useState(null);
  const q = useQuery({ queryKey: ["admin", "orgs"], queryFn: () => api.get("/admin/partners") });
  const done = () => { setM(null); qc.invalidateQueries({ queryKey: ["admin", "orgs"] }); };
  const fail = (e) => { if (!e?.cancelled) toast.err(friendlyError(e, { t, has })); };
  const setStatus = useMutation({ mutationFn: ({ id, status, reason }) => api.put(`/admin/partners/${id}/status`, { status, reason }), onSuccess: done, onError: fail });
  const live = useMutation({ mutationFn: ({ id, reason }) => run(() => api.post(`/admin/partners/${id}/enable-live`, { value: true, reason })), onSuccess: (r) => { toast.ok(isApprovalRequired(r) ? t("admin.approval_requested") : t("admin.saved")); done(); }, onError: fail });
  const manage = can(user, "partners.manage"); const enableLive = can(user, "partners.enable_live");
  return (
    <div className="mx-auto max-w-5xl animate-rise">
      <PageHeader title={t("admin.nav.orgs")} subtitle={t("admin.orgs_sub")} actions={<>{manage && <Button size="sm" icon={Plus} onClick={() => setCreate(true)}>{t("admin.org_new")}</Button>}<Refresh onClick={() => q.refetch()} loading={q.isFetching} /></>} />
      <Alert tone="warn" className="mb-4">{t("ops.partners.sim_note")}</Alert>
      {q.isLoading ? <SkeletonList /> : q.isError ? <ErrorState error={q.error} onRetry={q.refetch} /> : !q.data.items.length ? <Card><EmptyState title={t("state.empty")} /></Card> : (
        <div className="grid gap-3 sm:grid-cols-2">{q.data.items.map((o) => <Card key={o.id} className="!p-4"><div className="flex items-start justify-between gap-2"><div><p className="font-semibold">{o.name}</p><p className="text-xs text-ink-3">{o.org_type} · {o.integration_mode} · {o.status}</p></div><Badge tone={o.live_enabled ? "ok" : "warn"} dot>{o.live_enabled ? "LIVE" : "SIM"}</Badge></div>
          <p className="mt-2 text-xs text-ink-2">{o.mode_label}</p><p className="mt-1 text-xs text-ink-3">{(o.service_states || []).join(", ") || "—"} · ack ≤ {o.ack_timeout_minutes} min</p>
          {manage && <div className="mt-3 flex flex-wrap gap-2">{o.status !== "verified" && <Button size="sm" variant="outline" onClick={() => setM({ k: "status", id: o.id, status: "verified" })}>{t("admin.verify_org")}</Button>}{o.status === "verified" && <Button size="sm" variant="ghost" onClick={() => setM({ k: "status", id: o.id, status: "suspended" })}>{t("admin.suspend")}</Button>}{enableLive && !o.live_enabled && o.status === "verified" && <Button size="sm" onClick={() => setM({ k: "live", id: o.id })}>{t("admin.enable_live")}</Button>}</div>}</Card>)}</div>)}
      {create && <CreateOrg onClose={() => setCreate(false)} onDone={() => { setCreate(false); done(); }} />}
      <ReasonModal open={!!m} title={m?.k === "live" ? t("admin.enable_live") : t("admin.reason_title")} loading={setStatus.isPending || live.isPending} onClose={() => setM(null)} onSubmit={(reason) => m.k === "live" ? live.mutate({ id: m.id, reason }) : setStatus.mutate({ id: m.id, status: m.status, reason })} />
      {dialog}
    </div>
  );
}
