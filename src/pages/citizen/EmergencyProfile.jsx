import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Trash2, Smartphone, QrCode } from "lucide-react";
import { Alert, Button, Card, ConfirmDialog, ErrorState, PageHeader, Select, SkeletonList, TextArea, TextInput, Toggle, useToast } from "../../components/ui";
import { useI18n, LANGS, LANG_LABELS } from "../../i18n";
import { useAuth } from "../../auth/AuthProvider";
import { api } from "../../api/client";
import { friendlyError } from "../../api/errors";
import { qk } from "../../lib/queryClient";
import { idb } from "../../offline/idb";

const BLOOD = ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"];
const list = (s) => String(s || "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 30);
const CARD_FIELDS = [["card_display_name", "auth.full_name"], ["card_preferred_language", "ep.lang"], ["card_emergency_notes", "ep.notes"]];

export default function EmergencyProfile() {
  const { t, has } = useI18n(); const toast = useToast(); const qc = useQueryClient(); const { user } = useAuth();
  const prof = useQuery({ queryKey: qk.profile, queryFn: () => api.get("/emergency-profile") });
  const med = useQuery({ queryKey: qk.medical, queryFn: () => api.get("/emergency-profile/medical"), gcTime: 0, staleTime: 0 }); // sensitive: never kept in cache
  const [p, setP] = useState({ date_of_birth: "", preferred_language: "", preferred_hospital: "" });
  const [m, setM] = useState({ blood_group: "", allergies: "", conditions: "", medications: "", disability_needs: "", emergency_notes: "" });
  const [share, setShare] = useState({}); const [errs, setErrs] = useState({}); const [del, setDel] = useState(false); const [cardOn, setCardOn] = useState(false);
  useEffect(() => { if (prof.data) { setP({ date_of_birth: prof.data.date_of_birth || "", preferred_language: prof.data.preferred_language || "", preferred_hospital: prof.data.preferred_hospital || "" }); setShare(prof.data.sharing_preferences || {}); } }, [prof.data]);
  useEffect(() => { if (med.data) setM({ blood_group: med.data.blood_group || "", allergies: (med.data.allergies || []).join(", "), conditions: (med.data.conditions || []).join(", "), medications: (med.data.medications || []).join(", "), disability_needs: med.data.disability_needs || "", emergency_notes: med.data.emergency_notes || "" }); }, [med.data]);
  useEffect(() => { idb.get("card", user.id).then((c) => setCardOn(!!c)).catch(() => {}); }, [user.id]);

  const save = useMutation({
    mutationFn: async () => {
      const e = {}; if (p.date_of_birth && (new Date(p.date_of_birth) > new Date() || new Date(p.date_of_birth).getFullYear() < 1900)) e.dob = t("val.dob"); setErrs(e); if (e.dob) throw Object.assign(new Error("val"), { local: true });
      await api.put("/emergency-profile", { date_of_birth: p.date_of_birth || null, preferred_language: p.preferred_language || null, preferred_hospital: p.preferred_hospital || null, sharing_preferences: share });
      await api.put("/emergency-profile/medical", { blood_group: m.blood_group || null, allergies: list(m.allergies), conditions: list(m.conditions), medications: list(m.medications), disability_needs: m.disability_needs || null, emergency_notes: m.emergency_notes || null });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.profile }); qc.removeQueries({ queryKey: qk.medical }); toast.ok(t("ep.saved")); },
    onError: (e) => { if (!e.local) toast.err(friendlyError(e, { t, has })); },
  });
  const remove = useMutation({ mutationFn: () => api.del("/emergency-profile/medical"), onSuccess: () => { setM({ blood_group: "", allergies: "", conditions: "", medications: "", disability_needs: "", emergency_notes: "" }); setDel(false); qc.removeQueries({ queryKey: qk.medical }); toast.ok(t("state.updated", { when: "" })); } });
  const toggleCard = async (on) => { try { if (on) { const c = await api.get("/offline/emergency-card"); await idb.put("card", { ownerId: user.id, card: c, savedAt: new Date().toISOString() }); } else await idb.del("card", user.id); setCardOn(on); toast.ok(t("ep.offline_saved")); } catch (e) { toast.err(friendlyError(e, { t, has })); } };

  if (prof.isLoading) return <div className="mx-auto max-w-2xl p-6"><SkeletonList /></div>;
  if (prof.isError) return <ErrorState error={prof.error} onRetry={prof.refetch} />;
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8 animate-rise">
      <PageHeader title={t("ep.title")} subtitle={t("ep.sub")} />
      <Alert tone="info" className="mb-5"><span className="flex items-start gap-2"><Lock className="mt-0.5 h-4 w-4 shrink-0" />{t("ep.private")}</span></Alert>
      <Card className="space-y-4"><h2 className="text-lg">{t("ep.personal")}</h2>
        <TextInput label={t("ep.dob")} type="date" optional value={p.date_of_birth} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setP({ ...p, date_of_birth: e.target.value })} error={errs.dob} />
        <Select label={t("ep.lang")} optional value={p.preferred_language} onChange={(e) => setP({ ...p, preferred_language: e.target.value })}><option value="">—</option>{LANGS.map((l) => <option key={l} value={l}>{LANG_LABELS[l]}</option>)}</Select>
        <TextInput label={t("ep.hospital")} optional maxLength={200} value={p.preferred_hospital} onChange={(e) => setP({ ...p, preferred_hospital: e.target.value })} />
      </Card>
      <Card className="mt-4 space-y-4"><h2 className="text-lg">{t("ep.medical")}</h2><p className="text-xs text-ink-3">{t("ep.user_provided")}</p>
        {med.isLoading ? <SkeletonList rows={2} /> : <>
          <Select label={t("ep.blood")} optional value={m.blood_group} onChange={(e) => setM({ ...m, blood_group: e.target.value })}>{BLOOD.map((b) => <option key={b} value={b}>{b === "" ? "—" : b === "unknown" ? t("ep.unknown") : b}</option>)}</Select>
          {["allergies", "conditions", "medications"].map((k) => <TextInput key={k} label={t(`ep.${k}`)} optional hint={t("ep.list_hint")} value={m[k]} onChange={(e) => setM({ ...m, [k]: e.target.value })} />)}
          <TextArea label={t("ep.needs")} optional rows={2} maxLength={500} value={m.disability_needs} onChange={(e) => setM({ ...m, disability_needs: e.target.value })} />
          <TextArea label={t("ep.notes")} optional rows={3} maxLength={1000} value={m.emergency_notes} onChange={(e) => setM({ ...m, emergency_notes: e.target.value })} />
          <Button variant="dangerSoft" icon={Trash2} onClick={() => setDel(true)}>{t("ep.delete_medical")}</Button></>}
      </Card>
      <Card className="mt-4"><h2 className="flex items-center gap-2 text-lg"><Smartphone className="h-5 w-5 text-ink-2" />{t("ep.offline_title")}</h2><p className="mt-1 text-sm text-ink-2">{t("ep.offline_body")}</p>
        <div className="mt-2 divide-y divide-line/70"><Toggle checked={cardOn} onChange={toggleCard} label={t("ep.share_card")} />
          {cardOn && CARD_FIELDS.map(([k, lab]) => <Toggle key={k} label={t(lab)} checked={share[k] ?? k !== "card_emergency_notes"} onChange={(v) => setShare({ ...share, [k]: v })} />)}</div>
        {cardOn && <Button size="sm" variant="ghost" className="mt-2" onClick={() => toggleCard(false)}>{t("ep.offline_clear")}</Button>}
        <Button size="sm" variant="outline" className="mt-3" icon={QrCode} to="/app/emergency-card">{t("qr.link")}</Button>
      </Card>
      <div className="sticky bottom-24 mt-6 md:bottom-4"><Button size="lg" block loading={save.isPending} onClick={() => save.mutate()}>{t("act.save")}</Button></div>
      <ConfirmDialog open={del} danger title={t("ep.delete_medical")} body={t("ep.delete_confirm")} loading={remove.isPending} onClose={() => setDel(false)} onConfirm={() => remove.mutate()} />
    </div>
  );
}
