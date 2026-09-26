import { chromium } from "playwright";
const BASE = "file:///home/claude/app/mdt-loop-ent/single/mdt-loop.html#";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
const c = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
const p = await c.newPage();
const errs=[]; p.on("pageerror", e=>errs.push(e.message)); p.on("console", m=>m.type()==="error"&&errs.push(m.text()));
const go = async (x) => { await p.goto(BASE + x, { waitUntil: "networkidle" }); await p.waitForTimeout(500); };
await go("/login"); await p.getByRole("radio").nth(3).click(); await p.getByRole("button", { name: "כניסה", exact: true }).click(); await p.waitForTimeout(400);
await go("/more"); await p.getByRole("button", { name: /טעינת סימולציה/ }).click(); await p.waitForTimeout(500);
for (const [x, n] of [["/pilot","he-pilot"],["/patients","he-patients"],["/patients/sim-18","he-patient"],["/more","he-more"],["/patients/new","he-new"],["/loops","he-loops"]]) { await go(x); await p.screenshot({ path: `/home/claude/shots/sim/${n}.png`, fullPage: true }); }
console.log("errors:", errs);
await b.close();
