// Separate sign-in for administrators (/admin/login). It uses the same backend login as everyone else (password, then
// an authenticator code when the account has MFA). Google sign-in is deliberately NOT offered here: the backend refuses
// it for staff and administrator accounts.
import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { Alert, Button, PasswordInput, TextInput } from "../../components/ui";
import { useI18n } from "../../i18n";
import { useAuth } from "../../auth/AuthProvider";
import { canAdmin } from "../../auth/permissions";
import { useForm } from "../../hooks/useForm";
import { email as vEmail, required } from "../../lib/validators";
import { friendlyError } from "../../api/errors";

const RULES = { email: vEmail, password: required };
export default function AdminSignIn() {
  const { t, has } = useI18n(); const { login, user, isAuthed } = useAuth(); const nav = useNavigate(); const loc = useLocation();
  const form = useForm({ email: "", password: "", mfa_code: "" }, RULES);
  const [err, setErr] = useState(null); const [mfa, setMfa] = useState(false); const [busy, setBusy] = useState(false); const [notAdmin, setNotAdmin] = useState(null);
  const from = loc.state?.from && String(loc.state.from).startsWith("/admin") && loc.state.from !== "/admin/login" ? loc.state.from : "/admin";

  if (isAuthed && canAdmin(user) && !notAdmin) return <Navigate to={from} replace />;

  const submit = async (e) => {
    e.preventDefault(); setErr(null); if (!form.check()) return; setBusy(true);
    try {
      const r = await login({ email: form.values.email.trim(), password: form.values.password, mfa_code: mfa ? form.values.mfa_code : undefined });
      if (canAdmin(r.user)) nav(from, { replace: true });
      else setNotAdmin(r.home); // signed in, but not an administrator: do NOT sign them out (that would wipe their offline data)
    } catch (ex) {
      if (ex.code === "MFA_REQUIRED") { setMfa(true); setErr({ msg: t("err.MFA_REQUIRED"), tone: "info" }); }
      else if (ex.code === "EMAIL_VERIFICATION_REQUIRED") nav(`/verify-email?email=${encodeURIComponent(form.values.email.trim())}`);
      else setErr({ msg: friendlyError(ex, { t, has }), tone: "danger" });
    } finally { setBusy(false); }
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10 animate-rise">
      <div className="mb-6 flex flex-col items-center text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-fg"><ShieldCheck className="h-8 w-8" aria-hidden /></span>
        <h1 className="mt-4 text-3xl">{t("admin.login.title")}</h1>
        <p className="mt-2 text-ink-2">{t("admin.login.sub")}</p>
      </div>
      <div className="rounded-3xl border border-line bg-surface p-5 shadow-soft sm:p-6">
        {notAdmin ? (
          <div className="space-y-4">
            <Alert tone="warn">{t("admin.login.not_admin")}</Alert>
            <Button block size="lg" to={notAdmin} replace>{t("admin.login.continue_account")}</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            {err && <Alert tone={err.tone}>{err.msg}</Alert>}
            <TextInput label={t("auth.email")} type="email" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck={false} {...form.bind("email")} error={form.errors.email && t(form.errors.email)} />
            <PasswordInput label={t("auth.password")} autoComplete="current-password" {...form.bind("password")} error={form.errors.password && t(form.errors.password)} />
            {mfa && <TextInput label={t("auth.mfa_code")} inputMode="numeric" autoComplete="one-time-code" maxLength={6} {...form.bind("mfa_code", { transform: (v) => v.replace(/\D/g, "").slice(0, 6) })} autoFocus />}
            <Button type="submit" size="lg" block loading={busy}>{busy ? t("auth.signing_in") : t("act.signin")}</Button>
            <p className="text-center text-xs text-ink-3">{t("admin.login.google_note")}</p>
          </form>
        )}
      </div>
      <p className="mt-5 text-center text-sm text-ink-2"><Link to="/forgot-password" className="underline">{t("auth.forgot")}</Link><span aria-hidden> · </span><Link to="/" className="underline">{t("admin.login.back")}</Link></p>
    </main>
  );
}
