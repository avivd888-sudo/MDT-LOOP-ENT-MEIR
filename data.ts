/**
 * Synthetic demonstration dataset.
 *
 * ⚠️  Every record here is fabricated. No real patients, no real national ID
 * numbers, no real medical record numbers. The clinical detail is written to
 * be *plausible* so the prototype can be evaluated by clinicians, but it is
 * not derived from any real case.
 *
 * Replacing this module with API calls is the integration point for the
 * hospital record (Chameleon / Ofek via FHIR-IL).
 */

import { setRoster } from "./roster";
import { assignStudyId } from "./study-id";
import type {
  PendingMember,
  ClinicalDocument,
  EvidenceItem,
  Loop,
  MdtSession,
  Patient,
  TeamMember,
} from "./types";

/** Demonstration "today" — every relative calculation derives from this. */
export const TODAY = "2026-08-20";
export const NOW = "2026-08-20T09:00:00";

export const ORG = {
  hospital: "Meir Medical Center, Kfar Saba",
  hmo: "Clalit Health Services",
  department: "Department of Otolaryngology — Head and Neck Surgery",
};

/**
 * Identifier pool for records created at runtime.
 *
 * `output: "export"` writes one HTML file per route at build time, so it
 * cannot serve a route for a record created afterwards. The build pre-renders
 * pages for this pool so a loop or patient created during a demo opens
 * normally. A server deployment does not need it — dynamic routes work there by
 * themselves.
 */
const RUNTIME_POOL = Array.from({ length: 40 }, (_, i) => 1001 + i);
export const futureLoopIds = RUNTIME_POOL.map((n) => `l-${n}`);
export const futurePatientIds = RUNTIME_POOL.map((n) => `p-${n}`);
export const futureSessionIds = RUNTIME_POOL.map((n) => `s-${n}`);

/* -------------------------------------------------------------------------- */
/* The multidisciplinary team                                                  */
/* -------------------------------------------------------------------------- */

export const TEAM: TeamMember[] = [
  // Discipline leads are the department heads themselves. In the demonstration
  // the signed-in clinician is one of them, so the lead's powers are visible;
  // in a deployment each discipline has its own, and more can be defined.
  { id: "u-levi", name: "Dr. Dana Levi", role: "Head & Neck Surgeon · discipline lead", discipline: "surgery", initials: "DL", colour: "#137fec", online: true, coreMember: true, disciplineLead: true },
  { id: "u-amara", name: "Dr. Noa Amara", role: "Head & Neck Oncologist", discipline: "medical-oncology", initials: "NA", colour: "#a78bfa", online: true, coreMember: true, disciplineLead: true },
  { id: "u-rosen", name: "Prof. Eli Rosen", role: "Department Chair", discipline: "surgery", initials: "ER", colour: "#f59e0b", online: false, coreMember: true },
  { id: "u-katz", name: "Dr. Maya Katz", role: "Radiation Oncologist", discipline: "radiation-oncology", initials: "MK", colour: "#10b981", online: true, coreMember: true, disciplineLead: true },
  { id: "u-shani", name: "Dr. Ronen Shani", role: "Head & Neck Pathologist", discipline: "pathology", initials: "RS", colour: "#ef4444", online: true, coreMember: true, disciplineLead: true },
  { id: "u-gold", name: "Dr. Tal Gold", role: "Neuroradiologist", discipline: "radiology", initials: "TG", colour: "#06b6d4", online: false, coreMember: true, disciplineLead: true },
  // The two disciplines the beta adds for Meir. Thyroid and salivary work is a
  // large share of a head and neck list, and a deep neck infection or a febrile
  // neutropenia during chemoradiation is the other call that cannot wait.
  { id: "u-endo", name: "Dr. Sivan Harel", role: "Endocrinologist · thyroid clinic", discipline: "endocrinology", initials: "SH", colour: "#0ea5e9", online: true, coreMember: true, disciplineLead: true },
  { id: "u-id", name: "Dr. Rami Ashkenazi", role: "Infectious Diseases Physician", discipline: "infectious-diseases", initials: "RA", colour: "#14b8a6", online: false, disciplineLead: true },
  // Available rather than core. A skull base case needs both of these and cannot
  // proceed without them; most cases need neither, and putting them in the
  // quorum would stall every ordinary board for two people who have nothing to
  // say about it.
  { id: "u-neuro", name: "Dr. Efrat Ben-Ari", role: "Neurologist · cranial nerve clinic", discipline: "neurology", initials: "EB", colour: "#a855f7", online: false, disciplineLead: true },
  { id: "u-nsurg", name: "Dr. Guy Almog", role: "Neurosurgeon · anterior skull base", discipline: "neurosurgery", initials: "GA", colour: "#7c3aed", online: false, disciplineLead: true },
  // Dental clearance before radiotherapy is the commonest pre-treatment step
  // (Cook 2022: 74% of patients), so the discipline needs someone on the roster.
  { id: "u-dent", name: "Dr. Oren Tamir", role: "Oral Medicine · pre-radiotherapy dental clinic", discipline: "dentistry", initials: "OT", colour: "#eab308", online: false, disciplineLead: true },
  { id: "u-bar", name: "Dr. Yoav Bar", role: "Consultant Anaesthetist", discipline: "anaesthetics", initials: "YB", colour: "#f97316", online: false },
  { id: "u-nurse", name: "Sarah Klein", role: "H&N Clinical Nurse Specialist", discipline: "nursing", initials: "SK", colour: "#ec4899", online: true, coreMember: true },
  { id: "u-slt", name: "Yael Barak", role: "Speech & Language Therapist", discipline: "speech-language", initials: "YB", colour: "#8b5cf6", online: false },
  { id: "u-diet", name: "Rina Peled", role: "Oncology Dietitian", discipline: "dietetics", initials: "RP", colour: "#84cc16", online: true },
  { id: "u-pall", name: "Dr. Amir Sela", role: "Palliative Care Physician", discipline: "palliative", initials: "AS", colour: "#64748b", online: false },
];

export const CURRENT_USER_ID = "u-levi";

/**
 * Two access requests, waiting.
 *
 * Seeded so the control is visible rather than described: a demonstration that
 * only *claims* to gate access is worth nothing to an information security
 * officer. One request is in surgery, which the signed-in lead can act on; the
 * other is in anaesthetics, which she cannot — the scoping is the point, and it
 * is easier to show than to explain.
 */
export const PENDING_REQUESTS: PendingMember[] = [
  {
    id: "u-req-adler",
    name: "Dr. Yael Adler",
    role: "Head & Neck Fellow",
    discipline: "surgery",
    email: "yadler@clalit.org.il",
    organisation: "Clalit Health Services",
    licence: "41552",
    requestedAt: "2026-08-19T07:40:00+03:00",
    verifiedAt: "2026-08-19T07:46:00+03:00",
  },
  {
    id: "u-req-nahum",
    name: "Dr. Omri Nahum",
    role: "Consultant Anaesthetist",
    discipline: "anaesthetics",
    email: "onahum@sheba.health.gov.il",
    organisation: "Ministry of Health and the government hospitals",
    licence: "38104",
    requestedAt: "2026-08-20T09:05:00+03:00",
    verifiedAt: "2026-08-20T09:11:00+03:00",
  },
];

/**
 * Re-exported so the nine call sites that look a clinician up keep working
 * unchanged. The registry behind it is `lib/roster.ts`, which the store keeps
 * in step with the shared roster; `TEAM` below is only the seed.
 */
export { member, allMembers } from "./roster";

// Seed the lookup registry. One direction only — see the note in roster.ts.
setRoster(TEAM);

/* -------------------------------------------------------------------------- */
/* Patients                                                                    */
/* -------------------------------------------------------------------------- */

const doc = (
  id: string,
  name: string,
  kind: ClinicalDocument["kind"],
  date: string,
  sizeLabel: string,
  unread?: boolean,
): ClinicalDocument => ({ id, name, kind, date, sizeLabel, unread });

const SEED_PATIENTS: Patient[] = [
  {
    id: "p-1",
    nationalId: "204810378",
    mrn: "482910",
    name: "Cohen, Abraham",
    age: 64,
    sex: "M",
    subsite: "larynx",
    diagnosis: "Glottic squamous cell carcinoma",
    histology: "Moderately differentiated SCC",
    tnm: { t: "T3", n: "N0", m: "M0", edition: "AJCC 8", stageGroup: "III", provisional: true },
    status: "awaiting-staging",
    acuity: "urgent",
    ward: "ENT",
    bed: "304",
    alerts: ["Stridor at rest — airway watch", "Anticoagulated (apixaban)"],
    comorbidities: ["COPD (FEV1 58%)", "Ischaemic heart disease", "Atrial fibrillation"],
    ecog: 1,
    smokingPackYears: 45,
    plan: "Airway assessment takes priority. Definitive plan pending CT neck and formal staging.",
    nextStep: { label: "CT neck with contrast", date: "2026-08-20T14:00:00" },
    careTeamIds: ["u-levi", "u-katz", "u-nurse", "u-slt", "u-bar"],
    referralDate: "2026-07-02",
    timeline: [
      { id: "t1", date: "2026-07-02", kind: "referral", title: "Referral from family physician", detail: "Six weeks of progressive hoarseness in a 45 pack-year smoker. Flagged as suspected cancer.", actor: "Dr. Y. Mor, Clalit" },
      { id: "t2", date: "2026-07-09", kind: "imaging", title: "Flexible nasendoscopy", detail: "Exophytic lesion of the right true cord crossing the anterior commissure. Cord mobility impaired.", actor: "Dr. Dana Levi" },
      { id: "t3", date: "2026-07-21", kind: "biopsy", title: "Microlaryngoscopy and biopsy", detail: "Under general anaesthesia. Airway maintained, no tracheostomy required.", actor: "Dr. Dana Levi" },
      { id: "t4", date: "2026-07-28", kind: "pathology", title: "Histology", detail: "Moderately differentiated invasive SCC. p16 not indicated at this site.", actor: "Dr. Ronen Shani" },
      { id: "t5", date: "2026-08-18", kind: "complication", title: "Admitted with stridor", detail: "Biphasic stridor at rest. Nebulised adrenaline and dexamethasone given. Airway stable, hourly observations.", actor: "On-call ENT" },
    ],
    documents: [
      doc("d1", "Histology — right glottis", "pathology", "2026-07-28", "1.2 MB"),
      doc("d2", "Nasendoscopy stills", "imaging", "2026-07-09", "8.4 MB"),
      doc("d3", "Pre-anaesthetic assessment", "letter", "2026-07-18", "240 KB"),
      doc("d4", "Admission bloods", "labs", "2026-08-18", "180 KB", true),
    ],
  },
  {
    id: "p-2",
    nationalId: "310294558",
    mrn: "110293",
    name: "Ben-David, Yossi",
    age: 58,
    sex: "M",
    subsite: "oropharynx",
    diagnosis: "Tonsillar SCC, p16 positive",
    histology: "Non-keratinising SCC, p16 positive (>70% block positivity)",
    tnm: { t: "T2", n: "N1", m: "M0", p16: "positive", ene: "none", edition: "AJCC 9", stageGroup: "I" },
    status: "mdt-review",
    acuity: "routine",
    ward: "Day unit",
    alerts: [],
    comorbidities: ["Well-controlled hypertension"],
    ecog: 0,
    smokingPackYears: 4,
    plan: "For MDT: transoral robotic surgery with neck dissection versus definitive radiotherapy.",
    nextStep: { label: "MDT tumour board", date: "2026-08-20T08:00:00" },
    careTeamIds: ["u-levi", "u-katz", "u-amara", "u-shani", "u-slt"],
    referralDate: "2026-07-14",
    timeline: [
      { id: "t1", date: "2026-07-14", kind: "referral", title: "Referral — neck lump", detail: "Painless right level II neck lump, three months. Minimal smoking history.", actor: "Dr. Y. Mor, Clalit" },
      { id: "t2", date: "2026-07-22", kind: "biopsy", title: "Ultrasound-guided core biopsy", detail: "Right level II node. Adequate sample obtained.", actor: "Dr. Tal Gold" },
      { id: "t3", date: "2026-07-29", kind: "pathology", title: "p16 positive SCC", detail: "Non-keratinising SCC, strong diffuse p16 positivity. HPV in-situ hybridisation confirmed positive.", actor: "Dr. Ronen Shani" },
      { id: "t4", date: "2026-08-05", kind: "imaging", title: "MRI neck + staging CT", detail: "2.8 cm right tonsillar primary. Single 2.1 cm ipsilateral level II node, no radiological ENE. No distant disease.", actor: "Dr. Tal Gold" },
      { id: "t5", date: "2026-08-12", kind: "mdt", title: "Staged under AJCC Version 9", detail: "p16+ oropharynx staged with the Version 9 system effective 1 Jan 2026. cT2 N1 M0 — clinical stage I.", actor: "Dr. Dana Levi" },
    ],
    documents: [
      doc("d1", "Core biopsy report + p16", "pathology", "2026-07-29", "980 KB"),
      doc("d2", "MRI neck with contrast", "imaging", "2026-08-05", "42 MB"),
      doc("d3", "Staging CT chest", "imaging", "2026-08-05", "28 MB"),
      doc("d4", "Dental assessment", "letter", "2026-08-11", "310 KB"),
    ],
  },
  {
    id: "p-3",
    nationalId: "399210285",
    mrn: "992102",
    name: "Levi, Sarah",
    age: 42,
    sex: "F",
    subsite: "thyroid",
    diagnosis: "Papillary thyroid carcinoma",
    histology: "Classical papillary carcinoma, 1.8 cm, no extrathyroidal extension",
    tnm: { t: "T1b", n: "N0", m: "M0", edition: "AJCC 8", stageGroup: "I" },
    status: "post-op",
    acuity: "routine",
    ward: "ENT",
    bed: "412",
    alerts: [],
    comorbidities: [],
    ecog: 0,
    plan: "Hemithyroidectomy performed. Discharge once calcium and voice confirmed stable.",
    nextStep: { label: "Post-operative clinic", date: "2026-09-03T10:00:00" },
    careTeamIds: ["u-levi", "u-nurse", "u-slt"],
    referralDate: "2026-05-20",
    decisionDate: "2026-08-13",
    treatmentStartDate: "2026-08-14",
    timeline: [
      { id: "t1", date: "2026-05-20", kind: "referral", title: "Referral — thyroid nodule", detail: "Incidental 1.8 cm right thyroid nodule found on imaging for an unrelated indication.", actor: "Dr. Y. Mor, Clalit" },
      { id: "t2", date: "2026-06-04", kind: "biopsy", title: "FNA cytology", detail: "Bethesda V — suspicious for papillary carcinoma.", actor: "Dr. Ronen Shani" },
      { id: "t3", date: "2026-08-13", kind: "mdt", title: "MDT decision", detail: "Active surveillance without completion thyroidectomy.", actor: "Prof. Eli Rosen" },
      { id: "t4", date: "2026-08-14", kind: "surgery", title: "Right hemithyroidectomy", detail: "Recurrent laryngeal nerve identified and preserved with intraoperative monitoring. Parathyroids preserved.", actor: "Dr. Dana Levi" },
      { id: "t5", date: "2026-08-17", kind: "pathology", title: "Final histology", detail: "1.8 cm classical papillary carcinoma. Margins clear, no extrathyroidal extension, no lymphovascular invasion.", actor: "Dr. Ronen Shani" },
    ],
    documents: [
      doc("d1", "Operative note", "operative", "2026-08-14", "220 KB"),
      doc("d2", "Final histology", "pathology", "2026-08-17", "640 KB"),
      doc("d3", "Post-operative calcium series", "labs", "2026-08-18", "120 KB"),
    ],
  },
  {
    id: "p-4",
    nationalId: "233910777",
    mrn: "339102",
    name: "Hassan, Omar",
    age: 29,
    sex: "M",
    subsite: "nasopharynx",
    diagnosis: "Nasopharyngeal carcinoma, EBV associated",
    histology: "Non-keratinising undifferentiated carcinoma, EBER positive",
    tnm: { t: "T2", n: "N2", m: "M0", edition: "AJCC 8", stageGroup: "III" },
    status: "treatment",
    acuity: "routine",
    ward: "Oncology day unit",
    alerts: ["Grade 2 mucositis — nutrition review"],
    comorbidities: [],
    ecog: 1,
    plan: "Concurrent chemoradiotherapy with cisplatin. Cycle 2 of 3.",
    nextStep: { label: "Cisplatin cycle 3", date: "2026-08-27T09:00:00" },
    careTeamIds: ["u-amara", "u-katz", "u-diet", "u-nurse"],
    referralDate: "2026-04-08",
    decisionDate: "2026-05-28",
    treatmentStartDate: "2026-06-15",
    timeline: [
      { id: "t1", date: "2026-04-08", kind: "referral", title: "Referral — unilateral hearing loss", detail: "Right conductive hearing loss with serous otitis media in an adult — red flag for nasopharyngeal pathology.", actor: "Dr. Y. Mor, Clalit" },
      { id: "t2", date: "2026-04-22", kind: "biopsy", title: "Nasopharyngeal biopsy", detail: "Fullness of the right fossa of Rosenmüller. Biopsy taken.", actor: "Dr. Dana Levi" },
      { id: "t3", date: "2026-04-30", kind: "pathology", title: "EBER positive carcinoma", detail: "Non-keratinising undifferentiated carcinoma, EBER in-situ hybridisation positive.", actor: "Dr. Ronen Shani" },
      { id: "t4", date: "2026-06-15", kind: "radiotherapy", title: "IMRT commenced", detail: "70 Gy in 35 fractions to the primary and involved nodes.", actor: "Dr. Maya Katz" },
      { id: "t5", date: "2026-08-06", kind: "systemic", title: "Cisplatin cycle 2", detail: "Given at 100 mg/m². Renal function and audiometry stable.", actor: "Dr. Noa Amara" },
    ],
    documents: [
      doc("d1", "Nasopharyngeal biopsy + EBER", "pathology", "2026-04-30", "880 KB"),
      doc("d2", "Radiotherapy plan", "letter", "2026-06-10", "3.1 MB"),
      doc("d3", "Baseline audiogram", "letter", "2026-06-02", "150 KB"),
    ],
  },
  {
    id: "p-5",
    nationalId: "277431847",
    mrn: "774318",
    name: "Mizrahi, Ruth",
    age: 71,
    sex: "F",
    subsite: "oral-cavity",
    diagnosis: "SCC of the lateral tongue",
    histology: "Well differentiated SCC, depth of invasion 8 mm on biopsy",
    tnm: { t: "T2", n: "N0", m: "M0", edition: "AJCC 8", stageGroup: "II", provisional: true },
    status: "new-referral",
    acuity: "urgent",
    alerts: ["Warfarin — INR 3.4 on admission"],
    comorbidities: ["Type 2 diabetes", "Mechanical mitral valve on warfarin", "CKD stage 3"],
    ecog: 2,
    smokingPackYears: 30,
    plan: "Urgent referral. Requires biopsy, staging imaging and anaesthetic review.",
    nextStep: { label: "Examination under anaesthesia + biopsy", date: "2026-08-24T08:30:00" },
    careTeamIds: ["u-levi", "u-nurse", "u-bar"],
    referralDate: "2026-08-11",
    timeline: [
      { id: "t1", date: "2026-08-11", kind: "referral", title: "Urgent referral", detail: "Non-healing left lateral tongue ulcer, seven weeks. Painful, with referred otalgia.", actor: "Dr. S. Adler, Clalit" },
      { id: "t2", date: "2026-08-18", kind: "imaging", title: "Clinic assessment", detail: "2.6 cm indurated ulcer of the left lateral tongue. No palpable neck nodes. Photographed and measured.", actor: "Dr. Dana Levi" },
    ],
    documents: [
      doc("d1", "Referral letter", "letter", "2026-08-11", "95 KB"),
      doc("d2", "Clinical photographs", "imaging", "2026-08-18", "6.2 MB", true),
    ],
  },
  {
    id: "p-6",
    nationalId: "255620197",
    mrn: "556201",
    name: "Azoulay, David",
    age: 67,
    sex: "M",
    subsite: "hypopharynx",
    diagnosis: "Pyriform sinus SCC",
    histology: "Poorly differentiated SCC",
    tnm: { t: "T4a", n: "N2b", m: "M0", ene: "imaging", edition: "AJCC 8", stageGroup: "IVA" },
    status: "mdt-review",
    acuity: "urgent",
    alerts: ["Aspirating — nil by mouth", "12 kg weight loss over three months"],
    comorbidities: ["Alcohol-related liver disease", "Malnutrition (BMI 17.4)"],
    ecog: 2,
    smokingPackYears: 50,
    plan: "For MDT: organ preservation versus laryngopharyngectomy. Nutrition is the rate-limiting issue.",
    nextStep: { label: "MDT tumour board", date: "2026-08-20T08:00:00" },
    careTeamIds: ["u-levi", "u-katz", "u-amara", "u-diet", "u-slt", "u-pall", "u-bar"],
    referralDate: "2026-06-30",
    timeline: [
      { id: "t1", date: "2026-06-30", kind: "referral", title: "Referral — dysphagia", detail: "Progressive dysphagia to solids and liquids with significant weight loss.", actor: "Gastroenterology" },
      { id: "t2", date: "2026-07-15", kind: "biopsy", title: "Panendoscopy and biopsy", detail: "Large exophytic left pyriform sinus tumour extending to the post-cricoid region.", actor: "Dr. Dana Levi" },
      { id: "t3", date: "2026-07-23", kind: "pathology", title: "Poorly differentiated SCC", detail: "Poorly differentiated invasive squamous cell carcinoma.", actor: "Dr. Ronen Shani" },
      { id: "t4", date: "2026-08-04", kind: "imaging", title: "Staging CT and MRI", detail: "T4a with thyroid cartilage erosion. Multiple ipsilateral level III nodes with radiological extranodal extension.", actor: "Dr. Tal Gold" },
      { id: "t5", date: "2026-08-15", kind: "complication", title: "Aspiration pneumonia", detail: "Treated with IV antibiotics. Nasogastric feeding commenced. Dietitian and SLT involved.", actor: "Dr. Amir Sela" },
    ],
    documents: [
      doc("d1", "Panendoscopy findings", "operative", "2026-07-15", "310 KB"),
      doc("d2", "Histology report", "pathology", "2026-07-23", "720 KB"),
      doc("d3", "Staging CT neck/chest", "imaging", "2026-08-04", "38 MB"),
      doc("d4", "Nutrition assessment", "letter", "2026-08-16", "200 KB", true),
    ],
  },
  {
    id: "p-7",
    nationalId: "203847124",
    mrn: "203847",
    name: "Friedman, Miriam",
    age: 55,
    sex: "F",
    subsite: "salivary",
    diagnosis: "Parotid adenoid cystic carcinoma",
    histology: "Adenoid cystic carcinoma, cribriform pattern, perineural invasion present",
    tnm: { t: "T2", n: "N0", m: "M0", edition: "AJCC 9", stageGroup: "II" },
    status: "surveillance",
    acuity: "routine",
    alerts: ["House-Brackmann III facial weakness post-operatively"],
    comorbidities: [],
    ecog: 1,
    plan: "Adjuvant radiotherapy completed. Long-term surveillance — adenoid cystic recurs late.",
    nextStep: { label: "Surveillance MRI", date: "2026-11-12T11:00:00" },
    careTeamIds: ["u-levi", "u-katz", "u-slt"],
    referralDate: "2025-09-15",
    decisionDate: "2025-10-20",
    treatmentStartDate: "2025-11-20",
    // A pathway that looked uneventful: every milestone completed, radiotherapy
    // started 39 days after surgery — comfortably inside the six-week target.
    // The package still finished at 82 days, inside the 11–12 week band. That
    // drift is invisible without measuring it, which is the point.
    adjuvant: {
      indicated: true,
      surgeryDate: "2025-11-20",
      planningDate: "2025-12-18",
      portStartDate: "2025-12-29",
      portEndDate: "2026-02-10",
      milestones: [
        { id: "radonc-preop", doneOn: "2025-11-05" },
        { id: "dental-preop", doneOn: "2025-11-11" },
        { id: "radonc-postop", doneOn: "2025-12-04" },
        { id: "planning-scan", doneOn: "2025-12-18" },
        { id: "rt-start", doneOn: "2025-12-29" },
      ],
    },
    timeline: [
      { id: "t1", date: "2025-09-15", kind: "referral", title: "Referral — parotid mass", detail: "Slowly enlarging left parotid mass over 18 months.", actor: "Dr. S. Adler, Clalit" },
      { id: "t2", date: "2025-11-20", kind: "surgery", title: "Total parotidectomy", detail: "Facial nerve dissected and anatomically preserved. Sural nerve cable graft to a sacrificed buccal branch.", actor: "Dr. Dana Levi" },
      { id: "t3", date: "2025-11-30", kind: "pathology", title: "Adenoid cystic carcinoma", detail: "Cribriform pattern with extensive perineural invasion. Margins close at the deep lobe.", actor: "Dr. Ronen Shani" },
      { id: "t4", date: "2026-02-10", kind: "radiotherapy", title: "Adjuvant radiotherapy completed", detail: "60 Gy in 30 fractions to the parotid bed, covering the named nerve pathway to the skull base.", actor: "Dr. Maya Katz" },
      { id: "t5", date: "2026-05-14", kind: "followup", title: "Surveillance MRI — no recurrence", detail: "No evidence of local recurrence. Facial function improving, House-Brackmann III.", actor: "Dr. Dana Levi" },
    ],
    documents: [
      doc("d1", "Operative note — parotidectomy", "operative", "2025-11-20", "280 KB"),
      doc("d2", "Histology — adenoid cystic", "pathology", "2025-11-30", "910 KB"),
      doc("d3", "Surveillance MRI report", "imaging", "2026-05-14", "22 MB"),
    ],
  },
  {
    id: "p-8",
    nationalId: "291827368",
    mrn: "918273",
    name: "Peretz, Yaakov",
    age: 61,
    sex: "M",
    subsite: "unknown-primary",
    diagnosis: "Metastatic p16 positive SCC, unknown primary",
    histology: "Metastatic non-keratinising SCC, p16 positive",
    tnm: { t: "T0", n: "N1", m: "M0", p16: "positive", ene: "none", edition: "AJCC 9", stageGroup: "I", provisional: true },
    status: "awaiting-staging",
    acuity: "routine",
    alerts: [],
    comorbidities: ["Obstructive sleep apnoea"],
    ecog: 0,
    smokingPackYears: 10,
    plan: "Panendoscopy with directed biopsies and bilateral tonsillectomy to identify the primary.",
    nextStep: { label: "PET-CT", date: "2026-08-25T13:00:00" },
    careTeamIds: ["u-levi", "u-shani", "u-gold"],
    referralDate: "2026-07-28",
    timeline: [
      { id: "t1", date: "2026-07-28", kind: "referral", title: "Referral — neck lump", detail: "Right level II neck lump. No mucosal lesion identified on clinic examination.", actor: "Dr. Y. Mor, Clalit" },
      { id: "t2", date: "2026-08-06", kind: "biopsy", title: "Fine needle aspiration", detail: "Metastatic squamous cell carcinoma. p16 positive on cell block.", actor: "Dr. Ronen Shani" },
      { id: "t3", date: "2026-08-13", kind: "imaging", title: "MRI neck", detail: "2.4 cm right level II node. No mucosal primary identified.", actor: "Dr. Tal Gold" },
    ],
    documents: [
      doc("d1", "FNA cytology + p16", "pathology", "2026-08-06", "540 KB"),
      doc("d2", "MRI neck", "imaging", "2026-08-13", "31 MB"),
    ],
  },
  {
    id: "p-9",
    nationalId: "312549871",
    mrn: "551204",
    name: "Shapira, Eitan",
    age: 61,
    sex: "M",
    subsite: "oral-cavity",
    diagnosis: "Squamous cell carcinoma of the floor of mouth",
    histology: "Moderately differentiated SCC, depth of invasion 14 mm, one positive node without extranodal extension",
    tnm: { t: "T3", n: "N1", m: "M0", edition: "AJCC 8", stageGroup: "III" },
    status: "post-op",
    acuity: "urgent",
    alerts: ["Adjuvant radiotherapy clock running — dental clearance outstanding"],
    comorbidities: ["Type 2 diabetes", "Hypertension"],
    ecog: 1,
    smokingPackYears: 30,
    plan: "Adjuvant radiotherapy indicated for depth of invasion and nodal disease. Planning cannot be booked until dental clearance is complete.",
    nextStep: { label: "Radiotherapy planning scan", date: "2026-08-25T09:30:00" },
    careTeamIds: ["u-levi", "u-katz", "u-nurse", "u-diet", "u-slt"],
    referralDate: "2026-05-28",
    decisionDate: "2026-06-25",
    treatmentStartDate: "2026-07-16",
    // The pathway this application exists to make visible. Surgery was on time
    // and the post-operative radiation oncology review happened on day 19 — but
    // dental clearance was never arranged before theatre, and it is now the
    // single step holding up planning. Thirty-five of the forty-two days are
    // gone.
    adjuvant: {
      indicated: true,
      surgeryDate: "2026-07-16",
      milestones: [
        { id: "radonc-preop", doneOn: "2026-07-02" },
        { id: "radonc-postop", doneOn: "2026-08-04" },
        { id: "dental-preop", loopId: "l-9" },
        { id: "planning-scan" },
        { id: "rt-start" },
      ],
    },
    timeline: [
      { id: "t1", date: "2026-05-28", kind: "referral", title: "Referral — non-healing floor of mouth ulcer", detail: "Six weeks of a painful, non-healing ulcer in a 30 pack-year smoker.", actor: "Dr. N. Barzilai, Clalit" },
      { id: "t2", date: "2026-06-09", kind: "biopsy", title: "Incisional biopsy", detail: "Under local anaesthesia in clinic. Moderately differentiated invasive SCC.", actor: "Dr. Dana Levi" },
      { id: "t3", date: "2026-06-25", kind: "mdt", title: "MDT decision — primary surgery", detail: "Resection with selective neck dissection, adjuvant radiotherapy anticipated given depth of invasion.", actor: "Prof. Eli Rosen" },
      { id: "t4", date: "2026-07-16", kind: "surgery", title: "Resection and selective neck dissection", detail: "Per-oral resection with radial forearm free flap reconstruction. Levels I–III neck dissection.", actor: "Dr. Dana Levi" },
      { id: "t5", date: "2026-07-24", kind: "pathology", title: "Final histology", detail: "Depth of invasion 14 mm. One of 28 nodes positive at level II, no extranodal extension. Margins clear at 4 mm.", actor: "Dr. Ronen Shani" },
      { id: "t6", date: "2026-08-04", kind: "followup", title: "Radiation oncology review", detail: "Adjuvant radiotherapy confirmed. Planning cannot proceed until dental clearance is documented.", actor: "Dr. Maya Katz" },
    ],
    documents: [
      doc("d1", "Operative note — resection and flap", "operative", "2026-07-16", "340 KB"),
      doc("d2", "Final histology report", "pathology", "2026-07-24", "1.1 MB"),
      doc("d3", "Radiation oncology letter", "letter", "2026-08-04", "180 KB", true),
    ],
  },
];

/**
 * The study record for the demonstration patients: site, side and the date of
 * the malignant pathology report, from which the study ID follows. Two patients
 * have no pathology yet, so they have no study ID yet — an identifier is issued
 * at t = 0, not at referral.
 */
const SEED_STUDY: Record<string, Pick<Patient, "siteCode" | "side" | "pathologyDate">> = {
  "p-4": { siteCode: "NPC", side: "M", pathologyDate: "2026-04-30" },
  "p-3": { siteCode: "THY", side: "B", pathologyDate: "2026-06-10" },
  "p-9": { siteCode: "FOM", side: "M", pathologyDate: "2026-06-12" },
  "p-6": { siteCode: "HPX", side: "L", pathologyDate: "2026-07-23" },
  "p-1": { siteCode: "GLT", side: "R", pathologyDate: "2026-07-28" },
  "p-2": { siteCode: "TON", side: "R", pathologyDate: "2026-07-29" },
};

export const PATIENTS: Patient[] = (() => {
  const withStudy = SEED_PATIENTS.map((p) => ({ ...p, ...SEED_STUDY[p.id] }));
  const order = withStudy
    .filter((p) => p.pathologyDate)
    .sort((a, b) => a.pathologyDate!.localeCompare(b.pathologyDate!));
  return withStudy.map((p) => {
    const seq = order.indexOf(p) + 1;
    return seq > 0 ? assignStudyId({ ...p, studySeq: seq }, []) : p;
  });
})();

/* -------------------------------------------------------------------------- */
/* Loops                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The seeded loops deliberately cover the four failure patterns: one never
 * acknowledged, one acknowledged but unanswered, one answered but never closed
 * (the dangerous one — someone replied, nobody checked), and several closed
 * properly as the reference case.
 */
export const LOOPS: Loop[] = [
  /* The two disciplines the beta adds. Seeded with real questions rather than
     placeholders: an empty discipline at a demonstration reads as a feature
     that was announced and not built. */
  {
    id: "l-8",
    patientId: "p-3",
    kind: "endocrine-opinion",
    urgency: "routine",
    situation: "42-year-old woman, ten days after total thyroidectomy for papillary carcinoma.",
    background: "1.8 cm classical papillary carcinoma, clear margins, no extrathyroidal extension. Corrected calcium 8.1 mg/dL on day 2, now 8.6 on replacement. On levothyroxine 100 mcg.",
    assessment: "Low-risk disease. The question is the TSH target and whether suppression is justified at all, because suppression is not free in a woman of this age.",
    request: "What TSH target would you set for this patient, and for how long? If suppression is not indicated, we would rather start her on a replacement dose now than correct it in three months.",
    requesterId: "u-levi",
    toDiscipline: "endocrinology",
    openedAt: "2026-08-19T08:30:00",
    acknowledgedAt: "2026-08-19T10:05:00",
    acknowledgedBy: "u-endo",
    answeredAt: "2026-08-19T15:20:00",
    answer:
      "Low-risk papillary carcinoma with a complete resection: the target is a TSH in the low-normal range, 0.5 to 2.0, not suppression. Suppression in a 42-year-old adds atrial fibrillation and bone loss risk without a survival benefit at this risk level. Continue 100 mcg and check TSH and calcium at six weeks.",
    events: [
      { at: "2026-08-19T08:30:00", actorId: "u-levi", type: "opened" },
      { at: "2026-08-19T10:05:00", actorId: "u-endo", type: "acknowledged", note: "Taking this one. I will look at her post-operative calcium trend first." },
      { at: "2026-08-19T15:20:00", actorId: "u-endo", type: "answered" },
    ],
  },
  {
    id: "l-9",
    patientId: "p-6",
    kind: "infection-opinion",
    urgency: "urgent",
    situation: "67-year-old man on chemoradiation for hypopharyngeal SCC, febrile at 38.9°C with a tender left neck.",
    background: "Day 19 of chemoradiation, neutrophils 0.8. PEG in situ. CT neck today shows a 2 cm collection at level III without an obvious airway threat.",
    assessment: "Neutropenic and febrile with a collection. The immediate question is whether this is drained now or treated medically, and what covers it while we decide.",
    request: "Empirical cover for a neutropenic head and neck patient with a level III collection — what would you start, and does the collection change your answer?",
    requesterId: "u-levi",
    toDiscipline: "infectious-diseases",
    openedAt: "2026-08-20T06:40:00",
    events: [{ at: "2026-08-20T06:40:00", actorId: "u-levi", type: "opened" }],
  },
  {
    id: "l-1",
    patientId: "p-1",
    kind: "imaging-report",
    urgency: "stat",
    situation: "64-year-old man with glottic SCC, admitted with biphasic stridor at rest.",
    background: "Clinical T3, impaired cord mobility. COPD with FEV1 58%, on apixaban. CT neck performed today at 14:00.",
    assessment: "The airway is borderline. Neither surgery nor radiotherapy can be planned without knowing whether there is thyroid cartilage invasion.",
    request: "Urgent CT neck report — specifically: is there invasion through the outer cortex of the thyroid cartilage?",
    requesterId: "u-levi",
    toDiscipline: "radiology",
    openedAt: "2026-08-20T07:10:00",
    blocksCaseId: "c-3",
    events: [{ at: "2026-08-20T07:10:00", actorId: "u-levi", type: "opened" }],
  },
  {
    id: "l-2",
    patientId: "p-6",
    kind: "anaesthetic-assessment",
    urgency: "urgent",
    situation: "67-year-old man, pyriform sinus SCC T4a N2b, listed for today's tumour board.",
    background: "ECOG 2, BMI 17.4, 12 kg weight loss, alcohol-related liver disease, aspiration pneumonia five days ago.",
    assessment: "The board must choose between organ preservation and total laryngopharyngectomy. That choice depends almost entirely on whether he is operable.",
    request: "Anaesthetic risk assessment: is this patient fit for total laryngopharyngectomy as he stands, and if not, what would be required to get him there?",
    requesterId: "u-levi",
    toDiscipline: "anaesthetics",
    openedAt: "2026-08-18T11:20:00",
    acknowledgedAt: "2026-08-18T16:45:00",
    acknowledgedBy: "u-bar",
    blocksCaseId: "c-2",
    events: [
      { at: "2026-08-18T11:20:00", actorId: "u-levi", type: "opened" },
      { at: "2026-08-18T16:45:00", actorId: "u-bar", type: "acknowledged", note: "Received. I will review the notes and see him on the ward." },
    ],
  },
  {
    id: "l-3",
    patientId: "p-8",
    kind: "pathology-review",
    urgency: "routine",
    situation: "61-year-old man with metastatic p16 positive SCC in a level II node, no primary identified.",
    background: "FNA cytology showed p16 positivity on cell block. MRI neck showed no mucosal lesion. PET-CT booked for 25 Aug.",
    assessment: "p16 on a cytology cell block is less reliable than on tissue. If the result is not genuine, the work-up and staging pathway are entirely different.",
    request: "Can HPV in-situ hybridisation or PCR be performed on the existing material to confirm the p16 result, or is a repeat core biopsy needed?",
    requesterId: "u-levi",
    toDiscipline: "pathology",
    openedAt: "2026-08-14T09:30:00",
    acknowledgedAt: "2026-08-14T12:05:00",
    acknowledgedBy: "u-shani",
    answeredAt: "2026-08-17T15:40:00",
    answeredBy: "u-shani",
    answer:
      "There is sufficient material in the block. I have sent it for HPV ISH, result expected within five working days. A repeat biopsy is not needed at this stage.",
    events: [
      { at: "2026-08-14T09:30:00", actorId: "u-levi", type: "opened" },
      { at: "2026-08-14T12:05:00", actorId: "u-shani", type: "acknowledged" },
      { at: "2026-08-17T15:40:00", actorId: "u-shani", type: "answered" },
    ],
  },
  {
    id: "l-4",
    patientId: "p-5",
    kind: "anaesthetic-assessment",
    urgency: "urgent",
    situation: "71-year-old woman with a tongue ulcer suspicious for SCC, listed for EUA and biopsy on 24 Aug.",
    background: "Mechanical mitral valve on warfarin, INR 3.4 on admission. Diabetes, CKD stage 3.",
    assessment: "Biopsy cannot proceed at an INR of 3.4. Every day of delay is another day to diagnosis.",
    request: "Anticoagulation bridging plan for EUA on 24 Aug — when to stop warfarin, and is low molecular weight heparin cover required?",
    requesterId: "u-nurse",
    toDiscipline: "anaesthetics",
    openedAt: "2026-08-19T08:15:00",
    acknowledgedAt: "2026-08-19T09:02:00",
    acknowledgedBy: "u-bar",
    answeredAt: "2026-08-19T14:30:00",
    answeredBy: "u-bar",
    answer:
      "Stop warfarin five days before. Bridge with enoxaparin 1 mg/kg twice daily, last dose 24 hours before the procedure. Check INR on the morning of surgery, target below 1.5. Agreed with haematology.",
    closedAt: "2026-08-19T15:10:00",
    closedBy: "u-nurse",
    closureNote: "Plan is clear and sufficient. Entered in the diary, patient informed by telephone.",
    events: [
      { at: "2026-08-19T08:15:00", actorId: "u-nurse", type: "opened" },
      { at: "2026-08-19T09:02:00", actorId: "u-bar", type: "acknowledged" },
      { at: "2026-08-19T14:30:00", actorId: "u-bar", type: "answered" },
      { at: "2026-08-19T15:10:00", actorId: "u-nurse", type: "closed" },
    ],
  },
  {
    id: "l-5",
    patientId: "p-6",
    kind: "nutrition-assessment",
    urgency: "urgent",
    situation: "67-year-old man with 12 kg weight loss, BMI 17.4, nasogastric feeding after aspiration.",
    background: "Hypopharyngeal SCC T4a. Either organ preservation or extensive surgery is in prospect.",
    assessment: "Without improving nutritional status, both treatment options carry a high risk of failure.",
    request: "Should we recommend percutaneous gastrostomy before treatment starts, and what is a realistic timeline for nutritional improvement?",
    requesterId: "u-levi",
    toDiscipline: "dietetics",
    openedAt: "2026-08-16T10:00:00",
    acknowledgedAt: "2026-08-16T10:40:00",
    acknowledgedBy: "u-diet",
    answeredAt: "2026-08-18T09:20:00",
    answeredBy: "u-diet",
    answer:
      "I recommend PEG before treatment starts. With full feeding, meaningful improvement is expected within two to three weeks. Gastroenterology request submitted.",
    closedAt: "2026-08-18T11:00:00",
    closedBy: "u-levi",
    closureNote: "Accepted. Will present at the board as part of the choice between the two options.",
    events: [
      { at: "2026-08-16T10:00:00", actorId: "u-levi", type: "opened" },
      { at: "2026-08-16T10:40:00", actorId: "u-diet", type: "acknowledged" },
      { at: "2026-08-18T09:20:00", actorId: "u-diet", type: "answered" },
      { at: "2026-08-18T11:00:00", actorId: "u-levi", type: "closed" },
    ],
  },
  {
    id: "l-6",
    patientId: "p-2",
    kind: "radiation-opinion",
    urgency: "routine",
    situation: "58-year-old man, p16 positive tonsillar SCC, cT2 N1 M0 stage I under AJCC 9.",
    background: "ECOG 0, minimal smoking history. Two options: TORS with neck dissection versus definitive radiotherapy.",
    assessment: "He is relatively young with an excellent prognosis. The difference between the options is largely functional, not survival.",
    request: "Functional outcome data for a fair comparison against TORS — swallowing, PEG dependence and xerostomia at one year.",
    requesterId: "u-levi",
    toDiscipline: "radiation-oncology",
    openedAt: "2026-08-19T14:00:00",
    acknowledgedAt: "2026-08-19T14:50:00",
    acknowledgedBy: "u-katz",
    answeredAt: "2026-08-19T15:04:00",
    answeredBy: "u-katz",
    answer:
      "I will bring the functional outcome data to the board. In short: PEG dependence at one year is below 5% for both pathways in stage I disease; the meaningful difference is xerostomia versus post-surgical swallowing change.",
    closedAt: "2026-08-19T15:30:00",
    closedBy: "u-levi",
    closureNote: "Exactly what is needed to present to the patient. Thank you.",
    events: [
      { at: "2026-08-19T14:00:00", actorId: "u-levi", type: "opened" },
      { at: "2026-08-19T14:50:00", actorId: "u-katz", type: "acknowledged" },
      { at: "2026-08-19T15:04:00", actorId: "u-katz", type: "answered" },
      { at: "2026-08-19T15:30:00", actorId: "u-levi", type: "closed" },
    ],
  },
  {
    id: "l-7",
    patientId: "p-8",
    kind: "scheduling",
    urgency: "routine",
    situation: "61-year-old man under investigation for an unknown primary.",
    background: "PET-CT is required before panendoscopy. The work-up is stalled until it is done.",
    assessment: "Panendoscopy without the PET wastes a general anaesthetic.",
    request: "Confirm the patient has been booked for PET-CT on 25 Aug and knows to attend fasted.",
    requesterId: "u-levi",
    toDiscipline: "nursing",
    openedAt: "2026-08-19T16:00:00",
    acknowledgedAt: "2026-08-19T16:12:00",
    acknowledgedBy: "u-nurse",
    answeredAt: "2026-08-19T16:40:00",
    answeredBy: "u-nurse",
    answer: "Booked for 25 Aug at 13:00, confirmed by telephone, fasting instructions sent by SMS.",
    closedAt: "2026-08-19T17:00:00",
    closedBy: "u-levi",
    closureNote: "Confirmed.",
    events: [
      { at: "2026-08-19T16:00:00", actorId: "u-levi", type: "opened" },
      { at: "2026-08-19T16:12:00", actorId: "u-nurse", type: "acknowledged" },
      { at: "2026-08-19T16:40:00", actorId: "u-nurse", type: "answered" },
      { at: "2026-08-19T17:00:00", actorId: "u-levi", type: "closed" },
    ],
  },
  {
    id: "l-8",
    patientId: "p-3",
    kind: "oncology-opinion",
    urgency: "routine",
    situation: "42-year-old woman after hemithyroidectomy, 1.8 cm papillary carcinoma.",
    background: "Margins clear, no extrathyroidal extension, no lymphovascular invasion.",
    assessment: "This is low-risk disease. The question is whether completion thyroidectomy is required.",
    request: "Confirm that active surveillance without completion surgery is the right approach, and specify the follow-up protocol.",
    requesterId: "u-levi",
    toDiscipline: "medical-oncology",
    openedAt: "2026-08-11T09:00:00",
    acknowledgedAt: "2026-08-11T10:30:00",
    acknowledgedBy: "u-amara",
    answeredAt: "2026-08-12T11:15:00",
    answeredBy: "u-amara",
    answer:
      "Agreed — low-risk disease, completion surgery adds morbidity without a survival benefit. Follow-up: TSH suppressed to the low-normal range, annual neck ultrasound.",
    closedAt: "2026-08-12T12:00:00",
    closedBy: "u-levi",
    closureNote: "Closed. Will present at the board on 13 Aug as an agreed recommendation.",
    events: [
      { at: "2026-08-11T09:00:00", actorId: "u-levi", type: "opened" },
      { at: "2026-08-11T10:30:00", actorId: "u-amara", type: "acknowledged" },
      { at: "2026-08-12T11:15:00", actorId: "u-amara", type: "answered" },
      { at: "2026-08-12T12:00:00", actorId: "u-levi", type: "closed" },
    ],
  },
  {
    id: "l-9",
    patientId: "p-9",
    kind: "dental-clearance",
    urgency: "urgent",
    situation:
      "61-year-old man, 35 days after resection and free flap for a floor of mouth SCC, awaiting adjuvant radiotherapy.",
    background:
      "Depth of invasion 14 mm, one positive node without extranodal extension. Radiation oncology reviewed on day 19 and confirmed adjuvant radiotherapy. Dental clearance was not arranged before surgery.",
    assessment:
      "Planning cannot be booked without documented dental clearance. Thirty-five of the forty-two days of the guideline window have already gone; beyond six weeks the adjusted hazard ratio for overall survival is 1.10–1.13.",
    request:
      "Dental assessment and clearance for radiotherapy — can this be brought forward to this week, and are any extractions required before planning?",
    requesterId: "u-levi",
    toDiscipline: "dentistry",
    openedAt: "2026-08-18T08:40:00",
    acknowledgedAt: "2026-08-18T11:05:00",
    acknowledgedBy: "u-nurse",
    events: [
      { at: "2026-08-18T08:40:00", actorId: "u-levi", type: "opened" },
      { at: "2026-08-18T11:05:00", actorId: "u-nurse", type: "acknowledged" },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* Tumour board sessions                                                       */
/* -------------------------------------------------------------------------- */

export const SESSIONS: MdtSession[] = [
  {
    id: "s-1",
    title: "Head & Neck Tumour Board",
    date: "2026-08-20",
    startTime: "08:00",
    location: "Seminar Room 2 + video link",
    chairId: "u-rosen",
    requiredDisciplines: ["surgery", "medical-oncology", "radiation-oncology", "pathology", "radiology", "endocrinology"],
    attendeeIds: ["u-levi", "u-amara", "u-katz", "u-shani", "u-nurse", "u-diet"],
    status: "in-progress",
    cases: [
      {
        id: "c-1",
        patientId: "p-2",
        presenterId: "u-levi",
        question: "Transoral robotic surgery with neck dissection, or definitive radiotherapy?",
        status: "pending",
        timesDeferred: 0,
        prerequisites: [
          { label: "Histology with p16", ready: true },
          { label: "Cross-sectional imaging", ready: true },
          { label: "Staging CT chest", ready: true },
          { label: "Dental assessment", ready: true },
          { label: "Functional outcome data", ready: true, loopId: "l-6" },
        ],
      },
      {
        id: "c-2",
        patientId: "p-6",
        presenterId: "u-levi",
        question: "Organ preservation chemoradiotherapy versus total laryngopharyngectomy in a malnourished ECOG 2 patient?",
        status: "pending",
        timesDeferred: 1,
        prerequisites: [
          { label: "Histology", ready: true },
          { label: "Staging CT neck and chest", ready: true },
          { label: "Nutrition assessment", ready: true, loopId: "l-5" },
          { label: "Anaesthetic risk assessment", ready: false, loopId: "l-2" },
        ],
      },
      {
        id: "c-3",
        patientId: "p-1",
        presenterId: "u-levi",
        question: "Airway management strategy and definitive treatment for T3 glottic SCC with stridor.",
        status: "pending",
        timesDeferred: 2,
        prerequisites: [
          { label: "Histology", ready: true },
          { label: "Pulmonary function tests", ready: true },
          { label: "CT neck report", ready: false, loopId: "l-1" },
        ],
      },
      {
        id: "c-4",
        patientId: "p-8",
        presenterId: "u-shani",
        question: "Confirm the work-up sequence for p16 positive unknown primary.",
        status: "pending",
        timesDeferred: 0,
        prerequisites: [
          { label: "Cytology with p16", ready: true },
          { label: "MRI neck", ready: true },
          { label: "HPV confirmation", ready: false, loopId: "l-3" },
          { label: "PET-CT booking", ready: true, loopId: "l-7" },
        ],
      },
    ],
  },
  {
    id: "s-2",
    title: "Head & Neck Tumour Board",
    date: "2026-08-13",
    startTime: "08:00",
    location: "Seminar Room 2 + video link",
    chairId: "u-rosen",
    requiredDisciplines: ["surgery", "medical-oncology", "radiation-oncology", "pathology", "radiology", "endocrinology"],
    attendeeIds: ["u-levi", "u-amara", "u-katz", "u-shani", "u-gold", "u-nurse"],
    status: "complete",
    cases: [
      {
        id: "c-5",
        patientId: "p-3",
        presenterId: "u-levi",
        question: "Completion thyroidectomy or surveillance after hemithyroidectomy?",
        status: "decided",
        timesDeferred: 0,
        prerequisites: [
          { label: "Final histology", ready: true },
          { label: "Post-operative calcium", ready: true },
          { label: "Oncology opinion", ready: true, loopId: "l-8" },
        ],
        decision: {
          intent: "curative",
          modalities: ["active-surveillance"],
          recommendation:
            "No completion thyroidectomy. Active surveillance with TSH suppression to the low-normal range and annual neck ultrasound.",
          rationale:
            "1.8 cm classical papillary carcinoma, margins clear, no extrathyroidal extension and no lymphovascular invasion. This is low-risk disease where completion surgery adds morbidity without a survival benefit.",
          quorumMet: true,
          decidedAt: "2026-08-13T08:24:00",
          decidedBy: "u-rosen",
          followUp: "Book endocrine clinic at six weeks with thyroid function tests.",
        },
      },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* Evidence                                                                    */
/* -------------------------------------------------------------------------- */

export const EVIDENCE: EvidenceItem[] = [
  {
    id: "e-0a",
    source: "PubMed",
    title:
      "Graboyes et al. — association of treatment delays with survival in head and neck cancer",
    summary:
      "The anchor reference for timeliness in this disease. Systematic review of three separate intervals. Diagnosis-to-treatment: 9 of 13 studies found longer intervals associated with worse overall survival. Surgery-to-radiotherapy beyond six weeks: aHR 1.10–1.13. Treatment package time is dose-dependent — aHR 1.19 at 11–12 weeks, 1.36 at 13–15, 1.51 at 16 or more.",
    citation: "JAMA Otolaryngol Head Neck Surg. 2019;145(2):166-177. PMID 30383146.",
    url: "https://pubmed.ncbi.nlm.nih.gov/30383146/",
    year: 2019,
    tags: ["larynx", "oropharynx", "oral-cavity", "hypopharynx"],
    grade: "Systematic review",
  },
  {
    id: "e-0b",
    source: "PubMed",
    title:
      "Nguyen et al. — barriers and timely postoperative radiation therapy in head and neck cancer",
    summary:
      "Prospective cohort of 78 patients after curative-intent surgery with an indication for radiotherapy. Only 41% started within the six-week window. Among those who did not, the commonest primary reason was a barrier related to poor care coordination — 19 of 46, or 41.3%. Five or more barriers carried 76% lower odds of timely treatment. Coordination, not clinical complexity, was the leading single cause.",
    citation: "JAMA Otolaryngol Head Neck Surg. 2025;151(12):1186-1195.",
    url: "https://doi.org/10.1001/jamaoto.2025.2824",
    year: 2025,
    tags: ["larynx", "oropharynx", "oral-cavity", "hypopharynx"],
    grade: "Prospective cohort",
  },
  {
    id: "e-0c",
    source: "PubMed",
    title:
      "NDURE — randomised trial of enhanced versus standard navigation for timely adjuvant radiotherapy",
    summary:
      "Demonstrates that timeliness is modifiable rather than fixed. Approximately 73% of patients in the enhanced navigation arm started radiotherapy within six weeks, against approximately 40% with standard navigation. The intervention required a dedicated human navigator, which is the constraint a systemic mechanism would remove.",
    citation: "JCO Oncol Pract. 2025. doi:10.1200/OP-24-00901. Registered NCT05793151.",
    url: "https://doi.org/10.1200/OP-24-00901",
    year: 2025,
    tags: ["larynx", "oropharynx", "oral-cavity", "hypopharynx"],
    grade: "Randomised trial",
  },
  {
    id: "e-0d",
    source: "PubMed",
    title:
      "NDURE mediation analysis — which process steps actually drive timely adjuvant therapy",
    summary:
      "Isolated five process milestones between surgery and radiotherapy: radiation oncology consult before surgery, pre-operative dental assessment, radiation oncology review within 21 days of surgery, timely planning scans, and radiotherapy within 14 days of planning. Patients completing four or five started on time in 90% of cases against 10% for one or none. The post-operative radiation oncology visit alone accounted for roughly a quarter of the benefit. These five are the milestones tracked on the adjuvant pathway in this application.",
    citation: "JAMA Otolaryngol Head Neck Surg. Published online 23 July 2026. doi:10.1001/jamaoto.2026.1891.",
    url: "https://doi.org/10.1001/jamaoto.2026.1891",
    year: 2026,
    tags: ["larynx", "oropharynx", "oral-cavity", "hypopharynx"],
    grade: "Secondary analysis of RCT",
  },
  {
    id: "e-1",
    source: "PubMed",
    title: "Diagnosis-to-treatment interval in head and neck cancer — systematic review and meta-analysis",
    summary:
      "63 studies, 873,718 patients. Treatment within 30 days versus later: aHR 1.09 (95% CI 1.06–1.13). Delay beyond 60 days: aHR 1.42 (95% CI 1.10–1.81). This is the quantitative basis for treating time as a clinical outcome in its own right.",
    citation: "Oral Oncology. 2024. PMID 39577127.",
    url: "https://pubmed.ncbi.nlm.nih.gov/39577127/",
    year: 2024,
    tags: ["larynx", "oropharynx", "oral-cavity", "hypopharynx"],
    grade: "Meta-analysis",
  },
  {
    id: "e-2",
    source: "PubMed",
    title: "Murphy et al. — survival impact of increasing time to treatment initiation",
    summary:
      "51,655 patients in the National Cancer Data Base. TTI of 61–90 days versus under 30 days: HR 1.13 (95% CI 1.08–1.19). Median overall survival falls from 71.9 months to 46.6 months beyond 67 days.",
    citation: "J Clin Oncol. 2016;34(2):169-178.",
    url: "https://pubmed.ncbi.nlm.nih.gov/26628469/",
    year: 2016,
    tags: ["larynx", "oropharynx", "oral-cavity", "hypopharynx"],
    grade: "Cohort study",
  },
  {
    id: "e-3",
    source: "PubMed",
    title: "Hahlweg et al. — process quality of decision-making in multidisciplinary cancer team meetings",
    summary:
      "Structured observation of 249 cases across 29 meetings. 24.9% of cases received no treatment recommendation at all. Psychosocial information was not presented at all in 79.8% of cases.",
    citation: "BMC Cancer. 2017;17:772.",
    url: "https://link.springer.com/article/10.1186/s12885-017-3768-5",
    year: 2017,
    tags: ["larynx", "oropharynx", "oral-cavity", "hypopharynx", "nasopharynx", "thyroid", "salivary"],
    grade: "Observational",
  },
  {
    id: "e-4",
    source: "PubMed",
    title: "Walraven et al. — factors influencing the quality of oncological MDT meetings",
    summary:
      "Systematic review of 74 studies. 5% of cases lacked pathology or radiology results at the time of discussion. Only 47% of meetings had a clearly stated discussion question per patient. Only 44% of radiologists pre-reviewed more than 70% of cases.",
    citation: "BMC Health Serv Res. 2022;22:829.",
    url: "https://link.springer.com/article/10.1186/s12913-022-08112-0",
    year: 2022,
    tags: ["larynx", "oropharynx", "oral-cavity", "hypopharynx"],
    grade: "Systematic review",
  },
  {
    id: "e-5",
    source: "PubMed",
    title: "Friedland et al. — impact of multidisciplinary team management in head and neck cancer",
    summary:
      "In stage IV head and neck disease, management through a multidisciplinary team was associated with better survival: HR 0.69 (95% CI 0.51–0.88).",
    citation: "Br J Cancer. 2011;104(8):1246-1248.",
    url: "https://pubmed.ncbi.nlm.nih.gov/21448170/",
    year: 2011,
    tags: ["larynx", "oropharynx", "oral-cavity", "hypopharynx"],
    grade: "Cohort study",
  },
  {
    id: "e-6",
    source: "PubMed",
    title: "Starmer et al. — the I-PASS handoff programme",
    summary:
      "Nine paediatric hospitals. A 23% reduction in medical errors and a 30% reduction in preventable adverse events, with no loss of efficiency. The evidential basis for structured closed-loop communication.",
    citation: "N Engl J Med. 2014;371:1803-1812.",
    url: "https://www.nejm.org/doi/full/10.1056/NEJMsa1405556",
    year: 2014,
    tags: ["larynx", "oropharynx", "oral-cavity"],
    grade: "Interventional",
  },
  {
    id: "e-7",
    source: "AJCC",
    title: "AJCC Version 9 — HPV-associated oropharynx and salivary gland",
    summary:
      "Version 9 took effect for cases diagnosed on or after 1 January 2026 and replaced the 8th edition for these two sites only. Clinical T categories and clinical stage groups are unchanged; extranodal extension becomes an explicit N modifier, and pN1 splits into pN1a and pN1b.",
    citation: "American Joint Committee on Cancer, effective 1 Jan 2026.",
    url: "https://www.facs.org/for-medical-professionals/news-publications/news-and-articles/acs-brief/december-9-2025-issue/new-ajcc-staging-system-protocols-for-salivary-glands-and-oropharynx-are-live/",
    year: 2026,
    tags: ["oropharynx", "salivary"],
    grade: "Guideline",
    offline: true,
  },
  {
    id: "e-8",
    source: "NCCN",
    title: "NCCN Head and Neck Cancers, Version 1.2026",
    summary:
      "The reference treatment algorithm by subsite. Covers work-up, primary treatment by stage, adjuvant indications and surveillance schedules.",
    citation: "National Comprehensive Cancer Network.",
    url: "https://www.nccn.org/guidelines/guidelines-detail?category=1&id=1437",
    year: 2026,
    tags: ["larynx", "oropharynx", "oral-cavity", "hypopharynx", "nasopharynx", "salivary"],
    grade: "Guideline",
    offline: true,
  },
  {
    id: "e-9",
    source: "PubMed",
    title: "Ang et al. — human papillomavirus and survival in oropharyngeal cancer",
    summary:
      "Three-year overall survival of 82.4% in HPV-positive disease versus 57.1% in HPV-negative disease; HR 0.42 (95% CI 0.27–0.66) for death, independent of stage and nodal status.",
    citation: "N Engl J Med. 2010;363:24-35.",
    url: "https://www.nejm.org/doi/full/10.1056/NEJMoa0912217",
    year: 2010,
    tags: ["oropharynx"],
    grade: "RCT secondary analysis",
  },
  {
    id: "e-10",
    source: "Cummings",
    title: "Cummings Otolaryngology — malignant laryngeal tumours",
    summary:
      "Reference chapter covering laryngeal anatomy, tumour spread through the paraglottic and pre-epiglottic spaces, and the surgical options from transoral laser microsurgery to total laryngectomy.",
    citation: "Cummings Otolaryngology, 8th edition.",
    year: 2024,
    tags: ["larynx", "hypopharynx"],
    grade: "Textbook",
    offline: true,
  },
];
