/**
 * The gate between the demonstration and real use.
 *
 * This is the one path in the application where a bug is not a cosmetic
 * problem: either an empty board opens without the approvals being asserted,
 * or a pilot board silently keeps demonstration patients in it, or coded mode
 * comes off while real patients are on screen. Each of those is checked here.
 *
 *   1. the gate refuses an incomplete form and stays in demo mode
 *   2. a complete form opens an EMPTY board, in live mode
 *   3. live mode hides the simulation and the reset, and locks coded mode on
 *   4. live and demo boards are stored under different keys and never mix
 *   5. the state survives a reload
 *   6. leaving live mode restores the demonstration
 *
 * Needs the static build served on 4173 (`node preview.mjs`).
 */
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://127.0.0.1:4173";
const HASH = BASE.includes("#");
const url = (p) => (HASH ? `${BASE}${p.replace(/\/$/, "") || "/"}` : `${BASE}${p}`);

const errors = [];
const passed = [];
const ok = (name, cond, detail = "") =>
  cond ? passed.push(name) : errors.push(`${name} ${detail}`);

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox"],
});
const ctx = await browser.newContext({ viewport: { width: 430, height: 932 } });
await ctx.addInitScript(() => {
  try {
    localStorage.setItem("mdt-loop-lang", "en");
  } catch {}
});
const page = await ctx.newPage();
page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

const go = async (p) => {
  await page.goto(url(p), { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
};
const text = () => page.evaluate(() => document.body.innerText);
const ls = (k) => page.evaluate((key) => localStorage.getItem(key), k);
const ss = (k) => page.evaluate((key) => sessionStorage.getItem(key), k);

/* Sign in, and put something in the demo board so we can prove it survives. */
await go("/login/");
await page.getByRole("radio", { name: /Dr. Maya Katz/ }).click();
await page.getByRole("button", { name: "Sign in", exact: true }).click();
await page.waitForTimeout(500);

await go("/more/");
await page.getByRole("button", { name: /Load the 20-patient simulation/ }).click();
await page.waitForTimeout(600);
await go("/patients/");
const demoCount = await page.locator('a[href*="/patients/"]').count();
ok("demo board has patients before the gate", demoCount > 10, `(${demoCount})`);

/* 1. Refuse an incomplete form. */
await go("/more/");
ok("the workspace card is on the More screen", (await text()).includes("Demonstration — start real use"));
await go("/golive/");
await page.getByRole("button", { name: /Open an empty board/ }).click();
await page.waitForTimeout(400);
ok("an empty form does not open a live board", page.url().includes("golive"));
ok("nothing was written to the go-live record", (await ls("mdt-loop-golive")) === null);
ok("the mode is still demo", (await ls("mdt-loop-mode")) !== "live");
ok("the form says what is missing", /still missing/i.test(await text()));

/* Fill everything except one checkbox — still refused. */
const fill = async (label, value) => {
  await page.getByLabel(new RegExp(label)).fill(value);
};
await fill("Helsinki \\(IRB\\) approval number", "MMC-0123-26");
await page.locator('input[type="date"]').first().fill("2026-09-01");
await fill("Clalit information-security approval", "IS-2026-77");
await page.locator('input[type="date"]').nth(1).fill("2026-09-10");
await fill("Who is recording this", "Dr Aviv Daniel");

const checks = page.locator('button[aria-pressed]');
const nChecks = await checks.count();
ok("four confirmations are offered", nChecks === 4, `(${nChecks})`);
for (let i = 0; i < 3; i++) await checks.nth(i).click();
await page.getByRole("button", { name: /Open an empty board/ }).click();
await page.waitForTimeout(400);
ok("three of four confirmations is not enough", page.url().includes("golive"));
ok("still no go-live record", (await ls("mdt-loop-golive")) === null);

/* 2. Complete it. */
await checks.nth(3).click();
await page.getByRole("button", { name: /Open an empty board/ }).click();
await page.waitForTimeout(800);
ok("a complete form opens the board", !page.url().includes("golive"), `(${page.url()})`);
ok("the mode is live", (await ls("mdt-loop-mode")) === "live");

const rec = JSON.parse((await ls("mdt-loop-golive")) ?? "{}");
ok("the approval numbers are recorded", rec.irbRef === "MMC-0123-26" && rec.infosecRef === "IS-2026-77");
ok("the person is recorded", rec.byName === "Dr Aviv Daniel");
ok("the four acknowledgements are recorded", Object.values(rec.ack ?? {}).filter(Boolean).length === 4);
ok("the moment is recorded", typeof rec.at === "string" && rec.at.length > 10);

/* 3. The board is empty, and says it is live. */
await go("/patients/");
const liveCount = await page.locator('a[href*="/patients/sim-"]').count();
ok("the live board opens empty", liveCount === 0, `(${liveCount})`);
const t3 = await text();
ok("the live banner is shown", /Live use/.test(t3));
ok("the demonstration banner is gone", !/Demonstration build/.test(t3));

await go("/more/");
const t4 = await text();
ok("the simulation button is gone in live mode", !/Load the 20-patient simulation/.test(t4));
ok("the reset button is gone in live mode", !/Reset the demonstration/.test(t4));
ok("coded mode is locked on", /Coded mode — on/.test(t4) && /Locked on in live mode/.test(t4));
ok("the attestation is shown back", t4.includes("MMC-0123-26") && t4.includes("IS-2026-77"));

/* Not `.first()` — the language toggle is an aria-pressed button too. */
const codedBtn = page.locator('button[aria-pressed]').filter({ hasText: "Coded mode" });
ok("the coded toggle is disabled", await codedBtn.isDisabled());

/* 4. The two boards are kept apart. */
ok("the live board has its own key", (await ls("ent-mdt-live-v1")) !== null);
const demoSnap = await ss("ent-mdt-demo-v2");
ok("the demo board is untouched in sessionStorage", demoSnap !== null && demoSnap.includes("sim-"));
ok("the live board has no simulated patient in it", !((await ls("ent-mdt-live-v1")) ?? "").includes("sim-"));

/* 5. Survives a reload. */
await go("/patients/");
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(500);
ok("still live after a reload", (await ls("mdt-loop-mode")) === "live");
ok("still empty after a reload", (await page.locator('a[href*="/patients/sim-"]').count()) === 0);
ok("still says live after a reload", /Live use/.test(await text()));

/* 6. Leaving live mode. */
await go("/more/");
await page.getByRole("button", { name: /End the pilot on this browser/ }).click();
await page.waitForTimeout(300);
const back = page.getByRole("button", { name: /Back to the demonstration/ });
ok("the way out is disabled until the phrase is typed", await back.isDisabled());
await page.getByLabel(/Confirmation phrase/).fill("END PILOT");
await page.waitForTimeout(200);
ok("the phrase enables it", !(await back.isDisabled()));
await back.click();
await page.waitForTimeout(600);
ok("back in demo mode", (await ls("mdt-loop-mode")) !== "live");
ok("the attestation is cleared", (await ls("mdt-loop-golive")) === null);
ok("the pilot board was kept, not erased", (await ls("ent-mdt-live-v1")) !== null);
await go("/patients/");
ok("the demonstration board is back", (await page.locator('a[href*="/patients/"]').count()) > 10);
ok("the demonstration banner is back", /Demonstration build/.test(await text()));

await browser.close();

console.log(`\n${passed.length} passed`);
for (const p of passed) console.log(`  ✓ ${p}`);
if (errors.length) {
  console.log(`\n❌ ${errors.length} failed:`);
  for (const e of errors) console.log(`  - ${e}`);
  process.exit(1);
}
console.log("\n✅ The go-live gate behaves.");
