/**
 * The pilot cohort, and the numbers the study actually claims — protocol v1.1.
 *
 * The platform runs as a SHADOW SYSTEM: alongside the existing pathway,
 * replacing nothing. It backs up communication between the disciplines,
 * records the days in each segment, and surfaces communication failures. This
 * module turns those records into the study's outcomes:
 *
 *   Primary   days from the malignant pathology report (t = 0) to the first
 *             definitive treatment — surgery, radiotherapy or chemoradiation.
 *   Segments  pathology → first board · decision → treatment · surgery →
 *             second decision · surgery → adjuvant.
 *   Cut-offs  ≤30 days (MoH / meta-analysis) · >60 (Liao 2019) · >67 (Murphy
 *             2016) · surgery ≤30 days from decision (MoH circular 1/2020) ·
 *             adjuvant ≤42 days (NCCN v1.2026, 2A).
 *   H0        referral → theatre and referral → radiotherapy unit, because the
 *             null hypothesis is that capacity, not communication, is the limit.
 *   Process   loops opened and closed, answered-not-closed, time to answer per
 *             discipline, board deferrals, and the 60% stopping floor.
 *
 * ── Enrolment is not a decision ───────────────────────────────────────────
 *
 * The cohort is derived, never chosen: consecutive patients whose malignant
 * pathology report falls inside the pilot window, in order of that date, up to
 * 20. There is no "enrol this patient" button, because a cohort somebody picks
 * is a cohort that tells you what they expected.
 */

import { NOW } from "./data";
import { hoursBetween } from "./metrics";
import type { Discipline, Loop, MdtSession, Patient, TreatmentModality } from "./types";

/** The one line to change when the real intervention period opens. */
export const PILOT_START = "2026-06-01";
/** Protocol v1.1: 3–6 months. Recruitment closes at six months whatever n is. */
export const PILOT_MONTHS = 6;
export const PILOT_END = (() => {
  const d = new Date(`${PILOT_START}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + PILOT_MONTHS);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
})();
/** Up to 20 patients (protocol v1.1, §5.1). */
export const PILOT_TARGET = 20;
/** Stopping floor: below 60% of cases managed in the tool at three months (§5.6). */
export const STOPPING_FLOOR = 0.6;

export type Pathway = "surgical" | "non-surgical";
export const pathwayOf = (m?: TreatmentModality): Pathway | null =>
  !m ? null : m === "surgery" ? "surgical" : "non-surgical";

export interface PilotPatient {
  patient: Patient;
  /** Consecutive position in the cohort — 1-based. */
  seq: number;
  studyId: string;
  firstBoard: string | null;
  presentations: number;
  deferrals: number;
  /** Primary endpoint. */
  pathToTx: number | null;
  pathToBoard: number | null;
  decisionToTx: number | null;
  surgeryToSecondDecision: number | null;
  surgeryToAdjuvant: number | null;
  orWait: number | null;
  rtWait: number | null;
  within30: boolean | null;
  over60: boolean | null;
  over67: boolean | null;
  /** Surgery only: ≤30 days from the decision (circular 1/2020). */
  moh30: boolean | null;
  adjuvant42: boolean | null;
  loopsOpened: number;
  loopsClosed: number;
  answeredNotClosed: number;
}

export interface IntervalStats {
  n: number;
  mean: number | null;
  median: number | null;
  q1: number | null;
  q3: number | null;
  sd: number | null;
  min: number | null;
  max: number | null;
  /** An SD from fewer than ten intervals is too unstable to plan a trial around. */
  reportable: boolean;
}

export interface DisciplineResponse {
  discipline: Discipline;
  loops: number;
  answered: number;
  medianHoursToAck: number | null;
  medianHoursToAnswer: number | null;
}

export interface PilotMetrics {
  cohort: PilotPatient[];
  enrolled: number;
  target: number;
  start: string;
  end: string;
  surgical: number;
  nonSurgical: number;
  /** Feasibility: cases with at least one loop opened. */
  withLoop: number;
  withLoopRate: number | null;
  belowFloor: boolean;
  loopsOpened: number;
  loopsClosed: number;
  closureRate: number | null;
  answeredNotClosed: number;
  neverAcknowledged: number;
  overrideClosed: number;
  rerouted: number;
  escalated: number;
  boardCases: number;
  boardDeferred: number;
  deferReasons: { reason: string; n: number }[];
  primary: IntervalStats;
  primaryBy: Record<Pathway, IntervalStats>;
  segments: {
    pathToBoard: IntervalStats;
    decisionToTx: IntervalStats;
    decisionToTxBy: Record<Pathway, IntervalStats>;
    surgeryToSecondDecision: IntervalStats;
    surgeryToAdjuvant: IntervalStats;
  };
  thresholds: {
    within30: Rate;
    over60: Rate;
    over67: Rate;
    moh30: Rate;
    adjuvant42: Rate;
  };
  capacity: { orWait: IntervalStats; rtWait: IntervalStats };
  byDiscipline: DisciplineResponse[];
  weekly: { week: string; opened: number }[];
}

export interface Rate {
  n: number;
  of: number;
  rate: number | null;
}

const DAY = 24;
function days(a?: string | null, b?: string | null): number | null {
  if (!a || !b) return null;
  return Math.round(hoursBetween(`${a.slice(0, 10)}T12:00:00`, `${b.slice(0, 10)}T12:00:00`) / DAY);
}

function quantile(sorted: number[], q: number): number {
  // Type 7 (Excel QUARTILE / QUARTILE.INC), so the app and the workbook agree.
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/** Sample standard deviation (n−1): these are a sample of future patients. */
export function intervalStats(values: (number | null)[]): IntervalStats {
  const v = values.filter((x): x is number => x !== null);
  const n = v.length;
  if (n === 0) {
    return { n: 0, mean: null, median: null, q1: null, q3: null, sd: null, min: null, max: null, reportable: false };
  }
  const sorted = [...v].sort((a, b) => a - b);
  const mean = v.reduce((s, x) => s + x, 0) / n;
  const sd = n < 2 ? null : Math.sqrt(v.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1));
  return {
    n,
    mean,
    median: quantile(sorted, 0.5),
    q1: quantile(sorted, 0.25),
    q3: quantile(sorted, 0.75),
    sd,
    min: sorted[0],
    max: sorted[n - 1],
    reportable: n >= 10,
  };
}

function rate(flags: (boolean | null)[]): Rate {
  const known = flags.filter((f): f is boolean => f !== null);
  const n = known.filter(Boolean).length;
  return { n, of: known.length, rate: known.length ? n / known.length : null };
}

function median(v: number[]): number | null {
  if (!v.length) return null;
  return quantile([...v].sort((a, b) => a - b), 0.5);
}

/** ISO week key, e.g. `2026-W31`. */
function isoWeek(iso: string): string {
  const d = new Date(iso);
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function pilotMetrics(
  patients: Patient[],
  loops: Loop[],
  sessions: MdtSession[],
  now: string = NOW,
): PilotMetrics {
  const today = now.slice(0, 10);
  const cohortPatients = patients
    .filter((p) => p.pathologyDate && p.pathologyDate >= PILOT_START && p.pathologyDate <= PILOT_END && p.pathologyDate <= today)
    .sort((a, b) => (a.pathologyDate! + a.id).localeCompare(b.pathologyDate! + b.id))
    .slice(0, PILOT_TARGET);

  const ids = new Set(cohortPatients.map((p) => p.id));
  const cohortLoops = loops.filter((l) => ids.has(l.patientId));
  const entries = sessions
    .flatMap((s) => s.cases.map((c) => ({ ...c, date: s.date })))
    .filter((c) => ids.has(c.patientId));

  const cohort: PilotPatient[] = cohortPatients.map((p, i) => {
    const mine = cohortLoops.filter((l) => l.patientId === p.id);
    const shown = entries.filter((e) => e.patientId === p.id).sort((a, b) => a.date.localeCompare(b.date));
    const pathway = pathwayOf(p.treatmentModality);
    const pathToTx = p.treatmentStartDate ? days(p.pathologyDate, p.treatmentStartDate) : null;
    const decisionToTx = days(p.decisionDate, p.treatmentStartDate);
    const surgical = pathway === "surgical";
    const adj = surgical ? days(p.treatmentStartDate, p.adjuvantStartDate) : null;
    return {
      patient: p,
      seq: i + 1,
      studyId: p.studyId ?? `—`,
      firstBoard: shown[0]?.date ?? null,
      presentations: shown.length,
      deferrals: shown.filter((e) => e.status === "deferred").length,
      pathToTx,
      pathToBoard: days(p.pathologyDate, shown[0]?.date),
      decisionToTx,
      surgeryToSecondDecision: surgical ? days(p.treatmentStartDate, p.secondDecisionDate) : null,
      surgeryToAdjuvant: adj,
      orWait: surgical ? days(p.orReferralDate, p.treatmentStartDate) : null,
      rtWait: pathway === "non-surgical" ? days(p.rtReferralDate, p.treatmentStartDate) : null,
      within30: pathToTx === null ? null : pathToTx <= 30,
      over60: pathToTx === null ? null : pathToTx > 60,
      over67: pathToTx === null ? null : pathToTx > 67,
      moh30: surgical && decisionToTx !== null ? decisionToTx <= 30 : null,
      adjuvant42: adj === null ? null : adj <= 42,
      loopsOpened: mine.length,
      loopsClosed: mine.filter((l) => l.closedAt).length,
      answeredNotClosed: mine.filter((l) => l.answeredAt && !l.closedAt).length,
    };
  });

  const by = (path: Pathway, f: (c: PilotPatient) => number | null) =>
    intervalStats(cohort.filter((c) => pathwayOf(c.patient.treatmentModality) === path).map(f));

  const closed = cohortLoops.filter((l) => l.closedAt);
  const answered = cohortLoops.filter((l) => l.answeredAt);

  const disciplines = [...new Set(cohortLoops.map((l) => l.toDiscipline))];
  const byDiscipline: DisciplineResponse[] = disciplines
    .map((d) => {
      const ls = cohortLoops.filter((l) => l.toDiscipline === d);
      return {
        discipline: d,
        loops: ls.length,
        answered: ls.filter((l) => l.answeredAt).length,
        medianHoursToAck: median(ls.filter((l) => l.acknowledgedAt).map((l) => hoursBetween(l.openedAt, l.acknowledgedAt!))),
        medianHoursToAnswer: median(ls.filter((l) => l.answeredAt).map((l) => hoursBetween(l.openedAt, l.answeredAt!))),
      };
    })
    .sort((a, b) => (b.medianHoursToAnswer ?? Infinity) - (a.medianHoursToAnswer ?? Infinity));

  const deferred = entries.filter((e) => e.status === "deferred");
  const reasons = new Map<string, number>();
  deferred.forEach((e) => reasons.set(e.deferReason ?? "—", (reasons.get(e.deferReason ?? "—") ?? 0) + 1));

  const weeks = new Map<string, number>();
  cohortLoops.forEach((l) => weeks.set(isoWeek(l.openedAt), (weeks.get(isoWeek(l.openedAt)) ?? 0) + 1));

  const withLoop = cohort.filter((c) => c.loopsOpened > 0).length;
  const withLoopRate = cohort.length ? withLoop / cohort.length : null;

  return {
    cohort,
    enrolled: cohort.length,
    target: PILOT_TARGET,
    start: PILOT_START,
    end: PILOT_END,
    surgical: cohort.filter((c) => pathwayOf(c.patient.treatmentModality ?? c.patient.plannedModality) === "surgical").length,
    nonSurgical: cohort.filter((c) => pathwayOf(c.patient.treatmentModality ?? c.patient.plannedModality) === "non-surgical").length,
    withLoop,
    withLoopRate,
    belowFloor: withLoopRate !== null && withLoopRate < STOPPING_FLOOR,
    loopsOpened: cohortLoops.length,
    loopsClosed: closed.length,
    closureRate: answered.length ? answered.filter((l) => l.closedAt).length / answered.length : null,
    answeredNotClosed: answered.filter((l) => !l.closedAt).length,
    neverAcknowledged: cohortLoops.filter((l) => !l.acknowledgedAt).length,
    overrideClosed: cohortLoops.filter((l) => l.events.some((e) => e.type === "override-closed")).length,
    rerouted: cohortLoops.filter((l) => l.events.some((e) => e.type === "reassigned")).length,
    escalated: cohortLoops.filter((l) => l.events.some((e) => e.type === "escalated")).length,
    boardCases: entries.length,
    boardDeferred: deferred.length,
    deferReasons: [...reasons.entries()].map(([reason, n]) => ({ reason, n })),
    primary: intervalStats(cohort.map((c) => c.pathToTx)),
    primaryBy: { surgical: by("surgical", (c) => c.pathToTx), "non-surgical": by("non-surgical", (c) => c.pathToTx) },
    segments: {
      pathToBoard: intervalStats(cohort.map((c) => c.pathToBoard)),
      decisionToTx: intervalStats(cohort.map((c) => c.decisionToTx)),
      decisionToTxBy: { surgical: by("surgical", (c) => c.decisionToTx), "non-surgical": by("non-surgical", (c) => c.decisionToTx) },
      surgeryToSecondDecision: intervalStats(cohort.map((c) => c.surgeryToSecondDecision)),
      surgeryToAdjuvant: intervalStats(cohort.map((c) => c.surgeryToAdjuvant)),
    },
    thresholds: {
      within30: rate(cohort.map((c) => c.within30)),
      over60: rate(cohort.map((c) => c.over60)),
      over67: rate(cohort.map((c) => c.over67)),
      moh30: rate(cohort.map((c) => c.moh30)),
      adjuvant42: rate(cohort.map((c) => c.adjuvant42)),
    },
    capacity: {
      orWait: intervalStats(cohort.map((c) => c.orWait)),
      rtWait: intervalStats(cohort.map((c) => c.rtWait)),
    },
    byDiscipline,
    weekly: [...weeks.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([week, opened]) => ({ week, opened })),
  };
}

/* -------------------------------------------------------------------------- */
/* Export — matches the Patients sheet of the data-collection workbook        */
/* -------------------------------------------------------------------------- */

/** Modality names exactly as the workbook's dropdown spells them. */
const MOD_HE: Partial<Record<TreatmentModality, string>> = {
  surgery: "ניתוח",
  radiotherapy: "הקרנות",
  chemoradiotherapy: "כימו-הקרנות",
  systemic: "טיפול מערכתי",
  "best-supportive-care": "פליאטיבי",
  "active-surveillance": "מעקב בלבד",
};

/**
 * The cohort as CSV, one row per patient, with the column keys of the
 * `Patients` sheet in `MDT-Loop-ENT-איסוף-נתונים.xlsx` (row 4 of that sheet),
 * so the export can be pasted into the workbook column by column.
 *
 * Identifiers-free by construction: the study ID and nothing else. No name, no
 * national ID, no medical record number — those stay in the key file.
 */
export const CSV_COLUMNS = [
  "id", "seq", "site", "side", "age", "sex", "ecog", "cT", "cN", "cM", "stage", "p16",
  "t0", "mdt1", "dec", "pmod", "orref", "rtref", "tx", "amod", "dec2", "adj",
  "dental", "peg", "nres", "ndef", "loops_opened", "loops_closed", "loops_answered_not_closed",
] as const;

export function cohortCsv(m: PilotMetrics): string {
  const yn = (b?: boolean) => (b === undefined ? "" : b ? "כן" : "לא");
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = m.cohort.map((c) => {
    const p = c.patient;
    const r: Record<(typeof CSV_COLUMNS)[number], unknown> = {
      id: c.studyId,
      seq: p.studySeq ?? c.seq,
      site: p.siteCode,
      side: p.side,
      age: p.age,
      sex: p.sex === "M" ? "ז" : "נ",
      ecog: p.ecog,
      cT: p.tnm.t,
      cN: p.tnm.n,
      cM: p.tnm.m,
      stage: p.tnm.stageGroup,
      p16: p.tnm.p16 === "positive" ? "חיובי" : p.tnm.p16 === "negative" ? "שלילי" : p.subsite === "oropharynx" ? "לא נבדק" : "לא רלוונטי",
      t0: p.pathologyDate,
      mdt1: c.firstBoard,
      dec: p.decisionDate,
      pmod: p.plannedModality ? MOD_HE[p.plannedModality] : "",
      orref: p.orReferralDate,
      rtref: p.rtReferralDate,
      tx: p.treatmentStartDate,
      amod: p.treatmentModality ? MOD_HE[p.treatmentModality] : "",
      dec2: p.secondDecisionDate,
      adj: p.adjuvantStartDate,
      dental: yn(p.dentalNeeded),
      peg: yn(p.pegNeeded),
      nres: c.presentations,
      ndef: c.deferrals,
      loops_opened: c.loopsOpened,
      loops_closed: c.loopsClosed,
      loops_answered_not_closed: c.answeredNotClosed,
    };
    return CSV_COLUMNS.map((k) => esc(r[k])).join(",");
  });
  // BOM so Excel opens the Hebrew values as UTF-8.
  return "﻿" + [CSV_COLUMNS.join(","), ...rows].join("\n");
}
