export const config = {
  maxBatch: 20,
  sendSyncToken: String(import.meta.env?.VITE_SEND_SYNC_TOKEN ?? "false") === "true",
  appVersion: "0.1.0",
};
