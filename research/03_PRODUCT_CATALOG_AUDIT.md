# 03 — Product & Catalog Audit

Every product represented on the marketing site, with exact fields and pricing state. All entries cited to source file.

## Morocco Tours — `content/tours.ts` (type `TourSku`)

10 hardcoded entries. Full field shape (lines 20-71, paraphrased with types):
`slug`, `title`, `duration: string | null`, `durationFlag: string | null` (internal-only note, never rendered to customers — see `09_BUSINESS_RULES.md`), `destinations: string[]`, `description`, `highlights: string[]`, `image: string | null`, `imageAlt`, `imageBroken: boolean`, `price: { from: number; currency: string } | null`, `featured?: boolean`, `category: "Cultural" | "Beach Escape" | "Desert Adventure" | "Mountain Adventure"`, `bestFor: string[]`.

Provenance: "Static Tour SKU content transcribed from Knowledge/Morocco/*.md (10 files, one per Tour SKU)" (`content/tours.ts:1`) — confirmed 1:1 against the sibling `Knowledge/Morocco/` folder's 10 `.md` files (see `05_KNOWLEDGE_BASE_EXTRACTION.md`).

**Pricing**: all 10 entries have `price: null`. No Morocco tour has ever had a published price — this is stated as deliberate policy, not a gap (`content/tours.ts:46-51`): *"No published price exists for any of the 10 Tour SKUs... null for every entry below, not invented."*

**Slugs (10)**: `golden-coast-retreat`, `imperial-echoes`, `northern-gateway`, `the-atlantic-hub`, `desert-under-the-stars`, `northern-morocco-gems-tangier-chefchaouen-tetouan`, `moroccan-coastal-escape-essaouira-taghazout-agadir`, `atlas-mountain-adventure`, `imperial-cities-tour`, `red-city-fever`.

**Duration withheld (not guessed) on 4 of 10 entries**: `the-atlantic-hub`, `northern-morocco-gems-tangier-chefchaouen-tetouan`, `atlas-mountain-adventure`, `imperial-cities-tour` all have `duration: null` with a non-null `durationFlag` explaining the source data was missing or (for 2 of them) contained a documented copy-paste error — the wrong duration was withheld rather than shown. See `09_BUSINESS_RULES.md` for the full citation.

**Image integrity flag**: exactly 1 of 10 entries (`red-city-fever`) has `imageBroken: true` — its original hero-image reference didn't exist under that name locally; a different, independently-confirmed image was substituted (not a guessed placeholder). No customer-facing disclosure of the substitution is rendered.

## International Programs — `content/internationalTours.ts` (type `InternationalProgram`)

10 entries covering Egypt and Dubai. Field shape (lines 28-52): `slug`, `title`, `country: "Egypt" | "Dubai"`, `duration`, `description`, `highlights`, `image?`, `priceNote: string`, `hotelOptions: string[]`, `perfectFor`, plus optional `hotelsIntro`/`hotelsLabel`.

Provenance: "transcribed from Moods Travel/Moods Tourism's own 2026 Egypt & Dubai program materials" (line 1-2) — i.e., sourced from the *supplier's own documents*, not from the sibling `Knowledge/` folder (the file explicitly disclaims `Knowledge/Tour_Cards/All-Tours.md` as its source for 5 of the entries — see `04_CONTENT_SOURCE_OF_TRUTH.md`).

**Pricing**: unlike Morocco tours, real per-person USD prices *were* sourced from the supplier's materials (line 12-14: "the real figures were verified, not invented"), but a deliberate display decision means `priceNote` never shows a dollar figure to visitors — it always renders a "contact us"-style string, matching Morocco's `null`-price pattern. The real sourced figures exist only in code comments, not in the rendered `priceNote` field.

**Named hotels referenced** (`hotelOptions` arrays across the 10 programs): Sonesta Cairo, Le Passage Cairo Hotel & Casino, Hilton Ramses, Hilton Nile Tower, Fairmont Nile City, Marriott Omar Khayyam, Xperience St. George Sharm, Dreams Vacation Resort, Dreams Beach Resort, Renaissance Golden View Beach Resort, Aracan/Grand Pyramids Hotel, Azal – Pyramids Park Hotel, Gewan Hotel Cairo, Coral Dubai Deira Hotel, Khalidia Palace Hotel Dubai, plus 5 named Nile cruise vessels (Sun Time, Tower Prestige, Grand Rose, Paradise, Montecarlo) — full list with citations in `06_PROVIDER_INVENTORY.md`.

## Unified catalog — `content/allTrips.ts` (type `UnifiedTrip`)

**Not a third content source** — a display-layer merge of the two catalogs above via `fromTourSku()`/`fromInternationalProgram()` mapper functions (lines 39-73, 90-124). Adds computed fields not present on either source type: `durationDays` (parsed via `parseDurationDays`, lower-bound of a "N day(s)" regex match, `null` if unparseable — never guessed), `badges: EditorialBadge[]` (deliberately never populated with "Trending"/"Most Popular"/"New" — no traffic/booking data exists to ground them, enforced by `tests/allTrips.test.ts`), and `priceDisplay: string` (`` `From ${currency}${from}` `` if `price` is set, else the literal string `"Tailored pricing"` — since every Morocco price is `null`, this always evaluates to `"Tailored pricing"` for Morocco entries today).

This is the type actually consumed by `/all-trips` and `/all-trips/[slug]`.

## Omra & Hajj hotel listings — `content/omraHajj.ts`

Not a "tour" catalog — a flat list of hotel names + per-night rate strings, sourced from Moods Travel's price-list PDFs. `umrahHotels` (17 entries: 9 Makkah + 8 Madinah) with `fromPricePerNight` strings in USD (currency unconfirmed — flagged as an open question in the source comment); `groupRateHotels` (2 entries, SAR-denominated, a separate flyer). Full named list in `06_PROVIDER_INVENTORY.md`. **Prices are sourced but not rendered publicly** — `components/omra-hajj/HotelCard.tsx` shows only the hotel name plus a generic "On request" label; only hotel *names* are used live, feeding the `preferredHotels` dropdown in `content/omraHajjForm.ts`.

## Business Travel services — `content/businessTravel.ts`

Not a bookable-product catalog — a services list (4 real services from `Knowledge/Business_Travel/services.md`: IATA BSP Ticketing, Seminars & Team-Building, Congresses & Trade Shows, Incentive & Reward Travel) plus a parallel, differently-worded set of 6 form service *cards* (2 of which — "Corporate Meetings," "Other" — are explicitly flagged as not sourced from the Knowledge doc, added per direct redesign request).

## Tailor-Made Holidays — no catalog at all

There is no product list for this line of business — it is pure intake-form-to-quote-request (see `02_LEAD_INTAKE_SPECIFICATION.md`). The "product" here is entirely custom per inquiry; nothing is pre-defined in `content/`.

## Placeholder/empty content — data integrity signals

| File | State | Note |
|---|---|---|
| `content/testimonials.ts` | `export const testimonials = {}` — empty | "No genuine, attributable customer testimonial exists anywhere in Knowledge/ yet" |
| `content/license.ts` | `export const license = null` | Ministry of Tourism license/SARL registration status is "still an open business decision" |
| `content/brand.ts` | `trustSignals: string[] = []` — empty | No verified license number/traveler count/years-in-business/review rating exists |

## Which content is marketing vs. which is an operational-catalog candidate

- **Marketing-only, not catalog material**: hero copy, taglines, trust pillars, "How It Works" steps, FAQ, legal pages, brand narrative (`content/brand.ts`, `content/about.ts`, `content/faq.ts`, `content/legal.ts`, `content/footer.ts`, `content/navigation.ts`).
- **Operational-catalog candidates (would map to a future `TravelProduct`/`Category`/`Provider` entity, per the earlier architecture-design pass)**: the 10 `TourSku` Morocco entries, the 10 `InternationalProgram` Egypt/Dubai entries, the 19 named Umrah/Hajj hotels + 5 named Nile cruise vessels, the 4 real Business Travel services. These are the concrete real-world "products" TripGate already sells, currently expressed only as static marketing copy with no operational fields (no cost basis, no availability, no booking state, no provider reference).
