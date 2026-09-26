"use client";

import { BETA_DISCIPLINES, EDITION, ON_DEMAND_DISCIPLINES } from "@/lib/edition";
import { DISCIPLINE_ICON } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { DISCIPLINE_LABEL, type Discipline } from "@/lib/types";
import { Badge, Card, En, Icon, Label } from "./ui";

/**
 * What this beta is configured for.
 *
 * The question a panel asks about any departmental tool is "who is actually in
 * it?" — and the answer has to be six names, not a promise. This card is that
 * answer: the disciplines the Meir beta is standing up with, each with the
 * colleague covering it, and each marked when nobody is on the roster yet.
 *
 * It shows a gap rather than hiding one. A discipline with no member is not a
 * blank space here; it says so, because that is the thing the department has to
 * fix before the pilot starts and the card is where they will see it.
 */
export function BetaScope() {
  const { team } = useStore();
  const { lang, t } = useLang();

  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between gap-3">
        <Label>{t("This beta is configured for", "הבטא מוגדרת לדיסציפלינות")}</Label>
        <Badge tone="primary">
          <En>{EDITION.stage}</En>
        </Badge>
      </div>

      <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
        {lang === "he" ? (
          <>
            מחלקת {EDITION.department.he}, {EDITION.site.he}. אלה הדיסציפלינות שמטופל
            ראש-צוואר ממתין להן בפועל — לא כל הרשימה שהמודל תומך בה.
          </>
        ) : (
          <>
            {EDITION.department.en}, {EDITION.site.en}. These are the disciplines a head
            and neck patient actually waits on — not the whole list the model supports.
          </>
        )}
      </p>

      <ul className="mt-3 space-y-2">
        {(BETA_DISCIPLINES as readonly Discipline[]).map((d) => {
          const members = team.filter((m) => m.discipline === d);
          const lead = members.find((m) => m.disciplineLead);
          return (
            <li key={d} className="flex items-center gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/5 text-[var(--color-primary)]">
                <Icon name={DISCIPLINE_ICON[d] ?? "help"} size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-white">
                  {DISCIPLINE_LABEL[d]}
                </p>
                <p className="truncate text-[11px] text-[var(--color-ink-faint)]">
                  {lead
                    ? lead.name
                    : members[0]
                      ? members[0].name
                      : t("No one on the roster yet", "אין עדיין איש ברשימה")}
                </p>
              </div>
              {lead && (
                <span className="shrink-0 text-[10px] font-semibold text-[var(--color-ink-faint)]">
                  {t("lead", "מנהל")}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {/* Available, not required — the distinction is clinical. */}
      <div className="mt-3 border-t border-[var(--color-line)] pt-3">
        <Label>{t("Available on demand", "זמינות לפי צורך")}</Label>
        <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-ink-muted)]">
          {(ON_DEMAND_DISCIPLINES as readonly Discipline[])
            .map((d) => DISCIPLINE_LABEL[d])
            .join(" · ")}
        </p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--color-ink-faint)]">
          {lang === "he" ? (
            <>
              גידול בבסיס הגולגולת עם התפשטות תוך-גולגולתית או פרינוירלית אינו ניתן
              לתכנון בלי נוירוכירורגיה, ולעיתים קרובות גם בלי נוירולוגיה — והמקרים
              האלה הם מיעוט. הכללתן במניין החוקי הייתה עוצרת כל ישיבה רגילה בהמתנה
              לשני אנשים שאין להם מה לומר על אותו מטופל.
            </>
          ) : (
            <>
              A skull base tumour with intracranial or perineural extension cannot be
              planned without neurosurgery, and often not without neurology — and those
              cases are a minority. Putting either in the quorum would stall every
              ordinary board waiting for two people with nothing to say about that
              patient.
            </>
          )}
        </p>
      </div>

      <p className="mt-3 border-t border-[var(--color-line)] pt-3 text-[11px] leading-relaxed text-[var(--color-ink-faint)]">
        {lang === "he" ? (
          <>
            <En>{EDITION.product}</En> הוא המוצר; <En>{EDITION.edition}</En> היא המהדורה.
            מחלקה אחרת צריכה להחליף מילה אחת, רשימת צוות וסט דיסציפלינות — מודל הלולאה,
            המדדים ורישום הביקורת אינם יודעים לאיזו התמחות הם רצים.
          </>
        ) : (
          <>
            <En>{EDITION.product}</En> is the product; <En>{EDITION.edition}</En> is the
            edition. Another department swaps one word, one roster and one set of
            disciplines — the loop model, the metrics and the audit trail do not know
            which specialty they are running for.
          </>
        )}
      </p>
    </Card>
  );
}
