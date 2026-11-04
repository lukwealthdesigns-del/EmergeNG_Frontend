import { Link } from "react-router-dom";
import { useEffect } from "react";
import { privacy, terms, LEGAL_VERSION } from "../../i18n/locales/en/legal";
import { useI18n } from "../../i18n";
import { Card, Alert } from "../../components/ui";

function Doc({ doc, kind }) {
  const { t, lang, has } = useI18n();
  useEffect(() => { document.title = `${doc.title} · EmergeNG`; return () => { document.title = "EmergeNG"; }; }, [doc.title]);
  const translated = lang !== "en";
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 animate-rise">
      <h1 className="text-3xl sm:text-4xl">{translated && has(`legal.${kind}.title`) ? t(`legal.${kind}.title`) : doc.title}</h1>
      <p className="mt-1 text-sm text-ink-3">{doc.updated} · v{LEGAL_VERSION}</p>
      <Card className="mt-5 !bg-surface-3/60"><p className="text-ink">{translated && has(`legal.${kind}.summary`) ? t(`legal.${kind}.summary`) : doc.summary}</p></Card>
      {translated && <Alert tone="info" className="mt-4">{t("legal.english_authoritative")}</Alert>}
      <nav aria-label="Contents" className="mt-6 flex flex-wrap gap-2">{doc.sections.map(([h], i) => <a key={i} href={`#s${i}`} className="rounded-full bg-surface-3/70 px-3 py-1.5 text-xs text-ink-2 hover:text-ink">{h}</a>)}</nav>
      <div className="mt-6 space-y-7">
        {doc.sections.map(([h, body], i) => (<section key={i} id={`s${i}`} className="scroll-mt-24"><h2 className="text-xl">{h}</h2><p className="mt-2 leading-relaxed text-ink-2">{body}</p></section>))}
      </div>
      <p className="mt-10 text-sm text-ink-3">{kind === "privacy" ? <Link className="underline" to="/terms">{t("nav.terms")}</Link> : <Link className="underline" to="/privacy">{t("nav.privacy")}</Link>}</p>
    </div>
  );
}
export const Privacy = () => <Doc doc={privacy} kind="privacy" />;
export const Terms = () => <Doc doc={terms} kind="terms" />;
export default Privacy;
