"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button, Callout, Card, En, Field, Icon, Input, Label, Num, Select } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { checkOrgEmail, normaliseEmail } from "@/lib/org-email";
import { useStore } from "@/lib/store";
import { DISCIPLINE_LABEL, type Discipline } from "@/lib/types";

/**
 * Requesting access.
 *
 * Three gates, in this order, and only the last one grants anything:
 *
 *   1. the address is at a recognised Israeli healthcare organisation
 *   2. the person can receive mail at it
 *   3. the lead of their discipline admits them to this board
 *
 * The second gate is the only part of this application that is simulated, and
 * it is labelled as simulated on the screen where it happens. A prototype that
 * showed a code box and accepted anything, without saying so, would be
 * demonstrating a security control it does not have — which is worse than
 * having no control, because everyone downstream would believe it.
 */

type Step = "details" | "verify" | "done" | "review";

export default function RegisterPage() {
  const { lang, t } = useLang();
  const { requestAccess } = useStore();

  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [discipline, setDiscipline] = useState<Discipline | "">("");
  const [licence, setLicence] = useState("");
  const [agreed, setAgreed] = useState(false);

  const [issued, setIssued] = useState("");
  const [entered, setEntered] = useState("");
  const [codeError, setCodeError] = useState(false);

  const eligibility = useMemo(() => checkOrgEmail(email), [email]);
  const touched = email.trim().length > 3;

  const detailsReady =
    name.trim().length > 2 &&
    role.trim().length > 2 &&
    discipline !== "" &&
    licence.trim().length > 2 &&
    agreed &&
    (eligibility.code === "eligible" || eligibility.code === "unrecognised");

  function submitDetails() {
    if (!detailsReady) return;
    if (eligibility.code === "unrecognised") {
      setStep("review");
      return;
    }
    /* Six digits, generated here only because nothing can send mail from a
       static page. In deployment this is issued server-side and never reaches
       the browser that has to type it back. */
    setIssued(String(Math.floor(100000 + Math.random() * 900000)));
    setEntered("");
    setCodeError(false);
    setStep("verify");
  }

  function submitCode() {
    if (entered.trim() !== issued) {
      setCodeError(true);
      return;
    }
    const now = new Date().toISOString();
    requestAccess({
      id: `u-${Date.now().toString(36)}`,
      name: name.trim(),
      role: role.trim(),
      discipline: discipline as Discipline,
      email: normaliseEmail(email),
      organisation: (lang === "he" ? eligibility.org?.he : eligibility.org?.en) ?? "",
      licence: licence.trim(),
      requestedAt: now,
      verifiedAt: now,
    });
    setStep("done");
  }

  return (
    <div className="flex min-h-dvh justify-center bg-[#0a0f16] md:py-6">
      <div className="flex min-h-dvh w-full max-w-[440px] flex-col bg-[var(--color-canvas)] px-6 py-8 md:h-[calc(100dvh-3rem)] md:min-h-0 md:overflow-y-auto md:rounded-3xl md:border md:border-[var(--color-line-strong)]">
        <div className="flex items-center gap-2">
          <Link
            href={step === "details" ? "/login" : "#"}
            onClick={(e) => {
              if (step !== "details") {
                e.preventDefault();
                setStep("details");
              }
            }}
            className="-ms-2 inline-flex size-10 items-center justify-center rounded-full text-white hover:bg-white/5"
            aria-label={t("Back", "חזרה")}
          >
            <Icon name="arrow_back" size={22} />
          </Link>
          <h1 className="text-lg font-bold text-white">{t("Request access", "בקשת גישה")}</h1>
        </div>

        {step === "details" && (
          <>
            <p className="mt-4 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
              {lang === "he" ? (
                <>
                  הגישה ניתנת בידי המחלקה ואי אפשר להסדיר אותה עצמאית. אפשר לבקש גישה{" "}
                  <strong className="text-white">רק מכתובת דוא״ל ארגונית</strong> של קופת
                  חולים או בית חולים בישראל — כתובת פרטית נדחית.
                </>
              ) : (
                <>
                  Access is granted by the department and cannot be self-provisioned. A
                  request may only be made{" "}
                  <strong className="text-white">from an organizational address</strong> at
                  an Israeli health fund or hospital — a personal address is refused.
                </>
              )}
            </p>

            <form
              className="mt-6 flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                submitDetails();
              }}
            >
              <Field
                label={t("Organizational email", "דוא״ל ארגוני")}
                required
                hint={t(
                  "A verification code is sent to this address.",
                  "קוד אימות נשלח לכתובת הזאת.",
                )}
              >
                <Input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@clalit.org.il"
                  dir="ltr"
                  className="text-start"
                  required
                />
              </Field>

              {touched && eligibility.code === "eligible" && (
                <Callout tone="stable" icon="verified_user">
                  {lang === "he" ? (
                    <>
                      הדומיין מזוהה — <strong>{eligibility.org!.he}</strong> (
                      <En>{eligibility.domain}</En>).
                    </>
                  ) : (
                    <>
                      Recognised domain — <strong>{eligibility.org!.en}</strong> (
                      <En>{eligibility.domain}</En>).
                    </>
                  )}
                </Callout>
              )}

              {touched && eligibility.code === "consumer" && (
                <Callout tone="urgent" icon="block">
                  {lang === "he" ? (
                    <>
                      <En>{eligibility.domain}</En> היא תיבת דואר פרטית. מידע על מטופלים
                      אונקולוגיים אינו עובר בתיבה פרטית — נדרשת כתובת ארגונית של מקום
                      העבודה.
                    </>
                  ) : (
                    <>
                      <En>{eligibility.domain}</En> is a personal mailbox. Oncology patient
                      information does not travel through a personal mailbox — a work
                      address at the institution is required.
                    </>
                  )}
                </Callout>
              )}

              {touched && eligibility.code === "unrecognised" && (
                <Callout tone="warn" icon="help">
                  {lang === "he" ? (
                    <>
                      <En>{eligibility.domain}</En> אינו ברשימת הדומיינים המוכרים. אין
                      פירושו סירוב: הבקשה תועבר לבדיקה ידנית של ממונה אבטחת המידע, שהוא
                      בעל הרשימה ומי שיכול להוסיף אליה דומיין.
                    </>
                  ) : (
                    <>
                      <En>{eligibility.domain}</En> is not on the recognised list. That is
                      not a refusal: the request goes to the information security officer,
                      who owns the list and is the person who can add a domain to it.
                    </>
                  )}
                </Callout>
              )}

              <Field label={t("Full name", "שם מלא")} required>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("Dr. Jane Doe", "ד״ר ישראלה ישראלי")}
                  required
                />
              </Field>

              <Field label={t("Role", "תפקיד")} required>
                <Input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder={t("Consultant Pathologist", "פתולוג בכיר")}
                  required
                />
              </Field>

              <Field label={t("Discipline", "דיסציפלינה")} required>
                <Select
                  required
                  value={discipline}
                  onChange={(e) => setDiscipline(e.target.value as Discipline)}
                >
                  <option value="" disabled>
                    {t("Select a discipline", "בחירת דיסציפלינה")}
                  </option>
                  {(Object.keys(DISCIPLINE_LABEL) as Discipline[]).map((d) => (
                    <option key={d} value={d}>
                      {DISCIPLINE_LABEL[d]}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label={t("Licence number", "מספר רישיון")}
                required
                hint={t(
                  "Checked against the medical practitioners register before access is enabled.",
                  "נבדק מול פנקס המקצועות הרפואיים לפני שהגישה מופעלת.",
                )}
              >
                <Input
                  value={licence}
                  onChange={(e) => setLicence(e.target.value)}
                  placeholder="00000"
                  dir="ltr"
                  className="text-start"
                  required
                />
              </Field>

              {/* No password field, deliberately — see the note below. */}
              <Callout tone="neutral" icon="key_off">
                {lang === "he" ? (
                  <>
                    לא נקבעת כאן סיסמה. ההזדהות נעשית מול ספק הזהויות של בית החולים (
                    <En>SSO</En>), כדי שלא תיווצר כאן רשימת סיסמאות שנייה שצריך לשמור
                    עליה.
                  </>
                ) : (
                  <>
                    No password is set here. Authentication is delegated to the hospital
                    identity provider (<En>SSO</En>), so that no second list of passwords
                    exists to be protected.
                  </>
                )}
              </Callout>

              <label className="flex cursor-pointer items-start gap-2.5 py-1">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 size-4 shrink-0 accent-[var(--color-primary)]"
                />
                <span className="text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
                  {t(
                    "I confirm that I am a licensed healthcare professional and I accept the information security and patient confidentiality policy.",
                    "אני מאשר/ת שאני איש מקצוע רפואי בעל רישיון בתוקף, ומקבל/ת על עצמי את מדיניות אבטחת המידע ושמירת סודיות המטופלים.",
                  )}
                </span>
              </label>

              <Callout tone="warn" icon="gavel">
                {lang === "he" ? (
                  <>
                    המערכת כפופה לחוק הגנת הפרטיות ולתקנות אבטחת מידע שמכוחו, ולחוזרי מנכ״ל
                    של משרד הבריאות — ולא ל־<En>HIPAA</En>, שהוא חקיקה של ארצות הברית ואינו
                    חל כאן.
                  </>
                ) : (
                  <>
                    This system is governed by the Privacy Protection Law and its Data
                    Security Regulations, and by Ministry of Health director-general
                    circulars — not by HIPAA, which is United States legislation and does
                    not apply here.
                  </>
                )}
              </Callout>

              <Button type="submit" disabled={!detailsReady} className="w-full">
                {eligibility.code === "unrecognised"
                  ? t("Send for review", "העברה לבדיקה")
                  : t("Send a verification code", "שליחת קוד אימות")}
              </Button>
            </form>
          </>
        )}

        {step === "verify" && (
          <>
            <p className="mt-4 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
              {lang === "he" ? (
                <>
                  קוד בן <Num>6</Num> ספרות נשלח אל{" "}
                  <strong className="text-white">
                    <En>{normaliseEmail(email)}</En>
                  </strong>
                  . הקוד תקף ל־<Num>10</Num> דקות.
                </>
              ) : (
                <>
                  A <Num>6</Num>-digit code has been sent to{" "}
                  <strong className="text-white">
                    <En>{normaliseEmail(email)}</En>
                  </strong>
                  . It is valid for <Num>10</Num> minutes.
                </>
              )}
            </p>

            {/* The one simulated step in the application, said out loud. */}
            <Callout tone="warn" icon="science" className="mt-4">
              {lang === "he" ? (
                <>
                  <strong>בגרסת ההדגמה לא נשלח דואר.</strong> אין כאן שרת, ולכן הקוד נוצר
                  בדפדפן ומוצג למטה כדי שאפשר יהיה להדגים את התהליך. בהטמעה הקוד נשלח
                  ממערכת הדואר של בית החולים ולעולם אינו מוצג במסך.
                </>
              ) : (
                <>
                  <strong>No mail is sent in this build.</strong> There is no server here,
                  so the code is generated in the browser and shown below to make the flow
                  demonstrable. In deployment it is sent by the hospital mail system and is
                  never displayed on screen.
                </>
              )}
            </Callout>

            <Card className="mt-3 p-3.5 text-center">
              <Label>{t("Simulated code", "קוד מדומה")}</Label>
              <p className="mt-1 font-mono text-2xl font-extrabold tracking-[0.3em] text-white">
                <Num>{issued}</Num>
              </p>
            </Card>

            <form
              className="mt-5 flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                submitCode();
              }}
            >
              <Field label={t("Verification code", "קוד האימות")} required>
                <Input
                  value={entered}
                  onChange={(e) => {
                    setEntered(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setCodeError(false);
                  }}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  dir="ltr"
                  className="text-start font-mono tracking-[0.3em]"
                  required
                />
              </Field>

              {codeError && (
                <Callout tone="urgent" icon="error">
                  {t(
                    "That code does not match the one issued.",
                    "הקוד שהוזן אינו תואם את הקוד שהונפק.",
                  )}
                </Callout>
              )}

              <Button type="submit" disabled={entered.length !== 6} className="w-full">
                {t("Verify the address", "אימות הכתובת")}
              </Button>
              <Button variant="ghost" onClick={() => setStep("details")} type="button">
                {t("Use a different address", "כתובת אחרת")}
              </Button>
            </form>
          </>
        )}

        {step === "done" && (
          <>
            <div className="mt-8 flex flex-col items-center text-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-[var(--color-stable-soft)] text-[var(--color-stable)]">
                <Icon name="mark_email_read" size={30} />
              </span>
              <h2 className="mt-3 text-[17px] font-bold text-white">
                {t("Address verified", "הכתובת אומתה")}
              </h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
                {lang === "he" ? (
                  <>
                    <En>{normaliseEmail(email)}</En> אומתה. הבקשה ממתינה כעת לאישור{" "}
                    <strong className="text-white">מנהל הדיסציפלינה</strong> של{" "}
                    {DISCIPLINE_LABEL[discipline as Discipline]}.
                  </>
                ) : (
                  <>
                    <En>{normaliseEmail(email)}</En> is verified. The request is now waiting
                    on the <strong className="text-white">discipline lead</strong> for{" "}
                    {DISCIPLINE_LABEL[discipline as Discipline]}.
                  </>
                )}
              </p>
            </div>

            <Card className="mt-5 p-4">
              <Label>{t("Why there is a third step", "למה יש שלב שלישי")}</Label>
              <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
                {lang === "he" ? (
                  <>
                    כתובת ארגונית מאומתת מוכיחה דבר אחד: שאת/ה עובד/ת היום בארגון בריאות
                    בישראל. היא אינה מוכיחה חברות בצוות הזה — גם לרנטגנאי בבית חולים אחר יש
                    כתובת <En>@health.gov.il</En> תקפה. לכן מי שמכניס אדם ללוח הוא מנהל
                    הדיסציפלינה, שמכיר את האנשים בתחומו.
                  </>
                ) : (
                  <>
                    A verified organizational address proves one thing: that you work at an
                    Israeli healthcare organisation today. It does not prove membership of
                    this team — a radiographer at another hospital has a perfectly valid{" "}
                    <En>@health.gov.il</En> address. Admission is therefore the discipline
                    lead&apos;s decision, because they are the person who knows their own
                    people.
                  </>
                )}
              </p>
            </Card>

            <Link href="/login" className="mt-6">
              <Button className="w-full">{t("Back to sign in", "חזרה למסך הכניסה")}</Button>
            </Link>
          </>
        )}

        {step === "review" && (
          <>
            <div className="mt-8 flex flex-col items-center text-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-[var(--color-warn-soft)] text-[#fcd34d]">
                <Icon name="policy" size={30} />
              </span>
              <h2 className="mt-3 text-[17px] font-bold text-white">
                {t("Sent for review", "הועבר לבדיקה")}
              </h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
                {lang === "he" ? (
                  <>
                    <En>{eligibility.domain}</En> אינו ברשימת הדומיינים המוכרים, ולכן לא
                    נשלח קוד. ממונה אבטחת המידע יבדוק אם הדומיין שייך לארגון בריאות ויוסיף
                    אותו לרשימה, או ידחה את הבקשה. רשימת דומיינים חסרה צריכה לעלות למישהו
                    יום — לא את הגישה שלו.
                  </>
                ) : (
                  <>
                    <En>{eligibility.domain}</En> is not on the recognised list, so no code
                    was sent. The information security officer will confirm whether the
                    domain belongs to a healthcare organisation and add it, or refuse the
                    request. A missing entry should cost somebody a day, never their access.
                  </>
                )}
              </p>
            </div>
            <Link href="/login" className="mt-6">
              <Button className="w-full">{t("Back to sign in", "חזרה למסך הכניסה")}</Button>
            </Link>
          </>
        )}

        {step === "details" && (
          <p className="mt-6 text-center text-[13px] text-[var(--color-ink-muted)]">
            {t("Already have an account?", "כבר יש לך חשבון?")}{" "}
            <Link href="/login" className="font-semibold text-[var(--color-primary)]">
              {t("Sign in", "כניסה")}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
