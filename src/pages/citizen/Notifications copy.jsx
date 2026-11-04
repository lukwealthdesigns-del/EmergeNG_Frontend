import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, FileText, Info, ShieldAlert, Trash2, UserCheck } from "lucide-react";
import { Alert, Badge, Button, Card, EmptyState, ErrorState, PageHeader, Segmented, SkeletonList, Toggle, useToast } from "../../components/ui";
import { useI18n } from "../../i18n";
import { useAuth } from "../../auth/AuthProvider";
import { api } from "../../api/client";
import { friendlyError } from "../../api/errors";
import { useFormat } from "../../lib/format";
import { INBOX_KEY } from "../../hooks/useInbox";

const PAGE = 30;
const ICON = { security: ShieldAlert, incident: FileText, contact: UserCheck, system: Info };
const TONE = { security: "warn", incident: "info", contact: "ok", system: "muted" };

/** Server messages carry a stable `code` + variables; we translate by code and fall back to the server's English text. */
export function messageText(n, t, has) {
  const v = n.variables || {};
  if (n.code.startsWith("incident.status.")) {
    const k = `notif.c.${n.code}`;
    return { title: t("notif.c.incident.title", { reference: v.reference || "" }), body: has(k) ? t(k) : n.body };
  }
  const tk = `notif.c.${n.code}.title`, bk = `notif.c.${n.code}.body`;
  return { title: has(tk) ? t(tk, v) : n.title, body: has(bk) ? t(bk, v) : n.body };
}

function Inbox() {
  const { t, has } = useI18n(); const f = useFormat(); const toast = useToast(); const qc = useQueryClient(); const nav = useNavigate();
  const [filter, setFilter] = useState("all");
  const q = useInfiniteQuery({
    queryKey: [...INBOX_KEY, "list", filter], initialPageParam: 0, staleTime: 15_000, refetchOnWindowFocus: true,
    queryFn: ({ pageParam }) => api.get("/users/me/notifications", { params: { limit: PAGE, offset: pageParam, unread_only: filter === "unread" || undefined } }),
    getNextPageParam: (last, all) => (last.items.length === PAGE ? all.length * PAGE : undefined),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: INBOX_KEY });
  const fail = (e) => toast.err(friendlyError(e, { t, has }));
  const read = useMutation({ mutationFn: (id) => api.post(`/users/me/notifications/${id}/read`, {}), onSuccess: refresh, onError: fail });
  const readAll = useMutation({ mutationFn: () => api.post("/users/me/notifications/read-all", {}), onSuccess: refresh, onError: fail });
  const del = useMutation({ mutationFn: (id) => api.del(`/users/me/notifications/${id}`), onSuccess: refresh, onError: fail });
  const items = q.data?.pages.flatMap((p) => p.items) || []; const unread = q.data?.pages[0]?.unread_count || 0;
  const open = (n) => { if (!n.read_at) read.mutate(n.id); if (n.incident_id) nav(`/app/incidents/${n.incident_id}`); };
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Segmented value={filter} onChange={setFilter} label={t("notif.title")} options={[{ value: "all", label: t("notif.filter_all") }, { value: "unread", label: `${t("notif.filter_unread")}${unread ? ` (${unread})` : ""}` }]} />
        <Button size="sm" variant="outline" icon={CheckCheck} disabled={!unread} loading={readAll.isPending} onClick={() => readAll.mutate()}>{t("notif.mark_all")}</Button>
      </div>
      {q.isLoading ? <SkeletonList /> : q.isError ? <ErrorState error={q.error} onRetry={q.refetch} /> : !items.length ? <Card><EmptyState icon={Bell} title={t("notif.empty")} /></Card> : (
        <ul className="space-y-2">{items.map((n) => { const Icon = ICON[n.category] || Info; const m = messageText(n, t, has); const isNew = !n.read_at; return (
          <li key={n.id}><Card className={`!p-4 ${isNew ? "ring-1 ring-primary/30" : ""}`}>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-surface-3"><Icon className="h-4 w-4 text-ink-2" aria-hidden /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><p className={`text-sm ${isNew ? "font-semibold" : "font-medium"} text-ink`}>{m.title}</p>{isNew && <Badge tone="info" dot>{t("notif.unread_n", { n: 1 })}</Badge>}<Badge tone={TONE[n.category] || "muted"}>{t(`notif.cat.${n.category}`)}</Badge></div>
                {m.body && <p className="mt-1 text-sm text-ink-2">{m.body}</p>}
                <p className="mt-1 text-xs text-ink-3">{f.rel(n.created_at)}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {n.incident_id && <Button size="sm" variant="soft" onClick={() => open(n)}>{t("notif.open_report")}</Button>}
                  {isNew && <Button size="sm" variant="ghost" loading={read.isPending && read.variables === n.id} onClick={() => read.mutate(n.id)}>{t("notif.mark_read")}</Button>}
                  <Button size="sm" variant="ghost" icon={Trash2} aria-label={t("notif.delete")} loading={del.isPending && del.variables === n.id} onClick={() => del.mutate(n.id)} />
                </div>
              </div>
            </div></Card></li>); })}
        </ul>)}
      {q.hasNextPage && <div className="mt-4 text-center"><Button variant="outline" loading={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>{t("notif.load_more")}</Button></div>}
      <p className="mt-4 text-xs text-ink-3">{t("notif.live_note")}</p>
    </>
  );
}

export default function Notifications() {
  const { t, has } = useI18n(); const { user, setUser } = useAuth(); const toast = useToast();
  const prefs = user.notification_prefs || {};
  const save = useMutation({ mutationFn: (p) => api.put("/users/me/notification-preferences", { prefs: p }), onSuccess: (r) => { setUser({ ...user, notification_prefs: r.prefs }); toast.ok(t("act.save")); }, onError: (e) => toast.err(friendlyError(e, { t, has })) });
  const set = (k, v) => save.mutate({ ...prefs, [k]: v });
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8 animate-rise">
      <PageHeader title={t("notif.title")} subtitle={t("notif.sub")} />
      <Inbox />
      <Card className="mt-6"><h2 className="text-lg">{t("notif.prefs")}</h2><div className="mt-2 divide-y divide-line/70">
        <Toggle label={t("notif.email_incident")} checked={prefs.email_incident_updates !== false} onChange={(v) => set("email_incident_updates", v)} disabled={save.isPending} />
        <Toggle label={t("notif.email_security")} checked={prefs.email_security_events !== false} onChange={(v) => set("email_security_events", v)} disabled={save.isPending} /></div>
        <p className="mt-3 text-xs text-ink-3">{t("notif.state_note")}</p></Card>
    </div>
  );
}
