import { prisma } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateProvider } from "../actions";
import { getLocale, localized, statusLabel, t } from "@/lib/i18n";
import { getCurrentStaff } from "@/lib/session";
import { roleAtLeast } from "@/lib/auth";
import SubmitButton from "../../SubmitButton";

export const dynamic = "force-dynamic";

const RELATIONSHIP_TIERS = ["preferred", "contracted", "spot", "seasonal"];
const PROVIDER_STATUSES = ["active", "inactive", "onboarding", "seasonal"];

export default async function ProviderEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staff = await getCurrentStaff();
  const canEdit = !!staff && roleAtLeast(staff.role, "administrator");
  const locale = await getLocale();

  const provider = await prisma.provider.findUnique({
    where: { id },
    include: { travelProducts: { include: { category: true } } },
  });
  if (!provider) notFound();

  const terms = provider.commercialTerms ? JSON.parse(provider.commercialTerms) : {};

  return (
    <div>
      <Link href="/providers" style={{ fontSize: "0.85rem", textDecoration: "underline" }}>{t(locale, "backToProvidersLink")}</Link>
      <h1 style={{ fontSize: "1.5rem", marginTop: 10, marginBottom: 18 }}>{provider.name}</h1>

      {/* Keyed on updatedAt — see the identical comment in products/[id]/page.tsx. */}
      <form key={provider.updatedAt.toISOString()} action={updateProvider} className="card pad" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 18 }}>
        <input type="hidden" name="id" value={provider.id} />
        <fieldset disabled={!canEdit} style={{ display: "contents", border: "none" }}>
        <label style={{ fontSize: "0.8rem" }}>
          <div className="muted">{t(locale, "providerNameLabel")}</div>
          <input type="text" name="name" defaultValue={provider.name} required />
        </label>
        <label style={{ fontSize: "0.8rem" }}>
          <div className="muted">{t(locale, "colSource")}</div>
          <select name="sourceKind" defaultValue={provider.sourceKind}>
            <option value="internal">{statusLabel(locale, "internal")}</option>
            <option value="external">{statusLabel(locale, "external")}</option>
          </select>
        </label>
        <label style={{ fontSize: "0.8rem" }}>
          <div className="muted">{t(locale, "providerTypesLabel")}</div>
          <input type="text" name="providerTypes" defaultValue={JSON.parse(provider.providerTypes).join(", ")} />
        </label>
        <label style={{ fontSize: "0.8rem" }}>
          <div className="muted">{t(locale, "contactNameLabel")}</div>
          <input type="text" name="contactName" defaultValue={provider.contactName ?? ""} />
        </label>
        <label style={{ fontSize: "0.8rem" }}>
          <div className="muted">{t(locale, "contactEmailLabel")}</div>
          <input type="email" name="contactEmail" defaultValue={provider.contactEmail ?? ""} />
        </label>
        <label style={{ fontSize: "0.8rem" }}>
          <div className="muted">{t(locale, "contactPhoneLabel")}</div>
          <input type="text" name="contactPhone" defaultValue={provider.contactPhone ?? ""} />
        </label>
        <label style={{ fontSize: "0.8rem" }}>
          <div className="muted">{t(locale, "commissionPercentLabel")}</div>
          <input type="number" name="commissionPercent" step="0.1" style={{ width: 80 }} defaultValue={terms.commissionPercent ?? ""} />
        </label>
        <label style={{ fontSize: "0.8rem" }}>
          <div className="muted">{t(locale, "paymentTermsLabel")}</div>
          <input type="text" name="paymentTerms" style={{ width: 120 }} defaultValue={terms.paymentTerms ?? ""} />
        </label>
        <label style={{ fontSize: "0.8rem", flex: "1 1 220px" }}>
          <div className="muted">{t(locale, "notesLabel")}</div>
          <input type="text" name="commercialNotes" style={{ width: "100%" }} defaultValue={terms.notes ?? ""} />
        </label>
        <label style={{ fontSize: "0.8rem" }}>
          <div className="muted">{t(locale, "relationshipTierLabel")}</div>
          <select name="relationshipTier" defaultValue={provider.relationshipTier ?? ""}>
            <option value="">—</option>
            {RELATIONSHIP_TIERS.map((r) => <option key={r} value={r}>{statusLabel(locale, r)}</option>)}
          </select>
        </label>
        <label style={{ fontSize: "0.8rem" }}>
          <div className="muted">{t(locale, "colStatus")}</div>
          <select name="status" defaultValue={provider.status}>
            {PROVIDER_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(locale, s)}</option>)}
          </select>
        </label>
        <SubmitButton pendingLabel={t(locale, "savingButton")}>{t(locale, "saveButton")}</SubmitButton>
        </fieldset>
      </form>

      <div className="card">
        <div className="pad" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <h3 style={{ fontSize: "0.95rem" }}>{t(locale, "colProducts")} ({provider.travelProducts.length})</h3>
        </div>
        {provider.travelProducts.length === 0 ? (
          <div className="pad muted">—</div>
        ) : (
          <table>
            <tbody>
              {provider.travelProducts.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{localized(locale, p.name, p.nameFr)}</td>
                  <td className="muted">{localized(locale, p.category.name, p.category.nameFr)}</td>
                  <td><Link href={`/products/${p.id}`} className="btn">{t(locale, "editButton")}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
