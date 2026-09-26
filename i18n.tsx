"use client";

/**
 * Language, and the direction that comes with it.
 *
 * ── Why a toggle and not simply a Hebrew build ────────────────────────────
 *
 * The department works in Hebrew; the clinical vocabulary, the guidelines, the
 * staging manuals and the audience at an innovation competition work in
 * English. Hardcoding one of them throws the other away. So both live in the
 * source, side by side, and the person reading chooses.
 *
 * ── Why `t(en, he)` and not `t("loops.title")` ────────────────────────────
 *
 * Keys are the textbook answer and they are wrong here. A key-indirected
 * dictionary means every string in the application is written twice — once as
 * an invented name at the call site, once as text in a file nobody opens —
 * and the two drift. This application's text is not decoration: a good part of
 * it argues with the reader ("that is the failure this system exists to make
 * visible"), and prose like that has to be edited where it is read, with its
 * translation next to it, or the two stop meaning the same thing.
 *
 * The cost is that the source carries both languages in view. That is the
 * intended trade: a visible pair that cannot drift beats a tidy key that can.
 *
 * Longer passages that carry markup inside them are written as two branches on
 * `lang` rather than forced through `t`, because a sentence with a <strong> in
 * the middle of it does not survive being cut into fragments.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { setLabelLang } from "./lang-state";
import type { Lang } from "./lang-state";

export type { Lang };

/** Hebrew is the default: this is a department in Kfar Saba, not a conference. */
export const DEFAULT_LANG: Lang = "he";

export const LANG_KEY = "mdt-loop-lang";

interface LangValue {
  lang: Lang;
  rtl: boolean;
  setLang: (l: Lang) => void;
  /** Pick the string for the current language. English first, always. */
  t: (en: string, he: string) => string;
}

const LangContext = createContext<LangValue | null>(null);

export function readStoredLang(): Lang {
  if (typeof window === "undefined") return DEFAULT_LANG;
  try {
    const v = window.localStorage.getItem(LANG_KEY);
    return v === "en" || v === "he" ? v : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

/**
 * Applied to <html> rather than to a wrapper div.
 *
 * `dir` inherits, and a great deal of the browser's own behaviour keys off the
 * document element specifically — scrollbar side, form controls, the direction
 * a text cursor moves in. Setting it on a div gets most of the way and then
 * fails in the places that are hardest to notice.
 */
export function applyLang(lang: Lang) {
  /* Before anything renders, so the clinical vocabulary tables are already
     answering in the new language by the time a component reads one. */
  setLabelLang(lang);
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  el.setAttribute("lang", lang);
  el.setAttribute("dir", lang === "he" ? "rtl" : "ltr");
}

export function LangProvider({
  children,
  initial,
}: {
  children: ReactNode;
  /**
   * Only the single-file build passes this. There, the page has no
   * server-rendered markup, so the stored preference can be honoured on the
   * very first render. In the server build it must not be: the first render
   * has to match what the server produced or React throws the markup away and
   * the page flashes, so that build starts at the default and corrects itself
   * on mount, behind an inline script that has already set `dir`.
   */
  initial?: Lang;
}) {
  const [lang, setLangState] = useState<Lang>(initial ?? DEFAULT_LANG);

  useEffect(() => {
    const stored = readStoredLang();
    setLangState(stored);
    applyLang(stored);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    applyLang(l);
    try {
      window.localStorage.setItem(LANG_KEY, l);
    } catch {
      /* the choice lasts for this view only */
    }
  }, []);

  const value = useMemo<LangValue>(
    () => ({
      lang,
      rtl: lang === "he",
      setLang,
      t: (en: string, he: string) => (lang === "he" ? he : en),
    }),
    [lang, setLang],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangValue {
  const ctx = useContext(LangContext);
  /*
   * Deliberately not a throw. `useLang` is called from every component in the
   * application, and a missing provider should degrade to the default language
   * rather than take the screen down. It falls back to the same default the
   * label tables use, so a component without a provider cannot end up with its
   * prose in one language and its clinical vocabulary in the other.
   */
  return (
    ctx ?? {
      lang: DEFAULT_LANG,
      rtl: DEFAULT_LANG === "he",
      setLang: () => {},
      t: (en: string, he: string) => (DEFAULT_LANG === "he" ? he : en),
    }
  );
}

/**
 * The script that runs before the first paint.
 *
 * Without it the document is laid out left-to-right, the stored preference is
 * read a moment later, and everything on screen jumps to the other side. Small
 * enough to inline; it must not depend on anything that has not loaded yet.
 */
export const LANG_BOOT_SCRIPT = `(function(){try{var l=localStorage.getItem(${JSON.stringify(
  LANG_KEY,
)});if(l!=="en"&&l!=="he")l=${JSON.stringify(
  DEFAULT_LANG,
)};document.documentElement.setAttribute("lang",l);document.documentElement.setAttribute("dir",l==="he"?"rtl":"ltr");}catch(e){}})();`;
