# 06 — Provider Inventory

Every named travel-industry provider/supplier/partner found anywhere in the `site/` repository (content, comments, docs), plus every generic "supplier/partner" reference for completeness. Full-repo grep performed across `content/**`, `components/**`, `app/**`, `docs/*.md`, root docs, and `tests/**`.

## Headline finding

**The only genuine travel-industry supplier/partner relationship named anywhere in this repository is Moods Travel (also referred to as Moods Tourism)** — the wholesaler/DMC behind all Umrah/Hajj hotel content and all Egypt/Dubai International Tours content. No other tour operator, DMC, guide, transport company, airline, visa service, or insurance provider is named anywhere in code, content, comments, or docs.

## Tour operators / DMCs

| Entity | File:Line | Quote |
|---|---|---|
| Moods Travel | `content/omraHajj.ts:1` | "Omra & Hajj content — transcribed from Moods Travel's own 'Umrah Rates Makkah/Madinah, International, Season 1448H' price list and separate group-rate flyers" |
| Moods Travel (partner relationship) | `content/omraHajj.ts:6-8` | "Arranged through the same Moods Travel partner relationship International Tours uses — not an independent TripGate accreditation claim, since no citable license/authority detail was available for one." |
| Moods Travel / Moods Tourism | `content/internationalTours.ts:1` | "International Tours content — transcribed from Moods Travel/Moods Tourism's own 2026 Egypt & Dubai program materials" |
| Moods Tourism (Dubai e-visa platform) | `content/internationalTours.ts:341-343` | "Moods Tourism also operates a Dubai e-visa issuance platform (moodstourism.com) — mentioned as a supporting service... the platform itself belongs to our partner" |
| Moods Travel | `content/navigation.ts:22` | "authorized directly by the business owner with real underlying content (Moods Travel partner data, a request-based booking flow)" |

## Named hotels — Umrah/Hajj (`content/omraHajj.ts`, sourced from Moods Travel)

**Makkah (9, `umrahHotels`)**: Grand Al Massa ($350/night), Snood Ajyad ($320), Badr Al Massa ($190), Pullman Zam Zam Makkah ($750), Alsafwa Tower ($650), Sheraton Jabal Al Kaaba ($480), Meridien Ajyad ($580), Azka Al Safa ($390), Le Meridien Kudi ($275) — lines 35-43.

**Madinah (8, `umrahHotels`)**: RUA Grand ($270), Al Fayroz Aldahbi ($270), RUA Al Dhiyafa ($270), Al Saha ($390), Millennium Al Aqeeq ($675), Rotana Al Manakha ($550), Vally Almadina ($450), Dar Aleiman Al Haram ($700) — lines 45-52.

**Group-rate flyer, separate source (2, `groupRateHotels`)**: Sari Al-Talaye Hotel (Mahbas Al-Jinn, Makkah, 50 SAR/night); Rawad Al-Mushair Hotel (Al-Rawdah district, Makkah, 45 SAR/night) — lines 64-65.

⚠ **Currency caveat** (`content/omraHajj.ts:10-19`): the `$` figures above are unconfirmed — the source PDF never states USD vs. SAR; do not treat these as confirmed USD prices. Also note (`components/omra-hajj/HotelCard.tsx`): these prices are **not rendered live** — the public site shows only hotel names plus a generic "On request" label.

## Named hotels & vessels — International Tours (`content/internationalTours.ts`, sourced from Moods Travel/Moods Tourism)

**Cairo/Egypt hotels**: Sonesta Cairo (5★), Le Passage Cairo Hotel & Casino (5★), Hilton Ramses (5★), Hilton Nile Tower (5★), Fairmont Nile City (5★), Marriott Omar Khayyam (5★), Aracan/Grand Pyramids Hotel (4★), Azal – Pyramids Park Hotel (4★), Gewan Hotel Cairo (5★) — lines 84-89, 106, 163-165.

**Sharm/Hurghada coastal hotels**: Xperience St. George Sharm (4★), Dreams Vacation Resort (4★), Dreams Beach Resort (5★), Renaissance Golden View Beach Resort (5★), Steila Makadi Garden Resort (Hurghada) — lines 131-134, 179-282 (multiple itinerary references).

**Dubai hotels**: Coral Dubai Deira Hotel (4★, $250 tpl/dbl / $375 sgl), Khalidia Palace Hotel Dubai (5★, $290/$425) — lines 328-334.

**Named Nile cruise vessels (5)**: Nile Cruise Sun Time, Tower Prestige, Grand Rose, Paradise, Montecarlo — `content/internationalTours.ts:310`.

No named hotels exist anywhere in `content/tours.ts` (Morocco) — only destination names, never a specific riad/property.

## Guides, transport companies, drivers

**None found.** Every reference is generic, unattached copy — e.g. `content/brand.ts:22`: "Trusted local partners, hotels, and guides carefully selected across every destination we offer"; `content/faq.ts:66-68`: "Guide services depend on the itinerary and the selected experience." No named guide, driver, or transport company exists anywhere in the repo. (Hits for "driver" in `docs/FINAL_EXTERNAL_REVIEW.md` all refer to Playwright test-automation scripts, unrelated to travel drivers.)

## Airlines

**None named.** Only generic references, always tied to TripGate's own IATA BSP accreditation claim (see below), never a specific carrier — e.g. `content/businessTravel.ts:11`: "Flight ticketing for all airlines, issued through our IATA BSP accreditation." No airline (Royal Air Maroc, EgyptAir, Emirates, etc.) is named anywhere in the repo.

## Visa services

**None named as an independent third party**, apart from Moods Tourism's own e-visa platform (`moodstourism.com`, noted above). Otherwise generic: `content/faq.ts:76-78`: "Visa and travel document assistance is available for selected services." `content/internationalTours.ts:344-345`: `dubaiVisaNote = "Dubai tourist visa arrangement is available through our travel partner network for this program."`

## Insurance services

**None found anywhere in the repository.** Full-repo grep for "insurance" (any casing) returned zero matches.

## Accreditations & regulatory bodies

| Entity | Category | File:Line | Note |
|---|---|---|---|
| IATA BSP | Airline ticketing accreditation | `content/businessTravel.ts:10-11, 38-40, 166-172` | TripGate's own claimed accreditation for flight ticketing — the only accreditation asserted anywhere on the site |
| Ministry of Tourism (license) | Regulatory body | `content/license.ts:4-15` | **Unresolved/unasserted** — `export const license = null`; "still an open business decision," no credential displayed |
| "Ministry of Tourism License / MT-12345" | — | `tests/LicenseBadge.test.tsx:8,10,34` | **Mock test fixture only** — not real business data, do not treat as a real license number |

## Generic "supplier"/"partner" prose (no specific entity named)

Numerous marketing-copy references across `content/brand.ts`, `content/about.ts`, `content/footer.ts`, `content/navigation.ts`, `content/legal.ts`, `content/internationalTours.ts`, `content/omraHajj.ts`, `app/omra-hajj/page.tsx` use the words "partner"/"partners"/"supplier"/"suppliers" without naming an entity — e.g. `content/about.ts:41`: "International journeys are arranged through carefully selected travel partners and trusted suppliers." `content/legal.ts:59-60` (heading "Third-party suppliers"): "Many trips involve hotels, airlines, and other travel partners who are independent third parties." These confirm the *concept* of third-party sourcing is already acknowledged in customer-facing copy, but no specific supplier beyond Moods Travel is ever named.

## Non-travel-industry vendors (flag separately — not Providers in the travel sense)

| Entity | Role | Citation |
|---|---|---|
| Formspree | Form-processing/data-processor | `content/legal.ts:2,26`; `FormStateContext.tsx:24-29` |
| Cloudflare | Hosting/infra (Pages, Web Analytics considered) | `docs/SESSION_HANDOFF.md:486`; `content/legal.ts:3-4` |
| WhatsApp | Contact channel only, not a booked provider | `content/businessTravel.ts:135,147`; `content/omraHajjForm.ts:32` |

## Design-inspiration brands (explicitly NOT partners — exclude from any Provider table)

Found only in `docs/REFERENCE_BOARD.md` and cross-referenced in a few other docs, as visual/UX inspiration with zero business relationship: Aman, Four Seasons, Airbnb, Apple, Stripe, Linear, Framer, Notion, Arc Browser, Awwwards Travel/Luxury Nominees. Explicit disclaimer at `docs/REFERENCE_BOARD.md:1-9`: *"This is not a mood board of screenshots to imitate. TripGate cannot and should not try to look like Aman or Four Seasons..."*
