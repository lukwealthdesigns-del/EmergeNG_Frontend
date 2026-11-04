import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthFrame from "./AuthFrame";
import { Alert, Button, TextInput } from "../../components/ui";
import { useI18n } from "../../i18n";
import { api } from "../../api/client";
import { friendlyError } from "../../api/errors";
import { otp as vOtp, email as vEmail } from "../../lib/validators";
import { maskEmail } from "../../lib/format";

export default function VerifyEmail() {
  const { t, has } = useI18n(); const [sp] = useSearchParams(); const nav = useNavigate();
  const email = sp.get("email") || ""; const [code, setCode] = useState(""); const [err, setErr] = useState(null); const [info, setInfo] = useState(null); const [busy, setBusy] = useState(false); const [cool, setCool] = useState(30);
  useEffect(() => { if (cool <= 0) return; const x = setTimeout(() => setCool((c) => c - 1), 1000); return () => clearTimeout(x); }, [cool]);
  const verify = async (e) => { e.preventDefault(); setErr(null); const v = vOtp(code); if (v) return setErr(t(v)); setBusy(true);
    try { await api.post("/auth/verify-email", { email, code }, { auth: "none" }); setInfo(t("auth.verify.done")); setTimeout(() => nav("/signin", { replace: true }), 1200); } catch (ex) { setErr(friendlyError(ex, { t, has })); } finally { setBusy(false); } };
  const resend = async () => { setErr(null); try { await api.post("/auth/verify-email/request", { email }, { auth: "none" }); setInfo(t("auth.verify.sent")); setCool(30); } catch (ex) { setErr(friendlyError(ex, { t, has })); } };
  if (vEmail(email)) return <AuthFrame title={t("auth.verify.title")}><Alert tone="warn">{t("val.email")}</Alert><Button to="/signup" className="mt-4">{t("act.signup")}</Button></AuthFrame>;
  return (
    <AuthFrame title={t("auth.verify.title")} sub={t("auth.verify.sub", { email: maskEmail(email) })} footer={<Link className="underline" to="/signin">{t("act.signin")}</Link>}>
      <form onSubmit={verify} className="space-y-4" noValidate>
        {err && <Alert tone="danger">{err}</Alert>}{info && <Alert tone="ok">{info}</Alert>}
        <TextInput label="6-digit code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} className="text-center" autoFocus />
        <Button type="submit" size="lg" block loading={busy}>{t("act.verify")}</Button>
        <Button type="button" variant="ghost" block disabled={cool > 0} onClick={resend}>{cool > 0 ? t("auth.verify.resend_in", { s: cool }) : t("auth.verify.resend")}</Button>
      </form>
    </AuthFrame>
  );
}
