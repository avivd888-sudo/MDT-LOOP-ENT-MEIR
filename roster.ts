/**
 * The team roster as a lookup table.
 *
 * `member(id)` is called from inside render loops all over the application —
 * an audit trail line, a presenter's name, who took a loop — where a hook
 * would be awkward and a prop drill would touch every screen. So the roster is
 * a module-level registry rather than reactive state.
 *
 * That is safe here for one specific reason: the roster travels inside the same
 * shared snapshot as the loops and the board, so any change to it arrives
 * together with a state change that re-renders anyway. `setRoster` exists to
 * keep the registry in step with that snapshot, and is called from exactly one
 * place — the store. Nothing else should write to it.
 */

import type { TeamMember } from "./types";

/*
 * Deliberately empty at module load, and deliberately importing nothing from
 * `data.ts`: the seed roster lives there, `data.ts` re-exports this lookup, and
 * importing the seed back would close a cycle that fails at build time with an
 * uninitialised binding. `data.ts` seeds it instead, in one direction.
 */
let roster: TeamMember[] = [];

/** Replace the registry. Called by the store when the shared snapshot lands. */
export function setRoster(next: TeamMember[]) {
  if (Array.isArray(next) && next.length > 0) roster = next;
}

export function allMembers(): TeamMember[] {
  return roster;
}

/**
 * Look up a clinician.
 *
 * Falls back to a placeholder rather than throwing: a name that reads
 * "Unknown clinician" in an audit line is recoverable, a screen that crashes
 * because somebody was removed from the roster is not.
 */
export function member(id: string): TeamMember {
  const found = roster.find((m) => m.id === id);
  if (found) return found;
  return {
    id,
    name: "Unknown clinician",
    role: "No longer on the roster",
    discipline: "surgery",
    initials: "?",
    colour: "#6b7c8d",
  };
}
