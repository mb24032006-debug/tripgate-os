# 04 — Content Source-of-Truth Map

Which files are authoritative, which are derived, and where duplication/drift risk already exists. All 16 files in `content/` accounted for.

## Authoritative content files (each traces to one real external source)

| File | Claimed source | Citation |
|---|---|---|
| `content/tours.ts` | `Knowledge/Morocco/*.md` (10 files) | `content/tours.ts:1` — confirmed 1:1 by folder listing |
| `content/internationalTours.ts` | Moods Travel/Moods Tourism's own 2026 Egypt & Dubai program PDFs (**not** `Knowledge/Tour_Cards/All-Tours.md`, explicitly disclaimed for 5 of the entries) | `content/internationalTours.ts:1-2, 7-10` |
| `content/omraHajj.ts` | Moods Travel's "Umrah Rates Makkah/Madinah, International, Season 1448H" price list + separate group-rate flyers | `content/omraHajj.ts:1-2` |
| `content/form.ts` | `Knowledge/Custom_Trips/custom-trips.md` (11 confirmed fields; a 12th, `phone`, added on top per direct request, flagged as not sourced) | `content/form.ts:1-3, 159-171` |
| `content/businessTravel.ts` | `Knowledge/Business_Travel/services.md` (4 real services; 2 of 6 form service-cards flagged as not sourced) | `content/businessTravel.ts:1-2, 32-35` |
| `content/navigation.ts` | `Navigation/01_NAVIGATION_MAP.md` — note: this lives directly under the outer `TRIPG/` root, a **sibling** to `Knowledge/`, not inside it | `content/navigation.ts:1` |
| `content/brand.ts` | `Knowledge/Brand/brand.md` (light-edited, not rewritten) | `content/brand.ts:1`; confirmed `Knowledge/Brand/` contains exactly one file |

## Not sourced from `Knowledge/` — sourced "directly from the business owner" or a redesign brief

`content/about.ts`, `content/faq.ts`, `content/footer.ts`, `content/formField.ts`, `content/legal.ts`, `content/itineraryRequest.ts`, `content/omraHajjForm.ts` carry no "transcribed from Knowledge/..." provenance comment. `content/faq.ts` in particular is described (per the KB research pass) as sourced "from the business owner directly," not a written document.

## Derived / display-layer files — not independent sources

| File | Derives from | Nature of derivation |
|---|---|---|
| `content/allTrips.ts` | `content/tours.ts` + `content/internationalTours.ts` | Build-time merge via `fromTourSku()`/`fromInternationalProgram()` mapper functions into a unified `UnifiedTrip` shape, plus computed fields (`durationDays`, `priceDisplay`). Its own comment describes this as "a display-layer reconciliation... not a new content source." |
| `content/omraHajjForm.ts` | `content/omraHajj.ts` (`umrahHotels`, `groupRateHotels`) | Pulls real hotel names live into the `preferredHotels` select's option groups (`omraHajjForm.ts:20-26`) — not a separate hotel list. |

## Explicit source-conflict / duplication flags found in the code itself

1. **`content/internationalTours.ts:7-10`** explicitly states 5 of its entries were verified against a specific supplier PDF ("برنامج مودز النسخة الملتقي 2026.pdf") **"not against Knowledge/Tour_Cards/All-Tours.md or any other intermediate summary"** — i.e., the code author deliberately bypassed the closest-named `Knowledge/` file in favor of going to the primary supplier document, flagging that the two could disagree.
2. **`content/omraHajj.ts:10-19`**: an open, unresolved currency ambiguity on the `umrahHotels` price list — the source PDF never states whether figures are USD or SAR; the file preserves the ambiguity (`$` prefix) rather than guessing, with an explicit rule: *"Do NOT change the '$' to 'SAR' (or vice versa) without supplier confirmation."*
3. **`content/internationalTours.ts:60, 66`**: "Unresolved contradiction in the supplier's own flyer" for at least one hotel/rate detail — the supplier's own source materials are internally inconsistent in places, and the file notes this rather than silently picking one value.
4. **`content/form.ts:2-3`**: the Business Plan's claim of "14 parameters" for the Tailor-Made form is explicitly **not adopted** — "the discrepancy is reported, not resolved" (11 confirmed fields shipped instead, per direct site audit).

## Sources of truth that exist but are outside the `site/` repo entirely

- **`Knowledge/`** (sibling folder, one level up) — the human-curated precursor most `content/*.ts` files cite. Full structure and file counts documented in `05_KNOWLEDGE_BASE_EXTRACTION.md`.
- **Moods Travel's own supplier PDFs** (referenced by filename in comments, e.g. `عروض مكة والمدينة/Price List - INT - Madain Al Diyafa_09JUN26_01 (2) (1).pdf`, `برنامج مودز النسخة الملتقي 2026.pdf`) — these are the *actual* primary source for Omra & Hajj and International Tours pricing/hotel data, one level more authoritative than even `Knowledge/`, and they live outside this repo and outside `Knowledge/` too.
- **`Navigation/01_NAVIGATION_MAP.md`** — a sibling of `Knowledge/` under the outer `TRIPG/` root, source for `content/navigation.ts`.

## Recommendation flag for the future OS (evidence-based, not speculative)

Because `content/internationalTours.ts` and `content/omraHajj.ts` already source from Moods Travel's raw supplier documents rather than the intermediate `Knowledge/` summaries, any future OS-side product catalog that re-derives from `Knowledge/` alone risks reintroducing exactly the kind of intermediate-summary drift the current codebase's authors deliberately avoided by going to the primary PDFs. The primary supplier documents (not `Knowledge/`) are the closest thing to ground truth for these two product lines.
