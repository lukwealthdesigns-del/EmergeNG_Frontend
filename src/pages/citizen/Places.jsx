import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil, CheckCheck, Crosshair } from "lucide-react";
import { Alert, Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, Modal, PageHeader, Select, SkeletonList, TextInput, useToast } from "../../components/ui";
import MapView from "../../components/maps/MapView";
import { useI18n } from "../../i18n";
import { useFormat } from "../../lib/format";
import { api } from "../../api/client";
import { friendlyError } from "../../api/errors";
import { qk } from "../../lib/queryClient";
import { getPosition, NIGERIA_CENTER } from "../../lib/geo";
import { required, maxLen, optionalPostcode, normalizePostcode, validCoords, validate } from "../../lib/validators";

const EMPTY = { label_type: "home", label: "", address_text: "", latitude: null, longitude: null, postcode: "" };
export default function Places() {
  const { t, has } = useI18n(); const f = useFormat(); const toast = useToast(); const qc = useQueryClient();
  const q = useQuery({ queryKey: qk.places, queryFn: () => api.get("/saved-locations") });
  const [edit, setEdit] = useState(null); const [form, setForm] = useState(EMPTY); const [errs, setErrs] = useState({}); const [del, setDel] = useState(null); const [gpsBusy, setGpsBusy] = useState(false);
  const inv = () => qc.invalidateQueries({ queryKey: qk.places });
  const open = (p) => { setEdit(p || {}); setForm(p ? { label_type: p.label_type, label: p.label, address_text: p.address_text || "", latitude: p.latitude, longitude: p.longitude, postcode: p.postcode || "" } : EMPTY); setErrs({}); };
  const useGps = async () => { setGpsBusy(true); try { const p = await getPosition({ timeout: 15000 }); setForm((x) => ({ ...x, latitude: p.latitude, longitude: p.longitude })); } catch { toast.err(t("loc.perm.denied")); } finally { setGpsBusy(false); } };
  const save = useMutation({
    mutationFn: () => { const e = validate(form, { label: [required, maxLen(100)], postcode: optionalPostcode }); if (!validCoords(form.latitude, form.longitude)) e.coords = "val.coord"; setErrs(e); if (Object.keys(e).length) throw Object.assign(new Error("val"), { local: true });
      const body = { label_type: form.label_type, label: form.label.trim(), address_text: form.address_text || null, latitude: form.latitude, longitude: form.longitude, postcode: form.postcode ? normalizePostcode(form.postcode) : null };
      return edit.id ? api.patch(`/saved-locations/${edit.id}`, body) : api.post("/saved-locations", body); },
    onSuccess: () => { setEdit(null); inv(); toast.ok(t("state.updated", { when: "" })); }, onError: (e) => { if (!e.local) toast.err(friendlyError(e, { t, has })); },
  });
  const remove = useMutation({ mutationFn: (id) => api.del(`/saved-locations/${id}`), onSuccess: () => { setDel(null); inv(); } });
  const confirm = useMutation({ mutationFn: (id) => api.post(`/saved-locations/${id}/confirm`, {}), onSuccess: () => { inv(); toast.ok(t("sp.confirm")); } });
  const items = q.data?.items || [];
  const field = (k) => ({ value: form[k], onChange: (e) => setForm({ ...form, [k]: e.target.value }), error: errs[k] && t(errs[k]) });
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8 animate-rise">
      <PageHeader title={t("sp.title")} subtitle={t("sp.sub")} actions={<Button icon={Plus} onClick={() => open(null)}>{t("sp.add")}</Button>} />
      {q.isLoading ? <SkeletonList /> : q.isError ? <ErrorState error={q.error} onRetry={q.refetch} /> : items.length === 0 ? <Card><EmptyState title={t("sp.empty")} action={<Button icon={Plus} onClick={() => open(null)}>{t("sp.add")}</Button>} /></Card> : (
        <ul className="space-y-3">{items.map((p) => (<li key={p.id}><Card className="!p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{p.label}</p><p className="text-sm text-ink-3">{p.address_text || `${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}`}</p>{p.postcode && <p className="font-mono text-xs text-ink-3">{p.postcode}</p>}</div><Badge>{t(`sp.type.${p.label_type}`)}</Badge></div>
          <p className="mt-2 text-xs text-ink-3">{p.last_confirmed_at ? t("sp.last_confirmed", { when: f.rel(p.last_confirmed_at) }) : t("sp.never_confirmed")}</p>
          <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="soft" icon={CheckCheck} onClick={() => confirm.mutate(p.id)}>{t("sp.confirm")}</Button><Button size="sm" variant="outline" icon={Pencil} onClick={() => open(p)}>{t("act.edit")}</Button><Button size="sm" variant="dangerSoft" icon={Trash2} aria-label={t("act.delete")} onClick={() => setDel(p)} /></div></Card></li>))}</ul>)}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? t("act.edit") : t("sp.add")} footer={<><Button variant="ghost" onClick={() => setEdit(null)}>{t("act.cancel")}</Button><Button loading={save.isPending} onClick={() => save.mutate()}>{t("act.save")}</Button></>}>
        <div className="space-y-4"><Select label={t("sp.type")} value={form.label_type} onChange={(e) => setForm({ ...form, label_type: e.target.value })}>{["home", "work", "school", "business", "other"].map((k) => <option key={k} value={k}>{t(`sp.type.${k}`)}</option>)}</Select>
          <TextInput label={t("sp.label")} maxLength={100} {...field("label")} /><TextInput label={t("sp.address")} optional maxLength={300} {...field("address_text")} /><TextInput label={t("loc.manual_postcode")} optional placeholder="EK-01-A03-FK-01" {...field("postcode")} />
          <div><Button variant="outline" icon={Crosshair} loading={gpsBusy} onClick={useGps}>{t("sp.use_current")}</Button>{errs.coords && <p className="err">{t(errs.coords)}</p>}
            {validCoords(form.latitude, form.longitude) && <MapView className="mt-3 h-52" pin={{ latitude: form.latitude, longitude: form.longitude }} draggable onPinMove={(la, lo) => setForm((x) => ({ ...x, latitude: la, longitude: lo }))} />}</div></div>
      </Modal>
      <ConfirmDialog open={!!del} danger title={t("act.delete")} body={t("sp.delete_confirm")} loading={remove.isPending} onClose={() => setDel(null)} onConfirm={() => remove.mutate(del.id)} />
    </div>
  );
}
