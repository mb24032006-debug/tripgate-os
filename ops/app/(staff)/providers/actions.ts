"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/session";

// commercialTerms is stored as a JSON blob (schema.prisma's own comment says so), but a raw JSON
// textarea is exactly the "developer field shown to staff" complaint this project keeps finding
// and fixing elsewhere — so this is 3 plain fields packed into that shape, never shown as JSON.
function packCommercialTerms(formData: FormData): string | null {
  const commissionPercent = String(formData.get("commissionPercent") ?? "").trim();
  const paymentTerms = String(formData.get("paymentTerms") ?? "").trim();
  const notes = String(formData.get("commercialNotes") ?? "").trim();
  if (!commissionPercent && !paymentTerms && !notes) return null;
  return JSON.stringify({
    commissionPercent: commissionPercent ? Number(commissionPercent) : null,
    paymentTerms: paymentTerms || null,
    notes: notes || null,
  });
}

function providerFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const sourceKind = String(formData.get("sourceKind") ?? "external");
  const providerTypesRaw = String(formData.get("providerTypes") ?? "").trim();
  const contactName = String(formData.get("contactName") ?? "").trim() || null;
  const contactEmail = String(formData.get("contactEmail") ?? "").trim() || null;
  const contactPhone = String(formData.get("contactPhone") ?? "").trim() || null;
  const relationshipTier = String(formData.get("relationshipTier") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "active");

  if (!name) throw new Error("Provider name is required.");

  return {
    name,
    sourceKind,
    providerTypes: JSON.stringify(providerTypesRaw ? providerTypesRaw.split(",").map((s) => s.trim()).filter(Boolean) : []),
    contactName,
    contactEmail,
    contactPhone,
    relationshipTier,
    status,
    commercialTerms: packCommercialTerms(formData),
  };
}

// The doctrine's central claim — "internal vs external is metadata" — only holds if a provider,
// including TripGate's own future direct-provider relationships, can actually be created. This is
// that create path: no form field or step differs by sourceKind.
export async function createProvider(formData: FormData) {
  await requireRole("administrator");
  await prisma.provider.create({ data: providerFields(formData) });
  revalidatePath("/providers");
  redirect("/providers");
}

// Same form, same fields, whether re-saving Moods Travel or TripGate itself — and this is also the
// one place a product's provider gets re-pointed, since Product's own edit form just offers this
// same providerId as a plain select. "Moving a product in-house is a data change" only means
// something once both halves of that sentence — a providerId select on Product, and this action
// to keep Provider rows editable — actually exist.
export async function updateProvider(formData: FormData) {
  await requireRole("administrator");
  const id = String(formData.get("id"));
  await prisma.provider.update({ where: { id }, data: providerFields(formData) });
  revalidatePath("/providers");
  revalidatePath(`/providers/${id}`);
}
