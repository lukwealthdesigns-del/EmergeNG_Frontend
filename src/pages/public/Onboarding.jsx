import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, MapPin, WifiOff, ShieldCheck, Globe, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "../../components/ui";
import { Logo, PrefsMenu } from "../../components/common/bits";
import { useI18n, LANGS, LANG_LABELS } from "../../i18n";
import { cn, ls } from "../../lib/utils";
import { ONBOARDED_KEY } from "../../lib/constants";

const SLIDES = [{ n: 1, icon: MapPin }, { n: 2, icon: WifiOff }, { n: 3, icon: ShieldCheck }];
const SUB = { en: "English", yo: "Èdè Yorùbá", ha: "Harshen Hausa", ig: "Asụsụ Igbo", pcm: "Naijá Pidgin" };

export default function Onboarding() {
  const { t, lang, setLang } = useI18n(); const nav = useNavigate();
  const [i, setI] = useState(0); // 0 = language, 1..3 = slides
  const finish = () => { ls.set(ONBOARDED_KEY, "1"); nav("/", { replace: true }); };
  const last = i === SLIDES.length;
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 pb-8 pt-5 safe-t">
      <div className="flex items-center justify-between"><Logo size={32} /><div className="flex items-center gap-1"><PrefsMenu /><button onClick={finish} className="rounded-full px-3 py-2 text-sm text-ink-2 hover:bg-surface-3/70">{t("act.skip")}</button></div></div>
      <div className="flex flex-1 flex-col justify-center py-8">
        {i === 0 ? (
          <div className="animate-rise text-center" key="lang">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-surface-3"><Globe className="h-6 w-6 text-ink" /></div>
            <h1 className="text-3xl sm:text-4xl">{t("lang.choose")}</h1>
            <p className="mt-2 text-ink-2">{t("lang.choose_sub")}</p>
            <div className="mt-6 grid gap-2.5 text-left" role="radiogroup" aria-label={t("lang.title")}>
              {LANGS.map((l) => (
                <button key={l} role="radio" aria-checked={lang === l} onClick={() => setLang(l)}
                  className={cn("flex min-h-[64px] items-center justify-between rounded-3xl border px-5 text-left transition", lang === l ? "border-primary bg-surface-3 ring-2 ring-primary/20" : "border-line bg-surface hover:bg-surface-2")}>
                  <span><span className="block text-lg font-medium text-ink">{LANG_LABELS[l]}</span><span className="block text-xs text-ink-3">{SUB[l]}</span></span>
                  {lang === l && <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-fg"><Check className="h-4 w-4" /></span>}
                </button>))}
            </div>
            {lang !== "en" && <p className="mt-3 text-xs text-ink-3">{t("lang.review")}</p>}
          </div>
        ) : (
          (() => { const s = SLIDES[i - 1]; const I = s.icon; return (
            <div className="animate-rise text-center" key={s.n}>
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[32%] bg-primary text-primary-fg shadow-float"><I className="h-11 w-11" /></div>
              <h1 className="text-3xl leading-tight sm:text-4xl">{t(`onb.${s.n}.title`)}</h1>
              <p className="mt-4 text-lg text-ink-2">{t(`onb.${s.n}.body`)}</p>
              {s.n === 2 && <p className="mt-4 rounded-2xl bg-surface-3 px-4 py-3 text-sm text-ink">{t("onb.call_note")}</p>}
              {s.n === 3 && <p className="mt-4 rounded-2xl bg-surface-3 px-4 py-3 text-sm text-ink">{t("onb.privacy_note")}</p>}
            </div>); })()
        )}
      </div>
      <div>
        <div className="mb-5 flex justify-center gap-2" aria-hidden>{[0, 1, 2, 3].map((n) => <span key={n} className={cn("h-2 rounded-full transition-all", n === i ? "w-8 bg-primary" : "w-2 bg-line")} />)}</div>
        <div className="flex gap-3">
          {i > 0 && <Button variant="outline" size="lg" onClick={() => setI(i - 1)} aria-label={t("act.back")} icon={ArrowLeft} />}
          <Button size="lg" block onClick={() => (last ? finish() : setI(i + 1))}>{last ? t("act.get_started") : t("act.continue")}{!last && <ArrowRight className="h-4 w-4" />}</Button>
        </div>
        <a href="tel:112" className="mt-4 block text-center text-sm font-semibold text-danger">{t("home.call")}</a>
      </div>
    </div>
  );
}
