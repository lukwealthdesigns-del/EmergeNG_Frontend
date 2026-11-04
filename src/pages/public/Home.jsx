import { useId } from "react";
import { Link } from "react-router-dom";
import { Phone, MapPinned, LifeBuoy, FileWarning, Search, WifiOff, ChevronRight, CloudUpload } from "lucide-react";
import { Card, Button } from "../../components/ui";
import { useI18n } from "../../i18n";
import { useAuth } from "../../auth/AuthProvider";
import { useNet } from "../../hooks/useNet";
import { cn } from "../../lib/utils";

function Action({ to, href, icon: I, title, sub, tone = "default" }) {
  const cls = cn("group flex items-center gap-4 rounded-3xl border p-5 shadow-soft transition active:scale-[.99] min-h-[88px]",
    tone === "danger" ? "border-transparent bg-danger text-white" : tone === "primary" ? "border-transparent bg-primary text-primary-fg" : "border-line bg-surface hover:bg-surface-2 text-ink");
  const body = (<><span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", tone === "default" ? "bg-surface-3 text-ink" : "bg-white/15")}><I className="h-6 w-6" /></span>
    <span className="min-w-0 flex-1"><span className="block text-[17px] font-semibold leading-snug">{title}</span><span className={cn("mt-0.5 block text-sm", tone === "default" ? "text-ink-2" : "opacity-85")}>{sub}</span></span>
    <ChevronRight className="h-5 w-5 shrink-0 opacity-60 transition group-hover:translate-x-0.5" /></>);
  return href ? <a href={href} className={cls}>{body}</a> : <Link to={to} className={cls}>{body}</Link>;
}

/** Round emergency push-button. The icon and title sit in the centre of the circle; the short explanation is the caption below it. */
function EmergencyButton({ to, href, icon: I, title, sub, size }) {
  const id = useId(); const big = size === "lg";
  const cls = cn("ebtn", big ? "ebtn-lg" : "ebtn-sm");
  const face = (<span className="ebtn-face"><I className={big ? "h-11 w-11" : "h-6 w-6"} strokeWidth={2.4} aria-hidden /><span className="ebtn-text">{title}</span></span>);
  return (
    <div className="flex flex-col items-center text-center">
      {href ? <a href={href} className={cls} aria-describedby={id}>{face}</a> : <Link to={to} className={cls} aria-describedby={id}>{face}</Link>}
      <p id={id} className={cn("mt-4 text-sm text-ink-2", big ? "max-w-[17rem]" : "max-w-[10.5rem]")}>{sub}</p>
    </div>
  );
}

export default function Home() {
  const { t } = useI18n(); const { user, isAuthed } = useAuth(); const net = useNet();
  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 sm:pt-10 animate-rise">
      <p className="text-center text-sm text-ink-3">{isAuthed ? t("home.greeting", { name: (user.full_name || "").split(" ")[0] || user.email }) : t("home.greeting_guest")}</p>
      <h1 className="mt-2 text-center text-[2rem] leading-[1.1] sm:text-5xl">{t("home.hero")}</h1>
      <p className="mx-auto mt-4 max-w-xl text-center text-base text-ink-2 sm:text-lg">{t("home.sub")}</p>

      {net.pending > 0 && (
        <Link to="/offline" className="mt-5 flex items-center gap-3 rounded-2xl bg-info-soft px-4 py-3 text-sm text-ink"><CloudUpload className="h-5 w-5 text-info" />{net.pending === 1 ? t("home.pending_one") : t("home.pending_many", { n: net.pending })}</Link>)}

      <div className="mt-8 flex flex-col items-center gap-8">
        <EmergencyButton href="tel:112" size="lg" icon={Phone} title={t("home.call")} sub={t("home.call_sub")} />
        <div className="grid w-full max-w-md grid-cols-2 items-start justify-items-center gap-4">
          <EmergencyButton to="/location" size="sm" icon={MapPinned} title={t("home.share")} sub={t("home.share_sub")} />
          <EmergencyButton to="/nearby" size="sm" icon={LifeBuoy} title={t("home.nearby")} sub={t("home.nearby_sub")} />
        </div>
      </div>
      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        <Action to="/report" icon={FileWarning} title={t("home.report")} sub={t("home.report_sub")} />
        <Action to="/offline" icon={WifiOff} title={t("home.offline_mode")} sub={t("home.saved_help")} />
      </div>
      <p className="mt-4 rounded-2xl bg-surface-3/70 px-4 py-3 text-center text-sm text-ink-2">{t("home.distinction")}</p>

      <Card className="mt-8">
        <h2 className="text-xl">{t("home.how.title")}</h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((n) => (<li key={n} className="flex items-start gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-fg">{n}</span><span className="pt-1 text-sm text-ink">{t(`home.how.${n}`)}</span></li>))}
        </ol>
      </Card>

      {!isAuthed && (
        <Card className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-sm text-sm text-ink-2">{t("auth.signup.sub")}</p>
          <div className="flex gap-2"><Button to="/signin" variant="outline">{t("act.signin")}</Button><Button to="/signup">{t("act.signup")}</Button></div>
        </Card>)}
      <p className="mt-6 flex items-center gap-2 text-xs text-ink-3"><Search className="h-3.5 w-3.5" /><Link to="/track" className="underline">{t("nav.track")}</Link></p>
    </div>
  );
}
