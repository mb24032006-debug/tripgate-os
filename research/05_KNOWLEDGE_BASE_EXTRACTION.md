# 05 — Knowledge Base Extraction

What business knowledge already exists, where it lives, and what should migrate into a future OS Knowledge Base.

## The sibling `Knowledge/` folder (one level above the `site/` repo)

Full path: `C:\Users\PC\Desktop\TRIPG\TRIPG\Knowledge\`. This is the human-curated precursor that most `content/*.ts` files cite as their transcription source (see `04_CONTENT_SOURCE_OF_TRUTH.md`). It is **not** part of the `site/` git repo — a separate, non-code folder tree. Top level also holds `INDEX.md` (7,761 bytes) and `README.md` (5,193 bytes).

| Subfolder | Files | Contents |
|---|---|---|
| `Brand` | 1 | `brand.md` |
| `Business` | 5 | `BUSINESS_RISKS.md`, `CONTENT_GAPS.md`, `EXECUTIVE_SUMMARY.md`, `LAUNCH_READINESS.md`, `PRODUCT_MATRIX.md` |
| `Business_Travel` | 1 | `services.md` |
| `Custom_Trips` | 1 | `custom-trips.md` |
| `Documents` | 1 | `documents.md` |
| `Images` | 10 | JSON manifests: `about_testimonial_imagery.json`, `brand.json`, `international.json`, `morocco.json`, `omra.json`, `placeholders_ui_templates.json`, `stock_generic.json`, `ui_icons_svg.json`, `unclassified.json`, `unrelated_theme_content.json` |
| `International` | 3 | `dubai.md`, `egypt.md`, `other-mentioned-destinations.md` |
| `Morocco` | 10 | one `.md` per Tour SKU — `atlas-mountain-adventure.md`, `desert-under-the-stars.md`, `golden-coast-retreat.md`, `imperial-cities-tour.md`, `imperial-echoes.md`, `moroccan-coastal-escape-essaouira-taghazout-agadir.md`, `northern-gateway.md`, `northern-morocco-gems-tangier-chefchaouen-tetouan.md`, `red-city-fever.md`, `the-atlantic-hub.md` |
| `Omra_Hajj` | 5 | `hotels.md`, `packages.md`, `partners.md`, `rates.md`, `visa.md` |
| `Products` | 14 | `airport-transfers.md`, `business-travel.md`, `CUSTOMER_JOURNEYS.md`, `flight-ticketing.md`, `hotel-booking.md`, `international-tours.md`, `morocco-tours.md`, `omra-hajj.md`, `PRODUCT_DEFINITION_REPORT.md`, `PRODUCT_RELATIONSHIPS.md`, `SERVICE_MATRIX.md`, `tailor-made-holidays.md`, `travel-insurance.md`, `visa-assistance.md` |
| `SEO` | 1 | `seo.md` |
| `Tour_Cards` | 1 | `All-Tours.md` |

**Note — `Omra_Hajj/partners.md` exists and is a strong migration candidate** (see recommendation below): a dedicated partner/supplier document sitting right next to `hotels.md`/`rates.md`/`packages.md`/`visa.md`, i.e. the human-curated Omra & Hajj knowledge set already separates "partner info" from "hotel info" from "rates" — a structure worth preserving in the OS KB's own categorization.

**`Products/` already contains business-analysis documents**, not just per-product facts: `PRODUCT_DEFINITION_REPORT.md`, `PRODUCT_RELATIONSHIPS.md`, `SERVICE_MATRIX.md`, `CUSTOMER_JOURNEYS.md` — these read as prior analytical work products, not raw source content, and are a direct precursor to the "TravelProduct" modeling work in the OS.

**Sibling folders to `Knowledge/` under the outer `TRIPG/` root** (not part of Knowledge/, referenced by other code comments): `Navigation/`, `Experience/`, `Technical_Specification/`, `UX/`, `Design_System/`, `Implementation/`, `Information_Architecture/`, `Verification/`, `Re_Verification/`, `Corrective_Action/`, `Development/`, `Research/`, `UI/`, `PROMPTS/`, `PICTURES/`. Per `docs/SESSION_HANDOFF.md` (line 13, as summarized by the research pass): this whole outer folder "holds legacy governance/process documentation from a prior, unrelated build effort... not part of this repo... except as a source of real brand/content facts... that must never be contradicted or fabricated around."

## Provenance comments inside `content/*.ts` (the trail back to `Knowledge/`)

| File | Comment | Line |
|---|---|---|
| `content/tours.ts` | "Static Tour SKU content transcribed from Knowledge/Morocco/*.md (10 files, one per Tour SKU)." | 1 |
| `content/tours.ts` | "Knowledge/Morocco/the-atlantic-hub.md: duration line missing entirely on the live site — 'do not invent a number; confirm with the client before publishing.'" | 124-125 |
| `content/form.ts` | "Static field definitions transcribed from Knowledge/Custom_Trips/custom-trips.md." | 1 |
| `content/businessTravel.ts` | "...unchanged from Knowledge/Business_Travel/services.md's documented Business Plan bullets." | 1-2 |
| `content/brand.ts` | "Static content transcribed from Knowledge/Brand/brand.md, light-edited (not rewritten)." | 1 |
| `content/internationalTours.ts` | Explicitly disclaims `Knowledge/Tour_Cards/All-Tours.md` as source for 5 entries — verified instead against the raw supplier PDF | 7-10 |
| `content/internationalTours.ts` | References `Knowledge/Products/visa-assistance.md` re: the Dubai e-visa platform being a "supporting service, not built out as its own product/page" | 342 |
| `content/testimonials.ts` | "No genuine, attributable customer testimonial exists anywhere in Knowledge/ yet, for any page" | 5-6 |

## `docs/SESSION_HANDOFF.md` — the project's own governance/handoff record

572 lines, written 2026-08-03 with same-day updates and a second full session appended 2026-08-04. The single most load-bearing passage for KB design purposes, §14.9 (lines 538-539):

> *"The 'Business Layer'... a CMS, an admin dashboard, tour/booking management, a real booking workflow, email templates, CRM integration, analytics/conversion tracking, search/filters, reviews, payments — is entirely out of scope, confirmed via a full repo scan: zero backend exists anywhere... This needs its own future discovery session once real vendor/architecture/business decisions are made... not something to plan or scaffold speculatively."*

§14.10 restates the same framing as the literal "first prompt for next session" — i.e., the site team itself flagged that whoever picks up the Business Layer next should start with discovery, not code.

**Master content-integrity rule** governing the whole document (§6, decision #5, line 165):
> *"Never fabricate testimonials, license/registration numbers, prices, contact information, or any other business fact that doesn't genuinely exist yet. Design an honest, confident absence instead."*

**A documented real incident** (§14.2, lines 471-476) worth carrying into the OS KB as a "known failure mode": a parallel work session once introduced literal unfilled template text onto the live homepage (`"Licensed travel agency N° [LICENSE_NO]"`, `"[X]+ travelers hosted"`, a placeholder WhatsApp number `wa.me/PLACEHOLDER_NUMBER`, and a hero carousel pointing at nonexistent images) — all later found and fixed by reverting to the "honest absence" pattern.

## Other `docs/` files carrying operational (not purely visual) content

- `docs/COMPONENT_CHECKLIST.md:198-199` — an explicit rule that trust-sensitive "gap" content (pricing, license, testimonials) must never leak engineering-status language ("pending," "(C2)") into visible customer copy — must be designed around instead, via a dignified empty state or omission.
- `docs/FINAL_EXTERNAL_REVIEW.md:94-103, 261-264` — records a real defect (internal citation codes like "(C2)"/"(B2)" once rendered as literal on-page copy) and ties the footer's dead utility links to the actual business context (a site that plans Omra & Hajj pilgrimages, where a missing Contact/Privacy/Terms page is a real trust problem, not cosmetic).
- `docs/ENGINEERING_REVIEW.md` and the remainder of `docs/FINAL_EXTERNAL_REVIEW.md` — otherwise exclusively accessibility/performance/visual critique; no further business-process content found.

## Recommendation: what should migrate into the OS Knowledge Base

Based purely on what already exists and is already structured as reusable operational knowledge (not raw marketing copy):

1. **`Knowledge/Omra_Hajj/partners.md`** — a dedicated partner/supplier document; direct candidate for the OS KB's "Partner playbooks" category, and the closest thing in the whole tree to what the OS's `Provider`-linked knowledge articles are meant to hold.
2. **`Knowledge/Omra_Hajj/hotels.md`, `rates.md`, `packages.md`, `visa.md`** — hotel-guide/procedure-shaped content, direct candidates for "Hotel guides" and "Visa procedures" KB categories.
3. **`Knowledge/Products/PRODUCT_DEFINITION_REPORT.md`, `PRODUCT_RELATIONSHIPS.md`, `SERVICE_MATRIX.md`, `CUSTOMER_JOURNEYS.md`** — already-written analytical documents describing the product/service model; useful as design input for the OS `Category`/`TravelProduct` taxonomy, not just KB filler.
4. **`Knowledge/Business/BUSINESS_RISKS.md`, `LAUNCH_READINESS.md`** — likely relevant to an internal "operations" KB category even though they weren't examined in depth in this pass (out of scope per the instruction to only enumerate, not deep-read, `Knowledge/`'s contents).
5. **The `docs/SESSION_HANDOFF.md` master content-integrity rule** ("never fabricate... design an honest, confident absence instead") is worth encoding as a standing OS-wide editorial policy, not just a one-off site decision — it should probably become a KB "policy" article of its own, since it will apply equally to the OS's own future customer-facing surfaces (quotes, documents) once those exist.

Nothing in the current `site/` repo or the `Knowledge/` folder constitutes cancellation-policy text specifically — that gap should be treated as genuinely missing content to source from the business, not assumed to exist somewhere unexamined.
