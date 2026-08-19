# 10 — Website ↔ OS Integration Blueprint

The exact cutover mechanics for connecting the existing marketing site's lead-capture forms to a future OS, and every file that will need to change. This document describes the *cutover*, not the OS's own internal design — the site stays static and untouched otherwise.

## Current state (the thing being replaced)

`components/shared/FormStateContext.tsx:24-80` is the single choke point for all three inquiry forms. Its `submit()` function:
1. Checks the honeypot field `values.website` — if filled, fakes success without any network call (spam defense, `lines 57-63`).
2. Otherwise POSTs `{ ...values, _subject: "New {formName} inquiry — TripGate" }` to `https://formspree.io/contact@tripgatemorocco.com` (`line 29, 66-70`).
3. Sets `submitted`/`submitError` state consumed by `components/shared/SubmitControl.tsx`.

This is the **only** integration surface that exists today between the site and any external system — there is no other network call anywhere in the static export (confirmed in `01_HOSTING_AUDIT.md`).

## The cutover: what changes, what doesn't

**Recommendation (carried forward from this session's earlier system-placement research): replace the Formspree fetch target with a direct client-side POST to the OS's own public Lead-intake endpoint** (e.g. `https://ops.tripgatemorocco.com/api/leads`), rather than keeping Formspree as a permanent webhook middleman. Formspree can remain briefly as a parallel CC/fallback during transition, then be retired.

### Files that require modification during cutover

| File | Change required |
|---|---|
| `components/shared/FormStateContext.tsx` | Change `FORMSPREE_ENDPOINT` (line 29) to the OS's Lead-intake URL; adjust the POST body shape if the OS API expects a different payload than Formspree did; keep the honeypot check (lines 57-63) exactly as-is — it's a generic anti-bot pattern, not Formspree-specific. |
| `public/_headers` | Add the OS's origin to the CSP `connect-src` directive (currently `'self' https://formspree.io` — see `01_HOSTING_AUDIT.md`). This is the **only** change required to this file. |
| `content/legal.ts` | Update the privacy-policy copy that currently names Formspree as "the only third-party data processor in use" (lines 2-3, 26) — once the OS is the destination, this claim needs to reflect the new processor, or reflect both during a transition window. |

### Files that must NOT change (standing invariants)

- `next.config.ts` — `output: "export"` / `images.unoptimized: true` must remain exactly as-is. This is the architectural guarantee that keeps the marketing site a zero-maintenance static asset with no server runtime, no matter what the OS becomes.
- Every other `content/*.ts`, `app/**`, `components/**` file — none of them are involved in this integration; the cutover is scoped to exactly the 3 files above.

## Requirements on the OS side (not a site-side change, but a dependency of this cutover)

1. A public, unauthenticated-but-hardened `POST /api/leads` endpoint — public because it's called from anonymous visitor browsers, but must be rate-limited and honeypot/spam-checked (the site already sends the `website` honeypot value forward if the OS wants server-side defense-in-depth in addition to the client-side short-circuit).
2. **CORS** scoped to the marketing site's exact origin (`https://tripgatemorocco.com`), never a wildcard.
3. Server-side validation of the incoming payload — never trust client JSON as-is, since (per `09_BUSINESS_RULES.md` finding #6) several "required" fields on the site are not actually enforced client-side and may arrive empty.

## Payload shape the OS API should expect (derived from the 3 forms + honeypot)

See `02_LEAD_INTAKE_SPECIFICATION.md` for the full per-form field list. In summary, every submission carries: a honeypot field (`website`, should always be empty from a real visitor), a `formName`-equivalent source label (`_subject` today), and a flat `Record<string, string | string[]>` of the specific form's fields — there is no nested/typed payload today, just whatever the form's `FormFieldDef[]` produced.

## Risks specific to this integration (carried forward from prior system-placement research, still valid)

- **Public write endpoint as new attack surface**: the moment a public POST endpoint exists on the OS, it inherits every abuse vector Formspree used to absorb on TripGate's behalf (spam, scraping, flooding) — but now hitting infrastructure that also holds real staff auth and Lead/Quote data, a much higher-value target than a static brochure ever was.
- **CSP/CORS coordination becomes a two-repo concern**: the site's `_headers` CSP and the OS's CORS allowlist are two independent files in two independent repos that must agree; a domain change on either side silently breaks lead capture with no build-time error, only a runtime console error a visitor will never report. Recommend documenting this coupling explicitly in both repos and adding a scheduled synthetic-submission smoke test.
- **Catalog duplication drift**: `content/tours.ts`, `content/internationalTours.ts`, and `content/omraHajj.ts` are real, actively-maintained marketing catalogs. Once the OS has its own `TravelProduct`/`Provider` records for the same tours/hotels, the two will drift (a price or duration change in one won't automatically appear in the other). Recommend treating this as intentional separation (editorial vs. operational data, different update cadences) rather than something to "keep in sync" live — if a one-way sync is ever built, it should run OS → static content file at build time, never a live runtime dependency of the static site on the OS API.
- **Scope-creep risk**: the single biggest long-term risk to the "two permanently separate apps" model is someone eventually asking "can't we just add one small admin page to the marketing site, it's faster" — which would require dropping `output: "export"` on the public app. Recommend documenting "the marketing site stays statically exported, forever, with no server runtime" as a standing architectural invariant in both repos' README/CLAUDE.md, the same way `public/_headers`' own comments already document *why* each CSP decision exists.

## Explicitly out of scope for this document

No code, schema, or migration is proposed here — this is a description of what changes and why, for a future implementation session to execute against.
