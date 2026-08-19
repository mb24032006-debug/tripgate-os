# Usability Backlog — Founder's Second-Pass Inspection

Source: a ~90-minute hands-on inspection (Travel Agent / Ops Manager / New Employee / Customer /
Founder personas), each finding reproduced at least twice, with exact URLs and steps. This document
indexes it so the findings survive past conversation scrollback — see the original inspection for
full prose, screenshots-in-conversation, and reproduce steps per item.

**Note:** the source report was long enough to be truncated before its own top-10 list (items 8–10)
and anything after it were captured here. If a follow-up pass references items beyond what's listed
below, re-pull them from the original inspection rather than assuming this doc is complete.

## Fixed this round (verified live, via Playwright, against the report's own scenarios)

| ID | Finding | Fix |
|---|---|---|
| U1 | Same quote showed a different total on every screen (Quote Builder, Quotes list, Trip's quote table, Dashboard) — off by 4×–12× wherever quantity > 1 or FX was involved | Added `computeQuoteTotal()` (`lib/money.ts`) as the one function every screen now calls; verified all three list/table screens show the identical figure for the same quote |
| W1 | A customer could accept two mutually-exclusive options, creating two bookings for one trip | `acceptQuote` now atomically marks every sibling `draft`/`sent` quote on the trip `expired` in the same transaction as creating the booking; an expired quote's client link no longer offers Accept/Decline |
| W2 | No way to undo an acceptance or cancel a booking | Added `cancelBooking` (reason captured, booking → `cancelled`, quote → `rejected`), exposed as "Cancel booking" on an accepted quote |
| W3 | `Bookings` nav item 404s despite real bookings existing | Built `/bookings` — one table, every booking regardless of internal/external mix, value via the shared total function, source shown as a badge (not a forked screen) |
| W4 | A negative-total quote could be sent and accepted | `updateQuoteLine` now rejects negative cost/price; `sendQuote` now rejects a total ≤ 0 |

## Not fixed — tracked for a future pass

### Critical / High — workflow
- **W5** `+ Nouveau devis` silently no-ops on a confirmed trip (needs investigation — may be a real bug or an unstated business rule that should be surfaced instead of silent)
- **W6** Two adjacent save buttons (trip header vs. requirements) — editing one field then clicking the other form's save silently discards the first
- **W7** A rejected quote leaves the trip stage at "quoted" and drops out of every triage filter — needs a "no next action" filter and/or a stage transition on rejection
- **W8** Superseded quote versions render identically to the live one in lists (no visual de-emphasis, still duplicable, still counted in KPIs)
- **W9** Lead status never advances past "new" even once a trip is quoted/booked
- **W10** Departure date isn't on the intake form, only addable after trip creation
- **W12** Internal decline (agent clicks Refuser) is indistinguishable from a real client decline — corrupts win/loss reporting and shows the client a message about a decision they didn't make

### Critical — the customer-facing document itself
- **U3** The client quote view has no agency identity, no travel dates, no itinerary, no inclusions/exclusions, no T&Cs, no deposit terms, and shows one option per link with no side-by-side comparison — this is the single highest-value remaining item, since it's the document a customer actually judges the agency by
- **U4** Accept is a single click with no confirmation, no name/signature capture, no reference number, no emailed confirmation

### High — UX
- **U2** Pipeline value double-counts alternative options on the same trip (no "at most one live quote per trip" dedup); no won-revenue/margin metric exists anywhere
- **U5** Client-facing language follows the agent's own UI toggle, not a per-customer setting; no Arabic despite the Umrah/Hajj catalogue
- **U6** Switching EN/FR drops the current URL's query string — loses search results and active trip filters
- **U7** Search doesn't index trip destinations or product city; product search results aren't clickable
- **U8** Knowledge Base has no editor — the empty-state copy asks the user to add articles with no way to do so
- ~~**U9** Products/Providers are fully read-only — no create/edit/import~~ **FIXED** — Product and Provider create/edit forms shipped (see Doctrine Compliance Audit round below); import is still open
- **U10** Untranslated English leaks into the French UI on external-hotel currency notes; the Providers "data change, never a schema change" sentence is developer-facing copy shown to staff (note: the sentence was reworded during the CRUD build, but the seeded English-only currency note on the 19 hotels was not revisited)
- **U17** Product picker in the Quote Builder still has no search/filter (43 items in a small scroll box)

### Medium/Low — UX and data consistency
W11 (no traveller/quantity reconciliation), W13 (quotes sendable with no validity date), W14 (lost-reason editable on active trips), U11 (contradictory "not converted / converted" wording on a resolved FX line), U12 (FX rates hand-typed per line, no rate table/date/source), U13 (accommodation tier: dropdown at intake, free text on trip), U14 (resolution note captured on Trip page, not on Support list, for the same action), U15 (no human-readable references — raw cuids everywhere), U18–U25 (pagination/sorting, ticket list filtering, stale header badge, poetic product names with no concrete details, long unsectioned trip page, search requiring Enter).

### Missing operational features (M1–M17 in the source report)
Highest-leverage, not yet started: **M2** payments (deposits/balances/due dates), **M3** attachments (already tracked as limitation #5), **M4/M5** rates on internal products + resolving unconfirmed supplier currency (needs real data, won't fabricate), **M6** bookings-list operational depth (supplier confirmation status, "departs this week"), **M7** reporting (revenue/margin/conversion), **M17** supplier commercial record (contact, commission, terms).
M1 (auth) is tracked in `04_ARCHITECTURE_FREEZE.md`, not here.

## Doctrine Compliance Audit round (source-agnostic invariant check)

A separate audit re-checked whether the core doctrine — Product belongs to exactly one Provider,
internal/external is metadata not a workflow fork, the pipeline shape never changes — actually
holds, rather than whether the app is merely usable. Verdict: the invariant holds structurally
(one product table, one provider table with TripGate as a row in it, one picker, one pipeline).
It found one doctrine-blocking gap and two doctrine leaks.

### Fixed this round
- **Doctrine-blocking: Products and Providers were fully read-only.** The audit's own framing:
  "the architecture is correct and the operation it exists to enable cannot be performed" — you
  cannot onboard a direct provider ("tomorrow") or re-point a product in-house ("future") without
  create/edit forms. Built `app/(staff)/products/actions.ts` + `[id]/page.tsx` and
  `app/(staff)/providers/actions.ts` + `[id]/page.tsx`. Re-pointing a product's provider is just the
  `providerId` select on the product edit form — no separate internal/external creation path.
  Verified live, including the exact doctrine scenario: create an external "direct provider," add a
  product against it, then re-point that product to TripGate and confirm it shows internal
  everywhere (Products list, the Quote Builder's picker) with no special-casing.
- **A second instance of the defaultValue-remount bug**, found while verifying the repoint: after
  saving, the provider `<select>` still visually showed the *pre-save* selection (though the DB
  write was correct — confirmed via a hard reload) because the form wasn't keyed on anything that
  changes across an in-place Server Action save. Same fix as the Quote Builder's line-quantity bug
  from the prior round: `key={record.updatedAt.toISOString()}` on both edit forms, forcing a
  remount so `defaultValue` is freshly applied. Worth checking for on any future form that can be
  resubmitted without a full page reload in between.

### Not fixed — the structural inversion and the two remaining leaks
- **The internal catalogue is still empty of rates.** Product CRUD makes it *possible* for staff to
  type in real net cost/sell price for the 14 TripGate products — the tool now exists — but no rates
  were entered (that's real business data, not something to fabricate). This is the audit's
  "structural inversion": the doctrine's migration path runs from populated supplier records toward
  empty owned ones, and CRUD only resolves the "no way to" half of that, not the "hasn't been done
  yet" half.
- **Currency is still coupled to source in practice**, even though `TravelProduct.baseCurrency` is
  already product-level metadata, not source-level. The audit's fix: an agency-level FX rate table
  (currency pair + rate + effective date) that defaults onto a quote line automatically, replacing
  today's per-line manual rate entry — not built this round.
- **No human-readable reference numbers** (Trip/Quote/Booking still show raw cuids) — additive, cheap,
  not built this round.
- **Per-line fulfilment state on Booking** (`BookingLine.providerConfirmationStatus` already exists
  in the schema, unused) and **margin-by-provider reporting** — both real, both deferred; the latter
  needs the FX table above to be trustworthy across mixed-currency provider portfolios.

## "Evolve the front-end to the max" round

Given the choice between pushing the front-end further or starting the architecture freeze's
infrastructure, the front-end was chosen. Scope: the customer document (U3/U4, previously flagged
as the single highest-priority item), pipeline dedup + confirmed revenue (U2), the two-save-button
data-loss trap (W6), and three smaller fixes.

### Fixed
- **U3/U4 — the customer-facing quote document.** Sibling "sent" quotes on the same trip now render
  side by side on one page (`compareOptionsHeading`) instead of one option per link with no way to
  compare — accepting one still auto-expires the rest, so the comparison never shows a choice
  that's no longer real. Added: per-line selling price (never cost/margin), staff-authored terms
  text (`Quote.termsText`, optional, never fabricated boilerplate), the trip's reference number,
  and an explicit accept requiring a typed name + a required consent checkbox
  (`Quote.acceptedByName`/`acceptedAt`), replacing the old single, anonymous click.
- **U2 — pipeline double-counting.** Dashboard now takes the single best live quote per trip before
  summing (a trip with Budget + Premium both sent no longer counts twice). Added Confirmed
  revenue/Confirmed margin tiles, computed from accepted quotes — the number the doctrine audit
  found missing entirely (could show what might be earned, never what was).
- **W6 — the two-save-button trap.** Trip status/owner and Requirements were two adjacent forms;
  editing one then clicking the other's save silently discarded the first. Merged into one form,
  one action (`updateTrip`), one submit button.
- **W9 — Lead Inbox stuck at "new" forever.** Creating a quote now bumps the trip's Lead to
  "qualified" if it was still "new."
- **W7 (partial) — a rejected quote with nothing to replace it was invisible in triage.** Added a
  "No next action" filter (`needsFollowUp`): no live quote, no booking, no open ticket. Stage
  itself still reads "quoted" (not renamed, to avoid a second overlapping taxonomy) but the trip no
  longer disappears from every filter.
- **W12 — internal decline attributed to the client.** `Quote.declinedBy` ("agent"|"client") now
  distinguishes an agent withdrawing a quote from a customer actually saying no; the client view
  only ever shows the client-authored message.
- **Reference numbers** (item 7 from the doctrine audit's additive-fields table) — `Trip.reference`,
  `TG-2026-0001` style, assigned at creation, shown on the trip page, Quote Builder, client view,
  and the trips list.
- **A staleness bug found while verifying the comparison view**: after accept/decline, an in-place
  Server Action revalidation was confirmed correct on a hard reload but not reliably before one.
  Fixed by having `acceptQuote`/`declineQuote` redirect back to the same URL on completion — same
  pattern already used by `createQuote`/`reviseQuote`/`duplicateQuote` — forcing a guaranteed-fresh
  render instead of trusting in-place revalidation for the two actions where staleness would
  actually matter to a customer.

### Not done — explicitly deferred
- **The FX-rate-as-product-metadata leak (doctrine audit, Leak 2).** Still per-line manual entry;
  no agency-level rate table with effective dates.
- **Per-line booking fulfilment state.** `BookingLine.providerConfirmationStatus` still exists
  unused in the schema; no booking detail page to expose it.
- **Margin-by-provider reporting.** Deferred previously pending the FX table; still deferred.
- **Search improvements, Knowledge Base editor, product-picker search-in-43-items** — untouched.
- **A real chrome-free public URL for the client view** — still sits inside the same route tree as
  the staff app (though outside the `(staff)` layout group, so no sidebar); a distinct
  subdomain/short-URL scheme is still the documented follow-up in limitation #4.

## Recommended order for the next pass

1. U3/U4 — the customer-facing document and acceptance flow. This is where the agency's credibility and the multi-quote model's whole value proposition currently fall down.
2. W7/W9/W12 — lead/quote status accuracy, since these corrupt reporting silently.
3. U2 — pipeline dedup + a real won-revenue metric, now that per-quote totals are trustworthy (U1).
4. W6 — the two-save-button data-loss trap, since it silently destroys real input.
5. Everything else, roughly in the order listed above.
