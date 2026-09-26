/**
 * End-to-end walkthrough of every screen and of the full loop lifecycle.
 *
 * Fails on any console error or missing text, and writes screenshots for
 * visual review. This is the regression net: the loop lifecycle and the MDT
 * decision capture are the two flows that must never silently break.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://127.0.0.1:4173";
const OUT = "/home/claude/shots";
mkdirSync(OUT, { recursive: true });

const errors = [];
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox"],
});
const page = await browser.newPage({
  viewport: { width: 430, height: 932 },
  deviceScaleFactor: 2,
  locale: "en-GB",
});

/*
 * The walkthrough runs in English.
 *
 * The application now defaults to Hebrew, which is right for the department
 * and wrong for a regression suite whose thirty-odd assertions are English
 * strings. Rather than translate every assertion — and lose the ability to
 * tell a translation bug from a behaviour bug — the harness pins the language
 * before the first paint and asserts the Hebrew separately at the end.
 */
await page.addInitScript(() => {
  try {
    localStorage.setItem("mdt-loop-lang", "en");
    // Names are asserted throughout, so this suite runs with coded mode off;
    // coded mode and the simulation have their own suite (test/e2e-sim.mjs).
    localStorage.setItem("mdt-loop-coded", "off");
  } catch {
    /* the default applies */
  }
});

page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console: ${m.text()}`);
});
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

async function shot(name) {
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log(`  ✓ ${name}`);
}
async function want(text) {
  const n = await page.getByText(text, { exact: false }).first().count();
  if (!n) errors.push(`missing "${text}" on ${page.url()}`);
}

/* --- 1. Sign in ---------------------------------------------------------- */
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await want("Restricted access");
// Confirm the document really is LTR
const dir = await page.evaluate(() => document.documentElement.dir);
if (dir !== "ltr") errors.push(`document direction is ${dir}, expected ltr`);
await shot("01-gate");

await page.getByRole("link", { name: /Verify identity/ }).click();
await page.waitForURL("**/login/**");
await want("MDT Loop");
// The shared board makes identity meaningful: the choice made here decides
// who may answer, who may close, and who holds a lead's authority.
await want("Who is using this device?");
await want("Dr. Ronen Shani");
await shot("02-login");

/* --- 2. The loop board --------------------------------------------------- */
await page.getByRole("button", { name: "Sign in", exact: true }).click();
await page.waitForURL("**/loops/**");
await want("On me");
await want("answered but not closed");
await shot("03-loops-mine");

await page.getByRole("button", { name: "All", exact: true }).click();
await page.waitForTimeout(300);
await shot("04-loops-all");

await page.getByRole("button", { name: "Overdue" }).click();
await page.waitForTimeout(300);
await shot("05-loops-breached");

/* --- 3. The loop lifecycle — the central flow ---------------------------- */
// l-1: open, unacknowledged, blocking a case at the board
await page.goto(`${BASE}/loops/l-1/`, { waitUntil: "networkidle" });
await want("Request");
await want("blocking a case at the tumour board");
await shot("06-loop-open");

// l-3 is answered but not closed — Dr. Levi opened it, so she can close it
await page.goto(`${BASE}/loops/l-3/`, { waitUntil: "networkidle" });
await want("not yet closed");
await shot("07-loop-answered");

await page
  .getByPlaceholder(/What was done as a result/)
  .fill(
    "HPV ISH has been requested and the result will be back before panendoscopy. The work-up continues as planned.",
  );
await page.getByRole("button", { name: "Close the loop" }).click();
await page.waitForTimeout(600);
await want("Confirmed by the person who asked");
await shot("08-loop-closed");

// That loop was linked to a prerequisite — check the board case was released
await page.goto(`${BASE}/board/s-1/`, { waitUntil: "networkidle" });
await want("Agenda");
await shot("09-board-session");

/* --- 4. Opening a new loop ----------------------------------------------- */
await page.goto(`${BASE}/loops/new/`, { waitUntil: "networkidle" });
await want("SBAR");
await page.selectOption("select >> nth=0", { index: 1 });
await page
  .getByPlaceholder(/Who the patient is/)
  .fill("System check — demonstration patient.");
await page
  .getByPlaceholder(/For example: is there invasion/)
  .fill("Is further imaging needed before this case is discussed at the board?");
await shot("10-loop-new-filled");
await page.getByRole("button", { name: "Open the loop" }).click();
await page.waitForURL(/\/loops\/l-\d+/);
await want("Waiting");
await shot("11-loop-created");

/* --- 5. Recording an MDT decision ---------------------------------------- */
await page.goto(`${BASE}/board/s-1/`, { waitUntil: "networkidle" });
const decideBtn = page.getByRole("button", { name: "Record decision" }).first();
await decideBtn.click();
await page.waitForTimeout(400);
await want("Treatment intent");
await page.getByRole("button", { name: "Surgery", exact: true }).click();
await page
  .getByPlaceholder(/What is recommended/)
  .fill("Transoral robotic resection with ipsilateral selective neck dissection.");
await page
  .getByPlaceholder(/Why this option/)
  .fill(
    "Early-stage p16-positive disease; single-modality treatment avoids the toxicity of chemoradiotherapy.",
  );
await page
  .getByPlaceholder(/Opens as a new loop/)
  .fill("Book the theatre date and take consent");
await shot("12-decision-form");
await page.getByRole("button", { name: "Record the decision" }).click();
await page.waitForTimeout(700);
await want("Transoral robotic resection");
await shot("13-decision-recorded");

/* --- 6. Metrics ---------------------------------------------------------- */
/* --- The pilot: the screen that makes this a study ----------------------- */
await page.goto(`${BASE}/pilot/`, { waitUntil: "networkidle" });
await want("Consecutive cohort");
await want("Nobody is selected in or out");
// The variance estimate is the stated purpose of the pilot, and it must stay
// withheld while the sample is too small to plan a trial from.
await want("Withheld until");
await shot("32-pilot");

await page.goto(`${BASE}/insights/`, { waitUntil: "networkidle" });
await want("Research question");
await want("Loop closure rate");
await want("Cross-discipline traffic");
await want("Response time by discipline");
await want("Pathway clock");
await want("Adjuvant radiotherapy pathway");
await want("Patients by milestones completed");
// A rate must never appear without its denominator on this screen.
await want("of those who have started");
await shot("14-insights");

/* --- 7. The team --------------------------------------------------------- */
await page.goto(`${BASE}/team/`, { waitUntil: "networkidle" });
await want("Coordination load by discipline");
await want("Head & Neck Surgery");
await want("Directory");
await shot("15-team");

/* --- 7b. The adjuvant pathway -------------------------------------------- */
// p-9 is the teaching case: 35 days post-op, dental clearance never done, the
// six-week window closing. If this screen breaks, the clinical argument of the
// whole application breaks with it.
await page.goto(`${BASE}/patients/p-9/`, { waitUntil: "networkidle" });
await page.getByRole("tab", { name: /Adjuvant/ }).click();
await page.waitForTimeout(400);
await want("Surgery to radiotherapy");
await want("of 42 days");
await want("Process milestones");
await want("Pre-operative dental assessment");
await want("days late");
await want("Treatment package time");
// The package must not read as reassuring while radiotherapy has not started.
await want("so far");
await shot("15b-adjuvant-overdue");

// p-7 is the completed pathway — every milestone done, started inside the window.
await page.goto(`${BASE}/patients/p-7/`, { waitUntil: "networkidle" });
await page.getByRole("tab", { name: /Adjuvant/ }).click();
await page.waitForTimeout(400);
await want("Started on time");
await want("5");
await shot("15c-adjuvant-complete");

// A patient with no adjuvant indication must not show the tab at all.
await page.goto(`${BASE}/patients/p-1/`, { waitUntil: "networkidle" });
const strayTab = await page.getByRole("tab", { name: /Adjuvant/ }).count();
if (strayTab) errors.push("adjuvant tab shown for a patient with no adjuvant indication");

/* --- 8. Patients --------------------------------------------------------- */
await page.goto(`${BASE}/patients/`, { waitUntil: "networkidle" });
await want("Patient list");
await shot("16-patients");

await page.locator('a[href="/patients/p-2/"]').first().click();
await page.waitForURL("**/patients/p-2/**");
await want("AJCC 9");
await shot("17-patient-overview");

for (const [tab, name] of [
  ["Loops", "18-patient-loops"],
  ["Timeline", "19-patient-timeline"],
  ["Documents", "20-patient-docs"],
]) {
  await page.getByRole("tab", { name: new RegExp(tab) }).click();
  await page.waitForTimeout(350);
  await shot(name);
}

/* --- 9. New patient + national ID validation ----------------------------- */
await page.goto(`${BASE}/patients/new/`, { waitUntil: "networkidle" });
await page.getByPlaceholder("Last name, First name").fill("Test, Patient");
// An invalid national ID — the check digit test must catch it
await page.getByPlaceholder("000000000").fill("123456789");
await page.waitForTimeout(300);
await want("Check digit does not validate");
await shot("21-id-invalid");
// A valid one
await page.getByPlaceholder("000000000").fill("204810378");
await page.waitForTimeout(300);
const stillInvalid = await page.getByText("Check digit does not validate").count();
if (stillInvalid) errors.push("national ID validation rejected a valid number");
await page.getByPlaceholder("000000", { exact: true }).fill("999888");
await page.getByPlaceholder("64").fill("58");
await page.selectOption("select >> nth=0", "C09.9");
await page.waitForTimeout(300);
await page.selectOption("select >> nth=1", "positive");
await page.waitForTimeout(300);
await shot("22-new-patient");

/* --- 10. The remaining screens ------------------------------------------- */
for (const [path, name, text] of [
  ["/staging/", "23-staging", "Tumour site"],
  ["/evidence/", "24-evidence", "Reference library"],
  ["/settings/", "25-settings", "Regulatory framework"],
  ["/more/", "26-more", "Security and privacy"],
  ["/board/", "27-board-list", "Tumour board"],
  ["/register/", "28-register", "Request access"],
]) {
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await want(text);
  await shot(name);
}

/* --- 11. The staging tool ------------------------------------------------ */
await page.goto(`${BASE}/staging/`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /^T2/ }).first().click();
await page.getByRole("button", { name: /^N2/ }).first().click();
await page.waitForTimeout(300);
await want("Stage II");
await shot("29-staging-v9");

await page.selectOption("select", "larynx");
await page.waitForTimeout(300);
await want("AJCC 8");
await shot("30-staging-v8");

/* --- 12. Desktop --------------------------------------------------------- */
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(`${BASE}/team/`, { waitUntil: "networkidle" });
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/31-desktop.png` });
console.log("  ✓ 31-desktop");

/* --- 11b. The beta scope, in English ------------------------------------ */
await page.setViewportSize({ width: 430, height: 932 });
await page.goto(`${BASE}/team/`, { waitUntil: "networkidle" });
await want("This beta is configured for");
await want("Neuroradiology");
await want("Endocrinology");
await want("Infectious Diseases");
await want("Head & Neck Oncology");
await shot("30b-beta-scope");

/* --- 12b. Registration: who may ask for an account ----------------------- */
/*
 * Three assertions, one per outcome that matters: a work address is accepted,
 * a consumer mailbox is refused *by name*, and an unlisted domain is sent to a
 * person rather than turned away. The last one is the easiest to regress into
 * a flat rejection, which is why it is tested.
 */
await page.goto(`${BASE}/register/`, { waitUntil: "networkidle" });
const emailField = page.getByPlaceholder("name@clalit.org.il");

await emailField.fill("avivdan@clalit.org.il");
await page.waitForTimeout(250);
await want("Recognised domain");
await want("Clalit Health Services");

await emailField.fill("someone@gmail.com");
await page.waitForTimeout(250);
await want("is a personal mailbox");

await emailField.fill("someone@example.com");
await page.waitForTimeout(250);
await want("not on the recognised list");
await shot("31b-register-domains");

// A government hospital is matched by the subdomain rule, not by a line of its own.
await emailField.fill("someone@sheba.health.gov.il");
await page.waitForTimeout(250);
await want("Ministry of Health and the government hospitals");

// The whole flow: eligibility, the code, and the pending state.
await page.getByPlaceholder(/Dr\. Jane Doe/).fill("Dr. Yael Adler");
await page.getByPlaceholder(/Consultant Pathologist/).fill("Consultant Radiologist");
await page.selectOption("select", "radiology");
await page.getByPlaceholder("00000").fill("41552");
await page.locator('input[type="checkbox"]').check();
await page.getByRole("button", { name: /Send a verification code/ }).click();
await page.waitForTimeout(300);
await want("No mail is sent in this build");
await shot("31c-register-code");

const code = (await page.locator(".font-mono.text-2xl").innerText()).replace(/\D/g, "");
await page.getByPlaceholder("000000").fill("000000");
await page.getByRole("button", { name: /Verify the address/ }).click();
await page.waitForTimeout(250);
await want("does not match");
await page.getByPlaceholder("000000").fill(code);
await page.getByRole("button", { name: /Verify the address/ }).click();
await page.waitForTimeout(350);
await want("Address verified");
await want("waiting on the");
await shot("31d-register-verified");

/* --- 13. Hebrew ---------------------------------------------------------- */
/*
 * Not a translation review — a proof that the Hebrew build renders, routes and
 * reverses. The assertions are deliberately few and load-bearing: the document
 * direction, one string from the chrome, one from the clinical vocabulary
 * tables, and one from the demonstration data, because those are three
 * different mechanisms and any of them can fail alone.
 */
await page.setViewportSize({ width: 430, height: 932 });
const he = await browser.newContext({
  viewport: { width: 430, height: 932 },
  deviceScaleFactor: 2,
  locale: "he-IL",
});
const hePage = await he.newPage();
hePage.on("console", (m) => {
  if (m.type() === "error") errors.push(`console(he): ${m.text()}`);
});
hePage.on("pageerror", (e) => errors.push(`pageerror(he): ${e.message}`));

async function wantHe(text) {
  const n = await hePage.getByText(text, { exact: false }).first().count();
  if (!n) errors.push(`missing Hebrew "${text}" on ${hePage.url()}`);
}

await hePage.goto(`${BASE}/loops/`, { waitUntil: "networkidle" });
const heDir = await hePage.evaluate(() => document.documentElement.dir);
if (heDir !== "rtl") errors.push(`Hebrew document direction is ${heDir}, expected rtl`);
await wantHe("לולאות");                    // chrome
await wantHe("חוות דעת פתולוגית");          // a clinical vocabulary table
await hePage.waitForTimeout(450);
await hePage.screenshot({ path: `${OUT}/32-he-loops.png`, fullPage: true });
console.log("  ✓ 32-he-loops");

await hePage.goto(`${BASE}/patients/`, { waitUntil: "networkidle" });
await wantHe("רשימת המטופלים");
// This context never switched coded mode off, so it must show the study ID
// and must not show the name anywhere — that is the whole point of the mode.
await wantHe("ENT-26-005-GLT-R-07");        // p-1, coded
if (await hePage.getByText("כהן", { exact: false }).count())
  errors.push("coded mode: a patient name is visible on the Hebrew patient list");
await hePage.waitForTimeout(450);
await hePage.screenshot({ path: `${OUT}/33-he-patients.png`, fullPage: true });
console.log("  ✓ 33-he-patients");

await hePage.goto(`${BASE}/pilot/`, { waitUntil: "networkidle" });
await wantHe("קוהורטה רצופה");
await wantHe("איש אינו נבחר פנימה או החוצה");
await hePage.waitForTimeout(450);
await hePage.screenshot({ path: `${OUT}/34-he-pilot.png`, fullPage: true });
console.log("  ✓ 34-he-pilot");

/* The toggle, both ways — a preference that does not survive a reload is not a
   preference. */
/* The lead's queue, and the fact that it is scoped to their own discipline. */
await hePage.goto(`${BASE}/team/`, { waitUntil: "networkidle" });
await wantHe("הבטא מוגדרת לדיסציפלינות");
await wantHe("נוירורדיולוגיה");
await wantHe("אנדוקרינולוגיה");
await wantHe("מחלות זיהומיות");
await wantHe("ממתינים לאישור כניסה");
await wantHe("ד״ר יעל אדלר");
const foreign = await hePage.getByText("ד״ר עמרי נחום").count();
if (foreign) errors.push("a request from another discipline is offered to this lead");
await hePage.waitForTimeout(450);
await hePage.screenshot({ path: `${OUT}/36-he-access-requests.png`, fullPage: true });
console.log("  ✓ 36-he-access-requests");

await hePage.goto(`${BASE}/more/`, { waitUntil: "networkidle" });
await hePage.getByRole("button", { name: "English" }).click();
await hePage.waitForTimeout(350);
if ((await hePage.evaluate(() => document.documentElement.dir)) !== "ltr") {
  errors.push("switching to English did not set the document direction to ltr");
}
await hePage.reload({ waitUntil: "networkidle" });
if ((await hePage.evaluate(() => document.documentElement.dir)) !== "ltr") {
  errors.push("the English choice did not survive a reload");
}
await hePage.getByRole("button", { name: "עברית" }).click();
await hePage.waitForTimeout(350);
if ((await hePage.evaluate(() => document.documentElement.dir)) !== "rtl") {
  errors.push("switching back to Hebrew did not set the document direction to rtl");
}
await hePage.waitForTimeout(450);
await hePage.screenshot({ path: `${OUT}/35-he-language.png`, fullPage: true });
console.log("  ✓ 35-he-language");

await browser.close();

if (errors.length) {
  console.error("\n❌ Problems:\n" + errors.map((e) => "  - " + e).join("\n"));
  process.exit(1);
}
console.log("\n✅ Every flow passed with no console errors.");
