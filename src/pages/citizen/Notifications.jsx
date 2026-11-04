import { useMutation } from "@tanstack/react-query";
import { BellOff } from "lucide-react";
import { Alert, Card, EmptyState, PageHeader, Toggle, useToast } from "../../components/ui";
import { useI18n } from "../../i18n";
import { useAuth } from "../../auth/AuthProvider";
import { api } from "../../api/client";
import { friendlyError } from "../../api/errors";

/** The backend exposes notification PREFERENCES for citizens, not an in-app inbox. We do not invent one. */
export default function Notifications() {
  const { t, has } = useI18n(); const { user, setUser } = useAuth(); const toast = useToast();
  const prefs = user.notification_prefs || {};
  const save = useMutation({ mutationFn: (p) => api.put("/users/me/notification-preferences", { prefs: p }), onSuccess: (r) => { setUser({ ...user, notification_prefs: r.prefs }); toast.ok(t("act.save")); }, onError: (e) => toast.err(friendlyError(e, { t, has })) });
  const set = (k, v) => save.mutate({ ...prefs, [k]: v });
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8 animate-rise">
      <PageHeader title={t("notif.title")} subtitle={t("notif.sub")} />
      <Card><h2 className="text-lg">{t("notif.prefs")}</h2><div className="mt-2 divide-y divide-line/70">
        <Toggle label={t("notif.email_incident")} checked={prefs.email_incident_updates !== false} onChange={(v) => set("email_incident_updates", v)} disabled={save.isPending} />
        <Toggle label={t("notif.email_security")} checked={prefs.email_security_events !== false} onChange={(v) => set("email_security_events", v)} disabled={save.isPending} /></div>
        <p className="mt-3 text-xs text-ink-3">{t("notif.state_note")}</p></Card>
      <Card className="mt-4"><EmptyState icon={BellOff} title={t("notif.empty")} /></Card>
    </div>
  );
}
