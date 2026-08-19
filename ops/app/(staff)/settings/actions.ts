"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { requireRole } from "@/lib/session";

// Every signed-in staff member can edit their own name/email — no role floor beyond being logged
// in at all, same baseline as everything else in this app that isn't explicitly gated higher.
export async function updateMyAccount(formData: FormData) {
  const staff = await requireRole("agent");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!name || !email) throw new Error("Name and email are required.");

  await prisma.staff.update({ where: { id: staff.id }, data: { name, email } });
  revalidatePath("/settings");
  revalidatePath("/", "layout");
}

// Redirects with a flag instead of throwing — same reasoning as app/login/actions.ts's login():
// a wrong current password is a routine, expected outcome that deserves its own plain-language
// message on this page, not the generic app/error.tsx crash screen every thrown Error here hits.
export async function changeMyPassword(formData: FormData) {
  const staff = await requireRole("agent");
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");

  const row = await prisma.staff.findUniqueOrThrow({ where: { id: staff.id } });
  if (!verifyPassword(currentPassword, row.passwordHash)) {
    redirect("/settings?pwError=wrong");
  }
  if (newPassword.length < 8) {
    redirect("/settings?pwError=short");
  }

  await prisma.staff.update({ where: { id: staff.id }, data: { passwordHash: hashPassword(newPassword) } });
  revalidatePath("/settings");
  redirect("/settings?pwSuccess=1");
}

// Administrator-only — the same enabledModules row that's always existed (OrganizationSettings),
// just editable through a form instead of a hand-written script. Checkboxes only appear in
// FormData when checked, so absence means "off," not "leave unchanged" — this form always submits
// every module's full state together, same "one save, whichever button" discipline as the trip
// detail page's own form.
export async function updateModules(formData: FormData) {
  await requireRole("administrator");

  const operatingModel = String(formData.get("operatingModel") ?? "intermediary");
  const moduleKeys = [
    "leads", "quotes", "support", "bookings", "documents", "payments", "knowledgeBase", "availability", "customerPortal",
  ] as const;
  const enabledModules = Object.fromEntries(moduleKeys.map((key) => [key, formData.get(key) === "on"]));

  const existing = await prisma.organizationSettings.findFirst();
  if (existing) {
    await prisma.organizationSettings.update({
      where: { id: existing.id },
      data: { operatingModel, enabledModules: JSON.stringify(enabledModules) },
    });
  } else {
    await prisma.organizationSettings.create({
      data: { operatingModel, enabledModules: JSON.stringify(enabledModules) },
    });
  }

  revalidatePath("/", "layout");
  revalidatePath("/settings");
}

export async function addExchangeRate(formData: FormData) {
  await requireRole("administrator");
  const fromCurrency = String(formData.get("fromCurrency") ?? "").trim().toUpperCase();
  const toCurrency = String(formData.get("toCurrency") ?? "").trim().toUpperCase();
  const rate = Number(formData.get("rate"));
  if (!fromCurrency || !toCurrency) throw new Error("Both currencies are required.");
  if (fromCurrency === toCurrency) throw new Error("From and to currencies must differ.");
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("Rate must be a positive number.");

  await prisma.exchangeRate.upsert({
    where: { fromCurrency_toCurrency: { fromCurrency, toCurrency } },
    update: { rate },
    create: { fromCurrency, toCurrency, rate },
  });
  revalidatePath("/settings");
}

export async function deleteExchangeRate(formData: FormData) {
  await requireRole("administrator");
  const id = String(formData.get("id"));
  await prisma.exchangeRate.delete({ where: { id } });
  revalidatePath("/settings");
}
