import { prisma } from "@/lib/db";
import Link from "next/link";
import { createTrip } from "./actions";
import { getLocale, statusLabel, t } from "@/lib/i18n";
import { computeTripStage, computeTripFlags } from "@/lib/pipeline";
import { getSettings } from "@/lib/settings";
import { getCurrentStaff } from "@/lib/session";
import { roleAtLeast } from "@/lib/auth";
import SubmitButton from "../SubmitButton";

export const dynamic = "force-dynamic";

const FILTERS = ["all", "awaiting_reply", "inactive", "unconfirmed_booking", "expiring_soon", "blocked", "needs_follow_up", "payment_overdue"] as const;
type Filter = (typeof FILTERS)[number];

const REQUEST_TYPES = ["tailor_made", "omra_hajj", "business_travel", "tour"] as const;

export default async function TripsPage({ searchParams }: { searchParams: Promise<{ filter?: string; type?: string }> }) {
  const staff = await getCurrentStaff();
  const locale = await getLocale();
  const { enabledModules } = await getSettings();
  const { filter: filterRaw, type: typeRaw } = await searchParams;
  const filter: Filter = FILTERS.includes(filterRaw as Filter) ? (filterRaw as Filter) : "all";
  const requestType = REQUEST_TYPES.includes(typeRaw as (typeof REQUEST_TYPES)[number]) ? typeRaw : undefined;

  // "View all trips" is a Manager+ capability per the founder's role spec — an Agent's working
  // list is scoped to trips assigned to them. New, not-yet-assigned enquiries still surface for
  // everyone via the Lead Inbox, which isn't scoped — this filter is about ongoing casework
  // ownership, not about hiding unclaimed work from whoever could pick it up.
  const scopedToOwnTrips = !!staff && !roleAtLeast(staff.role, "manager");

  const trips = await prisma.trip.findMany({
    where: { archivedAt: null, ...(scopedToOwnTrips ? { ownerId: staff!.id } : {}) },
    include: {
      customer: true,
      requirement: true,
      lead: true,
      quotes: { select: { status: true, validUntil: true } },
      bookings: { select: { status: true } },
      supportTickets: { select: { status: true, priority: true } },
      payments: { select: { direction: true, dueDate: true, paidDate: true } },
      _count: { select: { quotes: true, bookings: true, documents: true, payments: true, supportTickets: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const now = new Date();
  const withFlags = trips.map((trip) => ({ trip, flags: computeTripFlags(trip, now) }));

  const counts = {
    awaiting_reply: withFlags.filter((x) => x.flags.awaitingReply).length,
    inactive: withFlags.filter((x) => x.flags.inactive7d).length,
    unconfirmed_booking: withFlags.filter((x) => x.flags.bookingUnconfirmed).length,
    expiring_soon: withFlags.filter((x) => x.flags.quoteExpiringSoon).length,
    blocked: withFlags.filter((x) => x.flags.blocked).length,
    needs_follow_up: withFlags.filter((x) => x.flags.needsFollowUp).length,
    payment_overdue: withFlags.filter((x) => x.flags.paymentOverdue).length,
  };

  const visible = withFlags.filter(({ trip, flags }) => {
    if (requestType && trip.lead?.requestType !== requestType) return false;
    if (filter === "all") return true;
    if (filter === "awaiting_reply") return flags.awaitingReply;
    if (filter === "inactive") return flags.inactive7d;
    if (filter === "unconfirmed_booking") return flags.bookingUnconfirmed;
    if (filter === "expiring_soon") return flags.quoteExpiringSoon;
    if (filter === "blocked") return flags.blocked;
    if (filter === "needs_follow_up") return flags.needsFollowUp;
    if (filter === "payment_overdue") return flags.paymentOverdue;
    return true;
  });

  const filterTabs: { key: Filter; label: string; count?: number }[] = [
    { key: "all", label: t(locale, "filterAll") },
    { key: "awaiting_reply", label: t(locale, "filterAwaitingReply"), count: counts.awaiting_reply },
    { key: "inactive", label: t(locale, "filterInactive"), count: counts.inactive },
    { key: "unconfirmed_booking", label: t(locale, "filterUnconfirmedBooking"), count: counts.unconfirmed_booking },
    { key: "expiring_soon", label: t(locale, "filterExpiringSoon"), count: counts.expiring_soon },
    { key: "blocked", label: t(locale, "filterBlocked"), count: counts.blocked },
    { key: "needs_follow_up", label: t(locale, "filterNeedsFollowUp"), count: counts.needs_follow_up },
    { key: "payment_overdue", label: t(locale, "filterPaymentOverdue"), count: counts.payment_overdue },
  ];

  // A second, independent filter axis — "what kind of trip is this" rather than "what does it
  // need right now" — so the two can be combined (e.g. Omra & Hajj + Blocked).
  const requestTypeCounts = REQUEST_TYPES.map((rt) => ({
    key: rt,
    count: withFlags.filter(({ trip }) => trip.lead?.requestType === rt).length,
  }));
  const requestTypeTabs: { key: string | undefined; label: string; count?: number }[] = [
    { key: undefined, label: t(locale, "filterAll") },
    ...requestTypeCounts.map((rt) => ({ key: rt.key as string | undefined, label: statusLabel(locale, rt.key), count: rt.count })),
  ];
  const buildHref = (nextFilter: Filter, nextType: string | undefined) => {
    const params = new URLSearchParams();
    if (nextFilter !== "all") params.set("filter", nextFilter);
    if (nextType) params.set("type", nextType);
    const qs = params.toString();
    return qs ? `/trips?${qs}` : "/trips";
  };

  // Was mislabeled "Walk-in / other" — a genuine website enquiry had no correct option, and every
  // walk-in was silently filed as "website" (Operational Inspection §1.2). "instagram" is the
  // fifth channel schema.prisma's own Lead.channel comment already documents; it just never made
  // it into this dropdown. Labels come from lib/i18n.ts's STATUS_LABELS — the single bilingual
  // source, not a second copy of the same words.
  const channelOptions = ["phone", "whatsapp", "email", "website", "instagram"];
  const requestTypeOptions = ["tailor_made", "omra_hajj", "business_travel", "tour"];

  const accommodationOptions = [
    { en: "3★ Comfort", fr: "3★ Confort" },
    { en: "4★ Premium", fr: "4★ Premium" },
    { en: "5★ Luxury", fr: "5★ Luxe" },
    { en: "Boutique Hotels", fr: "Hôtels-boutiques" },
    { en: "Riads", fr: "Riads" },
    { en: "No Preference", fr: "Sans préférence" },
  ];

  const formatActivity = (days: number) => (days <= 0 ? t(locale, "todayWord") : t(locale, "daysAgoTemplate", { n: String(days) }));

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: "1.6rem" }}>{t(locale, "trips")}</h1>
        <p className="muted" style={{ marginTop: 4 }}>{t(locale, "tripsSubtitle")}</p>
        {scopedToOwnTrips && <p className="muted" style={{ marginTop: 2, fontSize: "0.78rem" }}>{t(locale, "scopedToOwnTripsNote")}</p>}
      </div>

      <div className="card pad" style={{ marginBottom: 18 }}>
        <h3 style={{ marginBottom: 4, fontSize: "1rem" }}>{t(locale, "quickLeadHeading")}</h3>
        <p className="muted" style={{ fontSize: "0.8rem", marginBottom: 12 }}>{t(locale, "quickLeadHint")}</p>
        <form action={createTrip}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <label style={{ fontSize: "0.8rem" }}>
              <div className="muted">{t(locale, "customerNameLabel")}</div>
              <input type="text" name="customerName" required autoFocus />
            </label>
            <label style={{ fontSize: "0.8rem" }}>
              <div className="muted">{t(locale, "phoneLabel")}</div>
              <input type="tel" name="customerPhone" placeholder="+212 6…" />
            </label>
            <label style={{ fontSize: "0.8rem" }}>
              <div className="muted">{t(locale, "customerEmailLabel")} <span style={{ fontWeight: 400 }}>(optional)</span></div>
              <input type="email" name="customerEmail" />
            </label>
            <label style={{ fontSize: "0.8rem" }}>
              <div className="muted">{t(locale, "colChannel")}</div>
              <select name="channel" defaultValue="phone">
                {channelOptions.map((c) => (
                  <option key={c} value={c}>{statusLabel(locale, c)}</option>
                ))}
              </select>
            </label>
            <label style={{ fontSize: "0.8rem" }}>
              <div className="muted">{t(locale, "requestTypeLabel")}</div>
              <select name="requestType" defaultValue="">
                <option value="">—</option>
                {requestTypeOptions.map((rt) => (
                  <option key={rt} value={rt}>{statusLabel(locale, rt)}</option>
                ))}
              </select>
            </label>
            <SubmitButton pendingLabel={t(locale, "savingButton")}>{t(locale, "quickSaveButton")}</SubmitButton>
          </div>

          <details style={{ marginTop: 14 }}>
            <summary style={{ cursor: "pointer", fontSize: "0.82rem", color: "var(--color-int)", fontWeight: 600 }}>
              {t(locale, "fullDetailsToggle")}
            </summary>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginTop: 12 }}>
              <label style={{ fontSize: "0.8rem" }}>
                <div className="muted">{t(locale, "destinationsCommaLabel")}</div>
                <input type="text" name="destinations" placeholder="Marrakech, Sahara" />
              </label>
              <label style={{ fontSize: "0.8rem" }}>
                <div className="muted">{t(locale, "travelersLabel")}</div>
                <input type="number" name="travelerCount" style={{ width: 70 }} min={1} />
              </label>
              <label style={{ fontSize: "0.8rem" }}>
                <div className="muted">{t(locale, "tripLengthLabel")}</div>
                <input type="number" name="tripLengthDays" style={{ width: 90 }} min={1} />
              </label>
              <label style={{ fontSize: "0.8rem" }}>
                <div className="muted">{t(locale, "accommodationLabel")}</div>
                <select name="accommodationCategory" defaultValue="">
                  <option value="">—</option>
                  {accommodationOptions.map((o) => (
                    <option key={o.en} value={o.en}>{locale === "fr" ? o.fr : o.en}</option>
                  ))}
                </select>
              </label>
              <label style={{ fontSize: "0.8rem" }}>
                <div className="muted">{t(locale, "budgetBandLabel")}</div>
                <input type="text" name="budgetBand" placeholder="e.g. MAD 20-40k" />
              </label>
              <label style={{ fontSize: "0.8rem", flex: "1 1 220px" }}>
                <div className="muted">{t(locale, "notesLabel")}</div>
                <input type="text" name="notes" style={{ width: "100%" }} />
              </label>
            </div>
          </details>
        </form>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
        <span className="muted" style={{ fontSize: "0.8rem" }}>{t(locale, "filterLabel")}:</span>
        {filterTabs.map((tab) => (
          <Link
            key={tab.key}
            href={buildHref(tab.key, requestType)}
            className="btn"
            style={filter === tab.key ? { background: "var(--color-primary-blue-deep)", color: "#fff" } : undefined}
            title={
              tab.key === "blocked" ? t(locale, "blockedHint")
              : tab.key === "needs_follow_up" ? t(locale, "needsFollowUpHint")
              : tab.key === "payment_overdue" ? t(locale, "paymentOverdueHint")
              : undefined
            }
          >
            {tab.label}{tab.count != null ? ` (${tab.count})` : ""}
          </Link>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
        <span className="muted" style={{ fontSize: "0.8rem" }}>{t(locale, "requestTypeLabel")}:</span>
        {requestTypeTabs.map((tab) => (
          <Link
            key={tab.key ?? "all"}
            href={buildHref(filter, tab.key)}
            className="btn"
            style={requestType === tab.key ? { background: "var(--color-primary-blue-deep)", color: "#fff" } : undefined}
          >
            {tab.label}{tab.count != null ? ` (${tab.count})` : ""}
          </Link>
        ))}
      </div>
      {!enabledModules.payments && (
        <p className="muted" style={{ fontSize: "0.74rem", marginBottom: 14 }}>{t(locale, "paymentsNotTrackedNote")}</p>
      )}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>{t(locale, "referenceLabel")}</th>
              <th>{t(locale, "colCustomer")}</th>
              <th>{t(locale, "colRequestType")}</th>
              <th>{t(locale, "colDestinations")}</th>
              <th>{t(locale, "stageLabel")}</th>
              <th>{t(locale, "colLastActivity")}</th>
              <th>{t(locale, "colLead")}</th>
              <th>{t(locale, "colQuotes")}</th>
              <th>{t(locale, "colBooking")}</th>
              {enabledModules.documents && <th>{t(locale, "colDocs")}</th>}
              {enabledModules.payments && <th>{t(locale, "colPayments")}</th>}
              <th>{t(locale, "colSupport")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visible.map(({ trip: t2, flags }) => {
              const destinations: string[] = t2.requirement?.destinations ? JSON.parse(t2.requirement.destinations) : [];
              return (
                <tr key={t2.id}>
                  <td className="muted" style={{ whiteSpace: "nowrap" }}>{t2.reference ?? "—"}</td>
                  <td style={{ fontWeight: 600 }}>
                    <Link href={`/customers/${t2.customer.id}`} style={{ textDecoration: "underline" }}>{t2.customer.name}</Link>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                      {flags.blocked && <span className="badge ext" style={{ fontSize: "0.65rem" }}>{t(locale, "filterBlocked")}</span>}
                      {flags.quoteExpiringSoon && <span className="badge ext" style={{ fontSize: "0.65rem" }}>{t(locale, "filterExpiringSoon")}</span>}
                      {flags.bookingUnconfirmed && t2._count.bookings > 0 && (
                        <span className="badge ext" style={{ fontSize: "0.65rem" }}>{t(locale, "filterUnconfirmedBooking")}</span>
                      )}
                      {flags.needsFollowUp && <span className="badge ext" style={{ fontSize: "0.65rem" }}>{t(locale, "filterNeedsFollowUp")}</span>}
                      {flags.paymentOverdue && <span className="badge danger" style={{ fontSize: "0.65rem" }}>{t(locale, "filterPaymentOverdue")}</span>}
                    </div>
                  </td>
                  <td className="muted">
                    {t2.lead?.requestType ? (
                      statusLabel(locale, t2.lead.requestType)
                    ) : (
                      <span style={{ fontStyle: "italic" }}>{t(locale, "requestTypeUnclassified")}</span>
                    )}
                  </td>
                  <td className="muted">{destinations.length ? destinations.join(", ") : "—"}</td>
                  <td className="muted">{statusLabel(locale, computeTripStage(t2))}</td>
                  <td className="muted" style={flags.inactive7d ? { color: "var(--color-ext)", fontWeight: 600 } : undefined}>
                    {formatActivity(flags.daysSinceActivity)}
                  </td>
                  <td className="muted">{t2.lead ? statusLabel(locale, t2.lead.channel) : t(locale, "manual")}</td>
                  <td>{t2._count.quotes}</td>
                  <td className="muted">{t2._count.bookings || "—"}</td>
                  {enabledModules.documents && <td className="muted">{t2._count.documents || "—"}</td>}
                  {enabledModules.payments && <td className="muted">{t2._count.payments || "—"}</td>}
                  <td className="muted">{t2._count.supportTickets || "—"}</td>
                  <td><Link href={`/trips/${t2.id}`} className="btn">{t(locale, "openButton")}</Link></td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr><td colSpan={12} className="pad muted">{trips.length === 0 ? t(locale, "noTripsYet") : t(locale, "noTripsMatchFilter")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
