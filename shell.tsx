"use client";

import { SyncBadge } from "./sync-badge";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useLang } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { actionableFor } from "@/lib/metrics";
import { Icon } from "./ui";

const NAV = [
  { href: "/loops", icon: "sync", en: "Loops", he: "לולאות" },
  { href: "/patients", icon: "groups", en: "Patients", he: "מטופלים" },
  { href: "/board", icon: "forum", en: "MDT", he: "דיון MDT" },
  { href: "/team", icon: "diversity_3", en: "Team", he: "הצוות" },
  { href: "/insights", icon: "insights", en: "Metrics", he: "מדדים" },
];

function BottomNav() {
  const pathname = usePathname();
  const { lang, t } = useLang();
  const { loops, currentUser, sessions } = useStore();

  const { toAnswer, toClose } = actionableFor(loops, currentUser);
  const mine = toAnswer.length + toClose.length;
  const pendingCases = sessions
    .filter((s) => s.status !== "complete")
    .reduce((n, s) => n + s.cases.filter((c) => c.status === "pending").length, 0);

  return (
    <nav
      aria-label={t("Primary", "ניווט ראשי")}
      className="sticky bottom-0 z-30 border-t border-[var(--color-line)] bg-[var(--color-canvas)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
    >
      <ul className="flex">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const badge =
            item.href === "/loops" ? mine : item.href === "/board" ? pendingCases : 0;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition-colors ${
                  active ? "text-[var(--color-primary)]" : "text-[var(--color-ink-faint)]"
                }`}
              >
                <span className="relative">
                  <Icon name={item.icon} size={24} filled={active} />
                  {badge > 0 && (
                    <span className="absolute -end-2 -top-1 grid min-w-4 place-items-center rounded-full bg-[var(--color-urgent)] px-1 text-[9px] font-bold text-white">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </span>
                {lang === "he" ? item.he : item.en}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Device-shaped shell. On a handset this is edge-to-edge; in a desktop browser
 * it renders as a centred device frame so the prototype can be demonstrated on
 * a meeting-room screen without looking stretched.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh justify-center bg-[#0a0f16] md:py-6">
      <div className="relative flex min-h-dvh w-full max-w-[440px] flex-col overflow-hidden bg-[var(--color-canvas)] md:h-[calc(100dvh-3rem)] md:min-h-0 md:rounded-3xl md:border md:border-[var(--color-line-strong)] md:shadow-2xl">
        {/* Floated over the shell rather than placed in each screen's header:
            whether the team board has your change is true of the whole
            application, not of whichever screen you happen to be on. */}
        <div className="pointer-events-none absolute end-2 top-2 z-40">
          <SyncBadge />
        </div>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        <BottomNav />
      </div>
    </div>
  );
}

/** Scrollable body region — every screen puts its content in one of these. */
export function Screen({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className={`min-h-0 flex-1 overflow-y-auto px-4 pb-24 pt-4 ${className}`}>
      {children}
    </main>
  );
}
