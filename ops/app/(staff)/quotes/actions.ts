"use server";

import { prisma } from "@/lib/db";
import { computeQuoteTotal } from "@/lib/money";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createNotification } from "@/lib/notifications";
import { requireRole } from "@/lib/session";
import { getManagedRate } from "@/lib/exchangeRates";

// A Quote always belongs to an EXISTING Trip — created via app/trips/actions.ts's createTrip,
// which is also where Requirements get captured. Quotes never spawn their own Customer/Trip; that
// was the exact anti-pattern that silently discarded a "trip label" text field with nowhere real
// to attach Documents/Payments/Support/Bookings alongside it.
export async function createQuote(tripId: string, label?: string) {
  await requireRole("agent");
  const quote = await prisma.quote.create({
    data: { tripId, currency: "MAD", label: label?.trim() || null },
  });

  // The Lead Inbox used to read "new" forever, even on trips already quoted and booked — the same
  // failure mode as an inbox that never marks anything read. A quote existing is unambiguous
  // evidence the lead has been worked; bump it once, here, rather than leaving it stuck.
  await prisma.lead.updateMany({ where: { tripId, qualificationStatus: "new" }, data: { qualificationStatus: "qualified" } });

  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/leads");
  redirect(`/quotes/${quote.id}`);
}

// Draft-only, like every other pricing/content field — staff-authored deposit/cancellation copy
// shown on the client-facing view. Separate action so it can never be conflated with a line edit.
export async function updateQuoteTerms(formData: FormData) {
  await requireRole("agent");
  const quoteId = String(formData.get("quoteId"));
  await assertDraft(quoteId);
  const termsText = String(formData.get("termsText") ?? "").trim() || null;
  await prisma.quote.update({ where: { id: quoteId }, data: { termsText } });
  revalidateQuote(quoteId);
}

function revalidateQuote(quoteId: string) {
  revalidatePath(`/quotes/${quoteId}`);
  revalidatePath(`/quotes/${quoteId}/view`);
}

async function assertDraft(quoteId: string) {
  const quote = await prisma.quote.findUniqueOrThrow({ where: { id: quoteId } });
  if (quote.status !== "draft") {
    throw new Error("This quote is no longer a draft — revise it to make further changes.");
  }
  return quote;
}

// Adding a product already on the quote used to create a second, indistinguishable line (silent
// duplicate-charge risk) — now it increments quantity on the existing line instead. QuoteLine
// already had a `quantity` column that nothing used; this is the fix, not a new concept.
export async function addQuoteLine(quoteId: string, travelProductId: string) {
  await requireRole("agent");
  const quote = await assertDraft(quoteId);

  const existing = await prisma.quoteLine.findFirst({ where: { quoteId, travelProductId } });
  if (existing) {
    await prisma.quoteLine.update({ where: { id: existing.id }, data: { quantity: existing.quantity + 1 } });
    revalidateQuote(quoteId);
    return;
  }

  const product = await prisma.travelProduct.findUniqueOrThrow({
    where: { id: travelProductId },
    include: { provider: true },
  });

  const netCostMinor = product.defaultNetCostMinor ?? 0;
  // Default only — never the source of truth. Internal, no-cost-basis products (Morocco tours,
  // Business Travel services) start as "manual" since there's no cost to mark up from; external
  // products with a known net cost get a starting 18% markup the ops user can then override.
  const sellingPriceMinor = netCostMinor > 0 ? Math.round(netCostMinor * 1.18) : 0;
  const pricingMethod = netCostMinor > 0 ? "cost_plus_markup:18%" : "manual";

  // A managed rate (Settings > Exchange rates) pre-resolves the line the instant it's added, so a
  // USD/SAR-priced product on a MAD quote no longer requires a manual "Set rate" step every time —
  // exactly the friction the Payments verification pass hit. Still just a default: null when no
  // managed rate exists for this pair, same "unresolved until an agent sets one" behavior as before.
  const fxRateToQuoteCurrency =
    product.baseCurrency && product.baseCurrency !== quote.currency
      ? await getManagedRate(product.baseCurrency, quote.currency)
      : null;

  await prisma.quoteLine.create({
    data: {
      quoteId,
      travelProductId: product.id,
      providerId: product.providerId,
      categoryIdSnapshot: product.categoryId,
      sourceKindCache: product.provider.sourceKind,
      unit: product.unitType,
      // Snapshot the product's own currency — never assume it matches the Quote's currency.
      currency: product.baseCurrency,
      fxRateToQuoteCurrency,
      netCostMinor,
      sellingPriceMinor,
      pricingMethod,
    },
  });

  revalidateQuote(quoteId);
}

export async function updateQuoteLine(formData: FormData) {
  await requireRole("agent");
  const lineId = String(formData.get("lineId"));
  const quoteId = String(formData.get("quoteId"));
  await assertDraft(quoteId);

  const netCostMinor = Math.round(Number(formData.get("netCost")) * 100);
  const sellingPriceMinor = Math.round(Number(formData.get("sellingPrice")) * 100);
  const quantity = Math.max(1, Math.round(Number(formData.get("quantity")) || 1));

  // A typo'd minus sign (fat-finger, not an intentional loss-leader) must never reach a customer.
  // Fails safely via the friendly error boundary rather than silently accepting the value.
  if (netCostMinor < 0 || sellingPriceMinor < 0) {
    throw new Error("Net cost and selling price cannot be negative.");
  }

  await prisma.quoteLine.update({
    where: { id: lineId },
    data: { netCostMinor, sellingPriceMinor, quantity, pricingMethod: "manual" },
  });

  revalidateQuote(quoteId);
}

// The one remedy for a currency-mismatched line: set the rate once, the line converts into the
// Quote's currency from then on. Separate from updateQuoteLine so setting a rate can never
// accidentally clobber a price the agent didn't mean to touch.
export async function setLineFxRate(formData: FormData) {
  await requireRole("agent");
  const lineId = String(formData.get("lineId"));
  const quoteId = String(formData.get("quoteId"));
  await assertDraft(quoteId);

  const rateRaw = String(formData.get("fxRate") ?? "").trim();
  const fxRateToQuoteCurrency = rateRaw ? Number(rateRaw) : null;
  if (fxRateToQuoteCurrency != null && (!Number.isFinite(fxRateToQuoteCurrency) || fxRateToQuoteCurrency <= 0)) {
    throw new Error("Exchange rate must be a positive number");
  }

  await prisma.quoteLine.update({ where: { id: lineId }, data: { fxRateToQuoteCurrency } });
  revalidateQuote(quoteId);
}

export async function removeQuoteLine(formData: FormData) {
  await requireRole("agent");
  const lineId = String(formData.get("lineId"));
  const quoteId = String(formData.get("quoteId"));
  await assertDraft(quoteId);
  await prisma.quoteLine.delete({ where: { id: lineId } });
  revalidateQuote(quoteId);
}

// Freezes the total at send-time so a later product-price change can never retroactively alter
// what the customer was already shown — architecture/01_TARGET_ARCHITECTURE.md's Quote fix.
// Blocks sending while any line's currency neither matches the Quote's nor has an FX rate set —
// the real fix for the old "permanent dead end," which is to require a resolution, not to allow a
// silent blend.
export async function sendQuote(formData: FormData) {
  await requireRole("agent");
  const quoteId = String(formData.get("quoteId"));
  const quote = await assertDraft(quoteId);
  const lines = await prisma.quoteLine.findMany({ where: { quoteId } });

  const total = computeQuoteTotal(lines, quote.currency);
  if (total == null) {
    throw new Error("Every line must be in the quote's currency or have an exchange rate set before sending.");
  }
  // A nonsense or free total must never reach a customer as a real, acceptable offer.
  if (total <= 0) {
    throw new Error("The client total must be greater than zero before this quote can be sent.");
  }

  const validUntilRaw = String(formData.get("validUntil") ?? "").trim();

  await prisma.quote.update({
    where: { id: quoteId },
    data: {
      status: "sent",
      sentSnapshotTotalMinor: total,
      sentAt: new Date(),
      validUntil: validUntilRaw ? new Date(validUntilRaw) : undefined,
    },
  });

  revalidateQuote(quoteId);
}

// Closes the pipeline exactly where it used to die: accepting turns a Quote into a real Booking,
// copying every line across (Booking/BookingLine were already modeled for this — see
// schema.prisma's comment — nothing here needed a schema change).
//
// Also supersedes every sibling quote on the same trip. Before this, a customer sent two options
// (e.g. Budget and Premium) could open both client links and accept BOTH — two "accepted" quotes,
// two bookings, for the same family on the same dates, with no warning to anyone. Good/better/worse
// selling is meant to end in exactly one winner; the other options must close the moment one wins,
// as part of the same atomic action, not as a manual cleanup step someone might forget.
// Deliberately NOT gated with requireRole — this is called from BOTH the staff quote builder
// (with a hidden actor field) AND app/quotes/[id]/view, the unauthenticated customer-facing page
// where a customer accepts their own quote with no Staff account at all. The `acceptedByName`
// requirement below is the only accountability this action has, by design (see its own comment).
export async function acceptQuote(formData: FormData) {
  const quoteId = String(formData.get("quoteId"));
  // The old single-click accept left the agency with no defensible record of who agreed to what —
  // no different from a phone order with nothing written down. A name is not authentication, but
  // it's what a phone-order or a signed voucher already relies on, and it's more than existed
  // before. Required from both surfaces that call this: the client view (typed fresh, forcing an
  // intentional action) and the staff builder (prefilled with the customer's own name, for the
  // "customer confirmed by phone" case).
  const acceptedByName = String(formData.get("acceptedByName") ?? "").trim();
  if (!acceptedByName) {
    throw new Error("A name is required to accept a quote.");
  }
  const quote = await prisma.quote.findUniqueOrThrow({
    where: { id: quoteId },
    include: { lines: true, trip: { include: { customer: true } } },
  });
  if (quote.status !== "sent") {
    throw new Error("Only a sent quote can be accepted.");
  }

  const siblingIds = (
    await prisma.quote.findMany({
      where: { tripId: quote.tripId, id: { not: quoteId }, status: { in: ["draft", "sent"] } },
      select: { id: true },
    })
  ).map((s) => s.id);

  await prisma.$transaction([
    prisma.quote.update({ where: { id: quoteId }, data: { status: "accepted", acceptedByName, acceptedAt: new Date() } }),
    ...(siblingIds.length
      ? [prisma.quote.updateMany({ where: { id: { in: siblingIds } }, data: { status: "expired" } })]
      : []),
    prisma.booking.create({
      data: {
        tripId: quote.tripId,
        quoteId: quote.id,
        status: "in_progress",
        lines: {
          create: quote.lines.map((l) => ({
            quoteLineId: l.id,
            travelProductId: l.travelProductId,
            providerId: l.providerId,
          })),
        },
      },
    }),
  ]);

  const referenceOrId = quote.trip.reference ?? quote.tripId;
  await createNotification("quote_accepted", quote.tripId, `/quotes/${quoteId}`, {
    reference: referenceOrId,
    customer: quote.trip.customer.name,
  });
  await createNotification("booking_created", quote.tripId, `/trips/${quote.tripId}`, {
    reference: referenceOrId,
    customer: quote.trip.customer.name,
  });

  for (const id of siblingIds) revalidateQuote(id);
  revalidatePath(`/trips/${quote.tripId}`);
  revalidatePath("/", "layout");
  // Accept/decline are the two actions where staleness actually matters — the customer-facing
  // comparison view re-queries EVERY live quote on the trip, and an in-place revalidation on that
  // page was observed lagging (confirmed correct on a hard reload, but not reliably before one).
  // A redirect back to the same URL, same pattern as createQuote/reviseQuote/duplicateQuote,
  // forces a guaranteed-fresh render instead of trusting the client router cache to catch up.
  redirect(String(formData.get("returnTo") ?? `/quotes/${quoteId}`));
}

// The one undo path: an accepted quote (and its booking) can be walked back, with a reason. This
// does not delete the booking — cancellation is itself a fact worth keeping — it marks it
// cancelled and reopens the quote for a decision (revise it, or leave it declined).
export async function cancelBooking(formData: FormData) {
  await requireRole("agent");
  const quoteId = String(formData.get("quoteId"));
  const reason = String(formData.get("reason") ?? "").trim() || null;
  const quote = await prisma.quote.findUniqueOrThrow({ where: { id: quoteId }, include: { booking: true } });
  if (quote.status !== "accepted" || !quote.booking) {
    throw new Error("Only an accepted quote with a booking can be cancelled.");
  }

  await prisma.$transaction([
    prisma.booking.update({ where: { id: quote.booking.id }, data: { status: "cancelled" } }),
    prisma.quote.update({ where: { id: quoteId }, data: { status: "rejected", notes: reason } }),
  ]);

  revalidateQuote(quoteId);
  revalidatePath(`/trips/${quote.tripId}`);
}

// `actor` distinguishes an agent withdrawing a quote from a customer actually saying no — without
// it, win/loss reporting is corrupted at the source, and the client-facing page ends up telling a
// customer "you declined this" about a decision they never made. The two forms that call this
// (staff builder, client view) each pass a fixed hidden value; nothing here guesses.
// Same reasoning as acceptQuote above — deliberately not gated, the customer-facing view calls
// this with no Staff session.
export async function declineQuote(formData: FormData) {
  const quoteId = String(formData.get("quoteId"));
  const quote = await prisma.quote.findUniqueOrThrow({
    where: { id: quoteId },
    include: { trip: { include: { customer: true } } },
  });
  if (quote.status !== "sent") {
    throw new Error("Only a sent quote can be declined.");
  }
  const reason = String(formData.get("reason") ?? "").trim() || null;
  const actor = String(formData.get("actor") ?? "client") === "agent" ? "agent" : "client";

  await prisma.quote.update({ where: { id: quoteId }, data: { status: "rejected", notes: reason, declinedBy: actor } });

  await createNotification("quote_declined", quote.tripId, `/quotes/${quoteId}`, {
    reference: quote.trip.reference ?? quote.tripId,
    customer: quote.trip.customer.name,
  });

  revalidatePath(`/trips/${quote.tripId}`);
  revalidatePath("/", "layout");
  // Same reasoning as acceptQuote — see its comment.
  redirect(String(formData.get("returnTo") ?? `/quotes/${quoteId}`));
}

async function cloneQuote(sourceId: string, opts: { asRevision: boolean; label?: string }) {
  const source = await prisma.quote.findUniqueOrThrow({ where: { id: sourceId }, include: { lines: true } });

  const created = await prisma.quote.create({
    data: {
      tripId: source.tripId,
      label: (opts.label?.trim() || source.label) ?? null,
      currency: source.currency,
      version: opts.asRevision ? source.version + 1 : 1,
      supersedesQuoteId: opts.asRevision ? source.id : null,
      status: "draft",
      lines: {
        create: source.lines.map((l) => ({
          travelProductId: l.travelProductId,
          providerId: l.providerId,
          categoryIdSnapshot: l.categoryIdSnapshot,
          sourceKindCache: l.sourceKindCache,
          startDate: l.startDate,
          endDate: l.endDate,
          quantity: l.quantity,
          unit: l.unit,
          currency: l.currency,
          fxRateToQuoteCurrency: l.fxRateToQuoteCurrency,
          netCostMinor: l.netCostMinor,
          sellingPriceMinor: l.sellingPriceMinor,
          pricingMethod: l.pricingMethod,
          sortOrder: l.sortOrder,
        })),
      },
    },
  });

  if (opts.asRevision) {
    await prisma.quote.update({ where: { id: source.id }, data: { status: "revised" } });
  }

  revalidatePath(`/trips/${source.tripId}`);
  return created;
}

// A sent or declined quote is locked (see assertDraft) — the only way to change numbers the
// customer already saw is to explicitly start a new version. Reuses the `version`/
// `supersedesQuoteId` columns that were already in the schema and unused.
export async function reviseQuote(formData: FormData) {
  await requireRole("agent");
  const quoteId = String(formData.get("quoteId"));
  const source = await prisma.quote.findUniqueOrThrow({ where: { id: quoteId } });
  if (!["sent", "rejected", "expired"].includes(source.status)) {
    throw new Error("Only a sent, declined, or expired quote can be revised.");
  }
  const created = await cloneQuote(quoteId, { asRevision: true });
  redirect(`/quotes/${created.id}`);
}

// An independent sibling copy (Budget → Premium → Luxury) instead of every option being rebuilt
// and re-priced by hand from an empty quote three times over.
export async function duplicateQuote(formData: FormData) {
  await requireRole("agent");
  const quoteId = String(formData.get("quoteId"));
  const label = String(formData.get("label") ?? "");
  const created = await cloneQuote(quoteId, { asRevision: false, label });
  redirect(`/quotes/${created.id}`);
}
