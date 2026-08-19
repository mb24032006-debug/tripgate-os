import { prisma } from "@/lib/db";
import Link from "next/link";
import { getLocale, localized, statusLabel, t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

// The one thing paper is genuinely bad at — finding one customer's trip among hundreds — is the
// one thing this needs to be instantly good at, or staff have no reason to stop keeping a
// notebook "just in case." A plain GET form (not a JS-driven live search) on purpose: it works
// even if something upstream of the JS bundle fails, survives a slow connection without dropped
// keystrokes, and is bookmarkable/shareable as a URL — the same "boring, hard to get wrong"
// standard applied everywhere else in this build.
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const locale = await getLocale();
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const [trips, products, quotes, tickets] = query.length === 0
    ? [[], [], [], []]
    : await Promise.all([
        prisma.trip.findMany({
          where: {
            archivedAt: null,
            customer: {
              OR: [
                { name: { contains: query } },
                { email: { contains: query } },
                { phone: { contains: query } },
              ],
            },
          },
          include: { customer: true, requirement: true },
          orderBy: { createdAt: "desc" },
          take: 25,
        }),
        prisma.travelProduct.findMany({
          where: { OR: [{ name: { contains: query } }, { nameFr: { contains: query } }] },
          include: { category: true, provider: true },
          take: 25,
        }),
        prisma.quote.findMany({
          where: {
            trip: { archivedAt: null },
            OR: [
              { label: { contains: query } },
              { trip: { customer: { name: { contains: query } } } },
            ],
          },
          include: { trip: { include: { customer: true } } },
          take: 25,
        }),
        prisma.supportTicket.findMany({
          where: {
            trip: { archivedAt: null },
            OR: [
              { subject: { contains: query } },
              { trip: { customer: { name: { contains: query } } } },
            ],
          },
          include: { trip: { include: { customer: true } } },
          take: 25,
        }),
      ]);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: "1.6rem" }}>{t(locale, "searchTitle")}</h1>
        <form action="/search" style={{ marginTop: 12 }}>
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder={t(locale, "searchPlaceholder")}
            autoFocus
            style={{ width: "100%", maxWidth: 480, padding: "10px 14px", fontSize: "1rem" }}
          />
        </form>
      </div>

      {query.length === 0 ? (
        <p className="muted">{t(locale, "searchHint")}</p>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="pad" style={{ borderBottom: "1px solid var(--color-border)" }}>
              <h3>{t(locale, "trips")} ({trips.length})</h3>
            </div>
            {trips.length === 0 ? (
              <div className="pad muted">{t(locale, "searchNoTrips")}</div>
            ) : (
              <table>
                <tbody>
                  {trips.map((tr) => {
                    const destinations: string[] = tr.requirement?.destinations ? JSON.parse(tr.requirement.destinations) : [];
                    return (
                      <tr key={tr.id}>
                        <td className="muted" style={{ whiteSpace: "nowrap" }}>{tr.reference ?? "—"}</td>
                        <td style={{ fontWeight: 600 }}>
                          <Link href={`/customers/${tr.customer.id}`} style={{ textDecoration: "underline" }}>{tr.customer.name}</Link>
                        </td>
                        <td className="muted">{tr.customer.email}{tr.customer.phone ? ` · ${tr.customer.phone}` : ""}</td>
                        <td className="muted">{destinations.join(", ") || "—"}</td>
                        <td><Link href={`/trips/${tr.id}`} className="btn">{t(locale, "openButton")}</Link></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="pad" style={{ borderBottom: "1px solid var(--color-border)" }}>
              <h3>{t(locale, "products")} ({products.length})</h3>
            </div>
            {products.length === 0 ? (
              <div className="pad muted">{t(locale, "searchNoProducts")}</div>
            ) : (
              <table>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{localized(locale, p.name, p.nameFr)}</td>
                      <td className="muted">{localized(locale, p.category.name, p.category.nameFr)}</td>
                      <td>
                        <span className={`badge ${p.provider.sourceKind === "internal" ? "int" : "ext"}`}>{p.provider.name}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="pad" style={{ borderBottom: "1px solid var(--color-border)" }}>
              <h3>{t(locale, "quoteBuilder")} ({quotes.length})</h3>
            </div>
            {quotes.length === 0 ? (
              <div className="pad muted">{t(locale, "searchNoQuotes")}</div>
            ) : (
              <table>
                <tbody>
                  {quotes.map((q) => (
                    <tr key={q.id}>
                      <td style={{ fontWeight: 600 }}>{q.trip.customer.name}{q.label ? ` — ${q.label}` : ""}</td>
                      <td className="muted">{statusLabel(locale, q.status)}</td>
                      <td><Link href={`/quotes/${q.id}`} className="btn">{t(locale, "openButton")}</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card">
            <div className="pad" style={{ borderBottom: "1px solid var(--color-border)" }}>
              <h3>{t(locale, "support")} ({tickets.length})</h3>
            </div>
            {tickets.length === 0 ? (
              <div className="pad muted">{t(locale, "searchNoTickets")}</div>
            ) : (
              <table>
                <tbody>
                  {tickets.map((ti) => (
                    <tr key={ti.id}>
                      <td style={{ fontWeight: 600 }}>{ti.trip.customer.name}</td>
                      <td className="muted">{ti.subject}</td>
                      <td className="muted">{statusLabel(locale, ti.status)}</td>
                      <td><Link href={`/trips/${ti.tripId}`} className="btn">{t(locale, "openButton")}</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
