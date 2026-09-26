/**
 * Multidisciplinary collaboration metrics.
 *
 * Every number on the insights screen is computed here from live data — there
 * are no hard-coded values. That matters: when the app is connected to real
 * data, these same functions produce the metrics, so what the demonstration
 * shows is exactly what the study would measure.
 */

import { getLabelLang } from "./lang-state";
import { NOW } from "./data";
import {
  LOOP_SLA_HOURS,
  loopState,
  type Discipline,
  type Loop,
  type LoopState,
  type MdtSession,
  type Patient,
  type TeamMember,
} from "./types";

const HOUR = 3_600_000;

export function hoursBetween(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / HOUR;
}

export function hoursOpen(l: Loop, now: string = NOW): number {
  return hoursBetween(l.openedAt, l.closedAt ?? now);
}

/** Has the loop passed its target turnaround without being closed. */
export function isBreached(l: Loop, now: string = NOW): boolean {
  if (l.closedAt) return false;
  return hoursOpen(l, now) > LOOP_SLA_HOURS[l.urgency];
}

/** Percentage of the target elapsed — drives the meter on the loop card. */
export function slaProgress(l: Loop, now: string = NOW): number {
  return Math.min(200, (hoursOpen(l, now) / LOOP_SLA_HOURS[l.urgency]) * 100);
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export interface LoopMetrics {
  total: number;
  byState: Record<LoopState, number>;
  /** Answered but not closed — the open-loop failure, and the study's key metric. */
  answeredNotClosed: number;
  closureRate: number;
  breached: number;
  medianHoursToAck: number | null;
  medianHoursToAnswer: number | null;
  medianHoursToClose: number | null;
  /** Age distribution of loops still open, in hours. */
  ageBuckets: { label: string; count: number }[];
}

export function loopMetrics(loops: Loop[], now: string = NOW): LoopMetrics {
  const byState: Record<LoopState, number> = {
    open: 0,
    acknowledged: 0,
    answered: 0,
    closed: 0,
  };
  loops.forEach((l) => byState[loopState(l)]++);

  const ackTimes = loops.filter((l) => l.acknowledgedAt).map((l) => hoursBetween(l.openedAt, l.acknowledgedAt!));
  const answerTimes = loops.filter((l) => l.answeredAt).map((l) => hoursBetween(l.openedAt, l.answeredAt!));
  const closeTimes = loops.filter((l) => l.closedAt).map((l) => hoursBetween(l.openedAt, l.closedAt!));

  const open = loops.filter((l) => !l.closedAt);
  const he = getLabelLang() === "he";
  const buckets = [
    { label: he ? "עד 24 שע׳" : "Under 24h", min: 0, max: 24 },
    { label: he ? "24–72 שע׳" : "24–72h", min: 24, max: 72 },
    { label: he ? "3–7 ימים" : "3–7 days", min: 72, max: 168 },
    { label: he ? "מעל 7 ימים" : "Over 7 days", min: 168, max: Infinity },
  ];

  return {
    total: loops.length,
    byState,
    answeredNotClosed: byState.answered,
    closureRate: loops.length ? byState.closed / loops.length : 0,
    breached: loops.filter((l) => isBreached(l, now)).length,
    medianHoursToAck: median(ackTimes),
    medianHoursToAnswer: median(answerTimes),
    medianHoursToClose: median(closeTimes),
    ageBuckets: buckets.map((b) => ({
      label: b.label,
      count: open.filter((l) => {
        const h = hoursOpen(l, now);
        return h >= b.min && h < b.max;
      }).length,
    })),
  };
}

export interface DisciplineMetric {
  discipline: Discipline;
  received: number;
  closed: number;
  openNow: number;
  /** Requests this discipline initiated — shows who participates, not just who is asked. */
  raised: number;
  medianHoursToAnswer: number | null;
  breached: number;
}

/**
 * Collaboration by discipline.
 *
 * This is the view that locates the bottleneck. It is reported at discipline
 * level, never at individual level: the aim is to find systemic load — a
 * pathology service short-staffed, an anaesthetic gap — not to rank people. A
 * system that produces personal league tables of response speed is read as a
 * performance-management tool and gets worked around.
 */
export function byDiscipline(
  loops: Loop[],
  team: TeamMember[],
  now: string = NOW,
): DisciplineMetric[] {
  const received = new Map<Discipline, Loop[]>();
  loops.forEach((l) => {
    const arr = received.get(l.toDiscipline) ?? [];
    arr.push(l);
    received.set(l.toDiscipline, arr);
  });

  const raisedBy = new Map<Discipline, number>();
  loops.forEach((l) => {
    const d = team.find((m) => m.id === l.requesterId)?.discipline;
    if (d) raisedBy.set(d, (raisedBy.get(d) ?? 0) + 1);
  });

  const all = new Set<Discipline>([...received.keys(), ...raisedBy.keys()]);

  return Array.from(all)
    .map((discipline) => {
      const ls = received.get(discipline) ?? [];
      return {
        discipline,
        received: ls.length,
        closed: ls.filter((l) => l.closedAt).length,
        openNow: ls.filter((l) => !l.closedAt).length,
        raised: raisedBy.get(discipline) ?? 0,
        medianHoursToAnswer: median(
          ls.filter((l) => l.answeredAt).map((l) => hoursBetween(l.openedAt, l.answeredAt!)),
        ),
        breached: ls.filter((l) => isBreached(l, now)).length,
      };
    })
    .sort((a, b) => (b.medianHoursToAnswer ?? -1) - (a.medianHoursToAnswer ?? -1));
}

export interface MdtMetrics {
  casesListed: number;
  decided: number;
  deferred: number;
  pending: number;
  /** Cases that cannot be decided now because a prerequisite is outstanding. */
  blockedByOpenLoop: number;
  /** Proportion reaching no decision — compared against 24.9% in the literature. */
  noDecisionRate: number;
  /** Cases deferred at least once and still on the list. */
  repeatListings: number;
  /** Median number of disciplines present across meetings. */
  medianAttendance: number | null;
}

export function mdtMetrics(sessions: MdtSession[], team: TeamMember[]): MdtMetrics {
  const cases = sessions.flatMap((s) => s.cases);
  const decided = cases.filter((c) => c.status === "decided").length;
  const deferred = cases.filter((c) => c.status === "deferred").length;
  const pending = cases.filter((c) => c.status === "pending").length;
  const blocked = cases.filter(
    (c) => c.status !== "decided" && c.prerequisites.some((p) => !p.ready),
  ).length;

  const attendance = sessions.map(
    (s) =>
      new Set(
        s.attendeeIds
          .map((id) => team.find((m) => m.id === id)?.discipline)
          .filter(Boolean),
      ).size,
  );

  return {
    casesListed: cases.length,
    decided,
    deferred,
    pending,
    blockedByOpenLoop: blocked,
    noDecisionRate: cases.length ? (cases.length - decided) / cases.length : 0,
    repeatListings: cases.filter((c) => c.timesDeferred > 0).length,
    medianAttendance: median(attendance),
  };
}

export interface PathwayMetrics {
  medianDaysToDecision: number | null;
  medianDaysToTreatment: number | null;
  over60Days: number;
  over30Days: number;
  activePathways: number;
  perPatient: { id: string; name: string; daysWaiting: number; started: boolean }[];
}

export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

/**
 * Pathway metrics.
 *
 * The 30 and 60 day thresholds come from the Oral Oncology 2024 meta-analysis:
 * treatment within 30 days aHR 1.09, delay beyond 60 days aHR 1.42. Israel has
 * no equivalent national target — one of the reasons for the study.
 */
export function pathwayMetrics(patients: Patient[], now: string = NOW): PathwayMetrics {
  const today = now.slice(0, 10);

  const toDecision = patients
    .filter((p) => p.decisionDate)
    .map((p) => daysBetween(p.referralDate, p.decisionDate!));

  const toTreatment = patients
    .filter((p) => p.treatmentStartDate)
    .map((p) => daysBetween(p.referralDate, p.treatmentStartDate!));

  const perPatient = patients.map((p) => ({
    id: p.id,
    name: p.name,
    daysWaiting: daysBetween(p.referralDate, p.treatmentStartDate ?? today),
    started: Boolean(p.treatmentStartDate),
  }));

  const untreated = perPatient.filter((p) => !p.started);

  return {
    medianDaysToDecision: median(toDecision),
    medianDaysToTreatment: median(toTreatment),
    over60Days: untreated.filter((p) => p.daysWaiting > 60).length,
    over30Days: untreated.filter((p) => p.daysWaiting > 30).length,
    activePathways: untreated.length,
    perPatient: perPatient.sort((a, b) => b.daysWaiting - a.daysWaiting),
  };
}

export function loopsForPatient(loops: Loop[], patientId: string): Loop[] {
  return loops
    .filter((l) => l.patientId === patientId)
    .sort((a, b) => (a.openedAt < b.openedAt ? 1 : -1));
}

/** What the current user personally owes the team. */
export function actionableFor(
  loops: Loop[],
  user: TeamMember,
): { toAnswer: Loop[]; toClose: Loop[] } {
  return {
    toAnswer: loops.filter(
      (l) => l.toDiscipline === user.discipline && !l.answeredAt && !l.closedAt,
    ),
    toClose: loops.filter((l) => l.requesterId === user.id && l.answeredAt && !l.closedAt),
  };
}

/**
 * Loops that must be raised at the next MDT meeting.
 *
 * The escalation rule is written down rather than left to whoever happens to
 * remember: a loop that has passed its target turnaround and has still not been
 * answered goes onto the agenda automatically. Nothing about it depends on the
 * requester chasing it, which is exactly the failure the system exists to
 * remove.
 */
export function loopsForEscalation(loops: Loop[], now: string = NOW): Loop[] {
  return loops
    .filter((l) => !l.closedAt && !l.answeredAt && isBreached(l, now))
    .sort((a, b) => hoursOpen(b, now) - hoursOpen(a, now));
}

export function fmtHours(h: number | null): string {
  if (h === null) return "—";
  const he = getLabelLang() === "he";
  if (h < 1) return `${Math.round(h * 60)}${he ? " דק׳" : " min"}`;
  if (h < 48) return `${h.toFixed(1)}${he ? " שע׳" : " h"}`;
  return `${(h / 24).toFixed(1)}${he ? " ימים" : " days"}`;
}

export function fmtPercent(v: number): string {
  return `${Math.round(v * 100)}%`;
}
