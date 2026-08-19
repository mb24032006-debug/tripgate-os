# Known Architectural Limitations

Deliberately documented, not silently deferred. Nothing here blocks today's build — each is a
real future need flagged now so nobody rediscovers it the hard way later.

## 1. TripRequirement has no history — edits overwrite, they don't version

`TripRequirement` (`ops/prisma/schema.prisma`) is a single row per Trip (`tripId String @unique`),
updated in place via `updateTripRequirement`. This is fine for a trip whose requirements are set
once and refined a little before the first quote. It breaks down for the realistic case where
requirements genuinely evolve over the sales conversation:

> Day 1: 2 travelers, €2,000 budget, Marrakech.
> Day 5: 4 travelers, €3,000 budget, add the Sahara.
> Day 8: remove the Sahara, add Chefchaouen.

Today, each edit overwrites the last — there's no record of what the requirement looked like when
an earlier Quote was actually built against it. If a customer later asks "why did the first quote
assume 2 travelers," there's no answer in the data.

**Not fixing now, on purpose.** The right shape (a `TripRequirement` history — either an
append-only log of changes, or versioned rows the way `Quote.version`/`supersedesQuoteId` already
works) is a design decision worth making deliberately once there's a real pattern of how often
requirements actually change in practice, not guessed at up front. Recommendation for whoever
picks this up: mirror the `Quote` versioning pattern already in the schema rather than inventing a
new one.

## 2. Localization — partially shipped (English + French), Arabic still open

**Update: French support was added this session**, not left as a pure limitation. There's now a
locale switcher (EN/FR, a cookie-backed toggle in the top bar), the UI chrome is translated
(nav labels, page titles), and `TravelProduct`/`KnowledgeArticle` both carry nullable `*Fr` columns
(`nameFr`/`shortDescriptionFr`, `titleFr`/`bodyFr`) that fall back silently to the English text
when no translation exists yet — verified live, all 43 seeded products display correctly in
either language.

**What's still a real limitation:**
- **Arabic isn't covered at all.** Given TripGate's clientele and the Umrah/Hajj line of business,
  Arabic is arguably more urgent than French long-term — this session covered French because that
  was the explicit ask, not because it was judged more important.
- **Two flat `*Fr` columns per field won't scale to a third language.** This was a deliberate,
  pragmatic call for exactly 2 languages (`schema.prisma`'s own comment on `nameFr` says so
  explicitly) — adding Arabic on top should be the trigger to switch to a proper polymorphic
  `Translation` table (entity type + id + locale + field name + value, mirroring the pattern
  `KnowledgeArticleLink` already establishes in this codebase), not a third `nameAr` column.
- **Provider contact fields, Document labels, and the JSON `attributes` blob's own keys
  (`destinations:`, `duration:`, etc. — visible in the Products page's Attributes column) are
  still English-only.** These weren't in scope for this pass; the attribute *keys* in particular
  would need either translated labels in the UI layer or a locale-aware rendering of
  `Category.attributeSchema`, not a data change.
- **No real `KnowledgeArticle` content exists yet to translate** (per `research/05`) — the `titleFr`/
  `bodyFr` columns are ready, just unpopulated, same as the English side.

## 3. Customer doesn't model B2B accounts — Person vs. Organization split needed

This is the one that concerns me more than localization, because the catalog already contains
lines that aren't individual-traveler business: **Business Travel, Corporate Events, Seminars,
Team-Building** are all seeded `TravelProduct` rows today (`ops/prisma/seed.ts`,
`BUSINESS_TRAVEL_SERVICES`), and `Customer` is a single flat shape (`name`, `email`, `phone`) built
for one person booking their own trip.

A real corporate account needs things an individual doesn't:
- A company name distinct from the person filling out the form
- Multiple contact people against one account
- Credit terms / invoicing (vs. a person paying their own way)
- Possibly: other travel agencies reselling TripGate's own tours as a B2B reseller, which doesn't
  cleanly fit `Customer` OR `Provider` as currently shaped (they're not sourcing a product TripGate
  buys from them; they're a channel TripGate sells through)

**Not building now — writing it down now**, per direct instruction. When this becomes real:
recommend a `Person` / `Organization` split (an `Organization` row optionally linked from
`Customer`, so an individual traveler is unaffected and only B2B accounts gain the extra shape),
rather than retrofitting fields onto today's `Customer` that don't apply to most of its rows.

## 4. The client-facing quote link still lives inside the staff app shell

`ops/app/quotes/[id]/view/page.tsx` shows a customer nothing an agent sees (no cost, no margin,
no internal notes), but the URL is still `ops.tripgatemorocco.com/quotes/{id}/view` and the page
still renders inside the same root layout as the staff sidebar — a customer opening the link sees
"Dashboard / Trips / Lead Inbox / Products / Providers…" in the nav around their quote. It reads
as an internal tool with a customer view bolted on, not a customer-facing page.

**Not fixing now, on purpose** — the correct fix is a route-group split (a bare, chrome-free root
for public pages vs. a nested layout carrying the sidebar for staff pages), which means moving
every existing page folder one level deeper. That's a mechanical but wide-blast-radius move (every
route in the app) better done as its own deliberate pass than as a rushed addition to an unrelated
feature. Recommendation for whoever picks this up: do the route-group split first, empty-handed
(no feature work in the same pass), verify every existing page still resolves, then layer a
dedicated public subdomain/short-URL scheme on top if the business wants one.

## 5. No attachments — passports, visas, vouchers, tickets, signed contracts

`Document` (`ops/prisma/schema.prisma`) already has the right shape for this — `type`, `status`,
`travelerName`, `expiryDate`, and a `fileUrl` meant to hold an object-storage reference, never a
binary blob in the table. But nothing writes to it yet: there's no upload action, no storage
bucket configured, and the Documents card on a trip page is still the honest "not tracked yet"
placeholder.

**Not building now, on purpose** — file upload needs a storage target (S3/R2 or equivalent) and a
decision on who can see what (a passport scan is more sensitive than a hotel voucher), both of
which are more naturally decided alongside the Auth/production-hosting work in
`04_ARCHITECTURE_FREEZE.md` than bolted onto local SQLite dev first. Recommendation: once object
storage is chosen for backups (freeze doc's Neon PITR / R2 decision), reuse the same bucket
for Documents rather than standing up a second storage target.

## Not a limitation, but a related note

`Quote.label` (added this session) lets one Trip hold several concurrently-live quotes (Budget /
Premium / Luxury options) with a human-readable way to tell them apart — this was verified live
(one Trip, three quotes, all visible and distinguishable). That part of the "requirements evolve,
options multiply" problem is already handled; only requirement-level *history* (limitation #1
above) remains open.
