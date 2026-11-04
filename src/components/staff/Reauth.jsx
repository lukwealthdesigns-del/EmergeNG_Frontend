import { useCallback, useRef, useState } from "react";
import { Button, Modal, PasswordInput, TextInput, Alert } from "../ui";
import { useI18n } from "../../i18n";
import { api } from "../../api/client";
import { friendlyError } from "../../api/errors";

/**
 * Wraps privileged actions that the backend guards with recent_auth(). If the call fails with REAUTH_REQUIRED the user is asked
 * for their password (and MFA code when enabled), POST /auth/reauth is called, and the original action is retried once.
 * Passwords are held in component state only for the duration of the dialog and are never stored or logged.
 */
export function useReauth() {
  const { t, has } = useI18n();
  const [open, setOpen] = useState(false); const [pw, setPw] = useState(""); const [mfa, setMfa] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const pending = useRef(null);
  const close = () => { setOpen(false); setPw(""); setMfa(""); setErr(""); pending.current?.reject(Object.assign(new Error("cancelled"), { cancelled: true })); pending.current = null; };
  const run = useCallback(async (fn) => {
    try { return await fn(); } catch (e) {
      if (e?.code !== "REAUTH_REQUIRED") throw e;
      await new Promise((resolve, reject) => { pending.current = { resolve, reject }; setOpen(true); });
      return fn();
    }
  }, []);
  const submit = async () => {
    setBusy(true); setErr("");
    try {
      await api.post("/auth/reauth", { password: pw, ...(mfa ? { mfa_code: mfa } : {}) });
      const p = pending.current; pending.current = null; setOpen(false); setPw(""); setMfa(""); p?.resolve();
    } catch (e) { setErr(friendlyError(e, { t, has })); } finally { setBusy(false); }
  };
  const dialog = (
    <Modal open={open} onClose={close} title={t("reauth.title")} footer={<><Button variant="ghost" onClick={close}>{t("act.cancel")}</Button><Button loading={busy} disabled={!pw} onClick={submit}>{t("act.confirm")}</Button></>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (pw) submit(); }}>
        <p className="text-sm text-ink-2">{t("reauth.body")}</p>
        {err && <Alert tone="danger">{err}</Alert>}
        <PasswordInput label={t("auth.password")} autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} maxLength={128} />
        <TextInput label={t("auth.mfa_code")} optional inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={mfa} onChange={(e) => setMfa(e.target.value.replace(/\D/g, ""))} />
      </form>
    </Modal>
  );
  return { run, dialog };
}

/** Handles the 202 {status:"approval_required"} response used by two-person approval. */
export const isApprovalRequired = (r) => r && r.status === "approval_required";
