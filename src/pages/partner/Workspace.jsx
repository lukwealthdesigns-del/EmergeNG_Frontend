import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ClipboardList, Trash2, UserPlus, X } from "lucide-react";
import { Alert, Badge, Button, Card, EmptyState, ErrorState, Modal, PageHeader, Section, Segmented, Select, SkeletonList, TextArea, TextInput, useToast, KV } from "../../components/ui";
import { Refresh } from "../../components/staff";
import { Freshness } from "../../components/common/bits";
import { useI18n, useLabels } from "../../i18n";
import { useAuth } from "../../auth/AuthProvider";
import { can } from "../../auth/permissions";
import { api } from "../../api/client";
import { friendlyError } from "../../api/errors";
import { useFormat } from "../../lib/format";
import { email as vEmail } from "../../lib/validators";
import { PrioBadge } from "../../components/staff";

const STAGES = ["en_route", "on_scene", "transporting", "handed_over"];
const NEXT = { sent: ["acknowledge", "accept", "reject"], delivered: ["acknowledge", "accept", "reject"], acknowledged: ["accept", "reject"], accepted: ["status", "resolve"], in_progress: ["status", "resolve"] };
const TONE = { sent: "info", delivered: "info", acknowledged: "warn", accepted: "warn", in_progress: "warn", resolved: "ok", rejected: "danger", expired: "muted", cancelled: "muted" };

function Referral({ id, onClose }) {
  const { t, has } = useI18n(); const L = useLabels(); const f = useFormat(); const toast = useToast(); const qc = useQueryClient();
  const [note, setNote] = useState(""); const [stage, setStage] = useState(""); const [pn, setPn] = useState("");
  const q = useQuery({ queryKey: ["partner", "referral", id], queryFn: () => api.get(`/partners/me/referrals/${id}`), gcTime: 0 });
  const act = useMutation({
    mutationFn: ({ action, body }) => api.post(`/partners/referrals/${id}/${action}`, body),
    onSuccess: () => { setNote(""); setStage(""); qc.invalidateQueries({ queryKey: ["partner"] }); toast.ok(t("partner.recorded")); },
    onError: (e) => toast.err(friendlyError(e, { t, has })),
  });
  const addNote = useMutation({ mutationFn: () => api.post(`/partners/referrals/${id}/notes`, { body: pn.trim() }), onSuccess: () => { setPn(""); qc.invalidateQueries({ queryKey: ["partner", "referral", id] }); }, onError: (e) => toast.err(friendlyError(e, { t, has })) });
  const r = q.data; const inc = r?.incident; const actions = r ? NEXT[r.status] || [] : [];
  const send = (action) => act.mutate({ action, body: { note: note.trim() || null, ...(action === "status" && stage ? { stage } : {}) } });
  return (
    <Modal open onClose={onClose} wide title={inc?.reference || t("state.loading")}>
      {q.isLoading ? <SkeletonList rows={3} /> : q.isError ? <ErrorState error={q.error} onRetry={q.refetch} /> : (<div className="space-y-5">
        {r.is_simulated && <Alert tone="warn">{t("partner.sim")}</Alert>}
        <div className="flex flex-wrap items-center gap-2"><Badge tone={TONE[r.status] || "muted"} dot>{r.status}</Badge>{inc.priority && <PrioBadge value={inc.priority} />}{r.partner_stage && <Badge tone="info">{r.partner_stage}</Badge>}{r.ack_due_at && <span className="text-xs text-ink-3">{t("partner.ack_due", { when: f.rel(r.ack_due_at) })}</span>}</div>
        <Card className="!p-4"><dl>
          <KV k={t("ops.f.category")} v={inc.category ? L.category(inc.category) : t("partner.not_shared")} />
          <KV k={t("report.what")} v={inc.description || t("partner.not_shared")} />
          {inc.location ? <><KV k={t("loc.postcode")} v={inc.location.postcode || "—"} mono /><KV k={t("loc.address")} v={inc.location.address_text || "—"} /><KV k="GPS" v={`${inc.location.latitude.toFixed(5)}, ${inc.location.longitude.toFixed(5)}${inc.location.accuracy_m ? ` (±${Math.round(inc.location.accuracy_m)} m)` : ""}`} mono /></> : <KV k={t("loc.title")} v={t("partner.not_shared")} />}
          {inc.reporter_contact && <KV k={t("partner.contact")} v={[inc.reporter_contact.name, inc.reporter_contact.phone].filter(Boolean).join(" · ")} />}
        </dl>{inc.location && <a className="mt-2 inline-block text-sm text-primary underline" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${inc.location.latitude},${inc.location.longitude}`}>{t("act.directions")}</a>}</Card>
        {actions.length > 0 && <Card className="!p-4 space-y-3">
          <h3 className="text-base">{t("partner.respond")}</h3><p className="text-xs text-ink-3">{t("partner.respond_note")}</p>
          {actions.includes("status") && <Select label={t("partner.stage")} value={stage} onChange={(e) => setStage(e.target.value)}><option value="">—</option>{STAGES.map((s) => <option key={s} value={s}>{s}</option>)}</Select>}
          <TextArea label={t("partner.note")} optional rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex flex-wrap gap-2">{actions.map((a) => <Button key={a} size="sm" variant={a === "reject" ? "danger" : a === "resolve" || a === "accept" ? "primary" : "outline"} loading={act.isPending && act.variables?.action === a} disabled={a === "status" && !stage} onClick={() => send(a)}>{t(`partner.act.${a}`)}</Button>)}</div></Card>}
        <Section title={t("partner.timeline")}><ol className="space-y-2 border-l border-line pl-4">{r.timeline.map((e, i) => <li key={i} className="text-sm"><span className="font-medium">{e.event}</span> → {e.status}{e.simulated ? <Badge className="ml-2" tone="warn">SIM</Badge> : null}<span className="block text-xs text-ink-3">{f.dateTime(e.at)} · {e.source}{e.note ? ` · ${e.note}` : ""}</span></li>)}</ol></Section>
        <Section title={t("partner.notes")}>{r.notes.length ? <ul className="space-y-2">{r.notes.map((n, i) => <li key={i} className="rounded-2xl bg-surface-2 p-3 text-sm">{n.body}<span className="block text-xs text-ink-3">{f.dateTime(n.created_at)}</span></li>)}</ul> : <p className="text-sm text-ink-3">{t("state.none")}</p>}
          <div className="mt-3 flex gap-2"><TextInput aria-label={t("partner.note")} className="flex-1" maxLength={2000} value={pn} onChange={(e) => setPn(e.target.value)} /><Button size="sm" disabled={!pn.trim()} loading={addNote.isPending} onClick={() => addNote.mutate()}>{t("act.add")}</Button></div></Section>
      </div>)}
    </Modal>
  );
}

function Members() {
  const { t, has } = useI18n(); const toast = useToast(); const qc = useQueryClient(); const [email, setEmail] = useState(""); const [role, setRole] = useState("responder"); const [eErr, setEErr] = useState("");
  const q = useQuery({ queryKey: ["partner", "members"], queryFn: () => api.get("/partners/me/members") });
  const add = useMutation({ mutationFn: () => api.post("/partners/me/members", { email: email.trim().toLowerCase(), org_role: role }), onSuccess: () => { setEmail(""); qc.invalidateQueries({ queryKey: ["partner", "members"] }); toast.ok(t("partner.member_added")); }, onError: (e) => toast.err(friendlyError(e, { t, has })) });
  const rm = useMutation({ mutationFn: (uid) => api.del(`/partners/me/members/${uid}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["partner", "members"] }), onError: (e) => toast.err(friendlyError(e, { t, has })) });
  const submit = (e) => { e.preventDefault(); const m = vEmail(email); if (m) { setEErr(t(m)); return; } setEErr(""); add.mutate(); };
  return (<div className="space-y-4">
    <Card className="!p-4"><form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end"><TextInput label={t("auth.email")} type="email" inputMode="email" autoComplete="off" maxLength={254} value={email} error={eErr} onChange={(e) => setEmail(e.target.value)} /><Select label={t("partner.org_role")} value={role} onChange={(e) => setRole(e.target.value)}><option value="responder">responder</option><option value="partner_admin">partner_admin</option></Select><Button type="submit" icon={UserPlus} loading={add.isPending}>{t("act.add")}</Button></form><p className="mt-2 text-xs text-ink-3">{t("partner.member_note")}</p></Card>
    {q.isLoading ? <SkeletonList rows={2} /> : q.isError ? <ErrorState error={q.error} onRetry={q.refetch} /> : !q.data.items.length ? <Card><EmptyState title={t("state.empty")} /></Card> : <Card className="!p-2"><ul className="divide-y divide-line/70">{q.data.items.map((m) => <li key={m.user_id} className="flex items-center justify-between gap-3 p-3 text-sm"><span><span className="font-mono text-xs">{String(m.user_id).slice(0, 8)}</span> · {m.org_role}</span><Button size="sm" variant="ghost" icon={Trash2} aria-label={t("act.remove")} loading={rm.isPending && rm.variables === m.user_id} onClick={() => rm.mutate(m.user_id)} /></li>)}</ul></Card>}
  </div>);
}

export default function Workspace() {
  const { t } = useI18n(); const f = useFormat(); const { user } = useAuth(); const [tab, setTab] = useState("inbox"); const [status, setStatus] = useState(""); const [open, setOpen] = useState(null);
  const q = useQuery({ queryKey: ["partner", "referrals", status], queryFn: () => api.get("/partners/me/referrals", { params: { status: status || undefined, limit: 50 } }), refetchInterval: 20000, gcTime: 0 });
  const audit = useQuery({ queryKey: ["partner", "audit"], enabled: tab === "audit", queryFn: () => api.get("/partners/me/audit", { params: { limit: 100 } }), gcTime: 0 });
  const tabs = [{ value: "inbox", label: t("partner.inbox") }, { value: "audit", label: t("partner.audit") }, ...(can(user, "partner.members.manage") ? [{ value: "members", label: t("partner.members") }] : [])];
  return (
    <div className="mx-auto max-w-4xl animate-rise">
      <PageHeader title={t("partner.nav.workspace")} subtitle={t("partner.sub")} actions={<><Freshness at={q.dataUpdatedAt ? new Date(q.dataUpdatedAt).toISOString() : null} /><Refresh onClick={() => q.refetch()} loading={q.isFetching} /></>} />
      <Segmented className="mb-4" value={tab} onChange={setTab} options={tabs} label="tabs" />
      {tab === "inbox" && (<>
        <div className="mb-3 max-w-xs"><Select aria-label="status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">{t("ops.f.status")}</option>{Object.keys(TONE).map((s) => <option key={s} value={s}>{s}</option>)}</Select></div>
        {q.isLoading ? <SkeletonList /> : q.isError ? <ErrorState error={q.error} onRetry={q.refetch} /> : !q.data.items.length ? <Card><EmptyState icon={ClipboardList} title={t("partner.empty")} /></Card> : <ul className="space-y-2">{q.data.items.map((r) => <li key={r.referral_id}><button className="w-full text-left" onClick={() => setOpen(r.referral_id)}><Card className="!p-4 transition hover:shadow-soft"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold">{r.incident_reference}</span><span className="flex gap-2">{r.is_simulated && <Badge tone="warn">SIM</Badge>}<Badge tone={TONE[r.status] || "muted"} dot>{r.status}</Badge></span></div><p className="mt-1 text-xs text-ink-3">{r.priority} · {f.rel(r.created_at)}{r.ack_due_at && ["sent", "delivered"].includes(r.status) ? ` · ${t("partner.ack_due", { when: f.rel(r.ack_due_at) })}` : ""}</p></Card></button></li>)}</ul>}</>)}
      {tab === "audit" && (audit.isLoading ? <SkeletonList /> : audit.isError ? <ErrorState error={audit.error} onRetry={audit.refetch} /> : !audit.data.items.length ? <Card><EmptyState title={t("state.empty")} /></Card> : <Card className="!p-2"><ul className="divide-y divide-line/70">{audit.data.items.map((e, i) => <li key={i} className="p-3 text-sm"><span className="font-medium">{e.event}</span> → {e.status}{e.simulated ? <Badge className="ml-2" tone="warn">SIM</Badge> : null}<span className="block text-xs text-ink-3">{f.dateTime(e.at)} · {e.source}</span></li>)}</ul></Card>)}
      {tab === "members" && <Members />}
      {open && <Referral id={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
