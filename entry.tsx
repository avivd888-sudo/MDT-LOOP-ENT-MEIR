"use client";

/**
 * Entry point for the single-file build.
 *
 * Exactly the same screen components as the Next build — only the routing is
 * hash-based rather than server paths. No code is duplicated: every screen is
 * imported from its original source.
 */
import { createRoot } from "react-dom/client";
import { LangProvider, applyLang, readStoredLang } from "@/lib/i18n";
import { StoreProvider } from "@/lib/store";
import { AppShell } from "@/components/shell";
import { currentPath, subscribe } from "./shims/router-state";
import { useEffect, useState } from "react";

import Gate from "@/app/page";
import LoginPage from "@/app/login/page";
import RegisterPage from "@/app/register/page";
import LoopsPage from "@/app/(app)/loops/page";
import NewLoopPage from "@/app/(app)/loops/new/page";
import LoopDetail from "@/app/(app)/loops/[id]/detail";
import PatientsPage from "@/app/(app)/patients/page";
import NewPatientPage from "@/app/(app)/patients/new/page";
import PatientDetail from "@/app/(app)/patients/[id]/detail";
import BoardListPage from "@/app/(app)/board/page";
import BoardSession from "@/app/(app)/board/[id]/session";
import TeamPage from "@/app/(app)/team/page";
import InsightsPage from "@/app/(app)/insights/page";
import StagingPage from "@/app/(app)/staging/page";
import EvidencePage from "@/app/(app)/evidence/page";
import SettingsPage from "@/app/(app)/settings/page";
import PilotPage from "@/app/(app)/pilot/page";
import MorePage from "@/app/(app)/more/page";
import GoLivePage from "@/app/(app)/golive/page";

/** Screens outside the app shell (gate, sign-in, register) versus app screens. */
function resolve(path: string): { el: React.ReactNode; shell: boolean } {
  const p = path.replace(/\/+$/, "") || "/";

  if (p === "/") return { el: <Gate />, shell: false };
  if (p === "/login") return { el: <LoginPage />, shell: false };
  if (p === "/register") return { el: <RegisterPage />, shell: false };

  if (p === "/loops") return { el: <LoopsPage />, shell: true };
  if (p === "/loops/new") return { el: <NewLoopPage />, shell: true };
  const loop = p.match(/^\/loops\/(.+)$/);
  if (loop) return { el: <LoopDetail id={loop[1]} />, shell: true };

  if (p === "/patients") return { el: <PatientsPage />, shell: true };
  if (p === "/patients/new") return { el: <NewPatientPage />, shell: true };
  const pat = p.match(/^\/patients\/(.+)$/);
  if (pat) return { el: <PatientDetail id={pat[1]} />, shell: true };

  if (p === "/board") return { el: <BoardListPage />, shell: true };
  const board = p.match(/^\/board\/(.+)$/);
  if (board) return { el: <BoardSession id={board[1]} />, shell: true };

  if (p === "/team") return { el: <TeamPage />, shell: true };
  if (p === "/insights") return { el: <InsightsPage />, shell: true };
  if (p === "/staging") return { el: <StagingPage />, shell: true };
  if (p === "/evidence") return { el: <EvidencePage />, shell: true };
  if (p === "/settings") return { el: <SettingsPage />, shell: true };
  if (p === "/pilot") return { el: <PilotPage />, shell: true };
  if (p === "/more") return { el: <MorePage />, shell: true };
  if (p === "/golive") return { el: <GoLivePage />, shell: true };

  return { el: <LoopsPage />, shell: true };
}

function App() {
  const [path, setPath] = useState(currentPath());
  useEffect(() => subscribe(setPath) as unknown as () => void, []);

  const { el, shell } = resolve(path);
  // The key forces a remount on every screen change, so local state (tabs,
  // forms) does not leak between screens — matching how Next behaves between
  // routes.
  return shell ? <AppShell key={path}>{el}</AppShell> : <div key={path}>{el}</div>;
}

/* Nothing has been painted yet — this file is the whole page — so setting the
   direction here is enough, and the server build's inline boot script is not
   needed. */
const startLang = readStoredLang();
applyLang(startLang);

createRoot(document.getElementById("root")!).render(
  <LangProvider initial={startLang}>
    <StoreProvider>
      <App />
    </StoreProvider>
  </LangProvider>,
);
