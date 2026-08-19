import { prisma } from "@/lib/db";
import { computeQuoteTotal, formatMinor } from "@/lib/money";
import Link from "next/link";
import { getLocale, statusLabel, t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function QuotesPage() {
  const locale = await getLocale();
  const quotes = await prisma.quote.findMany({
    where: { trip: { archivedAt: null } },
    include: { trip: { include: { customer: true } }, lines: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: "1.6rem" }}>
            {t(locale, "quoteBuilder")} <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-inter)", color: "var(--color-accent-gold)", background: "var(--color-neutral-100)", padding: "2px 8px", borderRadius: 6, verticalAlign: "middle" }}>{t(locale, "quoteBuilderHeart")}</span>
          </h1>
          <p className="muted" style={{ marginTop: 4 }}>
            {t(locale, "quotesListSubtitlePrefix")} <Link href="/trips" style={{ textDecoration: "underline" }}>{t(locale, "tripLinkWord")}</Link> {t(locale, "quotesListSubtitleSuffix")}
          </p>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>{t(locale, "colCustomer")}</th>
              <th>{t(locale, "colLabel")}</th>
              <th>{t(locale, "colStatus")}</th>
              <th>{t(locale, "colLines")}</th>
              <th>{t(locale, "colTotal")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => {
              const total = computeQuoteTotal(q.lines, q.currency);
              const internal = q.lines.filter((l) => l.sourceKindCache === "internal").length;
              const external = q.lines.filter((l) => l.sourceKindCache === "external").length;
              return (
                <tr key={q.id}>
                  <td style={{ fontWeight: 600 }}>{q.trip.customer.name}</td>
                  <td className="muted">{q.label ?? "—"}</td>
                  <td className="muted">{statusLabel(locale, q.status)}</td>
                  <td className="muted">
                    {q.lines.length} {q.lines.length > 0 && `(${internal} ${t(locale, "internalWord")} · ${external} ${t(locale, "externalWord")})`}
                  </td>
                  <td>{total != null ? formatMinor(total, q.currency) : <span style={{ color: "var(--color-ext)" }}>⚠ {t(locale, "mixedCurrencyShort")}</span>}</td>
                  <td>
                    <Link href={`/quotes/${q.id}`} className="btn">{t(locale, "openButton")}</Link>
                  </td>
                </tr>
              );
            })}
            {quotes.length === 0 && (
              <tr>
                <td colSpan={6} className="muted pad">{t(locale, "noQuotesStartFromTrip")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
