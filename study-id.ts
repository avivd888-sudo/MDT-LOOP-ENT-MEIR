/**
 * The study identifier — one official ID per patient, in English.
 *
 *     ENT-26-007-NPC-M-09
 *     │   │  │   │   │ └ month of the malignant pathology report
 *     │   │  │   │   └── side: R · L · M (midline) · B (bilateral)
 *     │   │  │   └────── tumour site code (SITE_CODES below)
 *     │   │  └────────── running number within the arm — this is what makes it unique
 *     │   └───────────── year of the malignant pathology report
 *     └───────────────── arm: ENT intervention · HIS existing database · RET retrospective
 *
 * Why it carries a clinical hint at all: so that a team discussing
 * "ENT-26-007-NPC-M-09" cannot drift onto the wrong patient. Why only site,
 * side and month: that is how clinicians recall a case, and the combination
 * almost never repeats on one board in one month. Never initials, date of
 * birth, national ID or TNM stage — the stage changes with final pathology and
 * an identifier must not.
 *
 * The same format, the same site codes and the same order of parts are used by
 * the data-collection workbook (`MDT-Loop-ENT-איסוף-נתונים.xlsx`), so an ID
 * copied from the application finds its row in the spreadsheet and vice versa.
 *
 * The identifier is not a substitute for identifying the patient. Before any
 * clinical act the identity is checked in the Clalit record with two
 * identifiers (full name and national ID) — WHO Patient Safety Solution 2.
 */

import type { Patient, Subsite } from "./types";

export type Side = "R" | "L" | "M" | "B";
/**
 * Which study and which arm the number belongs to.
 *
 *   ENT  the prospective pilot — the shadow system
 *   HIS  the historical control, the existing patient database
 *   RET  the retrospective cohort, 2019–2025
 *
 * The prefix exists so that `007` in one study cannot be read as `007` in
 * another. Three studies run off one set of running numbers otherwise.
 */
export type Arm = "ENT" | "HIS" | "RET";

export const SITE_CODES = {
  OT: ["Oral tongue", "לשון (חלל הפה)"],
  FOM: ["Floor of mouth", "רצפת הפה"],
  BUC: ["Buccal mucosa", "רירית הלחי"],
  GUM: ["Gingiva / alveolar ridge", "חניכיים / רכס מכתשי"],
  PAL: ["Hard palate", "חך קשה"],
  LIP: ["Lip", "שפה"],
  RMT: ["Retromolar trigone", "טריגון רטרומולרי"],
  TON: ["Tonsil", "שקד"],
  BOT: ["Base of tongue", "בסיס הלשון"],
  OPX: ["Oropharynx — other", "לוע הפה — אחר"],
  NPC: ["Nasopharynx", "לוע האף"],
  SGL: ["Supraglottis", "גרון — סופרגלוטי"],
  GLT: ["Glottis", "גרון — גלוטי"],
  SBG: ["Subglottis", "גרון — סבגלוטי"],
  HPX: ["Hypopharynx", "היפופרינקס"],
  SNC: ["Sinonasal", "אף וסינוסים"],
  PAR: ["Parotid", "בלוטת הפרוטיד"],
  SMG: ["Submandibular gland", "בלוטה תת-לסתית"],
  MSG: ["Minor salivary glands", "בלוטות רוק זעירות"],
  THY: ["Thyroid", "בלוטת התריס"],
  CUP: ["Neck node, unknown primary", "גרורה צווארית ללא מוקד ראשוני"],
  SKN: ["Cutaneous head & neck", "עור ראש-צוואר"],
  OTH: ["Other", "אחר"],
} as const;

export type SiteCode = keyof typeof SITE_CODES;

export const SIDE_LABEL: Record<Side, [string, string]> = {
  R: ["Right", "ימין"],
  L: ["Left", "שמאל"],
  M: ["Midline", "קו אמצע"],
  B: ["Bilateral", "דו-צדדי"],
};

/** A sensible first guess from the coarse subsite; the clinician confirms it. */
export const DEFAULT_SITE: Record<Subsite, SiteCode> = {
  larynx: "GLT",
  oropharynx: "TON",
  "oral-cavity": "OT",
  hypopharynx: "HPX",
  nasopharynx: "NPC",
  sinonasal: "SNC",
  thyroid: "THY",
  salivary: "PAR",
  skin: "SKN",
  "unknown-primary": "CUP",
};

/** Sites with no laterality default to midline rather than to a guess. */
export const MIDLINE_SITES: SiteCode[] = ["NPC", "SGL", "SBG", "PAL", "OTH"];

const ID_RE = /^(ENT|HIS|RET)-(\d{2})-(\d{3})-([A-Z]{2,3})-([RLMB])-(0[1-9]|1[0-2])$/;

export function formatStudyId(
  arm: Arm,
  seq: number,
  site: SiteCode,
  side: Side,
  pathologyDate: string,
): string {
  const yy = pathologyDate.slice(2, 4);
  const mm = pathologyDate.slice(5, 7);
  return `${arm}-${yy}-${String(seq).padStart(3, "0")}-${site}-${side}-${mm}`;
}

export function isValidStudyId(id: string): boolean {
  const m = ID_RE.exec(id);
  return Boolean(m && m[4] in SITE_CODES);
}

export function parseStudyId(id: string) {
  const m = ID_RE.exec(id);
  if (!m) return null;
  return {
    arm: m[1] as Arm,
    year: 2000 + Number(m[2]),
    seq: Number(m[3]),
    site: m[4] as SiteCode,
    side: m[5] as Side,
    month: Number(m[6]),
  };
}

/** The next running number: one more than the highest already issued. */
export function nextStudySeq(patients: Patient[]): number {
  return Math.max(0, ...patients.map((p) => p.studySeq ?? 0)) + 1;
}

/**
 * Issue an identifier to a patient who does not have one yet. A patient who
 * already has one keeps it — this is the "frozen once assigned" rule.
 */
export function assignStudyId(p: Patient, patients: Patient[], arm: Arm = "ENT"): Patient {
  if (p.studyId || !p.pathologyDate) return p;
  const seq = p.studySeq ?? nextStudySeq(patients);
  const site = p.siteCode ?? DEFAULT_SITE[p.subsite];
  const side = p.side ?? (MIDLINE_SITES.includes(site) ? "M" : "R");
  return {
    ...p,
    studySeq: seq,
    siteCode: site,
    side,
    studyId: formatStudyId(arm, seq, site, side, p.pathologyDate),
  };
}

/** Site · side · month in words — the hint shown beside the identifier. */
export function studyHint(p: Patient, lang: "en" | "he"): string {
  if (!p.siteCode) return "";
  const i = lang === "he" ? 1 : 0;
  const side = p.side && p.side !== "M" ? ` ${SIDE_LABEL[p.side][i]}` : "";
  const month = p.pathologyDate ? ` · ${p.pathologyDate.slice(5, 7)}/${p.pathologyDate.slice(2, 4)}` : "";
  return `${SITE_CODES[p.siteCode][i]}${side}${month}`;
}
