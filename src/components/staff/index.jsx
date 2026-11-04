import { useEffect, useState } from "react";
import { Radio, WifiOff, RefreshCw } from "lucide-react";
import { Badge, Button, Modal, TextArea } from "../ui";
import { useI18n, useLabels } from "../../i18n";
import { PRIORITY_TONE, STATUS_TONE } from "../../lib/enums";
import { Freshness } from "../common/bits";
import { cn } from "../../lib/utils";

export const PrioBadge = ({ v }) => { const L = useLabels(); return <Badge tone={PRIORITY_TONE[v] || "muted"} dot>{L.priority(v)}</Badge>; };
export const StatusBadge = ({ v }) => { const L = useLabels(); return <Badge tone={STATUS_TONE[v] || "muted"}>{L.status(v)}</Badge>; };
export const VerifBadge = ({ v }) => { const L = useLabels(); return <Badge tone={v === "verified" ? "ok" : v === "confirmed_false" ? "danger" : "muted"}>{L.verification(v)}</Badge>; };

/** Live connection indicator + data freshness. Never implies data is live when it is not. */
export function LiveIndicator({ state, lastEventAt }) {
  const { t } = useI18n();
  const map = { live: ["bg-ok", "ops.live.live"], connecting: ["bg-warn", "net.connecting"], reconnecting: ["bg-warn", "ops.live.reconnecting"], polling: ["bg-info", "ops.live.polling"], offline: ["bg-danger", "ops.live.offline"] };
  const [dot, key] = map[state] || map.connecting;
  return (
    <span className="inline-flex flex-wrap items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-ink-2" role="status">
      <span className="relative flex h-2 w-2"><span className={cn("absolute inline-flex h-full w-full rounded-full opacity-60", dot, state === "live" && "animate-ping")} /><span className={cn("relative inline-flex h-2 w-2 rounded-full", dot)} /></span>
      {t(key)}{lastEventAt && <span className="text-ink-3">· <Freshness at={lastEventAt} stale={state !== "live" && state !== "polling"} /></span>}
    </span>
  );
}

/** Ask for a mandatory reason (and optional extra fields) before a sensitive action. */
export function ReasonModal({ open, title, label, min = 3, extra, onClose, onSubmit, loading, confirmLabel, danger }) {
  const { t } = useI18n(); const [reason, setReason] = useState(""); const [x, setX] = useState({});
  useEffect(() => { if (open) { setReason(""); setX({}); } }, [open]);
  const ok = reason.trim().length >= min;
  return (
    <Modal open={open} onClose={onClose} title={title} footer={<><Button variant="ghost" onClick={onClose}>{t("act.cancel")}</Button><Button variant={danger ? "danger" : "primary"} disabled={!ok} loading={loading} onClick={() => onSubmit(reason.trim(), x)}>{confirmLabel || t("act.confirm")}</Button></>}>
      <div className="space-y-4">{extra?.(x, setX)}<TextArea label={label || t("err.REASON_REQUIRED")} rows={3} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} hint={`≥ ${min}`} /></div>
    </Modal>
  );
}
export const Refresh = ({ onClick, loading }) => { const { t } = useI18n(); return <Button size="sm" variant="outline" icon={RefreshCw} loading={loading} onClick={onClick}>{t("act.refresh")}</Button>; };
export const Def = ({ text }) => text ? <p className="mt-2 text-xs text-ink-3">{text}</p> : null;
