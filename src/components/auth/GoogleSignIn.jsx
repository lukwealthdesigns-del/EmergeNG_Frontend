// "Sign in with Google" for citizen accounts. The Google script is only loaded when the backend reports a client id
// (GOOGLE_OAUTH_CLIENT_ID), so with the feature off this renders nothing and nothing is requested from Google.
// Google returns an ID token to the browser; the BACKEND verifies it (signature, audience, expiry) and decides who the user is.
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import { qk } from "../../lib/queryClient";
import { useAuth } from "../../auth/AuthProvider";
import { useI18n } from "../../i18n";
import { friendlyError } from "../../api/errors";
import { Alert, Button, TextInput } from "../ui";

const SRC = "https://accounts.google.com/gsi/client";
let loading = null;
const loadGsi = () => (loading ||= new Promise((resolve, reject) => {
  if (window.google?.accounts?.id) return resolve(window.google);
  const s = document.createElement("script");
  s.src = SRC; s.async = true; s.defer = true;
  s.onload = () => resolve(window.google);
  s.onerror = () => { loading = null; s.remove(); reject(new Error("gsi_blocked")); };
  document.head.appendChild(s);
}));

export function useGoogleClientId() {
  const { data } = useQuery({ queryKey: qk.authConfig, queryFn: () => api.get("/auth/config", { auth: "none" }), staleTime: 10 * 60_000, meta: { persist: true } });
  return data?.google_client_id || null;
}

function GsiButton({ clientId, onCredential, text, lang, onFail }) {
  const box = useRef(null); const cb = useRef(onCredential); cb.current = onCredential;
  useEffect(() => {
    let dead = false;
    loadGsi().then((g) => {
      if (dead || !box.current) return;
      g.accounts.id.initialize({ client_id: clientId, callback: (r) => r?.credential && cb.current(r.credential), ux_mode: "popup", auto_select: false, cancel_on_tap_outside: true });
      const width = Math.max(200, Math.min(400, Math.round(box.current.clientWidth || 320)));
      g.accounts.id.renderButton(box.current, { type: "standard", theme: "outline", size: "large", shape: "pill", text, logo_alignment: "left", width, locale: lang === "pcm" ? "en" : lang });
    }).catch(() => !dead && onFail());
    return () => { dead = true; };
  }, [clientId, text, lang]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div ref={box} className="flex min-h-[44px] w-full justify-center" />;
}

/** mode: "signin" | "signup". onDone({ user, home, created }) is called after a successful sign-in. */
export default function GoogleSignIn({ mode = "signin", onDone }) {
  const { t, has, lang } = useI18n(); const { loginWithGoogle } = useAuth();
  const clientId = useGoogleClientId();
  const [cred, setCred] = useState(null); const [code, setCode] = useState(""); const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false); const [blocked, setBlocked] = useState(false);
  if (!clientId) return null;

  const go = async (credential, mfa_code) => {
    setErr(null); setBusy(true);
    try { onDone(await loginWithGoogle({ credential, mfa_code })); }
    catch (ex) {
      if (ex.code === "MFA_REQUIRED") { setCred(credential); setErr({ msg: t("err.MFA_REQUIRED"), tone: "info" }); }
      else { setCred(null); setCode(""); setErr({ msg: friendlyError(ex, { t, has }), tone: "danger" }); }
    } finally { setBusy(false); }
  };

  return (
    <div className="mt-5">
      <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-ink-3" role="separator"><span className="h-px flex-1 bg-line" />{t("auth.or")}<span className="h-px flex-1 bg-line" /></div>
      <div className="mt-4 space-y-3">
        {err && <Alert tone={err.tone}>{err.msg}</Alert>}
        {cred ? (
          <form onSubmit={(e) => { e.preventDefault(); if (code.length === 6) go(cred, code); }} className="space-y-3" noValidate>
            <TextInput label={t("auth.mfa_code")} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} autoFocus />
            <Button type="submit" size="lg" block loading={busy} disabled={code.length !== 6}>{t("act.continue")}</Button>
            <button type="button" className="block w-full text-center text-sm text-ink-2 underline" onClick={() => { setCred(null); setCode(""); setErr(null); }}>{t("act.cancel")}</button>
          </form>
        ) : blocked ? (
          <p className="text-center text-sm text-ink-2">{t("auth.google.unavailable")}</p>
        ) : (
          <div className={busy ? "pointer-events-none opacity-60" : ""} aria-busy={busy}>
            <GsiButton clientId={clientId} text={mode === "signup" ? "signup_with" : "signin_with"} lang={lang} onCredential={(c) => go(c)} onFail={() => setBlocked(true)} />
          </div>
        )}
        <p className="text-center text-xs text-ink-3">{t("auth.google.note")}</p>
      </div>
    </div>
  );
}
