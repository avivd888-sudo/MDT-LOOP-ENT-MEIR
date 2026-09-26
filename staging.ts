/**
 * AJCC head & neck stage grouping.
 *
 * IMPORTANT — edition boundaries, correct as of August 2026:
 *
 *  • HPV-associated (p16+) oropharyngeal carcinoma and minor salivary gland
 *    cancers moved to **AJCC Version 9**, effective for cases diagnosed on or
 *    after 1 January 2026. Version 9 keeps the v8 clinical T categories and
 *    clinical stage groups, but introduces extranodal extension as an explicit
 *    N modifier: imaging-detected ENE (iENE) clinically, pathological ENE
 *    (pENE) after neck dissection, and splits pN1 into pN1a / pN1b.
 *
 *  • Every other mucosal head & neck site — larynx, oral cavity, hypopharynx,
 *    p16-negative oropharynx, nasopharynx — remains on **AJCC 8th edition**.
 *
 * This module implements the sites listed in SUPPORTED_SITES. Sites that are
 * not implemented return an explicit "not supported" result rather than a
 * guess: a staging tool that silently produces a plausible-but-wrong stage is
 * worse than no staging tool at all.
 *
 * Clinical governance note: this is decision *support*. The recorded stage of
 * record must still be confirmed against the AJCC manual by the responsible
 * clinician. Every result carries `requiresConfirmation: true`.
 */

import type { StagingEdition, Subsite } from "./types";

export type StagingSite =
  | "oropharynx-p16-positive"
  | "oropharynx-p16-negative"
  | "larynx"
  | "oral-cavity"
  | "hypopharynx"
  | "nasopharynx";

export const SUPPORTED_SITES: { id: StagingSite; label: string; edition: StagingEdition; note: string }[] = [
  {
    id: "oropharynx-p16-positive",
    label: "Oropharynx — p16-positive (HPV)",
    edition: "AJCC 9",
    note: "Version 9, effective from 1 January 2026. ENE is an explicit modifier within the N category.",
  },
  {
    id: "oropharynx-p16-negative",
    label: "Oropharynx — p16-negative",
    edition: "AJCC 8",
    note: "Staged using the general mucosal head & neck system.",
  },
  { id: "larynx", label: "Larynx", edition: "AJCC 8", note: "Glottic, supraglottic and subglottic." },
  { id: "oral-cavity", label: "Oral cavity", edition: "AJCC 8", note: "The T category incorporates depth of invasion." },
  { id: "hypopharynx", label: "Hypopharynx", edition: "AJCC 8", note: "General mucosal N categories." },
  { id: "nasopharynx", label: "Nasopharynx", edition: "AJCC 8", note: "Site-specific N categories." },
];

export interface StagingOption {
  value: string;
  label: string;
  hint?: string;
}

export interface StagingResult {
  stage: string | null;
  edition: StagingEdition;
  /** Plain-language explanation of *why* this stage was produced. */
  reasoning: string;
  caveats: string[];
  requiresConfirmation: true;
  supported: boolean;
}

/* -------------------------------------------------------------------------- */
/* T categories                                                                */
/* -------------------------------------------------------------------------- */

const T_GENERIC: StagingOption[] = [
  { value: "Tis", label: "Tis", hint: "Carcinoma in situ" },
  { value: "T1", label: "T1", hint: "Up to 2 cm" },
  { value: "T2", label: "T2", hint: "2 to 4 cm" },
  { value: "T3", label: "T3", hint: "Greater than 4 cm, or early local extension" },
  { value: "T4a", label: "T4a", hint: "Moderately advanced local disease" },
  { value: "T4b", label: "T4b", hint: "Very advanced local disease" },
];

const T_ORAL: StagingOption[] = [
  { value: "Tis", label: "Tis", hint: "Carcinoma in situ" },
  { value: "T1", label: "T1", hint: "Up to 2 cm with depth of invasion up to 5 mm" },
  { value: "T2", label: "T2", hint: "Up to 2 cm with DOI 5–10 mm, or 2–4 cm with DOI up to 10 mm" },
  { value: "T3", label: "T3", hint: "Greater than 4 cm, or any tumour with DOI greater than 10 mm" },
  { value: "T4a", label: "T4a", hint: "Invades cortical bone, inferior alveolar nerve, floor of mouth or skin" },
  { value: "T4b", label: "T4b", hint: "Masticator space, pterygoid plates, skull base, or encases the carotid artery" },
];

const T_OPC_P16: StagingOption[] = [
  { value: "T0", label: "T0", hint: "No primary tumour identified (p16-positive nodal presentation)" },
  { value: "T1", label: "T1", hint: "Up to 2 cm" },
  { value: "T2", label: "T2", hint: "2 to 4 cm" },
  { value: "T3", label: "T3", hint: "Greater than 4 cm, or extension to the lingual surface of the epiglottis" },
  { value: "T4", label: "T4", hint: "Invades the larynx, extrinsic tongue muscles, medial pterygoid, hard palate or mandible" },
];

const T_NPC: StagingOption[] = [
  { value: "T1", label: "T1", hint: "Nasopharynx, oropharynx or nasal cavity, without parapharyngeal involvement" },
  { value: "T2", label: "T2", hint: "Parapharyngeal extension, or involvement of the pterygoid or prevertebral muscles" },
  { value: "T3", label: "T3", hint: "Skull base, cervical vertebrae, pterygoid structures or paranasal sinuses" },
  { value: "T4", label: "T4", hint: "Intracranial extension, cranial nerve involvement, hypopharynx, orbit, parotid, or extension beyond the lateral pterygoid muscle" },
];

/* -------------------------------------------------------------------------- */
/* N categories                                                                */
/* -------------------------------------------------------------------------- */

/** AJCC 8 general mucosal head & neck — clinical N. */
const N_GENERIC_CLINICAL: StagingOption[] = [
  { value: "N0", label: "N0", hint: "No regional lymph node metastasis" },
  { value: "N1", label: "N1", hint: "Single ipsilateral node, up to 3 cm, ENE-negative" },
  { value: "N2a", label: "N2a", hint: "Single ipsilateral node, 3–6 cm, ENE-negative" },
  { value: "N2b", label: "N2b", hint: "Multiple ipsilateral nodes, none greater than 6 cm, ENE-negative" },
  { value: "N2c", label: "N2c", hint: "Bilateral or contralateral nodes, none greater than 6 cm, ENE-negative" },
  { value: "N3a", label: "N3a", hint: "Node greater than 6 cm, ENE-negative" },
  { value: "N3b", label: "N3b", hint: "Any node with clinically overt extranodal extension" },
];

/** AJCC 9 p16+ oropharynx — clinical N, with iENE as an explicit modifier. */
const N_OPC_P16_CLINICAL: StagingOption[] = [
  { value: "N0", label: "N0", hint: "No regional lymph node metastasis" },
  { value: "N1", label: "N1", hint: "Ipsilateral nodes, all 6 cm or smaller, without iENE" },
  { value: "N2", label: "N2", hint: "Contralateral or bilateral nodes 6 cm or smaller — or ipsilateral nodes 6 cm or smaller with iENE" },
  { value: "N3", label: "N3", hint: "Nodes greater than 6 cm — or contralateral/bilateral nodes 6 cm or smaller with iENE" },
];

/** AJCC 9 p16+ oropharynx — pathological N (post neck dissection). */
const N_OPC_P16_PATH: StagingOption[] = [
  { value: "pN0", label: "pN0", hint: "No positive nodes" },
  { value: "pN1a", label: "pN1a", hint: "One positive node, without pENE" },
  { value: "pN1b", label: "pN1b", hint: "Two to four positive nodes, without pENE" },
  { value: "pN2", label: "pN2", hint: "More than four positive nodes without pENE, or one to four nodes with pENE" },
  { value: "pN3", label: "pN3", hint: "More than four positive nodes with pENE" },
];

/** AJCC 8 nasopharynx — site-specific N. */
const N_NPC: StagingOption[] = [
  { value: "N0", label: "N0", hint: "No regional lymph node metastasis" },
  { value: "N1", label: "N1", hint: "Unilateral cervical or retropharyngeal nodes up to 6 cm, above the caudal border of the cricoid cartilage" },
  { value: "N2", label: "N2", hint: "Bilateral cervical nodes up to 6 cm, above the caudal border of the cricoid cartilage" },
  { value: "N3", label: "N3", hint: "Nodes greater than 6 cm and/or extension below the caudal border of the cricoid cartilage" },
];

const M_OPTIONS: StagingOption[] = [
  { value: "M0", label: "M0", hint: "No distant metastasis" },
  { value: "M1", label: "M1", hint: "Distant metastasis" },
];

export interface SiteSchema {
  t: StagingOption[];
  n: StagingOption[];
  m: StagingOption[];
  edition: StagingEdition;
  /** p16+ oropharynx is staged twice — clinically and pathologically. */
  hasPathological: boolean;
  pathologicalN?: StagingOption[];
}

export function schemaFor(site: StagingSite): SiteSchema {
  switch (site) {
    case "oropharynx-p16-positive":
      return {
        t: T_OPC_P16,
        n: N_OPC_P16_CLINICAL,
        m: M_OPTIONS,
        edition: "AJCC 9",
        hasPathological: true,
        pathologicalN: N_OPC_P16_PATH,
      };
    case "oral-cavity":
      return { t: T_ORAL, n: N_GENERIC_CLINICAL, m: M_OPTIONS, edition: "AJCC 8", hasPathological: false };
    case "nasopharynx":
      return { t: T_NPC, n: N_NPC, m: M_OPTIONS, edition: "AJCC 8", hasPathological: false };
    default:
      return { t: T_GENERIC, n: N_GENERIC_CLINICAL, m: M_OPTIONS, edition: "AJCC 8", hasPathological: false };
  }
}

/* -------------------------------------------------------------------------- */
/* Stage grouping                                                              */
/* -------------------------------------------------------------------------- */

const CONFIRM: true = true;

/** AJCC 9 clinical stage group for p16+ oropharynx (unchanged from v8). */
function stageOpcP16Clinical(t: string, n: string, m: string): StagingResult {
  if (m === "M1") {
    return {
      stage: "IV",
      edition: "AJCC 9",
      reasoning: "Metastatic disease (M1) is Stage IV irrespective of T and N.",
      caveats: ["Oligometastatic p16-positive disease may still be treated with curative intent — that is an MDT decision, not a staging decision."],
      requiresConfirmation: CONFIRM,
      supported: true,
    };
  }
  const tRank = ["T0", "T1", "T2"].includes(t) ? "low" : t === "T3" ? "mid" : "high";
  const nRank = n === "N0" || n === "N1" ? "low" : n === "N2" ? "mid" : "high";

  let stage: string;
  let reasoning: string;
  if (tRank === "high" || nRank === "high") {
    stage = "III";
    reasoning = `${t === "T4" ? "A T4 primary tumour" : "N3 nodal disease"} defines clinical Stage III in the HPV-associated staging system.`;
  } else if (tRank === "low" && nRank === "low") {
    stage = "I";
    reasoning = "T0–T2 with N0–N1 is clinical Stage I — the large, favourable-prognosis group that defines the HPV-associated classification.";
  } else {
    stage = "II";
    reasoning = "T0–T2 with N2, or T3 with N0–N2, group to clinical Stage II.";
  }
  return {
    stage,
    edition: "AJCC 9",
    reasoning,
    caveats: [
      "Version 9 applies only to p16-positive oropharyngeal carcinoma diagnosed on or after 1 January 2026.",
      "p16 is a surrogate marker for HPV. Confirm with HPV-specific testing where the result alters management.",
      "The clinical stage groupings are unchanged from the 8th edition; what changed is that imaging-detected ENE now upstages the N category.",
    ],
    requiresConfirmation: CONFIRM,
    supported: true,
  };
}

/** AJCC 9 pathological stage group for p16+ oropharynx (post-resection). */
export function stageOpcP16Pathological(t: string, pn: string): StagingResult {
  const tLow = ["T0", "T1", "T2"].includes(t);
  const nLow = ["pN0", "pN1a", "pN1b"].includes(pn);

  let stage: string;
  let reasoning: string;
  if (t === "T4" || (t === "T3" && pn === "pN3")) {
    stage = "III";
    reasoning = "Any pT4, or pT3 with pN3, is pathological Stage III.";
  } else if (tLow && nLow) {
    stage = "I";
    reasoning = "pT1–T2 with pN0, pN1a or pN1b is pathological Stage I.";
  } else {
    stage = "II";
    reasoning = "pT1–T2 with pN2–pN3, or pT3 with pN0–pN2, is pathological Stage II.";
  }
  return {
    stage,
    edition: "AJCC 9",
    reasoning,
    caveats: [
      "Version 9 splits pN1 into pN1a (one node) and pN1b (two to four nodes), and makes pathological ENE an upstaging modifier.",
      "Pathological classification applies only after neck dissection — it does not replace the recorded clinical stage.",
      "Confirm the stage grouping against the AJCC Version 9 oropharynx protocol before recording it as the stage of record.",
    ],
    requiresConfirmation: CONFIRM,
    supported: true,
  };
}

/** AJCC 8 general mucosal head & neck stage grouping. */
function stageGenericMucosal(t: string, n: string, m: string): StagingResult {
  if (m === "M1") {
    return {
      stage: "IVC",
      edition: "AJCC 8",
      reasoning: "Distant metastasis (M1) is Stage IVC.",
      caveats: [],
      requiresConfirmation: CONFIRM,
      supported: true,
    };
  }
  if (t === "Tis") {
    return {
      stage: "0",
      edition: "AJCC 8",
      reasoning: "Carcinoma in situ with no nodal or distant disease is Stage 0.",
      caveats: [],
      requiresConfirmation: CONFIRM,
      supported: true,
    };
  }

  const n2 = n.startsWith("N2");
  const n3 = n.startsWith("N3");

  let stage: string;
  let reasoning: string;

  if (n3 || t === "T4b") {
    stage = "IVB";
    reasoning =
      t === "T4b"
        ? "T4b describes very advanced local disease and groups to Stage IVB."
        : "N3 nodal disease — including any node with clinically overt extranodal extension (N3b) — groups to Stage IVB.";
  } else if (t === "T4a" || n2) {
    stage = "IVA";
    reasoning =
      t === "T4a"
        ? "T4a, moderately advanced local disease with N0–N2, is Stage IVA."
        : "N2 nodal disease with T1–T4a is Stage IVA.";
  } else if (n === "N1" || t === "T3") {
    stage = "III";
    reasoning =
      n === "N1"
        ? "A single ipsilateral node up to 3 cm without ENE (N1) with T1–T3 is Stage III."
        : "T3 with N0 is Stage III.";
  } else if (t === "T2") {
    stage = "II";
    reasoning = "T2 N0 M0 is Stage II.";
  } else {
    stage = "I";
    reasoning = "T1 N0 M0 is Stage I.";
  }

  return {
    stage,
    edition: "AJCC 8",
    reasoning,
    caveats: [
      "ENE is the single largest change to the N category in the 8th edition — clinically overt ENE makes the node N3b.",
      "Depth of invasion forms part of the T category in oral cavity tumours.",
    ],
    requiresConfirmation: CONFIRM,
    supported: true,
  };
}

/** AJCC 8 nasopharynx stage grouping. */
function stageNasopharynx(t: string, n: string, m: string): StagingResult {
  if (m === "M1") {
    return {
      stage: "IVB",
      edition: "AJCC 8",
      reasoning: "Distant metastasis in nasopharyngeal carcinoma is Stage IVB.",
      caveats: ["The nasopharynx has its own stage grouping — M1 is IVB, not IVC."],
      requiresConfirmation: CONFIRM,
      supported: true,
    };
  }
  let stage: string;
  let reasoning: string;
  if (t === "T4" || n === "N3") {
    stage = "IVA";
    reasoning = "A T4 primary tumour or N3 nodal disease is Stage IVA.";
  } else if (t === "T3" || n === "N2") {
    stage = "III";
    reasoning = "T3 or N2 disease, in the absence of T4 or N3, is Stage III.";
  } else if (t === "T2" || n === "N1") {
    stage = "II";
    reasoning = "T2 or N1 disease is Stage II.";
  } else {
    stage = "I";
    reasoning = "T1 N0 M0 is Stage I.";
  }
  return {
    stage,
    edition: "AJCC 8",
    reasoning,
    caveats: [
      "Nasopharyngeal N categories are defined by laterality and by the caudal border of the cricoid cartilage, not by node count.",
      "Plasma EBV DNA level is prognostic in endemic NPC, but does not form part of the 8th edition stage grouping.",
    ],
    requiresConfirmation: CONFIRM,
    supported: true,
  };
}

export function computeStage(site: StagingSite, t: string, n: string, m: string): StagingResult {
  if (!t || !n || !m) {
    return {
      stage: null,
      edition: schemaFor(site).edition,
      reasoning: "Select the T, N and M categories to derive the stage.",
      caveats: [],
      requiresConfirmation: CONFIRM,
      supported: true,
    };
  }
  switch (site) {
    case "oropharynx-p16-positive":
      return stageOpcP16Clinical(t, n, m);
    case "nasopharynx":
      return stageNasopharynx(t, n, m);
    case "oropharynx-p16-negative":
    case "larynx":
    case "oral-cavity":
    case "hypopharynx":
      return stageGenericMucosal(t, n, m);
    default:
      return {
        stage: null,
        edition: "AJCC 8",
        reasoning: "This site is not supported in this prototype. Refer to the AJCC manual.",
        caveats: [],
        requiresConfirmation: CONFIRM,
        supported: false,
      };
  }
}

/** Map a patient's tumour subsite onto the staging system that applies to it. */
export function siteForSubsite(subsite: Subsite, p16?: string): StagingSite | null {
  switch (subsite) {
    case "oropharynx":
      return p16 === "positive" ? "oropharynx-p16-positive" : "oropharynx-p16-negative";
    case "larynx":
      return "larynx";
    case "oral-cavity":
      return "oral-cavity";
    case "hypopharynx":
      return "hypopharynx";
    case "nasopharynx":
      return "nasopharynx";
    default:
      return null;
  }
}
