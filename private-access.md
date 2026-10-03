# Keeping this build private

**MDT Loop · ENT — Meir Medical Center**
Written for: Dr Aviv Daniel, principal investigator and the only account holder.

---

## The request, and the honest answer

> *"Make sure that for now only I can see the application, and only from my
> computer's and my mobile's address, until I decide to open it, for privacy."*

That splits into two things, and they live in two different places.

| What | Where it is done | Status |
| --- | --- | --- |
| Setting a device up needs a phrase that is not in the link | In the build — `lib/access.ts` | **Done.** Shipped in this version. |
| A visit from an unknown device or address is refused outright | In the Vercel account — Deployment Protection | **Only you can do this.** One screen, about a minute. |
| The source of the application is not readable by strangers | GitHub — repository visibility | **Only you can do this.** Currently public. |

The second and third are the ones that actually make the sentence true. The
first is a lock on the door; it is worth having, and it is not a fence.

### Why the build cannot do the rest

This application is a static site. The browser asks for the files, the server
sends them, and only then does any of its code run. Anything written inside it
that looked like an address check would be:

- performed by the visitor's own browser,
- on the visitor's own say-so,
- over files the visitor already has on disk.

The result would be a screen saying "access denied" sitting on top of a copy of
the whole application that had already been handed over. That is worse than no
screen, because somebody would believe it. So it is not in there, and the
application's settings screen — **Settings → Who can open this build** — says in
both languages which of these things is in force and which is not.

---

## 1. Close it at the server (do this first)

1. Open **vercel.com** and sign in.
2. Open the project that serves `mdt-loop-ent-meir.vercel.app`.
3. **Settings → Deployment Protection.**
4. Choose one:
   - **Vercel Authentication** — every visit must be signed in to your Vercel
     account. Nobody else can open any page at all. This is the right setting
     while the build is yours alone, and it is free.
   - **Password Protection** — one password in front of the whole site, checked
     before a single file is served. This is the right setting when you want to
     show it to two or three colleagues without adding them to the account.
   - **Trusted IPs** — the restriction by address exactly as you described it.
     It is an Enterprise-plan feature; if the plan does not offer it, Vercel
     Authentication achieves the same practical result by identity instead.
5. Save. Protection applies to the production URL and to every preview
   deployment.

**Opening it to the department later** is the same screen, set back to
"Disabled" — or left on Password Protection with the password circulated. Note
that neither protects the GitHub repository; see below.

## 2. Make the repository private

The repository was made public so that I could read and change it directly.
While it is public, anybody can read the application's source, including
`lib/access.ts` and therefore the enrolment phrase's hash.

1. **github.com/avivd888-sudo/MDT-LOOP-ENT-MEIR → Settings**
2. Scroll to **Danger Zone → Change repository visibility → Make private.**

Vercel keeps deploying from a private repository without any change. The only
thing that stops working is my own direct read access, which is fine — you can
upload the built files as you have been doing.

> While you are there: `ENT-ACADEMY-MEIR` still contains
> `NCCN_HeadNeck_2026.pdf`. The NCCN guidelines are a copyrighted work and
> redistributing the PDF in a public repository is a copyright exposure
> independent of anything to do with this application. It should come out of
> that repository whether or not it is made private.

## 3. The enrolment phrase

The phrase for this build is the one I gave you in our conversation. It is not
written in the repository, in this file, or anywhere in the application.

**To change it:**

```
npm run phrase -- "several unrelated words that are not in the repository"
```

It prints two lines. Paste them over `ENROLMENT_SALT` and `ENROLMENT_HASH` in
`lib/access.ts`, rebuild, redeploy.

Devices that are already enrolled **stay** enrolled — the phrase gates
enrolment, not every open — so changing it closes the door to new devices
without locking the department out of the ones they have set up.

**What it is worth, stated so nobody builds on a wrong idea of it:**

- It stops somebody who has only the link. That is what a URL pasted into a
  departmental chat group actually is, and it is the case you asked about.
- It does **not** stop somebody who reads the source. The hash ships with the
  application. A short phrase can be ground down offline whatever the iteration
  count; 600,000 PBKDF2 iterations costs an attacker seconds per guess, not
  years. Several unrelated words is what makes that expensive.
- It protects **no data**. There is no patient data in this build, and the data
  there will be is encrypted by each device's passcode under `lib/lock.ts` —
  a different and far stronger claim.

## 4. What the device list can and cannot be

The settings panel shows the name of **this** device and when it was enrolled.
There is no list of the others, and there cannot be one without a server: each
device's record lives in that device's own browser storage and never leaves it.

If you want a real device register — one list, visible to you, from which a lost
phone can be revoked — that is a server, and it is the same server the study
will need for anything other than a single-device demonstration. It is out of
scope until the Helsinki and information-security approvals are in, and it is
noted in the dossier as the next piece of infrastructure rather than as a gap in
this build.

---

## Summary of what to do

1. Vercel → Settings → Deployment Protection → **Vercel Authentication**. *(one minute, does the real work)*
2. GitHub → make `MDT-LOOP-ENT-MEIR` private.
3. Remove `NCCN_HeadNeck_2026.pdf` from `ENT-ACADEMY-MEIR`.
4. Keep the enrolment phrase where you keep the device passcode. Change it with
   `npm run phrase` when the department is let in and again when the pilot ends.
