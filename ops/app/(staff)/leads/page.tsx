import { prisma } from "@/lib/db";
import Link from "next/link";
import { getLocale, statusLabel, t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const REQUEST_TYPES = ["tailor_made", "omra_hajj", "business_travel", "tour"];

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const locale = await getLocale();
  const { type: typeRaw } = await searchParams;
  const isUnclassifiedFilter = typeRaw === "unclassified";
  const requestType = REQUEST_TYPES.includes(typeRaw ?? "") ? typeRaw : undefined;

  const [allLeads, leads] = await Promise.all([
    // Fetched unfiltered too, purely to compute per-type counts for the filter tabs below.
    prisma.lead.findMany({ where: { trip: { archivedAt: null } }, select: { requestType: true } }),
    prisma.lead.findMany({
      where: {
        trip: { archivedAt: null },
        ...(isUnclassifiedFilter ? { requestType: null } : requestType ? { requestType } : {}),
      },
      include: { trip: { include: { customer: true } } },
      orderBy: { receivedAt: "desc" },
    }),
  ]);
  const typeCounts = REQUEST_TYPES.map((rt) => ({ key: rt, count: allLeads.filter((l) => l.requestType === rt).length }));
  // The queue Principle 3's triage actually starts from: enquiries nobody has looked at yet. Shown
  // first, ahead of the four real categories — an agent needs "what's waiting on me" before "how
  // many of each kind."
  const unclassifiedCount = allLeads.filter((l) => !l.requestType).length;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: "1.6rem" }}>{t(locale, "leadInbox")}</h1>
        <p className="muted" style={{ marginTop: 4 }}>
          {t(locale, "leadInboxSubtitle")} {t(locale, "goToTripsHint")}{" "}
          <Link href="/trips" style={{ textDecoration: "underline" }}>{t(locale, "goToTripsLink")}</Link>.
        </p>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
        <span className="muted" style={{ fontSize: "0.8rem" }}>{t(locale, "requestTypeLabel")}:</span>
        <Link href="/leads" className="btn" style={!requestType && !isUnclassifiedFilter ? { background: "var(--color-primary-blue-deep)", color: "#fff" } : undefined}>
          {t(locale, "filterAll")}
        </Link>
        <Link
          href="/leads?type=unclassified"
          className="btn"
          style={isUnclassifiedFilter ? { background: "var(--color-primary-blue-deep)", color: "#fff" } : undefined}
        >
          {t(locale, "requestTypeUnclassified")} ({unclassifiedCount})
        </Link>
        {typeCounts.map((tc) => (
          <Link
            key={tc.key}
            href={`/leads?type=${tc.key}`}
            className="btn"
            style={requestType === tc.key ? { background: "var(--color-primary-blue-deep)", color: "#fff" } : undefined}
          >
            {statusLabel(locale, tc.key)} ({tc.count})
          </Link>
        ))}
      </div>
      <div className="card">
        {leads.length === 0 ? (
          <div className="pad muted">{allLeads.length === 0 ? t(locale, "noLeadsYet") : t(locale, "noLeadsMatchFilter")}</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t(locale, "colCustomer")}</th>
                <th>{t(locale, "colChannel")}</th>
                <th>{t(locale, "colRequestType")}</th>
                <th>{t(locale, "colSourceForm")}</th>
                <th>{t(locale, "colReceived")}</th>
                <th>{t(locale, "colStatus")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 600 }}>
                    <Link href={`/customers/${l.trip.customerId}`} style={{ textDecoration: "underline" }}>{l.trip.customer.name}</Link>
                  </td>
                  <td className="muted">{statusLabel(locale, l.channel)}</td>
                  <td className="muted">
                    {l.requestType ? statusLabel(locale, l.requestType) : <span style={{ fontStyle: "italic" }}>{t(locale, "requestTypeUnclassified")}</span>}
                  </td>
                  <td className="muted">{l.sourceForm ?? "—"}</td>
                  <td className="muted">{l.receivedAt.toLocaleDateString()}</td>
                  <td className="muted">{statusLabel(locale, l.qualificationStatus)}</td>
                  <td><Link href={`/trips/${l.tripId}`} className="btn">{t(locale, "openButton")}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
