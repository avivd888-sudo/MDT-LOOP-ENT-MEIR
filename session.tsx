"use client";

import Link from "next/link";
import { useState } from "react";
import { Screen } from "@/components/shell";
import {
  AppHeader,
  Avatar,
  Badge,
  Button,
  Callout,
  Card,
  EmptyState,
  En,
  Icon,
  Label,
  Meter,
  Num,
  SectionTitle,
  Select,
  Sheet,
  Textarea,
} from "@/components/ui";
import { quorumFor, useStore } from "@/lib/store";
import { member } from "@/lib/data";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { fmtHours, hoursOpen, loopsForEscalation } from "@/lib/metrics";
import {
  DISCIPLINE_SHORT,
  INTENT_LABEL,
  MODALITY_LABEL,
  type MdtCaseEntry,
  type MdtDecision,
  type TreatmentModality,
} from "@/lib/types";

const MODALITIES = Object.keys(MODALITY_LABEL) as TreatmentModality[];

/**
 * The meeting itself.
 *
 * This screen was not in the original design, and it is the reason the
 * application is worth building: an MDT platform that displays patients but
 * never captures the decision leaves the meeting's most important output —
 * what was agreed, by whom, and whether the board was quorate — in somebody's
 * personal notebook.
 */
export default function BoardSession({ id }: { id: string }) {
  const {
    sessions,
    team,
    loops,
    getPatient,
    recordDecision,
    deferCase,
    toggleAttendance,
    currentUser,
    patients,
    listCase,
  } = useStore();
  const [addPatient, setAddPatient] = useState("");
  const [addQuestion, setAddQuestion] = useState("");
  const { lang, t } = useLang();
  const escalated = loopsForEscalation(loops);
  const [decidingCase, setDecidingCase] = useState<MdtCaseEntry | null>(null);
  const [attendanceOpen, setAttendanceOpen] = useState(false);

  const session = sessions.find((s) => s.id === id);

  if (!session) {
    return (
      <>
        <AppHeader title={t("Tumour board", "מועצת גידולים")} back="/board" />
        <Screen>
          <EmptyState
            icon="event_busy"
            title={t("Meeting not found", "הדיון לא נמצא")}
            body={t("No meeting with that identifier.", "אין דיון עם המזהה הזה.")}
          />
        </Screen>
      </>
    );
  }

  const quorum = quorumFor(session, team);
  const decided = session.cases.filter((c) => c.status === "decided").length;
  const progress = session.cases.length ? (decided / session.cases.length) * 100 : 0;

  return (
    <>
      <AppHeader
        title={fmtDate(session.date)}
        subtitle={`${session.title} · ${session.startTime}`}
        back="/board"
        action={
          <button
            onClick={() => setAttendanceOpen(true)}
            aria-label={t("Attendance", "נוכחות")}
            className="grid size-10 place-items-center rounded-full text-white hover:bg-white/5"
          >
            <Icon name="how_to_reg" size={21} />
          </button>
        }
      />

      <Screen>
        <Card className="mb-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Label>{t("Progress", "התקדמות")}</Label>
              <p className="mt-0.5 text-lg font-extrabold text-white">
                {lang === "he" ? (
                  <>
                    <Num>{decided}</Num> מתוך <Num>{session.cases.length}</Num> הוכרעו
                  </>
                ) : (
                  <>
                    <Num>{decided}</Num> of <Num>{session.cases.length}</Num> decided
                  </>
                )}
              </p>
            </div>
            <button
              onClick={() => setAttendanceOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--color-line-strong)] px-2.5 py-1.5 text-[12px] font-semibold text-[var(--color-ink-muted)]"
            >
              <Icon name="group" size={15} />
              <Num>{session.attendeeIds.length}</Num>
            </button>
          </div>

          <div className="mt-2.5">
            <Meter percent={progress} tone="primary" />
          </div>

          <div
            className={`mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 ${
              quorum.met
                ? "border-[#10b98155] bg-[var(--color-stable-soft)]"
                : "border-[#f59e0b55] bg-[var(--color-warn-soft)]"
            }`}
          >
            <Icon
              name={quorum.met ? "verified" : "warning"}
              size={16}
              className={`mt-px shrink-0 ${quorum.met ? "text-[#6ee7b7]" : "text-[#fcd34d]"}`}
            />
            <p className={`text-[12px] leading-snug ${quorum.met ? "text-[#6ee7b7]" : "text-[#fcd34d]"}`}>
              {quorum.met ? (
                lang === "he" ? (
                  <>
                    <strong>יש מניין חוקי.</strong> החלטות שיירשמו כעת הן סופיות.
                  </>
                ) : (
                  <>
                    <strong>Quorate.</strong> Decisions recorded now are definitive.
                  </>
                )
              ) : lang === "he" ? (
                <>
                  <strong>אין מניין חוקי.</strong> חסר ייצוג של{" "}
                  {quorum.missing.map((d) => DISCIPLINE_SHORT[d]).join(", ")}. ההחלטות
                  יירשמו כזמניות.
                </>
              ) : (
                <>
                  <strong>Not quorate.</strong> Missing{" "}
                  {quorum.missing.map((d) => DISCIPLINE_SHORT[d]).join(", ")}. Decisions
                  will be recorded as provisional.
                </>
              )}
            </p>
          </div>
        </Card>

        {/* The escalation rule, made visible.

            A loop that passed its target without an answer arrives here on its
            own. That is what makes the 72-hour target a rule rather than an
            aspiration: nobody has to remember to raise it. */}
        {escalated.length > 0 && (
          <div className="mb-4">
            <SectionTitle
              action={
                <span className="text-[11px] text-[var(--color-ink-faint)]">
                  {t("Automatic", "אוטומטי")}
                </span>
              }
            >
              {t("Escalated to this meeting", "הוסלמו לדיון הזה")}
            </SectionTitle>
            <Card className="border-[#f59e0b55] p-3.5">
              <p className="text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
                {lang === "he" ? (
                  <>
                    <Num>{escalated.length}</Num>{" "}
                    {escalated.length === 1 ? "לולאה חרגה" : "לולאות חרגו"} מזמן היעד
                    לתשובה ללא מענה. הן עולות לכאן אוטומטית.
                  </>
                ) : (
                  <>
                    <Num>{escalated.length}</Num>{" "}
                    {escalated.length === 1 ? "loop has" : "loops have"} passed the target
                    turnaround with no answer. They are raised here automatically.
                  </>
                )}
              </p>
              <ul className="mt-2.5 space-y-2">
                {escalated.map((l) => {
                  const p = getPatient(l.patientId);
                  return (
                    <li key={l.id}>
                      <Link
                        href={`/loops/${l.id}`}
                        className="flex items-start gap-2.5 rounded-lg border border-[var(--color-line)] p-2.5 hover:border-[var(--color-line-strong)]"
                      >
                        <Icon name="priority_high" size={16} className="mt-px shrink-0 text-[#fca5a5]" />
                        <div className="min-w-0 flex-1">
                          <p dir="auto" className="text-[13px] leading-snug text-white">{l.request}</p>
                          <p className="mt-0.5 text-[11px] text-[var(--color-ink-faint)]">
                            {p ? <En>{p.name}</En> : "—"} ·{" "}
                            {DISCIPLINE_SHORT[l.toDiscipline]} ·{" "}
                            {t("unanswered", "ללא מענה")}{" "}
                            <Num>{fmtHours(hoursOpen(l))}</Num>
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>
        )}

        <SectionTitle>{t("Agenda", "סדר היום")}</SectionTitle>
        <div className="space-y-3">
          {session.cases.map((c, i) => {
            const patient = getPatient(c.patientId);
            if (!patient) return null;
            const presenter = member(c.presenterId);
            const blocked = c.prerequisites.filter((p) => !p.ready);

            return (
              <Card
                key={c.id}
                className={`overflow-hidden ${c.status === "decided" ? "border-[#10b98144]" : ""}`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/5 text-[12px] font-bold text-[var(--color-ink-muted)]">
                      <Num>{i + 1}</Num>
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/patients/${patient.id}`} className="min-w-0">
                          <p className="truncate text-[15px] font-bold text-white hover:underline">
                            {patient.name}
                          </p>
                          <p className="truncate text-[12px] text-[var(--color-ink-muted)]">
                            {patient.diagnosis}
                          </p>
                        </Link>
                        <Badge
                          tone={
                            c.status === "decided"
                              ? "stable"
                              : c.status === "deferred"
                                ? "warn"
                                : blocked.length
                                  ? "urgent"
                                  : "neutral"
                          }
                        >
                          {c.status === "decided"
                            ? t("Decided", "הוכרע")
                            : c.status === "deferred"
                              ? t("Deferred", "נדחה")
                              : blocked.length
                                ? t("Blocked", "חסום")
                                : t("Ready", "מוכן")}
                        </Badge>
                      </div>

                      <Num className="mt-1.5 block font-mono text-[12px] text-[var(--color-ink-muted)]">
                        {patient.tnm.t} {patient.tnm.n} {patient.tnm.m} · Stage{" "}
                        {patient.tnm.stageGroup} · {patient.tnm.edition}
                      </Num>

                      {c.timesDeferred > 0 && (
                        <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[#fcd34d]">
                          <Icon name="restart_alt" size={12} />
                          {lang === "he" ? (
                            <>
                              נדחה כבר <Num>{c.timesDeferred}</Num>{" "}
                              {c.timesDeferred === 1 ? "פעם" : "פעמים"}
                            </>
                          ) : (
                            <>
                              Deferred <Num>{c.timesDeferred}</Num>{" "}
                              {c.timesDeferred === 1 ? "time" : "times"} before
                            </>
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg bg-white/[0.03] p-3">
                    <Label>{t("Question for the board", "השאלה לדיון")}</Label>
                    <p dir="auto" className="mt-1 text-[13px] leading-relaxed text-white">{c.question}</p>
                    <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[var(--color-ink-faint)]">
                      <Avatar initials={presenter.initials} colour={presenter.colour} size={18} />
                      {lang === "he"
                        ? `מציג/ה: ${presenter.name}`
                        : `Presented by ${presenter.name}`}
                    </p>
                  </div>

                  {/* Prerequisites — each linked to the loop chasing it */}
                  <div className="mt-3">
                    <Label>{t("Needed for discussion", "נדרש לדיון")}</Label>
                    <ul className="mt-1.5 grid gap-1.5">
                      {c.prerequisites.map((p) => {
                        const loop = p.loopId ? loops.find((l) => l.id === p.loopId) : undefined;
                        return (
                          <li key={p.label} className="flex items-center gap-1.5">
                            <Icon
                              name={p.ready ? "check_circle" : "radio_button_unchecked"}
                              size={15}
                              className={
                                p.ready ? "text-[var(--color-stable)]" : "text-[#fcd34d]"
                              }
                            />
                            <span
                              className={`flex-1 text-[12px] ${
                                p.ready
                                  ? "text-[var(--color-ink-muted)]"
                                  : "font-semibold text-[#fcd34d]"
                              }`}
                            >
                              {p.label}
                            </span>
                            {loop && (
                              <Link
                                href={`/loops/${loop.id}`}
                                className="inline-flex items-center gap-1 rounded border border-[var(--color-line-strong)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-primary)]"
                              >
                                <Icon name="sync" size={11} />
                                {t("Loop", "לולאה")}
                              </Link>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {c.status === "decided" && c.decision && (
                    <div className="mt-3 rounded-lg border border-[#10b98144] bg-[var(--color-stable-soft)] p-3">
                      <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#6ee7b7]">
                        <Icon name="gavel" size={14} />
                        {t("Decision", "החלטה")} · {INTENT_LABEL[c.decision.intent]}
                      </p>
                      <p dir="auto" className="mt-1.5 text-[13px] font-semibold leading-relaxed text-white">
                        {c.decision.recommendation}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {c.decision.modalities.map((mod) => (
                          <span
                            key={mod}
                            className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-[11px] font-semibold text-white"
                          >
                            {MODALITY_LABEL[mod]}
                          </span>
                        ))}
                      </div>
                      {c.decision.rationale && (
                        <p dir="auto" className="mt-2 text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
                          {c.decision.rationale}
                        </p>
                      )}
                      {c.decision.dissent && (
                        <p className="mt-2 rounded border border-[#f59e0b55] bg-[var(--color-warn-soft)] px-2 py-1.5 text-[12px] text-[#fcd34d]">
                          {t("Dissenting view:", "דעת מיעוט:")} {c.decision.dissent}
                        </p>
                      )}
                      <p className="mt-2 border-t border-white/10 pt-2 text-[11px] text-[var(--color-ink-faint)]">
                        <Num>{fmtDateTime(c.decision.decidedAt)}</Num> ·{" "}
                        <En>{member(c.decision.decidedBy).name}</En> ·{" "}
                        {c.decision.quorumMet
                          ? t("Quorate", "מניין חוקי")
                          : t("Not quorate — provisional", "ללא מניין חוקי — זמנית")}
                      </p>
                    </div>
                  )}

                  {c.status === "deferred" && (
                    <div className="mt-3">
                      <Callout tone="warn" icon="schedule">
                        <strong>{t("Deferred.", "נדחה.")}</strong> {c.deferReason}
                      </Callout>
                    </div>
                  )}

                  {c.status === "pending" && (
                    <>
                      <div className="mt-3 flex gap-2">
                        <Button
                          variant="primary"
                          icon="gavel"
                          className="flex-1"
                          disabled={blocked.length > 0}
                          onClick={() => setDecidingCase(c)}
                        >
                          {t("Record decision", "רישום החלטה")}
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() =>
                            deferCase(
                              session.id,
                              c.id,
                              blocked.length
                                ? lang === "he"
                                  ? `בהמתנה ל־${blocked.map((b) => b.label).join(" ול־")}.`
                                  : `Waiting on ${blocked.map((b) => b.label).join(" and ")}.`
                                : t(
                                    "Deferred to the next meeting.",
                                    "נדחה לדיון הבא.",
                                  ),
                            )
                          }
                        >
                          {t("Defer", "דחייה")}
                        </Button>
                      </div>

                      {blocked.length > 0 && (
                        <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-[#fcd34d]">
                          <Icon name="block" size={13} className="mt-px shrink-0" />
                          <span>
                            {lang === "he" ? (
                              <>
                                לא ניתן להכריע —{" "}
                                <En>{blocked.map((b) => b.label).join(", ")}</En> עדיין
                                חסרים. זו בדיוק הדחייה שסגירת לולאות לפני הדיון נועדה
                                למנוע.
                              </>
                            ) : (
                              <>
                                Cannot be decided — {blocked.map((b) => b.label).join(", ")} still
                                outstanding. This is exactly the deferral that closing loops before
                                the meeting is meant to prevent.
                              </>
                            )}
                          </span>
                        </p>
                      )}
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
        {session.status !== "complete" && (
          <Card className="mt-4 p-4">
            <p className="text-[14px] font-bold text-white">{t("List a patient for this meeting", "שיבוץ מטופל לישיבה")}</p>
            <p className="mt-1 text-[12px] text-[var(--color-ink-muted)]">
              {t(
                "Every loop still open on the patient becomes a prerequisite of the case.",
                "כל לולאה שעדיין פתוחה אצל המטופל הופכת לתנאי מקדים של המקרה.",
              )}
            </p>
            <Select className="mt-3" value={addPatient} onChange={(e) => setAddPatient(e.target.value)} aria-label={t("Patient", "מטופל")}>
              <option value="">{t("Choose a patient", "בחירת מטופל")}</option>
              {patients
                .filter((p) => !session.cases.some((c) => c.patientId === p.id) && !p.treatmentStartDate)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.diagnosis}
                  </option>
                ))}
            </Select>
            <Textarea
              className="mt-2"
              rows={2}
              value={addQuestion}
              onChange={(e) => setAddQuestion(e.target.value)}
              placeholder={t("The explicit clinical question for the board", "השאלה הקלינית המפורשת לוועדה")}
            />
            <Button
              icon="add"
              className="mt-3 w-full"
              disabled={!addPatient || addQuestion.trim().length < 5}
              onClick={() => {
                listCase(session.id, addPatient, addQuestion.trim());
                setAddPatient("");
                setAddQuestion("");
              }}
            >
              {t("Add to the agenda", "הוספה לסדר היום")}
            </Button>
          </Card>
        )}
      </Screen>

      {/* Attendance */}
      <Sheet
        open={attendanceOpen}
        onClose={() => setAttendanceOpen(false)}
        title={t("Attendance", "נוכחות")}
      >
        <p className="mb-3 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
          {t(
            "A decision counts only if every core discipline was represented. Mark who is actually in the room.",
            "החלטה תקפה רק אם כל דיסציפלינת ליבה הייתה מיוצגת. סמנו מי נמצא בפועל בחדר.",
          )}
        </p>
        <div className="space-y-1.5">
          {team.map((m) => {
            const present = session.attendeeIds.includes(m.id);
            const required = session.requiredDisciplines.includes(m.discipline);
            return (
              <button
                key={m.id}
                onClick={() => toggleAttendance(session.id, m.id)}
                className={`flex w-full items-center gap-3 rounded-lg border p-2.5 text-start transition-colors ${
                  present
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                    : "border-[var(--color-line)] bg-[var(--color-surface-2)]"
                }`}
              >
                <Avatar initials={m.initials} colour={m.colour} size={34} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-white">
                    {m.name}
                  </span>
                  <span className="block truncate text-[11px] text-[var(--color-ink-muted)]">
                    {m.role}
                    {required && ` · ${t("core", "ליבה")}`}
                  </span>
                </span>
                <Icon
                  name={present ? "check_circle" : "radio_button_unchecked"}
                  size={20}
                  className={present ? "text-[var(--color-primary)]" : "text-[var(--color-ink-faint)]"}
                />
              </button>
            );
          })}
        </div>
      </Sheet>

      {decidingCase && (
        <DecisionSheet
          entry={decidingCase}
          quorumMet={quorum.met}
          onClose={() => setDecidingCase(null)}
          onSubmit={(decision) => {
            recordDecision(session.id, decidingCase.id, decision);
            setDecidingCase(null);
          }}
          patientName={getPatient(decidingCase.patientId)?.name ?? ""}
          decidedBy={currentUser.id}
        />
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */

function DecisionSheet({
  entry,
  patientName,
  quorumMet,
  decidedBy,
  onClose,
  onSubmit,
}: {
  entry: MdtCaseEntry;
  patientName: string;
  quorumMet: boolean;
  decidedBy: string;
  onClose: () => void;
  onSubmit: (d: MdtDecision) => void;
}) {
  const { lang, t } = useLang();
  const [intent, setIntent] = useState<MdtDecision["intent"]>("curative");
  const [modalities, setModalities] = useState<TreatmentModality[]>([]);
  const [recommendation, setRecommendation] = useState("");
  const [rationale, setRationale] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [dissent, setDissent] = useState("");

  const valid = recommendation.trim().length > 8 && modalities.length > 0;

  return (
    <Sheet
      open
      onClose={onClose}
      title={lang === "he" ? `החלטה — ${patientName}` : `Decision — ${patientName}`}
    >
      <div className="space-y-4">
        <div className="rounded-lg bg-white/[0.03] p-3">
          <Label>{t("The question", "השאלה")}</Label>
          <p dir="auto" className="mt-1 text-[13px] leading-relaxed text-white">{entry.question}</p>
        </div>

        {!quorumMet && (
          <Callout tone="warn" icon="warning">
            {lang === "he" ? (
              <>
                למועצה אין מניין חוקי. ההחלטה הזאת תירשם כ<strong>זמנית</strong> ותצטרך
                אשרור בדיון הבא שבו יתקיים מניין חוקי.
              </>
            ) : (
              <>
                The board is not quorate. This decision will be recorded as{" "}
                <strong>provisional</strong> and will need ratifying at the next quorate
                meeting.
              </>
            )}
          </Callout>
        )}

        <div>
          <Label>{t("Treatment intent", "כוונת הטיפול")}</Label>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            {(["curative", "palliative", "diagnostic"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setIntent(v)}
                className={`min-h-11 rounded-lg border px-1 text-[12px] font-semibold transition-colors ${
                  intent === v
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-white"
                    : "border-[var(--color-line-strong)] text-[var(--color-ink-muted)]"
                }`}
              >
                {INTENT_LABEL[v]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>{t("Modalities", "אופני טיפול")}</Label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {MODALITIES.map((mod) => {
              const on = modalities.includes(mod);
              return (
                <button
                  key={mod}
                  onClick={() =>
                    setModalities((prev) =>
                      on ? prev.filter((x) => x !== mod) : [...prev, mod],
                    )
                  }
                  className={`min-h-9 rounded-full border px-3 text-[12px] font-semibold transition-colors ${
                    on
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                      : "border-[var(--color-line-strong)] text-[var(--color-ink-muted)]"
                  }`}
                >
                  {MODALITY_LABEL[mod]}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <Label>{t("Recommendation", "המלצה")}</Label>
          <Textarea
            className="mt-1.5"
            rows={3}
            value={recommendation}
            onChange={(e) => setRecommendation(e.target.value)}
            placeholder={t(
              "What is recommended, worded so it can go straight into the letter.",
              "מה מומלץ, מנוסח כך שיוכל לעבור ישירות למכתב.",
            )}
          />
        </div>

        <div>
          <Label>{t("Rationale", "נימוק")}</Label>
          <Textarea
            className="mt-1.5"
            rows={3}
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            placeholder={t(
              "Why this option and not the others — the reasoning a future reader will need.",
              "מדוע דווקא האפשרות הזאת ולא האחרות — ההנמקה שקורא עתידי יזדקק לה.",
            )}
          />
        </div>

        <div>
          <Label>{t("Follow-up action", "פעולת המשך")}</Label>
          <Textarea
            className="mt-1.5"
            rows={2}
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
            placeholder={t(
              "Opens as a new loop that has to be closed.",
              "נפתחת כלולאה חדשה שחייבים לסגור.",
            )}
          />
        </div>

        <div>
          <Label>{t("Dissenting view (optional)", "דעת מיעוט (רשות)")}</Label>
          <Textarea
            className="mt-1.5"
            rows={2}
            value={dissent}
            onChange={(e) => setDissent(e.target.value)}
            placeholder={t(
              "If anyone disagreed, record it here rather than losing it.",
              "אם מישהו חלק על ההחלטה, כדאי לרשום זאת כאן במקום לאבד את זה.",
            )}
          />
        </div>

        <Button
          className="w-full"
          icon="gavel"
          disabled={!valid}
          onClick={() =>
            onSubmit({
              intent,
              modalities,
              recommendation: recommendation.trim(),
              rationale: rationale.trim(),
              quorumMet,
              decidedAt: new Date().toISOString(),
              decidedBy,
              dissent: dissent.trim() || undefined,
              followUp: followUp.trim() || undefined,
            })
          }
        >
          {t("Record the decision", "רישום ההחלטה")}
        </Button>

        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-[var(--color-ink-faint)]">
          <Icon name="info" size={13} className="mt-px shrink-0" />
          {t(
            "Recording writes the decision to the patient’s timeline and opens a loop for the follow-up — the three points at which a paper-based board loses things.",
            "הרישום כותב את ההחלטה לציר הזמן של המטופל ופותח לולאה למעקב — שלוש הנקודות שבהן מועצה המתנהלת על נייר מאבדת דברים.",
          )}
        </p>
      </div>
    </Sheet>
  );
}
