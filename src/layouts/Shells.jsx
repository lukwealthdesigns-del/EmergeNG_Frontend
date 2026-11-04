import { Suspense, useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Home, MapPin, FileWarning, ClipboardList, UserRound, LogOut, Settings as Cog, Bell, Menu, X, LayoutDashboard, ShieldCheck } from "lucide-react";
import { useI18n } from "../i18n";
import { useAuth } from "../auth/AuthProvider";
import { ADMIN_NAV, OPS_NAV, canAdmin, canOps, isPartner, visibleNav } from "../auth/permissions";
import { cn } from "../lib/utils";
import { Logo, PrefsMenu, NetBanner, DemoBanner, Call112, NavIcon } from "../components/common/bits";
import ErrorBoundary from "../components/common/ErrorBoundary";
import { SkeletonList } from "../components/ui";
import { initials } from "../lib/utils";
import { useUnreadCount } from "../hooks/useInbox";

export const PageFallback = () => <div className="mx-auto max-w-3xl p-6"><SkeletonList rows={4} /></div>;
const Content = () => { const loc = useLocation(); const { t } = useI18n(); return <ErrorBoundary resetKey={loc.pathname} t={t}><Suspense fallback={<PageFallback />}><Outlet /></Suspense></ErrorBoundary>; };

function AccountMenu() {
  const { user, isAuthed, logout } = useAuth(); const { t } = useI18n(); const nav = useNavigate();
  const [open, setOpen] = useState(false); const ref = useRef(null); const unread = useUnreadCount();
  useEffect(() => { const f = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); }; document.addEventListener("mousedown", f); return () => document.removeEventListener("mousedown", f); }, []);
  if (!isAuthed) return <Link to="/signin" className="inline-flex min-h-[40px] items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-fg shadow-soft hover:opacity-90">{t("act.signin")}</Link>;
  const ws = canOps(user) ? "/ops" : isPartner(user) ? "/partner" : canAdmin(user) ? "/admin" : null;
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label={user.full_name || user.email} className="relative flex h-10 w-10 items-center justify-center rounded-full bg-surface-3 text-sm font-semibold text-ink hover:brightness-95">{initials(user.full_name || user.email)}{unread > 0 && <span aria-label={t("notif.unread_aria", { n: unread })} className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white">{unread > 9 ? "9+" : unread}</span>}</button>
      {open && (
        <div role="menu" className="absolute right-0 z-50 mt-2 w-60 rounded-3xl border border-line bg-surface p-2 shadow-float animate-pop">
          <div className="px-3 py-2"><p className="truncate text-sm font-medium text-ink">{user.full_name || user.email}</p><p className="truncate text-xs text-ink-3">{user.email}</p></div>
          {[["/app", UserRound, "nav.profile"], ["/app/notifications", Bell, "nav.notifications"], ["/app/settings", Cog, "nav.settings"]].map(([to, I, k]) => (
            <Link key={to} to={to} onClick={() => setOpen(false)} role="menuitem" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-ink hover:bg-surface-2"><I className="h-4 w-4 text-ink-2" />{t(k)}{to === "/app/notifications" && unread > 0 && <span className="ml-auto rounded-full bg-danger px-2 py-0.5 text-[11px] font-semibold text-white">{unread}</span>}</Link>))}
          {ws && <Link to={ws} onClick={() => setOpen(false)} role="menuitem" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-ink hover:bg-surface-2"><ShieldCheck className="h-4 w-4 text-ink-2" />{t("nav.workspace")}</Link>}
          <button role="menuitem" onClick={async () => { setOpen(false); await logout(); nav("/"); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-danger hover:bg-danger-soft"><LogOut className="h-4 w-4" />{t("act.signout")}</button>
        </div>)}
    </div>
  );
}

const TABS = [["/", Home, "nav.home", true], ["/nearby", MapPin, "nav.nearby"], ["/report", FileWarning, "nav.report"], ["/app/incidents", ClipboardList, "nav.history"], ["/app", UserRound, "nav.profile", true]];

/** Public + citizen shell: top bar, mobile bottom tabs, persistent 112 access. */
export function MainShell() {
  const { t } = useI18n(); const { isAuthed } = useAuth(); const loc = useLocation();
  const tabs = TABS.filter(([to]) => isAuthed || (to !== "/app/incidents" && to !== "/app"));
  const tabsFinal = isAuthed ? tabs : [...tabs, ["/track", ClipboardList, "nav.track"]];
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-fg">{t("nav.skip_to_content")}</a>
      <DemoBanner /><NetBanner />
      <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/85 backdrop-blur-md safe-t">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <Link to="/" aria-label="EmergeNG"><Logo /></Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {[["/nearby", "nav.nearby"], ["/report", "nav.report"], ["/track", "nav.track"], ["/offline", "nav.offline"], ["/about", "nav.about"]].map(([to, k]) => (
              <NavLink key={to} to={to} className={({ isActive }) => cn("rounded-full px-3.5 py-2 text-sm font-medium", isActive ? "bg-surface-3 text-ink" : "text-ink-2 hover:text-ink")}>{t(k)}</NavLink>))}
          </nav>
          <div className="flex items-center gap-1.5"><Call112 compact className="hidden sm:inline-flex" /><PrefsMenu /><AccountMenu /></div>
        </div>
      </header>
      <main id="main" className="flex-1 pb-28 md:pb-10"><Content key="main" /></main>
      <footer className="hidden border-t border-line bg-surface-2/50 md:block">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-ink-2">
          <p className="max-w-xl">{t("notice.call_112")}</p>
          <div className="flex gap-4"><Link to="/privacy" className="hover:text-ink">{t("nav.privacy")}</Link><Link to="/terms" className="hover:text-ink">{t("nav.terms")}</Link><Link to="/about" className="hover:text-ink">{t("nav.about")}</Link></div>
        </div>
      </footer>
      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-md md:hidden safe-b">
        <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-1.5">
          {tabsFinal.map(([to, I, k, end]) => (
            <li key={to} className="flex-1"><NavLink to={to} end={!!end} className={({ isActive }) => cn("flex flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-medium", isActive ? "text-ink" : "text-ink-3")}>
              {({ isActive }) => (<><span className={cn("flex h-8 w-14 items-center justify-center rounded-full transition", isActive && "bg-surface-3")}><I className="h-5 w-5" /></span>{t(k)}</>)}</NavLink></li>))}
        </ul>
      </nav>
      <a href="tel:112" aria-label="Call 112" className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-danger text-sm font-bold text-white shadow-float sm:hidden">112</a>
    </div>
  );
}

/** Staff shell (operations / admin / partner): sidebar from the permission-filtered nav model. */
export function StaffShell({ kind }) {
  const { t } = useI18n(); const { user } = useAuth(); const [open, setOpen] = useState(false); const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  const items = kind === "admin" ? visibleNav(user, ADMIN_NAV) : kind === "ops" ? visibleNav(user, OPS_NAV) : [{ to: "/partner", key: "partner.nav.workspace", icon: "Handshake", end: true }];
  const other = kind === "ops" && canAdmin(user) ? ["/admin", "nav.admin"] : kind === "admin" && canOps(user) ? ["/ops", "nav.ops"] : null;
  const nav = (
    <nav aria-label="Workspace" className="flex flex-col gap-1">
      {items.map((i) => (
        <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => cn("flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition", isActive ? "bg-primary text-primary-fg shadow-soft" : "text-ink-2 hover:bg-surface-3/70 hover:text-ink")}>
          <NavIcon name={i.icon} className="h-[18px] w-[18px]" />{t(i.key)}</NavLink>))}
      {other && <NavLink to={other[0]} className="mt-3 flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm text-ink-3 hover:bg-surface-3/70"><LayoutDashboard className="h-[18px] w-[18px]" />{t(other[1])}</NavLink>}
    </nav>
  );
  return (
    <div className="flex min-h-dvh flex-col">
      <DemoBanner /><NetBanner />
      <div className="flex flex-1">
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface-2/60 p-4 lg:flex">
          <Link to="/" className="mb-6 px-1"><Logo /></Link>{nav}
          <div className="mt-auto rounded-2xl bg-surface-3/70 p-3 text-xs text-ink-2">{t("notice.call_112")}</div>
        </aside>
        {open && <div className="fixed inset-0 z-50 lg:hidden"><div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} /><div className="absolute left-0 top-0 h-full w-72 bg-surface p-4 shadow-float animate-pop"><div className="mb-5 flex items-center justify-between"><Logo /><button aria-label={t("act.close")} onClick={() => setOpen(false)} className="h-10 w-10 rounded-full hover:bg-surface-3"><X className="mx-auto h-5 w-5" /></button></div>{nav}</div></div>}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line/70 bg-bg/85 px-4 backdrop-blur-md">
            <button className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-3 lg:hidden" aria-label={t("nav.menu")} onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button>
            <span className="hidden text-sm font-medium text-ink-2 lg:block">{t(kind === "admin" ? "nav.admin" : kind === "ops" ? "nav.ops" : "nav.partner")}</span>
            <div className="flex items-center gap-1.5"><Call112 compact /><PrefsMenu /><AccountMenu /></div>
          </header>
          <main id="main" className="flex-1 p-4 sm:p-6"><Content key={kind} /></main>
        </div>
      </div>
    </div>
  );
}
export const PlainShell = () => <div className="min-h-dvh"><NetBanner /><Content /></div>;
