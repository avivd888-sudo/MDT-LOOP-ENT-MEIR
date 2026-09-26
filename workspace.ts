/**
 * Which workspace this browser is running: the demonstration, or real use.
 *
 * Up to now the application had one mode. Every screen carried the
 * demonstration banner, the board opened with invented patients, and the
 * honest reading of that is: a thing to show, not a thing to use. Starting a
 * pilot needs a second mode, and the whole design of this module is about what
 * has to be true before that mode can be entered — and about what it gives up
 * in exchange.
 *
 * ── The two modes ─────────────────────────────────────────────────────────
 *
 *   demo   the opening board, the 20-patient simulation, the reset button, the
 *          shared board across viewers. Everything invented, and said so.
 *
 *   live   an empty board. No seed, no simulation, no reset. Coded identifiers
 *          only. Nothing leaves this browser.
 *
 * ── Why live mode is local only ───────────────────────────────────────────
 *
 * The shared board in `sync.ts` works by writing the state into the published
 * artifact on claude.ai. For a demonstration that is exactly right: it is what
 * lets two people look at one board. For real patients it is the opposite of
 * right — it is coded clinical data leaving Clalit, which is precisely what
 * the information-security review exists to prevent. So live mode disables it.
 *
 * The consequence is stated plainly on the gate rather than discovered later:
 * in live mode each clinician's browser holds its own board, and the record
 * that the study actually rests on is the workbook on the Clalit computer,
 * which the export button fills. A shared live board needs the build hosted
 * inside Clalit, and that is a separate conversation with their IT.
 *
 * ── Why a gate at all ─────────────────────────────────────────────────────
 *
 * Because the failure it prevents is silent. Nothing in a browser stops
 * somebody typing a real patient into a demonstration, and nothing afterwards
 * would show that it happened. The gate does three things: it refuses to open
 * an empty board until the approvals exist, it writes down who asserted that
 * and when, and it puts the third acknowledgement — coded data only, no names
 * — in front of the person at the moment they are about to start.
 *
 * It is an attestation, not a verification. This build cannot check an
 * approval number against anything. It is the seatbelt sign, not the seatbelt.
 */

export type WorkspaceMode = "demo" | "live";

export interface GoLiveRecord {
  /** Helsinki (IRB) approval reference, as issued by the committee. */
  irbRef: string;
  /** Date of that approval, yyyy-mm-dd. */
  irbDate: string;
  /** Clalit information-security approval reference. */
  infosecRef: string;
  infosecDate: string;
  /** Who turned it on — free text, the person's own name. */
  byName: string;
  /** When, ISO. */
  at: string;
  /** Each acknowledgement ticked separately, so none is implied by another. */
  ack: {
    /** Helsinki approval is in hand and covers this use. */
    irb: boolean;
    /** Clalit information security has approved this build for this use. */
    infosec: boolean;
    /** Only coded identifiers go in — no name, national ID, record number. */
    codedOnly: boolean;
    /** The board is local to this browser; the workbook is the record. */
    localOnly: boolean;
  };
}

export const MODE_KEY = "mdt-loop-mode";
export const GOLIVE_KEY = "mdt-loop-golive";

/** Storage is namespaced per mode, so the two boards can never mix. */
export const SNAPSHOT_KEY: Record<WorkspaceMode, string> = {
  demo: "ent-mdt-demo-v2",
  live: "ent-mdt-live-v1",
};

/**
 * Where each mode's board is kept.
 *
 * Demo uses `sessionStorage`: a demonstration should not outlive the tab it
 * was given in. Live uses `localStorage`, because a pilot that lost the
 * morning's loops when somebody closed a tab would be worse than no pilot —
 * and because on a Clalit machine that storage is inside Clalit.
 */
export function storageFor(mode: WorkspaceMode): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return mode === "live" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function loadMode(): WorkspaceMode {
  if (typeof window === "undefined") return "demo";
  try {
    return window.localStorage.getItem(MODE_KEY) === "live" ? "live" : "demo";
  } catch {
    return "demo";
  }
}

export function saveMode(mode: WorkspaceMode) {
  try {
    window.localStorage.setItem(MODE_KEY, mode);
  } catch {
    /* storage unavailable — the mode lasts this session only */
  }
}

export function loadGoLive(): GoLiveRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(GOLIVE_KEY);
    if (!raw) return null;
    const r = JSON.parse(raw) as GoLiveRecord;
    return r && typeof r.at === "string" ? r : null;
  } catch {
    return null;
  }
}

export function saveGoLive(r: GoLiveRecord | null) {
  try {
    if (r) window.localStorage.setItem(GOLIVE_KEY, JSON.stringify(r));
    else window.localStorage.removeItem(GOLIVE_KEY);
  } catch {
    /* as above */
  }
}

export type GateField =
  | "irbRef"
  | "irbDate"
  | "infosecRef"
  | "infosecDate"
  | "byName"
  | "ackIrb"
  | "ackInfosec"
  | "ackCodedOnly"
  | "ackLocalOnly";

/**
 * What is still missing before the gate opens.
 *
 * Returns the fields rather than a boolean, so the form can point at each one.
 * An empty array means it may open.
 */
export function missingForGoLive(draft: Partial<GoLiveRecord>): GateField[] {
  const out: GateField[] = [];
  const filled = (s?: string) => typeof s === "string" && s.trim().length >= 2;
  const dated = (s?: string) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
  if (!filled(draft.irbRef)) out.push("irbRef");
  if (!dated(draft.irbDate)) out.push("irbDate");
  if (!filled(draft.infosecRef)) out.push("infosecRef");
  if (!dated(draft.infosecDate)) out.push("infosecDate");
  if (!filled(draft.byName)) out.push("byName");
  if (!draft.ack?.irb) out.push("ackIrb");
  if (!draft.ack?.infosec) out.push("ackInfosec");
  if (!draft.ack?.codedOnly) out.push("ackCodedOnly");
  if (!draft.ack?.localOnly) out.push("ackLocalOnly");
  return out;
}

/** The phrase typed to leave live mode — deliberately not a single click. */
export const LEAVE_LIVE_PHRASE = { en: "END PILOT", he: "סיום פיילוט" };
