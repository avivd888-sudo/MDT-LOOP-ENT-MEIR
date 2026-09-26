/**
 * MDT Loop ENT — competition demo recording (Hebrew, phone-shaped).
 *
 *   node record-demo.mjs
 *
 * Records a ≤60s walkthrough of the single-file app with Playwright, then
 * transcodes to H.264/yuv420p mp4 so it plays inside PowerPoint and Keynote.
 *
 * Beats, in order:
 *   1. #/loops      — counters + the violet "answered but not closed" callout
 *   2. #/loops/l-3  — the four-stage chain and the SBAR request
 *   3. #/board/s-1  — a case with its blocking prerequisites
 *   4. #/team       — the beta configuration card listing the disciplines
 *   5. #/pilot      — the consecutive-cohort card and the withheld SD
 */
import { chromium } from "/home/claude/ent-mdt/node_modules/playwright/index.mjs";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, readdirSync, statSync, renameSync } from "node:fs";
import { join } from "node:path";

const APP = "file:///home/claude/ent-mdt/single/mdt-loop.html";
const RAW_DIR = "/tmp/mdt-loop-demo-raw";
const DELIVER_DIR = "/home/claude/deliver";
const OUT_MP4 = join(DELIVER_DIR, "MDT-Loop-ENT-הדגמה.mp4");

// Phone-shaped. deviceScaleFactor 2 means the compositor surface is 860×1864
// physical pixels, so a video of that size is a true 2x capture, not an upscale.
const VW = 430;
const VH = 932;
const DSF = 2;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Eased scroll inside the page so the footage never jump-cuts.
 * The bottom tab bar is in normal flow, not fixed, so stopping a few pixels
 * short of the page bottom slices its labels in half — snap to the bottom.
 */
async function glideTo(page, y, ms) {
  await page.evaluate(
    ({ y, ms }) =>
      new Promise((done) => {
        const max = document.scrollingElement.scrollHeight - window.innerHeight;
        if (y > max - 40) y = max;
        const start = window.scrollY;
        const dist = y - start;
        const t0 = performance.now();
        const step = (t) => {
          const p = Math.min(1, (t - t0) / ms);
          const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
          window.scrollTo(0, start + dist * e);
          if (p < 1) requestAnimationFrame(step);
          else done();
        };
        requestAnimationFrame(step);
      }),
    { y, ms }
  );
  await wait(120);
}

/** Scroll so the element whose text contains `needle` sits `offset` px from the top. */
async function glideToText(page, needle, offset, ms, fallbackY) {
  const y = await page.evaluate(
    ({ needle, offset }) => {
      const els = [...document.querySelectorAll("h1,h2,h3,h4,p,span,div,li")];
      const hit = els
        .filter((el) => (el.textContent || "").trim().includes(needle))
        .sort((a, b) => a.getBoundingClientRect().height - b.getBoundingClientRect().height)[0];
      if (!hit) return null;
      return Math.max(0, Math.round(window.scrollY + hit.getBoundingClientRect().top - offset));
    },
    { needle, offset }
  );
  await glideTo(page, y ?? fallbackY, ms);
  return y ?? fallbackY;
}

async function goRoute(page, route) {
  await page.evaluate((r) => {
    window.scrollTo(0, 0);
    window.location.hash = r;
  }, route);
  await wait(700);
}

async function main() {
  rmSync(RAW_DIR, { recursive: true, force: true });
  mkdirSync(RAW_DIR, { recursive: true });
  mkdirSync(DELIVER_DIR, { recursive: true });

  const problems = [];
  const browser = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    args: ["--no-sandbox", "--force-device-scale-factor=2", "--hide-scrollbars"],
  });

  const context = await browser.newContext({
    viewport: { width: VW, height: VH },
    deviceScaleFactor: DSF,
    recordVideo: { dir: RAW_DIR, size: { width: VW * DSF, height: VH * DSF } },
  });

  // Hebrew is the department's language and the app's default; set it before boot.
  await context.addInitScript(() => {
    try {
      localStorage.setItem("mdt-loop-lang", "he");
    } catch {}
  });

  const page = await context.newPage();
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(`console.error: ${m.text()}`);
  });

  const recStart = Date.now();

  await page.goto(`${APP}#/loops`, { waitUntil: "load" });
  await page.waitForSelector("text=לולאות", { timeout: 15000 });
  await wait(900); // let fonts and the first paint settle
  const trimFrom = (Date.now() - recStart) / 1000; // drop the blank lead-in later

  // ── Beat 1 · the loop board ────────────────────────────────────────────────
  // Counters (breach / not closed / on me) and the violet callout: a request
  // that was answered but never confirmed.
  await wait(3000);
  await glideTo(page, 230, 1100);
  await wait(3000);

  // ── Beat 2 · one loop ──────────────────────────────────────────────────────
  await goRoute(page, "#/loops/l-3");
  await wait(3000); // four-stage chain: נפתחה · נקלטה · נענתה · נסגרה
  await glideToText(page, "SBAR", 60, 1100, 330);
  await wait(3200); // the SBAR request itself
  await glideTo(page, 764, 1200);
  await wait(2800); // the answer, and the close-the-loop confirmation

  // ── Beat 3 · the tumour board ──────────────────────────────────────────────
  await goRoute(page, "#/board/s-1");
  await wait(3000); // quorum, and loops auto-escalated to the board
  await glideToText(page, "נדרש לדיון", 470, 1300, 620);
  await wait(3400); // a case held by its blocking prerequisites

  // ── Beat 4 · the team ──────────────────────────────────────────────────────
  await goRoute(page, "#/team");
  await wait(2000);
  await glideToText(page, "הבטא מוגדרת לדיסציפלינות", 120, 900, 170);
  await wait(3600); // beta configuration card, discipline by discipline

  // ── Beat 5 · the pilot ─────────────────────────────────────────────────────
  await goRoute(page, "#/pilot");
  await wait(3200); // consecutive cohort — 5 of 20, nobody hand-picked
  await glideToText(page, "מהפניה עד החלטה", 120, 1200, 560);
  await wait(3400); // the secondary outcome, with the SD withheld
  await wait(600);

  await context.close();
  await browser.close();

  // ── Locate the raw webm ────────────────────────────────────────────────────
  const webm = readdirSync(RAW_DIR).find((f) => f.endsWith(".webm"));
  if (!webm) throw new Error("Playwright produced no video file");
  const rawPath = join(RAW_DIR, webm);

  // ── Transcode to mp4 (H.264, yuv420p) for PowerPoint / Keynote ─────────────
  let delivered = OUT_MP4;
  let format = "mp4 (H.264 / yuv420p)";
  try {
    execFileSync("ffmpeg", [
      "-y",
      "-ss", trimFrom.toFixed(2),
      "-i", rawPath,
      "-vf", "fps=30,scale=trunc(iw/2)*2:trunc(ih/2)*2",
      "-c:v", "libx264",
      "-preset", "slow",
      "-crf", "20",
      "-pix_fmt", "yuv420p",
      "-profile:v", "high",
      "-level", "4.1",
      "-movflags", "+faststart",
      "-an",
      OUT_MP4,
    ], { stdio: "inherit" });
  } catch (e) {
    delivered = join(DELIVER_DIR, "MDT-Loop-ENT-הדגמה.webm");
    format = "webm (VP8) — ffmpeg transcode failed";
    renameSync(rawPath, delivered);
  }

  // ── Report ─────────────────────────────────────────────────────────────────
  let probe = "";
  try {
    probe = execFileSync("ffprobe", [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=width,height,duration,nb_frames,codec_name,pix_fmt",
      "-of", "default=noprint_wrappers=1",
      delivered,
    ]).toString();
  } catch {}

  console.log("\n───────── demo recording ─────────");
  console.log("file      :", delivered);
  console.log("format    :", format);
  console.log("size      :", (statSync(delivered).size / 1024 / 1024).toFixed(2), "MB");
  console.log("trimmed   :", trimFrom.toFixed(2), "s of blank lead-in");
  console.log(probe.trim());
  console.log("console   :", problems.length ? problems.join("\n            ") : "no errors");
  console.log("──────────────────────────────────\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
