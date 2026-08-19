import { prisma } from "@/lib/db";
import Link from "next/link";
import { getLocale, t } from "@/lib/i18n";
import { getCurrentStaff } from "@/lib/session";
import { roleAtLeast } from "@/lib/auth";
import { restoreTrip, permanentlyDeleteTrip } from "../trips/actions";
import { restoreCustomer, permanentlyDeleteCustomer } from "../customers/actions";
import SubmitButton from "../SubmitButton";
import ConfirmSubmitButton from "../ConfirmSubmitButton";

export const dynamic = "force-dynamic";

// Everything soft-deleted, in one place — restore is available to anyone who could archive it in
// the first place (any signed-in staff member); permanent deletion is Administrator-only and only
// reachable from here, never in one step from a live record (see permanentlyDeleteTrip/Customer's
// own comments).
export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ archiveError?: string }>;
}) {
  const staff = await getCurrentStaff();
  const canPermanentlyDelete = !!staff && roleAtLeast(staff.role, "administrator");
  const locale = await getLocale();
  const { archiveError } = await searchParams;

  const [trips, customers] = await Promise.all([
    prisma.trip.findMany({
      where: { archivedAt: { not: null } },
      include: { customer: true },
      orderBy: { archivedAt: "desc" },
    }),
    prisma.customer.findMany({
      where: { archivedAt: { not: null } },
      include: { _count: { select: { trips: true } } },
      orderBy: { archivedAt: "desc" },
    }),
  ]);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: "1.6rem" }}>{t(locale, "archivePageTitle")}</h1>
        <p className="muted" style={{ marginTop: 4 }}>{t(locale, "archivePageSubtitle")}</p>
      </div>

      {archiveError && (
        <p style={{ background: "var(--color-danger-soft)", color: "var(--color-danger)", padding: "8px 12px", borderRadius: 8, fontSize: "0.82rem", marginBottom: 18 }}>
          {t(locale, archiveError === "customerHasTrips" ? "archiveErrorCustomerHasTrips" : "archiveErrorNotArchived")}
        </p>
      )}

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="pad" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <h3>{t(locale, "archivedTripsHeading")} <span className="muted" style={{ fontSize: "0.78rem", fontWeight: 400 }}>({trips.length})</span></h3>
        </div>
        {trips.length === 0 ? (
          <div className="pad muted">{t(locale, "noArchivedTrips")}</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t(locale, "referenceLabel")}</th>
                <th>{t(locale, "colCustomer")}</th>
                <th>{t(locale, "archivedAtLabel")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {trips.map((trip) => (
                <tr key={trip.id}>
                  <td className="muted" style={{ whiteSpace: "nowrap" }}>{trip.reference ?? "—"}</td>
                  <td style={{ fontWeight: 600 }}>
                    <Link href={`/trips/${trip.id}`} style={{ textDecoration: "underline" }}>{trip.customer.name}</Link>
                  </td>
                  <td className="muted">{trip.archivedAt?.toLocaleDateString()}</td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <form action={restoreTrip}>
                      <input type="hidden" name="tripId" value={trip.id} />
                      <SubmitButton className="btn" pendingLabel={t(locale, "savingButton")}>{t(locale, "restoreTripButton")}</SubmitButton>
                    </form>
                    {canPermanentlyDelete && (
                      <form action={permanentlyDeleteTrip}>
                        <input type="hidden" name="tripId" value={trip.id} />
                        <ConfirmSubmitButton className="btn btn-danger" confirmMessage={t(locale, "permanentlyDeleteTripConfirm")}>
                          {t(locale, "permanentlyDeleteButton")}
                        </ConfirmSubmitButton>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="pad" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <h3>{t(locale, "archivedCustomersHeading")} <span className="muted" style={{ fontSize: "0.78rem", fontWeight: 400 }}>({customers.length})</span></h3>
        </div>
        {customers.length === 0 ? (
          <div className="pad muted">{t(locale, "noArchivedCustomers")}</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t(locale, "colCustomer")}</th>
                <th>{t(locale, "trips")}</th>
                <th>{t(locale, "archivedAtLabel")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>
                    <Link href={`/customers/${c.id}`} style={{ textDecoration: "underline" }}>{c.name}</Link>
                  </td>
                  <td className="muted">{c._count.trips}</td>
                  <td className="muted">{c.archivedAt?.toLocaleDateString()}</td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <form action={restoreCustomer}>
                      <input type="hidden" name="customerId" value={c.id} />
                      <SubmitButton className="btn" pendingLabel={t(locale, "savingButton")}>{t(locale, "restoreTripButton")}</SubmitButton>
                    </form>
                    {canPermanentlyDelete && (
                      <form action={permanentlyDeleteCustomer}>
                        <input type="hidden" name="customerId" value={c.id} />
                        <ConfirmSubmitButton className="btn btn-danger" confirmMessage={t(locale, "permanentlyDeleteCustomerConfirm")}>
                          {t(locale, "permanentlyDeleteButton")}
                        </ConfirmSubmitButton>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
