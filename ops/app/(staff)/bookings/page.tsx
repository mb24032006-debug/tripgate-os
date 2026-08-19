import { prisma } from "@/lib/db";
import { computeQuoteTotal, formatMinor } from "@/lib/money";
import Link from "next/link";
import { getLocale, statusLabel, t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

// One table for every confirmed sale, regardless of whether its lines are internal or external —
// same discipline as Products: source is a badge on the row, never a separate screen or query path.
export default async function BookingsPage() {
  const locale = await getLocale();
  const bookings = await prisma.booking.findMany({
    where: { trip: { archivedAt: null } },
    include: {
      trip: { include: { customer: true } },
      quote: { select: { label: true, version: true, currency: true, lines: true } },
      lines: { include: { provider: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: "1.6rem" }}>{t(locale, "bookingsTitle")}</h1>
        <p className="muted" style={{ marginTop: 4 }}>{t(locale, "bookingsSubtitle")}</p>
      </div>
      <div className="card">
        {bookings.length === 0 ? (
          <div className="pad muted">{t(locale, "noBookingsYet")}</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t(locale, "colCustomer")}</th>
                <th>{t(locale, "colLabel")}</th>
                <th>{t(locale, "colStatus")}</th>
                <th>{t(locale, "colLines")}</th>
                <th>{t(locale, "colValue")}</th>
                <th>{t(locale, "colSource")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                const total = computeQuoteTotal(b.quote.lines, b.quote.currency);
                const internal = b.lines.filter((l) => l.provider.sourceKind === "internal").length;
                const external = b.lines.filter((l) => l.provider.sourceKind === "external").length;
                return (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 600 }}>{b.trip.customer.name}</td>
                    <td className="muted">{b.quote.label ?? t(locale, "unlabeled")} <span style={{ fontWeight: 400 }}>v{b.quote.version}</span></td>
                    <td className="muted">{statusLabel(locale, b.status)}</td>
                    <td className="muted">{b.lines.length}</td>
                    <td>{total != null ? formatMinor(total, b.quote.currency) : <span style={{ color: "var(--color-ext)" }}>⚠ {t(locale, "mixedCurrencyShort")}</span>}</td>
                    <td className="muted">
                      {internal > 0 && <span className="badge int" style={{ fontSize: "0.68rem", marginRight: 4 }}>{internal} {t(locale, "internalWord")}</span>}
                      {external > 0 && <span className="badge ext" style={{ fontSize: "0.68rem" }}>{external} {t(locale, "externalWord")}</span>}
                    </td>
                    <td><Link href={`/trips/${b.tripId}`} className="btn">{t(locale, "openButton")}</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
