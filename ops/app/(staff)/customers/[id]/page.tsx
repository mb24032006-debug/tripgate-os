import { prisma } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createTripForExistingCustomer } from "../../trips/actions";
import { archiveCustomer } from "../actions";
import { computeTripStage } from "@/lib/pipeline";
import { getLocale, statusLabel, t } from "@/lib/i18n";
import SubmitButton from "../../SubmitButton";
import ConfirmSubmitButton from "../../ConfirmSubmitButton";

export const dynamic = "force-dynamic";

const CHANNEL_OPTIONS = ["phone", "whatsapp", "email", "website", "instagram"];
const REQUEST_TYPE_OPTIONS = ["tailor_made", "omra_hajj", "business_travel", "tour"];

// The single screen the Operational Inspection's §6 found missing entirely: one person, their
// contact details, and every trip they've ever had — 2026's tailor-made Morocco trip, 2027's Omra,
// 2028's business travel — grouped instead of discovered "only by coincidence, through a free-text
// search that returns two visually identical rows." Nothing here is new data: every field was
// already being captured on Trip/Lead/Customer, just never grouped by the customer they belong to.
export default async function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      trips: {
        include: {
          lead: true,
          requirement: true,
          quotes: { select: { status: true, validUntil: true } },
          bookings: { select: { status: true } },
          supportTickets: { select: { status: true, priority: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!customer) notFound();

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: "1.6rem" }}>{customer.name}</h1>
        <p className="muted" style={{ marginTop: 4 }}>
          {customer.email ?? "—"}{customer.phone ? ` · ${customer.phone}` : ""} · {t(locale, "customerSinceLabel")} {customer.createdAt.getFullYear()}
        </p>
      </div>

      <div className="card pad fade-in" style={{ marginBottom: 18 }}>
        <h3 style={{ marginBottom: 10, fontSize: "1rem" }}>{t(locale, "newTripHeading")}</h3>
        <form action={createTripForExistingCustomer} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <input type="hidden" name="customerId" value={customer.id} />
          <label style={{ fontSize: "0.8rem" }}>
            <div className="muted">{t(locale, "colChannel")}</div>
            <select name="channel" defaultValue="phone">
              {CHANNEL_OPTIONS.map((c) => (
                <option key={c} value={c}>{statusLabel(locale, c)}</option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: "0.8rem" }}>
            <div className="muted">{t(locale, "requestTypeLabel")}</div>
            <select name="requestType" defaultValue="">
              <option value="">—</option>
              {REQUEST_TYPE_OPTIONS.map((rt) => (
                <option key={rt} value={rt}>{statusLabel(locale, rt)}</option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: "0.8rem" }}>
            <div className="muted">{t(locale, "destinationsCommaLabel")}</div>
            <input type="text" name="destinations" placeholder="Marrakech, Sahara" />
          </label>
          <SubmitButton pendingLabel={t(locale, "savingButton")}>{t(locale, "newTripForCustomerButton")}</SubmitButton>
        </form>
      </div>

      <div className="card">
        <div className="pad" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <h3>{t(locale, "tripHistoryHeading")} <span className="muted" style={{ fontSize: "0.78rem", fontWeight: 400 }}>({customer.trips.length})</span></h3>
        </div>
        {customer.trips.length === 0 ? (
          <div className="pad muted">{t(locale, "noOtherTripsForCustomer")}</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t(locale, "referenceLabel")}</th>
                <th>{t(locale, "colYear")}</th>
                <th>{t(locale, "colRequestType")}</th>
                <th>{t(locale, "colDestinations")}</th>
                <th>{t(locale, "stageLabel")}</th>
                <th>{t(locale, "colQuotes")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customer.trips.map((trip) => {
                const destinations: string[] = trip.requirement?.destinations ? JSON.parse(trip.requirement.destinations) : [];
                return (
                  <tr key={trip.id}>
                    <td className="muted" style={{ whiteSpace: "nowrap" }}>
                      {trip.reference ?? "—"}
                      {trip.archivedAt && (
                        <span className="badge" style={{ marginLeft: 6, fontSize: "0.62rem", background: "var(--color-neutral-100)", color: "var(--color-neutral-600)" }}>
                          {t(locale, "archivedWord")}
                        </span>
                      )}
                    </td>
                    <td className="muted">{trip.createdAt.getFullYear()}</td>
                    <td className="muted">
                      {trip.lead?.requestType ? (
                        statusLabel(locale, trip.lead.requestType)
                      ) : (
                        <span style={{ fontStyle: "italic" }}>{t(locale, "requestTypeUnclassified")}</span>
                      )}
                    </td>
                    <td className="muted">{destinations.length ? destinations.join(", ") : "—"}</td>
                    <td className="muted">{statusLabel(locale, computeTripStage(trip))}</td>
                    <td className="muted">{trip.quotes.length}</td>
                    <td><Link href={`/trips/${trip.id}`} className="btn">{t(locale, "openButton")}</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="card pad" style={{ marginTop: 24, borderColor: "var(--color-danger)" }}>
        <h4 style={{ fontSize: "0.85rem", marginBottom: 6, color: "var(--color-danger)" }}>{t(locale, "dangerZoneHeading")}</h4>
        <p className="muted" style={{ fontSize: "0.78rem", marginBottom: 10 }}>{t(locale, "archiveCustomerWarning")}</p>
        <form action={archiveCustomer}>
          <input type="hidden" name="customerId" value={customer.id} />
          <ConfirmSubmitButton className="btn btn-danger" confirmMessage={t(locale, "archiveCustomerConfirm")}>
            {t(locale, "archiveCustomerButton")}
          </ConfirmSubmitButton>
        </form>
      </div>
    </div>
  );
}
