import { prisma } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateProduct } from "../actions";
import { getLocale, localized, statusLabel, t } from "@/lib/i18n";
import { getCurrentStaff } from "@/lib/session";
import { roleAtLeast } from "@/lib/auth";
import SubmitButton from "../../SubmitButton";

export const dynamic = "force-dynamic";

const PRODUCT_STATUSES = ["draft", "active", "inactive", "retired"];
const UNIT_TYPES = ["per_night", "per_person", "per_day", "per_group", "per_booking"];

export default async function ProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staff = await getCurrentStaff();
  const canEdit = !!staff && roleAtLeast(staff.role, "administrator");
  const locale = await getLocale();

  const [product, categories, providers] = await Promise.all([
    prisma.travelProduct.findUnique({ where: { id }, include: { category: true, provider: true } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.provider.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!product) notFound();

  const attributeSchema = JSON.parse(product.category.attributeSchema) as { name: string; type: string }[];

  return (
    <div>
      <Link href="/products" style={{ fontSize: "0.85rem", textDecoration: "underline" }}>{t(locale, "backToProductsLink")}</Link>
      <h1 style={{ fontSize: "1.5rem", marginTop: 10, marginBottom: 4 }}>{localized(locale, product.name, product.nameFr)}</h1>
      <p className="muted" style={{ fontSize: "0.82rem", marginBottom: 18 }}>
        {t(locale, "colProvider")}: <b>{product.provider.name}</b> ({statusLabel(locale, product.provider.sourceKind)})
      </p>

      {/* Keyed on updatedAt: an in-place Server Action save (no redirect) revalidates the RSC tree
          without a full page reload, and React only applies defaultValue on initial mount — same
          key means the same DOM node survives, so a changed provider/category/price would
          otherwise still show the pre-save selection until a manual reload. Same fix as the Quote
          Builder's line-row remount (see that file's comment) applied to this form as a whole. */}
      <form key={product.updatedAt.toISOString()} action={updateProduct} className="card pad" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <input type="hidden" name="id" value={product.id} />
        {/* Read-only for anyone below Administrator — one attribute disables every field and the
            submit button at once, rather than repeating a role check per input. The action itself
            still enforces this independently; this is purely so the form doesn't look editable
            when it isn't. */}
        <fieldset disabled={!canEdit} style={{ display: "contents", border: "none" }}>
        <label style={{ fontSize: "0.8rem" }}>
          <div className="muted">{t(locale, "productNameLabel")}</div>
          <input type="text" name="name" defaultValue={product.name} required />
        </label>
        <label style={{ fontSize: "0.8rem" }}>
          <div className="muted">{t(locale, "productNameFrLabel")}</div>
          <input type="text" name="nameFr" defaultValue={product.nameFr ?? ""} />
        </label>
        <label style={{ fontSize: "0.8rem" }}>
          <div className="muted">{t(locale, "categoryLabel")}</div>
          <select name="categoryId" defaultValue={product.categoryId} required>
            {categories.map((c) => <option key={c.id} value={c.id}>{localized(locale, c.name, c.nameFr)}</option>)}
          </select>
        </label>
        <label style={{ fontSize: "0.8rem" }}>
          {/* This select is the doctrine's "moving a product in-house is a data change" operation,
              made real: re-pointing a product's provider is exactly changing this one value. */}
          <div className="muted">{t(locale, "colProvider")}</div>
          <select name="providerId" defaultValue={product.providerId} required>
            {providers.map((p) => <option key={p.id} value={p.id}>{p.name} ({statusLabel(locale, p.sourceKind)})</option>)}
          </select>
        </label>
        <label style={{ fontSize: "0.8rem" }}>
          <div className="muted">{t(locale, "colStatus")}</div>
          <select name="status" defaultValue={product.status}>
            {PRODUCT_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(locale, s)}</option>)}
          </select>
        </label>
        <label style={{ fontSize: "0.8rem" }}>
          <div className="muted">{t(locale, "unitTypeLabel")}</div>
          <select name="unitType" defaultValue={product.unitType ?? ""}>
            <option value="">—</option>
            {UNIT_TYPES.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </label>
        <label style={{ fontSize: "0.8rem" }}>
          <div className="muted">{t(locale, "baseCurrencyLabel")}</div>
          <input type="text" name="baseCurrency" defaultValue={product.baseCurrency ?? ""} style={{ width: 70 }} />
        </label>
        <label style={{ fontSize: "0.8rem" }}>
          <div className="muted">{t(locale, "netCostLabel")}</div>
          <input type="number" name="defaultNetCost" step="0.01" style={{ width: 90 }} defaultValue={product.defaultNetCostMinor != null ? product.defaultNetCostMinor / 100 : ""} />
        </label>
        <label style={{ fontSize: "0.8rem" }}>
          <div className="muted">{t(locale, "sellingPriceLabel")}</div>
          <input type="number" name="defaultSellingPrice" step="0.01" style={{ width: 90 }} defaultValue={product.defaultSellingPriceMinor != null ? product.defaultSellingPriceMinor / 100 : ""} />
        </label>
        <label style={{ fontSize: "0.8rem", flex: "1 1 260px" }}>
          <div className="muted">{t(locale, "shortDescriptionLabel")}</div>
          <input type="text" name="shortDescription" defaultValue={product.shortDescription ?? ""} style={{ width: "100%" }} />
        </label>
        <label style={{ fontSize: "0.8rem", flex: "1 1 260px" }}>
          <div className="muted">{t(locale, "shortDescriptionFrLabel")}</div>
          <input type="text" name="shortDescriptionFr" defaultValue={product.shortDescriptionFr ?? ""} style={{ width: "100%" }} />
        </label>
        <label style={{ fontSize: "0.8rem", flex: "1 1 100%" }}>
          <div className="muted">
            {t(locale, "attributesLabel")}
            {attributeSchema.length > 0 && (
              <span> — {t(locale, "attributesHint")}: {attributeSchema.map((f) => `${f.name} (${f.type})`).join(", ")}</span>
            )}
          </div>
          <textarea name="attributes" rows={3} style={{ width: "100%", fontFamily: "monospace", fontSize: "0.78rem" }} defaultValue={product.attributes ? JSON.stringify(JSON.parse(product.attributes), null, 2) : ""} />
        </label>
        <SubmitButton pendingLabel={t(locale, "savingButton")}>{t(locale, "saveButton")}</SubmitButton>
        </fieldset>
      </form>
    </div>
  );
}
