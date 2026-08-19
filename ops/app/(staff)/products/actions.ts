"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/session";

function productFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "");
  const providerId = String(formData.get("providerId") ?? "");
  if (!name) throw new Error("Product name is required.");
  if (!categoryId || !providerId) throw new Error("Category and provider are required.");

  const netRaw = String(formData.get("defaultNetCost") ?? "").trim();
  const sellRaw = String(formData.get("defaultSellingPrice") ?? "").trim();
  const defaultNetCostMinor = netRaw ? Math.round(Number(netRaw) * 100) : null;
  const defaultSellingPriceMinor = sellRaw ? Math.round(Number(sellRaw) * 100) : null;
  // Same discipline as the Quote Builder's line prices — a fat-fingered minus sign must never
  // become the agency's own asking price.
  if ((defaultNetCostMinor != null && defaultNetCostMinor < 0) || (defaultSellingPriceMinor != null && defaultSellingPriceMinor < 0)) {
    throw new Error("Net cost and selling price cannot be negative.");
  }

  const attributesRaw = String(formData.get("attributes") ?? "").trim();
  if (attributesRaw) {
    try {
      JSON.parse(attributesRaw);
    } catch {
      throw new Error("Attributes must be valid JSON (or left blank).");
    }
  }

  return {
    name,
    nameFr: String(formData.get("nameFr") ?? "").trim() || null,
    shortDescription: String(formData.get("shortDescription") ?? "").trim() || null,
    shortDescriptionFr: String(formData.get("shortDescriptionFr") ?? "").trim() || null,
    categoryId,
    providerId,
    status: String(formData.get("status") ?? "draft"),
    unitType: String(formData.get("unitType") ?? "").trim() || null,
    baseCurrency: String(formData.get("baseCurrency") ?? "").trim() || null,
    defaultNetCostMinor,
    defaultSellingPriceMinor,
    attributes: attributesRaw || null,
  };
}

// The doctrine's central operation — moving a product from one provider to another (Moods Travel
// -> TripGate, or onboarding a brand-new direct provider) — is just providerId on this same form.
// No separate "internal product" or "external product" creation path exists, on purpose.
export async function createProduct(formData: FormData) {
  await requireRole("administrator");
  const product = await prisma.travelProduct.create({ data: productFields(formData) });
  revalidatePath("/products");
  redirect(`/products/${product.id}`);
}

export async function updateProduct(formData: FormData) {
  await requireRole("administrator");
  const id = String(formData.get("id"));
  await prisma.travelProduct.update({ where: { id }, data: productFields(formData) });
  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
}
