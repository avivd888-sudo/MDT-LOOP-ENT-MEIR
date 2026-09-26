"use client";

/**
 * Stand-in for next/link in the single-file build.
 *
 * The published preview is a single HTML file, so there is no server routing.
 * Links are translated into hash-based navigation through the small router in
 * router.tsx, which keeps the component code identical to the Next build.
 */
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { navigate } from "./router-state";

export default function Link({
  href,
  children,
  ...rest
}: { href: string; children?: ReactNode } & Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
>) {
  return (
    <a
      href={`#${href}`}
      onClick={(e) => {
        e.preventDefault();
        navigate(href);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
