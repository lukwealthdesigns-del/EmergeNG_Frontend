import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Car, HeartPulse, Flame, ShieldAlert, CloudLightning, UserSearch, Building, CircleAlert, Camera, X, Phone, Send, ArrowLeft, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import LocationCapture from "../../components/emergency/LocationCapture";
import { Alert, Button, Card, ChoiceGrid, Checkbox, PageHeader, Stepper, TextArea, TextInput, Toggle, useToast } from "../../components/ui";
import { useI18n, useLabels } from "../../i18n";
import { useAuth } from "../../auth/AuthProvider";
import { useNet } from "../../hooks/useNet";
import { api } from "../../api/client";
import { idb } from "../../offline/idb";
import { createLocalReport, saveReport } from "../../offline/outbox";
import { syncNow } from "../../offline/syncManager";
import { stageImage } from "../../offline/media";
import { buildCreateOperation } from "../../offline/protocol";
import { CATEGORIES, MED_FIELDS } from "../../lib/enums";
import { cleanText, uuid } from "../../lib/utils";
import { optionalPhone, optionalEmail, normalizePhone, validCoords } from "../../lib/validators";

const ICONS = { road_accident: Car, medical_emergency: HeartPulse, fire: Flame, security_threat: ShieldAlert, natural_disaster: CloudLightning, missing_person: UserSearch, building_infrastructure: Building, other_emergency: CircleAlert };
const SEV = [["minor", "report.sev.minor"], ["serious", "report.sev.serious"], ["life_threatening", "report.sev.life"]];
const DRAFT_KEY = "reportDraft";

export default function Report() {
  const { t, has } = useI18n(); const L = useLabels(); const nav = useNavigate(); const loc0 = useLocation(); const toast = useToast(); const { user, isAuthed } = useAuth(); const net = useNet();
  const steps = [t("report.step.type"), t("report.step.where"), t("report.step.details"), t("report.step.review")];
  const [step, setStep] = useState(0); const [d, setD] = useState({ category: "", severity: "", description: "", loc: loc0.state?.loc || null, reporterName: "", callbackPhone: "", callbackEmail: "", notifyContactIds: [], shareMedicalFields: [] });
  const [photos, setPhotos] = useState([]); const [errors, setErrors] = useState({}); const [busy, setBusy] = useState(false); const [restored, setRestored] = useState(false); const [storageFail, setStorageFail] = useState(false);
  const cid = useRef(uuid()).current; // staging id for photos before the report record exists
  const set = (k, v) => setD((x) => ({ ...x, [k]: v }));
  const online = net.net === "ONLINE" || net.net === "SYNCING" || net.net === "SYNC_ERROR";

  // restore unfinished draft (device-local only)
  useEffect(() => { idb.get("meta", DRAFT_KEY).then((r) => { if (r?.d && !loc0.state?.loc) { setD((x) => ({ ...x, ...r.d })); setRestored(true); } }).catch(() => {}); }, []); // eslint-disable-line
  useEffect(() => { const x = setTimeout(() => { if (d.category || d.description) idb.put("meta", { key: DRAFT_KEY, d: { ...d, loc: d.loc } }).catch(() => {}); }, 600); return () => clearTimeout(x); }, [d]);

  const contacts = useQuery({ queryKey: ["contacts"], enabled: isAuthed && online, queryFn: () => api.get("/trusted-contacts"), staleTime: 60_000 });
  useEffect(() => { if (contacts.data?.items && !d.notifyContactIds.length) set("notifyContactIds", contacts.data.items.filter((c) => c.notify_on_incident).map((c) => c.id)); }, [contacts.data]); // eslint-disable-line

  const validate = useCallback((s) => {
    const e = {};
    if (s >= 0 && !d.category) e.category = t("val.required");
    if (s >= 1 && (!d.loc || !validCoords(d.loc.latitude, d.loc.longitude))) e.loc = t("loc.perm.title");
    if (s >= 2) { const p = optionalPhone(d.callbackPhone); if (p) e.callbackPhone = t(p); const m = optionalEmail(d.callbackEmail); if (m) e.callbackEmail = t(m); if (d.description.length > 2000) e.description = t("val.too_long"); }
    return e;
  }, [d, t]);
  const next = () => { const e = validate(step); setErrors(e); if (!Object.keys(e).length) setStep((s) => s + 1); else toast.err(t("val.fix_errors")); };

  const addPhoto = async (ev) => {
    const files = [...(ev.target.files || [])].slice(0, 3 - photos.length); ev.target.value = "";
    for (const f of files) { const r = await stageImage(cid, f).catch(() => ({ error: "val.file_type" })); if (r.error) toast.err(t(r.error)); else setPhotos((p) => [...p, { ...r, url: URL.createObjectURL(f), name: f.name }]); }
  };

  const submit = async () => {
    const e = { ...validate(3) }; setErrors(e); if (Object.keys(e).length) { setStep(e.category ? 0 : e.loc ? 1 : 2); return; }
    setBusy(true); setStorageFail(false);
    const loc = d.loc;
    const draft = { category: d.category, severity: d.severity || undefined, description: cleanText(d.description, 2000), latitude: loc.latitude, longitude: loc.longitude, accuracyM: loc.accuracyMeters ?? undefined, capturedAt: loc.capturedAt, locationSource: loc.source, manuallyCorrected: loc.manuallyCorrected, addressText: cleanText(loc.addressText, 300), postcode: loc.postcode || undefined,
      reporterName: cleanText(d.reporterName || (isAuthed ? user.full_name : ""), 120) || undefined, callbackPhone: normalizePhone(d.callbackPhone) || undefined, callbackEmail: cleanText(d.callbackEmail, 254) || undefined,
      notifyContactIds: isAuthed ? d.notifyContactIds : [], shareMedicalFields: isAuthed ? d.shareMedicalFields : [], attachments: photos.map((p) => ({ id: p.id, mime: p.mime, bytes: p.bytes })) };
    try {
      const rec = await createLocalReport({ draft, ownerId: user?.id, createdOffline: !online });
      // re-key staged photos to the real record id
      const media = (await idb.all("media")).filter((m) => m.clientIncidentId === cid); for (const m of media) await idb.put("media", { ...m, clientIncidentId: rec.clientIncidentId });
      idb.del("meta", DRAFT_KEY).catch(() => {});
      if (online) syncNow({ force: true }); // do not await: the done page shows live state
      nav(`/report/done/${rec.clientIncidentId}`, { replace: true });
    } catch {
      // Secure local storage unavailable. Online: send directly (never claim "saved locally"). Offline: tell the truth.
      if (!online) { setStorageFail(true); setBusy(false); return; }
      try {
        const rec = { clientIncidentId: uuid(), createdAt: new Date().toISOString(), draft, createdOffline: false };
        const res = await api.post("/offline/sync", buildCreateOperation(rec), { timeout: 20000 });
        const r = res.results?.[0];
        if (r?.server_incident_id) nav(`/report/done/${rec.clientIncidentId}`, { replace: true, state: { record: { ...rec, state: "SYNCED", serverIncidentId: r.server_incident_id, trackingToken: r.tracking_token, serverStatus: r.incident_status, serverReceivedAt: r.server_received_at, events: [] } } });
        else throw new Error("not accepted");
      } catch { setStorageFail(true); setBusy(false); }
    }
  };

  const meds = MED_FIELDS;
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8 animate-rise">
      <PageHeader center title={t("report.title")} subtitle={t("report.sub")} actions={<Button href="tel:112" variant="danger" icon={Phone} size="sm">{t("report.call_first")}</Button>} />
      <Stepper steps={steps} index={step} />
      {restored && <Alert tone="info" className="mt-4">{t("report.draft_restored")}</Alert>}
      {!online && <Alert tone="warn" className="mt-4">{t("report.sending_offline")}</Alert>}
      {!isAuthed && <p className="mt-4 text-sm text-ink-2">{t("report.guest_note")}</p>}
      <div className="mt-6">
        {step === 0 && (<div className="space-y-6">
          <div><h2 className="mb-3 text-lg">{t("report.type")}</h2><ChoiceGrid value={d.category} onChange={(v) => set("category", v)} options={CATEGORIES.map((c) => ({ value: c, label: L.category(c), icon: ICONS[c] }))} />{errors.category && <p role="alert" className="err mt-2 text-xs font-medium text-danger">{errors.category}</p>}</div>
          <div><h2 className="mb-1 text-lg">{t("report.severity")}</h2><p className="mb-3 text-xs text-ink-3">{t("report.sev_note")}</p><ChoiceGrid cols="grid-cols-3" value={d.severity} onChange={(v) => set("severity", v)} options={SEV.map(([v, k]) => ({ value: v, label: t(k) }))} /></div>
        </div>)}
        {step === 1 && (<div><h2 className="mb-3 text-lg">{t("report.location")}</h2><LocationCapture value={d.loc} onChange={(l) => set("loc", l)} autoStart />{errors.loc && <p role="alert" className="mt-2 text-xs font-medium text-danger">{errors.loc}</p>}</div>)}
        {step === 2 && (<div className="space-y-5">
          <TextArea label={t("report.what")} placeholder={t("report.what_ph")} value={d.description} maxLength={2000} onChange={(e) => set("description", e.target.value)} error={errors.description} rows={5} />
          <Card><h3 className="font-sans text-base font-semibold">{t("report.contact")}</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <TextInput label={t("report.name")} optional value={d.reporterName} onChange={(e) => set("reporterName", e.target.value)} maxLength={120} autoComplete="name" placeholder={isAuthed ? user.full_name || "" : ""} />
              <TextInput label={t("report.callback")} optional value={d.callbackPhone} onChange={(e) => set("callbackPhone", e.target.value)} inputMode="tel" autoComplete="tel" placeholder="0803 123 4567" error={errors.callbackPhone} />
            </div>
            <TextInput className="mt-4" label={t("report.callback_email")} optional type="email" inputMode="email" autoComplete="email" value={d.callbackEmail} onChange={(e) => set("callbackEmail", e.target.value)} error={errors.callbackEmail} />
          </Card>
          <Card><h3 className="font-sans text-base font-semibold">{t("report.evidence")}</h3><p className="mt-1 text-xs text-ink-3">{t("report.evidence_note")}</p>
            <div className="mt-3 flex flex-wrap gap-3">{photos.map((p) => (<div key={p.id} className="relative h-20 w-20 overflow-hidden rounded-2xl border border-line"><img src={p.url} alt="" className="h-full w-full object-cover" /><button aria-label={t("act.remove")} onClick={() => setPhotos((x) => x.filter((y) => y.id !== p.id))} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"><X className="h-3.5 w-3.5" /></button></div>))}
              {photos.length < 3 && <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-line text-xs text-ink-3 hover:bg-surface-2"><Camera className="h-5 w-5" />{t("act.add")}<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" multiple className="sr-only" onChange={addPhoto} /></label>}</div>
          </Card>
          {isAuthed && (<Card><h3 className="font-sans text-base font-semibold">{t("report.share_info")}</h3><p className="mt-1 text-xs text-ink-3">{t("report.share_info_note")}</p>
            <div className="mt-2 divide-y divide-line/70">{meds.map((m) => <Toggle key={m} label={t(`ep.${{ blood_group: "blood", allergies: "allergies", conditions: "conditions", medications: "medications", disability_needs: "needs", emergency_notes: "notes" }[m]}`)} checked={d.shareMedicalFields.includes(m)} onChange={(v) => set("shareMedicalFields", v ? [...d.shareMedicalFields, m] : d.shareMedicalFields.filter((x) => x !== m))} />)}</div>
            {contacts.data?.items?.length > 0 && (<div className="mt-4"><p className="mb-1 text-sm font-medium">{t("report.notify")}</p>{contacts.data.items.map((c) => <Toggle key={c.id} label={c.name} hint={c.relationship} checked={d.notifyContactIds.includes(c.id)} onChange={(v) => set("notifyContactIds", v ? [...d.notifyContactIds, c.id] : d.notifyContactIds.filter((x) => x !== c.id))} />)}</div>)}
          </Card>)}
        </div>)}
        {step === 3 && (<Card><h2 className="text-lg">{t("report.review")}</h2><p className="text-sm text-ink-3">{t("report.review_sub")}</p>
          <dl className="mt-3 text-sm">{[[t("report.type"), L.category(d.category)], [t("report.severity"), d.severity ? t(SEV.find((s) => s[0] === d.severity)[1]) : "—"], [t("report.location"), d.loc ? `${d.loc.latitude.toFixed(5)}, ${d.loc.longitude.toFixed(5)}${d.loc.postcode ? ` · ${d.loc.postcode}` : ""}` : "—"], [t("report.what"), d.description || "—"], [t("report.callback"), d.callbackPhone || "—"], [t("report.evidence"), photos.length || "—"]].map(([k, v]) => <div key={k} className="flex justify-between gap-4 border-b border-line/60 py-2 last:border-0"><dt className="text-ink-3">{k}</dt><dd className="max-w-[60%] break-words text-right text-ink">{v}</dd></div>)}</dl>
          {storageFail && <Alert tone="danger" className="mt-4">{t("report.storage_fail")}</Alert>}
          <p className="mt-4 text-xs text-ink-3">{t("report.call_first")}: <a href="tel:112" className="font-semibold text-danger underline">112</a></p>
        </Card>)}
      </div>
      <div className="mt-6 flex gap-3">
        {step > 0 && <Button variant="outline" size="lg" icon={ArrowLeft} onClick={() => setStep(step - 1)} aria-label={t("act.back")} />}
        {step < 3 ? <Button size="lg" block onClick={next}>{t("act.continue")}<ArrowRight className="h-4 w-4" /></Button>
          : <Button size="lg" block variant="danger" icon={Send} loading={busy} onClick={submit}>{online ? t("report.submit") : t("report.save_local")}</Button>}
      </div>
    </div>
  );
}
