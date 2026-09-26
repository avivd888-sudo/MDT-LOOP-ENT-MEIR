"use client";

import { useLang } from "@/lib/i18n";
import { Card, Icon } from "./ui";

/**
 * Hebrew or English, as a two-state switch rather than a settings page.
 *
 * The department works in Hebrew and the literature works in English, and the
 * same clinician moves between them within a single case. Burying the choice
 * three screens deep would be treating it as a preference set once; it is
 * closer to a view control, so it sits where the reader is.
 *
 * Both labels are written in their own language. A Hebrew speaker looking for
 * Hebrew should not have to find the word "Hebrew".
 */
export function LanguageToggle() {
  const { lang, setLang } = useLang();

  const options: { id: "he" | "en"; label: string; note: string }[] = [
    { id: "he", label: "עברית", note: "ממשק בעברית" },
    { id: "en", label: "English", note: "Interface in English" },
  ];

  return (
    <Card className="p-1.5">
      <div className="flex gap-1.5">
        {options.map((o) => {
          const active = lang === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => setLang(o.id)}
              aria-pressed={active}
              lang={o.id}
              dir={o.id === "he" ? "rtl" : "ltr"}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[14px] font-semibold transition-colors ${
                active
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-ink-muted)] hover:bg-white/5"
              }`}
            >
              {active && <Icon name="check" size={17} />}
              {o.label}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
