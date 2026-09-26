"use client";

import { useState } from "react";
import { Badge, Button, Card, Label, Num, Select, Input } from "./ui";
import { useLang } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { fmtDate } from "@/lib/format";
import { MODALITY_LABEL, type Patient, type TreatmentModality } from "@/lib/types";

const days = (a?: string, b?: string) =>
  a && b ? Math.round((new Date(`${b.slice(0, 10)}T12:00:00Z`).getTime() - new Date(`${a.slice(0, 10)}T12:00:00Z`).getTime()) / 864e5) : null;

const FIRST: TreatmentModality[] = ["surgery", "radiotherapy", "chemoradiotherapy", "systemic"];

/**
 * The study clock for one patient: t = 0 at the malignant pathology report,
 * stopping at the first definitive treatment (protocol v1.1, primary endpoint).
 * Every figure is a difference between two recorded dates — nothing is typed in
 * as a number.
 */
export function PathwayClock({ patient }: { patient: Patient }) {
  const { lang, t } = useLang();
  const { sessions, recordTreatmentStart } = useStore();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [mod, setMod] = useState<TreatmentModality>(patient.plannedModality ?? "surgery");

  if (!patient.pathologyDate) return null;

  const firstBoard = sessions
    .filter((s) => s.cases.some((c) => c.patientId === patient.id))
    .map((s) => s.date)
    .sort()[0];
  const total = days(patient.pathologyDate, patient.treatmentStartDate);
  const running = total === null ? days(patient.pathologyDate, new Date().toISOString()) : null;

  const rows: { k: string; label: string; date?: string; d: number | null }[] = [
    { k: "t0", label: t("Malignant pathology report (t = 0)", "דוח פתולוגיה ממאירה (t = 0)"), date: patient.pathologyDate, d: 0 },
    { k: "mdt", label: t("First tumour board", "ישיבת טומור בורד ראשונה"), date: firstBoard, d: days(patient.pathologyDate, firstBoard) },
    { k: "dec", label: t("Board decision", "החלטת הוועדה"), date: patient.decisionDate, d: days(patient.pathologyDate, patient.decisionDate) },
    { k: "tx", label: t("First definitive treatment", "טיפול מכריע ראשון"), date: patient.treatmentStartDate, d: total },
  ];

  const v = total ?? running ?? 0;
  const tone = v <= 30 ? "stable" : v <= 60 ? "warn" : "urgent";

  return (
    <Card className="p-4" data-testid="pathway-clock">
      <div className="flex items-baseline justify-between gap-3">
        <Label>{t("Study clock — pathology to first treatment", "שעון המחקר — מהפתולוגיה עד הטיפול הראשון")}</Label>
        <Badge tone={tone}>
          {total !== null ? t("Primary endpoint", "תוצא ראשוני") : t("Running", "רץ")}
        </Badge>
      </div>
      <p className="mt-1 text-3xl font-extrabold leading-none text-white">
        <Num>{v}</Num>
        <span className="text-[14px] font-semibold text-[var(--color-ink-muted)]"> {t("days", "ימים")}</span>
      </p>
      <p className="mt-1 text-[11px] text-[var(--color-ink-faint)]">
        {v <= 30
          ? t("Within the 30-day standard.", "בתוך יעד 30 הימים.")
          : v <= 60
            ? t("Past 30 days; not yet in the >60-day tail.", "מעבר ל-30 יום; עדיין לא בזנב של מעל 60.")
            : v <= 67
              ? t("Beyond 60 days (Liao 2019).", "מעבר ל-60 יום (Liao 2019).")
              : t("Beyond 67 days (Murphy 2016).", "מעבר ל-67 יום (Murphy 2016).")}
      </p>

      <ol className="mt-3 space-y-1.5 border-t border-[var(--color-line)] pt-3">
        {rows.map((r) => (
          <li key={r.k} className="flex items-center justify-between gap-3 text-[13px]">
            <span className={r.date ? "text-white" : "text-[var(--color-ink-faint)]"}>{r.label}</span>
            <span className="shrink-0 text-end text-[12px] text-[var(--color-ink-muted)]">
              {r.date ? (
                <>
                  <Num>{fmtDate(r.date)}</Num>
                  {r.k !== "t0" && r.d !== null && (
                    <strong className="ms-2 text-white">
                      <Num>{lang === "he" ? `יום ${r.d}` : `day ${r.d}`}</Num>
                    </strong>
                  )}
                </>
              ) : (
                t("pending", "ממתין")
              )}
            </span>
          </li>
        ))}
      </ol>

      {patient.decisionDate && !patient.treatmentStartDate && (
        <div className="mt-3 space-y-2 border-t border-[var(--color-line)] pt-3">
          <p className="text-[13px] font-semibold text-white">{t("Record the first definitive treatment", "רישום תחילת הטיפול הראשון")}</p>
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} dir="ltr" className="text-start" aria-label={t("Treatment date", "תאריך הטיפול")} />
            <Select value={mod} onChange={(e) => setMod(e.target.value as TreatmentModality)} aria-label={t("Modality", "סוג הטיפול")}>
              {FIRST.map((m) => (
                <option key={m} value={m}>
                  {MODALITY_LABEL[m]}
                </option>
              ))}
            </Select>
          </div>
          <Button icon="task_alt" className="w-full" onClick={() => recordTreatmentStart(patient.id, date, mod)}>
            {t("Record treatment start — stop the clock", "רישום תחילת טיפול — עצירת השעון")}
          </Button>
        </div>
      )}
    </Card>
  );
}
