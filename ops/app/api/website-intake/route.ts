import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { createTripRecord } from "@/app/(staff)/trips/actions";
import { createNotification } from "@/lib/notifications";

// The missing "door" the Operational Inspection's §1.1 flagged as Critical: a website enquiry
// currently has nowhere to land except an agent retyping it from email into Quick lead capture.
// This is the OS side of that fix. The website side is a small, non-blocking fetch() added to
// the marketing site's FormStateContext.tsx, fired alongside its existing (unchanged) Formspree
// call — email stays the primary, Principle-2 channel; this is purely the "OS notification" hop.
//
// requestType IS set here, from formName — but explicitly (REQUEST_TYPE_BY_FORM below), never by
// string-matching or inferring from free text. Which physical page a lead arrived from is a hard
// fact the site itself asserts, not a guess, so Principle 3 ("the agent classifies, the OS never
// guesses") isn't actually in tension with this: nothing here reads the *content* of an answer to
// decide a category, only which form sent it. "Contact" and anything unrecognized stay
// unclassified (null) rather than force a bucket that doesn't fit.
//
// destinations/travelerCount/accommodationCategory DO get parsed out of `values` now too, per-form
// (each of the four marketing forms — Tailor-Made Holidays, Business Travel, Omra & Hajj, Contact —
// uses different field names; see buildNotes()/the POST handler below for the exact mapping, each
// verified against content/*.ts and FormField.tsx's actual serialization, not guessed). Two
// Requirement fields deliberately stay unset from here: tripLengthDays and budgetBand. No form on
// the site collects a raw day-count (tripLength/travelerRange/dates/preferredDates are all bucketed
// range strings like "4–6 Days" or "6–20", not a number — forcing one into a number field would be
// a fabrication) or a budget at all. That bucketed text isn't dropped, though — it's folded into
// `notes` as readable context instead, alongside every other structured-but-unmapped field, so an
// agent gets a real briefing, not just the seven fields that happen to fit the Requirement model.
// Lead.rawPayload still holds everything verbatim underneath, as the fallback source of truth.
//
// Security note: the shared secret below is only ever checked server-side, but it will be SENT
// from client-side code (a "use client" component in a static marketing site), via a
// NEXT_PUBLIC_* env var — which means it is visible to anyone who views the page source once the
// site actually ships this. It filters out casual/accidental noise, not a determined attacker.
// Real protection would mean the website's own backend holding the secret and proxying this call
// server-side instead of the browser calling here directly — deliberately not built yet, since
// neither side is deployed publicly today. Revisit before this goes live for real.
const SOURCE_FORM_SLUGS: Record<string, string> = {
  "Tailor-Made Holidays": "tailor-made-holidays",
  "Business Travel": "business-travel",
  "Omra & Hajj": "omra-hajj",
};

const REQUEST_TYPE_BY_FORM: Record<string, string> = {
  "Tailor-Made Holidays": "tailor_made",
  "Business Travel": "business_travel",
  "Omra & Hajj": "omra_hajj",
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Once the website and this OS are on separate real domains (e.g. tripgatemorocco.com vs
// os.tripgatemorocco.com), this is a genuinely cross-origin fetch — a subdomain is a different
// origin under the same-origin policy, not a same-site exception. The custom
// x-tripgate-intake-secret header AND the JSON content type both force the browser to send a
// CORS preflight (OPTIONS) before the real POST; without these headers on both the preflight and
// the actual response, the browser blocks the request entirely and the enquiry is silently lost —
// no error visible anywhere, since the website side already swallows fetch failures on purpose.
// Set WEBSITE_ORIGIN once the real domain is known; "*" is a dev-only fallback, not a production
// choice — this endpoint has a real side effect (creating a Trip/Lead), and open CORS plus a
// same-secret-forever design is exactly the kind of thing worth tightening before this matters.
function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": process.env.WEBSITE_ORIGIN || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-tripgate-intake-secret",
  };
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

const stringField = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const arrayField = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean) : [];

// Every structured-but-unmapped field across the four forms, folded into one readable briefing —
// see this file's header comment for why these don't get their own Requirement columns. Each line
// only appears when that form actually sent that field, so a Business Travel lead's notes never
// show a blank "Tour type:" line meant for Tailor-Made Holidays.
function buildNotes(values: Record<string, unknown>): string {
  const lines: string[] = [];
  const add = (label: string, value: string) => {
    if (value) lines.push(`${label}: ${value}`);
  };

  // Tailor-Made Holidays (full form)
  add("Tour type", stringField(values.tourType));
  add("Starting city", stringField(values.startingCity));
  add("Trip length", stringField(values.tripLength));
  const mainInterests = arrayField(values.mainInterests);
  if (mainInterests.length) add("Main interests", mainInterests.join(", "));
  add("Country of residence", stringField(values.country));

  // Tailor-Made Holidays (short "Request This Itinerary" form) + Omra & Hajj share "preferredDates"
  add("Requested itinerary", stringField(values.itineraryId));
  add("Preferred dates", stringField(values.preferredDates));

  // Business Travel
  const services = arrayField(values.services);
  if (services.length) add("Services requested", services.join(", "));
  add("Other service", stringField(values.servicesOther));
  add("Traveler range", stringField(values.travelerRange));
  add("Preferred dates", stringField(values.dates));
  add("Company", stringField(values.companyName));
  add("Preferred contact method", stringField(values.preferredContact));

  // Omra & Hajj
  add("Preferred hotel", stringField(values.preferredHotels));

  // Contact
  add("Inquiry type", stringField(values.inquiryType));

  // Each form's own primary free-text field — "description" (Tailor-Made full form), "details"
  // (Business Travel), "notes" (Omra & Hajj), "message" (Contact). Only one is ever present in a
  // real submission, since each form only ever sends its own field name.
  const freeText =
    stringField(values.description) || stringField(values.details) || stringField(values.notes) || stringField(values.message);

  return [lines.join("\n"), freeText].filter(Boolean).join("\n\n");
}

export async function POST(request: Request) {
  const expectedSecret = process.env.WEBSITE_INTAKE_SECRET;
  if (!expectedSecret) {
    // Fail closed: an unconfigured secret must never be treated as "no secret required."
    return Response.json({ error: "Website intake is not configured on this server." }, { status: 503, headers: corsHeaders() });
  }
  if (request.headers.get("x-tripgate-intake-secret") !== expectedSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders() });
  }

  let body: { formName?: unknown; values?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400, headers: corsHeaders() });
  }

  const formName = typeof body.formName === "string" && body.formName.trim() ? body.formName.trim() : "Website";
  const values = (typeof body.values === "object" && body.values !== null ? body.values : {}) as Record<string, unknown>;
  const sourceForm = SOURCE_FORM_SLUGS[formName] ?? slugify(formName);
  const requestType = REQUEST_TYPE_BY_FORM[formName] ?? "";

  // "name" (Tailor-Made, Omra & Hajj, Contact) vs "contactName" (Business Travel) — the one
  // identity field name that genuinely differs between the forms.
  const customerName = stringField(values.name) || stringField(values.contactName);
  // A submission with neither must still be recorded — Lead.rawPayload is the fallback source of
  // truth precisely for cases like this — but it must not look like a routine success. Silently
  // falling back to a placeholder and returning 201 either way is exactly how this went unnoticed
  // for weeks: nothing distinguished a malformed submission from a healthy one. It's now flagged
  // loudly where staff actually look (the notification feed), not just in a log line nobody watches.
  const nameMissing = !customerName;
  const customerEmail = stringField(values.email);
  const customerPhone = stringField(values.phone);
  const resolvedName = customerName || "Website enquiry (name not provided)";

  const customer = customerEmail
    ? await prisma.customer.upsert({
        where: { email: customerEmail },
        update: { name: resolvedName, ...(customerPhone ? { phone: customerPhone } : {}) },
        create: { name: resolvedName, email: customerEmail, phone: customerPhone || null },
      })
    : await prisma.customer.create({ data: { name: resolvedName, phone: customerPhone || null } });

  const formData = new FormData();
  formData.set("channel", "website");
  formData.set("sourceForm", sourceForm);
  if (requestType) formData.set("requestType", requestType);

  const destinations = arrayField(values.destinationsOfInterest);
  if (destinations.length) formData.set("destinations", destinations.join(", "));

  const travelerCount = stringField(values.travelerCount);
  if (travelerCount && !Number.isNaN(Number(travelerCount))) formData.set("travelerCount", travelerCount);

  const accommodationCategory = stringField(values.accommodationCategory);
  if (accommodationCategory) formData.set("accommodationCategory", accommodationCategory);

  const notes = buildNotes(values);
  if (notes) formData.set("notes", notes);

  const trip = await createTripRecord(customer.id, formData, {
    source: "website_intake",
    formName,
    ...values,
  });

  if (nameMissing) {
    console.error(
      `website-intake: "${formName}" submission arrived with no name/contactName — trip ${trip.id} (${trip.reference}) created with a placeholder name. values: ${JSON.stringify(values)}`
    );
  }
  await createNotification(nameMissing ? "website_lead_incomplete" : "website_lead", trip.id, `/trips/${trip.id}`, {
    reference: trip.reference ?? trip.id,
  });

  revalidatePath("/trips");
  revalidatePath("/leads");
  revalidatePath("/", "layout");

  return Response.json({ ok: true, tripId: trip.id, reference: trip.reference }, { status: 201, headers: corsHeaders() });
}
