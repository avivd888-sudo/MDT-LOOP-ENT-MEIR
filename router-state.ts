/** Routing state shared between the shims and the router. */

const listeners = new Set<(p: string) => void>();

export function currentPath(): string {
  if (typeof window === "undefined") return "/";
  const raw = window.location.hash.replace(/^#/, "");
  return raw || "/";
}

export function navigate(path: string) {
  if (typeof window === "undefined") return;
  window.location.hash = path;
  // Scroll to the top on every navigation — Next's default behaviour
  requestAnimationFrame(() => {
    document.querySelector("main")?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  });
}

export function subscribe(fn: (p: string) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

if (typeof window !== "undefined") {
  window.addEventListener("hashchange", () => {
    const p = currentPath();
    listeners.forEach((fn) => fn(p));
  });
}
