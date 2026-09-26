"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { DISCIPLINE_LABEL, type Discipline } from "@/lib/types";
import { Button, Card, Field, Icon, Input, Label } from "./ui";

const DISCIPLINES = Object.keys(DISCIPLINE_LABEL) as Discipline[];

const COLOURS = ["#137fec", "#a78bfa", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"];

function initialsOf(name: string): string {
  const parts = name
    .replace(/^(Dr|Prof|Mr|Ms|Mrs)\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

/**
 * Bringing a colleague onto the board.
 *
 * A discipline lead's authority, and the reason it matters: a request can only
 * be routed to somebody the system knows about. Without this, the one person
 * whose answer a case is waiting on — a visiting consultant, a newly rotated
 * registrar — cannot be addressed at all, and the loop that names them is a
 * loop nobody can close.
 *
 * An outside consultant is marked rather than blended in. Someone reading the
 * record months later has to be able to see that an opinion came from another
 * institution.
 */
export function AddColleague() {
  const { currentUser, addTeamMember } = useStore();
  const { lang, t } = useLang();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [discipline, setDiscipline] = useState<Discipline>("surgery");
  const [external, setExternal] = useState(false);
  const [hospital, setHospital] = useState("");

  if (!currentUser.disciplineLead) return null;

  const ready = name.trim().length > 2 && role.trim().length > 2;

  function submit() {
    if (!ready) return;
    addTeamMember({
      id: `u-${Date.now().toString(36)}`,
      name: name.trim(),
      role: role.trim(),
      discipline,
      initials: initialsOf(name),
      colour: COLOURS[Math.floor(Math.random() * COLOURS.length)],
      external,
      hospital: external ? hospital.trim() || undefined : undefined,
    });
    setName("");
    setRole("");
    setHospital("");
    setExternal(false);
    setOpen(false);
  }

  if (!open) {
    return (
      <Button
        variant="secondary"
        icon="person_add"
        className="mt-2 w-full"
        onClick={() => setOpen(true)}
      >
        {t("Add a colleague to the board", "הוספת עמית/ה לצוות")}
      </Button>
    );
  }

  return (
    <Card className="mt-2 p-3.5">
      <div className="flex items-center gap-2">
        <Icon name="person_add" size={17} className="text-[var(--color-primary)]" />
        <Label>{t("Add a colleague", "הוספת עמית/ה")}</Label>
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-ink-muted)]">
        {lang === "he" ? (
          <>
            כמנהל/ת הדיסציפלינה {DISCIPLINE_LABEL[currentUser.discipline]} אפשר לצרף
            מישהו לצוות — כולל יועץ מבית חולים אחר שמסייע במקרה מסוים. השם יופיע
            ברשימת הצוות של כולם.
          </>
        ) : (
          <>
            As lead for {DISCIPLINE_LABEL[currentUser.discipline]} you can bring someone
            onto the board — including a consultant from another hospital helping with a
            case. They appear on everyone&apos;s roster.
          </>
        )}
      </p>

      <div className="mt-3 space-y-3">
        <Field label={t("Name", "שם")}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("Dr. …", "ד״ר …")}
          />
        </Field>
        <Field label={t("Role", "תפקיד")}>
          <Input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder={t("Consultant Neuroradiologist", "נוירורדיולוג/ית בכיר/ה")}
          />
        </Field>
        <Field label={t("Discipline", "דיסציפלינה")}>
          <select
            value={discipline}
            onChange={(e) => setDiscipline(e.target.value as Discipline)}
            className="min-h-11 w-full rounded-xl border border-[var(--color-line-strong)] bg-[var(--color-surface-2)] px-3 text-[14px] text-white"
          >
            {DISCIPLINES.map((d) => (
              <option key={d} value={d}>
                {DISCIPLINE_LABEL[d]}
              </option>
            ))}
          </select>
        </Field>

        <label className="flex items-center gap-2.5 text-[13px] text-white">
          <input
            type="checkbox"
            checked={external}
            onChange={(e) => setExternal(e.target.checked)}
            className="size-4 accent-[var(--color-primary)]"
          />
          {t("From another hospital", "מבית חולים אחר")}
        </label>

        {external && (
          <Field label={t("Hospital", "בית חולים")}>
            <Input
              value={hospital}
              onChange={(e) => setHospital(e.target.value)}
              placeholder={t("Where they practise", "היכן הוא עובד")}
            />
          </Field>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <Button icon="person_add" disabled={!ready} onClick={submit} className="flex-1">
          {t("Add", "הוספה")}
        </Button>
        <Button variant="secondary" onClick={() => setOpen(false)}>
          {t("Cancel", "ביטול")}
        </Button>
      </div>
    </Card>
  );
}
