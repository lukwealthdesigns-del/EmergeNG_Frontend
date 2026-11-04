// Vocabularies owned by the backend (app/core/enums.py). Labels are translated via i18n keys `enum.<group>.<value>`.
export const OPERATIONAL_STATUSES = ["submitted", "received", "under_review", "assigned", "response_underway", "resolved", "closed", "cancelled"];
export const PRIORITIES = ["unassessed", "critical", "high", "medium", "low"];
export const VERIFICATION_STATUSES = ["unconfirmed", "under_review", "verified", "confirmed_false", "unable_to_assess"];
export const POSTCODE_STATUSES = ["not_attempted", "pending", "resolved", "not_found", "unavailable", "failed", "invalid_coordinates"];
export const CATEGORIES = ["road_accident", "medical_emergency", "fire", "security_threat", "natural_disaster", "missing_person", "building_infrastructure", "other_emergency"];
export const LANGUAGES = [
  { code: "en", name: "English", native: "English" },
  { code: "yo", name: "Yoruba", native: "Yorùbá" },
  { code: "ha", name: "Hausa", native: "Hausa" },
  { code: "ig", name: "Igbo", native: "Igbo" },
  { code: "pcm", name: "Nigerian Pidgin", native: "Naijá" },
];
export const LANG_CODES = LANGUAGES.map((l) => l.code);
export const MED_FIELDS = ["blood_group", "allergies", "conditions", "medications", "disability_needs", "emergency_notes"];

export const PRIORITY_TONE = { critical: "danger", high: "warn", medium: "info", low: "ok", unassessed: "muted" };
export const STATUS_TONE = {
  submitted: "info", received: "info", under_review: "warn", assigned: "warn", response_underway: "warn",
  resolved: "ok", closed: "muted", cancelled: "muted",
};
export const PRIORITY_COLOR = { critical: "#dc2626", high: "#ea580c", medium: "#2563eb", low: "#16a34a", unassessed: "#6b7280" };

export const isOpen = (s) => !["resolved", "closed", "cancelled"].includes(s);
