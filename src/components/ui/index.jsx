import { createContext, forwardRef, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Info, Loader2, X, Eye, EyeOff, Inbox, RefreshCw } from "lucide-react";
import { cn } from "../../lib/utils";
import { useI18n } from "../../i18n";

/* ───────── Button ───────── */
const VARIANT = {
  primary: "bg-primary text-primary-fg hover:opacity-90 shadow-soft",
  soft: "bg-surface-3 text-ink hover:brightness-95",
  outline: "border border-line bg-surface text-ink hover:bg-surface-2",
  ghost: "text-ink hover:bg-surface-3/70",
  danger: "bg-danger text-white hover:opacity-90 shadow-soft",
  dangerSoft: "bg-danger-soft text-danger hover:brightness-95",
};
const SIZE = { sm: "min-h-[36px] px-4 text-[13px]", md: "min-h-[44px] px-5 text-sm", lg: "min-h-[56px] px-7 text-base" };

export const Button = forwardRef(function Button({ variant = "primary", size = "md", loading, disabled, to, href, className, children, icon: Icon, block, type = "button", ...rest }, ref) {
  const cls = cn("inline-flex items-center justify-center gap-2 rounded-full font-semibold transition active:scale-[.98] select-none",
    "disabled:opacity-50 disabled:pointer-events-none aria-disabled:opacity-50 aria-disabled:pointer-events-none",
    VARIANT[variant], SIZE[size], block && "w-full", className);
  const inner = (<>{loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}{children}</>);
  if (to) return <Link ref={ref} to={to} className={cls} aria-disabled={disabled || undefined} {...rest}>{inner}</Link>;
  if (href) return <a ref={ref} href={href} className={cls} aria-disabled={disabled || undefined} {...rest}>{inner}</a>;
  return <button ref={ref} type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>{inner}</button>;
});

export const IconButton = forwardRef(function IconButton({ label, className, children, ...rest }, ref) {
  return (
    <button ref={ref} type="button" aria-label={label} title={label}
      className={cn("inline-flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-surface-3/70 transition active:scale-95 disabled:opacity-50", className)} {...rest}>
      {children}
    </button>
  );
});

/* ───────── Surfaces ───────── */
export const Card = ({ className, children, pad = true, as: As = "div", ...rest }) => (
  <As className={cn("bg-surface border border-line rounded-3xl shadow-soft", pad && "p-5 sm:p-6", className)} {...rest}>{children}</As>
);

export function PageHeader({ title, subtitle, actions, back, center }) {
  if (center) return ( // public, single-column pages: everything centred
    <div className="mb-6 flex flex-col items-center gap-3 text-center">
      {back}
      <h1 className="text-2xl sm:text-3xl text-ink">{title}</h1>
      {subtitle && <p className="-mt-2 max-w-2xl text-sm text-ink-2">{subtitle}</p>}
      {actions && <div className="flex flex-wrap items-center justify-center gap-2">{actions}</div>}
    </div>
  );
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {back}
        <h1 className="text-2xl sm:text-3xl text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-2 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Section({ title, hint, children, actions, className }) {
  return (
    <section className={cn("space-y-3", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-2">
          <div><h2 className="text-lg text-ink">{title}</h2>{hint && <p className="text-xs text-ink-3 mt-0.5">{hint}</p>}</div>{actions}
        </div>)}
      {children}
    </section>
  );
}

/* ───────── Badges ───────── */
const TONE = {
  neutral: "bg-surface-3 text-ink-2", info: "bg-info-soft text-info", ok: "bg-ok-soft text-ok", warn: "bg-warn-soft text-warn", danger: "bg-danger-soft text-danger", muted: "bg-surface-3 text-ink-3",
};
export const Badge = ({ tone = "neutral", children, dot, className }) => (
  <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap", TONE[tone] || TONE.neutral, className)}>
    {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}{children}
  </span>
);

/* ───────── Form fields ───────── */
export function Field({ label, hint, error, optional, children, htmlFor, className }) {
  const { t } = useI18n();
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="mb-1.5 flex items-center justify-between text-sm font-medium text-ink">
          <span>{label}</span>{optional && <span className="text-xs font-normal text-ink-3">{t("state.optional")}</span>}
        </label>)}
      {children}
      {error ? <p role="alert" className="mt-1.5 text-xs font-medium text-danger">{error}</p> : hint ? <p className="mt-1.5 text-xs text-ink-3">{hint}</p> : null}
    </div>
  );
}
const inputCls = (err) => cn("w-full rounded-2xl border bg-surface px-4 min-h-[48px] text-ink placeholder:text-ink-3 transition",
  "focus:outline-none focus:ring-2 disabled:opacity-60", err ? "border-danger focus:ring-danger/25" : "border-line focus:border-primary focus:ring-primary/15");

export const TextInput = forwardRef(function TextInput({ label, hint, error, optional, className, id, ...rest }, ref) {
  const uid = useId(); const iid = id || uid;
  return (
    <Field label={label} hint={hint} error={error} optional={optional} htmlFor={iid} className={className}>
      <input ref={ref} id={iid} aria-invalid={!!error || undefined} className={inputCls(error)} {...rest} />
    </Field>
  );
});

export const PasswordInput = forwardRef(function PasswordInput({ label, hint, error, className, id, ...rest }, ref) {
  const uid = useId(); const iid = id || uid; const [show, setShow] = useState(false); const { t } = useI18n();
  return (
    <Field label={label} hint={hint} error={error} htmlFor={iid} className={className}>
      <div className="relative">
        <input ref={ref} id={iid} type={show ? "text" : "password"} aria-invalid={!!error || undefined} className={cn(inputCls(error), "pr-12")} {...rest} />
        <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? t("auth.hide") : t("auth.show")}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full text-ink-3 hover:bg-surface-3/70 flex items-center justify-center">
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </Field>
  );
});

export const TextArea = forwardRef(function TextArea({ label, hint, error, optional, className, id, maxLength, value, rows = 4, ...rest }, ref) {
  const uid = useId(); const iid = id || uid;
  return (
    <Field label={label} hint={hint} error={error} optional={optional} htmlFor={iid} className={className}>
      <textarea ref={ref} id={iid} rows={rows} maxLength={maxLength} value={value} aria-invalid={!!error || undefined}
        className={cn(inputCls(error), "py-3 resize-y leading-relaxed")} {...rest} />
      {maxLength ? <div className="mt-1 text-right text-[11px] text-ink-3">{String(value || "").length}/{maxLength}</div> : null}
    </Field>
  );
});

export const Select = forwardRef(function Select({ label, hint, error, optional, className, id, children, ...rest }, ref) {
  const uid = useId(); const iid = id || uid;
  return (
    <Field label={label} hint={hint} error={error} optional={optional} htmlFor={iid} className={className}>
      <select ref={ref} id={iid} aria-invalid={!!error || undefined} className={cn(inputCls(error), "appearance-none pr-10 bg-no-repeat")}
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")", backgroundPosition: "right 14px center" }} {...rest}>
        {children}
      </select>
    </Field>
  );
});

export function Toggle({ checked, onChange, label, hint, disabled }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <label htmlFor={id} className="min-w-0 cursor-pointer"><span className="block text-sm font-medium text-ink">{label}</span>{hint && <span className="block text-xs text-ink-3 mt-0.5">{hint}</span>}</label>
      <button id={id} role="switch" aria-checked={!!checked} disabled={disabled} onClick={() => onChange(!checked)} type="button"
        className={cn("relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50", checked ? "bg-primary" : "bg-line")}>
        <span className={cn("absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
      </button>
    </div>
  );
}

export function Checkbox({ checked, onChange, children, error }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="flex items-start gap-3 cursor-pointer text-sm text-ink">
        <input id={id} type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-5 w-5 rounded-md border-line accent-[rgb(var(--primary))]" />
        <span>{children}</span>
      </label>
      {error && <p role="alert" className="mt-1.5 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}

export function Segmented({ value, onChange, options, className, label }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex rounded-full bg-surface-3/80 p-1 gap-1", className)}>
      {options.map((o) => (
        <button key={o.value} role="radio" aria-checked={value === o.value} type="button" onClick={() => onChange(o.value)}
          className={cn("rounded-full px-4 min-h-[36px] text-sm font-medium transition inline-flex items-center gap-1.5", value === o.value ? "bg-surface text-ink shadow-soft" : "text-ink-2 hover:text-ink")}>
          {o.icon && <o.icon className="h-4 w-4" aria-hidden />}{o.label}
        </button>))}
    </div>
  );
}

export function ChoiceGrid({ value, onChange, options, cols = "grid-cols-2" }) {
  return (
    <div className={cn("grid gap-2.5", cols)} role="radiogroup">
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
          className={cn("rounded-2xl border p-3.5 text-left transition min-h-[64px] flex items-center gap-3",
            value === o.value ? "border-primary bg-surface-3 ring-2 ring-primary/20" : "border-line bg-surface hover:bg-surface-2")}>
          {o.icon && <o.icon className="h-5 w-5 shrink-0 text-ink-2" aria-hidden />}<span className="text-sm font-medium text-ink">{o.label}</span>
        </button>))}
    </div>
  );
}

/* ───────── Feedback ───────── */
export const Spinner = ({ className }) => <Loader2 className={cn("h-5 w-5 animate-spin text-ink-3", className)} aria-hidden />;
export const Skeleton = ({ className }) => <div className={cn("skeleton h-4 w-full", className)} aria-hidden />;
export function SkeletonList({ rows = 4 }) {
  const { t } = useI18n();
  return <div className="space-y-3" role="status" aria-label={t("state.loading")}>{Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>;
}

export function EmptyState({ icon: Icon = Inbox, title, body, action }) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-6">
      <div className="h-14 w-14 rounded-full bg-surface-3 flex items-center justify-center mb-4"><Icon className="h-6 w-6 text-ink-2" aria-hidden /></div>
      <p className="font-medium text-ink">{title}</p>{body && <p className="mt-1 text-sm text-ink-2 max-w-sm">{body}</p>}{action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, title }) {
  const { t, has } = useI18n();
  const msg = error ? friendly(error, t, has) : t("state.error");
  return (
    <div role="alert" className="flex flex-col items-center text-center py-10 px-6">
      <div className="h-14 w-14 rounded-full bg-danger-soft flex items-center justify-center mb-4"><AlertTriangle className="h-6 w-6 text-danger" aria-hidden /></div>
      <p className="font-medium text-ink">{title || t("state.error")}</p><p className="mt-1 text-sm text-ink-2 max-w-sm">{msg}</p>
      {error?.requestId && <p className="mt-2 text-[11px] text-ink-3 font-mono">ref {error.requestId}</p>}
      {onRetry && <Button variant="outline" className="mt-5" icon={RefreshCw} onClick={onRetry}>{t("act.retry")}</Button>}
    </div>
  );
}
function friendly(err, t, has) {
  // lazy-inline to avoid an import cycle with api/errors in tiny components
  const byCode = `err.${err.code}`;
  if (err.code && has(byCode)) return t(byCode);
  if (err.kind === "NETWORK_ERROR") return t("err.network");
  if (err.kind === "TIMEOUT") return t("err.timeout");
  if (err.kind === "SERVER_UNAVAILABLE") return t("err.unavailable");
  if (err.status && has(`err.${err.status}`)) return t(`err.${err.status}`);
  return t("err.generic");
}

const ALERT = { info: [Info, "bg-info-soft text-info"], ok: [CheckCircle2, "bg-ok-soft text-ok"], warn: [AlertTriangle, "bg-warn-soft text-warn"], danger: [AlertTriangle, "bg-danger-soft text-danger"] };
export function Alert({ tone = "info", title, children, action, className }) {
  const [Icon, cls] = ALERT[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-2xl p-4 text-sm", cls, className)}>
      <Icon className="h-5 w-5 shrink-0 mt-0.5" aria-hidden />
      <div className="min-w-0 flex-1 text-ink">{title && <p className="font-semibold">{title}</p>}<div className={cn(title && "mt-0.5 text-ink-2")}>{children}</div>{action && <div className="mt-3">{action}</div>}</div>
    </div>
  );
}

/* ───────── Modal / bottom sheet ───────── */
export function Modal({ open, onClose, title, children, footer, wide }) {
  const ref = useRef(null); const { t } = useI18n();
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement; const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey); document.body.style.overflow = "hidden";
    setTimeout(() => ref.current?.querySelector("input,textarea,select,button")?.focus?.(), 30);
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; prev?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} />
      <div ref={ref} className={cn("relative w-full bg-surface border border-line shadow-float animate-pop max-h-[92dvh] flex flex-col rounded-t-4xl sm:rounded-3xl", wide ? "sm:max-w-2xl" : "sm:max-w-md")}>
        <div className="flex items-center justify-between px-6 pt-5 pb-2"><h2 className="text-xl">{title}</h2><IconButton label={t("act.close")} onClick={onClose}><X className="h-5 w-5" /></IconButton></div>
        <div className="px-6 pb-4 overflow-y-auto">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-line flex flex-wrap justify-end gap-2 safe-b">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, body, confirmLabel, danger, loading, onConfirm, onClose }) {
  const { t } = useI18n();
  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={<><Button variant="ghost" onClick={onClose}>{t("act.cancel")}</Button><Button variant={danger ? "danger" : "primary"} loading={loading} onClick={onConfirm}>{confirmLabel || t("act.confirm")}</Button></>}>
      <p className="text-sm text-ink-2">{body}</p>
    </Modal>
  );
}

/* ───────── Toasts ───────── */
const ToastCtx = createContext({ push: () => {} });
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((msg, tone = "ok", ms = 4200) => {
    const id = Math.random().toString(36).slice(2);
    setItems((l) => [...l.slice(-3), { id, msg, tone }]);
    setTimeout(() => setItems((l) => l.filter((x) => x.id !== id)), ms);
  }, []);
  const value = useMemo(() => ({ push, ok: (m) => push(m, "ok"), err: (m) => push(m, "danger", 6000), info: (m) => push(m, "info") }), [push]);
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="fixed z-[90] left-0 right-0 bottom-4 px-4 flex flex-col items-center gap-2 pointer-events-none safe-b" aria-live="polite">
        {items.map((i) => (
          <div key={i.id} className={cn("pointer-events-auto max-w-md w-full rounded-2xl px-4 py-3 text-sm shadow-float border border-line animate-rise bg-surface text-ink flex items-start gap-3")}>
            <span className={cn("mt-1 h-2 w-2 rounded-full shrink-0", i.tone === "danger" ? "bg-danger" : i.tone === "info" ? "bg-info" : "bg-ok")} />{i.msg}
          </div>))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/* ───────── Misc ───────── */
export function Stepper({ steps, index }) {
  return (
    <ol className="flex items-center gap-2" aria-label="progress">
      {steps.map((s, i) => (
        <li key={s} className="flex-1 min-w-0" aria-current={i === index ? "step" : undefined}>
          <div className={cn("h-1.5 rounded-full transition-all", i <= index ? "bg-primary" : "bg-line")} />
          <span className={cn("mt-1.5 block truncate text-[11px]", i === index ? "text-ink font-medium" : "text-ink-3")}>{s}</span>
        </li>))}
    </ol>
  );
}
export const Divider = ({ className }) => <hr className={cn("border-line", className)} />;
export function KV({ k, v, mono }) {
  return <div className="flex justify-between gap-4 py-2 text-sm border-b border-line/70 last:border-0"><dt className="text-ink-3">{k}</dt><dd className={cn("text-ink text-right break-words min-w-0", mono && "font-mono text-[13px]")}>{v ?? "—"}</dd></div>;
}
export function Stat({ label, value, sub, tone }) {
  return (
    <Card className="!p-4">
      <p className="text-xs text-ink-3">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold tabular-nums", tone === "danger" && "text-danger", tone === "warn" && "text-warn", tone === "ok" && "text-ok")}>{value ?? "—"}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-3">{sub}</p>}
    </Card>
  );
}
