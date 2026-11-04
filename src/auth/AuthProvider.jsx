import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, clearTokens, getAccessToken, onAuthEvent, setRefreshHandler, setTokens, request } from "../api/client";
import { ls, ss } from "../lib/utils";
import { isPrivileged, homeFor } from "./permissions";
import { qk } from "../lib/queryClient";
import { wipePrivateLocalData } from "../offline/privacy";
import { prefetchAfterLogin } from "../cache/prefetch";

const RT_KEY = "emergeng.rt"; // refresh token. Privileged users: sessionStorage only. Citizens: localStorage ("stay signed in").
const AuthCtx = createContext(null);

const readRt = () => ss.get(RT_KEY) || ls.get(RT_KEY);
const storeRt = (rt, privileged) => { ss.del(RT_KEY); ls.del(RT_KEY); if (!rt) return; (privileged ? ss : ls).set(RT_KEY, rt); };

export function AuthProvider({ children }) {
  const qc = useQueryClient();
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | anon | authed | expired
  const privRef = useRef(false);

  const loadMe = useCallback(async () => {
    const me = await api.get("/users/me");
    privRef.current = isPrivileged(me);
    qc.setQueryData(qk.me, me); setUser(me); setStatus("authed");
    return me;
  }, [qc]);

  // Refresh handler used by the API client on 401s (single-flight is handled inside the client).
  useEffect(() => {
    setRefreshHandler(async (rt) => {
      try {
        const r = await request("/auth/refresh", { method: "POST", body: { refresh_token: rt }, auth: "none" });
        setTokens(r.tokens); storeRt(r.tokens.refresh_token, privRef.current); return true;
      } catch (e) { return false; }
    });
    return onAuthEvent((t) => { if (t === "session-expired") { clearTokens(); storeRt(null); setUser(null); setStatus("expired"); } });
  }, []);

  // Restore session at start
  useEffect(() => {
    let live = true;
    (async () => {
      const rt = readRt();
      if (!rt) { setStatus("anon"); return; }
      try {
        const r = await request("/auth/refresh", { method: "POST", body: { refresh_token: rt }, auth: "none" });
        if (!live) return; setTokens(r.tokens);
        const me = await loadMe(); storeRt(r.tokens.refresh_token, isPrivileged(me));
        prefetchAfterLogin(qc, me);
      } catch (e) {
        if (!live) return;
        // Offline at start-up: keep the refresh token, stay "anon" for UI (emergency tools still work); retried when back online.
        if (e?.isNetwork || e?.kind === "SERVER_UNAVAILABLE") setStatus("anon");
        else { storeRt(null); clearTokens(); setStatus("anon"); }
      }
    })();
    return () => { live = false; };
  }, [loadMe, qc]);

  const afterTokens = useCallback(async (tokens) => {
    setTokens(tokens);
    const me = await loadMe(); storeRt(tokens.refresh_token, isPrivileged(me));
    prefetchAfterLogin(qc, me); // warm every route chunk + role data
    return me;
  }, [loadMe, qc]);

  const login = useCallback(async ({ email, password, mfa_code }) => {
    const r = await api.post("/auth/login", { email, password, ...(mfa_code ? { mfa_code } : {}) }, { auth: "none" });
    const me = await afterTokens(r.tokens);
    return { user: me, home: homeFor(me), requirements: r.requirements || r.user?.requirements };
  }, [afterTokens]);

  const loginWithGoogle = useCallback(async ({ credential, mfa_code }) => {
    const r = await api.post("/auth/google", { id_token: credential, ...(mfa_code ? { mfa_code } : {}) }, { auth: "none" });
    const me = await afterTokens(r.tokens);
    return { user: me, home: homeFor(me), created: !!r.created };
  }, [afterTokens]);

  const register = useCallback(async (body) => {
    const r = await api.post("/auth/register", body, { auth: "none" });
    if (r.tokens) { const me = await afterTokens(r.tokens); return { verificationRequired: false, user: me }; }
    return { verificationRequired: true };
  }, [afterTokens]);

  const logout = useCallback(async ({ all = false } = {}) => {
    const rt = getRefreshToken();
    try { await api.post(all ? "/auth/logout-all" : "/auth/logout", rt && !all ? { refresh_token: rt } : {}); } catch { /* best effort: always clear locally */ }
    const uid = user?.id;
    clearTokens(); storeRt(null); setUser(null); setStatus("anon");
    qc.clear();
    await wipePrivateLocalData(uid); // offline card, private caches; pending reports are KEPT (never silently lost)
  }, [qc, user]);

  const value = useMemo(() => ({ user, status, isAuthed: status === "authed", login, loginWithGoogle, register, logout, reload: loadMe, setUser }), [user, status, login, loginWithGoogle, register, logout, loadMe]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
import { getRefreshToken } from "../api/client";
export const useAuth = () => { const c = useContext(AuthCtx); if (!c) throw new Error("useAuth outside AuthProvider"); return c; };
