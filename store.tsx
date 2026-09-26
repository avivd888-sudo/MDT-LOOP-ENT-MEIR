"use client";

/**
 * Application state.
 *
 * State lives in React and is mirrored to sessionStorage, so that refreshing
 * the browser mid-demonstration does not erase a decision just recorded.
 * sessionStorage rather than localStorage: it is scoped to the tab and cleared
 * when the tab closes, so nothing resembling clinical data survives on a
 * shared machine.
 *
 * Every action here maps one-to-one onto an API call a real server would
 * expose, which is why they are named as domain actions (acknowledgeLoop,
 * closeLoop) rather than as setters.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CURRENT_USER_ID, LOOPS, PATIENTS, PENDING_REQUESTS, SESSIONS, TEAM } from "./data";
import { translateDeep } from "./demo-he";
import { useLang } from "./i18n";
import { SharedState, type SyncState } from "./sync";
import { setRoster } from "./roster";
import { assignStudyId } from "./study-id";
import { buildSimulation } from "./sim-cohort";
import {
  GOLIVE_KEY,
  SNAPSHOT_KEY,
  loadGoLive,
  loadMode,
  missingForGoLive,
  saveGoLive,
  saveMode,
  storageFor,
  type GoLiveRecord,
  type WorkspaceMode,
} from "./workspace";
import type { PendingMember } from "./types";
import { DISCIPLINE_SHORT, LOOP_KIND_LABEL } from "./types";
import type {
  Discipline,
  Loop,
  LoopEvent,
  LoopKind,
  LoopUrgency,
  MdtCaseEntry,
  MdtDecision,
  MdtSession,
  Patient,
  TeamMember,
  TreatmentModality,
} from "./types";

interface NewLoopInput {
  patientId: string;
  kind: LoopKind;
  urgency: LoopUrgency;
  toDiscipline: Discipline;
  situation: string;
  background: string;
  assessment: string;
  request: string;
  blocksCaseId?: string;
}

interface StoreValue {
  /** Next patient id — must come from the pool so the static route exists. */
  nextPatientId: () => string;
  patients: Patient[];
  sessions: MdtSession[];
  loops: Loop[];
  team: TeamMember[];
  currentUser: TeamMember;

  getPatient: (id: string) => Patient | undefined;
  getLoop: (id: string) => Loop | undefined;
  addPatient: (p: Patient) => void;

  openLoop: (input: NewLoopInput) => string;
  acknowledgeLoop: (id: string, note?: string) => void;
  answerLoop: (id: string, answer: string) => void;
  closeLoop: (id: string, closureNote: string) => void;
  escalateLoop: (id: string) => void;

  /** Whether this board is shared, and whether the last change was saved. */
  sync: SyncState;

  /** Sign this browser in as a particular clinician. */
  signInAs: (id: string) => void;
  /** Discipline leads only: bring a colleague onto the board. */
  addTeamMember: (m: Omit<TeamMember, "addedBy">) => void;

  /** Access requests that have proved a work address and await a lead. */
  pending: PendingMember[];
  /** Record a verified request. Grants nothing on its own. */
  requestAccess: (p: PendingMember) => void;
  /** Lead of the same discipline only: admit a request to the board. */
  approveMember: (id: string, role?: string) => void;
  /** Lead of the same discipline only: refuse a request. */
  declineMember: (id: string) => void;

  /** True when the signed-in clinician leads a discipline. */
  isDisciplineLead: boolean;
  /** Lead only: move a stalled loop to a different discipline. */
  reassignLoop: (id: string, to: Discipline, reason: string) => void;
  /** Lead only: close a loop its requester cannot close. */
  overrideCloseLoop: (id: string, reason: string) => void;
  /** Lead only: reopen a loop that was closed without being handled properly. */
  reopenLoop: (id: string, reason: string) => void;

  recordDecision: (sessionId: string, caseId: string, decision: MdtDecision) => void;
  deferCase: (sessionId: string, caseId: string, reason: string) => void;
  toggleAttendance: (sessionId: string, memberId: string) => void;

  resetDemo: () => void;

  /** Schedule a tumour board meeting. Returns the new meeting's id. */
  scheduleSession: (input: { date: string; startTime: string; location: string }) => string;
  /**
   * List a patient for a meeting with an explicit clinical question. Every loop
   * still open on the patient becomes a prerequisite of the case — the board can
   * see, before it sits, what it is still waiting for.
   */
  listCase: (sessionId: string, patientId: string, question: string) => void;
  /** Record the first definitive treatment — the end of the primary endpoint. */
  recordTreatmentStart: (patientId: string, date: string, modality: TreatmentModality) => void;

  /**
   * Coded mode (protocol v1.1, §8.6). When on, no screen shows a name, a
   * national ID or a medical record number — every patient is their study ID.
   * This is how the platform runs until Clalit information security and the
   * Helsinki committee approve identified data, and how it can keep running if
   * that approval is delayed. On by default.
   */
  coded: boolean;
  setCoded: (on: boolean) => void;

  /** Replace the board with the 20-patient simulation cohort (synthetic). */
  loadSimulation: () => void;

  /**
   * Which workspace this browser is running — `demo` or `live`.
   *
   * See `lib/workspace.ts` for what each one means and for why live mode
   * gives up the shared board. Everything the interface does differently
   * between the two reads this one value.
   */
  mode: WorkspaceMode;
  /** The attestation recorded when live mode was entered; null in demo mode. */
  goLive: GoLiveRecord | null;
  /**
   * Open an empty, real-use board. Returns false and changes nothing if the
   * record is incomplete — the gate is enforced here, not only in the form,
   * so no other caller can route around it.
   */
  enterLive: (record: GoLiveRecord) => boolean;
  /** Return to the demonstration. `erase` also wipes the live board. */
  leaveLive: (erase?: boolean) => void;
  /**
   * False once the saved board has been read.
   *
   * Nothing gates rendering on it today — a static export prerenders with
   * whatever the initial state is, so holding the whole shell back until this
   * flips would ship a spinner as every page's HTML, and it produced a React
   * hydration error when tried. It is exposed because a screen that wants to
   * say "loading" for its own region can, and because the alternative — a
   * boolean the store keeps privately — hides a fact the interface may need.
   */
  booting: boolean;
}

/* Assigned round-robin so two people admitted on the same day do not get the
   same avatar colour, which is the one thing that makes a roster hard to scan. */
const MEMBER_COLOURS = [
  "#137fec",
  "#a78bfa",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
];

const StoreContext = createContext<StoreValue | null>(null);

/**
 * Identifiers for records created at runtime.
 *
 * The counter is per-prefix and starts at 1000, so identifiers are predictable
 * in advance. That is needed only because of the static export: Next.js cannot
 * generate a page for a dynamic route that did not exist at build time, so the
 * build pre-renders an identifier pool (RUNTIME_POOL in lib/data). A server
 * deployment does not need this.
 */
const counters: Record<string, number> = {};
const nextId = (prefix: string) => {
  counters[prefix] = (counters[prefix] ?? 1000) + 1;
  return `${prefix}-${counters[prefix]}`;
};
const stamp = () => new Date().toISOString();

/* The per-mode snapshot keys live in lib/workspace.ts — SNAPSHOT_KEY. */

interface Snapshot {
  patients: Patient[];
  sessions: MdtSession[];
  loops: Loop[];
  /** Shared, so that a colleague one lead adds is on everyone's roster. */
  team?: TeamMember[];
  /** Access requests waiting on a discipline lead — shared for the same reason. */
  pending?: PendingMember[];
}

/**
 * Which clinician this browser is signed in as.
 *
 * `localStorage`, deliberately, and the only thing in the application that
 * uses it: identity should survive closing a tab, while anything resembling
 * clinical data stays in `sessionStorage` and does not. Identity is per device
 * because the board is shared — without it every viewer would act as the same
 * person and "only the clinician who asked may close" would mean nothing.
 */
const IDENTITY_KEY = "mdt-loop-identity";
const CODED_KEY = "mdt-loop-coded";

function loadCoded(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(CODED_KEY) !== "off";
  } catch {
    return true;
  }
}

/** A patient as a coded screen shows them: the study ID and nothing that identifies. */
function codedView(p: Patient): Patient {
  return { ...p, name: p.studyId ?? "— (pending pathology)", nationalId: "", mrn: "", ward: undefined, bed: undefined };
}

function loadIdentity(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(IDENTITY_KEY);
  } catch {
    return null;
  }
}

function loadSnapshot(mode: WorkspaceMode): Snapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = storageFor(mode)?.getItem(SNAPSHOT_KEY[mode]);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Snapshot;
    if (!Array.isArray(parsed?.patients) || !Array.isArray(parsed?.loops)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { lang } = useLang();
  const [patients, setPatients] = useState<Patient[]>(PATIENTS);
  const [sessions, setSessions] = useState<MdtSession[]>(SESSIONS);
  const [loops, setLoops] = useState<Loop[]>(LOOPS);
  const [team, setTeam] = useState<TeamMember[]>(TEAM);
  const [pending, setPending] = useState<PendingMember[]>(PENDING_REQUESTS);
  const [userId, setUserId] = useState<string>(CURRENT_USER_ID);
  const [coded, setCodedState] = useState<boolean>(true);
  const [mode, setModeState] = useState<WorkspaceMode>("demo");
  const [goLive, setGoLiveState] = useState<GoLiveRecord | null>(null);
  const [booting, setBooting] = useState(true);
  /* Read in the hydration effect below, together with the mode: in live mode
     the answer is always "coded", whatever the stored preference says. */
  const setCoded = useCallback(
    (on: boolean) => {
      // Live mode is coded mode. Showing a name here would put an identifier
      // on a screen that information security signed off as carrying none.
      if (mode === "live" && !on) return;
      setCodedState(on);
      try {
        window.localStorage.setItem(CODED_KEY, on ? "on" : "off");
      } catch {
        /* preference falls back to this session only */
      }
    },
    [mode],
  );

  // Kept in step with the registry that `member()` reads — and in the language
  // being read, since `member()` is called to render a colleague's name.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setRoster(translateDeep(team)), [team, lang]);

  const currentUser = useMemo(
    () => team.find((m) => m.id === userId) ?? team[0],
    [team, userId],
  );

  const signInAs = useCallback((id: string) => {
    setUserId(id);
    try {
      window.localStorage.setItem(IDENTITY_KEY, id);
    } catch {
      /* identity falls back to this session only */
    }
  }, []);

  /**
   * Bring a colleague onto the board. A discipline lead's call, including for
   * an outside consultant helping with one case — the alternative is that the
   * person everyone is waiting on cannot be addressed by the system at all.
   */
  const addTeamMember = useCallback(
    (m: Omit<TeamMember, "addedBy">) => {
      if (!currentUser.disciplineLead) return;
      setTeam((prev) =>
        prev.some((x) => x.id === m.id) ? prev : [...prev, { ...m, addedBy: currentUser.id }],
      );
    },
    [currentUser],
  );

  /* ---------------------------------------------------------------------- */
  /* Access requests                                                        */
  /* ---------------------------------------------------------------------- */

  /**
   * Record a request from somebody who has proved a work address.
   *
   * It grants nothing. The whole point of keeping requests as their own list,
   * rather than adding a `pending: true` member to the roster, is that a
   * half-admitted person cannot be routed a loop by accident: `member()` never
   * sees them, so no screen can address them and no request can be assigned to
   * them until a lead has said yes.
   */
  const requestAccess = useCallback((p: PendingMember) => {
    setPending((prev) =>
      prev.some((x) => x.email.toLowerCase() === p.email.toLowerCase()) ? prev : [...prev, p],
    );
  }, []);

  /**
   * A lead admits someone to the board.
   *
   * Scoped to the lead's own discipline. A pathology lead should not be the one
   * deciding that a new radiation oncologist is who they say they are — the
   * person who can check that is the head of that discipline, which is the
   * whole argument for putting this authority with the department heads rather
   * than with an administrator.
   */
  const approveMember = useCallback(
    (id: string, role?: string) => {
      const req = pending.find((p) => p.id === id);
      if (!req) return;
      if (!currentUser.disciplineLead || currentUser.discipline !== req.discipline) return;

      const initials =
        req.name
          .replace(/^(Dr|Prof|Mr|Ms|Mrs|ד״ר|דר|פרופ׳|פרופ)\.?\s+/i, "")
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((w: string) => w[0])
          .join("")
          .toUpperCase() || "?";

      setTeam((prev) =>
        prev.some((m) => m.id === req.id)
          ? prev
          : [
              ...prev,
              {
                id: req.id,
                name: req.name,
                role: role?.trim() || req.role,
                discipline: req.discipline,
                initials,
                colour: MEMBER_COLOURS[prev.length % MEMBER_COLOURS.length],
                addedBy: currentUser.id,
                email: req.email,
                organisation: req.organisation,
              },
            ],
      );
      setPending((prev) => prev.filter((p) => p.id !== id));
    },
    [pending, currentUser],
  );

  /** A lead refuses a request. The record is removed, not marked — a refused
   *  request that stays on the screen is a list nobody ever finishes reading. */
  const declineMember = useCallback(
    (id: string) => {
      const req = pending.find((p) => p.id === id);
      if (!req) return;
      if (!currentUser.disciplineLead || currentUser.discipline !== req.discipline) return;
      setPending((prev) => prev.filter((p) => p.id !== id));
    },
    [pending, currentUser],
  );

  /*
   * Two tiers of persistence, in this order.
   *
   * The shared record comes first where it exists: on the published build the
   * whole team reads and writes one board, which is the difference between a
   * demonstration and something a department can run a pilot on. Where it does
   * not exist — local development, the offline single file, the automated
   * walkthrough — the tab-scoped snapshot behaves exactly as it always did.
   */
  const shared = useRef<SharedState<Snapshot> | null>(null);
  if (shared.current === null) shared.current = new SharedState<Snapshot>();
  const [sync, setSync] = useState<SyncState>({ status: "local" });

  useEffect(() => {
    /* A stored mode of "live" without an attestation beside it is not a live
       board — it is a cleared localStorage, or somebody's hand-edit. Fall back
       to the demonstration rather than opening an unattested empty board. */
    const record = loadGoLive();
    const live = loadMode() === "live" && record !== null;
    const m: WorkspaceMode = live ? "live" : "demo";
    setModeState(m);
    setGoLiveState(record);
    setCodedState(live ? true : loadCoded());

    const store = shared.current!;
    /* Live mode never touches the shared board: that board lives in the
       published artifact on claude.ai, and coded clinical data does not
       leave Clalit. See lib/workspace.ts. */
    const unsubscribe = live ? () => {} : store.subscribe(setSync);

    void (async () => {
      const remote = live ? null : await store.load();
      const snap = remote ?? loadSnapshot(m);
      if (live && !snap) {
        // An empty board is the whole point of live mode.
        setPatients([]);
        setSessions([]);
        setLoops([]);
      }
      if (snap) {
        // A board saved before study IDs existed: carry the study record over
        // from the seed or the simulation for any patient that matches by id.
        const known = [...PATIENTS, ...buildSimulation().patients];
        setPatients(
          snap.patients.map((p) => {
            if (p.studyId) return p;
            const k = known.find((x) => x.id === p.id);
            return k?.studyId
              ? { ...p, studyId: k.studyId, studySeq: k.studySeq, siteCode: k.siteCode, side: k.side, pathologyDate: k.pathologyDate }
              : p;
          }),
        );
        setSessions(snap.sessions);
        setLoops(snap.loops);
        if (Array.isArray(snap.team) && snap.team.length) setTeam(snap.team);
        if (Array.isArray(snap.pending)) setPending(snap.pending);
      }
      const saved = loadIdentity();
      if (saved) setUserId(saved);
      setBooting(false);
    })();

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    /*
     * Guarded on `booting`, which is state and not a ref — and that
     * distinction is the whole of a bug worth remembering.
     *
     * It used to be a ref flipped at the end of the hydration effect. In demo
     * mode the shared board is awaited, so the ref was still false when this
     * effect ran on mount and nothing was written. In live mode there is
     * nothing to await, so the ref was already true — and this effect, running
     * in the same commit and therefore still looking at the *initial* render's
     * values, wrote the seed board over the demonstration's saved one under
     * the demo key.
     *
     * As state, the guard cannot be ahead of the values it is guarding: the
     * first render in which `booting` is false is the first render that has
     * the loaded board and the resolved mode in it.
     */
    if (booting) return;
    const snapshot = { patients, sessions, loops, team, pending };
    if (mode === "demo") shared.current?.save(snapshot);
    try {
      storageFor(mode)?.setItem(SNAPSHOT_KEY[mode], JSON.stringify(snapshot));
    } catch {
      /* Storage unavailable — the app continues from memory */
    }
  }, [patients, sessions, loops, team, pending, mode, booting]);

  /* ---------------------------------------------------------------------- */
  /* Workspace mode                                                         */
  /* ---------------------------------------------------------------------- */

  const enterLive = useCallback((record: GoLiveRecord): boolean => {
    /* The gate is enforced here and not only in the form. A second caller —
       a future screen, a test, a console — has to satisfy the same rule. */
    if (missingForGoLive(record).length > 0) return false;
    saveGoLive(record);
    saveMode("live");
    setGoLiveState(record);
    setModeState("live");
    setCodedState(true);
    try {
      window.localStorage.setItem(CODED_KEY, "on");
    } catch {
      /* preference falls back to this session only */
    }
    /* Re-entering after a browser restart finds the pilot board where it was;
       the first entry finds nothing and starts empty. */
    const snap = loadSnapshot("live");
    setPatients(snap?.patients ?? []);
    setSessions(snap?.sessions ?? []);
    setLoops(snap?.loops ?? []);
    return true;
  }, []);

  const leaveLive = useCallback((erase = false) => {
    try {
      if (erase) window.localStorage.removeItem(SNAPSHOT_KEY.live);
      window.localStorage.removeItem(GOLIVE_KEY);
    } catch {
      /* storage unavailable */
    }
    saveMode("demo");
    setGoLiveState(null);
    setModeState("demo");
    const snap = loadSnapshot("demo");
    setPatients(snap?.patients ?? PATIENTS);
    setSessions(snap?.sessions ?? SESSIONS);
    setLoops(snap?.loops ?? LOOPS);
  }, []);

  /* Translated on the way out, like everything else the interface reads. */
  const getPatient = useCallback(
    (id: string) => {
      const p = patients.find((x) => x.id === id);
      return p && translateDeep(coded ? codedView(p) : p);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- language decides
    // which copy comes back.
    [patients, lang, coded],
  );
  const getLoop = useCallback(
    (id: string) => {
      const l = loops.find((x) => x.id === id);
      return l && translateDeep(l);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loops, lang],
  );

  /* A patient with a malignant pathology report gets a study ID on entry, and
     keeps it. */
  const addPatient = useCallback(
    (p: Patient) => setPatients((prev) => [assignStudyId(p, prev), ...prev]),
    [],
  );

  const loadSimulation = useCallback(() => {
    /* Twenty invented patients have no business on a board that is holding
       real ones. The button is hidden in live mode; this is the guard that
       means it cannot happen anyway. */
    if (mode === "live") return;
    const sim = buildSimulation();
    setPatients(sim.patients);
    setLoops(sim.loops);
    setSessions(sim.sessions);
    // A board saved before the dentist joined the roster still needs them.
    setTeam((prev) => [...prev, ...TEAM.filter((m) => !prev.some((x) => x.id === m.id))]);
  }, [mode]);

  /* ---------------------------------------------------------------------- */
  /* Loop lifecycle                                                         */
  /* ---------------------------------------------------------------------- */

  const pushEvent = (l: Loop, e: LoopEvent): Loop => ({ ...l, events: [...l.events, e] });

  const openLoop = useCallback(
    (input: NewLoopInput) => {
      const id = nextId("l");
      const at = stamp();
      const loop: Loop = {
        id,
        ...input,
        requesterId: currentUser.id,
        openedAt: at,
        events: [{ at, actorId: currentUser.id, type: "opened" }],
      };
      setLoops((prev) => [loop, ...prev]);
      return id;
    },
    [currentUser.id],
  );

  /*
   * Only the discipline a loop was sent to may acknowledge or answer it —
   * enforced here, like the closure rule, not only by hiding the buttons.
   * (Found by the simulation suite: the screen gated these, the action did not.)
   */
  const receives = (id: string) => loops.find((l) => l.id === id)?.toDiscipline === currentUser.discipline;

  const acknowledgeLoop = useCallback(
    (id: string, note?: string) => {
      if (!receives(id)) return;
      const at = stamp();
      setLoops((prev) =>
        prev.map((l) =>
          l.id === id && !l.acknowledgedAt
            ? pushEvent(
                { ...l, acknowledgedAt: at, acknowledgedBy: currentUser.id },
                { at, actorId: currentUser.id, type: "acknowledged", note },
              )
            : l,
        ),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentUser.id, currentUser.discipline, loops],
  );

  const answerLoop = useCallback(
    (id: string, answer: string) => {
      if (!receives(id)) return;
      const at = stamp();
      setLoops((prev) =>
        prev.map((l) => {
          if (l.id !== id) return l;
          // Answering implies acknowledgement, even if not done explicitly
          const base = l.acknowledgedAt
            ? l
            : { ...l, acknowledgedAt: at, acknowledgedBy: currentUser.id };
          return pushEvent(
            { ...base, answeredAt: at, answeredBy: currentUser.id, answer },
            { at, actorId: currentUser.id, type: "answered" },
          );
        }),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentUser.id, currentUser.discipline, loops],
  );

  /**
   * Closing a loop.
   *
   * This is the only action in the system that only the *requester* may
   * perform, and that is the whole point: an answer is not a closure. A loop
   * closes only when the person who asked confirms the answer resolved the
   * question. Closing also marks the linked MDT prerequisite as ready.
   */
  const closeLoop = useCallback(
    (id: string, closureNote: string) => {
      const at = stamp();
      let caseId: string | undefined;

      /*
       * The rule is enforced here, in the domain action, and not only by hiding
       * the button. A permission that lives in the view is a suggestion: any
       * other call path — a future keyboard shortcut, a deep link, a test —
       * walks straight past it. This is the one rule the whole study rests on,
       * so it belongs where the state actually changes.
       *
       * Note for the production build: this is still client-side. Authorisation
       * has to be re-checked on the server before any real data is written,
       * because nothing sent from a browser can be trusted.
       */
      const target = loops.find((l) => l.id === id);
      if (!target || target.closedAt || target.requesterId !== currentUser.id) return;

      setLoops((prev) =>
        prev.map((l) => {
          if (l.id !== id) return l;
          caseId = l.blocksCaseId;
          return pushEvent(
            { ...l, closedAt: at, closedBy: currentUser.id, closureNote },
            { at, actorId: currentUser.id, type: "closed", note: closureNote },
          );
        }),
      );

      // Release the block on the tumour board case
      setSessions((prev) =>
        prev.map((s) => ({
          ...s,
          cases: s.cases.map((c) => ({
            ...c,
            prerequisites: c.prerequisites.map((p) =>
              p.loopId === id ? { ...p, ready: true } : p,
            ),
          })),
        })),
      );
      void caseId;
    },
    [currentUser.id, loops],
  );

  const escalateLoop = useCallback(
    (id: string) => {
      const at = stamp();
      setLoops((prev) =>
        prev.map((l) =>
          l.id === id
            ? pushEvent(
                { ...l, urgency: l.urgency === "routine" ? "urgent" : "stat" },
                {
                  at,
                  actorId: currentUser.id,
                  type: "escalated",
                  note: "Escalated after passing the target turnaround",
                },
              )
            : l,
        ),
      );
    },
    [currentUser.id],
  );

  /* ---------------------------------------------------------------------- */
  /* Discipline lead                                                          */
  /*                                                                          */
  /* Closure belongs to the requester. That rule is the point of the system,  */
  /* and it is also the rule most likely to strand a loop: the person who     */
  /* asked is on nights, in theatre, or on leave. A discipline lead may break */
  /* the rule, must give a reason, and the act is stamped onto the loop       */
  /* itself as well as the audit trail — so no view can ever show a lead's    */
  /* override as though the requester had confirmed the answer.               */
  /*                                                                          */
  /* Naming this the department heads' authority is a design choice, not an   */
  /* implementation detail: it makes the pathway theirs to own.               */
  /* ---------------------------------------------------------------------- */

  const isDisciplineLead = Boolean(currentUser.disciplineLead);

  const reassignLoop = useCallback(
    (id: string, to: Discipline, reason: string) => {
      if (!currentUser.disciplineLead) return;
      const at = stamp();
      setLoops((prev) =>
        prev.map((l) => {
          if (l.id !== id) return l;
          const from = DISCIPLINE_SHORT[l.toDiscipline];
          return pushEvent(
            { ...l, toDiscipline: to, overriddenBy: currentUser.id, overrideReason: reason },
            {
              at,
              actorId: currentUser.id,
              type: "reassigned",
              note: `Rerouted from ${from} to ${DISCIPLINE_SHORT[to]} — ${reason}`,
            },
          );
        }),
      );
    },
    [currentUser.id, currentUser.disciplineLead],
  );

  const overrideCloseLoop = useCallback(
    (id: string, reason: string) => {
      if (!currentUser.disciplineLead) return;
      const at = stamp();
      setLoops((prev) =>
        prev.map((l) =>
          l.id === id
            ? pushEvent(
                {
                  ...l,
                  closedAt: at,
                  closedBy: currentUser.id,
                  closureNote: reason,
                  overriddenBy: currentUser.id,
                  overrideReason: reason,
                },
                { at, actorId: currentUser.id, type: "override-closed", note: reason },
              )
            : l,
        ),
      );
      setSessions((prev) =>
        prev.map((s) => ({
          ...s,
          cases: s.cases.map((c) => ({
            ...c,
            prerequisites: c.prerequisites.map((pr) =>
              pr.loopId === id ? { ...pr, ready: true } : pr,
            ),
          })),
        })),
      );
    },
    [currentUser.id, currentUser.disciplineLead],
  );

  /**
   * Reopening. A loop can be closed and still not have been handled — the
   * requester accepts a partial answer, or closes to clear their board. The
   * lead of the discipline the request went to can put it back, which is the
   * only way the closure rate stays worth measuring.
   */
  const reopenLoop = useCallback(
    (id: string, reason: string) => {
      if (!currentUser.disciplineLead) return;
      const at = stamp();
      setLoops((prev) =>
        prev.map((l) =>
          l.id === id && l.closedAt
            ? pushEvent(
                {
                  ...l,
                  closedAt: undefined,
                  closedBy: undefined,
                  closureNote: undefined,
                  overriddenBy: currentUser.id,
                  overrideReason: reason,
                },
                { at, actorId: currentUser.id, type: "reopened", note: reason },
              )
            : l,
        ),
      );
    },
    [currentUser.id, currentUser.disciplineLead],
  );

  /* ---------------------------------------------------------------------- */
  /* Tumour board                                                            */
  /* ---------------------------------------------------------------------- */

  const recordDecision = useCallback(
    (sessionId: string, caseId: string, decision: MdtDecision) => {
      let patientId: string | undefined;
      let recommendation = "";
      const plannedModality = decision.modalities[0];

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId) return s;
          const cases = s.cases.map((c) => {
            if (c.id !== caseId) return c;
            patientId = c.patientId;
            recommendation = decision.recommendation;
            return { ...c, status: "decided" as const, decision };
          });
          const allHandled = cases.every((c) => c.status !== "pending");
          return { ...s, cases, status: allHandled ? ("complete" as const) : s.status };
        }),
      );

      if (patientId) {
        const pid = patientId;
        // The decision belongs to the day the board sat, not the day it was typed in.
        const today = sessions.find((x) => x.id === sessionId)?.date ?? stamp().slice(0, 10);
        setPatients((prev) =>
          prev.map((p) =>
            p.id === pid
              ? {
                  ...p,
                  status: "treatment" as const,
                  plan: recommendation,
                  decisionDate: p.decisionDate ?? today,
                  plannedModality: p.plannedModality ?? plannedModality,
                  timeline: [
                    ...p.timeline,
                    {
                      id: nextId("t"),
                      date: today,
                      kind: "mdt" as const,
                      title: "MDT decision recorded",
                      detail: recommendation,
                      actor: team.find((m) => m.id === decision.decidedBy)?.name,
                    },
                  ],
                }
              : p,
          ),
        );

        // The follow-up becomes a loop, not a task — so it also has to close
        if (decision.followUp) {
          const at = stamp();
          setLoops((prev) => [
            {
              id: nextId("l"),
              patientId: pid,
              kind: "scheduling" as const,
              urgency: "routine" as const,
              situation: `MDT decision of ${today}.`,
              background: recommendation,
              assessment: "Follow-up action arising from the board decision.",
              request: decision.followUp!,
              requesterId: currentUser.id,
              toDiscipline: "nursing" as const,
              openedAt: at,
              events: [{ at, actorId: currentUser.id, type: "opened" as const }],
            },
            ...prev,
          ]);
        }
      }
    },
    [currentUser.id, team, sessions],
  );

  const deferCase = useCallback((sessionId: string, caseId: string, reason: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              cases: s.cases.map((c) =>
                c.id === caseId
                  ? {
                      ...c,
                      status: "deferred" as const,
                      deferReason: reason,
                      timesDeferred: c.timesDeferred + 1,
                    }
                  : c,
              ),
            }
          : s,
      ),
    );
  }, []);

  const toggleAttendance = useCallback((sessionId: string, memberId: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              attendeeIds: s.attendeeIds.includes(memberId)
                ? s.attendeeIds.filter((id) => id !== memberId)
                : [...s.attendeeIds, memberId],
            }
          : s,
      ),
    );
  }, []);

  const scheduleSession = useCallback(
    (input: { date: string; startTime: string; location: string }) => {
      const id = nextId("s");
      const core = team.filter((m) => m.coreMember).map((m) => m.id);
      setSessions((prev) => [
        {
          id,
          title: "Head & Neck Tumour Board",
          date: input.date,
          startTime: input.startTime,
          location: input.location,
          chairId: team.find((m) => m.id === "u-rosen")?.id ?? currentUser.id,
          requiredDisciplines: ["surgery", "medical-oncology", "radiation-oncology", "pathology", "radiology"],
          attendeeIds: [...new Set([currentUser.id, ...core])],
          status: "scheduled",
          cases: [],
        },
        ...prev,
      ]);
      return id;
    },
    [team, currentUser.id],
  );

  const listCase = useCallback(
    (sessionId: string, patientId: string, question: string) => {
      const patient = patients.find((p) => p.id === patientId);
      if (!patient) return;
      const caseId = nextId("c");
      const open = loops.filter((l) => l.patientId === patientId && !l.closedAt);
      const entry: MdtCaseEntry = {
        id: caseId,
        patientId,
        presenterId: currentUser.id,
        question,
        status: "pending",
        timesDeferred: 0,
        prerequisites: [
          { label: "Histology", ready: Boolean(patient.pathologyDate) },
          ...open.map((l) => ({ label: LOOP_KIND_LABEL[l.kind], ready: false, loopId: l.id })),
        ],
      };
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId && !s.cases.some((c) => c.patientId === patientId) ? { ...s, cases: [...s.cases, entry] } : s)),
      );
      setLoops((prev) => prev.map((l) => (open.some((o) => o.id === l.id) ? { ...l, blocksCaseId: caseId } : l)));
      setPatients((prev) => prev.map((p) => (p.id === patientId ? { ...p, status: "mdt-review" as const } : p)));
    },
    [patients, loops, currentUser.id],
  );

  const recordTreatmentStart = useCallback(
    (patientId: string, date: string, modality: TreatmentModality) => {
      setPatients((prev) =>
        prev.map((p) =>
          p.id === patientId
            ? {
                ...p,
                treatmentStartDate: date,
                treatmentModality: modality,
                status: "treatment" as const,
                timeline: [
                  ...p.timeline,
                  {
                    id: nextId("t"),
                    date,
                    kind: (modality === "surgery" ? "surgery" : modality === "systemic" ? "systemic" : "radiotherapy") as "surgery" | "systemic" | "radiotherapy",
                    title: "First definitive treatment",
                    detail: modality === "surgery" ? "Primary surgical resection." : modality === "radiotherapy" ? "Radiotherapy started." : modality === "chemoradiotherapy" ? "Chemoradiotherapy started." : "Treatment started.",
                    actor: currentUser.name,
                  },
                ],
              }
            : p,
        ),
      );
    },
    [currentUser.name],
  );

  const resetDemo = useCallback(() => {
    /* "Reset" means "back to the opening demonstration". In live mode there is
       no opening state to go back to, and discarding a pilot board because
       somebody hit reset is not a thing this application will do. */
    if (mode === "live") return;
    setPatients(PATIENTS);
    setSessions(SESSIONS);
    setLoops(LOOPS);
    try {
      storageFor("demo")?.removeItem(SNAPSHOT_KEY.demo);
    } catch {
      /* ignore */
    }
  }, [mode]);

  /*
   * What the interface receives.
   *
   * The state above stays in the language the seed data was written in, and
   * every action reads and writes it — so the audit trail, the CSV export and
   * the shared snapshot are all unaffected by what language somebody is
   * reading in. Only the copy handed to the screens is translated, and only
   * when the reader is reading Hebrew: in English `translateDeep` returns its
   * argument and this costs nothing.
   *
   * Doing it here rather than at each render site is the difference between one
   * seam and a hundred. A hundred means one of them is eventually missed, and a
   * Hebrew screen with an English diagnosis on it is the kind of defect nobody
   * reports — they just trust the tool a little less.
   */
  /* Memoised: it is a dependency of several screens' own memos, so handing out
     a fresh object on every render would defeat all of them. */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const shownUser = useMemo(() => translateDeep(currentUser), [currentUser, lang]);

  const shown = useMemo(
    () => ({
      patients: translateDeep(coded ? patients.map(codedView) : patients),
      sessions: translateDeep(sessions),
      loops: translateDeep(loops),
      team: translateDeep(team),
      pending: translateDeep(pending),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `lang` is not read
    // here; it is the signal that the translated projection must be rebuilt.
    [patients, sessions, loops, team, pending, lang, coded],
  );

  const value: StoreValue = {
    nextPatientId: () => nextId("p"),
    coded,
    setCoded,
    loadSimulation,
    mode,
    goLive,
    enterLive,
    leaveLive,
    booting,
    scheduleSession,
    listCase,
    recordTreatmentStart,
    patients: shown.patients,
    sessions: shown.sessions,
    loops: shown.loops,
    team: shown.team,
    currentUser: shownUser,
    getPatient,
    getLoop,
    addPatient,
    openLoop,
    acknowledgeLoop,
    answerLoop,
    closeLoop,
    escalateLoop,
    sync,
    signInAs,
    addTeamMember,
    pending: shown.pending,
    requestAccess,
    approveMember,
    declineMember,
    isDisciplineLead,
    reassignLoop,
    overrideCloseLoop,
    reopenLoop,
    recordDecision,
    deferCase,
    toggleAttendance,
    resetDemo,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}

/** Is the board quorate — every required discipline represented. */
export function quorumFor(session: MdtSession, team: TeamMember[]) {
  const present = new Set(
    session.attendeeIds
      .map((id) => team.find((m) => m.id === id)?.discipline)
      .filter(Boolean) as Discipline[],
  );
  const missing = session.requiredDisciplines.filter((d) => !present.has(d));
  return { met: missing.length === 0, missing };
}
