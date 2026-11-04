import { useCallback, useMemo } from "react";
import { useI18n } from "../i18n";

/** Relative time from an ISO string, localised through the t() function. */
export function relativeTime(iso, t, now = Date.now()) {
  if (!iso) return "—";
  const s = Math.round((now - new Date(iso).getTime()) / 1000);
  if (!Number.isFinite(s)) return "—";
  if (s < 5) return t("time.just_now");
  if (s < 60) return t("time.sec_ago", { n: s });
  if (s < 3600) return t("time.min_ago", { n: Math.round(s / 60) });
  if (s < 86400) return t("time.hour_ago", { n: Math.round(s / 3600) });
  return t("time.day_ago", { n: Math.round(s / 86400) });
}

export function formatDateTime(iso, locale = "en-NG", opts) {
  if (!iso) return "—";
  try { return new Intl.DateTimeFormat(locale, opts || { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)); } catch { return String(iso); }
}
export const formatTime = (iso, locale) => formatDateTime(iso, locale, { hour: "numeric", minute: "2-digit" });
export const formatDate = (iso, locale) => formatDateTime(iso, locale, { dateStyle: "medium" });
export const formatNumber = (n, locale = "en-NG") => (n == null ? "—" : new Intl.NumberFormat(locale).format(n));
export const formatPercent = (n, locale = "en-NG", digits = 0) => (n == null ? "—" : new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: digits }).format(n));

/** Human duration from seconds, e.g. "4 min", "2 h 10 min". */
export function formatDuration(sec) {
  if (sec == null || !Number.isFinite(sec)) return "—";
  if (sec < 60) return `${Math.round(sec)} s`;
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  if (h < 48) return r ? `${h} h ${r} min` : `${h} h`;
  return `${Math.round(h / 24)} d`;
}

export function useFormat() {
  const { t, locale } = useI18n();
  const rel = useCallback((iso) => relativeTime(iso, t), [t]);
  return useMemo(() => ({
    rel, dateTime: (i, o) => formatDateTime(i, locale, o), time: (i) => formatTime(i, locale), date: (i) => formatDate(i, locale),
    number: (n) => formatNumber(n, locale), percent: (n, d) => formatPercent(n, locale, d), duration: formatDuration, locale,
  }), [rel, locale]);
}

export const maskEmail = (e) => { const [a, b] = String(e || "").split("@"); return b ? `${a.slice(0, 2)}***@${b}` : ""; };
