"use client";

import Link from "next/link";
import { LOOP_KIND_ICON, URGENCY_TONE, relativeTime, shortName } from "@/lib/format";
import { fmtHours, hoursOpen, isBreached, slaProgress } from "@/lib/metrics";
import {
  DISCIPLINE_LABEL,
  LOOP_KIND_LABEL,
  LOOP_SLA_HOURS,
  URGENCY_LABEL,
  loopState,
  type Loop,
  type LoopState,
  type Patient,
  type Tone,
} from "@/lib/types";
import { member } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import { Badge, Icon, Meter, Num } from "./ui";

/**
 * The four stages of a loop, shown as a chain.
 *
 * The fourth link — closure — is the one that breaks in practice. Rendering it
 * as an explicit stage turns "answered but not closed" from an invisible state
 * into one that looks back at you from the screen.
 */
export function LoopChain({ loop, compact = false }: { loop: Loop; compact?: boolean }) {
  const { t } = useLang();
  const state = loopState(loop);
  const order: LoopState[] = ["open", "acknowledged", "answered", "closed"];
  const reached = order.indexOf(state);

  const steps = [
    { key: "open", label: t("Opened", "נפתחה"), icon: "outgoing_mail" },
    { key: "acknowledged", label: t("Acknowledged", "נקלטה"), icon: "mark_email_read" },
    { key: "answered", label: t("Answered", "נענתה"), icon: "reply" },
    { key: "closed", label: t("Closed", "נסגרה"), icon: "task_alt" },
  ];

  return (
    <div className="flex items-start gap-1">
      {steps.map((s, i) => {
        const done = i <= reached;
        const isCurrent = i === reached;
        return (
          <div key={s.key} className="flex flex-1 items-start gap-1">
            <div className="flex flex-col items-center gap-1">
              <span
                className={`grid place-items-center rounded-full border transition-colors ${
                  done
                    ? i === 3
                      ? "border-[var(--color-stable)] bg-[var(--color-stable)] text-[#052e21]"
                      : "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                    : "border-[var(--color-line-strong)] bg-[var(--color-surface-2)] text-[var(--color-ink-faint)]"
                } ${isCurrent && i < 3 ? "ring-2 ring-[var(--color-primary)]/30" : ""}`}
                style={{ width: compact ? 22 : 28, height: compact ? 22 : 28 }}
              >
                <Icon name={s.icon} size={compact ? 13 : 16} />
              </span>
              {!compact && (
                <span
                  className={`text-center text-[9px] font-semibold leading-tight ${
                    done ? "text-white" : "text-[var(--color-ink-faint)]"
                  }`}
                >
                  {s.label}
                </span>
              )}
            </div>
            {i < steps.length - 1 && (
              <span
                className={`mt-3.5 h-px flex-1 ${
                  i < reached ? "bg-[var(--color-primary)]" : "bg-[var(--color-line-strong)]"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function LoopCard({ loop, patient }: { loop: Loop; patient?: Patient }) {
  const { lang, t } = useLang();
  const state = loopState(loop);
  const breached = isBreached(loop);
  const hrs = hoursOpen(loop);
  const sla = LOOP_SLA_HOURS[loop.urgency];

  // "Answered but not closed" is marked in violet rather than red: it is not
  // late, it is a loop that everyone involved believes is finished. That is
  // precisely the failure that is hard to see.
  const tone: Tone = loop.closedAt
    ? "stable"
    : state === "answered"
      ? "review"
      : breached
        ? "urgent"
        : "neutral";

  const borderClass = loop.closedAt
    ? "border-[var(--color-line)]"
    : state === "answered"
      ? "border-[#a78bfa55]"
      : breached
        ? "border-[#ef444455]"
        : "border-[var(--color-line)]";

  return (
    <Link href={`/loops/${loop.id}`} className="block">
      <article
        className={`rounded-xl border bg-[var(--color-surface)] p-3.5 transition-colors hover:border-[var(--color-primary)]/50 ${borderClass}`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`grid size-10 shrink-0 place-items-center rounded-lg ${
              breached && !loop.closedAt
                ? "bg-[var(--color-urgent-soft)] text-[#fca5a5]"
                : "bg-white/5 text-[var(--color-primary)]"
            }`}
          >
            <Icon name={LOOP_KIND_ICON[loop.kind] ?? "help"} size={21} />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 truncate text-[14px] font-bold text-white">
                {LOOP_KIND_LABEL[loop.kind]}
              </p>
              <Badge tone={tone}>
                {loop.closedAt
                  ? t("Closed", "נסגרה")
                  : state === "answered"
                    ? t("Awaiting closure", "ממתין לסגירה")
                    : state === "acknowledged"
                      ? t("Awaiting answer", "ממתין לתשובה")
                      : t("Not acknowledged", "טרם נקלטה")}
              </Badge>
            </div>

            <p className="mt-0.5 truncate text-[12px] text-[var(--color-ink-muted)]">
              {patient ? shortName(patient.name) : "—"} → {DISCIPLINE_LABEL[loop.toDiscipline]}
            </p>

            {/* Routing to a discipline means several people can see the same
                request. Naming whoever acknowledged it is what stops two of
                them answering it separately — the point of acknowledgement is
                to claim the request, so the claim has to be visible. */}
            {loop.acknowledgedBy && !loop.closedAt && (
              <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-[var(--color-ink-faint)]">
                <Icon name="how_to_reg" size={13} className="text-[var(--color-primary)]" />
                {lang === "he"
                  ? `נלקחה על ידי ${shortName(member(loop.acknowledgedBy).name)}`
                  : `Taken by ${shortName(member(loop.acknowledgedBy).name)}`}
              </p>
            )}

            <p dir="auto" className="mt-2 line-clamp-2 text-[13px] leading-snug text-white">
              {loop.request}
            </p>

            {!loop.closedAt && (
              <div className="mt-2.5">
                <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
                  <span className={breached ? "font-semibold text-[#fca5a5]" : "text-[var(--color-ink-faint)]"}>
                    {t("Open", "פתוחה")} <Num>{fmtHours(hrs)}</Num>
                  </span>
                  <span className="text-[var(--color-ink-faint)]">
                    {t("Target", "יעד")} <Num>{sla}</Num>
                    {t("h", " שע׳")} · {URGENCY_LABEL[loop.urgency]}
                  </span>
                </div>
                <Meter
                  percent={slaProgress(loop)}
                  tone={
                    breached
                      ? "urgent"
                      : URGENCY_TONE[loop.urgency] === "neutral"
                        ? "primary"
                        : URGENCY_TONE[loop.urgency]
                  }
                  height={4}
                />
              </div>
            )}

            {loop.closedAt && (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[#6ee7b7]">
                <Icon name="task_alt" size={13} />
                {lang === "he" ? (
                  <>
                    נסגרה <Num>{fmtHours(hrs)}</Num> אחרי הפתיחה
                  </>
                ) : (
                  <>
                    Closed <Num>{fmtHours(hrs)}</Num> after opening
                  </>
                )}
              </p>
            )}

            {loop.blocksCaseId && !loop.closedAt && (
              <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-[#fcd34d]">
                <Icon name="block" size={13} />
                {t("Blocking an MDT case", "חוסמת מקרה לדיון MDT")}
              </p>
            )}

            <p className="mt-1.5 text-[11px] text-[var(--color-ink-faint)]">
              {relativeTime(loop.events[loop.events.length - 1].at)}
            </p>
          </div>
        </div>
      </article>
    </Link>
  );
}
