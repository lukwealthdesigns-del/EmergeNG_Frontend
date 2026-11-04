import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import en from "./locales/en";
import { ls } from "../lib/utils";

export const LANGS = ["en", "yo", "ha", "ig", "pcm"];
export const LANG_LABELS = { en: "English", yo: "Yorùbá", ha: "Hausa", ig: "Igbo", pcm: "Naijá Pidgin" };
export const LOCALE_TAG = { en: "en-NG", yo: "yo-NG", ha: "ha-NG", ig: "ig-NG", pcm: "en-NG" };
const KEY = "emergeng.lang";

// English is bundled (always-available fallback). Other languages are code-split and cached by the service worker.
const loaders = {
  yo: () => import("./locales/yo/index.js"),
  ha: () => import("./locales/ha/index.js"),
  ig: () => import("./locales/ig/index.js"),
  pcm: () => import("./locales/pcm/index.js"),
};
const cache = { en };

export async function loadLocale(lang) {
  if (cache[lang]) return cache[lang];
  try { cache[lang] = (await loaders[lang]()).default; } catch { cache[lang] = {}; }
  return cache[lang];
}

export function savedLang() { const l = ls.get(KEY); return LANGS.includes(l) ? l : null; }
export function detectLang() {
  const s = savedLang(); if (s) return s;
  const n = (navigator.language || "en").slice(0, 2).toLowerCase();
  return LANGS.includes(n) ? n : "en";
}
// Module-level current language so non-React code (API client) can send Accept-Language.
let current = savedLang() || "en";
export const currentLang = () => current;

export function interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (m, k) => (vars[k] === undefined || vars[k] === null ? m : String(vars[k])));
}

/** Pure translate function (also used by tests): chosen language → English → key. */
export function translate(dict, key, vars) {
  const s = dict?.[key] ?? en[key] ?? key;
  return interpolate(s, vars);
}

const I18nCtx = createContext(null);

export function I18nProvider({ children, initialLang }) {
  const [lang, setLangState] = useState(initialLang || detectLang());
  const [dict, setDict] = useState(cache[lang] || en);

  useEffect(() => {
    let live = true;
    current = lang;
    document.documentElement.lang = LOCALE_TAG[lang]?.split("-")[0] === "en" && lang === "pcm" ? "en-NG" : lang;
    loadLocale(lang).then((d) => { if (live) setDict(d); });
    return () => { live = false; };
  }, [lang]);

  const setLang = useCallback((l) => { if (!LANGS.includes(l)) return; ls.set(KEY, l); setLangState(l); }, []);
  const t = useCallback((key, vars) => translate(dict, key, vars), [dict]);
  const has = useCallback((key) => key in dict || key in en, [dict]);
  const value = useMemo(() => ({ lang, setLang, t, has, locale: LOCALE_TAG[lang] || "en-NG" }), [lang, setLang, t, has]);
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const c = useContext(I18nCtx);
  if (!c) throw new Error("useI18n must be used inside I18nProvider");
  return c;
}
export const useT = () => useI18n().t;

/** Dynamic key helpers with graceful fallback to the raw code, e.g. tk("cat", "fire"). */
export function useLabels() {
  const { t, has } = useI18n();
  return useMemo(() => {
    const k = (ns, code, fallback) => { const key = `${ns}.${code}`; return has(key) ? t(key) : fallback ?? String(code ?? "—").replace(/_/g, " "); };
    return {
      status: (c) => k("status", c), verification: (c) => k("verif", c), priority: (c) => k("prio", c), category: (c) => k("cat", c),
      facility: (c) => k("fac", c), postcode: (c) => k("pc", c), accuracy: (c) => k("acc", c), source: (c) => k("src", c), syncState: (c) => k("sync", c),
    };
  }, [t, has]);
}
