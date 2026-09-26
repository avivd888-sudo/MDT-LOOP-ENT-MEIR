"use client";

/** Stand-in for next/navigation in the single-file build. */
import { useEffect, useState } from "react";
import { currentPath, navigate, subscribe } from "./router-state";

export function usePathname(): string {
  const [path, setPath] = useState(currentPath());
  useEffect(() => subscribe(setPath) as unknown as () => void, []);
  return path;
}

export function useRouter() {
  return {
    push: (p: string) => navigate(p),
    replace: (p: string) => navigate(p),
    back: () => window.history.back(),
    forward: () => window.history.forward(),
    refresh: () => {},
    prefetch: () => {},
  };
}

export function useSearchParams() {
  return new URLSearchParams();
}
