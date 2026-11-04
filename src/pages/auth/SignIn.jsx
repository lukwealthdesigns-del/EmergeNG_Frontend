import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthFrame from "./AuthFrame";
import { Alert, Button, PasswordInput, TextInput } from "../../components/ui";
import { useI18n } from "../../i18n";
import { useAuth } from "../../auth/AuthProvider";
import { useForm } from "../../hooks/useForm";
import { email as vEmail, required } from "../../lib/validators";
import { friendlyError } from "../../api/errors";
import GoogleSignIn from "../../components/auth/GoogleSignIn";

const RULES = { email: vEmail, password: required };
export default function SignIn() {
  const { t, has } = useI18n(); const { login } = useAuth(); const nav = useNavigate(); const loc = useLocation();
  const form = useForm({ email: "", password: "", mfa_code: "" }, RULES); const [err, setErr] = useState(null); const [mfa, setMfa] = useState(false); const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr(null); if (!form.check()) return; setBusy(true);
    try {
      const r = await login({ email: form.values.email.trim(), password: form.values.password, mfa_code: mfa ? form.values.mfa_code : undefined });
      const from = loc.state?.from; nav(from && from !== "/signin" ? from : r.home, { replace: true });
    } catch (ex) {
      if (ex.code === "MFA_REQUIRED") { setMfa(true); setErr({ msg: t("err.MFA_REQUIRED"), tone: "info" }); }
      else if (ex.code === "EMAIL_VERIFICATION_REQUIRED") nav(`/verify-email?email=${encodeURIComponent(form.values.email.trim())}`);
      else setErr({ msg: friendlyError(ex, { t, has }), tone: "danger" });
    } finally { setBusy(false); }
  };
  return (
    <AuthFrame title={t("auth.signin.title")} sub={t("auth.signin.sub")} footer={<>{t("auth.no_account")} <Link className="font-semibold text-ink underline" to="/signup">{t("act.signup")}</Link><br /><Link className="mt-2 inline-block underline" to="/">{t("auth.continue_guest")}</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {err && <Alert tone={err.tone}>{err.msg}</Alert>}
        <TextInput label={t("auth.email")} type="email" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck={false} {...form.bind("email")} error={form.errors.email && t(form.errors.email)} />
        <PasswordInput label={t("auth.password")} autoComplete="current-password" {...form.bind("password")} error={form.errors.password && t(form.errors.password)} />
        {mfa && <TextInput label={t("auth.mfa_code")} inputMode="numeric" autoComplete="one-time-code" maxLength={6} {...form.bind("mfa_code", { transform: (v) => v.replace(/\D/g, "").slice(0, 6) })} autoFocus />}
        <div className="text-right"><Link to="/forgot-password" className="text-sm text-ink-2 underline">{t("auth.forgot")}</Link></div>
        <Button type="submit" size="lg" block loading={busy}>{busy ? t("auth.signing_in") : t("act.signin")}</Button>
        <p className="text-center text-xs text-ink-3">{t("auth.staff_note2")} <Link to="/admin/login" className="underline">{t("admin.login.link")}</Link></p>
      </form>
      <GoogleSignIn mode="signin" onDone={(r) => { const from = loc.state?.from; nav(from && from !== "/signin" ? from : r.home, { replace: true }); }} />
    </AuthFrame>
  );
}
