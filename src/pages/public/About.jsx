import { Link } from "react-router-dom";
import { MapPin, ShieldCheck, WifiOff, Languages, Info } from "lucide-react";
import { Card, PageHeader, Alert } from "../../components/ui";
import { useI18n } from "../../i18n";

export default function About() {
  const { t } = useI18n();
  const items = [[MapPin, "about.p1"], [WifiOff, "about.p2"], [ShieldCheck, "about.p3"], [Languages, "about.p4"]];
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 animate-rise">
      <PageHeader center title={t("about.title")} subtitle={t("about.sub")} />
      <div className="grid gap-3 sm:grid-cols-2">{items.map(([I, k]) => (<Card key={k}><I className="mb-3 h-6 w-6 text-ink-2" /><p className="text-sm text-ink">{t(k)}</p></Card>))}</div>
      <Alert tone="warn" className="mt-4" title={t("about.not_title")}>{t("about.not_body")}</Alert>
      <Card className="mt-4"><h2 className="flex items-center gap-2 text-lg"><Info className="h-5 w-5 text-ink-3" />{t("about.data_title")}</h2><p className="mt-2 text-sm text-ink-2">{t("about.data_body")}</p>
        <p className="mt-3 text-sm"><Link className="underline" to="/privacy">{t("nav.privacy")}</Link> · <Link className="underline" to="/terms">{t("nav.terms")}</Link></p></Card>
    </div>
  );
}
