# MDT Loop — multidisciplinary teamwork in head & neck cancer

A working prototype of a closed-loop communication platform for the head and neck
oncology multidisciplinary team at **Meir Medical Center, Kfar Saba** (Clalit Health
Services), Department of Otolaryngology — Head and Neck Surgery.

> ⚠️ **Demonstration build.** Every patient, result and message is fabricated. The
> system is not connected to any hospital record and is not intended for clinical use.

---

## What this is

Head and neck oncology is the most multidisciplinary field in surgery. No single
clinician can stage, decide and deliver treatment alone: a definitive decision needs
surgery, medical oncology, radiation oncology, pathology and radiology to converge on
the same patient, in the same week, with the same information in front of them. When
that convergence fails, it rarely fails loudly — it fails as a case deferred to the
next board because a report never came back.

The system is positioned as a **communication and coordination tool, not a clinical
decision tool**. It does not interpret data, does not rank treatment options and does
not produce a recommendation. It manages the flow of requests between disciplines and
measures it.

### The core object: a loop

A loop is a focused request from one discipline to another, structured as SBAR, with
four states:

| State | Who acts | Meaning |
|---|---|---|
| Opened | The requester | One specific request, routed to a discipline rather than a person |
| Acknowledged | The receiving discipline | Somebody has seen it and taken it on |
| Answered | The receiving discipline | A substantive answer has been given |
| **Closed** | **The requester alone** | The requester confirms the answer resolved the question |

A loop that reaches *answered* but never reaches *closed* is the failure this system
exists to make visible: somebody replied — nobody checked whether the reply actually
unblocked anything.

Routing to a **discipline** rather than to a named individual is deliberate. One
person's leave, night shift or sick day should not stop a cancer pathway.

---

## Running it

```bash
npm install
npm run dev        # http://localhost:3000
```

Static build:

```bash
npm run build      # output in out/
node preview.mjs   # zero-dependency server on http://localhost:4173
```

Type check:

```bash
npm run typecheck
```

Automated walkthrough of every screen (needs a build and a server on 4173):

```bash
node verify.mjs
```

Single-file build — one self-contained HTML file, fonts inlined, no network at all:

```bash
node single/icons.mjs   # regenerate the icon subset (only after adding an icon)
node single/build.mjs   # writes single/mdt-loop.html
```

---

## Structure

```
app/
  page.tsx                  Gate
  login/  register/         Sign in and request access
  (app)/
    loops/                  Loop board · single loop · open a loop
    patients/               List · patient record · new patient
    board/                  Tumour board · a session
    team/                   Disciplines, coordination load, directory
    insights/               Closed-loop metrics  ← the research screen
    staging/                TNM tool
    evidence/               Literature and evidence
    settings/  more/
components/
  ui.tsx                    Component library
  loop.tsx                  Loop chain and loop card
  pathway.tsx               Adjuvant pathway panel
  patient.tsx               Patient card and alert strip
  shell.tsx                 Shell and navigation
lib/
  types.ts                  Domain model
  data.ts                   Synthetic demonstration data  ← the API seam
  store.tsx                 Application state and domain actions
  metrics.ts                All metric computation
  pathway.ts                Adjuvant pathway — milestones and clocks, from the literature
  staging.ts                The AJCC engine
  israeli-id.ts             National ID check-digit validation
  format.ts                 Dates, tones, icons
single/
  icons.mjs                 Icon subset generator (reads the font's own cmap)
  build.mjs                 Single-file HTML build
```

---

## Engineering decisions

**English and LTR.** The interface is English throughout, so the work can be shown
to an international audience and the research written up without translation drift.
All spacing uses logical properties (`ps-`/`pe-`/`ms-`/`me-`) rather than
`left`/`right`, so a Hebrew build remains a single configuration change rather than a
rewrite.

**Self-hosted fonts.** Inter and Material Symbols are loaded from the package, never
from a CDN. Hospital networks routinely block CDN access, and a clinical application
should not make a third-party request on every page load.

**Icons by codepoint.** `<Icon>` renders the Material Symbols *codepoint*, not the
ligature name. If a font's `liga` feature fails to apply, a ligature-based icon
renders its own name as raw text — a failure that must not happen in front of an
audience. `single/icons.mjs` derives the name → codepoint table from the font's own
cmap and subsets the font to the ~100 glyphs actually used (79KB rather than 3.8MB).

**State.** State lives in React and is mirrored to `sessionStorage`, so a browser
refresh mid-demonstration does not erase a decision that was just recorded.
`sessionStorage` rather than `localStorage`, so nothing that looks like clinical
information survives closing a tab on a shared machine.

**The staging engine** knows the difference between editions: **AJCC Version 9** for
p16-positive oropharynx and salivary gland cancers (effective 1 January 2026), and the
8th edition everywhere else. Unimplemented sites return an explicit "not supported"
answer rather than a guess — a tool that quietly produces a plausible but wrong stage
is more dangerous than one that declines to answer.

**The adjuvant pathway is derived from the literature, not from local habit.**
`lib/pathway.ts` encodes the five process milestones isolated in the mediation analysis
of the NDURE randomised trial — patients completing four or five started radiotherapy on
time in 90% of cases against 10% for one or none — together with the six-week
surgery-to-radiotherapy target (aHR 1.10–1.13 beyond it) and the graded treatment
package time bands (aHR 1.19 at 11–12 weeks, 1.36 at 13–15, 1.51 at 16 or more), all
from the 2019 systematic review in *JAMA Otolaryngology–Head & Neck Surgery*. Every
threshold in that file carries its citation inline. The application does not advise on
any milestone; it shows which have happened, which are due, and which are late — and
each one is a handoff between two disciplines, which is what a loop already models.

**Rates are shown with their denominators.** A cohort of two patients can produce a
"100%" that reads as a department-wide claim. The metrics screen renders
`timely/started` rather than a bare percentage, and says how many are still waiting.

**Measurement at discipline level.** Response times are computed and displayed per
discipline, never per clinician. This is a deliberate design decision: a system that
produces personal league tables of response speed is read as a performance-management
tool, and teams work around those. The unit of improvement is the service.

**Identifier pool for the static build.** `output: "export"` cannot generate a page
for a record created at runtime, so the build pre-renders a pool of identifiers
(`futureLoopIds`, `futurePatientIds` in `lib/data.ts`). A server deployment
(`next start`) does not need this — remove `output: "export"` from `next.config.ts`
and the pool along with it.

---

## What is not implemented

The gaps are documented deliberately, so they are not read as promises:

- **No backend.** Everything is local and in memory. `lib/data.ts` is the swap point.
  The domain actions enforce their own rules — `closeLoop` refuses a caller who is
  not the requester, and the discipline-lead actions refuse a caller without the
  role — but this is client-side. **A production deployment must re-check every
  one of these authorisations on the server**, because nothing arriving from a
  browser can be trusted. The client-side guard is there so the rule is stated
  once, in the place the state changes, rather than only in whichever view
  happens to render a button.
- **No real authentication.** The sign-in screen is a demonstration; no accounts exist.
- **No access auditing.** The loop audit trail is implemented; recording who opened
  which record is not.
- **No connection to Chameleon or Ofek.** The intent is a coordination layer above the
  record, via FHIR-IL — not a replacement record.
- **No push notifications.**
- **The library is fixed.** A production system would query PubMed and the publishing
  bodies live, and would need the corresponding licences.

---

## Before a pilot with real patients

1. Classification with the **Medical Devices Division (AMAR)** — whether the tool
   falls within the definition of software as a medical device.
2. Institutional **Helsinki committee** approval before any data collection.
3. Database classification under the **Privacy Protection (Data Security)
   Regulations** and implementation of the controls that tier requires.
4. Appointment of a **data protection officer** under Amendment 13.
5. Sign-off from the hospital **information security officer**.

`HIPAA` is United States legislation and does not apply to an Israeli healthcare
institution.

---

## Sources for the clinical content

- AJCC Version 9 — HPV-associated oropharynx and salivary glands, effective 1 Jan 2026
- NCCN Head and Neck Cancers, Version 1.2026
- Oral Oncology 2024 (PMID 39577127) — meta-analysis of treatment delay
- Murphy CT et al. J Clin Oncol. 2016;34(2):169–178
- Hahlweg P et al. BMC Cancer. 2017;17:772
- Walraven JEW et al. BMC Health Serv Res. 2022;22:829
