"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { hashPassword, ROLES } from "@/lib/auth";
import { requireRole } from "@/lib/session";

export async function createStaff(formData: FormData) {
  await requireRole("administrator");

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "agent");
  if (!name || !email || !password) throw new Error("Name, email, and a temporary password are required.");
  if (!(ROLES as readonly string[]).includes(role)) throw new Error("Invalid role.");
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");

  await prisma.staff.create({ data: { name, email, passwordHash: hashPassword(password), role } });
  revalidatePath("/staff");
}

// Disabling, not deleting — a disabled account's history (trips owned, notes left) stays intact;
// only sign-in and any active sessions stop working (lib/session.ts checks status on every lookup).
export async function setStaffStatus(formData: FormData) {
  const actingStaff = await requireRole("administrator");
  const staffId = String(formData.get("staffId"));
  const status = String(formData.get("status") ?? "active") === "disabled" ? "disabled" : "active";

  if (staffId === actingStaff.id && status === "disabled") {
    throw new Error("You can't disable your own account.");
  }

  await prisma.staff.update({ where: { id: staffId }, data: { status } });
  revalidatePath("/staff");
}
