import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";

export const INBOX_KEY = ["inbox"];

/** Number of unread in-app notifications for the signed-in user (polled gently; silent when offline). */
export function useUnreadCount() {
  const { isAuthed } = useAuth();
  const q = useQuery({
    queryKey: [...INBOX_KEY, "unread"], enabled: !!isAuthed, retry: false, staleTime: 30_000, refetchInterval: 60_000, refetchOnWindowFocus: true,
    queryFn: () => api.get("/users/me/notifications", { params: { limit: 1, unread_only: true } }).then((r) => r.unread_count || 0),
  });
  return q.data || 0;
}
