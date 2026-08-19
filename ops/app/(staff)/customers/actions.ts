"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/session";

// Same soft-delete pattern as Trip — hides the customer from the main Customers list, reversible,
// and deliberately independent of their trips' own archive state (deleting/archiving a trip was
// never the same decision as archiving the person's contact record — see Trip's own comment on
// this — and that holds in the other direction too).
export async function archiveCustomer(formData: FormData) {
  await requireRole("agent");
  const customerId = String(formData.get("customerId"));
  await prisma.customer.update({ where: { id: customerId }, data: { archivedAt: new Date() } });

  revalidatePath("/customers");
  revalidatePath("/archive");
  redirect("/customers");
}

export async function restoreCustomer(formData: FormData) {
  await requireRole("agent");
  const customerId = String(formData.get("customerId"));
  await prisma.customer.update({ where: { id: customerId }, data: { archivedAt: null } });

  revalidatePath("/customers");
  revalidatePath("/archive");
}

// Administrator-only, Archive-section-only, same shape as permanentlyDeleteTrip. Blocked while any
// trip still references this customer — Trip.customerId is a required, non-nullable relation, so
// nothing here can silently orphan a Trip row. The trips (archived or not) must be dealt with
// individually first. Redirects with a reason instead of throwing — same fix as login/
// changeMyPassword: a blocked guard is an expected, routine outcome, not a crash.
export async function permanentlyDeleteCustomer(formData: FormData) {
  await requireRole("administrator");
  const customerId = String(formData.get("customerId"));

  const customer = await prisma.customer.findUniqueOrThrow({
    where: { id: customerId },
    include: { _count: { select: { trips: true } } },
  });
  if (!customer.archivedAt) {
    redirect("/archive?archiveError=notArchived");
  }
  if (customer._count.trips > 0) {
    redirect("/archive?archiveError=customerHasTrips");
  }

  await prisma.customer.delete({ where: { id: customerId } });
  revalidatePath("/customers");
  revalidatePath("/archive");
}
