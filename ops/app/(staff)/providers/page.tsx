import { prisma } from "@/lib/db";
import Link from "next/link";
import { createProvider } from "./actions";
import { getLocale, statusLabel, t } from "@/lib/i18n";
import { getCurrentStaff } from "@/lib/session";
import { roleAtLeast } from "@/lib/auth";
import SubmitButton from "../SubmitButton";

export const dynamic = "force-dynamic";

const RELATIONSHIP_TIERS = ["preferred", "contracted", "spot", "seasonal"];
const PROVIDER_STATUSES = ["active", "inactive", "onboarding", "seasonal"];

export default async function ProvidersPage() {
  const staff = await getCurrentStaff();
  const canEdit = !!staff && roleAtLeast(staff.role, "administrator");
  const locale = await getLocale();
  const providers = await prisma.provider.findMany({
    include: { _count: { select: { travelProducts: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: "1.6rem" }}>{t(locale, "providersTitle")}</h1>
        <p className="muted" style={{ marginTop: 4 }}>{t(locale, "providersSubtitle")}</p>
      </div>

      {canEdit && (
      <div className="card pad" style={{ marginBottom: 18 }}>
        <details>
          <summary style={{ cursor: "pointer", fontSize: "0.95rem", fontWeight: 600 }}>{t(locale, "newProviderHeading")}</summary>
          <form action={createProvider} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginTop: 14 }}>
            <label style={{ fontSize: "0.8rem" }}>
              <div className="muted">{t(locale, "providerNameLabel")}</div>
              <input type="text" name="name" required autoFocus />
            </label>
            <label style={{ fontSize: "0.8rem" }}>
              <div className="muted">{t(locale, "colSource")}</div>
              <select name="sourceKind" defaultValue="external">
                <option value="internal">{statusLabel(locale, "internal")}</option>
                <option value="external">{statusLabel(locale, "external")}</option>
              </select>
            </label>
            <label style={{ fontSize: "0.8rem" }}>
              <div className="muted">{t(locale, "providerTypesLabel")}</div>
              <input type="text" name="providerTypes" placeholder="Hotel, Tour operator" />
            </label>
            <label style={{ fontSize: "0.8rem" }}>
              <div className="muted">{t(locale, "contactNameLabel")}</div>
              <input type="text" name="contactName" />
            </label>
            <label style={{ fontSize: "0.8rem" }}>
              <div className="muted">{t(locale, "contactEmailLabel")}</div>
              <input type="email" name="contactEmail" />
            </label>
            <label style={{ fontSize: "0.8rem" }}>
              <div className="muted">{t(locale, "contactPhoneLabel")}</div>
              <input type="text" name="contactPhone" />
            </label>
            <label style={{ fontSize: "0.8rem" }}>
              <div className="muted">{t(locale, "commissionPercentLabel")}</div>
              <input type="number" name="commissionPercent" step="0.1" style={{ width: 80 }} />
            </label>
            <label style={{ fontSize: "0.8rem" }}>
              <div className="muted">{t(locale, "paymentTermsLabel")}</div>
              <input type="text" name="paymentTerms" placeholder="e.g. Net 30" style={{ width: 120 }} />
            </label>
            <label style={{ fontSize: "0.8rem" }}>
              <div className="muted">{t(locale, "relationshipTierLabel")}</div>
              <select name="relationshipTier" defaultValue="">
                <option value="">—</option>
                {RELATIONSHIP_TIERS.map((r) => <option key={r} value={r}>{statusLabel(locale, r)}</option>)}
              </select>
            </label>
            <label style={{ fontSize: "0.8rem" }}>
              <div className="muted">{t(locale, "colStatus")}</div>
              <select name="status" defaultValue="active">
                {PROVIDER_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(locale, s)}</option>)}
              </select>
            </label>
            <SubmitButton pendingLabel={t(locale, "savingButton")}>{t(locale, "createButton")}</SubmitButton>
          </form>
        </details>
      </div>
      )}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>{t(locale, "colProviderName")}</th>
              <th>{t(locale, "colTypes")}</th>
              <th>{t(locale, "colSource")}</th>
              <th>{t(locale, "colProducts")}</th>
              <th>{t(locale, "colStatus")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {providers.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.name}</td>
                <td className="muted">{JSON.parse(p.providerTypes).join(", ")}</td>
                <td>
                  <span className={`badge ${p.sourceKind === "internal" ? "int" : "ext"}`}>{statusLabel(locale, p.sourceKind)}</span>
                </td>
                <td>{p._count.travelProducts}</td>
                <td className="muted">{statusLabel(locale, p.status)}</td>
                <td><Link href={`/providers/${p.id}`} className="btn">{t(locale, "editButton")}</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
