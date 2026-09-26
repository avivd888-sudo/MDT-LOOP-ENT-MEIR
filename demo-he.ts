/**
 * Hebrew for the demonstration dataset.
 *
 * The rest of the interface is bilingual through label tables: a fixed set of
 * keys, each with an English and a Hebrew string. The seed data in `lib/data.ts`
 * cannot work that way, because its strings are not a vocabulary — they are one
 * clinician's prose about one fabricated patient, and there are several hundred
 * of them.
 *
 * ── Why a lookup on the English string, and not a second field ─────────────
 *
 * The obvious alternative is `diagnosis` plus `diagnosisHe` on each record, the
 * way `MilestoneSpec` carries `label` and `labelHe`. That works for a constant
 * declared once and never written to. It does not work here, because these
 * records are copied. The store rebuilds them on every action — `{...loop,
 * closedAt}`, `{...p, plan: recommendation, timeline: [...]}` — and each copy is
 * assembled from the fields the action cares about. A parallel `planHe` survives
 * a spread but goes stale the moment `plan` is written; a `titleHe` on a
 * timeline entry the store constructs itself is simply absent. The bug that
 * follows is the worst kind: the Hebrew is right everywhere until someone edits
 * a record, and then one line of it is silently English again.
 *
 * Keying on the English string removes the possibility. The key travels with
 * the value, through every spread, every copy and every rebuild, because it *is*
 * the value. Nothing has to be maintained in step with anything else.
 *
 * It also gives the right behaviour for the case that matters most. Anything not
 * in the table passes through unchanged — and what is not in the table is
 * exactly the text a clinician typed at runtime: an answer, a closure note, a
 * recommendation dictated into the decision sheet. That text is already in
 * whatever language its author chose, and translating it would be both
 * impossible and wrong. `dt` leaves it alone.
 *
 * The English seed data is therefore left exactly as written. This module is
 * additive: delete it and the application is what it was.
 */

import { getLabelLang } from "./lang-state";

/**
 * English seed string → the Hebrew an ENT surgeon at Meir would actually write.
 *
 * The Hebrew is not a literal translation. Abbreviations that Israeli
 * clinicians write in Latin letters — SCC, HPV, p16, ENE, TNM and stage codes,
 * PET-CT, MRI, CT, EBV, EBER, IMRT, ECOG, drug names — stay as they are; the
 * clause around them is Hebrew. A record that spelled all of them out in Hebrew
 * would read as a translation prepared for a foreigner, not as a hospital note.
 */
export const DEMO_HE: Record<string, string> = {
  /* The simulation cohort (lib/sim-cohort.ts) */
  "Moderately differentiated SCC, DOI 7 mm": "SCC בדרגת התמיינות בינונית, DOI 7 מ״מ",
  "Primary surgical resection with neck management as indicated; re-present with final pathology.": "כריתה כירורגית ראשונית עם טיפול בצוואר לפי ההתוויה; הצגה חוזרת עם פתולוגיה סופית.",
  "First ENT consultation": "ייעוץ ראשון במרפאת אא״ג",
  "Referred on the suspected head and neck cancer pathway.": "הופנה במסלול חשד לסרטן ראש-צוואר.",
  "Biopsy": "ביופסיה",
  "Diagnostic biopsy taken.": "נלקחה ביופסיה אבחנתית.",
  "Malignant pathology report (t = 0)": "דוח פתולוגיה ממאירה (t = 0)",
  "First definitive treatment": "טיפול מכריע ראשון",
  "Primary surgical resection.": "כריתה כירורגית ראשונית.",
  "Radiotherapy started.": "החלו הקרנות.",
  "Chemoradiotherapy started.": "החלו כימו-הקרנות.",
  "Concurrent chemoradiotherapy to the primary and bilateral neck.": "כימו-הקרנות במקביל למוקד הראשוני ולצוואר הדו-צדדי.",
  "SCC of the floor of mouth": "SCC של רצפת הפה",
  "Well differentiated SCC": "SCC בדרגת התמיינות טובה",
  "Base of tongue SCC, p16 positive": "SCC של בסיס הלשון, p16 חיובי",
  "Non-keratinising SCC, p16 positive": "SCC לא-מקרטן, p16 חיובי",
  "Glottic SCC, T1a": "SCC גלוטי, T1a",
  "Glottic SCC, T2": "SCC גלוטי, T2",
  "Radical radiotherapy to the primary and neck.": "הקרנות רדיקליות למוקד הראשוני ולצוואר.",
  "Board — deferred": "ועדה — נדחה",
  "Nutrition assessment outstanding": "הערכה תזונתית טרם הושלמה",
  "Classical papillary carcinoma, 2.4 cm": "קרצינומה פפילרית קלאסית, 2.4 ס״מ",
  "Post-cricoid SCC": "SCC פוסט-קריקואידי",
  "Fitness for cisplatin unresolved": "התאמה לציספלטין טרם הוכרעה",
  "Parotid mucoepidermoid carcinoma, high grade": "קרצינומה מוקואפידרמואידית של הפרוטיד, דרגה גבוהה",
  "High-grade mucoepidermoid carcinoma": "קרצינומה מוקואפידרמואידית בדרגה גבוהה",
  "SCC in a level II node, p16 positive": "SCC בקשרית ברמה II, p16 חיובי",
  "SCC of the buccal mucosa": "SCC של רירית הלחי",
  "PET-CT not yet reported": "PET-CT טרם פוענח",
  "Non-keratinising carcinoma, EBER positive": "קרצינומה לא-מקרטנת, EBER חיובי",
  "Supraglottic SCC, T3": "SCC סופרגלוטי, T3",
  "Sinonasal SCC of the maxillary sinus": "SCC סינונזלי של הסינוס המקסילרי",
  "Keratinising SCC": "SCC מקרטן",
  "Base of tongue SCC, p16 negative": "SCC של בסיס הלשון, p16 שלילי",
  "Keratinising SCC, p16 negative": "SCC מקרטן, p16 שלילי",
  "SCC of the lower alveolar ridge": "SCC של הרכס המכתשי התחתון",
  "Moderately differentiated SCC with bone invasion": "SCC בדרגת התמיינות בינונית עם חדירה לעצם",
  "Supraglottic SCC": "SCC סופרגלוטי",
  "Definitive treatment?": "טיפול מכריע?",
  "Staging PET-CT": "PET-CT לסטייג׳ינג",
  "p16 / HPV status": "סטטוס p16 / HPV",
  "Fitness for cisplatin": "התאמה לציספלטין",
  "Grade and molecular": "דרגה ובדיקה מולקולרית",
  "Panendoscopy histology": "היסטולוגיה מפאנאנדוסקופיה",
  "Skull base opinion": "חוות דעת בסיס גולגולת",
  "Adjuvant treatment on final pathology?": "טיפול משלים לפי הפתולוגיה הסופית?",
  "Adjuvant radiotherapy on final pathology.": "הקרנות משלימות לפי הפתולוגיה הסופית.",
  "Adjuvant chemoradiotherapy on final pathology.": "כימו-הקרנות משלימות לפי הפתולוגיה הסופית.",
  "— (pending pathology)": "— (ממתין לפתולוגיה)",
  "Dr. Oren Tamir": "ד״ר אורן תמיר",
  "Oral Medicine · pre-radiotherapy dental clinic": "רפואת הפה · מרפאת שיניים טרום-הקרנות",
  "Consensus of the board.": "הסכמת הוועדה.",

  /* ---------------------------------------------------------------- */
  /* Organisation                                                      */
  /* ---------------------------------------------------------------- */

  "Meir Medical Center, Kfar Saba": "מרכז רפואי מאיר, כפר סבא",
  "Clalit Health Services": "שירותי בריאות כללית",
  "Department of Otolaryngology — Head and Neck Surgery":
    "המחלקה לאף-אוזן-גרון וכירורגיית ראש-צוואר",

  /* ---------------------------------------------------------------- */
  /* The team — names and roles                                        */
  /* ---------------------------------------------------------------- */

  "Dr. Dana Levi": "ד״ר דנה לוי",
  "Dr. Noa Amara": "ד״ר נעה עמרה",
  "Prof. Eli Rosen": "פרופ׳ אלי רוזן",
  "Dr. Maya Katz": "ד״ר מאיה כץ",
  "Dr. Ronen Shani": "ד״ר רונן שני",
  "Dr. Tal Gold": "ד״ר טל גולד",
  "Dr. Yoav Bar": "ד״ר יואב בר",
  "Sarah Klein": "שרה קליין",
  "Yael Barak": "יעל ברק",
  "Rina Peled": "רינה פלד",
  "Dr. Amir Sela": "ד״ר אמיר סלע",

  // Referrers and services named in the timeline rather than in the roster.
  "Dr. Y. Mor, Clalit": "ד״ר י. מור, כללית",
  "Dr. S. Adler, Clalit": "ד״ר ש. אדלר, כללית",
  "Dr. N. Barzilai, Clalit": "ד״ר נ. ברזילי, כללית",
  "On-call ENT": "כונן אא״ג",
  Gastroenterology: "גסטרואנטרולוגיה",

  // "discipline lead" is מנהל דיסציפלינה everywhere — the term is fixed by the
  // governance document and the research protocol, and must not drift.
  "Head & Neck Surgeon · discipline lead": "מנתח ראש-צוואר · מנהל דיסציפלינה",
  "Department Chair": "מנהל המחלקה",
  "Radiation Oncologist": "אונקולוג קרינה",
  "Head & Neck Pathologist": "פתולוג ראש-צוואר",
  Neuroradiologist: "נוירורדיולוג",
  "Consultant Anaesthetist": "מרדים בכיר",
  "H&N Clinical Nurse Specialist": "אחות מתאמת ראש-צוואר",
  "Speech & Language Therapist": "קלינאי תקשורת",
  "Oncology Dietitian": "דיאטן אונקולוגי",
  "Palliative Care Physician": "רופא פליאטיבי",

  /* ---------------------------------------------------------------- */
  /* Patients — identity                                               */
  /* ---------------------------------------------------------------- */

  // The comma is load-bearing: `shortName` splits on it to produce "א. כהן".
  "Cohen, Abraham": "כהן, אברהם",
  "Ben-David, Yossi": "בן-דוד, יוסי",
  "Levi, Sarah": "לוי, שרה",
  "Hassan, Omar": "חסן, עומר",
  "Mizrahi, Ruth": "מזרחי, רות",
  "Azoulay, David": "אזולאי, דוד",
  "Friedman, Miriam": "פרידמן, מרים",
  "Peretz, Yaakov": "פרץ, יעקב",
  "Shapira, Eitan": "שפירא, איתן",

  /* Wards */
  ENT: "אא״ג",
  "Day unit": "אשפוז יום",
  "Oncology day unit": "אשפוז יום אונקולוגי",

  /* ---------------------------------------------------------------- */
  /* Diagnoses and histology                                           */
  /* ---------------------------------------------------------------- */

  "Glottic squamous cell carcinoma": "SCC של הגלוטיס",
  "Moderately differentiated SCC": "SCC בדרגת התמיינות בינונית",

  "Tonsillar SCC, p16 positive": "SCC של השקד, p16 חיובי",
  "Non-keratinising SCC, p16 positive (>70% block positivity)":
    "SCC לא-מקרן, p16 חיובי בצביעה גושית מפושטת (מעל 70% מהתאים)",

  "Papillary thyroid carcinoma": "קרצינומה פפילרית של בלוטת התריס",
  "Classical papillary carcinoma, 1.8 cm, no extrathyroidal extension":
    "קרצינומה פפילרית קלאסית, 1.8 ס״מ, ללא פלישה מחוץ לבלוטה",

  "Nasopharyngeal carcinoma, EBV associated": "קרצינומה של הנזופרינקס, קשורה ל־EBV",
  "Non-keratinising undifferentiated carcinoma, EBER positive":
    "קרצינומה לא-מקרנת בלתי מותמיינת, EBER חיובי",

  "SCC of the lateral tongue": "SCC של הלשון, צד לטרלי",
  "Well differentiated SCC, depth of invasion 8 mm on biopsy":
    "SCC בדרגת התמיינות טובה, עומק פלישה 8 מ״מ בביופסיה",

  "Pyriform sinus SCC": "SCC של הסינוס הפיריפורמי",
  "Poorly differentiated SCC": "SCC בדרגת התמיינות ירודה",

  "Parotid adenoid cystic carcinoma": "קרצינומה אדנואיד-ציסטית של בלוטת הפרוטיד",
  "Adenoid cystic carcinoma, cribriform pattern, perineural invasion present":
    "קרצינומה אדנואיד-ציסטית, תבנית קריבריפורמית, עם פלישה פרינוירלית",

  "Metastatic p16 positive SCC, unknown primary":
    "SCC גרורתי p16 חיובי, גידול ראשוני לא ידוע",
  "Metastatic non-keratinising SCC, p16 positive": "SCC לא-מקרן גרורתי, p16 חיובי",

  "Squamous cell carcinoma of the floor of mouth": "SCC של רצפת הפה",
  "Moderately differentiated SCC, depth of invasion 14 mm, one positive node without extranodal extension":
    "SCC בדרגת התמיינות בינונית, עומק פלישה 14 מ״מ, קשר לימפה חיובי אחד ללא פלישה חוץ-קשרית",

  /* ---------------------------------------------------------------- */
  /* Safety alerts                                                     */
  /* ---------------------------------------------------------------- */

  "Stridor at rest — airway watch": "סטרידור במנוחה — השגחת נתיב אוויר",
  "Anticoagulated (apixaban)": "בטיפול נוגד קרישה (apixaban)",
  "Grade 2 mucositis — nutrition review": "מוקוזיטיס דרגה 2 — הערכה תזונתית",
  "Warfarin — INR 3.4 on admission": "Warfarin — INR 3.4 בקבלה",
  "Aspirating — nil by mouth": "אספירציות — צום מוחלט",
  "12 kg weight loss over three months": "ירידה של 12 ק״ג במשקל בשלושה חודשים",
  "House-Brackmann III facial weakness post-operatively":
    "חולשת עצב הפנים House-Brackmann III לאחר הניתוח",
  "Adjuvant radiotherapy clock running — dental clearance outstanding":
    "שעון ההקרנות המשלימות רץ — אישור שיניים טרם הושלם",

  /* ---------------------------------------------------------------- */
  /* Comorbidities                                                     */
  /* ---------------------------------------------------------------- */

  // "COPD (FEV1 58%)" is deliberately absent: it is already what an Israeli
  // clinician writes, so it passes through unchanged.
  "Ischaemic heart disease": "מחלת לב איסכמית",
  "Atrial fibrillation": "פרפור פרוזדורים",
  "Well-controlled hypertension": "יתר לחץ דם מאוזן",
  Hypertension: "יתר לחץ דם",
  "Type 2 diabetes": "סוכרת סוג 2",
  "Mechanical mitral valve on warfarin": "מסתם מיטרלי מכני תחת warfarin",
  "CKD stage 3": "אי-ספיקת כליות כרונית שלב 3",
  "Alcohol-related liver disease": "מחלת כבד על רקע אלכוהול",
  "Malnutrition (BMI 17.4)": "תת-תזונה (BMI 17.4)",
  "Obstructive sleep apnoea": "דום נשימה חסימתי בשינה",

  /* ---------------------------------------------------------------- */
  /* Plans and next steps                                              */
  /* ---------------------------------------------------------------- */

  "Airway assessment takes priority. Definitive plan pending CT neck and formal staging.":
    "הערכת נתיב האוויר קודמת לכול. התוכנית הסופית ממתינה ל־CT צוואר ולסטייג׳ינג מלא.",
  "For MDT: transoral robotic surgery with neck dissection versus definitive radiotherapy.":
    "לדיון MDT: ניתוח רובוטי טרנס-אורלי (TORS) עם דיסקציה צווארית מול הקרנות דפיניטיביות.",
  "Hemithyroidectomy performed. Discharge once calcium and voice confirmed stable.":
    "בוצעה המי-תירואידקטומיה. שחרור לאחר ווידוא יציבות הסידן והקול.",
  "Concurrent chemoradiotherapy with cisplatin. Cycle 2 of 3.":
    "כימו-הקרנות משולבות עם cisplatin. מחזור 2 מתוך 3.",
  "Urgent referral. Requires biopsy, staging imaging and anaesthetic review.":
    "הפניה דחופה. נדרשות ביופסיה, הדמיית סטייג׳ינג והערכת הרדמה.",
  "For MDT: organ preservation versus laryngopharyngectomy. Nutrition is the rate-limiting issue.":
    "לדיון MDT: שימור איבר מול לרינגופרינגקטומיה. מצב התזונה הוא הגורם המגביל.",
  "Adjuvant radiotherapy completed. Long-term surveillance — adenoid cystic recurs late.":
    "הקרנות משלימות הושלמו. מעקב ארוך טווח — גידול אדנואיד-ציסטי נוטה להישנות מאוחרת.",
  "Panendoscopy with directed biopsies and bilateral tonsillectomy to identify the primary.":
    "פאן-אנדוסקופיה עם ביופסיות מכוונות וכריתת שקדים דו-צדדית לאיתור הגידול הראשוני.",
  "Adjuvant radiotherapy indicated for depth of invasion and nodal disease. Planning cannot be booked until dental clearance is complete.":
    "יש התוויה להקרנות משלימות בשל עומק הפלישה והמעורבות הקשרית. אי אפשר לקבוע סימולציה עד להשלמת אישור השיניים.",

  "CT neck with contrast": "CT צוואר עם חומר ניגוד",
  "MDT tumour board": "מועצת גידולים MDT",
  "Post-operative clinic": "מרפאה לאחר ניתוח",
  "Cisplatin cycle 3": "מחזור 3 של cisplatin",
  "Examination under anaesthesia + biopsy": "בדיקה בהרדמה כללית (EUA) וביופסיה",
  "Surveillance MRI": "MRI מעקב",
  "Radiotherapy planning scan": "סימולציית תכנון הקרנות",

  /* ---------------------------------------------------------------- */
  /* Care timeline — titles                                            */
  /* ---------------------------------------------------------------- */

  "Referral from family physician": "הפניה מרופא המשפחה",
  "Flexible nasendoscopy": "נזואנדוסקופיה גמישה",
  "Microlaryngoscopy and biopsy": "מיקרו-לרינגוסקופיה וביופסיה",
  Histology: "היסטולוגיה",
  "Admitted with stridor": "אושפז עם סטרידור",

  "Referral — neck lump": "הפניה — גוש בצוואר",
  "Ultrasound-guided core biopsy": "ביופסיית מחט גסה בהנחיית אולטרסאונד",
  "p16 positive SCC": "SCC p16 חיובי",
  "MRI neck + staging CT": "MRI צוואר ו־CT סטייג׳ינג",
  "Staged under AJCC Version 9": "דורג לפי AJCC מהדורה 9",

  "Referral — thyroid nodule": "הפניה — קשרית בבלוטת התריס",
  "FNA cytology": "ציטולוגיה מדיקור FNA",
  "MDT decision": "החלטת MDT",
  "Right hemithyroidectomy": "המי-תירואידקטומיה ימנית",
  "Final histology": "היסטולוגיה סופית",

  "Referral — unilateral hearing loss": "הפניה — ירידת שמיעה חד-צדדית",
  "Nasopharyngeal biopsy": "ביופסיה מהנזופרינקס",
  "EBER positive carcinoma": "קרצינומה EBER חיובית",
  "IMRT commenced": "החלו הקרנות IMRT",
  "Cisplatin cycle 2": "מחזור 2 של cisplatin",

  "Urgent referral": "הפניה דחופה",
  "Clinic assessment": "הערכה במרפאה",

  "Referral — dysphagia": "הפניה — קושי בבליעה",
  "Panendoscopy and biopsy": "פאן-אנדוסקופיה וביופסיה",
  "Staging CT and MRI": "CT ו־MRI לסטייג׳ינג",
  "Aspiration pneumonia": "דלקת ריאות מאספירציה",

  "Referral — parotid mass": "הפניה — גוש בבלוטת הפרוטיד",
  "Total parotidectomy": "פרוטידקטומיה מלאה",
  "Adenoid cystic carcinoma": "קרצינומה אדנואיד-ציסטית",
  "Adjuvant radiotherapy completed": "הקרנות משלימות הושלמו",
  "Surveillance MRI — no recurrence": "MRI מעקב — ללא הישנות",

  "Fine needle aspiration": "דיקור מחט דקה (FNA)",
  "MRI neck": "MRI צוואר",

  "Referral — non-healing floor of mouth ulcer": "הפניה — כיב שאינו מחלים ברצפת הפה",
  "Incisional biopsy": "ביופסיה חתוכה",
  "MDT decision — primary surgery": "החלטת MDT — ניתוח ראשוני",
  "Resection and selective neck dissection": "כריתה ודיסקציה צווארית סלקטיבית",
  "Radiation oncology review": "ביקורת אונקולוגיית קרינה",

  /* ---------------------------------------------------------------- */
  /* Care timeline — detail                                            */
  /* ---------------------------------------------------------------- */

  "Six weeks of progressive hoarseness in a 45 pack-year smoker. Flagged as suspected cancer.":
    "צרידות מתקדמת מזה שישה שבועות אצל מעשן עם 45 חפיסות-שנה. סומן כחשד לממאירות.",
  "Exophytic lesion of the right true cord crossing the anterior commissure. Cord mobility impaired.":
    "נגע אקסופיטי במיתר הקול הימני, חוצה את הקומיסורה הקדמית. תנועתיות המיתר מוגבלת.",
  "Under general anaesthesia. Airway maintained, no tracheostomy required.":
    "בהרדמה כללית. נתיב האוויר נשמר, לא נדרשה טרכאוסטומיה.",
  "Moderately differentiated invasive SCC. p16 not indicated at this site.":
    "SCC פולשני בדרגת התמיינות בינונית. אין התוויה לבדיקת p16 באתר הזה.",
  "Biphasic stridor at rest. Nebulised adrenaline and dexamethasone given. Airway stable, hourly observations.":
    "סטרידור דו-פאזי במנוחה. ניתנו adrenaline באינהלציה ו־dexamethasone. נתיב האוויר יציב, ניטור כל שעה.",

  "Painless right level II neck lump, three months. Minimal smoking history.":
    "גוש לא כואב בצוואר ימין, רמה II, מזה שלושה חודשים. עישון מזערי.",
  "Right level II node. Adequate sample obtained.":
    "קשר לימפה ברמה II מימין. התקבל מדגם מספק.",
  "Non-keratinising SCC, strong diffuse p16 positivity. HPV in-situ hybridisation confirmed positive.":
    "SCC לא-מקרן, צביעת p16 חזקה ומפושטת. הכלאה באתר ל־HPV אישרה חיוביות.",
  "2.8 cm right tonsillar primary. Single 2.1 cm ipsilateral level II node, no radiological ENE. No distant disease.":
    "גידול ראשוני בשקד הימני בגודל 2.8 ס״מ. קשר לימפה בודד באותו צד, רמה II, בגודל 2.1 ס״מ, ללא ENE בהדמיה. אין מחלה מרוחקת.",
  "p16+ oropharynx staged with the Version 9 system effective 1 Jan 2026. cT2 N1 M0 — clinical stage I.":
    "גידול אורופרינקס p16 חיובי דורג לפי מהדורה 9, שנכנסה לתוקף ב־1 בינואר 2026. cT2 N1 M0 — שלב קליני I.",

  "Incidental 1.8 cm right thyroid nodule found on imaging for an unrelated indication.":
    "קשרית אקראית בגודל 1.8 ס״מ באונה הימנית של בלוטת התריס, שהתגלתה בהדמיה מסיבה אחרת.",
  "Bethesda V — suspicious for papillary carcinoma.": "Bethesda V — חשד לקרצינומה פפילרית.",
  "Active surveillance without completion thyroidectomy.":
    "מעקב פעיל ללא השלמת כריתת בלוטת התריס.",
  "Recurrent laryngeal nerve identified and preserved with intraoperative monitoring. Parathyroids preserved.":
    "עצב הגרון החוזר זוהה ונשמר בניטור תוך-ניתוחי. בלוטות הפאראתירואיד נשמרו.",
  "1.8 cm classical papillary carcinoma. Margins clear, no extrathyroidal extension, no lymphovascular invasion.":
    "קרצינומה פפילרית קלאסית בגודל 1.8 ס״מ. שוליים נקיים, ללא פלישה מחוץ לבלוטה וללא פלישה לימפו-וסקולרית.",

  "Right conductive hearing loss with serous otitis media in an adult — red flag for nasopharyngeal pathology.":
    "ירידת שמיעה הולכתית מימין עם דלקת אוזן תיכונה סרוזית במבוגר — דגל אדום לפתולוגיה בנזופרינקס.",
  "Fullness of the right fossa of Rosenmüller. Biopsy taken.":
    "מילוי של פוסת רוזנמילר הימנית. נלקחה ביופסיה.",
  "Non-keratinising undifferentiated carcinoma, EBER in-situ hybridisation positive.":
    "קרצינומה לא-מקרנת בלתי מותמיינת, הכלאה באתר ל־EBER חיובית.",
  "70 Gy in 35 fractions to the primary and involved nodes.":
    "70 Gy ב־35 מנות לגידול הראשוני ולקשרי הלימפה המעורבים.",
  "Given at 100 mg/m². Renal function and audiometry stable.":
    "ניתן במינון 100 mg/m². תפקודי הכליה ובדיקת השמיעה יציבים.",

  "Non-healing left lateral tongue ulcer, seven weeks. Painful, with referred otalgia.":
    "כיב שאינו מחלים בצד השמאלי של הלשון מזה שבעה שבועות. כואב, עם כאב אוזן מוקרן.",
  "2.6 cm indurated ulcer of the left lateral tongue. No palpable neck nodes. Photographed and measured.":
    "כיב מוקשה בגודל 2.6 ס״מ בצד השמאלי של הלשון. אין קשרי לימפה נמושים בצוואר. צולם ונמדד.",

  "Progressive dysphagia to solids and liquids with significant weight loss.":
    "דיספגיה מתקדמת למוצקים ולנוזלים עם ירידה משמעותית במשקל.",
  "Large exophytic left pyriform sinus tumour extending to the post-cricoid region.":
    "גידול אקסופיטי גדול בסינוס הפיריפורמי השמאלי, מתפשט לאזור הפוסט-קריקואידי.",
  "Poorly differentiated invasive squamous cell carcinoma.":
    "SCC פולשני בדרגת התמיינות ירודה.",
  "T4a with thyroid cartilage erosion. Multiple ipsilateral level III nodes with radiological extranodal extension.":
    "T4a עם ארוזיה של סחוס בלוטת התריס. קשרי לימפה מרובים באותו צד ברמה III עם פלישה חוץ-קשרית (ENE) בהדמיה.",
  "Treated with IV antibiotics. Nasogastric feeding commenced. Dietitian and SLT involved.":
    "טופל באנטיביוטיקה תוך-ורידית. הוחל בהזנה דרך זונדה. שולבו דיאטנית וקלינאית תקשורת.",

  "Slowly enlarging left parotid mass over 18 months.":
    "גוש בבלוטת הפרוטיד השמאלית, גדל לאט במשך 18 חודשים.",
  "Facial nerve dissected and anatomically preserved. Sural nerve cable graft to a sacrificed buccal branch.":
    "עצב הפנים נותח ונשמר אנטומית. הושתל שתל עצבי מהעצב הסוראלי לענף הבוקאלי שהוקרב.",
  "Cribriform pattern with extensive perineural invasion. Margins close at the deep lobe.":
    "תבנית קריבריפורמית עם פלישה פרינוירלית נרחבת. שוליים קרובים באונה העמוקה.",
  "60 Gy in 30 fractions to the parotid bed, covering the named nerve pathway to the skull base.":
    "60 Gy ב־30 מנות למיטת הפרוטיד, בכיסוי מהלך העצב עד בסיס הגולגולת.",
  "No evidence of local recurrence. Facial function improving, House-Brackmann III.":
    "אין עדות להישנות מקומית. תפקוד עצב הפנים משתפר, House-Brackmann III.",

  "Right level II neck lump. No mucosal lesion identified on clinic examination.":
    "גוש בצוואר ימין, רמה II. לא נמצא נגע רירי בבדיקה במרפאה.",
  "Metastatic squamous cell carcinoma. p16 positive on cell block.":
    "SCC גרורתי. p16 חיובי בבלוק התאים.",
  "2.4 cm right level II node. No mucosal primary identified.":
    "קשר לימפה בגודל 2.4 ס״מ ברמה II מימין. לא זוהה גידול ראשוני רירי.",

  "Six weeks of a painful, non-healing ulcer in a 30 pack-year smoker.":
    "כיב כואב שאינו מחלים מזה שישה שבועות אצל מעשן עם 30 חפיסות-שנה.",
  "Under local anaesthesia in clinic. Moderately differentiated invasive SCC.":
    "בהרדמה מקומית במרפאה. SCC פולשני בדרגת התמיינות בינונית.",
  "Resection with selective neck dissection, adjuvant radiotherapy anticipated given depth of invasion.":
    "כריתה עם דיסקציה צווארית סלקטיבית; צפויות הקרנות משלימות בשל עומק הפלישה.",
  "Per-oral resection with radial forearm free flap reconstruction. Levels I–III neck dissection.":
    "כריתה דרך הפה ושחזור במתלה חופשי מהאמה (radial forearm). דיסקציה צווארית רמות I–III.",
  "Depth of invasion 14 mm. One of 28 nodes positive at level II, no extranodal extension. Margins clear at 4 mm.":
    "עומק פלישה 14 מ״מ. קשר אחד מתוך 28 חיובי ברמה II, ללא פלישה חוץ-קשרית. שוליים נקיים במרחק 4 מ״מ.",
  "Adjuvant radiotherapy confirmed. Planning cannot proceed until dental clearance is documented.":
    "אושרו הקרנות משלימות. אי אפשר להתקדם לתכנון עד לתיעוד אישור השיניים.",

  /* ---------------------------------------------------------------- */
  /* Documents                                                         */
  /* ---------------------------------------------------------------- */

  "Histology — right glottis": "היסטולוגיה — גלוטיס ימני",
  "Nasendoscopy stills": "תמונות מנזואנדוסקופיה",
  "Pre-anaesthetic assessment": "הערכה טרום-הרדמתית",
  "Admission bloods": "בדיקות דם בקבלה",
  "Core biopsy report + p16": "דוח ביופסיית מחט גסה עם p16",
  "MRI neck with contrast": "MRI צוואר עם חומר ניגוד",
  "Staging CT chest": "CT חזה לסטייג׳ינג",
  "Dental assessment": "הערכת שיניים",
  "Operative note": "דוח ניתוח",
  "Post-operative calcium series": "סדרת בדיקות סידן לאחר הניתוח",
  "Nasopharyngeal biopsy + EBER": "ביופסיה מהנזופרינקס עם EBER",
  "Radiotherapy plan": "תוכנית הקרנות",
  "Baseline audiogram": "אודיוגרם בסיס",
  "Referral letter": "מכתב הפניה",
  "Clinical photographs": "תמונות קליניות",
  "Panendoscopy findings": "ממצאי פאן-אנדוסקופיה",
  "Histology report": "דוח היסטולוגיה",
  "Staging CT neck/chest": "CT צוואר/חזה לסטייג׳ינג",
  "Nutrition assessment": "הערכה תזונתית",
  "Operative note — parotidectomy": "דוח ניתוח — פרוטידקטומיה",
  "Histology — adenoid cystic": "היסטולוגיה — אדנואיד-ציסטית",
  "Surveillance MRI report": "דוח MRI מעקב",
  "FNA cytology + p16": "ציטולוגיית FNA עם p16",
  "Operative note — resection and flap": "דוח ניתוח — כריתה ומתלה",
  "Final histology report": "דוח היסטולוגיה סופי",
  "Radiation oncology letter": "מכתב אונקולוגיית קרינה",

  /* ---------------------------------------------------------------- */
  /* Loops — SBAR, request, answer, closure, event notes               */
  /* ---------------------------------------------------------------- */

  /* l-1 — urgent CT report, never acknowledged */
  "64-year-old man with glottic SCC, admitted with biphasic stridor at rest.":
    "בן 64 עם SCC גלוטי, אושפז עם סטרידור דו-פאזי במנוחה.",
  "Clinical T3, impaired cord mobility. COPD with FEV1 58%, on apixaban. CT neck performed today at 14:00.":
    "T3 קליני, תנועתיות מיתר מוגבלת. COPD עם FEV1 58%, תחת apixaban. CT צוואר בוצע היום בשעה 14:00.",
  "The airway is borderline. Neither surgery nor radiotherapy can be planned without knowing whether there is thyroid cartilage invasion.":
    "נתיב האוויר גבולי. אי אפשר לתכנן ניתוח או הקרנות בלי לדעת אם יש פלישה לסחוס בלוטת התריס.",
  "Urgent CT neck report — specifically: is there invasion through the outer cortex of the thyroid cartilage?":
    "פענוח דחוף של CT הצוואר — ובמפורש: האם יש פלישה דרך הקורטקס החיצוני של סחוס בלוטת התריס?",

  /* l-2 — anaesthetic risk, acknowledged but unanswered */
  "67-year-old man, pyriform sinus SCC T4a N2b, listed for today's tumour board.":
    "בן 67, SCC של הסינוס הפיריפורמי T4a N2b, מועלה לדיון במועצת הגידולים היום.",
  "ECOG 2, BMI 17.4, 12 kg weight loss, alcohol-related liver disease, aspiration pneumonia five days ago.":
    "ECOG 2, BMI 17.4, ירידה של 12 ק״ג במשקל, מחלת כבד על רקע אלכוהול, דלקת ריאות מאספירציה לפני חמישה ימים.",
  "The board must choose between organ preservation and total laryngopharyngectomy. That choice depends almost entirely on whether he is operable.":
    "המועצה נדרשת לבחור בין שימור איבר ובין לרינגופרינגקטומיה מלאה. הבחירה תלויה כמעט כולה בשאלה אם הוא נתיח.",
  "Anaesthetic risk assessment: is this patient fit for total laryngopharyngectomy as he stands, and if not, what would be required to get him there?":
    "הערכת סיכון הרדמתי: האם המטופל כשיר ללרינגופרינגקטומיה מלאה במצבו הנוכחי, ואם לא — מה נדרש כדי להביא אותו לשם?",
  "Received. I will review the notes and see him on the ward.":
    "התקבל. אעבור על הרשומה ואראה אותו במחלקה.",

  /* l-3 — HPV confirmation on an existing block */
  "61-year-old man with metastatic p16 positive SCC in a level II node, no primary identified.":
    "בן 61 עם SCC גרורתי p16 חיובי בקשר לימפה ברמה II, ללא גידול ראשוני מזוהה.",
  "FNA cytology showed p16 positivity on cell block. MRI neck showed no mucosal lesion. PET-CT booked for 25 Aug.":
    "ציטולוגיית FNA הראתה חיוביות ל־p16 בבלוק התאים. ב־MRI צוואר לא נמצא נגע רירי. PET-CT נקבע ל־25 באוגוסט.",
  "p16 on a cytology cell block is less reliable than on tissue. If the result is not genuine, the work-up and staging pathway are entirely different.":
    "p16 בבלוק תאים ציטולוגי אמין פחות מאשר ברקמה. אם התוצאה אינה אמיתית, הבירור ומסלול הסטייג׳ינג שונים לחלוטין.",
  "Can HPV in-situ hybridisation or PCR be performed on the existing material to confirm the p16 result, or is a repeat core biopsy needed?":
    "האם אפשר לבצע הכלאה באתר ל־HPV או PCR על החומר הקיים כדי לאשש את תוצאת ה־p16, או שנדרשת ביופסיית מחט גסה חוזרת?",
  "There is sufficient material in the block. I have sent it for HPV ISH, result expected within five working days. A repeat biopsy is not needed at this stage.":
    "יש די חומר בבלוק. שלחתי ל־HPV ISH, התוצאה צפויה תוך חמישה ימי עבודה. אין צורך בביופסיה חוזרת בשלב זה.",

  /* l-4 — anticoagulation bridging, closed properly */
  "71-year-old woman with a tongue ulcer suspicious for SCC, listed for EUA and biopsy on 24 Aug.":
    "בת 71 עם כיב בלשון החשוד ל־SCC, מיועדת לבדיקה בהרדמה (EUA) וביופסיה ב־24 באוגוסט.",
  "Mechanical mitral valve on warfarin, INR 3.4 on admission. Diabetes, CKD stage 3.":
    "מסתם מיטרלי מכני תחת warfarin, INR 3.4 בקבלה. סוכרת ואי-ספיקת כליות כרונית שלב 3.",
  "Biopsy cannot proceed at an INR of 3.4. Every day of delay is another day to diagnosis.":
    "אי אפשר לבצע ביופסיה עם INR 3.4. כל יום של עיכוב הוא עוד יום עד לאבחנה.",
  "Anticoagulation bridging plan for EUA on 24 Aug — when to stop warfarin, and is low molecular weight heparin cover required?":
    "תוכנית גישור נוגדי קרישה לקראת ה־EUA ב־24 באוגוסט — מתי להפסיק warfarin, והאם נדרש כיסוי בהפרין נמוך משקל מולקולרי?",
  "Stop warfarin five days before. Bridge with enoxaparin 1 mg/kg twice daily, last dose 24 hours before the procedure. Check INR on the morning of surgery, target below 1.5. Agreed with haematology.":
    "להפסיק warfarin חמישה ימים לפני. גישור ב־enoxaparin במינון 1 mg/kg פעמיים ביום, מנה אחרונה 24 שעות לפני הפרוצדורה. לבדוק INR בבוקר הניתוח, יעד מתחת ל־1.5. סוכם עם המטולוגיה.",
  "Plan is clear and sufficient. Entered in the diary, patient informed by telephone.":
    "התוכנית ברורה ומספקת. נרשמה ביומן, המטופלת עודכנה טלפונית.",

  /* l-5 — nutrition before treatment */
  "67-year-old man with 12 kg weight loss, BMI 17.4, nasogastric feeding after aspiration.":
    "בן 67 עם ירידה של 12 ק״ג במשקל, BMI 17.4, הזנה דרך זונדה לאחר אספירציה.",
  "Hypopharyngeal SCC T4a. Either organ preservation or extensive surgery is in prospect.":
    "SCC של ההיפופרינקס T4a. על הפרק שימור איבר או ניתוח נרחב.",
  "Without improving nutritional status, both treatment options carry a high risk of failure.":
    "בלי שיפור במצב התזונתי, שתי אפשרויות הטיפול נושאות סיכון גבוה לכישלון.",
  "Should we recommend percutaneous gastrostomy before treatment starts, and what is a realistic timeline for nutritional improvement?":
    "האם להמליץ על גסטרוסטומיה מלעורית (PEG) לפני תחילת הטיפול, ומהו לוח זמנים ריאלי לשיפור תזונתי?",
  "I recommend PEG before treatment starts. With full feeding, meaningful improvement is expected within two to three weeks. Gastroenterology request submitted.":
    "ממליצה על PEG לפני תחילת הטיפול. בהזנה מלאה צפוי שיפור משמעותי תוך שבועיים עד שלושה. הוגשה בקשה לגסטרואנטרולוגיה.",
  "Accepted. Will present at the board as part of the choice between the two options.":
    "מקובל. יוצג במועצה כחלק מהבחירה בין שתי האפשרויות.",

  /* l-6 — functional outcome data */
  "58-year-old man, p16 positive tonsillar SCC, cT2 N1 M0 stage I under AJCC 9.":
    "בן 58, SCC של השקד p16 חיובי, cT2 N1 M0 שלב I לפי AJCC 9.",
  "ECOG 0, minimal smoking history. Two options: TORS with neck dissection versus definitive radiotherapy.":
    "ECOG 0, עישון מזערי. שתי אפשרויות: TORS עם דיסקציה צווארית מול הקרנות דפיניטיביות.",
  "He is relatively young with an excellent prognosis. The difference between the options is largely functional, not survival.":
    "מטופל צעיר יחסית עם פרוגנוזה מצוינת. ההבדל בין האפשרויות הוא בעיקר תפקודי, לא הישרדותי.",
  "Functional outcome data for a fair comparison against TORS — swallowing, PEG dependence and xerostomia at one year.":
    "נתוני תוצאות תפקודיות להשוואה הוגנת מול TORS — בליעה, תלות ב־PEG ויובש בפה בתום שנה.",
  "I will bring the functional outcome data to the board. In short: PEG dependence at one year is below 5% for both pathways in stage I disease; the meaningful difference is xerostomia versus post-surgical swallowing change.":
    "אביא את נתוני התוצאות התפקודיות למועצה. בקצרה: תלות ב־PEG בתום שנה נמוכה מ־5% בשני המסלולים במחלה בשלב I; ההבדל המשמעותי הוא בין יובש בפה ובין שינוי בבליעה לאחר ניתוח.",
  "Exactly what is needed to present to the patient. Thank you.":
    "בדיוק מה שנדרש כדי להציג למטופל. תודה.",

  /* l-7 — PET-CT booking */
  "61-year-old man under investigation for an unknown primary.":
    "בן 61 בבירור בשל גידול ראשוני לא ידוע.",
  "PET-CT is required before panendoscopy. The work-up is stalled until it is done.":
    "נדרש PET-CT לפני הפאן-אנדוסקופיה. הבירור תקוע עד לביצועו.",
  "Panendoscopy without the PET wastes a general anaesthetic.":
    "פאן-אנדוסקופיה בלי ה־PET מבזבזת הרדמה כללית.",
  "Confirm the patient has been booked for PET-CT on 25 Aug and knows to attend fasted.":
    "לוודא שהמטופל זומן ל־PET-CT ב־25 באוגוסט ויודע להגיע בצום.",
  "Booked for 25 Aug at 13:00, confirmed by telephone, fasting instructions sent by SMS.":
    "זומן ל־25 באוגוסט בשעה 13:00, אושר טלפונית, הוראות הצום נשלחו ב־SMS.",
  Confirmed: "אושר.",

  /* l-8 — completion thyroidectomy or surveillance */
  "42-year-old woman after hemithyroidectomy, 1.8 cm papillary carcinoma.":
    "בת 42 לאחר המי-תירואידקטומיה, קרצינומה פפילרית בגודל 1.8 ס״מ.",
  "Margins clear, no extrathyroidal extension, no lymphovascular invasion.":
    "שוליים נקיים, ללא פלישה מחוץ לבלוטה וללא פלישה לימפו-וסקולרית.",
  "This is low-risk disease. The question is whether completion thyroidectomy is required.":
    "מדובר במחלה בסיכון נמוך. השאלה היא אם נדרשת השלמת כריתת בלוטת התריס.",
  "Confirm that active surveillance without completion surgery is the right approach, and specify the follow-up protocol.":
    "לאשר שמעקב פעיל ללא ניתוח השלמה הוא הגישה הנכונה, ולפרט את פרוטוקול המעקב.",
  "Agreed — low-risk disease, completion surgery adds morbidity without a survival benefit. Follow-up: TSH suppressed to the low-normal range, annual neck ultrasound.":
    "מסכימה — מחלה בסיכון נמוך, ניתוח השלמה מוסיף תחלואה בלי תועלת הישרדותית. מעקב: דיכוי TSH לטווח הנורמה הנמוך ואולטרסאונד צוואר שנתי.",
  "Closed. Will present at the board on 13 Aug as an agreed recommendation.":
    "נסגרה. תוצג במועצה ב־13 באוגוסט כהמלצה מוסכמת.",

  /* l-9 — the dental clearance holding up the adjuvant clock */
  "61-year-old man, 35 days after resection and free flap for a floor of mouth SCC, awaiting adjuvant radiotherapy.":
    "בן 61, 35 יום לאחר כריתה ושחזור במתלה חופשי בשל SCC של רצפת הפה, ממתין להקרנות משלימות.",
  "Depth of invasion 14 mm, one positive node without extranodal extension. Radiation oncology reviewed on day 19 and confirmed adjuvant radiotherapy. Dental clearance was not arranged before surgery.":
    "עומק פלישה 14 מ״מ, קשר לימפה חיובי אחד ללא פלישה חוץ-קשרית. אונקולוגיית קרינה בדקה ביום 19 ואישרה הקרנות משלימות. אישור השיניים לא הוסדר לפני הניתוח.",
  "Planning cannot be booked without documented dental clearance. Thirty-five of the forty-two days of the guideline window have already gone; beyond six weeks the adjusted hazard ratio for overall survival is 1.10–1.13.":
    "אי אפשר לקבוע סימולציה בלי אישור שיניים מתועד. 35 מתוך 42 הימים של חלון ההנחיות כבר חלפו; מעבר לשישה שבועות יחס הסיכונים המתוקנן להישרדות כוללת הוא 1.10–1.13.",
  "Dental assessment and clearance for radiotherapy — can this be brought forward to this week, and are any extractions required before planning?":
    "הערכת שיניים ואישור לקראת הקרנות — האם אפשר להקדים לשבוע הזה, והאם נדרשות עקירות לפני התכנון?",

  /* ---------------------------------------------------------------- */
  /* Tumour board — sessions, questions, prerequisites, decisions      */
  /* ---------------------------------------------------------------- */

  "Head & Neck Tumour Board": "מועצת גידולי ראש-צוואר",
  "Seminar Room 2 + video link": "חדר סמינרים 2 + קישור וידאו",

  "Transoral robotic surgery with neck dissection, or definitive radiotherapy?":
    "ניתוח רובוטי טרנס-אורלי (TORS) עם דיסקציה צווארית, או הקרנות דפיניטיביות?",
  "Organ preservation chemoradiotherapy versus total laryngopharyngectomy in a malnourished ECOG 2 patient?":
    "כימו-הקרנות לשימור איבר מול לרינגופרינגקטומיה מלאה במטופל בתת-תזונה עם ECOG 2?",
  "Airway management strategy and definitive treatment for T3 glottic SCC with stridor.":
    "אסטרטגיה לניהול נתיב האוויר וטיפול דפיניטיבי ב־SCC גלוטי T3 עם סטרידור.",
  "Confirm the work-up sequence for p16 positive unknown primary.":
    "אישור סדר הבירור בגידול ראשוני לא ידוע p16 חיובי.",
  "Completion thyroidectomy or surveillance after hemithyroidectomy?":
    "השלמת כריתת בלוטת התריס או מעקב לאחר המי-תירואידקטומיה?",

  "Histology with p16": "היסטולוגיה עם p16",
  "Cross-sectional imaging": "הדמיה חתכית",
  "Functional outcome data": "נתוני תוצאות תפקודיות",
  "Staging CT neck and chest": "CT צוואר וחזה לסטייג׳ינג",
  "Anaesthetic risk assessment": "הערכת סיכון הרדמתי",
  "Pulmonary function tests": "תפקודי ריאות",
  "CT neck report": "פענוח CT צוואר",
  "Cytology with p16": "ציטולוגיה עם p16",
  "HPV confirmation": "אישוש HPV",
  "PET-CT booking": "זימון ל־PET-CT",
  "Post-operative calcium": "סידן לאחר הניתוח",
  "Oncology opinion": "חוות דעת אונקולוגית",

  "No completion thyroidectomy. Active surveillance with TSH suppression to the low-normal range and annual neck ultrasound.":
    "ללא השלמת כריתת בלוטת התריס. מעקב פעיל עם דיכוי TSH לטווח הנורמה הנמוך ואולטרסאונד צוואר שנתי.",
  "1.8 cm classical papillary carcinoma, margins clear, no extrathyroidal extension and no lymphovascular invasion. This is low-risk disease where completion surgery adds morbidity without a survival benefit.":
    "קרצינומה פפילרית קלאסית בגודל 1.8 ס״מ, שוליים נקיים, ללא פלישה מחוץ לבלוטה וללא פלישה לימפו-וסקולרית. זו מחלה בסיכון נמוך שבה ניתוח השלמה מוסיף תחלואה בלי תועלת הישרדותית.",
  "Book endocrine clinic at six weeks with thyroid function tests.":
    "לזמן למרפאה אנדוקרינית בעוד שישה שבועות עם תפקודי בלוטת התריס.",

  /* ---------------------------------------------------------------- */
  /* Strings the store writes when a decision is recorded              */
  /* ---------------------------------------------------------------- */

  // Not seed data, but constructed from fixed English in `lib/store.tsx` and
  // rendered through the same fields, so they belong in the same table.
  "MDT decision recorded": "נרשמה החלטת MDT",
  "Follow-up action arising from the board decision.":
    "פעולת המשך הנובעת מהחלטת המועצה.",
/* ---------------------------------------------------------------- */
  /* Access requests waiting on a discipline lead                      */
  /* ---------------------------------------------------------------- */

  /* Beta: the endocrine and infectious-diseases loops */

  "42-year-old woman, ten days after total thyroidectomy for papillary carcinoma.":
    "אישה בת 42, עשרה ימים אחרי כריתת בלוטת התריס בשלמותה בשל קרצינומה פפילרית.",
  "1.8 cm classical papillary carcinoma, clear margins, no extrathyroidal extension. Corrected calcium 8.1 mg/dL on day 2, now 8.6 on replacement. On levothyroxine 100 mcg.":
    "קרצינומה פפילרית קלאסית בגודל 1.8 ס״מ, שוליים נקיים, ללא פלישה מחוץ לבלוטה. סידן מתוקנן 8.1 ביום השני, כעת 8.6 תחת תוספת. מקבלת לבותירוקסין 100 מק״ג.",
  "Low-risk disease. The question is the TSH target and whether suppression is justified at all, because suppression is not free in a woman of this age.":
    "מחלה בסיכון נמוך. השאלה היא יעד ה־TSH, והאם דיכוי מוצדק בכלל — דיכוי אינו חינם באישה בגיל הזה.",
  "What TSH target would you set for this patient, and for how long? If suppression is not indicated, we would rather start her on a replacement dose now than correct it in three months.":
    "איזה יעד TSH היית קובע למטופלת הזאת, ולכמה זמן? אם דיכוי אינו מתאים, עדיף שנתחיל מינון תחליפי עכשיו ולא נתקן בעוד שלושה חודשים.",
  "Low-risk papillary carcinoma with a complete resection: the target is a TSH in the low-normal range, 0.5 to 2.0, not suppression. Suppression in a 42-year-old adds atrial fibrillation and bone loss risk without a survival benefit at this risk level. Continue 100 mcg and check TSH and calcium at six weeks.":
    "קרצינומה פפילרית בסיכון נמוך עם כריתה שלמה: היעד הוא TSH בטווח הנמוך-תקין, 0.5 עד 2.0, ולא דיכוי. דיכוי בגיל 42 מוסיף סיכון לפרפור פרוזדורים ולאובדן מסת עצם בלי תועלת הישרדותית ברמת הסיכון הזאת. להמשיך 100 מק״ג ולבדוק TSH וסידן בעוד שישה שבועות.",
  "Taking this one. I will look at her post-operative calcium trend first.":
    "לוקחת את זה. אסתכל קודם על מגמת הסידן שלה אחרי הניתוח.",

  "67-year-old man on chemoradiation for hypopharyngeal SCC, febrile at 38.9°C with a tender left neck.":
    "גבר בן 67 תחת כימו-קרינה בשל SCC היפופרינגיאלי, חום 38.9 ורגישות בצוואר שמאל.",
  "Day 19 of chemoradiation, neutrophils 0.8. PEG in situ. CT neck today shows a 2 cm collection at level III without an obvious airway threat.":
    "יום 19 לכימו-קרינה, נויטרופילים 0.8. PEG במקומו. CT צוואר היום מדגים אוסף בגודל 2 ס״מ ברמה III ללא איום ברור על נתיב האוויר.",
  "Neutropenic and febrile with a collection. The immediate question is whether this is drained now or treated medically, and what covers it while we decide.":
    "נויטרופני, עם חום ועם אוסף. השאלה המיידית היא אם מנקזים עכשיו או מטפלים תרופתית, ובמה מכסים בינתיים.",
  "Empirical cover for a neutropenic head and neck patient with a level III collection — what would you start, and does the collection change your answer?":
    "כיסוי אמפירי למטופל ראש-צוואר נויטרופני עם אוסף ברמה III — במה היית מתחיל, והאם האוסף משנה את התשובה?",

  "Dr. Sivan Harel": "ד״ר סיון הראל",
  "Endocrinologist · thyroid clinic": "אנדוקרינולוגית · מרפאת בלוטת התריס",
  "Dr. Rami Ashkenazi": "ד״ר רמי אשכנזי",
  "Infectious Diseases Physician": "רופא מחלות זיהומיות",
  "Head & Neck Oncologist": "אונקולוג ראש-צוואר",
  "Dr. Efrat Ben-Ari": "ד״ר אפרת בן-ארי",
  "Neurologist · cranial nerve clinic": "נוירולוגית · מרפאת עצבים קרניאליים",
  "Dr. Guy Almog": "ד״ר גיא אלמוג",
  "Neurosurgeon · anterior skull base": "נוירוכירורג · בסיס גולגולת קדמי",
  "Dr. Yael Adler": "ד״ר יעל אדלר",
  "Head & Neck Fellow": "מתמחה-על בכירורגיית ראש-צוואר",
  "Dr. Omri Nahum": "ד״ר עמרי נחום",
  "Ministry of Health and the government hospitals":
    "משרד הבריאות ובתי החולים הממשלתיים",
};

/**
 * The demonstration string, in the language currently being displayed.
 *
 * Anything absent from the glossary is returned untouched — which is the whole
 * behaviour for text entered at runtime.
 */
export function dt(s: string): string {
  if (getLabelLang() !== "he") return s;
  return isolateLatin(DEMO_HE[s] ?? s);
}

/**
 * Fence every Latin run inside a Hebrew string.
 *
 * A clinical record is full of runs that stay in Latin script — `p16`, `SCC`,
 * `PET-CT`, `T2N1M0`, `HPV ISH`. Dropped into a right-to-left paragraph, the
 * punctuation and digits around them are bidi-neutral, so the paragraph's own
 * direction decides where they land: `ה־p16,` renders with its comma on the
 * wrong side, and a stage code beside a slash comes out reversed. It looks like
 * a typing error rather than a rendering one, which is why it survives review.
 *
 * The `<En>` component solves this with markup, but these strings are handed to
 * props typed `string` — a card title, a document name, an aria-label — where
 * no element can go. U+2068 FIRST STRONG ISOLATE and U+2069 POP DIRECTIONAL
 * ISOLATE do the same job as characters: the run is resolved on its own, in the
 * direction of its own first strong character, and cannot be reordered against
 * the Hebrew around it.
 *
 * The isolates are invisible and are stripped by `String.normalize` comparisons
 * nowhere in this application — but note they *are* present in the returned
 * string, so it is a display value, never a key.
 */
/*
 * A maximal Latin run, separators included. Isolating "Warfarin" and "INR"
 * separately would leave the dash between them neutral, and a neutral between
 * two isolates belongs to the paragraph — so "Warfarin — INR 3.4" would come
 * back as "INR — Warfarin". The run has to be fenced whole. It ends at the
 * last Latin or digit, never on a separator, so a comma before Hebrew stays
 * outside and falls where Hebrew punctuation should.
 */
const LATIN_RUN = /[A-Za-z][A-Za-z0-9]*(?:[ \-–—./+:][A-Za-z0-9]+)*/g;

function isolateLatin(s: string): string {
  return s.replace(LATIN_RUN, "\u2068$&\u2069");
}

/* -------------------------------------------------------------------------- */
/* Translating whole records                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The record fields that hold prose a reader sees.
 *
 * An allow-list, not a deny-list. Walking every string in a record and looking
 * it up would eventually hit an identifier, a date or a stage code that happens
 * to collide with a glossary key, and the failure would be a corrupted record
 * rather than an untranslated one.
 */
const TEXT_KEYS = new Set([
  "name",
  "role",
  "hospital",
  "diagnosis",
  "histology",
  "plan",
  "alerts",
  "title",
  "detail",
  "actor",
  "request",
  "answer",
  "closureNote",
  "note",
  "reason",
  "location",
  "question",
  "label",
  "recommendation",
  "rationale",
  "dissent",
  "followUp",
  "deferReason",
  "ward",
]);

/**
 * A copy of `value` with every prose field replaced by its Hebrew.
 *
 * ── Why the store hands out translated records ────────────────────────────
 *
 * The alternative is `dt(...)` at every render site — around a hundred of them,
 * across every screen, and one more every time a screen is added. The one that
 * gets forgotten shows a Hebrew card with an English diagnosis in it, and
 * nobody notices until a clinician does.
 *
 * So the translation happens once, at the seam where records leave the store.
 * What the store *holds* is unchanged: every action reads and writes the raw
 * records, so nothing about the data model, the audit trail or the export knows
 * this module exists. Only the copy that is handed to the interface is
 * translated, which is the only place it means anything.
 *
 * In English this returns the value untouched — `dt` short-circuits, and the
 * store skips the walk entirely.
 */
export function translateDeep<T>(value: T): T {
  if (getLabelLang() !== "he") return value;
  return walk(value) as T;
}

function walk(value: unknown, key?: string): unknown {
  if (typeof value === "string") {
    return key && TEXT_KEYS.has(key) ? dt(value) : value;
  }
  if (Array.isArray(value)) {
    // An array inherits its parent's key, so `alerts: string[]` translates and
    // `requiredDisciplines: Discipline[]` does not.
    return value.map((v) => walk(v, key));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = walk(v, k);
    }
    return out;
  }
  return value;
}
