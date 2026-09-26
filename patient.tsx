"use client";

import Link from "next/link";
import { PATHWAY_LABEL, SUBSITE_LABEL, type Patient } from "@/lib/types";
import { STATUS_TONE, daysSince, initials } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { studyHint } from "@/lib/study-id";
import { Avatar, Badge, En, Icon, Num } from "./ui";

/** TNM and stage, with the AJCC edition made explicit. */
export function StageLine({ patient, className = "" }: { patient: Patient; className?: string }) {
  const { t } = useLang();
  const { tnm } = patient;
  return (
    <span className={`inline-flex flex-wrap items-center gap-x-2 gap-y-1 ${className}`}>
      <Num className="font-mono text-[13px] font-semibold text-white">
        {tnm.t} {tnm.n} {tnm.m}
      </Num>
      <span className="text-[13px] text-[var(--color-ink-muted)]">
        {t("Stage", "שלב")} <Num>{tnm.stageGroup}</Num>
      </span>
      <span className="rounded border border-white/10 bg-white/5 px-1.5 py-px text-[10px] font-semibold text-[var(--color-ink-muted)]">
        <Num>{tnm.edition}</Num>
      </span>
      {tnm.provisional && (
        <span className="text-[11px] font-semibold text-[#fcd34d]">
          {t("provisional", "זמני")}
        </span>
      )}
    </span>
  );
}

export function PatientCard({
  patient,
  openLoops = 0,
  blockedLoops = 0,
}: {
  patient: Patient;
  openLoops?: number;
  blockedLoops?: number;
}) {
  const { lang, t } = useLang();
  const urgent = patient.acuity === "urgent";
  // The pathway clock stops when the first definitive treatment starts.
  const waiting = daysSince(patient.referralDate, patient.treatmentStartDate);

  return (
    <Link
      href={`/patients/${patient.id}`}
      className={`block rounded-xl border bg-[var(--color-surface)] p-3.5 transition-colors hover:border-[var(--color-primary)]/50 ${
        urgent ? "border-[#ef444455]" : "border-[var(--color-line)]"
      }`}
    >
      <div className="flex items-start gap-3">
        <Avatar
          initials={patient.nationalId ? initials(patient.name) : (patient.siteCode ?? "—")}
          colour={urgent ? "#ef4444" : "#137fec"}
          size={44}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className={`truncate font-bold text-white ${patient.nationalId ? "text-[15px]" : "font-mono text-[13px]"}`}>
                {patient.nationalId ? patient.name : <En>{patient.name}</En>}{" "}
                <span className="font-medium text-[var(--color-ink-muted)]">
                  <Num>{`(${patient.age}${patient.sex})`}</Num>
                </span>
              </p>
              <p className="mt-0.5 truncate text-[11px] text-[var(--color-ink-faint)]">
                {patient.nationalId && patient.studyId && (
                  <>
                    <Num className="font-mono">{patient.studyId}</Num> ·{" "}
                  </>
                )}
                {patient.studyId ? studyHint(patient, lang) : patient.mrn && <Num className="font-mono">#{patient.mrn}</Num>}
                {patient.ward && ` · ${patient.ward}`}
                {patient.bed && ` ${patient.bed}`}
              </p>
            </div>
            <Badge tone={urgent ? "urgent" : STATUS_TONE[patient.status]}>
              {urgent ? t("Urgent", "דחוף") : PATHWAY_LABEL[patient.status]}
            </Badge>
          </div>

          <p className="mt-2 truncate text-[13px] font-medium text-white">
            {patient.diagnosis}
          </p>
          <StageLine patient={patient} className="mt-1" />

          {patient.alerts.length > 0 && (
            <p className="mt-2 flex items-start gap-1.5 text-[12px] font-semibold text-[#fca5a5]">
              <Icon name="warning" size={15} className="mt-px shrink-0" />
              <span className="min-w-0 truncate">{patient.alerts[0]}</span>
            </p>
          )}

          {/* Open loops are why a patient is stuck — so they belong on the card */}
          {openLoops > 0 && (
            <p
              className={`mt-1.5 flex items-center gap-1.5 text-[12px] ${
                blockedLoops > 0 ? "font-semibold text-[#fcd34d]" : "text-[var(--color-ink-muted)]"
              }`}
            >
              <Icon name="sync" size={14} className="shrink-0" />
              {lang === "he" ? (
                <>
                  <Num>{openLoops}</Num>{" "}
                  {openLoops === 1 ? "לולאה פתוחה" : "לולאות פתוחות"}
                  {blockedLoops > 0 && (
                    <>
                      {" "}
                      · חוסמת דיון <En>MDT</En>
                    </>
                  )}
                </>
              ) : (
                <>
                  <Num>{openLoops}</Num> open loop{openLoops === 1 ? "" : "s"}
                  {blockedLoops > 0 && <> · blocking MDT</>}
                </>
              )}
            </p>
          )}

          <div className="mt-2.5 flex items-center gap-3 border-t border-[var(--color-line)] pt-2 text-[11px] text-[var(--color-ink-faint)]">
            <span className="inline-flex items-center gap-1">
              <Icon name="category" size={13} />
              {SUBSITE_LABEL[patient.subsite]}
            </span>
            <span
              className={`inline-flex items-center gap-1 ${
                waiting > 60 ? "font-semibold text-[#fca5a5]" : waiting > 30 ? "text-[#fcd34d]" : ""
              }`}
              title={t("Days since referral", "ימים מאז ההפניה")}
            >
              <Icon name="schedule" size={13} />
              {t("day", "יום")} <Num>{waiting}</Num>
            </span>
            <span className="inline-flex items-center gap-1">
              <Icon name="monitor_heart" size={13} />
              <Num>ECOG {patient.ecog}</Num>
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/** Red safety strip at the top of the patient record. */
export function AlertStrip({ alerts }: { alerts: string[] }) {
  const { t } = useLang();
  if (alerts.length === 0) return null;
  return (
    <div className="rounded-lg border border-[#ef444455] bg-[var(--color-urgent-soft)] px-3 py-2.5">
      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#fca5a5]">
        <Icon name="emergency" size={15} />
        {t("Safety alerts", "התרעות בטיחות")}
      </p>
      <ul className="space-y-0.5">
        {alerts.map((a) => (
          <li key={a} className="text-[13px] font-semibold leading-snug text-[#fecaca]">
            {a}
          </li>
        ))}
      </ul>
    </div>
  );
}
