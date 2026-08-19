"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notifications";
import { requireRole } from "@/lib/session";

// Payment rows already existed in the schema from the "build the entire architecture now, activate
// progressively" pass — this is the first code that actually writes/reads them. `dueDate` and
// `paidDate` are deliberately independent: a payment can be recorded the moment it's expected
// (dueDate set, paidDate null — "who hasn't paid" becomes answerable) or recorded after the fact as
// already settled (paidDate set at creation), matching how staff actually encounter both cases.
export async function createPayment(formData: FormData) {
  await requireRole("agent");
  const tripId = String(formData.get("tripId"));
  const direction = String(formData.get("direction") ?? "inbound") === "outbound" ? "outbound" : "inbound";
  const type = String(formData.get("type") ?? "deposit").trim() || "deposit";
  const currency = String(formData.get("currency") ?? "MAD").trim() || "MAD";
  const amountMinor = Math.round(Number(formData.get("amount")) * 100);
  if (!tripId || !Number.isFinite(amountMinor) || amountMinor <= 0) {
    throw new Error("A trip and a positive amount are required.");
  }
  const dueDateRaw = String(formData.get("dueDate") ?? "").trim();
  const paidDateRaw = String(formData.get("paidDate") ?? "").trim();

  const payment = await prisma.payment.create({
    data: {
      tripId,
      direction,
      type,
      currency,
      amountMinor,
      dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
      paidDate: paidDateRaw ? new Date(paidDateRaw) : null,
    },
  });

  if (direction === "inbound" && payment.paidDate) {
    await notifyPaymentReceived(payment.id);
  }

  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/payments");
  revalidatePath("/trips");
}

// Separate from creation — the common case is recording a deposit as DUE the moment it's agreed,
// then marking it paid days or weeks later when it actually arrives.
export async function markPaymentPaid(formData: FormData) {
  await requireRole("agent");
  const paymentId = String(formData.get("paymentId"));
  const tripId = String(formData.get("tripId"));

  const payment = await prisma.payment.update({ where: { id: paymentId }, data: { paidDate: new Date() } });

  if (payment.direction === "inbound") {
    await notifyPaymentReceived(paymentId);
  }

  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/payments");
  revalidatePath("/trips");
}

async function notifyPaymentReceived(paymentId: string) {
  const payment = await prisma.payment.findUniqueOrThrow({
    where: { id: paymentId },
    include: { trip: { include: { customer: true } } },
  });
  await createNotification("payment_received", payment.tripId, `/trips/${payment.tripId}`, {
    reference: payment.trip.reference ?? payment.tripId,
    customer: payment.trip.customer.name,
    amount: `${payment.currency} ${(payment.amountMinor / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`,
  });
  revalidatePath("/", "layout");
}
