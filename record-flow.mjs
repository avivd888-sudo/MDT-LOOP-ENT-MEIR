/**
 * The full pathway, recorded — for the presentation.
 *
 *   new patient → question to neuroradiology → tumour board scheduled and the
 *   case listed (blocked) → neuroradiology answers → the asker closes the loop
 *   → the board decides → first treatment recorded → the study clock stops →
 *   the pilot counts it.
 *
 * Landscape 1920×1080, the phone-shaped app in the centre, Hebrew captions
 * beside it. Captions are HTML injected into the page, so Hebrew is shaped by
 * the browser rather than by ffmpeg.
 *
 *   node test/record-flow.mjs [--shots]     (--shots: stills only, no video)
 */
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP = "file://" + path.join(ROOT, "single", "mdt-loop.html");
const OUT = path.join(ROOT, "test", "out");
const RAW = path.join(OUT, "raw");
const SHOTS = process.argv.includes("--shots");
const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
mkdirSync(OUT, { recursive: true });
rmSync(RAW, { recursive: true, force: true });

const W = 1920, H = 1080; // laid out at 1280×720 and zoomed 1.5× so the video is a true 1080p capture
const browser = await chromium.launch({ executablePath: existsSync(CHROME) ? CHROME : undefined, args: ["--no-sandbox", "--lang=he-IL"], env: { ...process.env, LANG: "he_IL.UTF-8", LANGUAGE: "he" } });
const ctx = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: 1,
  locale: "he-IL",
  ...(SHOTS ? {} : { recordVideo: { dir: RAW, size: { width: 1920, height: 1080 } } }),
});
await ctx.addInitScript(() => {
  document.addEventListener("DOMContentLoaded", () => { document.documentElement.style.zoom = "1.5"; });
  try { localStorage.setItem("mdt-loop-lang", "he"); localStorage.removeItem("mdt-loop-coded"); } catch {}
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

const wait = (ms) => page.waitForTimeout(ms);
let shotN = 0;
const still = async (name) => { if (SHOTS) await page.screenshot({ path: path.join(OUT, `flow-${String(++shotN).padStart(2, "0")}-${name}.png`) }); };
const go = async (hash) => { await page.evaluate((h) => { location.hash = h; }, hash); await wait(700); await overlay(); };

/* ── Captions ─────────────────────────────────────────────────────────── */
const STEPS = [
  "הכנסת מטופל חדש",
  "שאלה לנוירורדיולוגיה",
  "קביעת ישיבת טומור בורד",
  "הנוירורדיולוג עונה",
  "השואלת סוגרת את הלולאה",
  "החלטת הוועדה",
  "תחילת טיפול — השעון נעצר",
  "המדידה בפיילוט",
];
let cur = { step: 0, title: "", body: "" };
async function overlay() {
  await page.evaluate(({ steps, cur }) => {
    let el = document.getElementById("demo-cap");
    if (!el) {
      el = document.createElement("div");
      el.id = "demo-cap";
      document.body.appendChild(el);
      const st = document.createElement("style");
      st.textContent = `
        #demo-cap{position:fixed;inset:0;pointer-events:none;z-index:2147483647;font-family:Heebo,Inter,system-ui,sans-serif;direction:rtl}
        #demo-cap .r{position:absolute;top:56px;right:40px;width:360px;color:#fff}
        #demo-cap .k{font-size:15px;font-weight:700;letter-spacing:.08em;color:#4ea1ff}
        #demo-cap .t{margin-top:10px;font-size:34px;font-weight:800;line-height:1.2}
        #demo-cap .b{margin-top:14px;font-size:19px;line-height:1.55;color:#cbd5e1}
        #demo-cap .l{position:absolute;top:56px;left:40px;width:330px}
        #demo-cap .l .h{font-size:15px;font-weight:700;color:#94a3b8;margin-bottom:12px}
        #demo-cap .s{display:flex;align-items:center;gap:12px;margin:9px 0;font-size:17px;color:#64748b}
        #demo-cap .s i{font-style:normal;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-size:13px;font-weight:800;border:2px solid #334155;color:#94a3b8;flex:none}
        #demo-cap .s.done{color:#94a3b8}#demo-cap .s.done i{background:#10b981;border-color:#10b981;color:#fff}
        #demo-cap .s.now{color:#fff;font-weight:700}#demo-cap .s.now i{background:#137fec;border-color:#137fec;color:#fff}
        #demo-cap .f{position:absolute;bottom:34px;right:40px;font-size:14px;color:#64748b}`;
      document.head.appendChild(st);
    }
    const list = steps.map((s, i) => {
      const n = i + 1;
      const cls = n < cur.step ? "done" : n === cur.step ? "now" : "";
      return `<div class="s ${cls}"><i>${n < cur.step ? "✓" : n}</i><span>${s}</span></div>`;
    }).join("");
    el.innerHTML = `
      <div class="r">${cur.step ? `<div class="k">שלב ${cur.step} מתוך ${steps.length}</div>` : `<div class="k">MDT Loop · ENT</div>`}
        <div class="t">${cur.title}</div><div class="b">${cur.body}</div></div>
      <div class="l"><div class="h">המהלך</div>${list}</div>
      <div class="f">נתונים סינתטיים · מצב מקודד · מרכז רפואי מאיר</div>`;
  }, { steps: STEPS, cur });
}
async function caption(step, title, body, hold = 1800) { cur = { step, title, body }; await overlay(); await wait(hold); }

async function type(locator, text) { await locator.click(); await locator.pressSequentially(text, { delay: 18 }); }
async function signIn(nameRe) {
  await go("/login");
  await page.getByRole("radio", { name: nameRe }).click();
  await wait(400);
  await page.getByRole("button", { name: "כניסה", exact: true }).click();
  await wait(700);
  await overlay();
}
async function scrollTo(locator) { await locator.scrollIntoViewIfNeeded(); await wait(500); }

/* ── The walkthrough ─────────────────────────────────────────────────── */
await page.goto(APP + "#/login", { waitUntil: "networkidle" });
await caption(0, "מהאבחנה ועד הטיפול הראשון", "מטופל אחד, מקצה לקצה: הכנסה, שאלה בין דיסציפלינות, ישיבת טומור בורד, סגירת לולאה — ומדידת הימים עד הטיפול.", 3200);
await signIn(/דנה לוי/);

// 1 — new patient
await caption(1, "הכנסת מטופל חדש", "במצב מקודד לא מוזנים שם או ת״ז. מספר המחקר נוצר מהאתר, הצד ותאריך הפתולוגיה.", 800);
await go("/patients/new");
await still("new-empty");
await type(page.locator('label:has(> span:text-is("גיל")) input'), "58");
await page.getByLabel(/אבחנה ראשית/).selectOption("C02.1");
await wait(500);
const sel = (label) => page.locator(`label:has(> span:text-is("${label}")) select`);
await sel("T").selectOption({ index: 3 });
await sel("N").selectOption({ index: 2 });
await wait(400);
const pathDate = page.getByLabel(/תאריך דוח הפתולוגיה/);
await scrollTo(pathDate);
await pathDate.fill("2026-09-10");
await sel("צד").selectOption("R");
await wait(500);
await scrollTo(page.getByText("ENT-26-", { exact: false }).last());
await caption(1, "הכנסת מטופל חדש", "מספר המחקר מוכן לפני השמירה: אתר, צד וחודש — כדי שלא ידברו בטעות על מטופל אחר.", 2400);
await still("new-filled");
await page.getByRole("button", { name: /שמירת המטופל/ }).click();
await wait(1200);
await overlay();
const patientHash = await page.evaluate(() => location.hash.slice(1));
await caption(1, "הרשומה נפתחה", "שעון המחקר רץ מיום דוח הפתולוגיה הממאירה (t = 0).", 2600);
await still("record");

// 2 — a question to neuroradiology
await caption(2, "שאלה לנוירורדיולוגיה", "בקשה מובנית, ממוענת לדיסציפלינה ולא לאדם — עם שעון ובעלים.", 800);
await go("/loops/new");
const pid = patientHash.split("/").pop();
await page.locator("select").nth(0).selectOption(pid);
await page.locator("select").nth(1).selectOption("imaging-report");
await wait(400);
await type(page.getByPlaceholder(/מי המטופל ומה קורה/), "SCC of the right lateral tongue, cT2 N1, biopsy 10/09.");
await type(page.getByPlaceholder(/לדוגמה: האם יש חדירה/), "MRI neck: depth of invasion and nodal status before the board?");
await still("loop-new");
await wait(600);
await page.getByRole("button", { name: /פתיחת הלולאה/ }).click();
await wait(1100);
const loopHash = await page.evaluate(() => location.hash.slice(1));
await caption(2, "הלולאה נפתחה", "השעון רץ עד שמי ששאלה תאשר שהתשובה פתרה את השאלה.", 2400);
await still("loop-open");

// 3 — schedule the board and list the case
await caption(3, "קביעת ישיבת טומור בורד", "ישיבה חדשה, והמטופל משובץ לסדר היום עם שאלה קלינית מפורשת.", 800);
await go("/board");
await page.getByLabel("תאריך").fill("2026-09-24");
await wait(500);
await still("board-schedule");
await page.getByRole("button", { name: /קביעת הישיבה/ }).click();
await wait(1200);
await overlay();
const sessionHash = await page.evaluate(() => location.hash.slice(1));
const add = page.getByRole("button", { name: /הוספה לסדר היום/ });
await scrollTo(add);
await page.getByLabel("מטופל").selectOption(pid);
await type(page.getByPlaceholder(/השאלה הקלינית המפורשת/), "Partial glossectomy with neck dissection, or is further imaging needed first?");
await add.click();
await wait(1000);
await scrollTo(page.getByText("סדר היום").first());
await caption(3, "המקרה חסום", "הלולאה הפתוחה הפכה אוטומטית לתנאי מקדים. הוועדה רואה מראש מה עוד חסר.", 3000);
await still("board-blocked");

// 4 — neuroradiology answers
await caption(4, "הנוירורדיולוג עונה", "מתחלפים למשתמש של ד״ר טל גולד. רק הדיסציפלינה הנמענת יכולה לקלוט ולענות.", 800);
await signIn(/טל גולד/);
await go(loopHash);
await page.getByRole("button", { name: /אישור קליטה/ }).click();
await wait(700);
const ans = page.getByPlaceholder(/ענו על הבקשה/);
await scrollTo(ans);
await type(ans, "DOI 6 mm on MRI; single ipsilateral level II node 1.6 cm, no ENE. No further imaging needed.");
await page.getByRole("button", { name: /שליחת התשובה/ }).click();
await wait(900);
await caption(4, "נענתה — אבל עדיין לא נסגרה", "המשיב אינו יכול לסגור. רק מי ששאל מחליט אם התשובה פתרה את השאלה.", 2600);
await still("answered");

// 5 — the asker closes
await caption(5, "השואלת סוגרת את הלולאה", "חוזרים לד״ר דנה לוי. הסגירה משחררת את החסימה בוועדה.", 800);
await signIn(/דנה לוי/);
await go(loopHash);
const close = page.getByPlaceholder(/מה נעשה בעקבות התשובה/);
await scrollTo(close);
await type(close, "Staging complete — proceeding to the board as planned.");
await page.getByRole("button", { name: /סגירת הלולאה/ }).last().click();
await wait(1000);
await caption(5, "הלולאה נסגרה", "נפתחה · נקלטה · נענתה · נסגרה — כל שלב עם חותמת זמן.", 2400);
await still("closed");

// 6 — the board decides
await caption(6, "החלטת הוועדה", "התנאי המקדים מוכן, והמקרה פתוח להחלטה.", 800);
await go(sessionHash);
const decide = page.getByRole("button", { name: /רישום החלטה/ }).first();
await scrollTo(decide);
await wait(800);
await decide.click();
await wait(700);
await page.getByRole("button", { name: "ניתוח", exact: true }).first().click();
await type(page.getByPlaceholder(/מה מומלץ/), "Partial glossectomy with ipsilateral selective neck dissection.");
await type(page.getByPlaceholder(/מדוע דווקא האפשרות/), "cT2 N1 oral tongue, fit for surgery; single-modality first.");
await still("decision");
await page.getByRole("button", { name: /רישום ההחלטה/ }).click();
await wait(1100);
await caption(6, "ההחלטה נרשמה", "תאריך ההחלטה הוא יום הישיבה — 24/09.", 2200);
await still("decided");

// 7 — first treatment: the clock stops
await caption(7, "תחילת טיפול — השעון נעצר", "רושמים את מועד הניתוח. המרווח מחושב מהתאריכים, לא מוקלד.", 800);
await go(patientHash);
const clock = page.getByTestId("pathway-clock");
await scrollTo(clock);
await clock.locator('input[type="date"]').fill("2026-10-05");
await wait(600);
await page.getByRole("button", { name: /עצירת השעון/ }).click();
await wait(1100);
await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
await wait(700);
await caption(7, "25 ימים מהפתולוגיה עד הניתוח", "בתוך יעד 30 הימים. ועדה ביום 14, החלטה ביום 14, ניתוח ביום 25.", 3600);
await still("clock-stopped");

// 8 — the pilot counts it
await caption(8, "המדידה בפיילוט", "המטופל נכנס לקוהורטה הרצופה, והמספרים מתעדכנים. הכול ניתן לייצוא לאקסל.", 800);
await go("/pilot");
await wait(900);
const row = page.getByText("ENT-26-007-OT-R-09").last();
await scrollTo(row);
await wait(1800);
await still("pilot");
await caption(8, "מערכת צל", "מגבה את התקשורת, מתעדת את הימים, ומציפה כשלי תקשורת — בלי להחליף דבר במסלול הקיים.", 3600);

await ctx.close();
await browser.close();
if (errors.length) console.log("page errors:", errors);

if (!SHOTS) {
  const webm = readdirSync(RAW).filter((f) => f.endsWith(".webm")).map((f) => path.join(RAW, f))
    .sort((a, b) => statSync(b).size - statSync(a).size)[0];
  const mp4 = path.join(OUT, "MDT-Loop-ENT-demo-flow.mp4");
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", webm, "-vf", "fps=30,format=yuv420p",
    "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-movflags", "+faststart", mp4]);
  console.log("video:", mp4);
}
console.log("done", SHOTS ? `${shotN} stills` : "");
