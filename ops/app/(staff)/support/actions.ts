"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notifications";
import { requireRole } from "@/lib/session";

export async function createSupportTicket(formData: FormData) {
  await requireRole("agent");
  const tripId = String(formData.get("tripId"));
  const subject = String(formData.get("subject") ?? "").trim();
  const priority = String(formData.get("priority") ?? "normal").trim() || "normal";
  if (!tripId || !subject) throw new Error("Trip and subject are required");

  await prisma.supportTicket.create({ data: { tripId, subject, priority } });

  const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { reference: true } });
  await createNotification("support_ticket", tripId, `/trips/${tripId}`, {
    reference: trip?.reference ?? tripId,
    subject,
  });

  revalidatePath("/support");
  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/", "layout");
}

export async function resolveSupportTicket(formData: FormData) {
  await requireRole("agent");
  const ticketId = String(formData.get("ticketId"));
  const tripId = String(formData.get("tripId"));
  const resolutionNote = String(formData.get("resolutionNote") ?? "").trim() || null;

  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { status: "resolved", resolvedAt: new Date(), resolutionNote },
  });

  revalidatePath("/support");
  revalidatePath(`/trips/${tripId}`);
}
