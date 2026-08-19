# 02 — Lead Intake Specification

Every user-input form in the repo, its exact fields, its real (not assumed) validation behavior, its submission workflow, and a proposed Lead/TripRequirement field mapping for the future OS. All facts cited to file:line; field lists were read directly from source (not summarized secondhand).

## Shared mechanism (all forms)

- **Field type system**: `content/formField.ts` defines `FormFieldDef` (a `BaseField` — `name`, `label`, `required?`, `placeholder?`, `autoComplete?` — union'd with 9 control-type variants: `text`/`email`/`number`/`textarea`, `multi-select`, `tel`, `stepper`, `chips`, `select`, `card-select`, `tile-select`, `chip-multi`).
- **Rendering**: `components/shared/FormField.tsx` renders any `FormFieldDef` against shared `FormStateContext` state (`values: Record<string, string|string[]>`).
- **Submission**: `components/shared/RequestForm.tsx` wraps each form in a native `<form onSubmit>`; `components/shared/SubmitControl.tsx` renders the submit button (`type="submit"`, no `onClick`) and the confirmation/error state.
- **State + network call**: `components/shared/FormStateContext.tsx` holds `values`/`submitted`/`submitting`/`submitError` and POSTs to `https://formspree.io/contact@tripgatemorocco.com` (line 29) with `{ ...values, _subject: "New {formName} inquiry — TripGate" }` (line 69).
- **Spam protection (all forms, identical mechanism)**: a hidden honeypot field named `website` (`RequestForm.tsx:46-57`, visually hidden via `aria-hidden="true"`, `tabIndex={-1}`). `FormStateContext.tsx:57-63`: if `values.website` is non-empty, `submit()` sets `submitted: true` and returns **without ever calling Formspree** — a bot gets no signal it was caught.
- **Destination today**: one shared Formspree inbox (`contact@tripgatemorocco.com`) for all three forms; distinguished only by the `_subject` string. No Lead/Quote object is created anywhere — a submission becomes an email, full stop.

### ⚠ Critical validation-enforcement finding

`required: true` in a field definition **does not reliably block submission**. The browser's native constraint-validation (which is what actually gates the `submit` event — see `RequestForm.tsx:9-17`'s own comment on why `submit()` was moved from button `onClick` into form `onSubmit`) only fires for elements that carry an HTML `required` attribute. Checking `components/shared/FormField.tsx` branch-by-branch:

| Field type | Underlying control | `required` attribute wired? | Line |
|---|---|---|---|
| `text` / `email` / `number` / `textarea` | native `<input>`/`<textarea>` | **Yes** | `FormField.tsx:428, 438` |
| `tel` | native `<input type="tel">` (+ a `<select>` for country code, never required) | **Yes**, on the number input | `FormField.tsx:130` |
| `multi-select` | `<input type="checkbox">` group | **No** | `FormField.tsx:83-92` (no `required` prop set) |
| `stepper` | `+`/`–` buttons, no native form control at all | **No** (can't be — not applicable) | `FormField.tsx:150-178` |
| `chips` | `<button type="button">` pills | **No** | `FormField.tsx:199-209` |
| `select` | native `<select>` | **No** — `required` is never passed to the element | `FormField.tsx:240-262` |
| `card-select` | `<input type="checkbox">` per card | **No** | `FormField.tsx:286-296` |
| `tile-select` | `<input type="radio">` per tile | **No** | `FormField.tsx:344-350` |
| `chip-multi` | `<button type="button">` pills | **No** | `FormField.tsx:370-411` |

Only 3 of 9 field types actually enforce `required` at submission time. The other 6 render a "Required" badge (`FormField.tsx:61-68`, `RequirementTag`) that is purely a visual affordance — a visitor can submit with those fields empty. This affects several fields marked `required: true` in the data below (flagged inline). **This is a real behavior of the live form, not a hypothetical** — any future Lead-intake API must not assume a "required" field is actually always populated.

---

## Form 1 — Tailor-Made Holidays (full form)

Page: `app/tailor-made-holidays/page.tsx`. Field source: `content/form.ts`. Provenance comment (line 1): *"Static field definitions transcribed from Knowledge/Custom_Trips/custom-trips.md... Scoped to the 11 fields confirmed by direct site audit — the Business Plan's unconfirmed '14 parameters' claim (D1) is NOT adopted."*

**Section 1 — Your Trip** (`content/form.ts:27-144`):
| Field | Type | Required | Options / constraints | Native `required` enforced? |
|---|---|---|---|---|
| `tourType` ("Tour Type") | tile-select | true | Private Holiday / Family Vacation / Honeymoon / Luxury Escape / Adventure / Cultural Journey / Group Travel / Other | **No** |
| `travelerCount` ("Number of travelers") | stepper | true | min 1, max 20, default 2 | **No** (not applicable — always has a value) |
| `tripLength` ("Number of days") | chips | true | Weekend (2–3 Days) / 4–6 / 7–10 / 11–14 / 15+ / I'm Flexible | **No** |
| `startingCity` ("Starting city") | text | true | placeholder "Example: Casablanca" | **Yes** |
| `destinationsOfInterest` ("Destinations of interest") | chip-multi | true | grouped: Morocco (Marrakech, Fes, Sahara Desert, Chefchaouen, Tangier & Northern Morocco, Atlas Mountains, Coastal Cities) / International (Europe, Dubai & Middle East, Turkey, Asia, Americas, Other) | **No** |
| `accommodationCategory` ("Accommodation") | tile-select | true | 3★ Comfort / 4★ Premium / 5★ Luxury / Boutique Hotels / Riads / No Preference | **No** |
| `mainInterests` ("Main interests") | chip-multi | false | Culture, Nature, Beaches, Food, Desert, Hiking, Photography, Shopping, Adventure, Wellness, Nightlife, Family Activities, History, Luxury, Relaxation | n/a (optional) |

**Section 2 — Contact Details** (`content/form.ts:150-172`):
| Field | Type | Required | Constraints |
|---|---|---|---|
| `name` ("Full Name") | text | true | `autoComplete="name"` — **enforced** |
| `country` ("Country of Residence") | text | true | `autoComplete="country-name"` — **enforced** |
| `email` ("Email Address") | email | true | `autoComplete="email"` — **enforced** |
| `phone` ("Phone / WhatsApp (recommended)") | tel | false | default country `+212`; flagged in source as a 12th field not in the original 11-field Knowledge doc, added per direct 2026-08-07 request |

**Section 3 — Additional Details** (`content/form.ts:175-182`):
| Field | Type | Required |
|---|---|---|
| `description` ("Anything Else We Should Know?") | textarea | false |

**Confirmed field count**: 11 sourced fields + 1 added (`phone`) = 12 rendered fields, per `content/form.ts:184-191`'s own `CONFIRMED_FIELD_COUNT = 11` constant and surrounding comment.

## Form 1b — "Request This Itinerary" (short variant, same intake flow)

A second entry point into the *same* Tailor-Made Holidays flow, reached via `?trip=<slug>` from a specific tour page. Source: `content/itineraryRequest.ts`. Per its own comment (lines 1-11): reuses `travelerCountField`/`accommodationCategoryField`/`contactFields` from `content/form.ts` rather than redefining them; drops `destinationsOfInterest`/`tourType`/`tripLength` entirely since the chosen itinerary already answers them.

| Field | Type | Required |
|---|---|---|
| `travelerCount` | stepper | true (reused, same non-enforcement caveat) |
| `preferredDates` ("Preferred Travel Dates") | text | true — **enforced** (placeholder: `'Example: March 2027, or "I'm flexible"'`) |
| `accommodationCategory` | tile-select | true (reused, same non-enforcement caveat) |
| contact fields (name/country/email/phone) | (same as Form 1 Section 2) | same as above |

Per the file's own comment, `itineraryId` (the chosen tour's slug) also reaches the payload, though it is not itself a `FormFieldDef` — it's attached separately by `components/tailor-made-holidays/ItineraryRequestForm.tsx`.

## Form 2 — Business Travel ("Request a Quote")

Page: `app/business-travel/page.tsx`. Field source: `content/businessTravel.ts`. Provenance: real services list "unchanged from Knowledge/Business_Travel/services.md" (line 1-2); two of the six service *cards* ("Corporate Meetings", "Other") are explicitly flagged as not sourced from that doc, added per direct redesign request (lines 32-35).

**Section 1 — What do you need?** (`content/businessTravel.ts:90-97`):
| Field | Type | Required | Options |
|---|---|---|---|
| `services` ("Select all that apply") | card-select | true | Flight Ticketing (IATA BSP) / Seminars & Team Building / Congresses & Trade Shows / Incentive Travel / Corporate Meetings / Other (reveals a free-text `servicesOther` field when "Other" selected) | **No** (card-select never enforces required) |

**Section 2 — Tell us about your project** (`content/businessTravel.ts:100-124`):
| Field | Type | Required | Options |
|---|---|---|---|
| `travelerRange` ("Number of travelers") | chips | true | 1–5 / 6–20 / 21–50 / 50+ / Not sure yet | **No** |
| `dates` ("Preferred dates") | chips | true | Within 1 month / 1–3 months / 3–6 months / Pick a month (reveals a month `<select>`) / Flexible | **No** |
| `details` ("Request details") | textarea | false | placeholder: "Destinations, preferred airlines, hotel category, event objectives, approximate budget..." | n/a |

**Section 3 — Where should we send your proposal?** (`content/businessTravel.ts:129-149`):
| Field | Type | Required |
|---|---|---|
| `companyName` ("Company Name") | text | true — **enforced** (`autoComplete="organization"`) |
| `contactName` ("Contact Name") | text | true — **enforced** (`autoComplete="name"`) |
| `email` ("Business Email") | email | true — **enforced** |
| `phone` ("Phone / WhatsApp") | tel | false |
| `preferredContact` ("Preferred Contact Method") | chips | false | Email / WhatsApp / Phone Call |

## Form 3 — Omra & Hajj (hotel inquiry / availability request)

Page: `app/omra-hajj/page.tsx`. Field source: `content/omraHajjForm.ts`. Redesign comment (lines 4-10): *"replace every 'type it yourself' box with a tap or a pick, and always give an escape hatch... Name stays free-typing (the one field the brief calls unavoidable); every other field became a tap/pick control."*

| Field | Type | Required | Options / constraints |
|---|---|---|---|
| `name` ("Name") | text | true — **enforced** | |
| `phone` ("Phone / WhatsApp") | tel | true — **enforced** | default country `+212` — "the field that actually converts for an Umrah agency" per the file's comment |
| `email` ("Email") | email | false | |
| `travelerCount` ("Number of travelers") | stepper | true (not enforced) | min 1, max 20, default 2 |
| `preferredDates` ("Preferred travel dates") | chips | true (not enforced) | Ramadan / School holidays / Mawlid / Pick a month (reveals month select) / I'm flexible / not sure yet |
| `preferredHotels` ("Preferred hotel(s)") | select | false | escape-hatch option "Recommend for me", then real hotel names grouped by city (Makkah / Madinah — pulled live from `content/omraHajj.ts`'s `umrahHotels`/`groupRateHotels`) |
| `notes` ("Additional notes") | textarea | false | |

---

## Field → future OS entity mapping (recommendation)

**→ Lead entity** (who they are, how they reached out, what channel):
`name`, `email`, `phone`, `companyName`/`contactName` (Business Travel), form source/page (`formName` in `FormStateContext`), submission timestamp, honeypot outcome (for spam filtering audit trail).

**→ TripRequirement entity** (what they're asking for):
`tourType`, `travelerCount`/`travelerRange`, `tripLength`/`dates`, `startingCity`, `destinationsOfInterest`, `accommodationCategory`, `mainInterests`, `description`/`details`/`notes`, `services`/`servicesOther` (Business Travel), `preferredDates`, `preferredHotels` (Omra & Hajj), `itineraryId` (short-form variant — the specific tour slug that triggered the request).

**Not mappable to either — infra/meta only**: `website` (honeypot, discard or log for spam-audit only), `_subject` (Formspree-only artifact, has no OS equivalent).
