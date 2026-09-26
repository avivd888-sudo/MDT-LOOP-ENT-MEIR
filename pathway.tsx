"use client";

import Link from "next/link";
import { Badge, Card, Icon, Label, Meter, Num } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import {
  MILESTONES,
  SPORT_TARGET_DAYS,
  milestoneText,
  milestoneStatuses,
  milestonesCompleted,
  packageClock,
  sportClock,
  type AdjuvantPlan,
  type MilestoneStatus,
} from "@/lib/pathway";
import { DISCIPLINE_SHORT } from "@/lib/types";

/**
 * The adjuvant pathway panel.
 *
 * Shows the two clocks that carry survival evidence — surgery to radiotherapy,
 * and the whole treatment package — alongside the five process milestones that
 * predict whether the first clock is met. Every pending milestone offers to
 * open a loop, because a milestone is always somebody else's action.
 */
export function AdjuvantPathway({
  plan,
  patientId,
  loopHref,
}: {
  plan: AdjuvantPlan;
  patientId: string;
  loopHref?: (milestoneId: string) => string;
}) {
  const { lang, t } = useLang();
  if (!plan.indicated) return null;

  const sport = sportClock(plan);
  const pkg = packageClock(plan);
  const statuses = milestoneStatuses(plan);
  const done = milestonesCompleted(plan);

  return (
    <div className="space-y-3">
      {/* ---------- the six-week clock ---------- */}
      {sport && (
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Label>{t("Surgery to radiotherapy", "מניתוח עד הקרנות")}</Label>
              <p className="mt-0.5 text-2xl font-extrabold leading-none text-white">
                <Num>{sport.days}</Num>
                <span className="text-[13px] font-semibold text-[var(--color-ink-muted)]">
                  {" "}
                  {t("of", "מתוך")} <Num>{SPORT_TARGET_DAYS}</Num> {t("days", "ימים")}
                </span>
              </p>
            </div>
            <Badge
              tone={
                sport.state === "breached" ? "urgent" : sport.state === "at-risk" ? "warn" : "stable"
              }
            >
              {sport.started
                ? sport.state === "breached"
                  ? t("Started late", "החל באיחור")
                  : t("Started on time", "החל בזמן")
                : sport.state === "breached"
                  ? t("Past target", "חרג מהיעד")
                  : sport.state === "at-risk"
                    ? t("At risk", "בסיכון")
                    : t("On target", "בתוך היעד")}
            </Badge>
          </div>

          <div className="mt-2.5">
            <Meter
              percent={Math.min(100, sport.percent)}
              tone={
                sport.state === "breached" ? "urgent" : sport.state === "at-risk" ? "warn" : "stable"
              }
              height={8}
            />
          </div>

          <p className="mt-2.5 text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
            {lang === "he" ? (
              <>
                {sport.started ? (
                  <>
                    ההקרנות החלו ב־<Num>{fmtDate(plan.portStartDate!)}</Num>.
                  </>
                ) : (
                  <>
                    נותרו{" "}
                    <strong className="text-white">
                      <Num>{Math.max(0, SPORT_TARGET_DAYS - sport.days)}</Num> ימים
                    </strong>{" "}
                    עד סגירת חלון ששת השבועות שבהנחיות.
                  </>
                )}{" "}
                מעבר לשישה שבועות יחס הסיכונים המתוקנן להישרדות כוללת הוא{" "}
                <Num>1.10–1.13</Num>.
              </>
            ) : (
              <>
                {sport.started ? (
                  <>
                    Radiotherapy began on <Num>{fmtDate(plan.portStartDate!)}</Num>.
                  </>
                ) : (
                  <>
                    <strong className="text-white">
                      <Num>{Math.max(0, SPORT_TARGET_DAYS - sport.days)}</Num> days
                    </strong>{" "}
                    remain before the six-week guideline window closes.
                  </>
                )}{" "}
                Beyond six weeks the adjusted hazard ratio for overall survival is{" "}
                <Num>1.10–1.13</Num>.
              </>
            )}
          </p>
        </Card>
      )}

      {/* ---------- the package clock ---------- */}
      {pkg && (
        <Card className="p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <Label>{t("Treatment package time", "משך חבילת הטיפול")}</Label>
              <p className="mt-0.5 text-[15px] font-bold text-white">
                <Num>{pkg.days}</Num> {t("days", "ימים")}
                <span className="ms-2 text-[12px] font-medium text-[var(--color-ink-muted)]">
                  {(() => {
                    const band = lang === "he" ? pkg.band.labelHe : pkg.band.label;
                    if (pkg.complete) return band;
                    return lang === "he" ? `${band} עד כה` : `${band} so far`;
                  })()}
                </span>
              </p>
            </div>
            {pkg.band.ahr !== null && (
              <span className="shrink-0 rounded-md border border-[#f59e0b55] bg-[var(--color-warn-soft)] px-2 py-1 text-[11px] font-bold text-[#fcd34d]">
                aHR <Num>{pkg.band.ahr.toFixed(2)}</Num>
              </span>
            )}
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--color-ink-faint)]">
            {pkg.complete ? (
              t("Surgery to the last fraction.", "מהניתוח ועד המנה האחרונה.")
            ) : sport && !sport.started ? (
              // Without this the band reads as reassurance. The package cannot
              // land where it currently sits: radiotherapy has not started, and
              // a course runs six to seven weeks once it does.
              lang === "he" ? (
                <>
                  מהניתוח ועד היום, ו<strong className="text-[var(--color-ink-muted)]">עדיין
                  רץ</strong> — ההקרנות טרם החלו, וסדרה מוסיפה עוד שישה עד שבעה שבועות. הטווח
                  שלמטה הוא המקום שבו החבילה עומדת כעת, לא המקום שבו היא תסתיים.
                </>
              ) : (
                <>
                  Surgery to today, and{" "}
                  <strong className="text-[var(--color-ink-muted)]">still running</strong> —
                  radiotherapy has not started, and a course adds a further six to seven weeks.
                  The band below is where the package stands now, not where it will finish.
                </>
              )
            ) : (
              t(
                "Surgery to today — radiotherapy is under way and the package is still running.",
                "מהניתוח ועד היום — ההקרנות בעיצומן והחבילה עדיין רצה.",
              )
            )}{" "}
            {lang === "he" ? (
              <>
                ירידת ההישרדות מדורגת: <Num>1.19</Num> ב־11–12 שבועות, <Num>1.36</Num> ב־13–15,{" "}
                <Num>1.51</Num> ב־16 ומעלה.
              </>
            ) : (
              <>
                Survival decrements are graded: <Num>1.19</Num> at 11–12 weeks, <Num>1.36</Num> at
                13–15, <Num>1.51</Num> at 16 or more.
              </>
            )}
          </p>
        </Card>
      )}

      {/* ---------- the five milestones ---------- */}
      <Card className="p-4">
        <div className="flex items-baseline justify-between gap-3">
          <Label>{t("Process milestones", "אבני דרך בתהליך")}</Label>
          <span className="text-[12px] font-semibold text-[var(--color-ink-muted)]">
            <Num>{done}</Num> {t("of", "מתוך")} <Num>{MILESTONES.length}</Num>
          </span>
        </div>

        <ul className="mt-2.5 space-y-2.5">
          {statuses.map((s) => (
            <MilestoneRow
              key={s.spec.id}
              status={s}
              href={loopHref?.(s.spec.id)}
              patientId={patientId}
            />
          ))}
        </ul>

        <p className="mt-3 border-t border-[var(--color-line)] pt-3 text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
          {lang === "he" ? (
            <>
              חמשת הצעדים האלה אינם צ׳ק-ליסט מקומי. אלה מדדי התהליך שבודדו בניתוח התיווך של מחקר
              אקראי: מטופלים שהשלימו ארבעה או חמישה החלו הקרנות בזמן ב־
              <strong className="text-white">90%</strong> מהמקרים, לעומת{" "}
              <strong className="text-white">10%</strong> בקרב מי שהשלימו אחד או אף לא אחד.
            </>
          ) : (
            <>
              These five steps are not a local checklist. They are the process measures isolated in
              the mediation analysis of a randomised trial: patients completing four or five
              started radiotherapy on time in <strong className="text-white">90%</strong> of cases,
              against <strong className="text-white">10%</strong> for those completing one or none.
            </>
          )}
        </p>
        <Link
          href="/evidence"
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] italic text-[var(--color-ink-faint)] hover:text-[var(--color-primary)]"
        >
          Graboyes EM, et al. JAMA Otolaryngol Head Neck Surg. 2026.
          <Icon name="open_in_new" size={11} className="not-italic" />
        </Link>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function MilestoneRow({
  status,
  href,
  patientId,
}: {
  status: MilestoneStatus;
  href?: string;
  patientId: string;
}) {
  const { lang, t } = useLang();
  const { spec, state, daysRemaining, record } = status;
  const text = milestoneText(spec);

  const icon =
    state === "done"
      ? "check_circle"
      : state === "overdue"
        ? "error"
        : state === "due"
          ? "radio_button_unchecked"
          : "remove";

  const colour =
    state === "done"
      ? "text-[var(--color-stable)]"
      : state === "overdue"
        ? "text-[var(--color-urgent)]"
        : state === "due"
          ? "text-[#fcd34d]"
          : "text-[var(--color-ink-faint)]";

  return (
    <li className="flex items-start gap-2.5">
      <Icon name={icon} size={17} className={`mt-px shrink-0 ${colour}`} />

      <div className="min-w-0 flex-1">
        <p
          className={`text-[13px] leading-snug ${
            state === "done"
              ? "text-[var(--color-ink-muted)]"
              : state === "overdue"
                ? "font-semibold text-white"
                : "text-white"
          }`}
        >
          {text.label}
        </p>

        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
          <span className="text-[var(--color-ink-faint)]">{DISCIPLINE_SHORT[spec.owner]}</span>

          {state === "done" && record?.doneOn && (
            <span className="text-[var(--color-stable)]">
              <Num>{fmtDate(record.doneOn)}</Num>
            </span>
          )}

          {state === "overdue" && (
            <span className="font-semibold text-[#fca5a5]">
              {lang === "he" ? (
                <>
                  באיחור של <Num>{Math.abs(daysRemaining ?? 0)}</Num> ימים
                </>
              ) : (
                <>
                  <Num>{Math.abs(daysRemaining ?? 0)}</Num> days late
                </>
              )}
            </span>
          )}

          {state === "due" && daysRemaining !== null && (
            <span className="text-[#fcd34d]">
              {lang === "he" ? (
                <>
                  בעוד <Num>{daysRemaining}</Num> ימים
                </>
              ) : (
                <>
                  due in <Num>{daysRemaining}</Num> days
                </>
              )}
            </span>
          )}

          {state === "not-applicable" && (
            <span className="text-[var(--color-ink-faint)]">{t("not yet due", "טרם הגיע מועדו")}</span>
          )}

          {record?.loopId ? (
            <Link
              href={`/loops/${record.loopId}`}
              className="inline-flex items-center gap-1 rounded border border-[var(--color-line-strong)] px-1.5 py-0.5 font-semibold text-[var(--color-primary)]"
            >
              <Icon name="sync" size={11} />
              {t("Loop open", "לולאה פתוחה")}
            </Link>
          ) : (
            (state === "overdue" || state === "due") && (
              <Link
                href={href ?? `/loops/new?patient=${patientId}`}
                className="inline-flex items-center gap-1 rounded border border-[var(--color-line-strong)] px-1.5 py-0.5 font-semibold text-[var(--color-ink-muted)] hover:text-white"
              >
                <Icon name="add" size={11} />
                {t("Open a loop", "פתיחת לולאה")}
              </Link>
            )
          )}
        </div>

        {state === "overdue" && (
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-ink-muted)]">
            {text.detail}
          </p>
        )}
      </div>
    </li>
  );
}
