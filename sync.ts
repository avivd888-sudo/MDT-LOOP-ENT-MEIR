/**
 * Shared state for a published build.
 *
 * The prototype kept everything in one browser tab, which is fine for a
 * demonstration and useless for a team: two clinicians could not see the same
 * loop. This module gives the published page one shared record that every
 * viewer reads and writes, so the platform becomes something a department can
 * actually run a pilot on.
 *
 * ── How it works ──────────────────────────────────────────────────────────
 *
 * A published artifact can write new versions of itself. We use the FILES form
 * of that write and keep the application state in `data/state.json`, separate
 * from the page:
 *
 *   - the page (`index.html`) never changes, so a save is a few kilobytes of
 *     JSON rather than a megabyte of inlined fonts;
 *   - after a files publish THIS view keeps running with its state intact —
 *     only other open views reload. Replacing the whole page instead would
 *     reload the acting clinician mid-task, every time they touched anything.
 *
 * ── What this is not ──────────────────────────────────────────────────────
 *
 * It is not a database. Writes are compare-and-set against the version this
 * view loaded, so when two people act inside the same moment one write is
 * rejected as `conflict`. For a tool whose whole claim is that nothing falls
 * through the cracks, silently dropping somebody's acknowledgement would be
 * the exact failure we exist to prevent — so a rejected save is not accepted
 * as a loss: the pending state is stashed, the current version re-read, the
 * action replayed on top of it and saved again. Only if that also fails does
 * the interface say so, in words, rather than pretending the work was kept.
 *
 * Everything degrades to local-only when the capability is absent (local
 * development, the offline single file, the walkthrough), which is why every
 * path here checks for `null` first.
 */

import { getLabelLang } from "./lang-state";

/**
 * The status line is written where the failure is detected, not in the badge,
 * because only here is it known which failure happened. It therefore has to
 * pick its own language — `useLang` is a hook and this is not a component.
 */
const d = (en: string, he: string) => (getLabelLang() === "he" ? he : en);

export type SyncStatus =
  | "local" // no capability — this browser only
  | "loading"
  | "ready"
  | "saving"
  | "saved"
  | "readonly" // this viewer may read but not write
  | "error";

export interface SyncState {
  status: SyncStatus;
  /** Human-readable detail for the error and read-only states. */
  detail?: string;
}

/** The one file the page owns. The page itself is never rewritten. */
const STATE_PATH = "data/state.json";
/** Survives the reload that a conflict triggers. */
const PENDING_KEY = "mdt-loop-pending-save";
/** Rapid edits collapse into one version rather than one version each. */
const DEBOUNCE_MS = 1200;

type ArtifactNamespace = {
  publish: (arg: unknown) => Promise<{ version: string }>;
};

type PublishError = { code?: string; message?: string };

/** Codes that mean "stop trying" — the viewer cannot write, ever, in this view. */
const READ_ONLY_CODES = new Set([
  "not_writer",
  "not_granted",
  "not_declared",
  "consent_required",
  "capability_disabled",
  "capability_removed",
]);

export class SharedState<T> {
  private ns: ArtifactNamespace | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private latest: T | null = null;
  private inFlight = false;
  private listeners = new Set<(s: SyncState) => void>();
  private state: SyncState = { status: "local" };

  subscribe(fn: (s: SyncState) => void): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }

  private set(next: SyncState) {
    this.state = next;
    this.listeners.forEach((fn) => fn(next));
  }

  /**
   * Resolve the capability and read the shared record.
   *
   * Returns the shared state, or `null` to mean "carry on with what you have":
   * either there is no capability here, or nothing has been saved yet and the
   * seed data is the right starting point.
   */
  async load(): Promise<T | null> {
    if (typeof window === "undefined") return null;
    const claude = (window as unknown as { claude?: { use?: (n: string) => Promise<unknown> } })
      .claude;
    if (!claude?.use) return null;

    this.set({ status: "loading" });
    try {
      const ns = (await claude.use("artifact")) as ArtifactNamespace | null;
      if (!ns || typeof ns.publish !== "function") {
        this.set({ status: "local" });
        return null;
      }
      this.ns = ns;
    } catch {
      this.set({ status: "local" });
      return null;
    }

    const loaded = await this.read();
    this.set({ status: "ready" });

    // A save that was interrupted by someone else's write is replayed here,
    // once, on top of whatever won.
    const pending = this.takePending();
    if (pending) {
      this.latest = pending as T;
      void this.flush();
      return pending as T;
    }
    return loaded;
  }

  /** Read `data/state.json` for the version this view is running. */
  private async read(): Promise<T | null> {
    try {
      const res = await fetch(`${STATE_PATH}?v=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return null; // nothing saved yet — seed data stands
      return (await res.json()) as T;
    } catch {
      return null;
    }
  }

  /** Queue a save. Rapid changes collapse into one published version. */
  save(next: T) {
    if (!this.ns) return;
    if (this.state.status === "readonly") return;
    this.latest = next;
    this.set({ status: "saving" });
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), DEBOUNCE_MS);
  }

  private stashPending(value: T) {
    try {
      window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(value));
    } catch {
      /* a full or disabled store must not break the save path */
    }
  }

  private takePending(): T | null {
    try {
      const raw = window.sessionStorage.getItem(PENDING_KEY);
      window.sessionStorage.removeItem(PENDING_KEY);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  private async flush(attempt = 0): Promise<void> {
    if (!this.ns || this.latest === null || this.inFlight) return;
    const payload = this.latest;
    this.inFlight = true;

    // Stashed *before* the call: a conflict reloads the page, and anything
    // held only in a JS variable would go with it.
    this.stashPending(payload);

    try {
      await this.ns.publish({ [STATE_PATH]: JSON.stringify(payload) });
      this.takePending();
      this.set({ status: "saved" });
    } catch (raw) {
      const err = (raw ?? {}) as PublishError;
      const code = err.code ?? "upstream_error";

      if (READ_ONLY_CODES.has(code)) {
        this.takePending();
        this.set({
          status: "readonly",
          detail: d(
            "You can view this board but not change it.",
            "אפשר לצפות בלוח הזה אך לא לשנות אותו.",
          ),
        });
        return;
      }

      if (code === "conflict" && attempt === 0) {
        // Somebody published first. The platform is reloading this view; the
        // stash above is what makes the replay possible once it comes back.
        this.set({
          status: "saving",
          detail: d("Someone else saved first — retrying.", "מישהו אחר שמר קודם — מנסה שוב."),
        });
        return;
      }

      if (code === "rate_limited" && attempt < 2) {
        this.inFlight = false;
        const wait = 4000 * (attempt + 1) + Math.random() * 1000;
        setTimeout(() => void this.flush(attempt + 1), wait);
        return;
      }

      if (code === "upstream_error" && attempt === 0) {
        this.inFlight = false;
        setTimeout(() => void this.flush(1), 1500 + Math.random() * 1000);
        return;
      }

      this.set({
        status: "error",
        detail:
          code === "too_large"
            ? d("The board has grown too large to save.", "הלוח גדל מכדי להישמר.")
            : d(
                "Your last change was not saved. Do not rely on it being recorded.",
                "השינוי האחרון שלך לא נשמר. אל תסתמכו על כך שהוא תועד.",
              ),
      });
    } finally {
      this.inFlight = false;
    }
  }
}
