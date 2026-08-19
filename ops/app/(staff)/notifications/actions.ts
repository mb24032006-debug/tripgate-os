"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";

// Global read state (see schema.prisma's Notification comment) — deliberately still shared across
// every account rather than per-Staff, even now that Staff exists; see that model's own comment on
// why a per-user NotificationRead table is a later, additive step, not a rewrite. Revalidates the
// whole layout since the bell lives there, in every route under the staff shell.
export async function markAllNotificationsRead() {
  await requireRole("agent");
  await prisma.notification.updateMany({ where: { isRead: false }, data: { isRead: true, readAt: new Date() } });
  revalidatePath("/", "layout");
}

export async function markNotificationRead(formData: FormData) {
  await requireRole("agent");
  const id = String(formData.get("id"));
  await prisma.notification.update({ where: { id }, data: { isRead: true, readAt: new Date() } });
  revalidatePath("/", "layout");
}
