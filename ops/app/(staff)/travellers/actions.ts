"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";

function travellerFields(formData: FormData) {
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  if (!firstName || !lastName) throw new Error("First and last name are required.");

  const dobRaw = String(formData.get("dateOfBirth") ?? "").trim();
  const passportExpiryRaw = String(formData.get("passportExpiry") ?? "").trim();

  return {
    firstName,
    lastName,
    dateOfBirth: dobRaw ? new Date(dobRaw) : null,
    gender: String(formData.get("gender") ?? "").trim() || null,
    nationality: String(formData.get("nationality") ?? "").trim() || null,
    passportNumber: String(formData.get("passportNumber") ?? "").trim() || null,
    passportExpiry: passportExpiryRaw ? new Date(passportExpiryRaw) : null,
    mahramRelationship: String(formData.get("mahramRelationship") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

export async function addTraveller(formData: FormData) {
  await requireRole("agent");
  const tripId = String(formData.get("tripId"));
  await prisma.traveller.create({ data: { tripId, ...travellerFields(formData) } });
  revalidatePath(`/trips/${tripId}`);
}

export async function updateTraveller(formData: FormData) {
  await requireRole("agent");
  const id = String(formData.get("id"));
  const tripId = String(formData.get("tripId"));
  await prisma.traveller.update({ where: { id }, data: travellerFields(formData) });
  revalidatePath(`/trips/${tripId}`);
}

export async function removeTraveller(formData: FormData) {
  await requireRole("agent");
  const id = String(formData.get("id"));
  const tripId = String(formData.get("tripId"));
  await prisma.traveller.delete({ where: { id } });
  revalidatePath(`/trips/${tripId}`);
}
