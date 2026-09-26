/**
 * Which edition of MDT Loop this build is, and how far along it is.
 *
 * `MDT Loop` is the product; `ENT` is the edition. The distinction is the point
 * being made to anyone who asks whether this generalises: swapping one word,
 * one roster and one set of core disciplines is what another department would
 * need, and nothing in the loop model, the metrics or the audit trail knows
 * which specialty it is running for.
 *
 * The version is `Beta`, not `v1.0` and not `Prototype`. It is past prototype —
 * the domain model, the shared board, the access control and the pilot
 * instrumentation are all real and tested — and it is not v1.0, because it has
 * never been used on a real patient and the honest word for that is beta.
 */
export const EDITION = {
  product: "MDT Loop",
  edition: "ENT",
  stage: "Beta",
  version: "0.9",
  /** The department this beta is configured for. */
  department: {
    en: "Otolaryngology — Head & Neck Surgery",
    he: "אף אוזן גרון וכירורגיית ראש-צוואר",
  },
  site: { en: "Meir Medical Center, Kfar Saba", he: "מרכז רפואי מאיר, כפר סבא" },
  hmo: { en: "Clalit Health Services", he: "שירותי בריאות כללית" },
} as const;

/**
 * The disciplines this beta is configured around.
 *
 * Not the whole list the model supports — the whole list is every discipline a
 * head and neck case can ever touch. These six are the ones the Meir beta is
 * being stood up with, chosen because each of them is somebody a case actually
 * waits on:
 *
 *   surgery              the department itself
 *   pathology            the report that decides the operation
 *   neuroradiology       the imaging read that decides resectability
 *   endocrinology        thyroid and parathyroid, a large share of the list
 *   infectious-diseases  deep neck infection, and neutropenic sepsis on chemoradiation
 *   medical-oncology     head and neck oncology
 *
 * Radiation oncology sits alongside them and is required for quorum; it is not
 * listed as a beta addition because it was there from the start.
 */
export const BETA_DISCIPLINES = [
  "surgery",
  "pathology",
  "radiology",
  "endocrinology",
  "infectious-diseases",
  "medical-oncology",
] as const;

/**
 * Disciplines a case can be routed to on demand, without being in the quorum.
 *
 * The distinction is clinical, not administrative. A skull base tumour with
 * intracranial extension or perineural spread along V2 cannot be planned
 * without neurosurgery and, often, neurology — and those cases are a minority.
 * Putting either in the quorum would stall every ordinary board waiting for two
 * people who have nothing to say about that patient; leaving them out of the
 * system entirely means the one case that needs them has nowhere to send the
 * question. Available, therefore, and not required.
 */
export const ON_DEMAND_DISCIPLINES = [
  "neurosurgery",
  "neurology",
  "anaesthetics",
  "speech-language",
  "dietetics",
  "dentistry",
  "nursing",
  "palliative",
] as const;
