import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthFrame from "./AuthFrame";
import { Alert, Button, Checkbox, PasswordInput, TextInput } from "../../components/ui";
import { useI18n } from "../../i18n";
import { useAuth } from "../../auth/AuthProvider";
import { useForm } from "../../hooks/useForm";
import { email as vEmail, required, password as vPw, passwordStrength, optionalPhone, normalizePhone, maxLen } from "../../lib/validators";
import { friendlyError } from "../../api/errors";
import { api } from "../../api/client";
import { LEGAL_VERSION } from "../../i18n/locales/en/legal";
import { cn } from "../../lib/utils";
import GoogleSignIn from "../../components/auth/GoogleSignIn";

export default function SignUp() {
  const { t, has } = useI18n(); const { register } = useAuth(); const nav = useNavigate();
  const rules = useMemo(() => ({ full_name: [required, maxLen(200)], email: vEmail, phone: optionalPhone, password: vPw, confirm: (v, all) => (v !== all.password ? "val.pw_match" : null), accept: (v) => (v ? null : "val.terms") }), []);
  const form = useForm({ full_name: "", email: "", phone: "", password: "", confirm: "", accept: false }, rules);
  const [err, setErr] = useState(null); const [busy, setBusy] = useState(false); const s = passwordStrength(form.values.password);
  const submit = async (e) => {
    e.preventDefault(); setErr(null); if (!form.check()) return; setBusy(true);
    try {
      const v = form.values; const r = await register({ email: v.email.trim(), password: v.password, full_name: v.full_name.trim(), ...(v.phone ? { phone: normalizePhone(v.phone) } : {}) });
      if (r.verificationRequired) nav(`/verify-email?email=${encodeURIComponent(v.email.trim())}`, { replace: true });
      else { await Promise.allSettled(["terms", "privacy_policy"].map((p) => api.post("/consents", { purpose: p, granted: true, policy_version: LEGAL_VERSION }))); nav("/app", { replace: true, state: { welcome: true } }); }
    } catch (ex) { setErr(friendlyError(ex, { t, has })); if (ex.details) form.setErrors(Object.fromEntries((ex.details || []).map((d) => [String(d.field).split(".").pop(), "val.required"]))); } finally { setBusy(false); }
  };
  const bars = ["bg-danger", "bg-warn", "bg-warn", "bg-ok", "bg-ok"];
  return (
    <AuthFrame title={t("auth.signup.title")} sub={t("auth.signup.sub")} footer={<>{t("auth.have_account")} <Link className="font-semibold text-ink underline" to="/signin">{t("act.signin")}</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {err && <Alert tone="danger">{err}</Alert>}
        <TextInput label={t("auth.full_name")} autoComplete="name" {...form.bind("full_name")} error={form.errors.full_name && t(form.errors.full_name)} />
        <TextInput label={t("auth.email")} type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} {...form.bind("email")} error={form.errors.email && t(form.errors.email)} />
        <TextInput label={t("auth.phone")} optional inputMode="tel" autoComplete="tel" placeholder="0803 123 4567" {...form.bind("phone")} error={form.errors.phone && t(form.errors.phone)} />
        <div>
          <PasswordInput label={t("auth.password_new")} autoComplete="new-password" {...form.bind("password")} error={form.errors.password && t(form.errors.password)} hint={t("auth.pw_hint")} />
          {form.values.password && <div className="mt-2 flex gap-1" aria-hidden>{[0, 1, 2, 3].map((i) => <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < s ? bars[s] : "bg-line")} />)}</div>}
        </div>
        <PasswordInput label={t("auth.password_confirm")} autoComplete="new-password" {...form.bind("confirm")} error={form.errors.confirm && t(form.errors.confirm)} />
        <Checkbox checked={form.values.accept} onChange={(v) => form.set("accept", v)} error={form.errors.accept && t(form.errors.accept)}>{t("auth.accept")} <Link className="underline" to="/terms" target="_blank">{t("nav.terms")}</Link> {t("auth.and")} <Link className="underline" to="/privacy" target="_blank">{t("nav.privacy")}</Link></Checkbox>
        <Button type="submit" size="lg" block loading={busy}>{busy ? t("auth.creating") : t("act.signup")}</Button>
      </form>
      <GoogleSignIn mode="signup" onDone={(r) => nav(r.home, { replace: true })} />
    </AuthFrame>
  );
}
