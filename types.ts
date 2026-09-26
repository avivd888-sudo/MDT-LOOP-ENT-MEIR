/**
 * MDT Loop — domain model.
 *
 * The organising concept is the LOOP: a structured request from one discipline
 * to another that is not considered finished until the person who asked
 * confirms the answer resolved the question. Patients, tumour board sessions
 * and metrics all hang off that.
 *
 * Types are plain and serialisable so `lib/data.ts` can be replaced by an API
 * (Chameleon / Ofek via FHIR-IL) without touching the component tree.
 */

import { bilingual } from "./lang-state";

/* -------------------------------------------------------------------------- */
/* Disciplines and people                                                      */
/* -------------------------------------------------------------------------- */

export type Discipline =
  | "surgery"
  | "medical-oncology"
  | "radiation-oncology"
  | "pathology"
  | "radiology"
  | "nursing"
  | "endocrinology"
  | "infectious-diseases"
  | "neurology"
  | "neurosurgery"
  | "anaesthetics"
  | "speech-language"
  | "dietetics"
  | "dentistry"
  | "palliative";

export const DISCIPLINE_LABEL: Record<Discipline, string> = bilingual(
  {
    surgery: "Head & Neck Surgery",
    "medical-oncology": "Head & Neck Oncology",
    "radiation-oncology": "Radiation Oncology",
    pathology: "Pathology",
    radiology: "Neuroradiology",
    endocrinology: "Endocrinology",
    "infectious-diseases": "Infectious Diseases",
    neurology: "Neurology",
    neurosurgery: "Neurosurgery",
    nursing: "Clinical Nursing",
    anaesthetics: "Anaesthetics",
    "speech-language": "Speech & Language",
    dietetics: "Dietetics",
    dentistry: "Dentistry",
    palliative: "Palliative Care",
  },
  {
    surgery: "כירורגיית ראש-צוואר",
    "medical-oncology": "אונקולוגיה של ראש-צוואר",
    "radiation-oncology": "אונקולוגיית קרינה",
    pathology: "פתולוגיה",
    radiology: "נוירורדיולוגיה",
    endocrinology: "אנדוקרינולוגיה",
    "infectious-diseases": "מחלות זיהומיות",
    neurology: "נוירולוגיה",
    neurosurgery: "נוירוכירורגיה",
    nursing: "סיעוד קליני",
    anaesthetics: "הרדמה",
    "speech-language": "קלינאות תקשורת",
    dietetics: "תזונה",
    dentistry: "רפואת שיניים",
    palliative: "טיפול פליאטיבי",
  },
);

/** Short form for chips and chart axes, where the full name will not fit. */
export const DISCIPLINE_SHORT: Record<Discipline, string> = bilingual(
  {
    surgery: "Surgery",
    "medical-oncology": "H&N Onc",
    "radiation-oncology": "Rad Onc",
    pathology: "Pathology",
    radiology: "Neurorad",
    endocrinology: "Endocrine",
    "infectious-diseases": "ID",
    neurology: "Neurology",
    neurosurgery: "Neurosurg",
    nursing: "Nursing",
    anaesthetics: "Anaesthetics",
    "speech-language": "SLT",
    dietetics: "Dietetics",
    dentistry: "Dentistry",
    palliative: "Palliative",
  },
  {
    surgery: "כירורגיה",
    "medical-oncology": "אונקולוגיה",
    "radiation-oncology": "קרינה",
    pathology: "פתולוגיה",
    radiology: "נוירורדיולוגיה",
    endocrinology: "אנדוקרינולוגיה",
    "infectious-diseases": "זיהומיות",
    neurology: "נוירולוגיה",
    neurosurgery: "נוירוכירורגיה",
    nursing: "סיעוד",
    anaesthetics: "הרדמה",
    "speech-language": "קלינאות",
    dietetics: "תזונה",
    dentistry: "שיניים",
    palliative: "פליאטיבי",
  },
);

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  discipline: Discipline;
  initials: string;
  colour: string;
  online?: boolean;
  /** Whether this discipline must be represented for the board to be quorate. */
  coreMember?: boolean;
  /**
   * A discipline lead — the head of ENT, neuroradiology, pathology, oncology,
   * or whoever they nominate. Closure belongs to the requester, but a requester
   * on night shift must not be able to stall a cancer pathway, so the lead of a
   * discipline may reopen, reroute or close a loop in their own area that was
   * not handled properly, and may bring people into the team — including an
   * outside consultant from another hospital who is helping with a case.
   *
   * Every such act is recorded against them by name, with a reason. Making this
   * the department heads' authority rather than an administrator's is
   * deliberate: it gives them a reason to own the pathway.
   */
  disciplineLead?: boolean;
  /**
   * A clinician from outside this hospital, brought in for a particular case.
   * Marked rather than hidden: someone reading a decision months later needs to
   * see that an opinion came from another institution.
   */
  external?: boolean;
  /** Where an external member practises. */
  hospital?: string;
  /** Added to the roster during the pilot rather than seeded with it. */
  addedBy?: string;
  /**
   * The verified work address this member registered with, once registration
   * rather than seeding put them here. Kept because it is the evidence that the
   * eligibility check was passed, and an access review a year from now has to be
   * able to see it.
   */
  email?: string;
  /** The organisation that address belongs to, as matched at registration. */
  organisation?: string;
}

/**
 * Somebody who has proved a work address and is waiting to be let in.
 *
 * A verified address at an Israeli healthcare organisation proves an employer.
 * It does not prove membership of this board — a radiographer at another
 * hospital has a perfectly valid one. So a request lands here, and a discipline
 * lead decides. Nothing in this record grants any access at all.
 */
export interface PendingMember {
  id: string;
  name: string;
  role: string;
  discipline: Discipline;
  /** Verified: a code was sent to it and returned. */
  email: string;
  /** The organisation matched from the address's domain. */
  organisation: string;
  /** Stated by the applicant, checked against the practitioners register. */
  licence: string;
  requestedAt: string;
  verifiedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Loops — the core object                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Loop lifecycle.
 *
 *   open         the ask has been sent, nobody has confirmed seeing it
 *   acknowledged the receiving discipline has confirmed receipt
 *   answered     the receiver has provided a substantive answer
 *   closed       the ASKER has confirmed the answer resolved the question
 *
 * A loop that reaches "answered" but never "closed" is the failure mode this
 * application exists to make visible: someone replied, but nobody checked
 * whether the reply actually unblocked anything.
 */
export type LoopState = "open" | "acknowledged" | "answered" | "closed";

export type LoopUrgency = "stat" | "urgent" | "routine";

/** Target turnaround by urgency, in hours. Configurable per department. */
export const LOOP_SLA_HOURS: Record<LoopUrgency, number> = {
  stat: 2,
  urgent: 24,
  routine: 72,
};

export const URGENCY_LABEL: Record<LoopUrgency, string> = bilingual(
  {
    stat: "Immediate",
    urgent: "Urgent",
    routine: "Routine",
  },
  {
    stat: "מיידי",
    urgent: "דחוף",
    routine: "שגרתי",
  },
);

export type LoopKind =
  | "pathology-review"
  | "imaging-report"
  | "anaesthetic-assessment"
  | "oncology-opinion"
  | "radiation-opinion"
  | "endocrine-opinion"
  | "infection-opinion"
  | "neuro-opinion"
  | "skull-base-opinion"
  | "nutrition-assessment"
  | "swallow-assessment"
  | "dental-clearance"
  | "scheduling"
  | "other";

export const LOOP_KIND_LABEL: Record<LoopKind, string> = bilingual(
  {
    "pathology-review": "Pathology opinion",
    "imaging-report": "Imaging report",
    "anaesthetic-assessment": "Anaesthetic assessment",
    "oncology-opinion": "Oncology opinion",
    "radiation-opinion": "Radiation oncology opinion",
    "endocrine-opinion": "Endocrine opinion",
    "infection-opinion": "Infectious diseases opinion",
    "neuro-opinion": "Neurology opinion",
    "skull-base-opinion": "Neurosurgical / skull base opinion",
    "nutrition-assessment": "Nutrition assessment",
    "swallow-assessment": "Swallow assessment",
    "dental-clearance": "Dental clearance",
    scheduling: "Scheduling",
    other: "Other",
  },
  {
    "pathology-review": "חוות דעת פתולוגית",
    "imaging-report": "פענוח הדמיה",
    "anaesthetic-assessment": "הערכת הרדמה",
    "oncology-opinion": "חוות דעת אונקולוגית",
    "radiation-opinion": "חוות דעת אונקולוגיית קרינה",
    "endocrine-opinion": "חוות דעת אנדוקרינולוגית",
    "infection-opinion": "חוות דעת מחלות זיהומיות",
    "neuro-opinion": "חוות דעת נוירולוגית",
    "skull-base-opinion": "חוות דעת נוירוכירורגית / בסיס גולגולת",
    "nutrition-assessment": "הערכה תזונתית",
    "swallow-assessment": "הערכת בליעה",
    "dental-clearance": "אישור רפואת שיניים",
    scheduling: "תיאום ותזמון",
    other: "אחר",
  },
);

export interface LoopEvent {
  at: string;
  actorId: string;
  /** Machine-readable so the audit trail can be queried, not just read. */
  type:
    | "opened"
    | "acknowledged"
    | "answered"
    | "closed"
    | "escalated"
    | "reopened"
    | "note"
    /** A discipline lead moved the loop to a different discipline. */
    | "reassigned"
    /** A discipline lead closed a loop the requester could not close. */
    | "override-closed";
  note?: string;
}

export interface Loop {
  id: string;
  patientId: string;
  kind: LoopKind;
  urgency: LoopUrgency;

  /**
   * The ask, structured as SBAR. Free-text messaging is exactly what fails in
   * a departmental chat group: the question is buried, so the answer misses it.
   */
  situation: string;
  background: string;
  assessment: string;
  /** The single specific thing being requested. This is what gets closed. */
  request: string;

  requesterId: string;
  toDiscipline: Discipline;

  openedAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  answeredAt?: string;
  answeredBy?: string;
  answer?: string;
  closedAt?: string;
  closedBy?: string;
  /** The asker's confirmation that the answer resolves the request. */
  closureNote?: string;

  /** When set, this loop is what is preventing an MDT case being decided. */
  blocksCaseId?: string;

  /**
   * Set when a discipline lead closed, reopened or rerouted a loop the
   * requester could not. Recorded on the loop itself, not only in the event
   * list, so an override can never be mistaken for an ordinary closure.
   */
  overriddenBy?: string;
  overrideReason?: string;

  events: LoopEvent[];
}

export function loopState(l: Loop): LoopState {
  if (l.closedAt) return "closed";
  if (l.answeredAt) return "answered";
  if (l.acknowledgedAt) return "acknowledged";
  return "open";
}

export const LOOP_STATE_LABEL: Record<LoopState, string> = bilingual(
  {
    open: "Opened",
    acknowledged: "Acknowledged",
    answered: "Answered",
    closed: "Closed",
  },
  {
    open: "נפתחה",
    acknowledged: "נקלטה",
    answered: "נענתה",
    closed: "נסגרה",
  },
);

/* -------------------------------------------------------------------------- */
/* Clinical                                                                    */
/* -------------------------------------------------------------------------- */

export type Subsite =
  | "larynx"
  | "oropharynx"
  | "oral-cavity"
  | "hypopharynx"
  | "nasopharynx"
  | "sinonasal"
  | "thyroid"
  | "salivary"
  | "skin"
  | "unknown-primary";

export const SUBSITE_LABEL: Record<Subsite, string> = bilingual(
  {
    larynx: "Larynx",
    oropharynx: "Oropharynx",
    "oral-cavity": "Oral cavity",
    hypopharynx: "Hypopharynx",
    nasopharynx: "Nasopharynx",
    sinonasal: "Sinonasal",
    thyroid: "Thyroid",
    salivary: "Salivary gland",
    skin: "Cutaneous H&N",
    "unknown-primary": "Unknown primary",
  },
  {
    larynx: "גרון",
    oropharynx: "אורופרינקס",
    "oral-cavity": "חלל הפה",
    hypopharynx: "היפופרינקס",
    nasopharynx: "נזופרינקס",
    sinonasal: "אף וסינוסים",
    thyroid: "בלוטת התריס",
    salivary: "בלוטות רוק",
    skin: "עור ראש-צוואר",
    "unknown-primary": "ראשוני לא ידוע",
  },
);

export type PathwayStatus =
  | "new-referral"
  | "awaiting-staging"
  | "mdt-review"
  | "treatment"
  | "post-op"
  | "surveillance";

export const PATHWAY_LABEL: Record<PathwayStatus, string> = bilingual(
  {
    "new-referral": "New referral",
    "awaiting-staging": "Awaiting staging",
    "mdt-review": "For MDT",
    treatment: "On treatment",
    "post-op": "Post-op",
    surveillance: "Surveillance",
  },
  {
    "new-referral": "הפניה חדשה",
    "awaiting-staging": "ממתין להשלמת סטייג'ינג",
    "mdt-review": "לדיון MDT",
    treatment: "בטיפול",
    "post-op": "אחרי ניתוח",
    surveillance: "מעקב",
  },
);

export type Acuity = "urgent" | "routine";

export type Tone = "urgent" | "warn" | "stable" | "review" | "neutral" | "primary";

export type StagingEdition = "AJCC 8" | "AJCC 9";

export interface TnmStage {
  t: string;
  n: string;
  m: string;
  p16?: "positive" | "negative" | "not-tested";
  ene?: "none" | "imaging" | "pathological";
  edition: StagingEdition;
  stageGroup: string;
  provisional?: boolean;
}

export type TimelineKind =
  | "referral"
  | "imaging"
  | "biopsy"
  | "pathology"
  | "mdt"
  | "surgery"
  | "radiotherapy"
  | "systemic"
  | "followup"
  | "complication";

export const TIMELINE_LABEL: Record<TimelineKind, string> = bilingual(
  {
    referral: "Referral",
    imaging: "Imaging",
    biopsy: "Biopsy",
    pathology: "Pathology",
    mdt: "MDT",
    surgery: "Surgery",
    radiotherapy: "Radiotherapy",
    systemic: "Systemic",
    followup: "Follow-up",
    complication: "Complication",
  },
  {
    referral: "הפניה",
    imaging: "הדמיה",
    biopsy: "ביופסיה",
    pathology: "פתולוגיה",
    mdt: "דיון MDT",
    surgery: "ניתוח",
    radiotherapy: "הקרנות",
    systemic: "טיפול סיסטמי",
    followup: "מעקב",
    complication: "סיבוך",
  },
);

export interface TimelineEvent {
  id: string;
  date: string;
  kind: TimelineKind;
  title: string;
  detail: string;
  actor?: string;
}

export type DocumentKind = "pathology" | "imaging" | "labs" | "letter" | "consent" | "operative";

export const DOC_KIND_LABEL: Record<DocumentKind, string> = bilingual(
  {
    pathology: "Pathology",
    imaging: "Imaging",
    labs: "Labs",
    letter: "Letter",
    consent: "Consent",
    operative: "Operative",
  },
  {
    pathology: "פתולוגיה",
    imaging: "הדמיה",
    labs: "מעבדה",
    letter: "מכתב",
    consent: "הסכמה",
    operative: "דו\"ח ניתוח",
  },
);

export interface ClinicalDocument {
  id: string;
  name: string;
  kind: DocumentKind;
  date: string;
  sizeLabel: string;
  unread?: boolean;
}

export interface Patient {
  id: string;
  /** Israeli national ID — 9 digits with a check digit. */
  nationalId: string;
  mrn: string;
  name: string;
  age: number;
  sex: "M" | "F";
  subsite: Subsite;
  diagnosis: string;
  histology: string;
  tnm: TnmStage;
  status: PathwayStatus;
  acuity: Acuity;
  ward?: string;
  bed?: string;
  alerts: string[];
  comorbidities: string[];
  ecog: 0 | 1 | 2 | 3 | 4;
  smokingPackYears?: number;
  plan: string;
  nextStep?: { label: string; date: string };
  careTeamIds: string[];
  timeline: TimelineEvent[];
  documents: ClinicalDocument[];
  /** First suspicion / referral — start of the pathway clock. */
  referralDate: string;
  /** Date the MDT reached a definitive treatment decision, if it has. */
  decisionDate?: string;
  /** Date definitive treatment started — used for time-to-treatment. */
  treatmentStartDate?: string;
  /**
   * The postoperative radiotherapy pathway, for patients in whom it is
   * indicated. Modelled in `lib/pathway.ts`, whose milestones and thresholds
   * are taken from the head and neck literature rather than local convention.
   */
  adjuvant?: import("./pathway").AdjuvantPlan;

  /* ---- The study record (protocol v1.1, §5.5–5.6 and §8.6) -------------- */

  /**
   * The one official study identifier, in English, e.g. `ENT-26-007-NPC-M-09`:
   * arm · year of the malignant pathology report · running number · site ·
   * side · month. Assigned once, on entry, and never recomputed — if the site
   * is later corrected the correction lives in `siteCode`, and the identifier
   * stays what it was, so every loop, export and spreadsheet row still points
   * at the same person. See `lib/study-id.ts`.
   */
  studyId?: string;
  /** Running number within the arm — the part that guarantees uniqueness. */
  studySeq?: number;
  siteCode?: import("./study-id").SiteCode;
  side?: import("./study-id").Side;
  /** t = 0 of the study: the date of the malignant pathology report. */
  pathologyDate?: string;
  /** What the board decided the first definitive treatment would be. */
  plannedModality?: TreatmentModality;
  /** What the first definitive treatment actually was. */
  treatmentModality?: TreatmentModality;
  /** Referral to theatre — the denominator of the capacity question (H0). */
  orReferralDate?: string;
  /** Referral to the radiotherapy unit — the other half of H0. */
  rtReferralDate?: string;
  /** Re-presentation with final pathology after surgery. */
  secondDecisionDate?: string;
  /** Start of adjuvant treatment after surgery. */
  adjuvantStartDate?: string;
  /** Delay factors named in Cook 2022. */
  dentalNeeded?: boolean;
  pegNeeded?: boolean;
}

/* -------------------------------------------------------------------------- */
/* Tumour board                                                                */
/* -------------------------------------------------------------------------- */

export type MdtCaseStatus = "pending" | "decided" | "deferred";

export type TreatmentModality =
  | "surgery"
  | "radiotherapy"
  | "chemoradiotherapy"
  | "systemic"
  | "immunotherapy"
  | "active-surveillance"
  | "best-supportive-care"
  | "clinical-trial";

export const MODALITY_LABEL: Record<TreatmentModality, string> = bilingual(
  {
    surgery: "Surgery",
    radiotherapy: "Radiotherapy",
    chemoradiotherapy: "Chemoradiotherapy",
    systemic: "Systemic therapy",
    immunotherapy: "Immunotherapy",
    "active-surveillance": "Active surveillance",
    "best-supportive-care": "Best supportive care",
    "clinical-trial": "Clinical trial",
  },
  {
    surgery: "ניתוח",
    radiotherapy: "הקרנות",
    chemoradiotherapy: "כימו-קרינה",
    systemic: "טיפול סיסטמי",
    immunotherapy: "אימונותרפיה",
    "active-surveillance": "מעקב פעיל",
    "best-supportive-care": "טיפול תומך",
    "clinical-trial": "מחקר קליני",
  },
);

export interface MdtDecision {
  intent: "curative" | "palliative" | "diagnostic";
  modalities: TreatmentModality[];
  recommendation: string;
  rationale: string;
  quorumMet: boolean;
  decidedAt: string;
  decidedBy: string;
  dissent?: string;
  followUp?: string;
}

export const INTENT_LABEL: Record<MdtDecision["intent"], string> = bilingual(
  {
    curative: "Curative intent",
    palliative: "Palliative intent",
    diagnostic: "Diagnostic",
  },
  {
    curative: "כוונה קורטיבית",
    palliative: "כוונה פליאטיבית",
    diagnostic: "אבחנתי",
  },
);

export interface MdtCaseEntry {
  id: string;
  patientId: string;
  presenterId: string;
  question: string;
  status: MdtCaseStatus;
  /**
   * Each prerequisite either is ready, or names the loop chasing it. That link
   * is the mechanism: a case is blocked by an *identified open loop*, not by a
   * vague sense that something is missing.
   */
  prerequisites: { label: string; ready: boolean; loopId?: string }[];
  decision?: MdtDecision;
  deferReason?: string;
  /** How many previous meetings this case was listed at without a decision. */
  timesDeferred: number;
}

export interface MdtSession {
  id: string;
  title: string;
  date: string;
  startTime: string;
  location: string;
  chairId: string;
  requiredDisciplines: Discipline[];
  attendeeIds: string[];
  cases: MdtCaseEntry[];
  status: "scheduled" | "in-progress" | "complete";
}

/* -------------------------------------------------------------------------- */
/* Evidence                                                                    */
/* -------------------------------------------------------------------------- */

export type EvidenceSource =
  | "Cummings"
  | "NCCN"
  | "ASCO"
  | "ESMO"
  | "PubMed"
  | "Cochrane"
  | "AJCC"
  | "Local protocol";

export interface EvidenceItem {
  id: string;
  source: EvidenceSource;
  title: string;
  summary: string;
  citation: string;
  year: number;
  url?: string;
  tags: Subsite[];
  grade: string;
  offline?: boolean;
}
