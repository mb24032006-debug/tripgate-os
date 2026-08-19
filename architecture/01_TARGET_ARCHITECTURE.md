# TripGate OS — Target Architecture (Evidence-Grounded)

## Context

This document resumes the architecture-design work from earlier in this session (the domain model and system-placement analysis derived from `tripgatetripengine.html` and the founder's mandate), now grounded in the evidence collected in `../research/01`–`11`. Nothing here contradicts that earlier design — the entities, the provider-as-metadata mechanism, and the pricing fix all stand — but several parts are now sharper because real data exists to test them against, instead of a hypothetical.

No code, schema migration, or component is written here. This is still architecture, not implementation.

## The single most useful discovery from the research pass

**TripGate's real business today already mixes internal and external sourcing — the provider-agnostic principle isn't a future scenario, it's already true, just unmodeled.** Per `research/06_PROVIDER_INVENTORY.md`:
- The 10 Morocco tours (`content/tours.ts`) are TripGate's own itineraries — no external supplier is named anywhere for them. These are **internally sourced** today.
- The 10 Egypt/Dubai programs and all 19 named Umrah/Hajj hotels are resold from one wholesaler, **Moods Travel/Moods Tourism** — TripGate's only real named external Provider. These are **externally sourced** today.
- Business Travel's flight-ticketing line is issued under TripGate's own IATA BSP accreditation (`content/businessTravel.ts:10-11`) — a service TripGate performs itself, even though the actual seat is on someone else's airline.

This means the very first `Provider` table the OS ever populates doesn't need synthetic examples — it needs exactly two rows to start: **TripGate** (`source_kind: internal`) and **Moods Travel** (`source_kind: external`). Every one of TripGate's current ~29+ named products (10 tours + 10 programs + 19 hotels — some hotels appear across both program and city groupings) already has an unambiguous provider in real life; the schema's job is just to make that fact structural instead of implicit.

## Domain model (unchanged shape, now with real seed data)

The entity model from the earlier design pass stands as designed: `Category` → `TravelProduct` → `Provider` (source_kind: internal|external, the only fork), `Trip` as the connective thread, `Lead`/`TripRequirement`/`Quote`+`QuoteLine`/`Booking`+`BookingLine`/`Document`/`Payment`/`SupportTicket`, and a polymorphic `KnowledgeArticle`+`KnowledgeArticleLink`. What follows is what real migration/seed data now looks like against that shape.

### Provider — first two real rows

| provider_id | name | source_kind | provider_type | note |
|---|---|---|---|---|
| 1 | TripGate | internal | Tour operator, Business travel agent | Self-designed Morocco tours; IATA BSP-accredited ticketing |
| 2 | Moods Travel (Moods Tourism) | external | Tour operator / DMC | Sole named wholesaler behind Egypt/Dubai programs and Umrah/Hajj hotels — `research/06` |

No other named provider exists in the source material today (no named guide, transport company, airline, or insurance provider — `research/06`). This is a genuine gap the business will need to fill as it grows, not a research omission — the OS should render "no provider assigned yet" as an honest, visible state (consistent with the site's own "honest absence" discipline, `research/09` §2) rather than force a placeholder.

### Category — seed list, grounded in what's actually sold today

`Tour` (Morocco + International), `Hotel` (Umrah/Hajj), `Flight Ticketing` (Business Travel/IATA BSP), `Corporate Event` (seminars, congresses, incentive travel), `Visa Assistance` (currently only as Moods Tourism's e-visa platform note, `research/06`). Categories with zero current real-world product to seed — `Transport`, `Guide`, `Activity`, `Restaurant`, `Insurance` — should still exist in the taxonomy (per the founder's "any future travel component" requirement) but start empty, honestly, rather than seeded with invented examples.

### TravelProduct — seed data source and required migration decisions

| Source in site repo | → TravelProduct count | Provider | Pricing state at migration |
|---|---|---|---|
| `content/tours.ts` (`TourSku`, 10 entries) | 10 | TripGate (internal) | No net cost or selling price exists yet anywhere — `price: null` for all 10 (`research/03`). Migration must not invent one; enter as `status: draft` with pricing fields empty until a specialist sets them. |
| `content/internationalTours.ts` (`InternationalProgram`, 10 entries) | 10 | Moods Travel (external) | Real supplier-sourced USD prices exist in code comments (never displayed publicly) — `research/03`, `research/04`. These are legitimate net-cost seed data, available today without waiting on the supplier. |
| `content/omraHajj.ts` (`umrahHotels` + `groupRateHotels`, 19 entries) | 19 | Moods Travel (external) | Real per-night rates exist but currency (USD vs. SAR) is explicitly unconfirmed (`research/04`, `research/06`) — migrate the rate but flag currency as unverified, do not silently pick one. |
| `content/businessTravel.ts` (4 real services) | 4 | TripGate (internal, for the ticketing/coordination service itself) | No price list exists (services are quoted per request) |

This gives the OS a populated, non-trivial `TravelProduct` table on day one — 43 real products across 2 providers — without inventing a single fact, directly satisfying the founder's "provider is metadata, not architecture" test: 10 of these rows are internal, 33 are external, and they'd sit in the exact same table with the exact same columns.

### Quote/QuoteLine pricing fix — now testable against real numbers

The earlier design's fix (per-line `net_cost`/`selling_price`/derived `margin`, replacing a single global markup slider) can be validated directly: an Umrah quote mixing a Grand Al Massa hotel line (external, real sourced net cost, currency TBD) with a TripGate Signature Morocco-tour line (internal, no net cost concept — only a selling price TripGate sets itself) is a real scenario the current mockup's global-markup model cannot represent, and the fixed per-line model handles natively.

### Knowledge Base — category taxonomy mapped to the real `Knowledge/` folder

`research/05` inventoried the sibling `Knowledge/` folder in full (14 subfolders, ~59 files). Mapping its structure onto the OS's `KnowledgeArticle.article_type` taxonomy:

| Knowledge/ subfolder | → article_type | subject_type to link against |
|---|---|---|
| `Omra_Hajj/partners.md` | Playbook | `Provider` (Moods Travel) — **first real migration candidate** |
| `Omra_Hajj/hotels.md`, `rates.md` | Guide | `TravelProduct` (per hotel) or `Category` (Hotel) |
| `Omra_Hajj/visa.md` | Procedure | `Category` (Visa Assistance) |
| `Products/PRODUCT_DEFINITION_REPORT.md`, `PRODUCT_RELATIONSHIPS.md`, `SERVICE_MATRIX.md` | (design input, not a KB article per se) | informs `Category`/`TravelProduct` taxonomy design directly |
| `Business/BUSINESS_RISKS.md`, `LAUNCH_READINESS.md` | Policy (candidate — not deep-read this pass) | `Trip` or org-wide |

No cancellation-policy content exists anywhere in the source material (`research/05`) — this is a genuine content gap to source from the business, not something to infer or fabricate.

## System placement — unchanged, now with the exact cutover file list

The founder's own 3 directives from earlier in this session stand as the final word on placement:
1. **The marketing site (`TRIPG/TRIPG/Coding/site`) is never touched** beyond the single cutover integration point.
2. **The OS lives on a subdomain** of the same domain (e.g. `ops.tripgatemorocco.com`), not a separate domain, not merged into the marketing site's repo.
3. **The complete data architecture (every entity above) is built on day one**; features are unlocked progressively through the UI, never through a later schema migration.

The exact integration mechanics — which 3 files change (`FormStateContext.tsx`, `public/_headers`, `content/legal.ts`) and which must never change (`next.config.ts`'s `output: "export"`) — are fully specified in `research/10_WEBSITE_OS_INTEGRATION_BLUEPRINT.md` and don't need restating here.

## Progressive feature-activation roadmap, now with real content to seed each stage

| Stage | Unlocked features | What real data already exists to seed it |
|---|---|---|
| Month 1 | Leads, Quote Builder | Lead-capture cutover per `research/10`; 43 real `TravelProduct` seed rows above; Provider table pre-populated with TripGate + Moods Travel |
| Month 6 | Bookings, Documents | No real booking/document data exists yet to migrate — this stage starts genuinely empty, which is fine; the schema was built in Month 1 |
| Year 2 | Payments, supplier integrations | No real payment-gateway or supplier-API integration exists today (`research/01`, `research/06`) — nothing to migrate, build fresh when needed |
| Year 3 | Availability/Inventory, customer portal | No inventory/availability system exists anywhere in the source material — genuinely new territory |

## Failure modes to avoid (unchanged from earlier design, restated because the evidence reinforces them)

1. Two parallel schemas for "our own tours" vs. "Moods Travel's tours" — the real data above proves this would be arbitrary: both are `TravelProduct` rows differing only in `provider_id`.
2. Modeling margin as "commission from Moods Travel" vs. "markup on our own tours" as different concepts — the uniform `selling_price − net_cost` model must hold across both real provider rows from day one.
3. Assuming every Booking gets an external confirmation — TripGate's own Morocco tours never will, since there's no external party to confirm with.

## What's still a genuine open question (not resolved by research, correctly left open)

- The USD/SAR currency ambiguity on Umrah hotel rates (`research/04`, `research/06`) — needs a real answer from Moods Travel before those net costs can be trusted in a live quote.
- Whether TripGate's Ministry of Tourism license is real/displayable (`research/06`) — unresolved in the source material; the OS should carry a `Provider`/org-level "license" field that is honestly null until this is answered, mirroring the site's own existing discipline.
- No cancellation-policy content exists anywhere to seed the Knowledge Base's most business-critical category — this needs to be sourced from the business directly, not inferred.
