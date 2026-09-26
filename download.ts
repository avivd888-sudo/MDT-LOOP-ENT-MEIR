/**
 * Handing a generated file to whoever is looking at the page.
 *
 * In the published build the platform offers the viewer a save dialogue, which
 * they may decline — so a save is never assumed to have happened. Everywhere
 * else (local development, the offline single file) an object URL does the same
 * job. Both paths report back honestly, because a research export that silently
 * did not save is worse than one that visibly failed.
 */
export type SaveOutcome = "saved" | "declined" | "unavailable";

export async function saveFile(filename: string, data: string): Promise<SaveOutcome> {
  if (typeof window === "undefined") return "unavailable";

  const claude = (window as unknown as { claude?: { use?: (n: string) => Promise<unknown> } })
    .claude;

  if (claude?.use) {
    try {
      const downloads = (await claude.use("downloads")) as {
        save?: (arg: { filename: string; data: string }) => Promise<unknown>;
      } | null;
      if (downloads?.save) {
        await downloads.save({ filename, data });
        return "saved";
      }
    } catch {
      // The viewer declined, or the capability refused. Either way the file was
      // not written; fall through to the browser path rather than claim success.
      return "declined";
    }
  }

  try {
    const blob = new Blob([data], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return "saved";
  } catch {
    return "unavailable";
  }
}
