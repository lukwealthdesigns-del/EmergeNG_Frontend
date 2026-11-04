import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Printer, QrCode, Smartphone, Trash2, UserRound } from "lucide-react";
import { Alert, Button, Card, Checkbox, PageHeader, TextInput, useToast } from "../../components/ui";
import { BackLink } from "../../components/common/bits";
import QRCodeView, { qrToPngDataUrl } from "../../components/emergency/QRCodeView";
import { useI18n, LANG_LABELS } from "../../i18n";
import { useAuth } from "../../auth/AuthProvider";
import { api } from "../../api/client";
import { friendlyError } from "../../api/errors";
import { idb } from "../../offline/idb";
import { qk } from "../../lib/queryClient";
import { useFormat } from "../../lib/format";
import { buildQrPayload, QR_FIELDS, QR_MAX_CHARS } from "../../lib/qrPayload";

const MEDICAL = ["blood_group", "allergies", "conditions", "medications", "disability_needs", "emergency_notes"];
const qrKey = (uid) => `qr:${uid}`; // stored in the "card" store, which is wiped on sign-out

export default function EmergencyCard() {
  const { t, has } = useI18n(); const f = useFormat(); const toast = useToast(); const { user } = useAuth();
  const [values, setValues] = useState({ name: user?.full_name || "", language: user?.preferred_language ? LANG_LABELS[user.preferred_language] || user.preferred_language : "" });
  const [include, setInclude] = useState({ name: !!user?.full_name });   // medical details are OFF until the person ticks them
  const [contact, setContact] = useState("");
  const [saved, setSaved] = useState(null); const [loaded, setLoaded] = useState(false);
  const med = useQuery({ queryKey: qk.medical, queryFn: () => api.get("/emergency-profile/medical"), enabled: false, gcTime: 0, staleTime: 0 }); // sensitive: never cached
  const [buildErr, setBuildErr] = useState(false);

  useEffect(() => { idb.get("card", qrKey(user.id)).then((r) => setSaved(r?.qr || null)).catch(() => {}); }, [user.id]);

  const loadProfile = useCallback(async () => {
    try {
      const r = await med.refetch({ throwOnError: true }); const d = r.data || {};
      setValues((v) => ({ ...v, blood_group: d.blood_group || "", allergies: d.allergies || [], conditions: d.conditions || [], medications: d.medications || [], disability_needs: d.disability_needs || "", emergency_notes: d.emergency_notes || "" }));
      setLoaded(true); toast.ok(t("qr.loaded"));
    } catch (e) { toast.err(e?.isNetwork ? t("qr.need_online") : friendlyError(e, { t, has })); }
  }, [med, t, has, toast]);

  const payload = useMemo(() => buildQrPayload({ values, include, contact }), [values, include, contact]);
  useEffect(() => setBuildErr(false), [payload.text]);
  const set = (k) => (v) => setInclude((i) => ({ ...i, [k]: v }));
  const shown = payload.text && !payload.tooLong ? payload.text : "";
  const live = shown || null;                                   // what is currently on screen
  const view = live || (!payload.text ? saved?.text : null);     // fall back to the saved QR when nothing is being edited

  const saveDevice = async () => {
    try { await idb.put("card", { ownerId: qrKey(user.id), qr: { text: payload.text, savedAt: new Date().toISOString() } }); setSaved({ text: payload.text, savedAt: new Date().toISOString() }); toast.ok(t("qr.saved")); }
    catch (e) { toast.err(friendlyError(e, { t, has })); }
  };
  const removeSaved = async () => { try { await idb.del("card", qrKey(user.id)); setSaved(null); toast.ok(t("qr.removed")); } catch (e) { toast.err(friendlyError(e, { t, has })); } };
  const download = async () => {
    try { const url = await qrToPngDataUrl(view); const a = document.createElement("a"); a.href = url; a.download = "emergeng-emergency-card.png"; document.body.appendChild(a); a.click(); a.remove(); }
    catch (e) { toast.err(friendlyError(e, { t, has })); }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8 animate-rise">
      <PageHeader title={t("qr.title")} subtitle={t("qr.sub")} back={<BackLink to="/app/profile">{t("nav.emergency_profile")}</BackLink>} />
      <Alert tone="warn" className="mb-4 no-print">{t("off.qr_warn")}</Alert>
      <div className="grid gap-4 md:grid-cols-[1fr_320px]">
        <Card className="space-y-4 no-print">
          <h2 className="text-lg">{t("qr.fields")}</h2>
          <TextInput label={t("auth.full_name")} maxLength={80} value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} />
          <Checkbox checked={!!include.name} onChange={set("name")}>{t("qr.f.name")}</Checkbox>
          <Checkbox checked={!!include.language} onChange={set("language")}>{t("qr.f.language")}{values.language ? ` — ${values.language}` : ""}</Checkbox>
          <div className="rounded-2xl bg-surface-2 p-3 text-sm text-ink-2"><p>{t("qr.medical_note")}</p>
            <Button size="sm" variant="outline" className="mt-2" icon={UserRound} loading={med.isFetching} onClick={loadProfile}>{t("qr.load_medical")}</Button></div>
          {MEDICAL.map((k) => { const v = [].concat(values[k] || []).join(", "); return (
            <div key={k}><Checkbox checked={!!include[k]} disabled={!v} onChange={set(k)}>{t(`qr.f.${k}`)}</Checkbox>{loaded && v && include[k] && <p className="ml-8 mt-0.5 text-xs text-ink-3">{v}</p>}</div>); })}
          <TextInput label={t("qr.contact")} placeholder={t("qr.contact_ph")} maxLength={120} value={contact} onChange={(e) => { setContact(e.target.value); setInclude((i) => ({ ...i, contact: true })); }} />
          <p className="text-xs text-ink-3">{t("qr.english_note")}</p>
        </Card>
        <div className="space-y-3">
          <Card className="grid place-items-center gap-3 text-center print-area">
            {view ? (<>
              <h2 className="text-base">{live ? t("qr.preview") : t("qr.saved_title")}</h2>
              <QRCodeView text={view} onError={() => setBuildErr(true)} />
              {!live && saved && <p className="text-xs text-ink-3">{t("qr.saved_on", { when: f.dateTime(saved.savedAt) })}</p>}
              <p className="text-xs text-ink-3 no-print">{t("qr.scan_help")}</p>
              <pre className="w-full whitespace-pre-wrap break-words rounded-2xl bg-surface-2 p-3 text-left text-xs text-ink-2 print-text">{view}</pre>
            </>) : <div className="py-8 text-sm text-ink-3"><QrCode className="mx-auto mb-2 h-8 w-8" aria-hidden />{payload.tooLong ? "" : t("qr.empty")}</div>}
            {(payload.tooLong || buildErr) && <Alert tone="danger" className="w-full text-left">{t("qr.too_long")}</Alert>}
            <p className={`text-xs no-print ${payload.tooLong ? "text-danger" : "text-ink-3"}`}>{t("qr.size", { n: payload.length, max: QR_MAX_CHARS })}</p>
          </Card>
          <div className="flex flex-wrap gap-2 no-print">
            {live && <Button icon={Smartphone} onClick={saveDevice}>{t("qr.save_device")}</Button>}
            {view && <Button variant="outline" icon={Download} onClick={download}>{t("qr.download")}</Button>}
            {view && <Button variant="outline" icon={Printer} onClick={() => window.print()}>{t("qr.print")}</Button>}
            {saved && <Button variant="ghost" icon={Trash2} onClick={removeSaved}>{t("ep.offline_clear")}</Button>}
          </div>
        </div>
      </div>
    </div>
  );
}
