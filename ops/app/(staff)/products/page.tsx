import { prisma } from "@/lib/db";
import Link from "next/link";
import { formatMinor } from "@/lib/money";
import { createProduct } from "./actions";
import { getLocale, localized, statusLabel, t } from "@/lib/i18n";
import { getCurrentStaff } from "@/lib/session";
import { roleAtLeast } from "@/lib/auth";
import SubmitButton from "../SubmitButton";

export const dynamic = "force-dynamic";

const PRODUCT_STATUSES = ["draft", "active", "inactive", "retired"];
const UNIT_TYPES = ["per_night", "per_person", "per_day", "per_group", "per_booking"];

// Generic renderer over whatever a category's attributeSchema puts in `attributes` — a Hotel's
// city/roomType and a Guide's languages/certification render through the exact same code path.
// This is the concrete proof that adding a new category is a data change, not a schema change:
// nothing here is category-specific. Attribute KEYS stay in English (they're internal field
// names, not customer-facing copy) — see architecture/03_KNOWN_ARCHITECTURAL_LIMITATIONS.md §2.
function AttributesSummary({ attributes }: { attributes: string | null }) {
  if (!attributes) return <span className="muted">—</span>;
  const parsed = JSON.parse(attributes) as Record<string, unknown>;
  const entries = Object.entries(parsed).filter(([, v]) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0));
  if (entries.length === 0) return <span className="muted">—</span>;
  return (
    <div className="muted" style={{ fontSize: "0.76rem", lineHeight: 1.5 }}>
      {entries.map(([key, value]) => (
        <div key={key}>
          <b>{key}:</b> {Array.isArray(value) ? value.join(", ") : String(value)}
        </div>
      ))}
    </div>
  );
}

export default async function ProductsPage() {
  const staff = await getCurrentStaff();
  const canEdit = !!staff && roleAtLeast(staff.role, "administrator");
  const locale = await getLocale();
  const [products, categories, providers] = await Promise.all([
    prisma.travelProduct.findMany({
      include: { category: true, provider: true },
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.provider.findMany({ orderBy: { name: "asc" } }),
  ]);

  const byCategory = new Map<string, { label: string; items: typeof products }>();
  for (const p of products) {
    const key = p.category.id;
    const entry = byCategory.get(key) ?? { label: localized(locale, p.category.name, p.category.nameFr), items: [] };
    entry.items.push(p);
    byCategory.set(key, entry);
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: "1.6rem" }}>{t(locale, "productsTitle")}</h1>
        <p className="muted" style={{ marginTop: 4 }}>{t(locale, "productsSubtitle")}</p>
      </div>

      {canEdit && (
      <div className="card pad" style={{ marginBottom: 18 }}>
        <details>
          <summary style={{ cursor: "pointer", fontSize: "0.95rem", fontWeight: 600 }}>{t(locale, "newProductHeading")}</summary>
          <form action={createProduct} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginTop: 14 }}>
            <label style={{ fontSize: "0.8rem" }}>
              <div className="muted">{t(locale, "productNameLabel")}</div>
              <input type="text" name="name" required autoFocus />
            </label>
            <label style={{ fontSize: "0.8rem" }}>
              <div className="muted">{t(locale, "productNameFrLabel")}</div>
              <input type="text" name="nameFr" />
            </label>
            <label style={{ fontSize: "0.8rem" }}>
              <div className="muted">{t(locale, "categoryLabel")}</div>
              <select name="categoryId" required defaultValue="">
                <option value="" disabled>—</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{localized(locale, c.name, c.nameFr)}</option>)}
              </select>
            </label>
            <label style={{ fontSize: "0.8rem" }}>
              <div className="muted">{t(locale, "colProvider")}</div>
              <select name="providerId" required defaultValue="">
                <option value="" disabled>—</option>
                {providers.map((p) => <option key={p.id} value={p.id}>{p.name} ({statusLabel(locale, p.sourceKind)})</option>)}
              </select>
            </label>
            <label style={{ fontSize: "0.8rem" }}>
              <div className="muted">{t(locale, "colStatus")}</div>
              <select name="status" defaultValue="draft">
                {PRODUCT_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(locale, s)}</option>)}
              </select>
            </label>
            <label style={{ fontSize: "0.8rem" }}>
              <div className="muted">{t(locale, "unitTypeLabel")}</div>
              <select name="unitType" defaultValue="">
                <option value="">—</option>
                {UNIT_TYPES.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </label>
            <label style={{ fontSize: "0.8rem" }}>
              <div className="muted">{t(locale, "baseCurrencyLabel")}</div>
              <input type="text" name="baseCurrency" placeholder="MAD" style={{ width: 70 }} />
            </label>
            <label style={{ fontSize: "0.8rem" }}>
              <div className="muted">{t(locale, "netCostLabel")}</div>
              <input type="number" name="defaultNetCost" step="0.01" style={{ width: 90 }} />
            </label>
            <label style={{ fontSize: "0.8rem" }}>
              <div className="muted">{t(locale, "sellingPriceLabel")}</div>
              <input type="number" name="defaultSellingPrice" step="0.01" style={{ width: 90 }} />
            </label>
            <label style={{ fontSize: "0.8rem", flex: "1 1 260px" }}>
              <div className="muted">{t(locale, "shortDescriptionLabel")}</div>
              <input type="text" name="shortDescription" style={{ width: "100%" }} />
            </label>
            <label style={{ fontSize: "0.8rem", flex: "1 1 260px" }}>
              <div className="muted">{t(locale, "shortDescriptionFrLabel")}</div>
              <input type="text" name="shortDescriptionFr" style={{ width: "100%" }} />
            </label>
            <label style={{ fontSize: "0.8rem", flex: "1 1 100%" }}>
              <div className="muted">{t(locale, "attributesLabel")}</div>
              <textarea name="attributes" rows={2} style={{ width: "100%", fontFamily: "monospace", fontSize: "0.78rem" }} placeholder='{"city": "Marrakech"}' />
            </label>
            <SubmitButton pendingLabel={t(locale, "savingButton")}>{t(locale, "createButton")}</SubmitButton>
          </form>

          <details style={{ marginTop: 10 }}>
            <summary className="muted" style={{ cursor: "pointer", fontSize: "0.76rem" }}>{t(locale, "attributesHint")}</summary>
            <div className="muted" style={{ fontSize: "0.74rem", marginTop: 6, lineHeight: 1.7 }}>
              {categories.map((c) => (
                <div key={c.id}>
                  <b>{localized(locale, c.name, c.nameFr)}:</b>{" "}
                  {(JSON.parse(c.attributeSchema) as { name: string; type: string }[]).map((f) => `${f.name} (${f.type})`).join(", ") || "—"}
                </div>
              ))}
            </div>
          </details>
        </details>
      </div>
      )}

      {Array.from(byCategory.entries()).map(([categoryId, { label, items }]) => (
        <div key={categoryId} className="card" style={{ marginBottom: 16 }}>
          <div className="pad" style={{ borderBottom: "1px solid var(--color-border)" }}>
            <h3>{label} <span className="muted" style={{ fontSize: "0.8rem", fontWeight: 400 }}>({items.length})</span></h3>
          </div>
          <table>
            <thead>
              <tr>
                <th>{t(locale, "colProduct")}</th>
                <th>{t(locale, "colAttributes")}</th>
                <th>{t(locale, "colProvider")}</th>
                <th>{t(locale, "colSource")}</th>
                <th>{t(locale, "colNetCost")}</th>
                <th>{t(locale, "colStatus")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{localized(locale, p.name, p.nameFr)}</div>
                    {p.shortDescription && (
                      <div className="muted" style={{ fontSize: "0.78rem", maxWidth: 380 }}>
                        {localized(locale, p.shortDescription, p.shortDescriptionFr)}
                      </div>
                    )}
                  </td>
                  <td style={{ maxWidth: 320 }}><AttributesSummary attributes={p.attributes} /></td>
                  <td>{p.provider.name}</td>
                  <td>
                    <span className={`badge ${p.provider.sourceKind === "internal" ? "int" : "ext"}`}>
                      {statusLabel(locale, p.provider.sourceKind)}
                    </span>
                  </td>
                  <td>{formatMinor(p.defaultNetCostMinor, p.baseCurrency ?? "MAD")}</td>
                  <td className="muted">{statusLabel(locale, p.status)}</td>
                  <td><Link href={`/products/${p.id}`} className="btn">{t(locale, "editButton")}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
