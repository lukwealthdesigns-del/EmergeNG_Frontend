import { useEffect } from "react";
import { Logo } from "../../components/common/bits";
import { useI18n } from "../../i18n";

/** Brand splash, shown once per browser session. Tap anywhere to skip. 112 stays reachable even here. */
export default function Splash({ onDone }) {
  const { t } = useI18n();
  useEffect(() => { const x = setTimeout(onDone, 1500); return () => clearTimeout(x); }, [onDone]);
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-primary text-primary-fg" role="status" aria-label={t("splash.loading")} onClick={onDone}>
      <div className="relative flex h-40 w-40 items-center justify-center">
        <span className="absolute inset-0 rounded-full border border-current opacity-30 animate-[ping2_2.4s_ease-out_infinite]" />
        <span className="absolute inset-6 rounded-full border border-current opacity-30 animate-[ping2_2.4s_ease-out_.8s_infinite]" />
        <span className="flex h-24 w-24 items-center justify-center rounded-[28%] bg-primary-fg text-primary animate-pop">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.4" /></svg>
        </span>
      </div>
      <h1 className="mt-8 font-serif text-4xl tracking-tight animate-rise">EmergeNG</h1>
      <p className="mt-2 text-sm tracking-[.28em] uppercase opacity-80 animate-rise">{t("app.tagline")}</p>
      <a href="tel:112" onClick={(e) => e.stopPropagation()} className="absolute bottom-10 rounded-full border border-current/40 px-5 py-2.5 text-sm font-semibold opacity-90">{t("onb.call_note")} 112</a>
    </div>
  );
}
