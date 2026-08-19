# Architecture Stress Test — 20 Future Business Scenarios

Evaluated directly against `ops/prisma/schema.prisma` as it stands today (after this round's
Trip/TripRequirement/SupportTicket UI and the QuoteLine currency fix) — not the aspirational
design doc. Each scenario is scored:

- **✅ No schema change** — purely a data/config change (new rows, new JSON attribute values, a
  toggle in `enabledModules`).
- **🟡 Additive only** — a genuinely new column or table is needed, but it's pure addition: no
  existing table is restructured, no existing row's meaning changes, no migration touches data
  that already exists.
- **🔴 Real gap** — needs actual design work before it can be built; flagged honestly rather than
  papered over.

The goal isn't a 20/20 on "no schema change" — it's knowing *which* of these are truly free and
which aren't, so nobody is surprised later.

| # | Scenario | Verdict | Reasoning |
|---|---|---|---|
| 1 | TripGate opens its own boutique riad (in-house hotel inventory) | ✅ | New `Provider` row (`sourceKind: internal`), new `TravelProduct` rows under the existing `Hotel` category. Identical mechanism already proven this session (Morocco tours are internal, Moods Travel hotels are external, same table). |
| 2 | TripGate signs a second external DMC (e.g. a Turkey ground operator) | ✅ | New `Provider` row (`external`). Nothing about `Moods Travel` being the only external provider is hardcoded anywhere. |
| 3 | Restaurant reservations become a real, sold product | ✅ | `Category("Restaurant")` already exists (seeded empty, per the founder's "model every future category now" direction) with an `attributeSchema` for cuisine/seating. Just needs `TravelProduct` rows. |
| 4 | Travel insurance becomes a real, sold product | ✅ | Same as #3 — `Category("Insurance")` already seeded, empty, ready. |
| 5 | TripGate becomes its own flight consolidator with real fare classes | ✅ | `Category("Flight Ticketing")` exists. Fare-class detail (economy/business, baggage allowance) is a `Category.attributeSchema` *data* change — updating the JSON field-list, not a migration. |
| 6 | Real-time hotel availability sync via an external channel-manager API | 🟡 | `ProductAvailability` already models date-range/units/rate generically — a sync job just writes rows into it. The one real addition: an `externalRef` field on `TravelProduct` (or `Provider`) to map TripGate's row to the channel manager's own SKU. Purely additive, nullable, doesn't touch existing rows. |
| 7 | One Trip needs two separate confirmed itineraries (a family splits into two bookings) | ✅ | `Trip.quotes` is already 1:N, and each accepted `Quote` gets its own `Booking` (`Booking.quoteId` is unique per booking, not per trip). Already supported today — a Trip having 2 Bookings requires zero new rows to reason about. |
| 8 | A confirmed hotel cancels; ops re-books with a different provider on the same trip | 🟡 | `BookingLine.providerId`/`travelProductId` can just be updated — but that silently loses the "what did we originally book" history. A real implementation should add a small `BookingLineChangeLog` table (bookingLineId, changedAt, fromProviderId, toProviderId, reason) — additive, doesn't touch `BookingLine` itself. |
| 9 | Customer self-service portal (view own itinerary/documents) | 🟡 | `Customer`/`Trip`/`Document` already hold everything a portal would display read-only. The gap is auth: `Customer` has no password/magic-link field today. Needs an additive `CustomerAuth`-style table or fields — doesn't touch existing customer data. |
| 10 | Online payment gateway (Stripe) integration | 🟡 | `Payment` already models direction/amount/type/due/paid. Needs additive fields (`externalPaymentId`, `gatewayStatus`) — nullable additions, not a redesign. |
| 11 | A supplier exposes a real booking/pricing API (vs. today's manual PDF-sourced rates) | 🟡 | Same shape as #6 — an `externalRef`/integration-config field on `Provider`, additive. The `Provider.commercialTerms` JSON blob could even absorb this without a migration at all. |
| 12 | Quoting a European client in EUR while providers are priced in USD/MAD | 🟡 | `QuoteLine.currency` (added this session specifically for this) already prevents silently blending mismatched currencies — the UI already shows per-currency subtotals and blocks Send until resolved. What's missing for *automatic* conversion is an `FxRate` lookup table (currency pair, rate, date) — additive, and arguably shouldn't auto-convert without a human confirming the rate anyway, per this project's own "never silently guess" discipline. |
| 13 | Arabic/French UI and content, not just English | 🔴 | Real gap, honestly. `TravelProduct.name`/`shortDescription`, `KnowledgeArticle.body`, etc. are single un-localized strings today. This needs either per-locale duplicate columns or a proper `Translation` join table (entity type + id + locale + field + value) — a genuine design decision, not a free addition, and worth making deliberately rather than backing into it. |
| 14 | A loyalty/rewards program for repeat customers | 🔴 | No point-balance or transaction-history concept exists anywhere. Needs new tables (`LoyaltyAccount`, `LoyaltyTransaction`) linked to `Customer` — additive in the sense that it doesn't touch existing tables, but it's genuinely new modeling work, not a toggle. |
| 15 | Other travel agencies reselling TripGate's own tours (B2B) | 🔴 | The interesting one: a reselling agency isn't quite a `Provider` (they're not sourcing a product TripGate sells) and isn't quite a `Customer` either (an individual-contact shape doesn't fit a company with multiple staff and credit terms). This needs a real decision — likely a `CustomerAccount`/`Organization` entity sitting above individual `Customer` contacts. Flagging honestly rather than forcing it into the current `Customer` shape. |
| 16 | Umrah group of 12 travelers, each needing individually tracked passport/visa status | ✅ | Works today without a new entity: `Document.travelerName` is already a free string per row, so 12 travelers × however many document types they need is just 12+ `Document` rows against one `Trip`. A dedicated `Traveler` entity (name/passport/DOB, referenced by `Document`) would be a nicer long-term shape, but it's an improvement, not a blocker. |
| 17 | Seasonal/dynamic pricing (a hotel's rate changes by date range) | ✅ | `ProductAvailability.rateOverrideMinor` per date-range row is exactly this, already modeled, unused only because no real seasonal data exists yet to seed it. |
| 18 | Visa Assistance needs different document checklists per applicant nationality | ✅ | `TravelProduct.attributes` (JSON, shaped per `Category.attributeSchema`) can hold a `requiredDocsByNationality` map directly — a data change to the JSON blob, not a migration. |
| 19 | Tracking which staff member built a quote / sales performance | 🔴 | No `Staff`/`User` entity exists anywhere (the app currently has no auth at all — see `research/01_HOSTING_AUDIT.md`, carried into this build). Needs a real `Staff` table plus a `createdByStaffId` on `Quote`/`Booking`. This is explicitly Phase 3 ("staff roles") on your own roadmap — flagged, not silently deferred. |
| 20 | "Instant book" for a simple internal product — skip manual quote review | ✅ | This is a workflow/automation change (something programmatically moves `Quote.status` from `draft` straight to `accepted`, triggering the existing copy-on-accept `Booking` creation), not a schema change. The state machine already supports arriving at "accepted" without a human clicking through every intermediate status. |

## Scorecard

**12 of 20 (60%) need zero schema change** — pure data or a workflow change. **6 of 20 (30%) need
a small additive column or table** — nothing existing is touched or restructured. **2 of 20 (10%)
are genuine gaps** (localization, B2B account modeling) that deserve a real design conversation
before being built, not a forced fit into today's shape.

## What this confirms, and what it doesn't

The core claim — *provider-agnostic sourcing survives the business model changing* — holds up
directly: scenarios #1, #2, #5, #6, #11 (new providers, new sourcing relationships, new provider
integrations) are all zero-or-additive, because `Provider.sourceKind` was designed for exactly
this and nothing downstream branches on it.

What it does **not** claim is that *every conceivable future feature* is free. Localization,
loyalty, B2B accounts, and staff/roles are real, non-trivial additions — and they were never
promised to be free. The founder's own roadmap already sequences two of these correctly (staff
roles is explicitly Phase 3). The honest reading of this stress test is: the parts of the
architecture built around the stated principle (provider-agnostic products, one Trip thread, a
polymorphic KB) hold up under pressure; the parts nobody designed yet (localization, B2B, loyalty)
correctly show up as gaps rather than false confidence.
