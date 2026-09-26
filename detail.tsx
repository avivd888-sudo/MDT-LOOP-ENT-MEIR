"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Screen } from "@/components/shell";
import { AlertStrip } from "@/components/patient";
import { LoopCard } from "@/components/loop";
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
  Num,
  SectionTitle,
  Tabs,
} from "@/components/ui";
import { studyHint } from "@/lib/study-id";
import { PathwayClock } from "@/components/pathway-clock";
import { useLang } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { AdjuvantPathway } from "@/components/pathway";
import { milestoneStatuses } from "@/lib/pathway";
import { member } from "@/lib/data";
import {
  DOC_ICON,
  ECOG_LABEL,
  TIMELINE_ICON,
  daysSince,
  fmtDate,
  fmtDateTime,
  initials,
} from "@/lib/format";
import { loopsForPatient } from "@/lib/metrics";
import {
  DISCIPLINE_LABEL,
  DOC_KIND_LABEL,
  PATHWAY_LABEL,
  SUBSITE_LABEL,
  TIMELINE_LABEL,
} from "@/lib/types";

/**
 * The patient record.
 *
 * The three overlapping "patient details" screens in the original design are
 * consolidated here into one record with tabs. Three diverging versions of the
 * same screen is the fastest way to lose a result in a real environment.
 */
export default function PatientDetail({ id }: { id: string }) {
  const { getPatient, loops } = useStore();
  const { lang, t } = useLang();
  const [tab, setTab] = useState("overview");
  const [historyOpen, setHistoryOpen] = useState(false);

  const patient = getPatient(id);
  const patientLoops = useMemo(() => loopsForPatient(loops, id), [loops, id]);
  const openLoops = patientLoops.filter((l) => !l.closedAt);

  if (!patient) {
    return (
      <>
        <AppHeader title={t("Patient", "מטופל")} back="/patients" />
        <Screen>
          <EmptyState
            icon="person_off"
            title={t("Record not found", "הרשומה לא נמצאה")}
            body={t(
              "This record does not exist in the demonstration dataset.",
              "הרשומה הזאת אינה קיימת במאגר ההדגמה.",
            )}
          />
        </Screen>
      </>
    );
  }

  // The pathway clock stops when the first definitive treatment starts.
  const waiting = daysSince(patient.referralDate, patient.treatmentStartDate);

  // The adjuvant tab appears only for patients in whom postoperative
  // radiotherapy is indicated — an empty pathway tab on every record would be
  // noise, and would suggest the pathway applies when it does not.
  const overdueMilestones = patient.adjuvant?.indicated
    ? milestoneStatuses(patient.adjuvant).filter((m) => m.state === "overdue").length
    : 0;

  const tabs = [
    { id: "overview", label: t("Overview", "סקירה") },
    ...(patient.adjuvant?.indicated
      ? [
          {
            id: "adjuvant",
            label: t("Adjuvant", "טיפול משלים"),
            badge: overdueMilestones || undefined,
          },
        ]
      : []),
    { id: "loops", label: t("Loops", "לולאות"), badge: openLoops.length },
    { id: "timeline", label: t("Timeline", "ציר זמן"), badge: patient.timeline.length },
    { id: "documents", label: t("Documents", "מסמכים"), badge: patient.documents.length },
  ];

  return (
    <>
      <AppHeader
        title={patient.name}
        subtitle={`${patient.age}${patient.sex} · ${PATHWAY_LABEL[patient.status]}`}
        back="/patients"
      />

      <div className="border-b border-[var(--color-line)] px-4">
        <Tabs tabs={tabs} value={tab} onChange={setTab} />
      </div>

      <Screen>
        {/* Identity — visible on every tab */}
        <div className="mb-3 flex items-center gap-3">
          <Avatar
            initials={patient.nationalId ? initials(patient.name) : (patient.siteCode ?? "—")}
            colour={patient.acuity === "urgent" ? "#ef4444" : "#137fec"}
            size={52}
          />
          <div className="min-w-0 flex-1">
            <h2 className={`truncate font-bold text-white ${patient.nationalId ? "text-lg" : "font-mono text-[16px]"}`}>
              {patient.nationalId ? patient.name : <En>{patient.name}</En>}
            </h2>
            {patient.studyId && (
              <p className="text-[12px] text-[var(--color-ink-muted)]">
                {patient.nationalId && (
                  <>
                    <Num className="font-mono font-semibold text-white">{patient.studyId}</Num>
                    {" · "}
                  </>
                )}
                {studyHint(patient, lang)}
              </p>
            )}
            {patient.nationalId ? (
              <p className="text-[11px] text-[var(--color-ink-faint)]">
                <Num className="font-mono">
                  {t("ID", "ת״ז")} {patient.nationalId} · {t("MRN", "מס׳ תיק")} #{patient.mrn}
                </Num>
                {patient.ward && ` · ${patient.ward} ${patient.bed ?? ""}`}
              </p>
            ) : (
              <p className="flex items-center gap-1 text-[11px] text-[var(--color-ink-faint)]">
                <Icon name="lock" size={12} />
                {t(
                  "Coded mode — verify identity in the Clalit record with two identifiers before any clinical act.",
                  "מצב מקודד — לפני כל פעולה קלינית מאמתים זהות ברשומה של כללית בשני פרטים מזהים.",
                )}
              </p>
            )}
          </div>
          <Badge tone={waiting > 60 ? "urgent" : waiting > 30 ? "warn" : "neutral"}>
            {t("Day", "יום")} <Num>{waiting}</Num>
          </Badge>
        </div>

        <div className="mb-3">
          <AlertStrip alerts={patient.alerts} />
        </div>

        {tab === "overview" && (
          <div className="space-y-4">
            <PathwayClock patient={patient} />
            <div className="rounded-xl bg-gradient-to-br from-[#1a7fe8] to-[#0d5aa8] p-4 shadow-lg shadow-[#137fec33]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold text-white">
                <Icon name="category" size={13} />
                {SUBSITE_LABEL[patient.subsite]}
              </span>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-white/70">
                {t("Primary diagnosis", "אבחנה ראשית")}
              </p>
              <h3 className="text-[21px] font-extrabold leading-tight text-white">
                {patient.diagnosis}
              </h3>
              <p className="mt-0.5 text-[13px] text-white/80">{patient.histology}</p>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/20 pt-3">
                <Num className="font-mono text-base font-bold text-white">
                  {patient.tnm.t} {patient.tnm.n} {patient.tnm.m}
                </Num>
                <span className="rounded-md bg-white/20 px-2 py-0.5 text-[13px] font-bold text-white">
                  {t("Stage", "שלב")} <Num>{patient.tnm.stageGroup}</Num>
                </span>
                <span className="rounded border border-white/30 px-1.5 py-px text-[10px] font-semibold text-white/90">
                  <Num>{patient.tnm.edition}</Num>
                </span>
                {patient.tnm.provisional && (
                  <span className="rounded bg-[#f59e0b] px-1.5 py-px text-[10px] font-bold text-black">
                    {t("PROVISIONAL", "זמני")}
                  </span>
                )}
              </div>

              {patient.tnm.p16 && (
                <p className="mt-2 text-[12px] text-white/80">
                  {lang === "he" ? (
                    <>
                      <En>p16</En>{" "}
                      {patient.tnm.p16 === "positive"
                        ? "חיובי"
                        : patient.tnm.p16 === "negative"
                          ? "שלילי"
                          : "טרם נבדק"}
                      {patient.tnm.ene && patient.tnm.ene !== "none"
                        ? patient.tnm.ene === "imaging"
                          ? " · פלישה חוץ-קשרית בהדמיה"
                          : " · פלישה חוץ-קשרית פתולוגית"
                        : " · ללא פלישה חוץ-קשרית"}
                    </>
                  ) : (
                    <>
                      p16 {patient.tnm.p16.replace("-", " ")}
                      {patient.tnm.ene && patient.tnm.ene !== "none"
                        ? ` · ${patient.tnm.ene} extranodal extension`
                        : " · no extranodal extension"}
                    </>
                  )}
                </p>
              )}

              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-white/70">
                {t("Current plan", "התוכנית הנוכחית")}
              </p>
              <p dir="auto" className="text-[14px] font-medium leading-snug text-white">{patient.plan}</p>
            </div>

            {patient.tnm.edition === "AJCC 9" && (
              <Callout tone="primary" icon="fiber_new">
                {lang === "he" ? (
                  <>
                    מדורג לפי{" "}
                    <strong>
                      <En>AJCC</En> מהדורה 9
                    </strong>
                    , שהחליפה את המהדורה השמינית בגידולי אורופרינקס הקשורים ל־
                    <En>HPV</En> ובגידולי בלוטות רוק, לגבי מקרים מ־1 בינואר 2026.{" "}
                    <Link href="/staging" className="font-semibold underline">
                      פתיחת כלי הסטייג׳ינג
                    </Link>
                  </>
                ) : (
                  <>
                    Staged under <strong>AJCC Version 9</strong>, which replaced the 8th
                    edition for HPV-associated oropharyngeal and salivary gland cancers on
                    1 January 2026.{" "}
                    <Link href="/staging" className="font-semibold underline">
                      Open the staging tool
                    </Link>
                  </>
                )}
              </Callout>
            )}

            {openLoops.length > 0 && (
              <Callout
                tone={openLoops.some((l) => l.blocksCaseId) ? "warn" : "primary"}
                icon="sync"
              >
                {lang === "he" ? (
                  <>
                    <strong>
                      <Num>{openLoops.length}</Num>{" "}
                      {openLoops.length === 1 ? "לולאה פתוחה" : "לולאות פתוחות"}
                    </strong>{" "}
                    על המטופל הזה
                    {openLoops.some((l) => l.blocksCaseId) && (
                      <>
                        , חלקן חוסמות את דיון ה־<En>MDT</En>
                      </>
                    )}
                    .{" "}
                    <button onClick={() => setTab("loops")} className="font-semibold underline">
                      הצגה
                    </button>
                  </>
                ) : (
                  <>
                    <strong>
                      <Num>{openLoops.length}</Num> open loop
                      {openLoops.length === 1 ? "" : "s"}
                    </strong>{" "}
                    on this patient
                    {openLoops.some((l) => l.blocksCaseId) && ", some blocking the MDT"}.{" "}
                    <button onClick={() => setTab("loops")} className="font-semibold underline">
                      View
                    </button>
                  </>
                )}
              </Callout>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <Card className="p-3">
                <Label>{t("Next step", "הצעד הבא")}</Label>
                {patient.nextStep ? (
                  <>
                    <p className="mt-1 text-[14px] font-bold text-white">
                      {patient.nextStep.label}
                    </p>
                    <p className="text-[12px] text-[var(--color-ink-muted)]">
                      <Num>{fmtDateTime(patient.nextStep.date)}</Num>
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-[13px] text-[var(--color-ink-muted)]">
                    {t("Nothing scheduled", "לא נקבע דבר")}
                  </p>
                )}
              </Card>

              <Card className="p-3">
                <Label>{t("Performance status", "מצב תפקודי")}</Label>
                <p className="mt-1 text-[14px] font-bold text-white">
                  <Num>ECOG {patient.ecog}</Num>
                </p>
                <p className="text-[11px] leading-tight text-[var(--color-ink-muted)]">
                  {ECOG_LABEL[patient.ecog]}
                </p>
              </Card>
            </div>

            <Card className="overflow-hidden">
              <button
                onClick={() => setHistoryOpen((o) => !o)}
                aria-expanded={historyOpen}
                className="flex w-full items-center gap-3 p-3.5 text-start"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/5 text-[var(--color-ink-muted)]">
                  <Icon name="history_edu" size={20} />
                </span>
                <span className="flex-1 text-[14px] font-bold text-white">
                  {t("Background & comorbidities", "רקע ומחלות רקע")}
                </span>
                <Icon
                  name={historyOpen ? "expand_less" : "expand_more"}
                  size={22}
                  className="text-[var(--color-ink-muted)]"
                />
              </button>
              {historyOpen && (
                <div className="space-y-3 border-t border-[var(--color-line)] p-3.5">
                  <div>
                    <Label>{t("Comorbidities", "מחלות רקע")}</Label>
                    {patient.comorbidities.length ? (
                      <ul className="mt-1 space-y-0.5">
                        {patient.comorbidities.map((c) => (
                          <li key={c} className="text-[13px] text-white">
                            · {c}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-[13px] text-[var(--color-ink-muted)]">
                        {t("None recorded", "לא תועדו")}
                      </p>
                    )}
                  </div>
                  {patient.smokingPackYears !== undefined && (
                    <div>
                      <Label>{t("Smoking", "עישון")}</Label>
                      <p className="mt-1 text-[13px] text-white">
                        {lang === "he" ? (
                          <>
                            <Num>{patient.smokingPackYears}</Num> חפיסות-שנה
                          </>
                        ) : (
                          <>
                            <Num>{patient.smokingPackYears}</Num> pack-years
                          </>
                        )}
                      </p>
                    </div>
                  )}
                  <div>
                    <Label>{t("Referred", "הופנה")}</Label>
                    <p className="mt-1 text-[13px] text-white">
                      {lang === "he" ? (
                        <>
                          {fmtDate(patient.referralDate)} · יום <Num>{waiting}</Num> במסלול
                        </>
                      ) : (
                        <>
                          {fmtDate(patient.referralDate)} · day <Num>{waiting}</Num> of the
                          pathway
                        </>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </Card>

            <div>
              <SectionTitle
                action={
                  <Link href="/team" className="text-[13px] font-semibold text-[var(--color-primary)]">
                    {t("Whole team", "כל הצוות")}
                  </Link>
                }
              >
                {t("Multidisciplinary team", "הצוות הרב-תחומי")}
              </SectionTitle>
              <div className="space-y-2">
                {patient.careTeamIds.map((mid) => {
                  const m = member(mid);
                  return (
                    <Card key={mid} className="flex items-center gap-3 p-3">
                      <Avatar initials={m.initials} colour={m.colour} size={38} online={m.online} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold text-white">{m.name}</p>
                        <p className="truncate text-[12px] text-[var(--color-ink-muted)]">
                          {m.role} · {DISCIPLINE_LABEL[m.discipline]}
                        </p>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {tab === "adjuvant" && patient.adjuvant && (
          <AdjuvantPathway plan={patient.adjuvant} patientId={patient.id} />
        )}

        {tab === "loops" && (
          <div>
            <SectionTitle
              action={
                <Link
                  href="/loops/new"
                  className="text-[13px] font-semibold text-[var(--color-primary)]"
                >
                  {t("New loop", "לולאה חדשה")}
                </Link>
              }
            >
              {t("Loops", "לולאות")}
            </SectionTitle>

            {patientLoops.length === 0 ? (
              <EmptyState
                icon="sync"
                title={t("No loops", "אין לולאות")}
                body={t(
                  "No cross-discipline request has been opened for this patient yet.",
                  "טרם נפתחה בקשה בין-תחומית עבור המטופל הזה.",
                )}
              />
            ) : (
              <div className="space-y-2.5">
                {patientLoops.map((l) => (
                  <LoopCard key={l.id} loop={l} patient={patient} />
                ))}
              </div>
            )}

            <Link href="/loops/new" className="mt-4 block">
              <Button icon="add" variant="secondary" className="w-full">
                {t("Open a new loop", "פתיחת לולאה חדשה")}
              </Button>
            </Link>
          </div>
        )}

        {tab === "timeline" && (
          <div>
            <SectionTitle>{t("Care timeline", "ציר הזמן הטיפולי")}</SectionTitle>
            <ol className="relative space-y-0">
              {[...patient.timeline]
                .sort((a, b) => (a.date < b.date ? 1 : -1))
                .map((e, i, arr) => (
                  <li key={e.id} className="relative flex gap-3 pb-5">
                    {i < arr.length - 1 && (
                      <span className="absolute start-[15px] top-8 h-full w-px bg-[var(--color-line-strong)]" />
                    )}
                    <span
                      className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full border ${
                        e.kind === "complication"
                          ? "border-[#ef444455] bg-[var(--color-urgent-soft)] text-[#fca5a5]"
                          : i === 0
                            ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                            : "border-[var(--color-line-strong)] bg-[var(--color-surface-2)] text-[var(--color-ink-muted)]"
                      }`}
                    >
                      <Icon name={TIMELINE_ICON[e.kind] ?? "circle"} size={16} />
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-faint)]">
                        <Num>{fmtDate(e.date)}</Num>
                        <span className="rounded bg-white/5 px-1.5 py-px normal-case">
                          {TIMELINE_LABEL[e.kind]}
                        </span>
                      </p>
                      <p className="text-[14px] font-bold text-white">{e.title}</p>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
                        {e.detail}
                      </p>
                      {e.actor && (
                        <p className="mt-1 text-[11px] text-[var(--color-ink-faint)]">{e.actor}</p>
                      )}
                    </div>
                  </li>
                ))}
            </ol>
          </div>
        )}

        {tab === "documents" && (
          <div>
            <SectionTitle
              action={
                <span className="text-[13px] text-[var(--color-ink-muted)]">
                  {lang === "he" ? (
                    <>
                      <Num>{patient.documents.length}</Num> קבצים
                    </>
                  ) : (
                    <>
                      <Num>{patient.documents.length}</Num> files
                    </>
                  )}
                </span>
              }
            >
              {t("Documents", "מסמכים")}
            </SectionTitle>

            <button className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-line-strong)] py-5 text-[13px] font-semibold text-[var(--color-ink-muted)] hover:border-[var(--color-primary)] hover:text-white">
              <Icon name="upload_file" size={20} />
              {t("Upload document", "העלאת מסמך")}
            </button>

            {patient.documents.length === 0 ? (
              <EmptyState
                icon="folder_open"
                title={t("No documents", "אין מסמכים")}
                body={t(
                  "Nothing has been uploaded to this record.",
                  "דבר לא הועלה לרשומה הזאת.",
                )}
              />
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {patient.documents.map((d) => (
                  <Card key={d.id} className="relative p-3">
                    {d.unread && (
                      <span className="absolute end-2.5 top-2.5 size-2 rounded-full bg-[var(--color-primary)]" />
                    )}
                    <span className="grid size-10 place-items-center rounded-lg bg-white/5 text-[var(--color-primary)]">
                      <Icon name={DOC_ICON[d.kind] ?? "description"} size={22} />
                    </span>
                    <p className="mt-2 text-[13px] font-semibold leading-snug text-white">
                      {d.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--color-ink-faint)]">
                      {DOC_KIND_LABEL[d.kind]} · <Num>{fmtDate(d.date)}</Num>
                    </p>
                    <p className="text-[11px] text-[var(--color-ink-faint)]">
                      <Num>{d.sizeLabel}</Num>
                    </p>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </Screen>
    </>
  );
}
