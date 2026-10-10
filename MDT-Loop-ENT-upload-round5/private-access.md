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
| A visit from an unknown device or address is refused outright | In the Vercel account — Deployment Protection | **Only you can do this.** One screen, about a minute. |
| The source of the application is not readable by strangers | GitHub — repository visibility | **Only you can do this.** Currently public. |

Both of those are in your hosting and repository accounts, and both are out of
my reach. There is nothing left in the build itself, which is the change in this
version: **the enrolment phrase has been removed.** Until Deployment Protection
is on, the link is the whole of the protection — anybody who has it can open the
application. The setup screen and Settings both say so in those words.

### Why the phrase went

It was not malfunctioning, and that is the more useful fact. The phrase a build
accepts is compiled into that build. The phrase had been changed in the
repository, and the file you were holding was the one from before the change —
so the new word could not open the old application, and no amount of
capitalising the F would have changed it. The gate was working exactly as
written, and the only person it was keeping out was you.

Any secret of that shape has the same fault: it can only be rotated by
republishing, and between the rotation and the upload it is shut against
whoever holds the key. Vercel's **Password Protection** is the same idea done
properly — it is checked before a single file is served rather than after the
whole application has been handed over, and the password is changed in a text
box in seconds without rebuilding anything. If what you want is one password in
front of the site for two or three colleagues, that is the setting, and it
replaces what was removed with something strictly stronger.

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
While it is public, anybody can read the application's source. There is no
longer a secret in it to read — which is one of the reasons the phrase came out
— but the source of a clinical tool still does not belong in public once the
pilot is real.

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

## 3. What used to be section 3

This section explained how to change the enrolment phrase with
`npm run phrase`. Both the phrase and that script are gone, and so is the
`ENROLMENT_SALT`/`ENROLMENT_HASH` pair in `lib/access.ts`. What remains in that
file is the device's own name, which is a note you write to yourself and
authorises nothing.

If you want the phrase idea back, do not put it in the build. Use Vercel
Password Protection — section 1 — which is the same thing in the one place where
it can actually refuse a visit.

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

1. Vercel → Settings → Deployment Protection → **Vercel Authentication**. *(one
   minute, and it is now the only thing between the link and the application)*
2. GitHub → make `MDT-LOOP-ENT-MEIR` private.
3. Remove `NCCN_HeadNeck_2026.pdf` from `ENT-ACADEMY-MEIR`.
4. When the department is let in, swap Vercel Authentication for **Password
   Protection** and circulate that password. That is the replacement for the
   enrolment phrase, and unlike the phrase it can be changed in seconds without
   republishing the application.
