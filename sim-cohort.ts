/**
 * The simulation cohort: 20 synthetic patients run through the whole study.
 *
 * ⚠️  Every record is fabricated. The names, national ID numbers and medical
 * record numbers are invented (the IDs pass the check digit so the entry form
 * accepts them, and belong to nobody). This dataset exists to answer one
 * question before a single real patient is enrolled: does the instrument
 * measure what the protocol says it measures?
 *
 * Shape of the cohort, as specified by the PI:
 *   · 20 consecutive patients with a new malignant pathology report
 *   · 10 go to primary surgery, 10 to primary radiotherapy or chemoradiation
 *   · realistic traffic between disciplines, including the failure modes the
 *     system exists to expose — an answer nobody closed, a request nobody
 *     picked up, a request sent to the wrong discipline, a requester on leave,
 *     and a board case deferred because a result was missing.
 *
 * The intervals are drawn to resemble what the literature reports for the
 * two pathways (Cook 2022: surgery fast from the decision, radiotherapy slow),
 * so the pilot screen and the workbook have something clinically recognisable
 * to compute. They are not a prediction of Meir's numbers.
 *
 * Everything here is built from a declarative table by `buildSimulation()`,
 * deterministically: the same table always produces the same records, so a
 * test can assert exact values.
 */

import type {
  Discipline,
  Loop,
  LoopEvent,
  LoopKind,
  LoopUrgency,
  MdtCaseEntry,
  MdtSession,
  Patient,
  Subsite,
  TreatmentModality,
} from "./types";
import { formatStudyId, type SiteCode, type Side } from "./study-id";

/* -------------------------------------------------------------------------- */
/* Dates                                                                       */
/* -------------------------------------------------------------------------- */

const ISO = (d: Date) => d.toISOString().slice(0, 10);
export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return ISO(d);
}
/** Hours after 08:00 on a given day, as a local ISO timestamp. */
function at(day: string, hoursAfter8 = 0): string {
  const base = new Date(`${day}T08:00:00Z`);
  base.setUTCMinutes(base.getUTCMinutes() + Math.round(hoursAfter8 * 60));
  return base.toISOString().slice(0, 19);
}
/** The board sits on Thursdays. */
function nextThursday(iso: string): string {
  let d = iso;
  while (new Date(`${d}T12:00:00Z`).getUTCDay() !== 4) d = addDays(d, 1);
  return d;
}

/* -------------------------------------------------------------------------- */
/* The table                                                                   */
/* -------------------------------------------------------------------------- */

type Arm = "surgery" | "radiotherapy" | "chemoradiotherapy";

interface LoopSpec {
  kind: LoopKind;
  to: Discipline;
  by: string; // requester
  answerer: string;
  urgency?: LoopUrgency;
  /** Days after the pathology report the loop is opened. */
  day: number;
  ackH: number | null;
  ansH: number | null;
  /** Hours after the answer the requester closed it; null = never closed. */
  closeH: number | null;
  request: string;
  answer?: string;
  closure?: string;
  /** Blocks the first board presentation until closed. */
  blocks?: string;
  /** A lead rerouted it from the discipline it was first sent to. */
  reroutedFrom?: Discipline;
  /** Requester away — the discipline lead closed it with a reason. */
  overrideBy?: string;
  /** Sent to the discipline, passed its target and was escalated. */
  escalateH?: number;
}

interface Spec {
  name: string;
  nid: string;
  age: number;
  sex: "M" | "F";
  subsite: Subsite;
  site: SiteCode;
  side: Side;
  dx: string;
  histology: string;
  t: string;
  n: string;
  m?: string;
  stage: string;
  p16?: "positive" | "negative" | "not-tested";
  edition?: "AJCC 8" | "AJCC 9";
  ecog: 0 | 1 | 2;
  packYears?: number;
  arm: Arm;
  /** Pathology report date. */
  path: string;
  /** Days from pathology until staging is complete and the case can be listed. */
  staging: number;
  /** Listed, deferred for a missing result, decided a week later. */
  deferredFor?: string;
  /** Days from pathology to first definitive treatment — the primary endpoint. */
  toTx: number;
  dental?: boolean;
  peg?: boolean;
  /** Surgery patients who proceed to adjuvant treatment. */
  adjuvant?: { dec2: number; start: number | null; modality: TreatmentModality };
  presenter: string;
  loops: LoopSpec[];
}

const S = "u-levi"; // head & neck surgeon, discipline lead
const R = "u-rosen"; // department chair, surgeon
const K = "u-katz"; // radiation oncologist
const A = "u-amara"; // head & neck oncologist
const P = "u-shani"; // pathologist
const G = "u-gold"; // neuroradiologist
const B = "u-bar"; // anaesthetist
const D = "u-dent"; // dentist
const N = "u-diet"; // dietitian
const L = "u-slt"; // speech and language
const C = "u-nurse"; // clinical nurse specialist
const E = "u-endo"; // endocrinology

const petLoop = (by: string, day: number, ansH: number, closeH: number | null, blocks = true): LoopSpec => ({
  kind: "imaging-report", to: "radiology", by, answerer: G, day, ackH: 3, ansH, closeH,
  request: "Staging PET-CT report — any distant disease or a second primary that changes intent?",
  answer: "No distant or second primary disease. Nodal uptake concordant with the neck MRI.",
  closure: "Staging complete — listing for the board.",
  blocks: blocks ? "Staging PET-CT" : undefined,
});
const dentalLoop = (by: string, day: number, ansH: number, closeH: number | null): LoopSpec => ({
  kind: "dental-clearance", to: "dentistry", by, answerer: D, day, ackH: 20, ansH, closeH,
  request: "Pre-radiotherapy dental assessment and extractions before mask fitting.",
  answer: "Two non-restorable lower molars extracted; 10 days to heal before simulation. Fluoride trays issued.",
  closure: "Simulation booked after the healing window.",
});
const anaesLoop = (day: number, ansH: number, closeH: number | null): LoopSpec => ({
  kind: "anaesthetic-assessment", to: "anaesthetics", by: S, answerer: B, day, ackH: 6, ansH, closeH,
  request: "Pre-operative anaesthetic assessment — fit for a long resection and free flap?",
  answer: "ASA 2. Fit to proceed; awake fibreoptic intubation planned.",
  closure: "Theatre list confirmed.",
});
const orLoop = (day: number, ansH: number, closeH: number | null): LoopSpec => ({
  kind: "scheduling", to: "nursing", by: S, answerer: C, day, ackH: 2, ansH, closeH,
  request: "Book theatre for the resection decided at the board, and the pre-admission clinic.",
  answer: "Theatre date confirmed and the patient informed by phone.",
  closure: "Date matches the plan. Thank you.",
});
const rtLoop = (by: string, day: number, ansH: number, closeH: number | null): LoopSpec => ({
  kind: "radiation-opinion", to: "radiation-oncology", by, answerer: K, day, ackH: 4, ansH, closeH,
  request: "Radiotherapy planning and a start date for the treatment decided at the board.",
  answer: "Mask and planning CT booked; start date confirmed with the linac schedule.",
  closure: "Start date noted in the plan.",
});
const cisLoop = (day: number, ansH: number, closeH: number | null): LoopSpec => ({
  kind: "oncology-opinion", to: "medical-oncology", by: K, answerer: A, day, ackH: 5, ansH, closeH,
  request: "Cisplatin eligibility — renal function and hearing — for concurrent chemoradiation.",
  answer: "eGFR 78, baseline audiogram acceptable. Weekly cisplatin 40 mg/m² is appropriate.",
  closure: "Concurrent weekly cisplatin confirmed.",
});
const p16Loop = (day: number, ansH: number, closeH: number | null, blocks = true): LoopSpec => ({
  kind: "pathology-review", to: "pathology", by: S, answerer: P, day, ackH: 2, ansH, closeH,
  request: "p16 immunohistochemistry and HPV ISH on the biopsy — needed to stage under AJCC 9.",
  answer: "p16 strong and diffuse (>70%), HPV ISH positive.",
  closure: "Staged as p16-positive oropharynx.",
  blocks: blocks ? "p16 / HPV status" : undefined,
});
const pegLoop = (day: number, ansH: number, closeH: number | null): LoopSpec => ({
  kind: "nutrition-assessment", to: "dietetics", by: K, answerer: N, day, ackH: 8, ansH, closeH,
  request: "Nutrition assessment — is a prophylactic PEG indicated before chemoradiation?",
  answer: "7% weight loss in 3 months. Prophylactic PEG recommended; gastroenterology booked.",
  closure: "PEG booked before day 1.",
});

export const SIM_SPECS: Spec[] = [
  /* ── Primary surgery ─────────────────────────────────────────────────── */
  {
    name: "Mizrahi, Avner", nid: "000000018", age: 61, sex: "M", subsite: "oral-cavity", site: "OT", side: "L",
    dx: "SCC of the lateral tongue", histology: "Moderately differentiated SCC, DOI 7 mm", t: "T2", n: "N1", stage: "III",
    ecog: 0, packYears: 30, arm: "surgery", path: "2026-06-01", staging: 8, toTx: 26, dental: true, presenter: S,
    adjuvant: { dec2: 14, start: 40, modality: "radiotherapy" },
    loops: [
      { kind: "imaging-report", to: "radiology", by: S, answerer: G, day: 1, ackH: 2, ansH: 30, closeH: 3,
        request: "MRI neck — depth of invasion and nodal status for staging.", answer: "DOI 7 mm on MRI; single ipsilateral level II node 1.8 cm, no ENE.",
        closure: "Staged cT2 N1.", blocks: "MRI neck" },
      anaesLoop(9, 22, 4), orLoop(11, 6, 2),
    ],
  },
  {
    name: "Friedman, Rachel", nid: "000000026", age: 57, sex: "F", subsite: "oral-cavity", site: "FOM", side: "M",
    dx: "SCC of the floor of mouth", histology: "Well differentiated SCC", t: "T2", n: "N0", stage: "II",
    ecog: 0, packYears: 12, arm: "surgery", path: "2026-06-03", staging: 7, toTx: 22, presenter: S,
    loops: [anaesLoop(8, 20, 2), orLoop(9, 4, 1)],
  },
  {
    name: "Azoulay, Moshe", nid: "000000034", age: 68, sex: "M", subsite: "larynx", site: "GLT", side: "R",
    dx: "Glottic SCC, T1a", histology: "Moderately differentiated SCC", t: "T1a", n: "N0", stage: "I",
    ecog: 1, packYears: 40, arm: "surgery", path: "2026-06-05", staging: 6, toTx: 18, presenter: R,
    loops: [
      { kind: "swallow-assessment", to: "speech-language", by: R, answerer: L, day: 3, ackH: 24, ansH: 50, closeH: 5,
        request: "Baseline voice assessment before transoral laser cordectomy.", answer: "Baseline VHI-10 recorded; voice therapy plan after surgery.",
        closure: "Baseline on file." },
      orLoop(7, 3, 1),
    ],
  },
  {
    name: "Levin, Dvora", nid: "000000042", age: 49, sex: "F", subsite: "thyroid", site: "THY", side: "B",
    dx: "Papillary thyroid carcinoma", histology: "Classical papillary carcinoma, 2.4 cm", t: "T2", n: "N1a", stage: "I",
    ecog: 0, arm: "surgery", path: "2026-06-08", staging: 9, toTx: 29, presenter: S,
    loops: [
      { kind: "endocrine-opinion", to: "endocrinology", by: S, answerer: E, day: 4, ackH: 3, ansH: 26, closeH: 6,
        request: "Pre-operative calcium and vitamin D, and the plan for RAI after total thyroidectomy.", answer: "Vitamin D replete. RAI decision after final pathology.",
        closure: "Plan agreed." },
      orLoop(12, 5, 2),
    ],
  },
  {
    name: "Shapiro, Yehuda", nid: "000000059", age: 72, sex: "M", subsite: "salivary", site: "PAR", side: "R",
    dx: "Parotid mucoepidermoid carcinoma, high grade", histology: "High-grade mucoepidermoid carcinoma", t: "T3", n: "N0", stage: "III",
    ecog: 1, arm: "surgery", path: "2026-06-10", staging: 12, toTx: 34, presenter: S,
    adjuvant: { dec2: 17, start: 46, modality: "radiotherapy" },
    loops: [
      { kind: "pathology-review", to: "pathology", by: S, answerer: P, day: 1, ackH: 4, ansH: 72, closeH: 20,
        request: "Grade and MAML2 rearrangement on the core biopsy — does it change the extent of neck surgery?",
        answer: "High grade, MAML2 not rearranged. Elective neck dissection is justified.", closure: "Neck dissection added to the plan.", blocks: "Grade and molecular" },
      anaesLoop(14, 30, 4), orLoop(16, 8, 3),
    ],
  },
  {
    name: "Kaplan, Ilana", nid: "000000067", age: 64, sex: "F", subsite: "oral-cavity", site: "BUC", side: "L",
    dx: "SCC of the buccal mucosa", histology: "Moderately differentiated SCC", t: "T3", n: "N2b", stage: "IVA",
    ecog: 1, packYears: 20, arm: "surgery", path: "2026-06-12", staging: 11, deferredFor: "PET-CT not yet reported", toTx: 38,
    dental: true, presenter: S, adjuvant: { dec2: 16, start: null, modality: "chemoradiotherapy" },
    loops: [
      petLoop(S, 3, 230, 30),
      anaesLoop(19, 18, 3),
      { kind: "scheduling", to: "radiation-oncology", by: S, answerer: C, day: 22, ackH: 1, ansH: 4, closeH: 1,
        reroutedFrom: "radiation-oncology",
        request: "Book theatre for composite resection and free flap.", answer: "Theatre confirmed; plastic surgery list aligned.", closure: "Confirmed." },
    ],
  },
  {
    name: "Peretz, Shimon", nid: "000000075", age: 59, sex: "M", subsite: "oropharynx", site: "TON", side: "R",
    dx: "Tonsillar SCC, p16 positive", histology: "Non-keratinising SCC, p16 positive", t: "T1", n: "N1", stage: "I",
    p16: "positive", edition: "AJCC 9", ecog: 0, packYears: 5, arm: "surgery", path: "2026-06-15", staging: 8, toTx: 27, presenter: S,
    loops: [p16Loop(0, 28, 2), orLoop(12, 3, 1)],
  },
  {
    name: "Ben-Ami, Tova", nid: "000000083", age: 66, sex: "F", subsite: "sinonasal", site: "SNC", side: "L",
    dx: "Sinonasal SCC of the maxillary sinus", histology: "Keratinising SCC", t: "T3", n: "N0", stage: "III",
    ecog: 1, arm: "surgery", path: "2026-06-17", staging: 13, toTx: 44, presenter: S,
    loops: [
      { kind: "skull-base-opinion", to: "neurosurgery", by: S, answerer: "u-nsurg", day: 5, ackH: 70, ansH: 140, closeH: 30,
        request: "Is the orbital floor or skull base involved enough to need a combined approach?", answer: "Orbital floor only; no intracranial extension. ENT-led maxillectomy.",
        closure: "Single-team approach.", blocks: "Skull base opinion" },
      anaesLoop(18, 24, 6), orLoop(22, 10, 4),
    ],
  },
  {
    name: "Dahan, Eliyahu", nid: "000000091", age: 70, sex: "M", subsite: "oral-cavity", site: "GUM", side: "R",
    dx: "SCC of the lower alveolar ridge", histology: "Moderately differentiated SCC with bone invasion", t: "T4a", n: "N0", stage: "IVA",
    ecog: 1, packYears: 35, arm: "surgery", path: "2026-06-19", staging: 9, toTx: 31, dental: true, presenter: S,
    loops: [anaesLoop(10, 20, 3), orLoop(13, 6, 2),
      { kind: "dental-clearance", to: "dentistry", by: S, answerer: D, day: 11, ackH: 24, ansH: 60, closeH: null,
        request: "Dental review of the remaining teeth before segmental mandibulectomy.", answer: "Remaining teeth restorable; no extractions needed before surgery." }],
  },
  {
    name: "Golan, Miriam", nid: "000000109", age: 55, sex: "F", subsite: "larynx", site: "SGL", side: "M",
    dx: "Supraglottic SCC", histology: "Poorly differentiated SCC", t: "T2", n: "N0", stage: "II",
    ecog: 0, packYears: 25, arm: "surgery", path: "2026-06-22", staging: 7, toTx: 24, presenter: R,
    loops: [
      { kind: "swallow-assessment", to: "speech-language", by: R, answerer: L, day: 2, ackH: 20, ansH: 44, closeH: 3,
        request: "Pre-operative swallow and voice baseline before transoral supraglottic laryngectomy.", answer: "FEES baseline safe; rehabilitation plan written.",
        closure: "Baseline on file." },
      orLoop(8, 4, 2),
    ],
  },

  /* ── Primary radiotherapy / chemoradiation ─────────────────────────────── */
  {
    name: "Cohen, Nir", nid: "000000117", age: 48, sex: "M", subsite: "nasopharynx", site: "NPC", side: "M",
    dx: "Nasopharyngeal carcinoma, EBV associated", histology: "Non-keratinising undifferentiated carcinoma, EBER positive", t: "T2", n: "N2", stage: "III",
    ecog: 0, arm: "chemoradiotherapy", path: "2026-06-02", staging: 14, toTx: 49, dental: true, peg: true, presenter: K,
    loops: [petLoop(K, 2, 96, 6), dentalLoop(K, 8, 120, 12), cisLoop(17, 20, 2), pegLoop(17, 26, 4), rtLoop(A, 18, 24, 3)],
  },
  {
    name: "Avraham, Sara", nid: "000000125", age: 62, sex: "F", subsite: "oropharynx", site: "BOT", side: "L",
    dx: "Base of tongue SCC, p16 positive", histology: "Non-keratinising SCC, p16 positive", t: "T3", n: "N2", stage: "III",
    p16: "positive", edition: "AJCC 9", ecog: 1, packYears: 10, arm: "chemoradiotherapy", path: "2026-06-04", staging: 10,
    toTx: 55, dental: true, peg: true, presenter: K,
    loops: [p16Loop(0, 30, 3), petLoop(K, 3, 80, 5), dentalLoop(K, 10, 190, 20), cisLoop(15, 18, 2), pegLoop(15, 30, 6), rtLoop(A, 16, 26, 2)],
  },
  {
    name: "Harari, Oded", nid: "000000133", age: 71, sex: "M", subsite: "larynx", site: "GLT", side: "L",
    dx: "Glottic SCC, T2", histology: "Moderately differentiated SCC", t: "T2", n: "N0", stage: "II",
    ecog: 1, packYears: 50, arm: "radiotherapy", path: "2026-06-05", staging: 7, toTx: 35, presenter: K,
    loops: [
      rtLoop(S, 9, 20, 2),
      { kind: "swallow-assessment", to: "speech-language", by: K, answerer: L, day: 10, ackH: 30, ansH: 70, closeH: 8,
        request: "Voice and swallow baseline before radical radiotherapy.", answer: "Baseline recorded; weekly voice care during treatment.", closure: "Noted." },
    ],
  },
  {
    name: "Biton, Yosef", nid: "000000141", age: 66, sex: "M", subsite: "hypopharynx", site: "HPX", side: "R",
    dx: "Pyriform sinus SCC", histology: "Poorly differentiated SCC", t: "T3", n: "N2b", stage: "IVA",
    ecog: 1, packYears: 45, arm: "chemoradiotherapy", path: "2026-06-06", staging: 13, deferredFor: "Nutrition assessment outstanding",
    toTx: 66, dental: true, peg: true, presenter: K,
    loops: [
      petLoop(K, 2, 70, 4),
      { ...pegLoop(4, 400, 20), blocks: "Nutrition assessment", escalateH: 80 },
      dentalLoop(K, 20, 160, 10), cisLoop(22, 20, 3), rtLoop(A, 23, 40, 4),
    ],
  },
  {
    name: "Nachum, Hadas", nid: "000000158", age: 53, sex: "F", subsite: "oropharynx", site: "TON", side: "L",
    dx: "Tonsillar SCC, p16 positive", histology: "Non-keratinising SCC, p16 positive", t: "T2", n: "N1", stage: "I",
    p16: "positive", edition: "AJCC 9", ecog: 0, packYears: 0, arm: "chemoradiotherapy", path: "2026-06-09", staging: 9,
    toTx: 46, dental: true, presenter: K,
    loops: [p16Loop(0, 26, 2), dentalLoop(K, 10, 110, 8), cisLoop(13, 22, 2), rtLoop(A, 14, 30, 4)],
  },
  {
    name: "Segal, Aharon", nid: "000000166", age: 69, sex: "M", subsite: "unknown-primary", site: "CUP", side: "R",
    dx: "Metastatic p16 positive SCC, unknown primary", histology: "SCC in a level II node, p16 positive", t: "T0", n: "N1", stage: "I",
    p16: "positive", edition: "AJCC 9", ecog: 1, packYears: 15, arm: "chemoradiotherapy", path: "2026-06-11", staging: 16,
    toTx: 58, dental: true, peg: true, presenter: S,
    loops: [
      petLoop(S, 1, 60, 4),
      { kind: "pathology-review", to: "pathology", by: S, answerer: P, day: 6, ackH: 3, ansH: 50, closeH: 10,
        request: "Tongue base mucosectomy and bilateral tonsillectomy specimens — any primary identified?", answer: "No primary identified in any specimen.",
        closure: "True unknown primary — for the board.", blocks: "Panendoscopy histology" },
      dentalLoop(K, 18, 150, 30), cisLoop(20, 24, 3), pegLoop(20, 30, 4), rtLoop(A, 21, 36, 6),
    ],
  },
  {
    name: "Tzur, Rivka", nid: "000000174", age: 58, sex: "F", subsite: "nasopharynx", site: "NPC", side: "M",
    dx: "Nasopharyngeal carcinoma, EBV associated", histology: "Non-keratinising carcinoma, EBER positive", t: "T3", n: "N1", stage: "III",
    ecog: 0, arm: "chemoradiotherapy", path: "2026-06-12", staging: 12, toTx: 52, dental: true, presenter: K,
    loops: [petLoop(K, 2, 100, 8), dentalLoop(K, 14, 140, 10), cisLoop(18, 18, 2), rtLoop(A, 19, 28, 3),
      { kind: "oncology-opinion", to: "medical-oncology", by: K, answerer: A, day: 18, ackH: 4, ansH: 20, closeH: null,
        request: "Induction gemcitabine–cisplatin before chemoradiation?", answer: "Yes — two cycles of induction GP, then concurrent cisplatin." }],
  },
  {
    name: "Elbaz, Rafael", nid: "000000182", age: 74, sex: "M", subsite: "larynx", site: "SGL", side: "M",
    dx: "Supraglottic SCC, T3", histology: "Moderately differentiated SCC", t: "T3", n: "N2c", stage: "IVA",
    ecog: 1, packYears: 60, arm: "chemoradiotherapy", path: "2026-06-15", staging: 11, toTx: 63, dental: true, peg: true, presenter: K,
    loops: [
      petLoop(K, 2, 90, 6),
      { ...dentalLoop(K, 13, 260, 40), overrideBy: "u-katz" },
      cisLoop(20, 24, 3), pegLoop(20, 20, 3), rtLoop(A, 21, 50, 6),
    ],
  },
  {
    name: "Rosenberg, Gila", nid: "000000190", age: 45, sex: "F", subsite: "oropharynx", site: "BOT", side: "R",
    dx: "Base of tongue SCC, p16 negative", histology: "Keratinising SCC, p16 negative", t: "T3", n: "N2b", stage: "IVA",
    p16: "negative", ecog: 0, packYears: 22, arm: "chemoradiotherapy", path: "2026-06-18", staging: 10, toTx: 41, presenter: K,
    loops: [p16Loop(0, 24, 2), petLoop(K, 2, 60, 3), cisLoop(12, 20, 2), rtLoop(A, 13, 24, 2)],
  },
  {
    name: "Malka, Shlomo", nid: "000000208", age: 77, sex: "M", subsite: "hypopharynx", site: "HPX", side: "L",
    dx: "Post-cricoid SCC", histology: "Poorly differentiated SCC", t: "T2", n: "N2c", stage: "IVA",
    ecog: 2, packYears: 55, arm: "radiotherapy", path: "2026-06-08", staging: 15, deferredFor: "Fitness for cisplatin unresolved",
    toTx: 72, dental: true, peg: true, presenter: K,
    loops: [
      petLoop(K, 2, 110, 10),
      { ...cisLoop(10, null as unknown as number, null), ackH: null, ansH: null, closeH: null, escalateH: 90,
        request: "Is he fit for concurrent cisplatin at ECOG 2 and eGFR 48? If not, radiotherapy alone." },
      { kind: "oncology-opinion", to: "medical-oncology", by: S, answerer: A, day: 22, ackH: 2, ansH: 20, closeH: 2,
        request: "Re-sent after no response: cisplatin fitness at ECOG 2, eGFR 48.", answer: "Not fit for cisplatin. Radiotherapy alone, or cetuximab if the board prefers.",
        closure: "Radiotherapy alone agreed.", blocks: "Fitness for cisplatin" },
      dentalLoop(K, 24, 170, 20), pegLoop(24, 30, 4), rtLoop(A, 29, 60, 8),
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* Builder                                                                     */
/* -------------------------------------------------------------------------- */

export const SIM_NOW = "2026-08-20T09:00:00";
const MODALITY: Record<Arm, TreatmentModality> = {
  surgery: "surgery",
  radiotherapy: "radiotherapy",
  chemoradiotherapy: "chemoradiotherapy",
};

export interface Simulation {
  patients: Patient[];
  loops: Loop[];
  sessions: MdtSession[];
}

/**
 * A nine-digit number that passes the Israeli check digit and starts with 99 —
 * a prefix outside the range the Population Registry issues, so a synthetic
 * record can never collide with a real person's number.
 */
export function syntheticNationalId(i: number): string {
  const body = `99${String(100000 + i * 7919).slice(-6)}`;
  for (let c = 0; c <= 9; c++) {
    const d = body + c;
    let sum = 0;
    for (let k = 0; k < 9; k++) {
      let v = Number(d[k]) * ((k % 2) + 1);
      if (v > 9) v -= 9;
      sum += v;
    }
    if (sum % 10 === 0) return d;
  }
  throw new Error("unreachable");
}

function mrnFor(i: number) {
  return String(610000 + i * 137);
}

export function buildSimulation(): Simulation {
  const patients: Patient[] = [];
  const loops: Loop[] = [];
  /** date → cases */
  const boards = new Map<string, MdtCaseEntry[]>();
  let loopN = 0;
  let caseN = 0;

  const ordered = [...SIM_SPECS].sort((a, b) => a.path.localeCompare(b.path));

  ordered.forEach((sp, i) => {
    const seq = i + 1;
    const id = `sim-${String(seq).padStart(2, "0")}`;
    const studyId = formatStudyId("ENT", seq, sp.site, sp.side, sp.path);
    const modality = MODALITY[sp.arm];

    // Board dates: listed once staging is complete; a deferred case is decided a week later.
    const firstBoard = nextThursday(addDays(sp.path, sp.staging));
    const decisionBoard = sp.deferredFor ? addDays(firstBoard, 7) : firstBoard;
    const tx = addDays(sp.path, sp.toTx);
    if (tx <= decisionBoard) throw new Error(`${studyId}: treatment before decision`);
    const referral = addDays(decisionBoard, 1);

    /* Loops */
    const prereqs: MdtCaseEntry["prerequisites"] = [
      { label: "Histology", ready: true },
      { label: "Cross-sectional imaging", ready: true },
    ];
    sp.loops.forEach((ls) => {
      loopN += 1;
      const lid = `sl-${String(loopN).padStart(3, "0")}`;
      const openDay = addDays(sp.path, ls.day);
      const openedAt = at(openDay, 0.5 + (loopN % 5) * 0.4);
      const events: LoopEvent[] = [{ at: openedAt, actorId: ls.by, type: "opened" }];
      const plus = (h: number) => at(openDay, 0.5 + (loopN % 5) * 0.4 + h);
      const loop: Loop = {
        id: lid,
        patientId: id,
        kind: ls.kind,
        urgency: ls.urgency ?? (ls.blocks ? "urgent" : "routine"),
        situation: `${sp.age}-year-old ${sp.sex === "M" ? "man" : "woman"} with ${sp.dx.charAt(0).toLowerCase()}${sp.dx.slice(1)}, ${sp.t} ${sp.n} ${sp.m ?? "M0"}.`,
        background: `${sp.histology}. Malignant pathology reported ${sp.path}.`,
        assessment: ls.blocks
          ? "The board cannot decide until this is back."
          : "Needed before treatment can start on the planned date.",
        request: ls.request,
        requesterId: ls.by,
        toDiscipline: ls.reroutedFrom && ls.to === ls.reroutedFrom ? "nursing" : ls.to,
        openedAt,
        events,
      };
      if (ls.reroutedFrom) {
        // Sent to radiation oncology by mistake; the surgery lead moved it to nursing.
        loop.toDiscipline = ls.reroutedFrom;
        const rAt = plus(3);
        loop.toDiscipline = "nursing";
        loop.overriddenBy = S;
        loop.overrideReason = "Theatre booking belongs to the nurse coordinator, not radiation oncology";
        events.push({ at: rAt, actorId: S, type: "reassigned", note: `Rerouted from Rad Onc to Nursing — ${loop.overrideReason}` });
      }
      if (ls.escalateH) {
        events.push({ at: plus(ls.escalateH), actorId: ls.by, type: "escalated", note: "Escalated after passing the target turnaround" });
        loop.urgency = "stat";
      }
      if (ls.ackH !== null) {
        const off = ls.reroutedFrom ? 3 : 0;
        loop.acknowledgedAt = plus(off + ls.ackH);
        loop.acknowledgedBy = ls.answerer;
        events.push({ at: loop.acknowledgedAt, actorId: ls.answerer, type: "acknowledged" });
      }
      if (ls.ansH !== null && ls.answer) {
        const off = ls.reroutedFrom ? 3 : 0;
        loop.answeredAt = plus(off + ls.ansH);
        loop.answeredBy = ls.answerer;
        loop.answer = ls.answer;
        events.push({ at: loop.answeredAt, actorId: ls.answerer, type: "answered" });
        if (ls.closeH !== null) {
          const off2 = off + ls.ansH + ls.closeH;
          if (ls.overrideBy) {
            loop.closedAt = plus(off2);
            loop.closedBy = ls.overrideBy;
            loop.closureNote = "Requester on leave; answer reviewed and accepted by the discipline lead";
            loop.overriddenBy = ls.overrideBy;
            loop.overrideReason = loop.closureNote;
            // The requester is the loop's opener; make the opener someone other than the lead.
            loop.requesterId = C;
            events[0] = { ...events[0], actorId: C };
            events.push({ at: loop.closedAt, actorId: ls.overrideBy, type: "override-closed", note: loop.closureNote });
          } else {
            loop.closedAt = plus(off2);
            loop.closedBy = ls.by;
            loop.closureNote = ls.closure ?? "Resolved.";
            events.push({ at: loop.closedAt, actorId: ls.by, type: "closed", note: loop.closureNote });
          }
        }
      }
      events.sort((a, b) => a.at.localeCompare(b.at));
      if (ls.blocks) prereqs.push({ label: ls.blocks, ready: Boolean(loop.closedAt), loopId: lid });
      loops.push(loop);
    });

    // A prerequisite is "ready" at the board only if its loop closed before the board sat.
    const readyBy = (day: string) =>
      prereqs.map((p) => {
        if (!p.loopId) return p;
        const l = loops.find((x) => x.id === p.loopId)!;
        return { ...p, ready: Boolean(l.closedAt && l.closedAt.slice(0, 10) <= day) };
      });

    const decision = {
      intent: "curative" as const,
      modalities: [modality],
      recommendation:
        modality === "surgery"
          ? "Primary surgical resection with neck management as indicated; re-present with final pathology."
          : modality === "radiotherapy"
            ? "Radical radiotherapy to the primary and neck."
            : "Concurrent chemoradiotherapy to the primary and bilateral neck.",
      rationale: "Consensus of the board.",
      quorumMet: true,
      decidedAt: at(decisionBoard, 1),
      decidedBy: "u-rosen",
    };

    if (sp.deferredFor) {
      caseN += 1;
      const list = boards.get(firstBoard) ?? [];
      list.push({
        id: `sc-${caseN}`, patientId: id, presenterId: sp.presenter,
        question: "Definitive treatment?", status: "deferred", deferReason: sp.deferredFor,
        timesDeferred: 1, prerequisites: readyBy(firstBoard),
      });
      boards.set(firstBoard, list);
    }
    caseN += 1;
    const list2 = boards.get(decisionBoard) ?? [];
    list2.push({
      id: `sc-${caseN}`, patientId: id, presenterId: sp.presenter,
      question: "Definitive treatment?", status: "decided", decision,
      timesDeferred: sp.deferredFor ? 1 : 0, prerequisites: readyBy(decisionBoard),
    });
    boards.set(decisionBoard, list2);

    // Re-presentation with final pathology after surgery.
    let dec2: string | undefined;
    let adj: string | undefined;
    if (sp.adjuvant) {
      dec2 = nextThursday(addDays(tx, sp.adjuvant.dec2 - 3));
      caseN += 1;
      const l3 = boards.get(dec2) ?? [];
      l3.push({
        id: `sc-${caseN}`, patientId: id, presenterId: sp.presenter,
        question: "Adjuvant treatment on final pathology?", status: "decided", timesDeferred: 0,
        prerequisites: [{ label: "Final histology", ready: true }],
        decision: { ...decision, modalities: [sp.adjuvant.modality], recommendation: `Adjuvant ${sp.adjuvant.modality === "radiotherapy" ? "radiotherapy" : "chemoradiotherapy"} on final pathology.`, decidedAt: at(dec2, 1) },
      });
      boards.set(dec2, l3);
      if (sp.adjuvant.start !== null) adj = addDays(tx, sp.adjuvant.start);
    }

    const treated = tx <= SIM_NOW.slice(0, 10);
    patients.push({
      id,
      nationalId: syntheticNationalId(seq),
      mrn: mrnFor(seq),
      name: sp.name,
      age: sp.age,
      sex: sp.sex,
      subsite: sp.subsite,
      diagnosis: sp.dx,
      histology: sp.histology,
      tnm: { t: sp.t, n: sp.n, m: sp.m ?? "M0", p16: sp.p16, edition: sp.edition ?? "AJCC 8", stageGroup: sp.stage },
      status: sp.adjuvant ? "post-op" : treated ? "treatment" : "mdt-review",
      acuity: "routine",
      alerts: [],
      comorbidities: [],
      ecog: sp.ecog,
      smokingPackYears: sp.packYears,
      plan: decision.recommendation,
      careTeamIds: [...new Set([sp.presenter, ...sp.loops.map((l) => l.answerer)])],
      referralDate: addDays(sp.path, -10),
      decisionDate: decisionBoard,
      treatmentStartDate: treated ? tx : undefined,
      timeline: [
        { id: `${id}-t1`, date: addDays(sp.path, -10), kind: "referral", title: "First ENT consultation", detail: "Referred on the suspected head and neck cancer pathway." },
        { id: `${id}-t2`, date: addDays(sp.path, -5), kind: "biopsy", title: "Biopsy", detail: "Diagnostic biopsy taken." },
        { id: `${id}-t3`, date: sp.path, kind: "pathology", title: "Malignant pathology report (t = 0)", detail: sp.histology },
        ...(sp.deferredFor ? [{ id: `${id}-t4`, date: firstBoard, kind: "mdt" as const, title: "Board — deferred", detail: sp.deferredFor }] : []),
        { id: `${id}-t5`, date: decisionBoard, kind: "mdt", title: "MDT decision recorded", detail: decision.recommendation },
        ...(treated ? [{ id: `${id}-t6`, date: tx, kind: (modality === "surgery" ? "surgery" : "radiotherapy") as "surgery" | "radiotherapy", title: "First definitive treatment", detail: modality === "surgery" ? "Primary surgical resection." : modality === "radiotherapy" ? "Radiotherapy started." : "Chemoradiotherapy started." }] : []),
      ],
      documents: [],
      // study record
      studyId,
      studySeq: seq,
      siteCode: sp.site,
      side: sp.side,
      pathologyDate: sp.path,
      plannedModality: modality,
      treatmentModality: treated ? modality : undefined,
      orReferralDate: modality === "surgery" ? referral : undefined,
      rtReferralDate: modality !== "surgery" ? referral : undefined,
      secondDecisionDate: dec2,
      adjuvantStartDate: adj,
      dentalNeeded: Boolean(sp.dental),
      pegNeeded: Boolean(sp.peg),
    });
  });

  const sessions: MdtSession[] = [...boards.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, cases], i) => ({
      id: `ss-${i + 1}`,
      title: "Head & Neck Tumour Board",
      date,
      startTime: "08:00",
      location: "Seminar Room 2 + video link",
      chairId: "u-rosen",
      requiredDisciplines: ["surgery", "medical-oncology", "radiation-oncology", "pathology", "radiology"],
      attendeeIds: ["u-rosen", "u-levi", "u-amara", "u-katz", "u-shani", "u-gold", "u-nurse"],
      status: "complete",
      cases,
    }));

  return { patients, loops, sessions };
}
