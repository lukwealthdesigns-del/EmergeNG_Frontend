// Photo evidence: bytes are stored locally and uploaded AFTER the report is accepted. A photo failure never affects the report.
import { idb } from "./idb";
import { uploadRaw, getAccessToken } from "../api/client";
import { uuid } from "../lib/utils";
import { validateImage } from "../lib/validators";

export async function stageImage(clientIncidentId, file) {
  const err = validateImage(file); if (err) return { error: err };
  const id = uuid();
  await idb.put("media", { id, clientIncidentId, blob: file, mime: file.type, bytes: file.size, state: "pending_upload", attempts: 0 });
  return { id, mime: file.type, bytes: file.size };
}
export const listMedia = async (clientIncidentId) => (await idb.all("media")).filter((m) => m.clientIncidentId === clientIncidentId);

/** Upload every pending image of a SYNCED report. Uses the owner's bearer, or the guest tracking token. */
export async function uploadPendingMedia(rec, onProgress) {
  if (rec.state !== "SYNCED" || !rec.serverIncidentUuid) return;
  const items = (await listMedia(rec.clientIncidentId)).filter((m) => ["pending_upload", "upload_failed_retryable"].includes(m.state));
  for (const m of items) {
    try {
      await idb.put("media", { ...m, state: "uploading" });
      const headers = getAccessToken() ? {} : { "X-Tracking-Token": rec.trackingToken || "" };
      await uploadRaw(`/offline/incidents/${rec.serverIncidentUuid}/media/${m.id}`, m.blob, { headers, onProgress: (p) => onProgress?.(m.id, p) });
      await idb.put("media", { ...m, state: "uploaded", blob: null });
    } catch (e) {
      const permanent = e?.status === 413 || e?.status === 415 || e?.code === "MEDIA_DISABLED" || e?.code === "UNSUPPORTED_TYPE";
      await idb.put("media", { ...m, state: permanent ? "upload_failed_permanent" : "upload_failed_retryable", attempts: (m.attempts || 0) + 1 });
    }
  }
}
export const removeMedia = (id) => idb.del("media", id);
