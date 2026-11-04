import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft, BadgeCheck, Flag, Handshake, HeartPulse, NotebookPen, Phone, ShieldAlert, UserCheck, Siren, Undo2, Eye } from "lucide-react";
import { Alert, Badge, Button, Card, ErrorState, KV, PageHeader, Section, Select, SkeletonList, TextArea, TextInput, Toggle, useToast } from "../../components/ui";
import { PrioBadge, StatusBadge, VerifBadge, ReasonModal, LiveIndicator } from "../../components/staff";
import { BackLink, Freshness } from "../../components/common/bits";
import MapView from "../../components/maps/MapView";
import { useI18n, useLabels } from "../../i18n";
import { useAuth } from "../../auth/AuthProvider";
import { can } from "../../auth/permissions";
import { useOpsLive } from "../../hooks/useOpsLive";
import { api } from "../../api/client";
import { friendlyError } from "../../api/errors";
import { useFormat, formatDuration } from "../../lib/format";
import { fmtCoords, fmtMeters } from "../../lib/geo";
import { PRIORITIES, VERIFICATION_STATUSES } from "../../lib/enums";

const CLOSURE = ["resolved", "duplicate", "false_report", "cancelled", "unable_to_locate", "referred_out", "other"];
const REFERRAL_RESP = ["acknowledged", "accepted", "rejected", "underway", "resolved", "cancelled"];

export default function OpsIncidentDetail() {
  const { id } = useParams(); const { t, has } = useI18n(); const L = useLabels(); const f = useFormat(); const toast = useToast(); const qc = useQueryClient(); const { user } = useAuth(); const live = useOpsLive();
  const key = ["ops", "incident", id];
  const q = useQuery({ queryKey: key, queryFn: () => api.get(`/operations/incidents/${id}`) });
  const [modal, setModal] = useState(null); const [contact, setContact] = useState(null); const [medical, setMedical] = useState(null); const [note, setNote] = useState(""); const [vis, setVis] = useState("internal");
  const orgs = useQuery({ queryKey: ["ops", "orgs"], enabled: modal?.kind === "referral" || modal?.kind === "recordResp", queryFn: () => api.get("/admin/partners") });
  const done = () => { setModal(null); qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: ["ops", "queue"] }); qc.invalidateQueries({ queryKey: ["ops", "overview"] }); };
  const fail = (e) => { if (e.code === "VERSION_CONFLICT" || e.status === 409) { qc.invalidateQueries({ queryKey: key }); toast.err(t("err.VERSION_CONFLICT")); } else toast.err(friendlyError(e, { t, has })); };
  const run = useMutation({ mutationFn: ({ path, body }) => api.post(`/operations/incidents/${id}/${path}`, body), onSuccess: done, onError: fail });
  const rec = useMutation({ mutationFn: ({ rid, body }) => api.post(`/operations/referrals/${rid}/record-response`, body), onSuccess: done, onError: fail });
  const addNote = useMutation({ mutationFn: () => api.post(`/operations/incidents/${id}/notes`, { body: note.trim(), visibility: vis }), onSuccess: () => { setNote(""); done(); }, onError: fail });
  const revealContact = useMutation({ mutationFn: () => api.get(`/operations/incidents/${id}/reporter-contact`), onSuccess: setContact, onError: fail });
  const revealMed = useMutation({ mutationFn: (reason) => api.get(`/operations/incidents/${id}/medical`, { params: { reason } }), onSuccess: (r) => { setMedical(r); setModal(null); }, onError: fail });

  if (q.isLoading) return <div className="mx-auto max-w-5xl"><SkeletonList rows={5} /></div>;
  if (q.isError) return <div className="mx-auto max-w-5xl"><ErrorState error={q.error} onRetry={q.refetch} /></div>;
  const d = q.data; const i = d.incident; const loc = d.location; const ver = i.version;
  const open = !["resolved", "closed", "cancelled"].includes(i.operational_status);
  const pts = loc?.latitude != null ? [{ id: i.id, lat: loc.latitude, lon: loc.longitude, latitude: loc.latitude, longitude: loc.longitude, priority: i.priority, status: i.operational_status, accuracy_m: loc.accuracy_m, source: loc.source, precision: loc.precision, label: i.reference }] : [];

  return (
    <div className="mx-auto max-w-5xl animate-rise">
      <PageHeader back={<BackLink to="/ops/queue">{t("ops.nav.queue")}</BackLink>} title={<span className="font-mono">{i.reference}</span>} subtitle={`${L.category(i.category)}${i.subcategory ? ` · ${i.subcategory}` : ""}`}
        actions={<><PrioBadge v={i.priority} /><StatusBadge v={i.operational_status} /><VerifBadge v={i.verification_status} />{i.is_demo && <Badge tone="warn">DEMO</Badge>}</>} />
      <div className="mb-4 flex flex-wrap items-center gap-2"><LiveIndicator {...live} /><Freshness at={new Date(q.dataUpdatedAt).toISOString()} /></div>
      {i.is_demo && <Alert tone="warn" className="mb-4">{t("inc.simulated")}</Alert>}
      {d.origin?.offline_synchronized && <Alert tone="info" className="mb-4" title={t("ops.offline_origin")}>{t("ops.offline_delay", { d: formatDuration(d.origin.offline_delay_seconds) })} {d.origin.note}</Alert>}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <Card><h2 className="text-lg">{t("report.what")}</h2><p className="mt-2 whitespace-pre-wrap break-words text-ink">{i.description || "—"}</p>{i.reported_severity && <p className="mt-2 text-xs text-ink-3">{t("report.severity")}: {i.reported_severity}</p>}<p className="mt-1 text-xs text-ink-3">{t("ops.reported_note")}</p></Card>
          {loc && <Card><h2 className="mb-3 text-lg">{t("inc.location")}</h2>{pts.length ? <MapView className="mb-3 h-64" points={pts} pin={null} signals tactical fit /> : <Alert tone="warn">{t("loc.fallback.title")}</Alert>}
            <dl><KV k={t("loc.coordinates")} v={loc.latitude != null ? fmtCoords(loc.latitude, loc.longitude) : "—"} mono /><KV k={t("loc.accuracy_label")} v={`${fmtMeters(loc.accuracy_m)} · ${L.accuracy(loc.accuracy_class)}`} /><KV k={t("ops.precision")} v={loc.precision} /><KV k={t("src.title")} v={L.source(loc.source)} /><KV k={t("loc.pc.value")} v={loc.postcode ? <span className="font-mono">{loc.postcode} {loc.postcode_confidence != null && `(${Math.round(loc.postcode_confidence * 100)}%)`}</span> : L.postcode(loc.postcode_status)} />{loc.user_reported_postcode && <KV k={t("ops.user_postcode")} v={loc.user_reported_postcode} mono />}<KV k={t("loc.share.address")} v={loc.address_text || loc.address_provider_text} /><KV k={t("loc.captured_at")} v={`${f.dateTime(loc.captured_at)}${loc.stale ? " ⚠" : ""}`} />{loc.manually_corrected && <KV k={t("loc.map.adjusted")} v={t("state.yes")} />}</dl>
            {d.additional_locations?.length > 0 && <p className="mt-2 text-xs text-ink-3">+{d.additional_locations.length} {t("ops.extra_locations")}</p>}</Card>}
          <Card><h2 className="mb-3 text-lg">{t("inc.timeline")}</h2><p className="mb-3 text-xs text-ink-3">{d.metric_definitions?.timeline}</p>
            <ol className="space-y-3 border-l border-line pl-4">{d.timeline.map((e) => <li key={e.seq}><p className="text-sm"><span className="font-medium">{e.event_type}</span>{e.from && <span className="text-ink-3"> {e.from} →</span>} {e.to && <span>{e.to}</span>}{e.simulated && <Badge tone="warn" className="ml-2">sim</Badge>}</p><p className="text-xs text-ink-3">{f.dateTime(e.at)} · {e.actor_type}/{e.source}{e.reason ? ` · ${e.reason}` : ""}</p></li>)}</ol></Card>
          {can(user, "incident.note.read") && <Card><h2 className="mb-3 flex items-center gap-2 text-lg"><NotebookPen className="h-5 w-5 text-ink-2" />{t("ops.notes")}</h2>
            <ul className="space-y-2">{d.notes.map((n) => <li key={n.id} className="rounded-2xl bg-surface-2 p-3 text-sm"><p className="whitespace-pre-wrap">{n.body}</p><p className="mt-1 text-xs text-ink-3">{f.dateTime(n.created_at)} · {n.visibility}</p></li>)}{!d.notes.length && <li className="text-sm text-ink-3">{t("state.empty")}</li>}</ul>
            {can(user, "incident.note.write") && <div className="mt-3 space-y-2"><TextArea label={t("ops.add_note")} rows={2} maxLength={4000} value={note} onChange={(e) => setNote(e.target.value)} /><div className="flex flex-wrap items-center justify-between gap-2"><Select aria-label="visibility" value={vis} onChange={(e) => setVis(e.target.value)} className="w-52"><option value="internal">{t("ops.vis.internal")}</option><option value="partner_visible">{t("ops.vis.partner")}</option></Select><Button disabled={!note.trim()} loading={addNote.isPending} onClick={() => addNote.mutate()}>{t("act.add")}</Button></div></div>}</Card>}
        </div>

        <div className="space-y-4">
          <Card><h2 className="mb-3 text-lg">{t("ops.actions")}</h2><div className="flex flex-col gap-2">
            {can(user, "incident.update_status") && i.operational_status === "submitted" && <Button icon={Eye} loading={run.isPending && run.variables?.path === "receive"} onClick={() => run.mutate({ path: "receive", body: {} })}>{t("status.received")}</Button>}
            {can(user, "incident.update_status") && d.allowed_transitions?.map((s) => <Button key={s} variant="outline" icon={ArrowRightLeft} onClick={() => setModal({ kind: "transition", to: s })}>{t("ops.move_to")} {L.status(s)}</Button>)}
            {can(user, "incident.reopen") && !open && <Button variant="outline" icon={Undo2} onClick={() => setModal({ kind: "reopen" })}>{t("ops.reopen")}</Button>}
            {can(user, "incident.prioritize") && <Button variant="outline" icon={Siren} onClick={() => setModal({ kind: "priority", v: i.priority })}>{t("ops.set_priority")}</Button>}
            {can(user, "incident.verify") && <Button variant="outline" icon={BadgeCheck} onClick={() => setModal({ kind: "verify", v: i.verification_status })}>{t("ops.set_verification")}</Button>}
            {can(user, "incident.assign") && <Button variant="outline" icon={UserCheck} onClick={() => setModal({ kind: "assign" })}>{t("ops.assign")}</Button>}
            {can(user, "incident.escalate") && <Button variant="outline" icon={Flag} onClick={() => setModal({ kind: "escalate" })}>{t("ops.escalate")}</Button>}
            {can(user, "partner_referral.create") && open && <Button variant="outline" icon={Handshake} onClick={() => setModal({ kind: "referral" })}>{t("ops.refer")}</Button>}
            {can(user, "incident.verify") && <Button variant="dangerSoft" icon={ShieldAlert} onClick={() => setModal({ kind: "flag" })}>{t("ops.flag_abuse")}</Button>}</div>
            <p className="mt-3 text-xs text-ink-3">v{ver} · {t("ops.concurrency")}</p></Card>
          <Card><h2 className="mb-2 text-lg">{t("ops.sensitive")}</h2><p className="mb-3 text-xs text-ink-3">{t("ops.sensitive_note")}</p>
            {i.reporter_contact_available && !contact && <Button variant="outline" size="sm" icon={Phone} loading={revealContact.isPending} onClick={() => revealContact.mutate()}>{t("ops.reveal_contact")}</Button>}
            {contact && <dl><KV k={t("report.name")} v={contact.name} /><KV k={t("report.callback")} v={contact.phone} mono /><KV k={t("auth.email")} v={contact.email} /></dl>}
            {!i.reporter_contact_available && <p className="text-sm text-ink-3">{t("ops.no_contact")}</p>}
            {can(user, "medical_profile.read") && d.medical_snapshot_available && !medical && <Button className="mt-2" variant="outline" size="sm" icon={HeartPulse} onClick={() => setModal({ kind: "medical" })}>{t("ops.reveal_medical")}</Button>}
            {medical && <dl className="mt-2">{Object.entries(medical).filter(([, v]) => v && typeof v !== "object").map(([k, v]) => <KV key={k} k={k} v={String(v)} />)}{Object.entries(medical).filter(([, v]) => Array.isArray(v)).map(([k, v]) => <KV key={k} k={k} v={v.join(", ")} />)}</dl>}</Card>
          <Card><h2 className="mb-2 text-lg">{t("ops.referrals")}</h2>{d.referrals.length === 0 ? <p className="text-sm text-ink-3">{t("state.none")}</p> : <ul className="space-y-2">{d.referrals.map((r) => <li key={r.id} className="rounded-2xl bg-surface-2 p-3 text-sm"><div className="flex items-center justify-between"><Badge tone={r.is_simulated ? "warn" : "info"}>{r.is_simulated ? t("inc.simulated").split(".")[0] : "LIVE"}</Badge><span>{r.status}</span></div><p className="mt-1 text-xs text-ink-3">{r.partner_stage || "—"} · {f.rel(r.created_at)}</p>{can(user, "partner_referral.record_response") && <Button size="sm" variant="ghost" className="mt-1" onClick={() => setModal({ kind: "recordResp", rid: r.id })}>{t("ops.record_response")}</Button>}</li>)}</ul>}<p className="mt-2 text-xs text-ink-3">{t("ops.referral_note")}</p></Card>
          <Card><h2 className="mb-2 text-lg">{t("ops.assignments")}</h2>{d.assignments.length === 0 ? <p className="text-sm text-ink-3">{t("state.none")}</p> : <ul className="space-y-1 text-sm">{d.assignments.map((a) => <li key={a.id} className={a.released_at ? "text-ink-3 line-through" : ""}>{a.team || a.assignee_user_id?.slice(0, 8)} · {f.rel(a.created_at)}</li>)}</ul>}<p className="mt-2 text-xs text-ink-3">{t("ops.assign_note")}</p></Card>
          {(d.enrichment?.length > 0 || d.notifications?.length > 0 || d.duplicate_signals?.length > 0) && <Card><h2 className="mb-2 text-lg">{t("ops.system")}</h2>
            {d.enrichment?.map((e, n) => <p key={n} className="text-xs text-ink-2">{e.kind}: {e.status}{e.postcode ? ` (${e.postcode})` : ""}{e.error ? ` — ${e.error}` : ""}</p>)}
            {d.notifications?.map((n) => <p key={n.id} className="text-xs text-ink-2">{n.kind}/{n.channel} → {n.recipient}: {n.status}{n.error ? ` (${n.error})` : ""}</p>)}
            {d.duplicate_signals?.map((n) => <p key={n.id} className="text-xs text-warn">{t("ops.possible_dup")} ({Math.round(n.distance_m)} m, {n.status})</p>)}</Card>}
        </div>
      </div>

      {/* action modals */}
      <ReasonModal open={modal?.kind === "transition"} title={`${t("ops.move_to")} ${modal ? L.status(modal.to) : ""}`} loading={run.isPending} min={0} label={t("ops.reason_optional")}
        extra={(x, set) => ["resolved", "closed"].includes(modal?.to) ? <Select label={t("ops.closure_reason")} value={x.cr || ""} onChange={(e) => set({ ...x, cr: e.target.value })}><option value="">—</option>{CLOSURE.map((c) => <option key={c} value={c}>{c}</option>)}</Select> : null}
        onClose={() => setModal(null)} onSubmit={(reason, x) => run.mutate({ path: "transition", body: { to_status: modal.to, reason: reason || null, expected_version: ver, ...(x.cr ? { closure_reason: x.cr } : {}) } })} />
      <ReasonModal open={modal?.kind === "reopen"} title={t("ops.reopen")} loading={run.isPending} onClose={() => setModal(null)} onSubmit={(reason) => run.mutate({ path: "reopen", body: { reason, expected_version: ver } })} />
      <ReasonModal open={modal?.kind === "priority"} title={t("ops.set_priority")} loading={run.isPending} extra={(x, set) => <Select label={t("ops.f.priority")} value={x.p ?? modal?.v} onChange={(e) => set({ ...x, p: e.target.value })}>{PRIORITIES.map((p) => <option key={p} value={p}>{L.priority(p)}</option>)}</Select>} onClose={() => setModal(null)} onSubmit={(reason, x) => run.mutate({ path: "priority", body: { priority: x.p ?? modal.v, reason } })} />
      <ReasonModal open={modal?.kind === "verify"} title={t("ops.set_verification")} min={0} label={t("ops.reason_optional")} loading={run.isPending} extra={(x, set) => <Select label={t("ops.f.verification")} value={x.v ?? modal?.v} onChange={(e) => set({ ...x, v: e.target.value })}>{VERIFICATION_STATUSES.map((p) => <option key={p} value={p}>{L.verification(p)}</option>)}</Select>} onClose={() => setModal(null)} onSubmit={(reason, x) => run.mutate({ path: "verification", body: { to: x.v ?? modal.v, reason: reason || null } })} />
      <ReasonModal open={modal?.kind === "assign"} title={t("ops.assign")} loading={run.isPending} extra={(x, set) => <div className="space-y-3"><Toggle label={t("ops.assign_me")} checked={!!x.me} onChange={(v) => set({ ...x, me: v })} />{!x.me && <TextInput label={t("ops.team")} value={x.team || ""} maxLength={100} onChange={(e) => set({ ...x, team: e.target.value })} />}</div>} onClose={() => setModal(null)} onSubmit={(reason, x) => (x.me || x.team?.trim()) ? run.mutate({ path: "assign", body: { reason, ...(x.me ? { assignee_user_id: user.id } : { team: x.team.trim() }) } }) : toast.err(t("val.required"))} />
      <ReasonModal open={modal?.kind === "escalate"} title={t("ops.escalate")} loading={run.isPending} onClose={() => setModal(null)} onSubmit={(reason) => run.mutate({ path: "escalate", body: { reason } })} />
      <ReasonModal open={modal?.kind === "flag"} danger title={t("ops.flag_abuse")} loading={run.isPending} onClose={() => setModal(null)} onSubmit={(reason) => run.mutate({ path: "flag-abuse", body: { reason } })} />
      <ReasonModal open={modal?.kind === "medical"} title={t("ops.reveal_medical")} min={5} label={t("ops.medical_reason")} loading={revealMed.isPending} onClose={() => setModal(null)} onSubmit={(reason) => revealMed.mutate(reason)} />
      <ReasonModal open={modal?.kind === "referral"} title={t("ops.refer")} min={0} label={t("ops.reason_optional")} loading={run.isPending}
        extra={(x, set) => <div className="space-y-3"><Select label={t("ops.org")} value={x.org || ""} onChange={(e) => set({ ...x, org: e.target.value })}><option value="">—</option>{(orgs.data?.items || []).filter((o) => o.status === "active").map((o) => <option key={o.id} value={o.id}>{o.name} — {o.mode_label}</option>)}</Select><Toggle label={t("ops.share_description")} checked={x.desc !== false} onChange={(v) => set({ ...x, desc: v })} /><Toggle label={t("ops.share_contact")} checked={!!x.contact} onChange={(v) => set({ ...x, contact: v })} /></div>}
        onClose={() => setModal(null)} onSubmit={(note, x) => x.org ? run.mutate({ path: "referrals", body: { org_id: x.org, note: note || null, share_description: x.desc !== false, share_reporter_contact: !!x.contact } }) : toast.err(t("val.required"))} />
      <ReasonModal open={modal?.kind === "recordResp"} title={t("ops.record_response")} loading={rec.isPending} label={t("ops.evidence")} extra={(x, set) => <Select label={t("ops.f.status")} value={x.s || "acknowledged"} onChange={(e) => set({ ...x, s: e.target.value })}>{REFERRAL_RESP.map((s) => <option key={s} value={s}>{s}</option>)}</Select>} onClose={() => setModal(null)} onSubmit={(evidence, x) => rec.mutate({ rid: modal.rid, body: { status: x.s || "acknowledged", evidence } })} />
    </div>
  );
}
