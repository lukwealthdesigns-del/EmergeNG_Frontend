import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthFrame from "./AuthFrame";
import { Alert, Button, PasswordInput, TextInput } from "../../components/ui";
import { useI18n } from "../../i18n";
import { api } from "../../api/client";
import { friendlyError } from "../../api/errors";
import { email as vEmail, otp as vOtp, password as vPw } from "../../lib/validators";

export default function Forgot() {
  const { t, has } = useI18n(); const nav = useNavigate();
  const [step, setStep] = useState(1); const [email, setEmail] = useState(""); const [code, setCode] = useState(""); const [pw, setPw] = useState(""); const [pw2, setPw2] = useState(""); const [err, setErr] = useState(null); const [e, setE] = useState({}); const [busy, setBusy] = useState(false); const [info, setInfo] = useState(null);
  const send = async (ev) => { ev.preventDefault(); const v = vEmail(email); setE({ email: v && t(v) }); if (v) return; setBusy(true); setErr(null);
    try { await api.post("/auth/password/forgot", { email: email.trim() }, { auth: "none" }); setInfo(t("auth.verify.sent")); setStep(2); } catch (ex) { setErr(friendlyError(ex, { t, has })); } finally { setBusy(false); } };
  const reset = async (ev) => { ev.preventDefault(); const x = { code: vOtp(code), pw: vPw(pw), pw2: pw !== pw2 ? "val.pw_match" : null }; setE({ code: x.code && t(x.code), pw: x.pw && t(x.pw), pw2: x.pw2 && t(x.pw2) }); if (x.code || x.pw || x.pw2) return; setBusy(true); setErr(null);
    try { await api.post("/auth/password/reset", { email: email.trim(), code, new_password: pw }, { auth: "none" }); nav("/signin", { replace: true, state: { notice: t("auth.reset.done") } }); } catch (ex) { setErr(friendlyError(ex, { t, has })); } finally { setBusy(false); } };
  return (
    <AuthFrame title={step === 1 ? t("auth.forgot.title") : t("auth.reset.title")} sub={step === 1 ? t("auth.forgot.sub") : null} footer={<Link className="underline" to="/signin">{t("act.signin")}</Link>}>
      {step === 1 ? (
        <form onSubmit={send} className="space-y-4" noValidate>{err && <Alert tone="danger">{err}</Alert>}
          <TextInput label={t("auth.email")} type="email" inputMode="email" autoComplete="email" value={email} onChange={(x) => setEmail(x.target.value)} error={e.email} />
          <Button type="submit" size="lg" block loading={busy}>{t("auth.forgot.send")}</Button></form>
      ) : (
        <form onSubmit={reset} className="space-y-4" noValidate>{info && <Alert tone="ok">{info}</Alert>}{err && <Alert tone="danger">{err}</Alert>}
          <TextInput label="6-digit code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(x) => setCode(x.target.value.replace(/\D/g, "").slice(0, 6))} error={e.code} />
          <PasswordInput label={t("auth.password_new")} autoComplete="new-password" value={pw} onChange={(x) => setPw(x.target.value)} error={e.pw} hint={t("auth.pw_hint")} />
          <PasswordInput label={t("auth.password_confirm")} autoComplete="new-password" value={pw2} onChange={(x) => setPw2(x.target.value)} error={e.pw2} />
          <Button type="submit" size="lg" block loading={busy}>{t("act.confirm")}</Button></form>)}
    </AuthFrame>
  );
}
