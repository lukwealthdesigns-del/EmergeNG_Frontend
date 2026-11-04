import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Badge, Button, Card, EmptyState, ErrorState, PageHeader, Section, Select, SkeletonList, useToast } from "../../components/ui";
import { ReasonModal, Refresh } from "../../components/staff";
import { useI18n } from "../../i18n";
import { api } from "../../api/client";
import { friendlyError } from "../../api/errors";
import { useFormat } from "../../lib/format";

const OUT = ["duplicate_confirmed", "abuse_confirmed", "no_abuse_found", "unable_to_assess"];
export default function Abuse() {
  const { t, has } = useI18n(); const f = useFormat(); const toast = useToast(); const qc = useQueryClient(); const [m, setM] = useState(null);
  const q = useQuery({ queryKey: ["ops", "abuse"], queryFn: () => api.get("/operations/abuse") });
  const done = () => { setM(null); qc.invalidateQueries({ queryKey: ["ops", "abuse"] }); };
  const sig = useMutation({ mutationFn: ({ id, body }) => api.post(`/operations/abuse/signals/${id}/review`, body), onSuccess: done, onError: (e) => toast.err(friendlyError(e, { t, has })) });
  const dup = useMutation({ mutationFn: ({ id, status }) => api.post(`/operations/abuse/duplicates/${id}/review`, { status }), onSuccess: done, onError: (e) => toast.err(friendlyError(e, { t, has })) });
  const d = q.data;
  return (
    <div className="mx-auto max-w-5xl animate-rise">
      <PageHeader title={t("ops.nav.abuse")} subtitle={t("ops.abuse.sub")} actions={<Refresh onClick={() => q.refetch()} loading={q.isFetching} />} />
      <Alert tone="info" className="mb-4">{t("ops.abuse.note")}</Alert>
      {q.isLoading ? <SkeletonList /> : q.isError ? <ErrorState error={q.error} onRetry={q.refetch} /> : (<div className="space-y-8">
        <Section title={t("ops.abuse.signals")}>{!d.abuse_signals.length ? <Card><EmptyState title={t("ops.abuse.none")} /></Card> : <ul className="space-y-2">{d.abuse_signals.map((s) => <li key={s.id}><Card className="!p-4"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{s.kind}</span><Badge tone="warn">{s.subject_type}</Badge></div><p className="mt-1 text-xs text-ink-3">{f.dateTime(s.created_at)}</p>{s.details && <pre className="mt-2 overflow-x-auto rounded-xl bg-surface-2 p-2 text-xs">{JSON.stringify(s.details, null, 1)}</pre>}
          <div className="mt-3 flex flex-wrap gap-2">{s.incident_id && <Button size="sm" variant="outline" to={`/ops/incidents/${s.incident_id}`}>{t("act.open")}</Button>}<Button size="sm" onClick={() => setM({ id: s.id })}>{t("ops.abuse.review")}</Button></div></Card></li>)}</ul>}</Section>
        <Section title={t("ops.abuse.dups")}>{!d.duplicate_signals.length ? <Card><EmptyState title={t("ops.abuse.none")} /></Card> : <ul className="space-y-2">{d.duplicate_signals.map((s) => <li key={s.id}><Card className="!p-4"><p className="text-sm">{Math.round(s.distance_m)} m · {Math.round(s.minutes_apart)} min · {s.same_category ? t("ops.abuse.same_cat") : ""} · score {Number(s.score).toFixed(2)}</p>
          <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" to={`/ops/incidents/${s.incident_id}`}>A</Button><Button size="sm" variant="outline" to={`/ops/incidents/${s.related_incident_id}`}>B</Button><Button size="sm" variant="soft" onClick={() => dup.mutate({ id: s.id, status: "confirmed_duplicate" })}>{t("ops.abuse.confirm_dup")}</Button><Button size="sm" variant="ghost" onClick={() => dup.mutate({ id: s.id, status: "not_duplicate" })}>{t("ops.abuse.not_dup")}</Button></div></Card></li>)}</ul>}<p className="mt-2 text-xs text-ink-3">{t("ops.abuse.dup_note")}</p></Section>
      </div>)}
      <ReasonModal open={!!m} title={t("ops.abuse.review")} min={0} label={t("ops.reason_optional")} loading={sig.isPending} extra={(x, set) => <Select label={t("ops.abuse.outcome")} value={x.o || OUT[3]} onChange={(e) => set({ ...x, o: e.target.value })}>{OUT.map((o) => <option key={o} value={o}>{o}</option>)}</Select>} onClose={() => setM(null)} onSubmit={(notes, x) => sig.mutate({ id: m.id, body: { outcome: x.o || OUT[3], notes: notes || null } })} />
    </div>
  );
}
