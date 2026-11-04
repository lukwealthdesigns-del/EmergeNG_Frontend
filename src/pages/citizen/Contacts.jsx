import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil, ShieldCheck, Phone, MessageSquare } from "lucide-react";
import { Alert, Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, Modal, PageHeader, Select, SkeletonList, TextInput, Toggle, useToast } from "../../components/ui";
import { useI18n } from "../../i18n";
import { api } from "../../api/client";
import { friendlyError } from "../../api/errors";
import { qk } from "../../lib/queryClient";
import { required, maxLen, optionalPhone, optionalEmail, normalizePhone, validate } from "../../lib/validators";

const EMPTY = { name: "", relationship: "", phone: "", email: "", channel_pref: "share_sheet", share_location: true, share_medical: false, notify_on_incident: false };
export default function Contacts() {
  const { t, has } = useI18n(); const toast = useToast(); const qc = useQueryClient();
  const q = useQuery({ queryKey: qk.contacts, queryFn: () => api.get("/trusted-contacts") });
  const [edit, setEdit] = useState(null); const [form, setForm] = useState(EMPTY); const [errs, setErrs] = useState({}); const [del, setDel] = useState(null); const [ver, setVer] = useState(null); const [code, setCode] = useState("");
  const inv = () => qc.invalidateQueries({ queryKey: qk.contacts });
  const open = (c) => { setEdit(c || {}); setForm(c ? { ...EMPTY, ...c, phone: "", email: "" } : EMPTY); setErrs({}); };
  const save = useMutation({
    mutationFn: () => { const e = validate(form, { name: [required, maxLen(200)], phone: optionalPhone, email: optionalEmail }); if (!edit.id && !form.phone && !form.email && form.channel_pref !== "share_sheet") e.phone = "val.required"; setErrs(e); if (Object.keys(e).length) throw Object.assign(new Error("val"), { local: true });
      const body = { name: form.name.trim(), relationship: form.relationship || null, channel_pref: form.channel_pref, share_location: form.share_location, share_medical: form.share_medical, notify_on_incident: form.notify_on_incident, ...(form.phone ? { phone: normalizePhone(form.phone) } : {}), ...(form.email ? { email: form.email.trim() } : {}) };
      return edit.id ? api.patch(`/trusted-contacts/${edit.id}`, body) : api.post("/trusted-contacts", body); },
    onSuccess: () => { setEdit(null); inv(); toast.ok(t("state.updated", { when: "" })); }, onError: (e) => { if (!e.local) toast.err(friendlyError(e, { t, has })); },
  });
  const remove = useMutation({ mutationFn: (id) => api.del(`/trusted-contacts/${id}`), onSuccess: () => { setDel(null); inv(); }, onError: (e) => toast.err(friendlyError(e, { t, has })) });
  const reqVerify = useMutation({ mutationFn: (c) => api.post(`/trusted-contacts/${c.id}/verify/request`, {}), onSuccess: (r, c) => { setVer(c); setCode(""); toast.ok(t("tc.code_sent", { channel: r.channel })); }, onError: (e) => toast.err(friendlyError(e, { t, has })) });
  const confirm = useMutation({ mutationFn: () => api.post(`/trusted-contacts/${ver.id}/verify/confirm`, { code }), onSuccess: () => { setVer(null); inv(); toast.ok(t("auth.verify.done")); }, onError: (e) => toast.err(friendlyError(e, { t, has })) });
  const f = (k) => ({ value: form[k], onChange: (e) => setForm({ ...form, [k]: e.target.value }), error: errs[k] && t(errs[k]) });
  const items = q.data?.items || [];
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8 animate-rise">
      <PageHeader title={t("tc.title")} subtitle={t("tc.sub")} actions={<Button icon={Plus} onClick={() => open(null)}>{t("tc.add")}</Button>} />
      <Alert tone="info" className="mb-4">{t("tc.note_delivery")}</Alert>
      {q.isLoading ? <SkeletonList /> : q.isError ? <ErrorState error={q.error} onRetry={q.refetch} /> : items.length === 0 ? <Card><EmptyState title={t("tc.empty")} action={<Button icon={Plus} onClick={() => open(null)}>{t("tc.add")}</Button>} /></Card> : (
        <ul className="space-y-3">{items.map((c) => (<li key={c.id}><Card className="!p-4">
          <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{c.name}</p><p className="text-sm text-ink-3">{[c.relationship, c.phone_masked, c.email_masked].filter(Boolean).join(" · ")}</p></div><Badge tone={c.verified ? "ok" : "muted"}>{c.verified ? <ShieldCheck className="h-3 w-3" /> : null}{c.verified ? t("tc.verified") : t("tc.unverified")}</Badge></div>
          <div className="mt-2 flex flex-wrap gap-1.5"><Badge>{t(`tc.ch.${c.channel_pref}`)}</Badge>{c.share_location && <Badge tone="info">{t("tc.share_location")}</Badge>}{c.share_medical && <Badge tone="warn">{t("tc.share_medical")}</Badge>}{c.notify_on_incident && <Badge tone="ok">{t("tc.notify")}</Badge>}</div>
          <div className="mt-3 flex flex-wrap gap-2">{!c.verified && c.channel_pref !== "share_sheet" && <Button size="sm" variant="soft" onClick={() => reqVerify.mutate(c)} loading={reqVerify.isPending && reqVerify.variables?.id === c.id}>{t("tc.verify")}</Button>}<Button size="sm" variant="outline" icon={Pencil} onClick={() => open(c)}>{t("act.edit")}</Button><Button size="sm" variant="dangerSoft" icon={Trash2} onClick={() => setDel(c)} aria-label={t("act.delete")} /></div>
        </Card></li>))}</ul>)}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? t("act.edit") : t("tc.add")} footer={<><Button variant="ghost" onClick={() => setEdit(null)}>{t("act.cancel")}</Button><Button loading={save.isPending} onClick={() => save.mutate()}>{t("act.save")}</Button></>}>
        <div className="space-y-4"><TextInput label={t("tc.name")} {...f("name")} maxLength={200} autoComplete="off" /><TextInput label={t("tc.relationship")} optional {...f("relationship")} maxLength={50} />
          <TextInput label={t("tc.phone")} optional inputMode="tel" {...f("phone")} placeholder={edit?.phone_masked || "0803 123 4567"} /><TextInput label={t("tc.email")} optional type="email" {...f("email")} placeholder={edit?.email_masked || ""} />
          <Select label={t("tc.channel")} value={form.channel_pref} onChange={(e) => setForm({ ...form, channel_pref: e.target.value })}>{["share_sheet", "sms", "email"].map((c) => <option key={c} value={c}>{t(`tc.ch.${c}`)}</option>)}</Select>
          <div className="divide-y divide-line/70"><Toggle label={t("tc.share_location")} checked={form.share_location} onChange={(v) => setForm({ ...form, share_location: v })} /><Toggle label={t("tc.share_medical")} checked={form.share_medical} onChange={(v) => setForm({ ...form, share_medical: v })} /><Toggle label={t("tc.notify")} checked={form.notify_on_incident} onChange={(v) => setForm({ ...form, notify_on_incident: v })} /></div></div>
      </Modal>
      <Modal open={!!ver} onClose={() => setVer(null)} title={t("tc.verify")} footer={<><Button variant="ghost" onClick={() => setVer(null)}>{t("act.cancel")}</Button><Button loading={confirm.isPending} disabled={code.length !== 6} onClick={() => confirm.mutate()}>{t("act.verify")}</Button></>}><TextInput label="6-digit code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} autoFocus /></Modal>
      <ConfirmDialog open={!!del} danger title={t("act.remove")} body={t("tc.delete_confirm")} loading={remove.isPending} onClose={() => setDel(null)} onConfirm={() => remove.mutate(del.id)} />
    </div>
  );
}
