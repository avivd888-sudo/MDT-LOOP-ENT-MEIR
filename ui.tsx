"use client";

/**
 * Shared UI primitives.
 *
 * All spacing uses CSS logical properties (ps/pe/ms/me, start/end) rather than
 * left/right. That discipline is why switching the whole application to Hebrew
 * cost one `dir="rtl"` on <html> and no layout edits at all: it was paid for
 * once, in advance, and it paid off completely.
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { useStore } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { ICON_CODEPOINTS } from "@/lib/icon-codepoints";
import type { Tone } from "@/lib/types";

/* -------------------------------------------------------------------------- */
/* Icon                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Glyphs that mean "forward", "back" or "onward" and therefore have to point
 * the other way in Hebrew.
 *
 * An explicit list rather than a rule, because most icons must NOT mirror: a
 * mirrored magnifying glass, clock or signature is simply wrong, not
 * localised. The CSS that does the flip lives in globals.css so it can key off
 * the document direction without every call site knowing about it.
 */
const DIRECTIONAL = new Set([
  "arrow_back",
  "arrow_forward",
  "arrow_back_ios",
  "arrow_forward_ios",
  "chevron_left",
  "chevron_right",
  "chevron_backward",
  "chevron_forward",
  "reply",
  "trending_flat",
  "east",
  "west",
  "logout",
  "login",
  "start",
  "undo",
  "redo",
  "subdirectory_arrow_right",
]);

export function Icon({
  name,
  className = "",
  size = 20,
  filled = false,
}: {
  name: string;
  className?: string;
  size?: number;
  filled?: boolean;
}) {
  // Size is set via font-size only. Constraining width/height clips the wider
  // glyphs in the Material Symbols set, which is what produces the
  // "half a symbol" rendering that looks like a broken font.
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined ${filled ? "filled" : ""} ${
        DIRECTIONAL.has(name) ? "icon-dir" : ""
      } ${className}`}
      style={{ fontSize: size, lineHeight: 1 }}
    >
      {ICON_CODEPOINTS[name] ?? name}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Numerals                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Figures that should line up in a column — counts, durations, stage codes.
 *
 * Tabular numerals keep metric tiles and table rows from shifting as values
 * change. The bidi mode is `plaintext`, not `isolate`, and the difference
 * matters: `isolate` fences the run off but still lays it out in the direction
 * the element inherited, so in Hebrew a TNM expression renders "M0 N1 T3" —
 * every component present, in the wrong order, looking exactly like a data
 * error. `plaintext` takes the direction from the run's own first strong
 * character, which is what these spans actually need: "T3 N1 M0" stays
 * left-to-right, while a Hebrew date inside the same component stays
 * right-to-left.
 */
export function Num({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-block tabular-nums [unicode-bidi:plaintext] ${className}`}>
      {children}
    </span>
  );
}

/**
 * A Latin run inside Hebrew prose — a stage code, an English clinical term, a
 * drug name, an abbreviation like SBAR or FHIR.
 *
 * Without isolation the bidi algorithm resolves the run against its Hebrew
 * neighbours and reorders it: "T2N1M0" comes out "M0N1T2", and a phrase like
 * "MDT Loop" lands with the words swapped. This is the single most common way
 * a right-to-left interface goes quietly wrong, because it looks like a typo
 * rather than a bug.
 */
export function En({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`en ${className}`}>{children}</span>;
}

/* -------------------------------------------------------------------------- */
/* Tone helpers                                                                */
/* -------------------------------------------------------------------------- */

const TONE_CLASS: Record<Tone, string> = {
  urgent: "bg-[var(--color-urgent-soft)] text-[#fca5a5] border-[#ef444455]",
  warn: "bg-[var(--color-warn-soft)] text-[#fcd34d] border-[#f59e0b55]",
  stable: "bg-[var(--color-stable-soft)] text-[#6ee7b7] border-[#10b98155]",
  review: "bg-[var(--color-review-soft)] text-[#c4b5fd] border-[#a78bfa55]",
  primary: "bg-[var(--color-primary-soft)] text-[#7cc0ff] border-[#137fec55]",
  neutral: "bg-white/5 text-[var(--color-ink-muted)] border-white/10",
};

export function Badge({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${TONE_CLASS[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Dot({ tone = "neutral" }: { tone?: Tone }) {
  const map: Record<Tone, string> = {
    urgent: "bg-[var(--color-urgent)]",
    warn: "bg-[var(--color-warn)]",
    stable: "bg-[var(--color-stable)]",
    review: "bg-[var(--color-review)]",
    primary: "bg-[var(--color-primary)]",
    neutral: "bg-white/30",
  };
  return <span className={`inline-block size-1.5 rounded-full ${map[tone]}`} />;
}

/* -------------------------------------------------------------------------- */
/* Surfaces                                                                    */
/* -------------------------------------------------------------------------- */

export function Card({
  children,
  className = "",
  as: As = "div",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <As
      className={`rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] ${className}`}
      {...rest}
    >
      {children}
    </As>
  );
}

export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between gap-3">
      <h2 className="text-[15px] font-bold text-white">{children}</h2>
      {action}
    </div>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
      {children}
    </p>
  );
}

/* -------------------------------------------------------------------------- */
/* Buttons                                                                     */
/* -------------------------------------------------------------------------- */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const BUTTON_CLASS: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] disabled:bg-white/10 disabled:text-white/40",
  secondary:
    "bg-white/[0.06] text-white border border-white/10 hover:bg-white/10 disabled:text-white/30",
  ghost: "text-[var(--color-ink-muted)] hover:bg-white/5 hover:text-white",
  danger: "bg-[var(--color-urgent)] text-white hover:bg-[#dc2626]",
};

export function Button({
  variant = "primary",
  children,
  className = "",
  icon,
  ...rest
}: {
  variant?: ButtonVariant;
  icon?: string;
  children?: ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${BUTTON_CLASS[variant]} ${className}`}
      {...rest}
    >
      {icon && <Icon name={icon} size={18} />}
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Avatar                                                                      */
/* -------------------------------------------------------------------------- */

export function Avatar({
  initials,
  colour,
  size = 40,
  online,
  className = "",
}: {
  initials: string;
  colour: string;
  size?: number;
  online?: boolean;
  className?: string;
}) {
  return (
    <span className={`relative inline-flex shrink-0 ${className}`}>
      <span
        className="inline-flex items-center justify-center rounded-full font-bold text-white"
        style={{
          width: size,
          height: size,
          background: `linear-gradient(140deg, ${colour}, ${colour}99)`,
          fontSize: size * 0.36,
        }}
      >
        {initials}
      </span>
      {online !== undefined && (
        <span
          className={`absolute -bottom-0.5 -end-0.5 size-3 rounded-full border-2 border-[var(--color-surface)] ${
            online ? "bg-[var(--color-stable)]" : "bg-[var(--color-ink-faint)]"
          }`}
        />
      )}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Header                                                                      */
/* -------------------------------------------------------------------------- */

export function AppHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: string;
  subtitle?: string;
  back?: string;
  action?: ReactNode;
}) {
  const { t } = useLang();
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-line)] bg-[var(--color-canvas)]/95 backdrop-blur-md">
      <div className="flex min-h-14 items-center gap-2 px-3">
        {back ? (
          <Link
            href={back}
            aria-label={t("Back", "חזרה")}
            className="-ms-1 grid size-10 place-items-center rounded-full text-white hover:bg-white/5"
          >
            <Icon name="arrow_back" size={22} />
          </Link>
        ) : (
          <span className="w-1" />
        )}
        <div className="min-w-0 flex-1 text-center">
          <h1 className="truncate text-base font-bold text-white">{title}</h1>
          {subtitle && (
            <p className="truncate text-xs text-[var(--color-ink-muted)]">{subtitle}</p>
          )}
        </div>
        <div className="flex min-w-10 items-center justify-end gap-1">{action}</div>
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/* Filter chips                                                                */
/* -------------------------------------------------------------------------- */

export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {children}
    </div>
  );
}

export function Chip({
  active,
  children,
  onClick,
  tone,
  count,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  tone?: Tone;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-colors ${
        active
          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
          : "border-[var(--color-line-strong)] bg-white/[0.03] text-[var(--color-ink-muted)] hover:text-white"
      }`}
    >
      {tone && !active && <Dot tone={tone} />}
      {children}
      {count !== undefined && (
        <span className={active ? "text-white/70" : "text-[var(--color-ink-faint)]"}>
          {count}
        </span>
      )}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Tabs                                                                        */
/* -------------------------------------------------------------------------- */

export function Tabs({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: string; label: string; badge?: number }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div
      role="tablist"
      className="no-scrollbar flex gap-1 overflow-x-auto border-b border-[var(--color-line)]"
    >
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={`relative shrink-0 px-3.5 pb-2.5 pt-2 text-[13px] font-semibold transition-colors ${
              active ? "text-[var(--color-primary)]" : "text-[var(--color-ink-muted)] hover:text-white"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              {t.label}
              {t.badge !== undefined && t.badge > 0 && (
                <span className="rounded-full bg-white/10 px-1.5 text-[10px] font-bold">
                  {t.badge}
                </span>
              )}
            </span>
            {active && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[var(--color-primary)]" />
            )}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Form fields                                                                 */
/* -------------------------------------------------------------------------- */

export function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-white">
        {label}
        {required && <span className="ms-1 text-[var(--color-urgent)]">*</span>}
      </span>
      {children}
      {hint && <span className="text-xs text-[var(--color-ink-faint)]">{hint}</span>}
    </label>
  );
}

const CONTROL =
  "w-full rounded-lg border border-[var(--color-line-strong)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-white placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-primary)] focus:outline-none";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  // dir="auto": clinicians type English clinical text into a Hebrew interface,
  // and without it the punctuation of an English sentence lands at the wrong end.
  return <input dir="auto" {...props} className={`${CONTROL} ${props.className ?? ""}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea dir="auto" {...props} className={`${CONTROL} resize-none ${props.className ?? ""}`} />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`${CONTROL} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="%239dabb9" viewBox="0 0 16 16"><path d="M8 11L3 6h10z"/></svg>')] bg-[right_0.75rem_center] bg-no-repeat pe-9 ${props.className ?? ""}`}
    />
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Icon
        name="search"
        size={20}
        className="pointer-events-none absolute inset-y-0 start-3 my-auto text-[var(--color-ink-faint)]"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-2)] py-3 pe-4 ps-11 text-sm text-white placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-primary)] focus:outline-none"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Feedback                                                                    */
/* -------------------------------------------------------------------------- */

export function EmptyState({
  icon,
  title,
  body,
}: {
  icon: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-white/5 text-[var(--color-ink-faint)]">
        <Icon name={icon} size={28} />
      </div>
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="max-w-xs text-[13px] leading-relaxed text-[var(--color-ink-muted)]">{body}</p>
    </div>
  );
}

/**
 * Non-negotiable on any clinical prototype: say loudly that it is not real.
 *
 * And in live mode, say the opposite just as loudly — because the failure
 * there is the mirror image. A clinician who believes a real board is a
 * demonstration will type carelessly into it.
 */
export function DemoBanner({ className = "" }: { className?: string }) {
  const { mode } = useStore();
  if (mode === "live") return <LiveBanner className={className} />;
  return <DemonstrationBanner className={className} />;
}

/** The live-mode strip: blue, not amber — this is a state, not a warning. */
export function LiveBanner({ className = "" }: { className?: string }) {
  const { lang } = useLang();
  return (
    <div
      className={`flex items-start gap-2 rounded-lg border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 px-3 py-2 ${className}`}
    >
      <Icon name="lock" size={16} className="mt-px shrink-0 text-[var(--color-primary)]" />
      <p className="text-[11px] leading-relaxed text-[var(--color-primary)]">
        {lang === "he" ? (
          <>
            <strong>מצב שימוש.</strong> מספרי מחקר מקודדים בלבד — בלי שם, ת״ז או מספר תיק,
            גם לא בטקסט חופשי. הלוח נשמר בדפדפן הזה בלבד; הרשומה היא גיליון האיסוף.
          </>
        ) : (
          <>
            <strong>Live use.</strong> Coded study IDs only — no name, national ID or record
            number, free text included. The board is kept in this browser alone; the record
            is the data-collection workbook.
          </>
        )}
      </p>
    </div>
  );
}

function DemonstrationBanner({ className = "" }: { className?: string }) {
  const { lang } = useLang();
  return (
    <div
      className={`flex items-start gap-2 rounded-lg border border-[#f59e0b55] bg-[var(--color-warn-soft)] px-3 py-2 ${className}`}
    >
      <Icon name="warning" size={16} className="mt-px shrink-0 text-[#fcd34d]" />
      <p className="text-[11px] leading-relaxed text-[#fcd34d]">
        {lang === "he" ? (
          <>
            <strong>גרסת הדגמה.</strong> כל מטופל, תוצאה והודעה כאן מומצאים. לא
            לשימוש קליני ולא מחובר לשום מערכת בית-חולים.
          </>
        ) : (
          <>
            <strong>Demonstration build.</strong> Every patient, result and message
            is fabricated. Not for clinical use and not connected to any hospital
            system.
          </>
        )}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Data display                                                                */
/* -------------------------------------------------------------------------- */

export function StatTile({
  value,
  label,
  icon,
  tone = "neutral",
  hint,
}: {
  value: ReactNode;
  label: string;
  icon?: string;
  tone?: Tone;
  hint?: string;
}) {
  const colour: Record<Tone, string> = {
    urgent: "text-[#fca5a5]",
    warn: "text-[#fcd34d]",
    stable: "text-[#6ee7b7]",
    review: "text-[#c4b5fd]",
    primary: "text-[#7cc0ff]",
    neutral: "text-white",
  };
  return (
    <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2.5">
      <p className={`text-[22px] font-extrabold leading-none ${colour[tone]}`}>
        <Num>{value}</Num>
      </p>
      <p className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-[var(--color-ink-faint)]">
        {icon && <Icon name={icon} size={12} />}
        {label}
      </p>
      {hint && <p className="mt-0.5 text-[10px] text-[var(--color-ink-faint)]">{hint}</p>}
    </div>
  );
}

/** Horizontal progress/meter. `over` renders the portion past 100% in red. */
export function Meter({
  percent,
  tone = "primary",
  height = 6,
}: {
  percent: number;
  tone?: Tone;
  height?: number;
}) {
  const bg: Record<Tone, string> = {
    urgent: "bg-[var(--color-urgent)]",
    warn: "bg-[var(--color-warn)]",
    stable: "bg-[var(--color-stable)]",
    review: "bg-[var(--color-review)]",
    primary: "bg-[var(--color-primary)]",
    neutral: "bg-white/40",
  };
  return (
    <div
      className="w-full overflow-hidden rounded-full bg-white/10"
      style={{ height }}
      role="presentation"
    >
      <div
        className={`h-full rounded-full transition-all ${bg[tone]}`}
        style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
      />
    </div>
  );
}

/** Horizontal bar chart row — used across the metrics screen for consistency. */
export function BarRow({
  label,
  value,
  max,
  display,
  tone = "primary",
  sublabel,
}: {
  label: string;
  value: number;
  max: number;
  display: string;
  tone?: Tone;
  sublabel?: string;
}) {
  return (
    <div className="py-1.5">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <span className="truncate text-[13px] text-white">{label}</span>
        <span className="shrink-0 text-[12px] font-semibold text-[var(--color-ink-muted)]">
          <Num>{display}</Num>
        </span>
      </div>
      <Meter percent={max ? (value / max) * 100 : 0} tone={tone} />
      {sublabel && (
        <p className="mt-1 text-[11px] text-[var(--color-ink-faint)]">{sublabel}</p>
      )}
    </div>
  );
}

export function Callout({
  tone = "neutral",
  icon,
  children,
  className = "",
}: {
  tone?: Tone;
  icon: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 ${TONE_CLASS[tone]} ${className}`}
    >
      <Icon name={icon} size={18} className="mt-px shrink-0" />
      <div className="min-w-0 text-[13px] leading-relaxed">{children}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sheet (bottom modal)                                                        */
/* -------------------------------------------------------------------------- */

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const { t } = useLang();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-slide-up relative max-h-[88vh] w-full max-w-[440px] overflow-y-auto rounded-t-2xl border border-[var(--color-line)] bg-[var(--color-surface)] pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3">
          <h2 className="text-[15px] font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            aria-label={t("Close", "סגירה")}
            className="grid size-9 place-items-center rounded-full text-[var(--color-ink-muted)] hover:bg-white/5"
          >
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="px-4 py-4">{children}</div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Floating action button                                                      */
/* -------------------------------------------------------------------------- */

export function Fab({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] end-4 z-30 grid size-14 place-items-center rounded-full bg-[var(--color-primary)] text-white shadow-lg shadow-[#137fec66] transition-transform hover:scale-105 md:absolute"
    >
      <Icon name={icon} size={26} />
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* Brand                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The mark: a lemniscate — the loop that closes and keeps going.
 *
 * Drawn rather than set as a glyph, because ∞ in a text font sits on the
 * baseline at whatever weight the font decides, and this has to line up
 * optically with a heavy wordmark at any size.
 */
export function InfinityMark({
  size = 34,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="9.5 6 45 20"
      width={size}
      height={(size * 20) / 45}
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M32 16C32 6 12 6 12 16C12 26 32 26 32 16C32 6 52 6 52 16C52 26 32 26 32 16Z"
        stroke="currentColor"
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The wordmark. `MDT Loop` is the product; the specialty sits underneath as an
 * edition badge, because the mechanism is not specific to head and neck work.
 * Swap `edition` and the same build serves another department's MDT.
 */
export function Wordmark({
  size = "lg",
  edition = "ENT",
  mark = true,
}: {
  size?: "sm" | "lg";
  edition?: string;
  /** Off where the mark already appears beside it, as on the gate badge. */
  mark?: boolean;
}) {
  const big = size === "lg";
  return (
    <div className="inline-flex items-start gap-2.5">
      {mark && (
        <InfinityMark
          size={big ? 40 : 25}
          className={`text-[var(--color-primary)] ${big ? "mt-[6px]" : "mt-[3px]"}`}
        />
      )}
      <div className="leading-none">
        <div
          className={`font-extrabold tracking-tight text-white ${big ? "text-[30px]" : "text-[17px]"}`}
        >
          MDT Loop
        </div>
        <div
          className={`mt-1 text-center font-bold uppercase text-[var(--color-primary)] ${
            big ? "text-[12px] tracking-[0.32em]" : "text-[9px] tracking-[0.28em]"
          }`}
        >
          {edition}
        </div>
      </div>
    </div>
  );
}
