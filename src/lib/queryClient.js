import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "../api/errors";

/** Server-state cache. Sensitive data lives only in memory (garbage-collected, cleared on sign-out).
 *  Only queries tagged meta:{persist:true} (non-sensitive: facilities directory, public config) are mirrored to IndexedDB. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 30 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      networkMode: "offlineFirst", // serve cache first; fetch errors surface instead of pausing forever
      retry: (count, err) => !(err instanceof ApiError && !err.retryable) && count < 2,
      retryDelay: (n) => Math.min(1000 * 2 ** n, 8000),
    },
    mutations: { networkMode: "always", retry: false },
  },
});

export const qk = {
  me: ["me"], authConfig: ["public", "auth-config"], offlineConfig: ["public", "offline-config"],
  profile: ["profile"], medical: ["medical"], contacts: ["contacts"], places: ["places"], consents: ["consents"],
  incidentsMine: (page = 1) => ["incidents", "mine", page], incident: (id) => ["incidents", id],
  sessions: ["sessions"], privacyRequests: ["privacy-requests"], shareLinks: ["share-links"],
  nearby: (lat, lon, r, cats) => ["public", "nearby", Math.round(lat * 1000), Math.round(lon * 1000), r, cats],
  emergencyCard: ["emergency-card"],
};
