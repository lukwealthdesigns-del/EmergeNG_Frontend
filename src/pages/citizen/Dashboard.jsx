import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Phone, MapPinned, LifeBuoy, FileWarning, HeartPulse, Users, Bookmark, ChevronRight, CheckCircle2, Circle, CloudUpload } from "lucide-react";
import { Alert, Badge, Button, Card, EmptyState, PageHeader, Section, SkeletonList } from "../../components/ui";
import { useI18n, useLabels } from "../../i18n";
import { useAuth } from "../../auth/AuthProvider";
import { useOutbox } from "../../hooks/useNet";
import { api } from "../../api/client";
import { qk } from "../../lib/queryClient";
import { useFormat } from "../../lib/format";
import { STATUS_TONE } from "../../lib/enums";
import { Freshness } from "../../components/common/bits";

export default function Dashboard() {
  const { t } = useI18n(); const L = useLabels(); const f = useFormat(); const { user } = useAuth(); const loc = useLocation();
  const inc = useQuery({ queryKey: qk.incidentsMine(1), queryFn: () => api.get("/incidents/mine", { params: { page: 1, page_size: 5 } }) });
  const contacts = useQuery({ queryKey: qk.contacts, queryFn: () => api.get("/trusted-contacts") });
  const places = useQuery({ queryKey: qk.places, queryFn: () => api.get("/saved-locations") });
  const prof = useQuery({ queryKey: qk.profile, queryFn: () => api.get("/emergency-profile") });
  const { items: local } = useOutbox(user.id); const pend = local.filter((r) => !["SYNCED", "CANCELLED_LOCAL"].includes(r.state));
  const steps = [[HeartPulse, "nav.emergency_profile", "/app/profile", !!prof.data?.updated_at], [Users, "nav.contacts", "/app/contacts", (contacts.data?.items || []).length > 0], [Bookmark, "nav.places", "/app/places", (places.data?.items || []).length > 0]];
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8 animate-rise">
      <PageHeader title={t("cit.dash.title")} subtitle={t("home.greeting", { name: (user.full_name || "").split(" ")[0] || user.email })} />
      {loc.state?.welcome && <Alert tone="ok" className="mb-4" title={t("auth.welcome")}>{t("auth.welcome_sub")}</Alert>}
      {!user.email_verified && <Alert tone="warn" className="mb-4">{t("cit.profile.unverified")}</Alert>}
      {pend.length > 0 && <Link to="/offline" className="mb-4 flex items-center gap-3 rounded-2xl bg-info-soft px-4 py-3 text-sm"><CloudUpload className="h-5 w-5 text-info" />{pend.length === 1 ? t("home.pending_one") : t("home.pending_many", { n: pend.length })}</Link>}
      <div className="grid gap-3 sm:grid-cols-4">
        {[[Phone, "tel:112", "112", "bg-danger text-white"], [MapPinned, "/location", t("nav.nearby") && t("home.share"), "bg-primary text-primary-fg"], [LifeBuoy, "/nearby", t("home.nearby"), "bg-surface text-ink border border-line"], [FileWarning, "/report", t("home.report"), "bg-surface text-ink border border-line"]].map(([I, to, label, cls]) => {
          const C = to.startsWith("tel") ? "a" : Link; const p = to.startsWith("tel") ? { href: to } : { to };
          return <C key={to} {...p} className={`flex min-h-[96px] flex-col justify-between rounded-3xl p-4 shadow-soft transition active:scale-[.98] ${cls}`}><I className="h-6 w-6" /><span className="text-sm font-semibold leading-tight">{label}</span></C>; })}
      </div>
      <Section title={t("nav.emergency_profile")} className="mt-8"><Card className="!p-2"><ul>{steps.map(([I, k, to, done]) => <li key={to}><Link to={to} className="flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-surface-2">{done ? <CheckCircle2 className="h-5 w-5 text-ok" /> : <Circle className="h-5 w-5 text-ink-3" />}<I className="h-5 w-5 text-ink-2" /><span className="flex-1 text-sm font-medium">{t(k)}</span><ChevronRight className="h-4 w-4 text-ink-3" /></Link></li>)}</ul></Card></Section>
      <Section title={t("cit.dash.recent")} className="mt-8" actions={<Link className="text-sm underline" to="/app/incidents">{t("act.view")}</Link>}>
        {inc.isLoading ? <SkeletonList rows={3} /> : (inc.data?.items || []).length === 0 ? <Card><EmptyState icon={FileWarning} title={t("cit.dash.no_reports")} action={<Button to="/report">{t("home.report")}</Button>} /></Card> : (
          <ul className="space-y-2">{inc.data.items.map((i) => <li key={i.id}><Link to={`/app/incidents/${i.id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3 hover:bg-surface-2"><span><span className="block text-sm font-medium">{L.category(i.category)}</span><span className="font-mono text-xs text-ink-3">{i.reference} · {f.dateTime(i.submitted_at)}</span></span><Badge tone={STATUS_TONE[i.status]} dot>{L.status(i.status)}</Badge></Link></li>)}</ul>)}
        {inc.dataUpdatedAt > 0 && <div className="mt-2"><Freshness at={new Date(inc.dataUpdatedAt).toISOString()} /></div>}
      </Section>
    </div>
  );
}
