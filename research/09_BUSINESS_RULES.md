# 09 — Business Rules (Evidence-Backed Only)

Every implicit business rule the repository's code, comments, or tests actually enforce — each cited to the exact line that proves it. No rule is stated here unless a specific piece of evidence supports it.

## 1. Pricing: quote on request, never a published price

**Rule**: no per-tour price is ever displayed to a Morocco-tour visitor; International Tours has real sourced prices internally but still never displays a figure.

- `content/tours.ts:46-51`: "No published price exists for any of the 10 Tour SKUs... null for every entry below, not invented." All 10 entries confirmed `price: null`.
- `content/internationalTours.ts:12-14`: "`priceNote` never shows a dollar figure, matching Morocco's tour cards... the real figures were verified, not invented" — i.e. real prices exist in sourcing comments but the display rule withholds them regardless.
- `components/shared/PricingSummary.tsx:10-21`: renders exactly one of two hardcoded sentences ("Every tour is quoted personally, tour by tour — no published price list, no hidden fees" for Morocco; "Every tailor-made itinerary is quoted transparently before you commit — no hidden fees" for Tailor-Made) — never a number.
- **Enforced by tests**: `tests/PricingSummary.test.tsx:7-20` asserts the rendered text never matches `/\$|€|MAD|\d+\s?(usd|eur)/i` and never contains engineering-status language (`pending|blocked|cannot assess|\(c2\)`). `tests/allTrips.test.ts:83-94` enforces the same invariant on the unified catalog: Morocco entries' `priceDisplay` never matches a currency pattern; International entries must reuse `priceNote` verbatim.
- Mechanically enforced in `content/allTrips.ts:102`: `priceDisplay: tour.price ? "From {currency}{from}" : "Tailored pricing"` — since every Morocco price is `null`, this always evaluates to `"Tailored pricing"` today.

## 2. Content-integrity: never fabricate a fact that doesn't exist

- **Testimonials**: `content/testimonials.ts` exports `{}` (empty). Comment: "No genuine, attributable customer testimonial exists anywhere in Knowledge/ yet, for any page... must not invent testimonial text to fill the gap."
- **License**: `content/license.ts` exports `null`. Comment: "must not display an invented or unverified license claim."
- **Trust signals**: `content/brand.ts:139` — `trustSignals: string[] = []`, deliberately empty for the same reason (no verified license/traveler-count/years-in-business/review-rating figure exists).
- **Duration**: `content/tours.ts:23` — `duration: string | null; // null = missing entirely on the source site — never invented`.
- **Master rule** (`docs/SESSION_HANDOFF.md` §6 decision #5, line 165): *"Never fabricate testimonials, license/registration numbers, prices, contact information, or any other business fact that doesn't genuinely exist yet. Design an honest, confident absence instead."*
- **No visible engineering-status leakage rule** (`docs/COMPONENT_CHECKLIST.md:198-199`): trust-sensitive gap content must never render words like "pending"/"blocked"/"cannot assess" or citation codes like "(C2)" as user-facing copy — a real defect of exactly this kind was found and fixed per `docs/FINAL_EXTERNAL_REVIEW.md:261-264`.

## 3. Language: English-only, no i18n

- `app/layout.tsx:85` — the only `<html lang="...">` value in the app is `lang="en"`, hardcoded, no locale-conditional logic.
- No `i18n` block in `next.config.ts`; no locale-routing, no language-switcher component anywhere in the repo (confirmed by grep). Conclusion is evidentiary-by-absence: nothing in the codebase ever sets a different language.

## 4. Duration conventions: structured but never guessed

- `duration` is always `string | null` (never a bare number) on both `TourSku` and `InternationalProgram`.
- **Parsing** (`content/allTrips.ts:75-79`): `parseDurationDays()` extracts only the **lower bound** of a "N day(s)" pattern via regex; returns `null` — never a guess — if unparseable. Enforced by `tests/allTrips.test.ts:16-43` (e.g. `"Multi-day cruise"` → `null`; `"2–4 days..."` → `2`, confirming lower-bound-of-range convention).
- **Bucketing** (`content/allTrips.ts:147-151`): `durationBucketOf()` maps day-count to `on-request`/`weekend`(≤3)/`short-break`(≤6)/`extended`(7+); `null` days → `"on-request"`, never a guessed bucket. Enforced by `tests/allTrips.test.ts:45-70`.
- **Withheld, not guessed, on data-quality issues**: `content/tours.ts:1-6` — 4 of 10 Morocco SKUs have `duration: null` with an explanatory `durationFlag` rather than a fabricated value; 2 of those 4 stem from a documented copy-paste error in the source data (flag D4) where the wrong duration/description was deliberately withheld rather than shown, "not fabricated with a guessed correction." `durationFlag` is explicitly internal-only (`content/tours.ts:24-30` — "stays here as a content-team note... not customer-facing copy") after a prior finding that it once rendered verbatim to visitors.

## 5. Booking/consent assumptions

- **Morocco tour-card CTA is a pure front-end state toggle, no real submission**: `components/shared/CtaButton.tsx:151-153` — *"no confirmed consumer exists beyond this point — no backend, API, or CRM call is made or implied."* Clicking it only flips local React state (`setSubmitted(true)`); no network call exists in this component.
- **⚠ This comment is now partially stale relative to the rest of the same repo** — the three full inquiry forms (Tailor-Made Holidays, Business Travel, Omra & Hajj) *do* make a real network call: `components/shared/FormStateContext.tsx:24-80` POSTs to Formspree (`https://formspree.io/contact@tripgatemorocco.com`), added 2026-08-13 per its own dated comment, and `content/legal.ts:26` confirms to visitors: *"Form submissions are delivered to us via Formspree, a third-party form-processing service."* The precise, non-contradictory statement of the rule is: **the Morocco tour-selection CTA remains a no-op state toggle; the three intake forms are the only real submission paths, and they deliver via Formspree, not a booking/CRM system.** There is still no database, booking engine, or payment processor anywhere.
- **Honeypot anti-spam** (`FormStateContext.tsx:57-63`): a hidden `website` field (`RequestForm.tsx:46-57`) — if non-empty, `submit()` fakes success (`setSubmitted(true)`) without ever reaching Formspree, so a bot gets no signal it was caught.
- **Data-collection-scope rule** (`content/legal.ts:18,22`): *"We don't collect anything beyond what you type into those forms... We don't sell your information, and we don't use it for advertising."*

## 6. ⚠ New finding: "Required" is not always enforced (this research pass)

Direct inspection of `components/shared/FormField.tsx` shows `required: true` in a `FormFieldDef` only produces real, submission-blocking native-HTML validation for 3 of 9 field-control types (`text`/`email`/`number`/`textarea`, and the number-input half of `tel`) — see `02_LEAD_INTAKE_SPECIFICATION.md` for the full per-type table. The other 6 control types (`multi-select`, `stepper`, `chips`, `select`, `card-select`, `tile-select`, `chip-multi`) render a "Required" badge (`FormField.tsx:61-68`) but never attach a native `required` attribute, so a visitor can submit with those fields empty despite the data explicitly marking several of them `required: true` (e.g. `tourTypeField`, `travelerCountField`, `tripLengthField`, `destinationsOfInterestField`, `accommodationCategoryField`, `businessTravelServiceField`, `travelerRange`, `dates`). This is a real, observable behavior of the current site, not a hypothetical — any future Lead-intake API consuming this data must not assume "required" fields are always populated.

## 7. Other explicit "we do NOT do X" statements

- `content/omraHajj.ts:10-19`: refuses to resolve an unconfirmed USD/SAR currency ambiguity by guessing — *"Do NOT change the '$' to 'SAR' (or vice versa) without supplier confirmation — that would just swap one unverified guess for another."*
- `content/tours.ts:63-68`: refuses unsupported marketing badges — *"Deliberately excludes the brief's own 'Best Seller' badge suggestion (no sales data exists to support it)..."*
- `content/allTrips.ts:26-29`: same discipline for the unified catalog's badge vocabulary — *"'Trending'/'Most Popular'/'New' are part of the vocabulary... but are not assigned to any entry this pass — no booking/traffic/launch-date data exists."* Enforced by `tests/allTrips.test.ts:115-122`.
- `content/form.ts:2-3`: refuses to reconcile a Business Plan claim with reality — the "14 parameters" claim is "NOT adopted; no additional field is invented to reconcile it" (ships 11-12 fields instead).
- `content/formField.ts:61`: refuses to invent filler descriptive copy for tile-select options just to reuse the card-select component.
- `docs/SESSION_HANDOFF.md` §9 item 6: explicitly rejected building stub Contact/FAQ/Privacy/Terms pages with no real content — *"a 'Privacy Policy' page with no real policy text is worse than admitting one doesn't exist yet."* (Note: FAQ and legal pages were later built for real, dated 2026-08-13/16 — this rejection applied to *placeholder* stub pages, not to eventually shipping real ones.)
- `docs/SESSION_HANDOFF.md` §14.9: the entire "Business Layer" (CMS/booking/payments/CRM/analytics) is out of scope for this codebase, "needs its own future discovery session... not something to plan or scaffold speculatively."
- `content/navigation.ts:8-10`: refuses invented photography — a destination is only shown with a photo "where a real photo genuinely exists in public/images/... no stock substitute, no invented photo for a destination that doesn't have one."
