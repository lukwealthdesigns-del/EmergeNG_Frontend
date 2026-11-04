import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import * as Icons from "lucide-react";
import { Sun, Moon, Monitor, Globe, Check, Phone, WifiOff, CloudOff, RefreshCw, CloudUpload, TriangleAlert } from "lucide-react";
import { cn } from "../../lib/utils";
import { useI18n, LANGS, LANG_LABELS } from "../../i18n";
import { useTheme } from "../../theme/ThemeProvider";
import { useNet, useTick } from "../../hooks/useNet";
import { NET } from "../../offline/netState";
import { syncNow } from "../../offline/syncManager";
import { useFormat } from "../../lib/format";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import { qk } from "../../lib/queryClient";

export const NavIcon = ({ name, className }) => { const C = Icons[name] || Icons.Circle; return <C className={className} aria-hidden />; };

export function Logo({ size = 36, text = true, className }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="inline-flex items-center justify-center rounded-[28%] bg-primary text-primary-fg shadow-soft" style={{ width: size, height: size }}>
        <svg viewBox="0 0 24 24" width={size * 0.58} height={size * 0.58} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.4" /></svg>
      </span>
      {text && <span className="font-serif text-xl font-semibold tracking-tight text-ink">EmergeNG</span>}
    </span>
  );
}

/** Theme (light default / dark / system) + language. Used in headers and settings. */
export function PrefsMenu({ align = "right" }) {
  const [open, setOpen] = useState(false); const ref = useRef(null);
  const { t, lang, setLang } = useI18n(); const { mode, setMode } = useTheme();
  useEffect(() => { const f = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); }; const k = (e) => e.key === "Escape" && setOpen(false); document.addEventListener("mousedown", f); document.addEventListener("keydown", k); return () => { document.removeEventListener("mousedown", f); document.removeEventListener("keydown", k); }; }, []);
  const Cur = mode === "dark" ? Moon : mode === "system" ? Monitor : Sun;
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label={`${t("theme.title")} / ${t("lang.title")}`}
        className="flex h-10 items-center gap-1.5 rounded-full px-3 text-sm text-ink hover:bg-surface-3/70"><Cur className="h-4 w-4" /><span className="hidden sm:inline text-xs font-semibold uppercase">{lang}</span></button>
      {open && (
        <div role="menu" className={cn("absolute z-50 mt-2 w-64 rounded-3xl border border-line bg-surface p-3 shadow-float animate-pop", align === "right" ? "right-0" : "left-0")}>
          <p className="px-2 pb-1.5 text-xs font-medium text-ink-3">{t("theme.title")}</p>
          <div className="grid grid-cols-3 gap-1.5 pb-3">
            {[["light", Sun, "theme.light"], ["dark", Moon, "theme.dark"], ["system", Monitor, "theme.system"]].map(([m, I, k]) => (
              <button key={m} role="menuitemradio" aria-checked={mode === m} onClick={() => setMode(m)} className={cn("flex flex-col items-center gap-1 rounded-2xl py-2 text-xs", mode === m ? "bg-surface-3 text-ink ring-1 ring-primary/30" : "text-ink-2 hover:bg-surface-2")}><I className="h-4 w-4" />{t(k)}</button>))}
          </div>
          <p className="flex items-center gap-1.5 px-2 pb-1.5 text-xs font-medium text-ink-3"><Globe className="h-3.5 w-3.5" />{t("lang.title")}</p>
          {LANGS.map((l) => (
            <button key={l} role="menuitemradio" aria-checked={lang === l} onClick={() => { setLang(l); setOpen(false); }} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-ink hover:bg-surface-2">{LANG_LABELS[l]}{lang === l && <Check className="h-4 w-4 text-ok" />}</button>))}
        </div>)}
    </div>
  );
}

/** Honest connectivity banner. Emergency tools stay visible in every state. */
export function NetBanner() {
  const { t } = useI18n(); const net = useNet(); const f = useFormat(); useTick(30000);
  const [restored, setRestored] = useState(false); const prev = useRef(net.net);
  useEffect(() => { if ([NET.OFFLINE, NET.SERVER_UNAVAILABLE].includes(prev.current) && net.net === NET.ONLINE) { setRestored(true); const x = setTimeout(() => setRestored(false), 4000); return () => clearTimeout(x); } prev.current = net.net; }, [net.net]);
  useEffect(() => { prev.current = net.net; });
  let tone, Icon, msg, action;
  if (net.net === NET.OFFLINE) { tone = "bg-warn-soft text-ink"; Icon = WifiOff; msg = t("net.offline"); }
  else if (net.net === NET.SERVER_UNAVAILABLE) { tone = "bg-warn-soft text-ink"; Icon = CloudOff; msg = t("net.server_down"); }
  else if (net.net === NET.SYNCING) { tone = "bg-info-soft text-ink"; Icon = RefreshCw; msg = t("net.syncing"); }
  else if (net.net === NET.SYNC_ERROR) { tone = "bg-warn-soft text-ink"; Icon = TriangleAlert; msg = t("net.sync_error"); action = <button onClick={() => syncNow({ force: true })} className="font-semibold underline">{t("act.sync_now")}</button>; }
  else if (restored) { tone = "bg-ok-soft text-ink"; Icon = Check; msg = t("net.restored"); }
  else if (net.pending > 0) { tone = "bg-info-soft text-ink"; Icon = CloudUpload; msg = net.pending === 1 ? t("off.sync_one") : t("off.sync_many", { n: net.pending }); action = <button onClick={() => syncNow({ force: true })} className="font-semibold underline">{t("act.sync_now")}</button>; }
  else return null;
  return (
    <div role="status" className={cn("flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-[13px]", tone)}>
      <Icon className={cn("h-4 w-4 shrink-0", net.net === NET.SYNCING && "animate-spin")} aria-hidden /><span>{msg}</span>{action}
      {net.net === NET.OFFLINE && net.lastOnlineAt && <span className="text-ink-3">· {t("time.captured", { when: f.rel(net.lastOnlineAt) })}</span>}
    </div>
  );
}

export function DemoBanner() {
  const { t } = useI18n();
  const { data } = useQuery({ queryKey: qk.authConfig, queryFn: () => api.get("/auth/config", { auth: "none" }), staleTime: 10 * 60_000, meta: { persist: true } });
  if (!data?.demo_mode) return null;
  return <div role="note" className="bg-primary px-4 py-1.5 text-center text-xs font-semibold tracking-wide text-primary-fg">{t("app.demo")}</div>;
}

/** Sticky 112 call button: never behind login, never hidden. */
export function Call112({ compact, className }) {
  const { t } = useI18n();
  return (
    <a href="tel:112" className={cn("inline-flex items-center justify-center gap-2 rounded-full bg-danger font-semibold text-white shadow-soft transition active:scale-[.98] hover:opacity-90", compact ? "min-h-[40px] px-4 text-sm" : "min-h-[56px] px-7 text-base", className)}>
      <Phone className="h-4 w-4" aria-hidden />{compact ? "112" : t("home.call")}
    </a>
  );
}

/** "Updated 2 min ago" freshness chip for live data. */
export function Freshness({ at, stale }) {
  const { t } = useI18n(); const f = useFormat(); useTick(15000);
  if (!at) return null;
  const age = (Date.now() - new Date(at).getTime()) / 1000;
  return <span className={cn("inline-flex items-center gap-1.5 text-xs", stale || age > 120 ? "text-warn" : "text-ink-3")}><span className={cn("h-1.5 w-1.5 rounded-full", stale || age > 120 ? "bg-warn" : "bg-ok")} />{t("state.updated", { when: f.rel(at) })}</span>;
}
export const BackLink = ({ to, children }) => <Link to={to} className="mb-2 inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink"><Icons.ChevronLeft className="h-4 w-4" />{children}</Link>;
