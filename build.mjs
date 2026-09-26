/**
 * Builds the single-file version: JS + CSS inlined into one HTML file.
 *
 * The same application source components, with only two shims (next/link and
 * next/navigation) swapping Next's routing for hash-based routing.
 */
import * as esbuild from "esbuild";
import { execFileSync } from "node:child_process";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const APP = "/home/claude/ent-mdt";
const HERE = path.join(APP, "single");

/* ---- 1. CSS ---- */
execFileSync(
  path.join(APP, "node_modules/.bin/tailwindcss"),
  ["-i", path.join(HERE, "styles.css"), "-o", path.join(HERE, "out.css"), "--minify"],
  { stdio: "inherit", cwd: APP },
);
const css = readFileSync(path.join(HERE, "out.css"), "utf8");

/* ---- 2. JS ---- */
const result = await esbuild.build({
  entryPoints: [path.join(HERE, "entry.tsx")],
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2020"],
  jsx: "automatic",
  write: false,
  absWorkingDir: APP,
  define: { "process.env.NODE_ENV": '"production"' },
  loader: { ".tsx": "tsx", ".ts": "ts" },
  alias: {
    "next/link": path.join(HERE, "shims/link.tsx"),
    "next/navigation": path.join(HERE, "shims/navigation.ts"),
  },
  plugins: [
    {
      name: "app-alias",
      setup(build) {
        // "@/..." resolves against the Next project root; "@/app/..." against app/
        build.onResolve({ filter: /^@\// }, (args) => {
          const rel = args.path.slice(2);
          const candidates = [
            path.join(APP, rel + ".tsx"),
            path.join(APP, rel + ".ts"),
            path.join(APP, rel, "index.tsx"),
            path.join(APP, rel + "/page.tsx"),
          ];
          for (const c of candidates) {
            try {
              readFileSync(c);
              return { path: c };
            } catch {
              /* fall through */
            }
          }
          return { errors: [{ text: `Not found: ${args.path}` }] };
        });
      },
    },
  ],
});
const js = result.outputFiles[0].text;

/* ---- 2b. Embedded fonts ----
   Fonts are burned into the file rather than loaded from a CDN. An icon font
   that fails to load renders as raw text, and that is not a failure that can be
   allowed to happen during a live presentation. The icon font is subset down to
   the icons actually in use — 68KB instead of 3.8MB. */
const b64 = (p) => readFileSync(p).toString("base64");
const INTER = path.join(APP, "node_modules/@fontsource/inter/files");
const HEEBO = path.join(APP, "node_modules/@fontsource/heebo/files");
const fontCss = [
  ...[400, 500, 600, 700, 800].map(
    (w) => `@font-face{font-family:Inter;font-style:normal;font-weight:${w};font-display:swap;
src:url(data:font/woff2;base64,${b64(`${INTER}/inter-latin-${w}-normal.woff2`)}) format('woff2');}`,
  ),
  /* Hebrew subset only — Latin still comes from Inter, and shipping Heebo's
     Latin as well would embed a second copy of an alphabet already present. */
  ...[400, 500, 600, 700, 800].map(
    (w) => `@font-face{font-family:Heebo;font-style:normal;font-weight:${w};font-display:swap;
src:url(data:font/woff2;base64,${b64(`${HEEBO}/heebo-hebrew-${w}-normal.woff2`)}) format('woff2');}`,
  ),
  `@font-face{font-family:'Material Symbols Outlined';font-style:normal;font-weight:100 700;font-display:block;
src:url(data:font/woff2;base64,${b64("/tmp/ms-subset.woff2")}) format('woff2');}`,
].join("\n");

/* ---- 3. HTML ---- */
/* No inline direction script here, unlike the server build: this page has no
   server-rendered markup to mismatch, so `entry.tsx` sets the direction from
   the stored preference before it mounts anything. */
const html = `<!doctype html>
<html lang="he" dir="rtl">
<meta charset="utf-8">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 64 64%27%3E%3Crect width=%2764%27 height=%2764%27 rx=%2714%27 fill=%27%23137fec%27/%3E%3Cpath d=%27M32 32C32 22 16 22 16 32C16 42 32 42 32 32C32 22 48 22 48 32C48 42 32 42 32 32Z%27 fill=%27none%27 stroke=%27%23fff%27 stroke-width=%275%27/%3E%3C/svg%3E">
<title>MDT Loop — Head &amp; Neck</title>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>${fontCss}</style>
<style>${css}</style>
<div id="root"></div>
<script>
  if (!location.hash) location.hash = "/";
</script>
<script>${js}</script>
`;

writeFileSync(path.join(HERE, "mdt-loop.html"), html);
console.log(
  `Built: ${(html.length / 1024).toFixed(0)} KB  (JS ${(js.length / 1024).toFixed(0)} KB · CSS ${(css.length / 1024).toFixed(0)} KB)`,
);
