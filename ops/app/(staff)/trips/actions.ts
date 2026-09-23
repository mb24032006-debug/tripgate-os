"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createNotification } from "@/lib/notifications";
import { requireRole } from "@/lib/session";

// Shared by all three entry points: a brand-new customer (createTrip), an already-known one
// (createTripForExistingCustomer, from the customer profile page), and a website submission
// (app/api/website-intake/route.ts). Pulled out so "how a Trip gets built" can't drift between
// them — the customer-history gap the Operational Inspection found would only get worse if
// returning-customer or website-sourced trips were assembled by a second, slightly different code
// path. Still FormData-shaped rather than a plain object so the two existing (already-verified)
// callers below needed zero changes — the API route builds a synthetic FormData instead.
export async function createTripRecord(
  customerId: string,
  formData: FormData,
  rawPayload: Record<string, unknown>,
  ownerId: string | null = null
) {
  const channel = String(formData.get("channel") ?? "phone").trim() || "phone";
  const requestType = String(formData.get("requestType") ?? "").trim() || null;
  // Only ever set by the website-intake route today — "which marketing form this came from,"
  // never guessed for a manually-captured trip (Operational Inspection §4.4 / schema.prisma's own
  // Lead.sourceForm comment: this was always meant to be populated, just had no producer yet).
  const sourceForm = String(formData.get("sourceForm") ?? "").trim() || null;

  const destinationsRaw = String(formData.get("destinations") ?? "").trim();
  const travelerCountRaw = String(formData.get("travelerCount") ?? "").trim();
  const tripLengthDaysRaw = String(formData.get("tripLengthDays") ?? "").trim();
  const accommodationCategory = String(formData.get("accommodationCategory") ?? "").trim() || null;
  const budgetBand = String(formData.get("budgetBand") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  // A human-readable reference — "TG-2026-0001" — for the one thing a raw cuid can never be: read
  // aloud on a phone call, written on a supplier voucher. Counting this year's trips is fine at
  // this scale; a real sequence/counter table would be the correct fix once concurrent writes are
  // actually a risk (see architecture/05_USABILITY_BACKLOG.md).
  const year = new Date().getFullYear();
  const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
  const countThisYear = await prisma.trip.count({ where: { createdAt: { gte: yearStart } } });
  const reference = `TG-${year}-${String(countThisYear + 1).padStart(4, "0")}`;

  const trip = await prisma.trip.create({ data: { customerId, reference, ownerId } });

  // Every trip has an originating Lead — this was already true for website submissions
  // (once wired up) but silently false for manual/quick-capture entry, which is why the Lead
  // Inbox and dashboard's Leads count read zero regardless of real work done. For manually-captured
  // trips, `requestType` is still set by the agent, never inferred — Principle 3 of the business
  // doctrine. Website submissions are the one sanctioned exception: app/api/website-intake/route.ts
  // sets it from which physical form the lead arrived on (an explicit fact, not a guess at the
  // content of an answer) — see that file's own header comment.
  await prisma.lead.create({
    data: { tripId: trip.id, channel, requestType, sourceForm, rawPayload: JSON.stringify(rawPayload) },
  });

  // Only create a TripRequirement row if at least one real field was actually given — an empty
  // requirement row that just says "nothing entered" isn't more honest than no row at all.
  const hasAnyRequirement = destinationsRaw || travelerCountRaw || tripLengthDaysRaw || accommodationCategory || budgetBand || notes;
  if (hasAnyRequirement) {
    await prisma.tripRequirement.create({
      data: {
        tripId: trip.id,
        destinations: destinationsRaw ? JSON.stringify(destinationsRaw.split(",").map((s) => s.trim()).filter(Boolean)) : null,
        travelerCount: travelerCountRaw ? Number(travelerCountRaw) : null,
        tripLengthDays: tripLengthDaysRaw ? Number(tripLengthDaysRaw) : null,
        accommodationCategory,
        budgetBand,
        notes,
      },
    });
  }

  // A point-in-time event, unlike the live "needs follow-up" rollup: this customer already having
  // a trip on file is a fact fixed at the moment this new one was created, not something that can
  // later become false. Fires from all three callers below via this shared function, matching the
  // Operational Inspection's own finding that a returning customer's history was previously
  // invisible regardless of which door they came in through.
  const priorTripCount = await prisma.trip.count({ where: { customerId, id: { not: trip.id } } });
  if (priorTripCount > 0) {
    const customer = await prisma.customer.findUniqueOrThrow({ where: { id: customerId }, select: { name: true } });
    await createNotification("returning_customer", trip.id, `/customers/${customerId}`, {
      customer: customer.name,
      count: priorTripCount,
    });
  }

  return trip;
}

// This is the ONE place a Trip gets created for a brand-new customer; Quote/Support/etc. attach to
// an existing Trip instead of each spawning their own Customer+Trip, which is what silently
// discarded requirements before. Only name plus at least one contact method (email OR phone) is
// required — matching how a real inquiry actually arrives (a call or a WhatsApp message rarely
// comes with an email attached). Forcing every field the full trip form asks for before anything
// can be saved is what pushes staff back to a notebook; this is the deliberately minimal path,
// with the full form still there for whoever has the complete picture up front.
export async function createTrip(formData: FormData) {
  const actingStaff = await requireRole("agent");
  const customerName = String(formData.get("customerName") ?? "").trim();
  const customerEmail = String(formData.get("customerEmail") ?? "").trim();
  const customerPhone = String(formData.get("customerPhone") ?? "").trim();
  if (!customerName || (!customerEmail && !customerPhone)) {
    throw new Error("A name plus an email or phone number is required");
  }

  // Dedupe by email when one is given (a stable, unique identifier); a phone-only quick capture
  // always creates a fresh Customer — phone isn't unique-constrained, so there's no reliable way
  // to know it's the same person, and guessing wrong would silently merge two different customers.
  const customer = customerEmail
    ? await prisma.customer.upsert({
        where: { email: customerEmail },
        update: { name: customerName, ...(customerPhone ? { phone: customerPhone } : {}) },
        create: { name: customerName, email: customerEmail, phone: customerPhone || null },
      })
    : await prisma.customer.create({ data: { name: customerName, phone: customerPhone || null } });

  // Whoever captures the lead is, by default, who's working it — the same "who's on this" instinct
  // the old free-text ownerName field existed for, just backed by a real account now instead of a
  // typed name. Reassignable afterward from the trip detail page.
  const trip = await createTripRecord(
    customer.id,
    formData,
    { source: "manual_entry", customerName, customerEmail: customerEmail || null, customerPhone: customerPhone || null },
    actingStaff.id
  );

  revalidatePath("/trips");
  redirect(`/trips/${trip.id}`);
}

// The customer-profile page's "+ New trip for this customer" button. Deliberately does NOT touch
// the Customer row at all — the whole point is a known person getting a second (or fifth) trip
// without a fresh, disconnected Customer record being created for them, which is exactly the gap
// the Operational Inspection's §6 flagged (there was no way to add a trip to an existing customer
// other than retyping their name/email/phone and hoping the email-based dedupe caught it).
export async function createTripForExistingCustomer(formData: FormData) {
  const actingStaff = await requireRole("agent");
  const customerId = String(formData.get("customerId") ?? "").trim();
  if (!customerId) throw new Error("A customer is required");

  const trip = await createTripRecord(customerId, formData, { source: "existing_customer" }, actingStaff.id);

  revalidatePath("/trips");
  revalidatePath(`/customers/${customerId}`);
  redirect(`/trips/${trip.id}`);
}

// Requirements and status/owner used to be two adjacent forms on the trip page — a natural place
// to type into one, then click the OTHER form's save button, silently discarding the first. One
// form, one action, one submit: whichever button is clicked, every field on the page saves
// together. There is no longer a "save" that only saves half of what's on screen.
export async function updateTrip(formData: FormData) {
  await requireRole("agent");
  const tripId = String(formData.get("tripId"));

  const destinationsRaw = String(formData.get("destinations") ?? "").trim();
  const travelerCountRaw = String(formData.get("travelerCount") ?? "").trim();
  const tripLengthDaysRaw = String(formData.get("tripLengthDays") ?? "").trim();
  const accommodationCategory = String(formData.get("accommodationCategory") ?? "").trim() || null;
  const budgetBand = String(formData.get("budgetBand") ?? "").trim() || null;
  const travelStartDateRaw = String(formData.get("travelStartDate") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const requirementData = {
    destinations: destinationsRaw ? JSON.stringify(destinationsRaw.split(",").map((s) => s.trim()).filter(Boolean)) : null,
    travelerCount: travelerCountRaw ? Number(travelerCountRaw) : null,
    tripLengthDays: tripLengthDaysRaw ? Number(tripLengthDaysRaw) : null,
    accommodationCategory,
    budgetBand,
    travelStartDate: travelStartDateRaw ? new Date(travelStartDateRaw) : null,
    notes,
  };

  const overallStatus = String(formData.get("overallStatus") ?? "active");
  const lostReason = String(formData.get("lostReason") ?? "").trim() || null;
  const ownerId = String(formData.get("ownerId") ?? "").trim() || null;
  // Disabled (not empty-string) on the form when a trip has no Lead row at all, so this key is
  // simply absent from formData for that edge case — nothing to update in that case.
  const requestTypeRaw = formData.get("requestType");
  const requestType = requestTypeRaw == null ? undefined : String(requestTypeRaw).trim() || null;

  await prisma.$transaction([
    prisma.tripRequirement.upsert({ where: { tripId }, update: requirementData, create: { tripId, ...requirementData } }),
    prisma.trip.update({ where: { id: tripId }, data: { overallStatus, lostReason: overallStatus === "lost" ? lostReason : null, ownerId } }),
    ...(requestType !== undefined ? [prisma.lead.update({ where: { tripId }, data: { requestType } })] : []),
  ]);

  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/trips");
}

// Archiving replaced the old immediate hard-delete — this just hides the trip from every normal
// list (they all filter `archivedAt: null`); nothing underneath it is touched. Reversible via
// restoreTrip below, unlike what this action used to do.
export async function archiveTrip(formData: FormData) {
  await requireRole("agent");
  const tripId = String(formData.get("tripId"));
  await prisma.trip.update({ where: { id: tripId }, data: { archivedAt: new Date() } });

  revalidatePath("/trips");
  revalidatePath("/leads");
  revalidatePath("/bookings");
  revalidatePath("/quotes");
  revalidatePath("/archive");
  redirect("/trips");
}

export async function restoreTrip(formData: FormData) {
  await requireRole("agent");
  const tripId = String(formData.get("tripId"));
  await prisma.trip.update({ where: { id: tripId }, data: { archivedAt: null } });

  revalidatePath("/trips");
  revalidatePath("/leads");
  revalidatePath("/archive");
}

// The one genuinely irreversible action in the whole app — permanently removes the trip and every
// record hanging off it (leaf-first, same dependency order the seed script's own cleanup follows,
// since nothing here cascades automatically). Administrator-only, and only reachable from the
// Archive section on a trip that's already archived — a live trip can never be hard-deleted in one
// step, only archived first, then permanently deleted as a separate, deliberate second action. The
// Customer row is left untouched: it may have other trips, and even when it doesn't, deleting a
// trip is not the same decision as deleting a person's contact record.
export async function permanentlyDeleteTrip(formData: FormData) {
  await requireRole("administrator");
  const tripId = String(formData.get("tripId"));

  const trip = await prisma.trip.findUniqueOrThrow({ where: { id: tripId }, select: { archivedAt: true } });
  if (!trip.archivedAt) {
    // Redirects with a reason instead of throwing — same fix as login/changeMyPassword: a blocked
    // guard is an expected, routine outcome, not a crash. The UI already only ever shows this
    // button on an archived row, so this path is a defensive backstop, not a normal one.
    redirect("/archive?archiveError=notArchived");
  }

  const [quoteIds, bookingIds] = await Promise.all([
    prisma.quote.findMany({ where: { tripId }, select: { id: true } }).then((rows) => rows.map((r) => r.id)),
    prisma.booking.findMany({ where: { tripId }, select: { id: true } }).then((rows) => rows.map((r) => r.id)),
  ]);

  await prisma.$transaction([
    prisma.bookingLine.deleteMany({ where: { bookingId: { in: bookingIds } } }),
    prisma.booking.deleteMany({ where: { tripId } }),
    prisma.quoteLine.deleteMany({ where: { quoteId: { in: quoteIds } } }),
    prisma.quote.deleteMany({ where: { tripId } }),
    prisma.supportTicket.deleteMany({ where: { tripId } }),
    prisma.document.deleteMany({ where: { tripId } }),
    prisma.payment.deleteMany({ where: { tripId } }),
    prisma.traveller.deleteMany({ where: { tripId } }),
    prisma.tripRequirement.deleteMany({ where: { tripId } }),
    prisma.lead.deleteMany({ where: { tripId } }),
    // Notification.tripId is a plain reference, not a real FK (see schema.prisma's comment) — it
    // doesn't cascade on its own, so a deleted trip's notifications are cleaned up explicitly here,
    // the same as every other tripId-scoped table above.
    prisma.notification.deleteMany({ where: { tripId } }),
    prisma.trip.delete({ where: { id: tripId } }),
  ]);

  revalidatePath("/trips");
  revalidatePath("/leads");
  revalidatePath("/bookings");
  revalidatePath("/quotes");
  revalidatePath("/archive");
  revalidatePath("/", "layout");
}
