import { NOW } from "./data";
import { bilingual, getLabelLang } from "./lang-state";
import type { Acuity, LoopState, LoopUrgency, PathwayStatus, Tone } from "./types";

/**
 * Dates are rendered in the reader's own calendar conventions.
 *
 * `he-IL` gives day/month/year with Hebrew month names, which is what a
 * clinician in Kfar Saba expects to see on a referral. The rest of the
 * application takes care that a date sitting inside a Hebrew sentence is
 * bidi-isolated, or "3 Aug" arrives reordered.
 */
const locale = () => (getLabelLang() === "he" ? "he-IL" : "en-GB");

export function initials(name: string) {
  const clean = name.replace(/[",']/g, "").trim().split(/[\s,]+/).filter(Boolean);
  return ((clean[0]?.[0] ?? "") + (clean[1]?.[0] ?? "")).toUpperCase();
}

/** "Cohen, Abraham" → "A. Cohen" for tight spaces. */
export function shortName(name: string) {
  const [last, first] = name.split(",").map((s) => s.trim());
  if (!first) return name;
  return `${first[0]}. ${last}`;
}

export function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale(), { day: "numeric", month: "short", year: "numeric" });
}

export function fmtShortDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale(), { day: "numeric", month: "short" });
}

export function fmtTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function fmtDateTime(iso: string) {
  return `${fmtShortDate(iso)} · ${fmtTime(iso)}`;
}

/** Days elapsed — the pathway clock. */
export function daysSince(iso: string, from: string = NOW.slice(0, 10)) {
  const a = new Date(iso).getTime();
  const b = new Date(from).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, Math.round((b - a) / 864e5));
}

export function relativeTime(iso: string, now: string = NOW) {
  const then = new Date(iso).getTime();
  const base = new Date(now).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.round((base - then) / 60000);
  const he = getLabelLang() === "he";
  if (mins < 1) return he ? "עכשיו" : "just now";
  if (mins < 60) return he ? `לפני ${mins} דק׳` : `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return he ? `לפני ${hours} שע׳` : `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return he ? "אתמול" : "yesterday";
  if (days < 7) return he ? `לפני ${days} ימים` : `${days}d ago`;
  return fmtShortDate(iso);
}

export const STATUS_TONE: Record<PathwayStatus, Tone> = {
  "new-referral": "primary",
  "awaiting-staging": "warn",
  "mdt-review": "review",
  treatment: "primary",
  "post-op": "neutral",
  surveillance: "stable",
};

export const ACUITY_TONE: Record<Acuity, Tone> = {
  urgent: "urgent",
  routine: "neutral",
};

export const URGENCY_TONE: Record<LoopUrgency, Tone> = {
  stat: "urgent",
  urgent: "warn",
  routine: "neutral",
};

export const LOOP_STATE_TONE: Record<LoopState, Tone> = {
  open: "urgent",
  acknowledged: "warn",
  answered: "review",
  closed: "stable",
};

/** ECOG performance status, spelled out — clinicians disagree about these. */
export const ECOG_LABEL: Record<string, string> = bilingual(
  {
    0: "Fully active, no restriction",
    1: "Restricted in strenuous activity, ambulatory",
    2: "Ambulatory, up >50% of waking hours, unable to work",
    3: "Limited self-care, confined to bed or chair >50% of waking hours",
    4: "Completely disabled, totally confined",
  } as Record<string, string>,
  {
    0: "פעיל לחלוטין, ללא הגבלה",
    1: "מוגבל במאמץ ניכר, מתהלך",
    2: "מתהלך, ער ומחוץ למיטה מעל 50% משעות הערות, אינו מסוגל לעבוד",
    3: "טיפול עצמי מוגבל, מרותק למיטה או לכיסא מעל 50% משעות הערות",
    4: "מוגבל לחלוטין, מרותק כליל",
  } as Record<string, string>,
);

export const TIMELINE_ICON: Record<string, string> = {
  referral: "mail",
  imaging: "image",
  biopsy: "biotech",
  pathology: "science",
  mdt: "groups",
  surgery: "healing",
  radiotherapy: "bolt",
  systemic: "medication",
  followup: "event_repeat",
  complication: "warning",
};

export const DOC_ICON: Record<string, string> = {
  pathology: "science",
  imaging: "image",
  labs: "biotech",
  letter: "description",
  consent: "assignment_turned_in",
  operative: "healing",
};

export const DISCIPLINE_ICON: Record<string, string> = {
  surgery: "healing",
  "medical-oncology": "medication",
  "radiation-oncology": "bolt",
  pathology: "science",
  radiology: "image",
  endocrinology: "biotech",
  "infectious-diseases": "coronavirus",
  neurology: "neurology",
  neurosurgery: "psychology",
  nursing: "vaccines",
  anaesthetics: "air",
  "speech-language": "record_voice_over",
  dietetics: "nutrition",
  dentistry: "dentistry",
  palliative: "favorite",
};

export const LOOP_KIND_ICON: Record<string, string> = {
  "pathology-review": "science",
  "imaging-report": "image",
  "anaesthetic-assessment": "air",
  "oncology-opinion": "medication",
  "radiation-opinion": "bolt",
  "endocrine-opinion": "biotech",
  "infection-opinion": "coronavirus",
  "neuro-opinion": "neurology",
  "skull-base-opinion": "psychology",
  "nutrition-assessment": "nutrition",
  "swallow-assessment": "record_voice_over",
  "dental-clearance": "dentistry",
  scheduling: "event",
  other: "help",
};
