/**
 * The adjuvant pathway — surgery to the end of postoperative radiotherapy.
 *
 * This module is the most directly evidence-derived part of the application.
 * Every threshold and every milestone below comes from a published head and
 * neck study, cited inline, rather than from a local convention:
 *
 *  • The five milestones are the process measures isolated in the mediation
 *    analysis of the NDURE randomised trial, which found that patients
 *    completing four or five of them started radiotherapy on time in 90% of
 *    cases, against 10% for those completing one or none.
 *    Graboyes EM, et al. JAMA Otolaryngol Head Neck Surg. 2026,
 *    doi:10.1001/jamaoto.2026.1891.
 *
 *  • The 6-week surgery-to-PORT target, and the risk attached to exceeding it
 *    (aHR 1.10–1.13 for overall survival), come from the systematic review in
 *    Graboyes EM, Kompelli AR, Neskey DM, et al. JAMA Otolaryngol Head Neck
 *    Surg. 2019;145(2):166–177.
 *
 *  • The treatment package time bands — aHR 1.19 at 11–12 weeks, 1.36 at 13–15
 *    weeks, 1.51 at 16 weeks or more — come from the same review.
 *
 * Why this belongs in a coordination tool rather than a clinical one: each
 * milestone is a *handoff between two disciplines*, which is precisely the unit
 * a loop represents. The application does not advise on any of them; it makes
 * visible which have happened, which are due, and which are late.
 */

import { getLabelLang } from "./lang-state";
import { NOW } from "./data";
import { daysBetween } from "./metrics";
import type { Discipline, Patient } from "./types";

/* -------------------------------------------------------------------------- */
/* Thresholds                                                                  */
/* -------------------------------------------------------------------------- */

/** Guideline target from surgery to the start of postoperative radiotherapy. */
export const SPORT_TARGET_DAYS = 42; // six weeks

/**
 * Treatment package time bands, in days from surgery to the end of radiotherapy.
 * `ahr` is the adjusted hazard ratio for overall survival reported for that band.
 */
export const TPT_BANDS = [
  { maxDays: 77, label: "Within 11 weeks", labelHe: "עד 11 שבועות", ahr: null as number | null },
  { maxDays: 91, label: "11–12 weeks", labelHe: "11–12 שבועות", ahr: 1.19 },
  { maxDays: 112, label: "13–15 weeks", labelHe: "13–15 שבועות", ahr: 1.36 },
  { maxDays: Infinity, label: "16 weeks or more", labelHe: "16 שבועות ומעלה", ahr: 1.51 },
];

/* -------------------------------------------------------------------------- */
/* Milestones                                                                  */
/* -------------------------------------------------------------------------- */

export type MilestoneId =
  | "radonc-preop"
  | "dental-preop"
  | "radonc-postop"
  | "planning-scan"
  | "rt-start";

export interface MilestoneSpec {
  id: MilestoneId;
  /** Read through `milestoneText()`, never directly — it picks the language. */
  label: string;
  detail: string;
  labelHe: string;
  detailHe: string;
  /** The discipline that has to act — so a loop can be routed without asking. */
  owner: Discipline;
  /** Which anchor the due date is counted from. */
  anchor: "surgery" | "planning";
  /** Days after the anchor by which it should be done; null if it precedes surgery. */
  dueDays: number | null;
}

export const MILESTONES: MilestoneSpec[] = [
  {
    id: "radonc-preop",
    label: "Radiation oncology seen before surgery",
    detail:
      "A pre-operative radiation oncology consultation. Patients who have already met the radiation oncologist before theatre reach radiotherapy sooner.",
    labelHe: "ייעוץ אונקולוגיית קרינה לפני הניתוח",
    detailHe:
      "ייעוץ אונקולוגיית קרינה טרום-ניתוחי. מטופלים שכבר נפגשו עם אונקולוג הקרינה לפני חדר הניתוח מגיעים להקרנות מוקדם יותר.",
    owner: "radiation-oncology",
    anchor: "surgery",
    dueDays: null,
  },
  {
    id: "dental-preop",
    label: "Pre-operative dental assessment",
    detail:
      "Dental clearance before radiotherapy. Left until after surgery it becomes one of the commonest single causes of delay, and it cannot be compressed.",
    labelHe: "הערכת שיניים טרום-ניתוחית",
    detailHe:
      "אישור רפואת שיניים לפני הקרנות. כשמשאירים אותו לאחרי הניתוח הוא הופך לאחת הסיבות השכיחות ביותר לעיכוב, ואי אפשר לדחוס אותו.",
    owner: "dentistry",
    anchor: "surgery",
    dueDays: null,
  },
  {
    id: "radonc-postop",
    label: "Radiation oncology review within 21 days of surgery",
    detail:
      "The single highest-yield step: in the NDURE mediation analysis this visit alone accounted for roughly a quarter of the whole intervention's benefit.",
    labelHe: "ביקורת אונקולוגיית קרינה בתוך 21 יום מהניתוח",
    detailHe:
      "הצעד בעל התשואה הגבוהה ביותר: בניתוח התיווך של NDURE הביקור הזה לבדו הסביר כרבע מכלל התועלת של ההתערבות.",
    owner: "radiation-oncology",
    anchor: "surgery",
    dueDays: 21,
  },
  {
    id: "planning-scan",
    label: "Radiotherapy planning scan completed",
    detail: "Simulation and planning imaging, without which the start date cannot be fixed.",
    labelHe: "סימולציה ותכנון הקרנות הושלמו",
    detailHe: "סימולציה והדמיית תכנון, שבלעדיהן אי אפשר לקבוע תאריך התחלה.",
    owner: "radiation-oncology",
    anchor: "surgery",
    dueDays: 28,
  },
  {
    id: "rt-start",
    label: "Radiotherapy started within 14 days of planning",
    detail: "The final handoff — planning complete to first fraction delivered.",
    labelHe: "הקרנות החלו בתוך 14 יום מהתכנון",
    detailHe: "המסירה האחרונה — מסיום התכנון ועד מתן המנה הראשונה.",
    owner: "radiation-oncology",
    anchor: "planning",
    dueDays: 14,
  },
];

/**
 * The milestone's label and detail in the reader's language.
 *
 * A function rather than a bilingual table, because a milestone is a record
 * with several fields and only two of them are text — wrapping the whole array
 * in a proxy would hide the numbers as well.
 */
export function milestoneText(m: MilestoneSpec): { label: string; detail: string } {
  return getLabelLang() === "he"
    ? { label: m.labelHe, detail: m.detailHe }
    : { label: m.label, detail: m.detail };
}

export const MILESTONE_BY_ID: Record<MilestoneId, MilestoneSpec> = Object.fromEntries(
  MILESTONES.map((m) => [m.id, m]),
) as Record<MilestoneId, MilestoneSpec>;

/* -------------------------------------------------------------------------- */
/* Per-patient state                                                           */
/* -------------------------------------------------------------------------- */

export interface MilestoneRecord {
  id: MilestoneId;
  /** ISO date it was completed, if it has been. */
  doneOn?: string;
  /** The loop chasing it, when one has been opened. */
  loopId?: string;
}

export interface AdjuvantPlan {
  /** Whether postoperative radiotherapy is indicated at all. */
  indicated: boolean;
  surgeryDate?: string;
  /** Date the planning scan was done — the anchor for the final milestone. */
  planningDate?: string;
  portStartDate?: string;
  portEndDate?: string;
  milestones: MilestoneRecord[];
}

export type MilestoneState = "done" | "due" | "overdue" | "not-applicable";

export interface MilestoneStatus {
  spec: MilestoneSpec;
  record?: MilestoneRecord;
  state: MilestoneState;
  /** Days remaining until due (negative when overdue). Null when there is no date to count from. */
  daysRemaining: number | null;
  dueDate: string | null;
}

const addDays = (iso: string, days: number) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

/** Resolve every milestone for one patient against today's date. */
export function milestoneStatuses(
  plan: AdjuvantPlan,
  now: string = NOW,
): MilestoneStatus[] {
  const today = now.slice(0, 10);

  return MILESTONES.map((spec) => {
    const record = plan.milestones.find((m) => m.id === spec.id);

    if (record?.doneOn) {
      return { spec, record, state: "done" as const, daysRemaining: null, dueDate: null };
    }

    // Pre-operative milestones are only meaningful before surgery has happened;
    // once the patient is past theatre an incomplete one is simply late.
    if (spec.dueDays === null) {
      if (!plan.surgeryDate) {
        return { spec, record, state: "due" as const, daysRemaining: null, dueDate: null };
      }
      return {
        spec, record,
        state: "overdue" as const,
        daysRemaining: -daysBetween(plan.surgeryDate, today),
        dueDate: plan.surgeryDate,
      };
    }

    const anchorDate = spec.anchor === "planning" ? plan.planningDate : plan.surgeryDate;
    if (!anchorDate) {
      // The anchor has not happened yet, so this milestone cannot be due.
      return { spec, record, state: "not-applicable" as const, daysRemaining: null, dueDate: null };
    }

    const dueDate = addDays(anchorDate, spec.dueDays);
    const daysRemaining = daysBetween(today, dueDate);
    return {
      spec, record,
      state: daysRemaining < 0 ? ("overdue" as const) : ("due" as const),
      daysRemaining,
      dueDate,
    };
  });
}

/** How many of the five have been completed — the axis the trial reported on. */
export function milestonesCompleted(plan: AdjuvantPlan): number {
  return plan.milestones.filter((m) => m.doneOn).length;
}

/* -------------------------------------------------------------------------- */
/* Clocks                                                                      */
/* -------------------------------------------------------------------------- */

export interface SportClock {
  /** Days from surgery to the start of radiotherapy, or to today if not started. */
  days: number;
  started: boolean;
  target: number;
  /** Proportion of the target elapsed, capped for display. */
  percent: number;
  state: "on-target" | "at-risk" | "breached";
}

export function sportClock(plan: AdjuvantPlan, now: string = NOW): SportClock | null {
  if (!plan.indicated || !plan.surgeryDate) return null;
  const end = plan.portStartDate ?? now.slice(0, 10);
  const days = daysBetween(plan.surgeryDate, end);
  const started = Boolean(plan.portStartDate);
  const percent = Math.min(140, (days / SPORT_TARGET_DAYS) * 100);
  const state =
    days > SPORT_TARGET_DAYS ? "breached" : days > SPORT_TARGET_DAYS * 0.75 ? "at-risk" : "on-target";
  return { days, started, target: SPORT_TARGET_DAYS, percent, state };
}

export interface PackageClock {
  days: number;
  complete: boolean;
  band: (typeof TPT_BANDS)[number];
}

export function packageClock(plan: AdjuvantPlan, now: string = NOW): PackageClock | null {
  if (!plan.indicated || !plan.surgeryDate) return null;
  const end = plan.portEndDate ?? now.slice(0, 10);
  const days = daysBetween(plan.surgeryDate, end);
  const band = TPT_BANDS.find((b) => days <= b.maxDays) ?? TPT_BANDS[TPT_BANDS.length - 1];
  return { days, complete: Boolean(plan.portEndDate), band };
}

/* -------------------------------------------------------------------------- */
/* Cohort metrics                                                              */
/* -------------------------------------------------------------------------- */

export interface AdjuvantMetrics {
  onPathway: number;
  /** Started radiotherapy within the 6-week target, of those who started. */
  timelyPort: number;
  startedPort: number;
  timelyPortRate: number | null;
  /** Milestone completion distribution, matching how the trial reported it. */
  byCompletion: { label: string; patients: number; timely: number }[];
  /** Every milestone that is currently overdue, across the cohort. */
  overdue: { patientId: string; patientName: string; milestone: MilestoneSpec; daysLate: number }[];
}

export function adjuvantMetrics(
  patients: (Patient & { adjuvant?: AdjuvantPlan })[],
  now: string = NOW,
): AdjuvantMetrics {
  const cohort = patients.filter((p) => p.adjuvant?.indicated);

  const started = cohort.filter((p) => p.adjuvant!.portStartDate);
  const timely = started.filter((p) => {
    const c = sportClock(p.adjuvant!, now);
    return c && c.days <= SPORT_TARGET_DAYS;
  });

  const buckets = [
    { label: "4–5 milestones", min: 4, max: 5 },
    { label: "2–3 milestones", min: 2, max: 3 },
    { label: "0–1 milestones", min: 0, max: 1 },
  ];

  const byCompletion = buckets.map((b) => {
    const inBucket = cohort.filter((p) => {
      const n = milestonesCompleted(p.adjuvant!);
      return n >= b.min && n <= b.max;
    });
    return {
      label: b.label,
      patients: inBucket.length,
      timely: inBucket.filter((p) => {
        const c = sportClock(p.adjuvant!, now);
        return c && c.started && c.days <= SPORT_TARGET_DAYS;
      }).length,
    };
  });

  const overdue: AdjuvantMetrics["overdue"] = [];
  cohort.forEach((p) => {
    milestoneStatuses(p.adjuvant!, now).forEach((s) => {
      if (s.state === "overdue") {
        overdue.push({
          patientId: p.id,
          patientName: p.name,
          milestone: s.spec,
          daysLate: Math.abs(s.daysRemaining ?? 0),
        });
      }
    });
  });
  overdue.sort((a, b) => b.daysLate - a.daysLate);

  return {
    onPathway: cohort.length,
    startedPort: started.length,
    timelyPort: timely.length,
    timelyPortRate: started.length ? timely.length / started.length : null,
    byCompletion,
    overdue,
  };
}
