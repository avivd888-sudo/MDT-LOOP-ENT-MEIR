/**
 * Runs the 20-patient simulation through the domain model and the pilot
 * metrics, and asserts the invariants the study rests on. `node test/run.mjs`.
 */
import { buildSimulation, SIM_NOW } from "../lib/sim-cohort";
import { pilotMetrics, cohortCsv } from "../lib/pilot";
import { TEAM } from "../lib/data";
import { isValidStudyId, parseStudyId } from "../lib/study-id";
import { isValidIsraeliId } from "../lib/israeli-id";
import { loopState } from "../lib/types";
import { writeFileSync } from "node:fs";

const fails: string[] = [];
const ok: string[] = [];
const check = (name: string, cond: boolean, detail = "") => (cond ? ok : fails).push(cond ? name : `${name} ${detail}`);

const sim = buildSimulation();
const { patients, loops, sessions } = sim;
const team = new Map(TEAM.map((m) => [m.id, m]));

// Cohort shape
check("20 patients", patients.length === 20, `(${patients.length})`);
const surg = patients.filter((p) => p.plannedModality === "surgery").length;
check("10 surgery / 10 RT-CRT", surg === 10 && patients.length - surg === 10, `(${surg})`);

// Study IDs
const ids = patients.map((p) => p.studyId!);
check("every study ID valid", ids.every(isValidStudyId), ids.filter((i) => !isValidStudyId(i)).join(" "));
check("study IDs unique", new Set(ids).size === ids.length);
check("study ID parts match record", patients.every((p) => {
  const x = parseStudyId(p.studyId!)!;
  return x.site === p.siteCode && x.side === p.side && x.seq === p.studySeq && x.month === Number(p.pathologyDate!.slice(5, 7)) && x.year === Number(p.pathologyDate!.slice(0, 4));
}));
check("running numbers 1..20 in pathology order", patients.map((p) => p.studySeq).join() === Array.from({ length: 20 }, (_, i) => i + 1).join());
check("synthetic national IDs pass the check digit and start 99", patients.every((p) => isValidIsraeliId(p.nationalId) && p.nationalId.startsWith("99")));

// Dates in order
check("t0 < decision < treatment for every treated patient", patients.every((p) => !p.treatmentStartDate || (p.pathologyDate! < p.decisionDate! && p.decisionDate! < p.treatmentStartDate)));
check("no treatment after the simulation date", patients.every((p) => !p.treatmentStartDate || p.treatmentStartDate <= SIM_NOW.slice(0, 10)));

// Loops
check("every loop belongs to a sim patient", loops.every((l) => patients.some((p) => p.id === l.patientId)));
check("every actor is on the roster", loops.every((l) => l.events.every((e) => team.has(e.actorId))), loops.flatMap((l) => l.events.filter((e) => !team.has(e.actorId)).map((e) => e.actorId)).join());
const order = (l: (typeof loops)[number]) => {
  const t = [l.openedAt, l.acknowledgedAt, l.answeredAt, l.closedAt].filter(Boolean) as string[];
  return t.every((x, i) => i === 0 || x >= t[i - 1]);
};
check("opened ≤ acknowledged ≤ answered ≤ closed", loops.every(order), loops.filter((l) => !order(l)).map((l) => l.id).join());
check("events chronological", loops.every((l) => l.events.every((e, i) => i === 0 || e.at >= l.events[i - 1].at)));
check("acknowledged and answered by the receiving discipline", loops.every((l) =>
  (!l.acknowledgedBy || team.get(l.acknowledgedBy)!.discipline === l.toDiscipline) &&
  (!l.answeredBy || team.get(l.answeredBy)!.discipline === l.toDiscipline)),
  loops.filter((l) => l.answeredBy && team.get(l.answeredBy)!.discipline !== l.toDiscipline).map((l) => `${l.id}:${l.answeredBy}→${l.toDiscipline}`).join());
check("closed only by the requester, or by a lead with a recorded override", loops.every((l) =>
  !l.closedAt || l.closedBy === l.requesterId || (l.overriddenBy === l.closedBy && team.get(l.closedBy!)?.disciplineLead && l.events.some((e) => e.type === "override-closed"))));
check("an override is never shown as an ordinary closure", loops.filter((l) => l.events.some((e) => e.type === "override-closed")).every((l) => !l.events.some((e) => e.type === "closed")));

// Board
const cases = sessions.flatMap((s) => s.cases.map((c) => ({ ...c, date: s.date })));
check("every patient presented at least once", patients.every((p) => cases.some((c) => c.patientId === p.id)));
check("no case decided while one of its loops was still open", cases.filter((c) => c.status === "decided").every((c) => c.prerequisites.every((pr) => pr.ready)),
  cases.filter((c) => c.status === "decided" && c.prerequisites.some((pr) => !pr.ready)).map((c) => `${c.id}@${c.date}`).join());
check("a deferred case really was missing something at that board", cases.filter((c) => c.status === "deferred").every((c) => c.prerequisites.some((pr) => !pr.ready)),
  cases.filter((c) => c.status === "deferred" && c.prerequisites.every((pr) => pr.ready)).map((c) => `${c.id}@${c.date}`).join());
check("every deferred case names its reason", cases.filter((c) => c.status === "deferred").every((c) => c.deferReason));
check("boards sit on Thursdays", sessions.every((s) => new Date(`${s.date}T12:00:00Z`).getUTCDay() === 4));

// Metrics
const m = pilotMetrics(patients, loops, sessions, SIM_NOW);
check("pilot cohort takes all 20", m.enrolled === 20, `(${m.enrolled})`);
writeFileSync("test/out/metrics.json", JSON.stringify({ ...m, cohort: m.cohort.map(({ patient, ...rest }) => ({ ...rest, name: patient.name })) }, null, 2));
writeFileSync("test/out/cohort.csv", cohortCsv(m));
writeFileSync("test/out/sim.json", JSON.stringify(sim));

console.log(`✓ ${ok.length} passed`);
ok.forEach((o) => console.log("  ✓", o));
if (fails.length) { console.log(`✗ ${fails.length} failed`); fails.forEach((f) => console.log("  ✗", f)); process.exitCode = 1; }
console.log("\nPrimary (pathology → treatment):", JSON.stringify(m.primary));
console.log("  surgical:", JSON.stringify(m.primaryBy.surgical));
console.log("  non-surgical:", JSON.stringify(m.primaryBy["non-surgical"]));
console.log("Thresholds:", JSON.stringify(m.thresholds));
console.log("Decision→tx by pathway:", JSON.stringify(m.segments.decisionToTxBy));
console.log("Capacity:", JSON.stringify(m.capacity));
console.log("Loops:", { opened: m.loopsOpened, closed: m.loopsClosed, closureRate: m.closureRate, answeredNotClosed: m.answeredNotClosed, neverAck: m.neverAcknowledged, override: m.overrideClosed, rerouted: m.rerouted, escalated: m.escalated });
console.log("Board:", m.boardCases, "entries,", m.boardDeferred, "deferred", JSON.stringify(m.deferReasons));
console.log("Feasibility:", m.withLoop, "/", m.enrolled, "belowFloor", m.belowFloor);
console.log("By discipline:", m.byDiscipline.map((d) => `${d.discipline}:${d.loops}/${d.medianHoursToAnswer?.toFixed(0)}h`).join("  "));
