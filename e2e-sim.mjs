/**
 * The simulation, end to end in the browser.
 *
 *   1. coded mode is the default, and no name is visible anywhere
 *   2. the 20-patient simulation loads, and every screen renders it
 *   3. the pilot screen shows exactly the numbers the metrics module computes
 *   4. a live exchange between clinicians — radiation oncology asks dentistry,
 *      dentistry acknowledges and answers, dentistry cannot close, the asker
 *      closes — and the pilot counts it
 *   5. the CSV export is identifier-free and matches the workbook's columns
 *   6. switching coded mode off shows names again
 *
 * Needs the static build served on 4173 (`node preview.mjs`), or
 * BASE=file:///…/mdt-loop.html#  for the single file.
 */
import { chromium } from "playwright";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const BASE = process.env.BASE ?? "http://127.0.0.1:4173";
const HASH = BASE.includes("#");
const url = (p) => (HASH ? `${BASE}${p.replace(/\/$/, "") || "/"}` : `${BASE}${p}`);
const OUT = "/home/claude/shots/sim";
mkdirSync(OUT, { recursive: true });

const M = JSON.parse(readFileSync("test/out/metrics.json", "utf8"));
const SIM = JSON.parse(readFileSync("test/out/sim.json", "utf8"));
const names = SIM.patients.map((p) => p.name.split(",")[0]);

const errors = [];
const passed = [];
const ok = (name, cond, detail = "") => (cond ? passed.push(name) : errors.push(`${name} ${detail}`));

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, acceptDownloads: true });
await ctx.addInitScript(() => { try { localStorage.setItem("mdt-loop-lang", "en"); } catch {} });
const page = await ctx.newPage();
page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
const go = async (p) => { await page.goto(url(p), { waitUntil: "networkidle" }); await page.waitForTimeout(350); };
const text = () => page.evaluate(() => document.body.innerText);
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png`, fullPage: true });

async function signIn(who) {
  await go("/login/");
  await page.getByRole("radio", { name: new RegExp(who) }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForTimeout(500);
}

/* 1–2. Load the simulation as Dr. Katz */
await signIn("Dr. Maya Katz");
await go("/more/");
ok("coded mode is on by default", (await text()).includes("Coded mode — on"));
await page.getByRole("button", { name: /Load the 20-patient simulation/ }).click();
await page.waitForTimeout(600);

await go("/patients/");
const cards = await page.locator('a[href*="/patients/sim-"]').count();
ok("patient list shows the 20 simulated patients", cards === 20, `(${cards})`);
let t = await text();
ok("study IDs are shown", SIM.patients.every((p) => t.includes(p.studyId)), SIM.patients.filter((p) => !t.includes(p.studyId)).map((p) => p.studyId).join(" "));
ok("no patient name visible in coded mode", !names.some((n) => t.includes(n)), names.filter((n) => t.includes(n)).join(","));
ok("no national ID visible in coded mode", !SIM.patients.some((p) => t.includes(p.nationalId)));
await shot("01-patients-coded");

await go("/patients/sim-06/");
t = await text();
ok("patient record opens by study ID", t.includes(SIM.patients[5].studyId));
ok("record shows the identity-verification reminder", t.includes("verify identity in the Clalit record"));
await shot("02-patient-coded");

/* 3. The pilot screen against the metrics module */
await go("/pilot/");
t = await text();
const f1 = (v) => (v % 1 ? v.toFixed(1) : String(v));
const expect = [
  ["enrolled 20 of 20", `20\nof 20`],
  ["median primary", M.primary.median.toFixed(1)],
  ["IQR primary", `${M.primary.q1.toFixed(1)}–${M.primary.q3.toFixed(1)}`],
  ["range primary", `${M.primary.min}–${M.primary.max}`],
  ["SD shown (n ≥ 10)", M.primary.sd.toFixed(1)],
  ["surgical median", f1(M.primaryBy.surgical.median)],
  ["non-surgical median", f1(M.primaryBy["non-surgical"].median)],
  ["≤30 days", `${Math.round(M.thresholds.within30.rate * 100)}% ${M.thresholds.within30.n}/${M.thresholds.within30.of}`],
  [">60 days", `${Math.round(M.thresholds.over60.rate * 100)}% ${M.thresholds.over60.n}/${M.thresholds.over60.of}`],
  [">67 days", `${Math.round(M.thresholds.over67.rate * 100)}% ${M.thresholds.over67.n}/${M.thresholds.over67.of}`],
  ["MoH 1/2020", `${Math.round(M.thresholds.moh30.rate * 100)}% ${M.thresholds.moh30.n}/${M.thresholds.moh30.of}`],
  ["loops opened", `Loops opened\n${M.loopsOpened}`],
  ["closure rate", `${Math.round(M.closureRate * 100)}%`],
  ["board deferrals", `${M.boardDeferred} deferred of ${M.boardCases} presentations`],
  ["split", `${M.surgical} primary surgery · ${M.nonSurgical} radiotherapy or chemoradiation`],
];
const flat = (x) => x.replace(/\s+/g, " ").toLowerCase();
for (const [name, s] of expect) ok(`pilot shows ${name} (${flat(s)})`, flat(t).includes(flat(s)), `— near: ${JSON.stringify(flat(t).slice(Math.max(0, flat(t).indexOf(flat(s).split(" ")[0]) - 20), flat(t).indexOf(flat(s).split(" ")[0]) + 60))}`);
ok("pilot names the shadow system", t.includes("A shadow system"));
ok("stopping floor reported as passed", t.includes("Above the 60% stopping floor"));
await shot("03-pilot");

/* 4. A live exchange between clinicians */
await go("/loops/new/");
await page.selectOption("select >> nth=0", "sim-20");
await page.selectOption("select >> nth=1", "dental-clearance");
await page.waitForTimeout(200);
await page.selectOption("select >> nth=2", "dentistry");
await page.getByPlaceholder(/Who the patient is/).fill("Post-cricoid SCC for radical radiotherapy, mask fitting booked.");
await page.getByPlaceholder(/For example: is there invasion/).fill("Please confirm the fluoride trays are ready before the first fraction.");
await page.getByRole("button", { name: "Open the loop" }).click();
await page.waitForURL(HASH ? /#\/loops\/l-\d+/ : /\/loops\/l-\d+/);
const loopUrl = page.url();
const loopPath = loopUrl.replace(/^.*?(\/loops\/l-\d+).*$/, "$1/");
ok("loop opened by radiation oncology", (await text()).includes("Waiting"));

// Dentistry picks it up
await signIn("Dr. Oren Tamir");
await go(loopPath);
await page.getByRole("button", { name: "Acknowledge receipt" }).click();
await page.waitForTimeout(300);
await page.getByPlaceholder(/Answer the request as written/).fill("Trays fitted today; fluoride gel issued. Ready for fraction 1.");
await page.getByRole("button", { name: "Send answer" }).click();
await page.waitForTimeout(400);
t = await text();
ok("dentistry acknowledged and answered", t.includes("Trays fitted today"));
ok("the answerer cannot close the loop", (await page.getByRole("button", { name: "Close the loop" }).count()) === 0);
await shot("04-loop-answered-by-dentistry");

// A different discipline cannot answer a dentistry loop either
await signIn("Dr. Ronen Shani");
await go(loopPath);
ok("pathology sees no acknowledge/answer controls on a dentistry loop", (await page.getByRole("button", { name: /Acknowledge receipt|Send answer/ }).count()) === 0);

// The asker closes
await signIn("Dr. Maya Katz");
await go(loopPath);
await page.getByPlaceholder(/What was done as a result/).fill("Confirmed with the dental clinic; first fraction goes ahead as planned.");
await page.getByRole("button", { name: "Close the loop" }).click();
await page.waitForTimeout(500);
t = await text();
ok("closed by the person who asked", t.includes("Confirmed by the person who asked"));
await shot("05-loop-closed-by-asker");

await go("/pilot/");
t = await text();
ok("pilot counts the new loop", flat(t).includes(flat(`Loops opened ${M.loopsOpened + 1}`)), JSON.stringify(flat(t).slice(flat(t).indexOf("loops opened"), flat(t).indexOf("loops opened") + 40)));

/* 5. Export */
const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Export the cohort as CSV/ }).click()]);
const csvPath = `${OUT}/export.csv`;
await dl.saveAs(csvPath);
const csv = readFileSync(csvPath, "utf8").replace(/^﻿/, "");
const [head, ...rows] = csv.trim().split("\n");
ok("export has 20 rows", rows.length === 20, `(${rows.length})`);
ok("export header matches the workbook keys", head.startsWith("id,seq,site,side,age,sex,ecog,cT,cN,cM,stage,p16,t0,mdt1,dec,pmod,orref,rtref,tx,amod,dec2,adj"));
ok("export carries no name or national ID", !names.some((n) => csv.includes(n)) && !SIM.patients.some((p) => csv.includes(p.nationalId)));

/* Board screen renders a simulated session */
await go("/board/ss-3/");
ok("simulated board session renders", (await text()).includes("Agenda"));
await shot("06-board");

/* 6. Coded mode off */
await go("/more/");
await page.getByRole("button", { name: /Coded mode/ }).click();
await go("/patients/");
t = await text();
ok("names visible when coded mode is off", names.slice(0, 3).every((n) => t.includes(n)));
await shot("07-patients-identified");

await browser.close();
console.log(`✓ ${passed.length} passed`);
passed.forEach((p) => console.log("  ✓", p));
if (errors.length) { console.log(`✗ ${errors.length} problems`); errors.forEach((e) => console.log("  ✗", e)); process.exitCode = 1; }
