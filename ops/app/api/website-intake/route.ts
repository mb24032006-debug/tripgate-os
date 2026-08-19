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
// Deliberately does NOT set requestType — Principle 3 says the agent classifies, the OS never
// guesses. It also does NOT try to parse destinations/dates/etc. out of `values`: each of the
// three marketing forms (Tailor-Made Holidays, Business Travel, Omra & Hajj) uses different field
// names for those, and guessing the mapping wrong would silently mis-populate structured
// Requirements data. The full raw payload is preserved untouched instead — Lead.rawPayload's own
// schema comment already establishes it as "the fallback source of truth" for exactly this reason.
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

  const stringField = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  // "name" (Tailor-Made, Omra & Hajj) vs "contactName" (Business Travel) — the one field name
  // that genuinely differs between the three forms; every other identity field is consistent.
  const customerName = stringField(values.name) || stringField(values.contactName) || "Website enquiry (name not provided)";
  const customerEmail = stringField(values.email);
  const customerPhone = stringField(values.phone);

  const customer = customerEmail
    ? await prisma.customer.upsert({
        where: { email: customerEmail },
        update: { name: customerName, ...(customerPhone ? { phone: customerPhone } : {}) },
        create: { name: customerName, email: customerEmail, phone: customerPhone || null },
      })
    : await prisma.customer.create({ data: { name: customerName, phone: customerPhone || null } });

  const formData = new FormData();
  formData.set("channel", "website");
  formData.set("sourceForm", sourceForm);

  const trip = await createTripRecord(customer.id, formData, {
    source: "website_intake",
    formName,
    ...values,
  });

  await createNotification("website_lead", trip.id, `/trips/${trip.id}`, {
    reference: trip.reference ?? trip.id,
  });

  revalidatePath("/trips");
  revalidatePath("/leads");
  revalidatePath("/", "layout");

  return Response.json({ ok: true, tripId: trip.id, reference: trip.reference }, { status: 201, headers: corsHeaders() });
}
