/**
 * Who is allowed to ask for an account.
 *
 * This platform carries oncology patients, and it is meant to run inside Clalit
 * Health Services. So registration is not open: an account can only be
 * requested from a **work address at an Israeli healthcare organisation**, and
 * the address has to be proved by receiving mail at it.
 *
 * ── What this control does and does not prove ─────────────────────────────
 *
 * A verified work address proves one thing: that the person can read mail at an
 * Israeli healthcare employer today. That is a real and useful fact — it rules
 * out the entire open internet — and it is *not* the same as being a member of
 * this multidisciplinary team. A radiographer at another hospital has a
 * perfectly valid `@health.gov.il` address.
 *
 * So the domain check is the first of three gates, not the whole door:
 *
 *   1. the address is at a recognised healthcare organisation  (this file)
 *   2. the person can receive mail there                       (a code)
 *   3. a discipline lead admits them to this board             (a person)
 *
 * Only the third one grants anything. The first two decide who is allowed to
 * ask. Skipping the third and treating an employer address as membership is the
 * mistake this design exists to avoid.
 *
 * ── On the list itself ────────────────────────────────────────────────────
 *
 * The domain list below is a starting point, not an authority. In deployment it
 * belongs to the hospital's information security officer, who is the only
 * person who can say which addresses an institution actually issues — and the
 * list changes when an institution changes mail provider. It is therefore kept
 * in one exported constant, is displayed in full on the security screen so it
 * can be reviewed rather than trusted, and an address that is *not* on it is
 * sent to manual review rather than refused. A missing entry should cost
 * somebody a day, never their access.
 */

export type EligibilityCode =
  /** A recognised Israeli healthcare organisation. */
  | "eligible"
  /** Not an email address at all. */
  | "malformed"
  /** A consumer mailbox. Named explicitly, because the reason matters. */
  | "consumer"
  /** Plausible, but not on the list — a person decides. */
  | "unrecognised";

export interface OrgDomain {
  /** The mail domain itself. */
  domain: string;
  /** True when subdomains also qualify, e.g. `sheba.health.gov.il`. */
  subdomains?: boolean;
  en: string;
  he: string;
  kind: "hmo" | "hospital" | "government";
}

/**
 * Recognised Israeli healthcare mail domains.
 *
 * Government hospitals are covered by one rule rather than one line each:
 * every hospital under the Ministry of Health issues addresses beneath
 * `health.gov.il`, so Sheba, Rambam, Hillel Yaffe, Ziv, Poriya, Barzilai,
 * Wolfson and Bnai Zion are all matched without naming them — and a hospital
 * that is renamed or added does not need a code change.
 */
export const ORG_DOMAINS: OrgDomain[] = [
  {
    domain: "clalit.org.il",
    subdomains: true,
    en: "Clalit Health Services",
    he: "שירותי בריאות כללית",
    kind: "hmo",
  },
  { domain: "mac.org.il", en: "Maccabi Healthcare Services", he: "מכבי שירותי בריאות", kind: "hmo" },
  { domain: "meuhedet.co.il", en: "Meuhedet", he: "מאוחדת", kind: "hmo" },
  { domain: "leumit.co.il", en: "Leumit Health Services", he: "לאומית שירותי בריאות", kind: "hmo" },
  {
    domain: "health.gov.il",
    subdomains: true,
    en: "Ministry of Health and the government hospitals",
    he: "משרד הבריאות ובתי החולים הממשלתיים",
    kind: "government",
  },
  { domain: "hadassah.org.il", subdomains: true, en: "Hadassah Medical Organization", he: "הדסה", kind: "hospital" },
  { domain: "szmc.org.il", en: "Shaare Zedek Medical Center", he: "שערי צדק", kind: "hospital" },
  { domain: "tlvmc.gov.il", en: "Tel Aviv Sourasky Medical Center", he: "איכילוב — תל אביב", kind: "hospital" },
  { domain: "assuta.co.il", subdomains: true, en: "Assuta Medical Centers", he: "אסותא", kind: "hospital" },
  { domain: "laniado.org.il", en: "Laniado Hospital", he: "לניאדו", kind: "hospital" },
];

/**
 * Consumer mailboxes, listed so the refusal can say *why*.
 *
 * "Not a recognised domain" sends someone to look for a typo. "A personal
 * mailbox cannot be used for patient data" tells them what to do instead, and
 * is the sentence an information security officer would want them to read.
 */
const CONSUMER = new Set([
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "hotmail.co.il",
  "outlook.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "ymail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
  "walla.co.il",
  "walla.com",
  "nana10.co.il",
  "zahav.net.il",
  "netvision.net.il",
  "bezeqint.net",
  "012.net.il",
  "013.net.il",
  "017.net.il",
]);

export interface Eligibility {
  code: EligibilityCode;
  /** The domain as parsed, lower-cased. Empty when the address is malformed. */
  domain: string;
  /** The matched organisation, when there is one. */
  org?: OrgDomain;
}

/*
 * Deliberately conservative. This is not RFC 5322 — it is the shape of an
 * address a hospital actually issues, and anything stranger than this should be
 * looked at by a person rather than pattern-matched by a regex nobody can read.
 */
const ADDRESS = /^[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)$/;

export function checkOrgEmail(raw: string): Eligibility {
  const m = ADDRESS.exec(raw.trim().toLowerCase());
  if (!m) return { code: "malformed", domain: "" };

  const domain = m[1];
  if (CONSUMER.has(domain)) return { code: "consumer", domain };

  const org = ORG_DOMAINS.find((d) =>
    d.subdomains ? domain === d.domain || domain.endsWith(`.${d.domain}`) : domain === d.domain,
  );

  return org ? { code: "eligible", domain, org } : { code: "unrecognised", domain };
}

/**
 * The address as it should be shown back to someone.
 *
 * Never as they typed it: a trailing space or a capital letter in the domain
 * makes two addresses look different when they are the same mailbox, and the
 * one thing this screen must be unambiguous about is which address a code was
 * sent to.
 */
export function normaliseEmail(raw: string): string {
  const at = raw.trim().lastIndexOf("@");
  if (at < 0) return raw.trim();
  return raw.trim().slice(0, at) + "@" + raw.trim().slice(at + 1).toLowerCase();
}
