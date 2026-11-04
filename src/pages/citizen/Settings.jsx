import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sun, Moon, Monitor, Smartphone, LogOut, KeyRound, ShieldCheck, Trash2, Download, UserX } from "lucide-react";
import { Alert, Badge, Button, Card, ConfirmDialog, Modal, PageHeader, PasswordInput, Section, Segmented, Select, TextArea, TextInput, Toggle, useToast } from "../../components/ui";
import { useI18n, LANGS, LANG_LABELS } from "../../i18n";
import { useTheme } from "../../theme/ThemeProvider";
import { useAuth } from "../../auth/AuthProvider";
import { api } from "../../api/client";
import { friendlyError } from "../../api/errors";
import { useFormat } from "../../lib/format";
import { password as vPw, otp as vOtp } from "../../lib/validators";
import { ls } from "../../lib/utils";
import { wipePrivateLocalData } from "../../offline/privacy";

const REQ = ["access", "export", "correction", "deletion", "deactivation"];
export default function Settings() {
  const { t, has, lang, setLang } = useI18n(); const f = useFormat(); const toast = useToast(); const qc = useQueryClient(); const { mode, setMode } = useTheme(); const { user, logout, reload } = useAuth();
  const [big, setBig] = useState(() => ls.get("emergeng.large") === "1");
  useEffect(() => { document.documentElement.dataset.largeText = big ? "true" : "false"; ls.set("emergeng.large", big ? "1" : "0"); }, [big]);
  const err = (e) => toast.err(friendlyError(e, { t, has }));

  // password
  const [pwOpen, setPwOpen] = useState(false); const [pw, setPw] = useState({ cur: "", n: "", c: "" }); const [pwE, setPwE] = useState({});
  const chg = useMutation({ mutationFn: () => { const e = { n: vPw(pw.n) && t(vPw(pw.n)), c: pw.n !== pw.c ? t("val.pw_match") : null, cur: !pw.cur ? t("val.required") : null }; setPwE(e); if (e.n || e.c || e.cur) throw Object.assign(new Error("v"), { local: true }); return api.post("/auth/password/change", { current_password: pw.cur, new_password: pw.n }); },
    onSuccess: () => { setPwOpen(false); setPw({ cur: "", n: "", c: "" }); toast.ok(t("set.pw_done")); }, onError: (e) => { if (!e.local) err(e); } });
  // sessions
  const sess = useQuery({ queryKey: ["sessions"], queryFn: () => api.get("/auth/sessions") });
  const revoke = useMutation({ mutationFn: (id) => api.del(`/auth/sessions/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions"] }), onError: err });
  // MFA
  const [mfa, setMfa] = useState(null); const [mfaCode, setMfaCode] = useState(""); const [mfaPw, setMfaPw] = useState(""); const [mfaOff, setMfaOff] = useState(false);
  const enroll = useMutation({ mutationFn: () => api.post("/auth/mfa/enroll", {}), onSuccess: (r) => { setMfa(r); setMfaCode(""); }, onError: err });
  const confirm = useMutation({ mutationFn: () => api.post("/auth/mfa/confirm", { code: mfaCode }), onSuccess: () => { setMfa(null); reload(); toast.ok(t("set.mfa")); }, onError: err });
  const disable = useMutation({ mutationFn: () => api.post("/auth/mfa/disable", { password: mfaPw, code: mfaCode }), onSuccess: () => { setMfaOff(false); setMfaPw(""); setMfaCode(""); reload(); }, onError: err });
  // privacy
  const reqs = useQuery({ queryKey: ["privacy-requests"], queryFn: () => api.get("/privacy/requests") });
  const [rq, setRq] = useState(null); const [details, setDetails] = useState("");
  const sendReq = useMutation({ mutationFn: () => api.post("/privacy/requests", { request_type: rq, details: details || null }), onSuccess: () => { setRq(null); setDetails(""); qc.invalidateQueries({ queryKey: ["privacy-requests"] }); toast.ok(t("set.req.sent")); }, onError: err });
  const [deact, setDeact] = useState(false);
  const deactM = useMutation({ mutationFn: () => api.post("/users/me/deactivate", {}), onSuccess: async () => { await logout(); }, onError: err });
  const [clr, setClr] = useState(false);
  const [install, setInstall] = useState(null);
  useEffect(() => { const h = (e) => { e.preventDefault(); setInstall(e); }; window.addEventListener("beforeinstallprompt", h); return () => window.removeEventListener("beforeinstallprompt", h); }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-6 sm:py-8 animate-rise">
      <PageHeader title={t("set.title")} subtitle={user.email} actions={<Badge tone={user.email_verified ? "ok" : "warn"}>{user.email_verified ? t("cit.profile.verified") : t("cit.profile.unverified")}</Badge>} />
      <Section title={t("set.appearance")}><Card className="space-y-5">
        <div><p className="mb-2 text-sm font-medium">{t("theme.title")}</p><Segmented value={mode} onChange={setMode} label={t("theme.title")} options={[{ value: "light", label: t("theme.light"), icon: Sun }, { value: "dark", label: t("theme.dark"), icon: Moon }, { value: "system", label: t("theme.system"), icon: Monitor }]} /></div>
        <Select label={t("set.language")} value={lang} onChange={(e) => setLang(e.target.value)}>{LANGS.map((l) => <option key={l} value={l}>{LANG_LABELS[l]}</option>)}</Select>
        <Toggle label={t("set.text")} checked={big} onChange={setBig} /></Card></Section>

      <Section title={t("set.security")}><Card className="space-y-4">
        <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-sm font-medium"><KeyRound className="h-4 w-4 text-ink-2" />{t("set.change_pw")}</span><Button size="sm" variant="outline" onClick={() => setPwOpen(true)}>{t("act.edit")}</Button></div>
        <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-sm font-medium"><ShieldCheck className="h-4 w-4 text-ink-2" />{t("set.mfa")} <Badge tone={user.mfa_enabled ? "ok" : "muted"}>{user.mfa_enabled ? t("state.yes") : t("state.no")}</Badge></span>
          {user.mfa_enabled ? <Button size="sm" variant="dangerSoft" onClick={() => setMfaOff(true)}>{t("act.remove")}</Button> : <Button size="sm" variant="outline" loading={enroll.isPending} onClick={() => enroll.mutate()}>{t("act.add")}</Button>}</div>
      </Card>
      <Card className="mt-3"><h3 className="font-sans text-base font-semibold">{t("set.sessions")}</h3><p className="text-xs text-ink-3">{t("set.sessions_note")}</p>
        <ul className="mt-2 divide-y divide-line/70">{(sess.data?.items || []).map((s) => <li key={s.id} className="flex items-center justify-between gap-3 py-3"><span className="flex min-w-0 items-center gap-3"><Smartphone className="h-5 w-5 shrink-0 text-ink-3" /><span className="min-w-0"><span className="block truncate text-sm">{s.user_agent || "—"}</span><span className="text-xs text-ink-3">{f.rel(s.last_used_at)}</span></span></span>{s.current ? <Badge tone="ok">{t("set.current")}</Badge> : <Button size="sm" variant="ghost" onClick={() => revoke.mutate(s.id)}>{t("set.revoke")}</Button>}</li>)}</ul>
        <Button variant="outline" size="sm" className="mt-2" icon={LogOut} onClick={() => logout({ all: true })}>{t("act.signout")} (all)</Button></Card></Section>

      <Section title={t("set.privacy")} hint={t("set.privacy_sub")}><Card>
        <div className="grid gap-2 sm:grid-cols-2">{REQ.map((r) => <Button key={r} variant="outline" icon={r === "export" || r === "access" ? Download : r === "deletion" ? Trash2 : UserX} onClick={() => setRq(r)} className="justify-start">{t(`set.req.${r}`)}</Button>)}</div>
        <h3 className="mt-5 font-sans text-sm font-semibold">{t("set.req.list")}</h3>
        {(reqs.data?.items || []).length === 0 ? <p className="mt-1 text-sm text-ink-3">{t("set.req.none")}</p> : <ul className="mt-2 divide-y divide-line/70">{reqs.data.items.map((r) => <li key={r.id} className="flex items-center justify-between py-2 text-sm"><span>{t(`set.req.${r.type}`)} · <span className="text-ink-3">{f.date(r.created_at)}</span></span><Badge tone={r.status === "completed" ? "ok" : "info"}>{r.status}</Badge></li>)}</ul>}
        <div className="mt-5 border-t border-line pt-4"><h3 className="font-sans text-sm font-semibold">{t("set.storage")}</h3><p className="mt-1 text-xs text-ink-3">{t("set.storage_body")}</p><Button size="sm" variant="outline" className="mt-2" onClick={() => setClr(true)}>{t("set.clear_local")}</Button></div>
        <p className="mt-4 text-sm"><Link className="underline" to="/privacy">{t("nav.privacy")}</Link> · <Link className="underline" to="/terms">{t("nav.terms")}</Link></p></Card></Section>

      <Section title={t("set.about")}><Card className="space-y-3 text-sm"><div className="flex justify-between"><span className="text-ink-3">{t("set.version")}</span><span>0.1.0</span></div>
        {install ? <Button variant="soft" onClick={() => install.prompt()}>{t("set.install")}</Button> : <p className="text-xs text-ink-3">{t("sys.install_ios")}</p>}
        <Button variant="dangerSoft" onClick={() => setDeact(true)}>{t("set.deactivate")}</Button></Card></Section>

      <Modal open={pwOpen} onClose={() => setPwOpen(false)} title={t("set.change_pw")} footer={<><Button variant="ghost" onClick={() => setPwOpen(false)}>{t("act.cancel")}</Button><Button loading={chg.isPending} onClick={() => chg.mutate()}>{t("act.save")}</Button></>}>
        <div className="space-y-4"><PasswordInput label={t("set.pw_current")} autoComplete="current-password" value={pw.cur} onChange={(e) => setPw({ ...pw, cur: e.target.value })} error={pwE.cur} /><PasswordInput label={t("auth.password_new")} autoComplete="new-password" value={pw.n} onChange={(e) => setPw({ ...pw, n: e.target.value })} error={pwE.n} hint={t("auth.pw_hint")} /><PasswordInput label={t("auth.password_confirm")} autoComplete="new-password" value={pw.c} onChange={(e) => setPw({ ...pw, c: e.target.value })} error={pwE.c} /></div></Modal>
      <Modal open={!!mfa} onClose={() => setMfa(null)} title={t("set.mfa")} footer={<><Button variant="ghost" onClick={() => setMfa(null)}>{t("act.cancel")}</Button><Button loading={confirm.isPending} disabled={!!vOtp(mfaCode)} onClick={() => confirm.mutate()}>{t("act.verify")}</Button></>}>
        <p className="text-sm text-ink-2">Add this key in your authenticator app, then enter the 6-digit code.</p><p className="mt-3 break-all rounded-2xl bg-surface-3 p-3 font-mono text-sm">{mfa?.secret}</p><a className="mt-2 block text-xs underline" href={mfa?.otpauth_uri}>otpauth</a><div className="mt-4"><TextInput label={t("auth.mfa_code")} inputMode="numeric" maxLength={6} autoComplete="one-time-code" value={mfaCode} onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))} /></div></Modal>
      <Modal open={mfaOff} onClose={() => setMfaOff(false)} title={t("set.mfa")} footer={<><Button variant="ghost" onClick={() => setMfaOff(false)}>{t("act.cancel")}</Button><Button variant="danger" loading={disable.isPending} disabled={!mfaPw || !!vOtp(mfaCode)} onClick={() => disable.mutate()}>{t("act.confirm")}</Button></>}><div className="space-y-4"><PasswordInput label={t("auth.password")} value={mfaPw} onChange={(e) => setMfaPw(e.target.value)} /><TextInput label={t("auth.mfa_code")} inputMode="numeric" maxLength={6} value={mfaCode} onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))} /></div></Modal>
      <Modal open={!!rq} onClose={() => setRq(null)} title={rq && t(`set.req.${rq}`)} footer={<><Button variant="ghost" onClick={() => setRq(null)}>{t("act.cancel")}</Button><Button loading={sendReq.isPending} onClick={() => sendReq.mutate()}>{t("act.submit")}</Button></>}><TextArea label={t("set.req.details")} optional rows={4} maxLength={2000} value={details} onChange={(e) => setDetails(e.target.value)} /></Modal>
      <ConfirmDialog open={deact} danger title={t("set.deactivate")} body={t("set.deactivate_confirm")} loading={deactM.isPending} onClose={() => setDeact(false)} onConfirm={() => deactM.mutate()} />
      <ConfirmDialog open={clr} title={t("set.clear_local")} body={t("set.storage_body")} onClose={() => setClr(false)} onConfirm={async () => { await wipePrivateLocalData(user.id); setClr(false); toast.ok(t("set.clear_done")); }} />
    </div>
  );
}
