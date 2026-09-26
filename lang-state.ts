/**
 * The current language, as a module-level value, and the helper that makes a
 * label table bilingual.
 *
 * ── Why this is not a hook ────────────────────────────────────────────────
 *
 * The clinical vocabulary tables (`DISCIPLINE_LABEL`, `SUBSITE_LABEL`, …) are
 * read from roughly sixty call sites, most of them inside render loops and
 * several inside pure functions in `lib/` that are not components at all and
 * cannot call a hook. Turning every one of them into `useLabels()` would mean
 * threading a hook through the metric and pathway modules, which have no
 * business knowing what language anything is displayed in.
 *
 * So the tables stay plain objects that are indexed exactly as before, and the
 * language they answer in is module state — the same shape as `lib/roster.ts`,
 * for the same reason. It is safe because `setLabelLang` is called
 * *synchronously before* the state update that re-renders the tree, so by the
 * time any component reads a label the table is already answering in the new
 * language. Nothing reads a label outside a render.
 *
 * This file imports nothing. That is deliberate: the last time a registry
 * module imported from the module that fed it, the resulting cycle passed
 * typecheck and failed the production build with an uninitialised binding
 * reported against an unrelated route.
 */

export type Lang = "he" | "en";

let labelLang: Lang = "he";

export function setLabelLang(l: Lang) {
  labelLang = l;
}

export function getLabelLang(): Lang {
  return labelLang;
}

/**
 * A label table that answers in whichever language is current.
 *
 * A Proxy rather than a function call, so that all sixty existing call sites —
 * `DISCIPLINE_LABEL[d]`, `Object.entries(SUBSITE_LABEL)`, and the rest — keep
 * working unchanged and keep their types. The English table is the proxy
 * target, so key enumeration, `in`, and spread all behave as they did.
 */
export function bilingual<K extends string>(
  en: Record<K, string>,
  he: Record<K, string>,
): Record<K, string> {
  return new Proxy(en, {
    get(target, key) {
      if (typeof key !== "string") return Reflect.get(target, key);
      const table = labelLang === "he" ? he : en;
      return (table as Record<string, string>)[key] ?? (target as Record<string, string>)[key];
    },
  });
}
