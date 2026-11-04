import { useState } from "react";
import { Search } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Alert, Badge, Button, Card, KV, PageHeader, TextInput } from "../../components/ui";
import { useI18n, useLabels } from "../../i18n";
import { api } from "../../api/client";
import { friendlyError } from "../../api/errors";
import { useFormat } from "../../lib/format";
import { fmtCoords } from "../../lib/geo";

export default function Track() {
  const { t, has } = useI18n(); const L = useLabels(); const f = useFormat();
  const [ref, setRef] = useState(""); const [code, setCode] = useState(""); const [err, setErr] = useState({});
  const m = useMutation({ mutationFn: () => api.get(`/public/track/${encodeURIComponent(ref.trim().toUpperCase())}`, { headers: { "X-Tracking-Token": code.trim() }, auth: "none" }) });
  const go = (e) => { e.preventDefault(); const x = {}; if (!/^EMG-[A-Z0-9-]{4,30}$/i.test(ref.trim())) x.ref = t("val.required"); if (code.trim().length < 16) x.code = t("val.required"); setErr(x); if (!Object.keys(x).length) m.mutate(); };
  const r = m.data;
  return (
    <div className="mx-auto max-w-xl px-4 py-8 animate-rise">
      <PageHeader center title={t("track.title")} subtitle={t("track.sub")} />
      <Card><form onSubmit={go} className="space-y-4" noValidate>
        <TextInput label={t("track.ref")} value={ref} onChange={(e) => setRef(e.target.value)} error={err.ref} placeholder="EMG-2026-7K3Q9X" autoCapitalize="characters" spellCheck={false} />
        <TextInput label={t("track.code")} value={code} onChange={(e) => setCode(e.target.value)} error={err.code} autoComplete="off" spellCheck={false} />
        <Button type="submit" block loading={m.isPending} icon={Search}>{t("track.check")}</Button>
      </form></Card>
      {m.isError && <Alert tone="danger" className="mt-4">{m.error?.status === 404 ? t("track.not_found") : friendlyError(m.error, { t, has })}</Alert>}
      {r && (<Card className="mt-4">
        <div className="mb-2 flex items-center justify-between"><span className="font-mono text-sm">{r.reference}</span><Badge tone="info" dot>{L.status(r.status)}</Badge></div>
        <p className="text-ink">{r.status_message}</p>
        {r.demo && <Alert tone="warn" className="mt-3">{t("inc.simulated")}</Alert>}
        <p className="mt-3 text-sm text-ink-2">{r.response_confirmed ? t("inc.response_confirmed") : t("inc.no_response")}</p>
        <dl className="mt-3"><KV k={t("report.captured_at")} v={f.dateTime(r.location?.captured_at)} /><KV k={t("report.received_at")} v={f.dateTime(r.received_by_operations_at || r.submitted_at)} />
          {r.location && <KV k={t("loc.coordinates")} v={fmtCoords(r.location.latitude, r.location.longitude)} mono />}{r.location?.postcode && <KV k={t("loc.pc.value")} v={r.location.postcode} mono />}</dl>
        {r.timeline?.length > 0 && <ol className="mt-4 space-y-2 border-l border-line pl-4">{r.timeline.map((e, i) => <li key={i} className="text-sm"><span className="text-ink-3">{f.dateTime(e.at)}</span> · {L.status(e.to) || e.event}{e.simulated ? ` (${t("inc.simulated")})` : ""}</li>)}</ol>}
        <p className="mt-4 text-xs text-ink-3">{r.emergency_notice}</p>
      </Card>)}
    </div>
  );
}
