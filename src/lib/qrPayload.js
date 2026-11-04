// Builds the plain text stored inside the emergency QR code. Pure function (unit-tested in tests/qrpayload.test.mjs).
// The text is ALWAYS English with fixed labels so a responder anywhere can read it with any QR scanner.
export const QR_MAX_CHARS = 900;            // comfortable for a version-≤20 QR at error-correction level M and still easy to scan
export const QR_FIELDS = ["name", "language", "blood_group", "allergies", "conditions", "medications", "disability_needs", "emergency_notes"];
const LABEL = { name: "Name", language: "Language", blood_group: "Blood group", allergies: "Allergies", conditions: "Conditions", medications: "Medications", disability_needs: "Needs", emergency_notes: "Notes" };
const PER_VALUE_MAX = 220;
const CONTROL = new RegExp("[\\u0000-\\u001f\\u007f\\u2028\\u2029]+", "g"); // built from escapes so no raw line-separator characters live in the source

/** Collapse whitespace, drop control characters and anything that could be mistaken for a new line of the card. */
export function clean(v, max = PER_VALUE_MAX) {
  const s = (Array.isArray(v) ? v.join(", ") : String(v ?? "")).replace(CONTROL, " ").replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

/**
 * @param {{values: Record<string, any>, include: Record<string, boolean>, contact?: string, now?: Date}} o
 * @returns {{text: string, length: number, used: string[], tooLong: boolean}}
 */
export function buildQrPayload({ values = {}, include = {}, contact = "", now = new Date() }) {
  const lines = []; const used = [];
  for (const k of QR_FIELDS) {
    if (!include[k]) continue;
    const v = clean(values[k]);
    if (!v || v === "unknown") continue;
    lines.push(`${LABEL[k]}: ${v}`); used.push(k);
  }
  const c = clean(contact);
  if (include.contact !== false && c) { lines.push(`Emergency contact: ${c}`); used.push("contact"); }
  if (!lines.length) return { text: "", length: 0, used: [], tooLong: false };
  const date = now.toISOString().slice(0, 10);
  const text = ["EMERGENCY CARD (EmergeNG)", ...lines, `Self-reported, not verified. Created ${date}.`, "In an emergency call 112."].join("\n");
  return { text, length: text.length, used, tooLong: text.length > QR_MAX_CHARS };
}
