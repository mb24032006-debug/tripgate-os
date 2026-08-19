import { prisma } from "@/lib/db";
import Link from "next/link";
import { computeQuoteNetTotal, computeQuoteTotal, formatMinor } from "@/lib/money";
import { getLocale, t } from "@/lib/i18n";
import { describeNotification } from "@/lib/notifications";

// This is a live internal tool, not a marketing page — never statically prerender data that
// changes on every quote/lead created.
export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const locale = await getLocale();
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now.getTime() - 7 * 86_400_000);

  const [
    productCount,
    providerCount,
    internalCount,
    externalCount,
    quoteCount,
    leadCount,
    tripCount,
    openTickets,
    openQuotes,
    acceptedQuotes,
    leadsToday,
    quotesAcceptedToday,
    bookingsConfirmedThisWeek,
    recentUnreadNotifications,
  ] = await Promise.all([
    prisma.travelProduct.count(),
    prisma.provider.count(),
    prisma.provider.count({ where: { sourceKind: "internal" } }),
    prisma.provider.count({ where: { sourceKind: "external" } }),
    prisma.quote.count({ where: { trip: { archivedAt: null } } }),
    prisma.lead.count({ where: { trip: { archivedAt: null } } }),
    prisma.trip.count({ where: { archivedAt: null } }),
    prisma.supportTicket.findMany({
      where: { status: { notIn: ["resolved", "closed"] }, trip: { archivedAt: null } },
      include: { trip: { include: { customer: true } } },
      orderBy: { openedAt: "asc" },
      take: 5,
    }),
    prisma.quote.findMany({
      where: { status: { in: ["draft", "sent"] }, trip: { archivedAt: null } },
      include: { trip: { include: { customer: true } }, lines: true },
      orderBy: { createdAt: "asc" },
    }),
    // Deliberately NOT filtered by trip.archivedAt, unlike the pipeline queries above — this is
    // confirmed, already-earned revenue. Archiving a trip afterward (pipeline decluttering) must
    // never make money already recognized disappear from a revenue report.
    prisma.quote.findMany({
      where: { status: "accepted" },
      include: { lines: true },
    }),
    // A small, honest "today" strip — every count below reads an exact timestamp column that
    // already exists (Lead.createdAt, Quote.acceptedAt); "bookings confirmed" uses updatedAt as a
    // close proxy for confirmedAt, since a booking is only ever flipped to "confirmed" once, by
    // hand (see architecture/03_KNOWN_ARCHITECTURAL_LIMITATIONS.md on why there's no dedicated
    // confirmedAt column yet). Nothing here is a guess dressed up as data. "Accepted today" and
    // "confirmed this week" stay unfiltered by archive state for the same reason as the revenue
    // query above — what happened today already happened, regardless of a later archive.
    prisma.lead.count({ where: { createdAt: { gte: todayStart }, trip: { archivedAt: null } } }),
    prisma.quote.count({ where: { status: "accepted", acceptedAt: { gte: todayStart } } }),
    prisma.booking.count({ where: { status: "confirmed", updatedAt: { gte: weekStart } } }),
    // The notification feed's own summary, folded into this panel rather than replacing it — the
    // awaiting-reply/open-ticket sections below already answer "what's waiting on me" from data
    // that predates the feed; this adds "what just happened" alongside it.
    prisma.notification.findMany({ where: { isRead: false }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  const greetingKey = now.getHours() < 12 ? "greetingMorning" : now.getHours() < 18 ? "greetingAfternoon" : "greetingEvening";
  const dateStr = now.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const hasTodayActivity = leadsToday > 0 || quotesAcceptedToday > 0 || bookingsConfirmedThisWeek > 0;

  // A customer sent Budget AND Premium can only ever buy one — summing both into "pipeline" over-
  // states it by exactly the number of alternative options offered, and inflates fastest on the
  // hybrid model's own best idea (multiple concurrent quotes). Dedupe to the single best live offer
  // per trip before summing. Bucketed by the QUOTE's own currency (never the line's) — see
  // resolvedLineTotalMinor's comment on why a resolved cross-currency line must convert, not drop.
  const bestPerTrip = new Map<string, { quote: (typeof openQuotes)[number]; total: number }>();
  for (const q of openQuotes) {
    const total = computeQuoteTotal(q.lines, q.currency);
    if (total == null) continue; // genuinely unresolved (no FX rate set yet) — excluded, not guessed
    const existing = bestPerTrip.get(q.tripId);
    if (!existing || total > existing.total) bestPerTrip.set(q.tripId, { quote: q, total });
  }
  const dedupedOpenQuotes = Array.from(bestPerTrip.values());

  const pipelineByCurrency = new Map<string, number>();
  for (const { quote, total } of dedupedOpenQuotes) {
    pipelineByCurrency.set(quote.currency, (pipelineByCurrency.get(quote.currency) ?? 0) + total);
  }
  const sentAwaitingReply = dedupedOpenQuotes.filter(({ quote }) => quote.status === "sent").slice(0, 5);

  // Confirmed revenue/margin — the number the doctrine audit found missing entirely: the dashboard
  // could show what MIGHT be earned but never what WAS. One row per accepted quote is correct here
  // (no dedup needed — accepting supersedes siblings, so a trip can hold at most one accepted quote).
  const revenueByCurrency = new Map<string, number>();
  const marginByCurrency = new Map<string, number>();
  for (const q of acceptedQuotes) {
    const revenue = computeQuoteTotal(q.lines, q.currency);
    const net = computeQuoteNetTotal(q.lines, q.currency);
    if (revenue == null || net == null) continue;
    revenueByCurrency.set(q.currency, (revenueByCurrency.get(q.currency) ?? 0) + revenue);
    marginByCurrency.set(q.currency, (marginByCurrency.get(q.currency) ?? 0) + (revenue - net));
  }

  return (
    <div>
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 14 }}>
        <div>
          <h1 style={{ fontSize: "1.7rem" }}>{t(locale, greetingKey)}</h1>
          <p className="muted" style={{ marginTop: 4 }}>{dateStr} · {t(locale, "dashboardSubtitle")}</p>
        </div>
        {hasTodayActivity && (
          <div className="card pad fade-in" style={{ display: "flex", gap: 20, fontSize: "0.8rem" }}>
            {leadsToday > 0 && (
              <div>
                <b style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.15rem", color: "var(--heading)" }}>{leadsToday}</b>{" "}
                <span className="muted">{t(locale, "leadsTodayLabel")}</span>
              </div>
            )}
            {quotesAcceptedToday > 0 && (
              <div>
                <b style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.15rem", color: "var(--heading)" }}>{quotesAcceptedToday}</b>{" "}
                <span className="muted">{t(locale, "quotesAcceptedTodayLabel")}</span>
              </div>
            )}
            {bookingsConfirmedThisWeek > 0 && (
              <div>
                <b style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.15rem", color: "var(--heading)" }}>{bookingsConfirmedThisWeek}</b>{" "}
                <span className="muted">{t(locale, "bookingsConfirmedWeekLabel")}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="kpis">
        <Link href="/trips" className="card pad fade-in fade-in-1" style={{ display: "block" }}>
          <div className="k-l">{t(locale, "kpiTrips")}</div>
          <div className="k-v">{tripCount}</div>
        </Link>
        <Link href="/products" className="card pad fade-in fade-in-2" style={{ display: "block" }}>
          <div className="k-l">{t(locale, "kpiTravelProducts")}</div>
          <div className="k-v">{productCount}</div>
        </Link>
        <Link href="/providers" className="card pad fade-in fade-in-3" style={{ display: "block" }}>
          <div className="k-l">{t(locale, "kpiProviders")}</div>
          <div className="k-v">{providerCount}</div>
          <div className="muted" style={{ fontSize: "0.78rem", marginTop: 2 }}>
            {internalCount} {t(locale, "internalWord")} · {externalCount} {t(locale, "externalWord")}
          </div>
        </Link>
        <Link href="/quotes" className="card pad fade-in fade-in-4" style={{ display: "block" }}>
          <div className="k-l">{t(locale, "kpiQuotes")}</div>
          <div className="k-v">{quoteCount}</div>
        </Link>
        <Link href="/leads" className="card pad fade-in fade-in-5" style={{ display: "block" }}>
          <div className="k-l">{t(locale, "kpiLeads")}</div>
          <div className="k-v">{leadCount}</div>
        </Link>
        <Link href="/support" className="card pad fade-in fade-in-6" style={{ display: "block" }}>
          <div className="k-l">{t(locale, "kpiOpenTickets")}</div>
          <div className="k-v">{openTickets.length}</div>
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 18 }}>
        <div className="card pad">
          <h3 style={{ marginBottom: 10, fontSize: "1rem" }}>{t(locale, "confirmedRevenueHeading")}</h3>
          {revenueByCurrency.size === 0 ? (
            <p className="muted" style={{ fontSize: "0.85rem" }}>{t(locale, "noAttentionItems")}</p>
          ) : (
            Array.from(revenueByCurrency.entries()).map(([cur, amount]) => (
              <div key={cur} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                <span className="muted">{cur}</span>
                <span style={{ fontWeight: 700 }}>{formatMinor(amount, cur)}</span>
              </div>
            ))
          )}
          <div style={{ borderTop: "1px solid var(--color-border)", marginTop: 8, paddingTop: 8 }}>
            <div className="muted" style={{ fontSize: "0.78rem", marginBottom: 4 }}>{t(locale, "confirmedMarginHeading")}</div>
            {marginByCurrency.size === 0
              ? <span className="muted" style={{ fontSize: "0.85rem" }}>—</span>
              : Array.from(marginByCurrency.entries()).map(([cur, amount]) => (
                  <div key={cur} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                    <span className="muted">{cur}</span>
                    <span style={{ fontWeight: 700, color: "var(--color-green)" }}>{formatMinor(amount, cur)}</span>
                  </div>
                ))}
          </div>
        </div>

        <div className="card pad">
          <h3 style={{ marginBottom: 10, fontSize: "1rem" }}>{t(locale, "pipelineValueHeading")}</h3>
          {pipelineByCurrency.size === 0 ? (
            <p className="muted" style={{ fontSize: "0.85rem" }}>{t(locale, "noAttentionItems")}</p>
          ) : (
            Array.from(pipelineByCurrency.entries()).map(([cur, amount]) => (
              <div key={cur} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                <span className="muted">{cur}</span>
                <span style={{ fontWeight: 700 }}>{formatMinor(amount, cur)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card pad" style={{ marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h3 style={{ fontSize: "1rem" }}>{t(locale, "needsAttentionHeading")}</h3>
          <Link href="/notifications" style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-primary-blue)" }}>
            {t(locale, "viewAllNotificationsLink")}
          </Link>
        </div>
        {sentAwaitingReply.length === 0 && openTickets.length === 0 && recentUnreadNotifications.length === 0 ? (
          <p className="muted" style={{ fontSize: "0.85rem" }}>{t(locale, "noAttentionItems")}</p>
        ) : (
          <div style={{ fontSize: "0.82rem" }}>
            {recentUnreadNotifications.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div className="muted" style={{ fontSize: "0.72rem", textTransform: "uppercase", marginBottom: 4 }}>{t(locale, "notificationsTitle")}</div>
                {recentUnreadNotifications.map((n) => (
                  <div key={n.id}>
                    <Link href={n.link} style={{ textDecoration: "underline" }}>{describeNotification(locale, n)}</Link>
                  </div>
                ))}
              </div>
            )}
            {sentAwaitingReply.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div className="muted" style={{ fontSize: "0.72rem", textTransform: "uppercase", marginBottom: 4 }}>{t(locale, "awaitingReplyItemsLabel")}</div>
                {sentAwaitingReply.map(({ quote }) => (
                  <div key={quote.id}>
                    <Link href={`/quotes/${quote.id}`} style={{ textDecoration: "underline" }}>{quote.trip.customer.name}{quote.label ? ` — ${quote.label}` : ""}</Link>
                  </div>
                ))}
              </div>
            )}
            {openTickets.length > 0 && (
              <div>
                <div className="muted" style={{ fontSize: "0.72rem", textTransform: "uppercase", marginBottom: 4 }}>{t(locale, "openTicketItemsLabel")}</div>
                {openTickets.map((ti) => (
                  <div key={ti.id}>
                    <Link href={`/trips/${ti.tripId}`} style={{ textDecoration: "underline" }}>{ti.trip.customer.name}</Link>
                    <span className="muted"> — {ti.subject}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card pad" style={{ marginTop: 18 }}>
        <h3 style={{ marginBottom: 10 }}>{t(locale, "tripEngineTitle")}</h3>
        <p className="muted" style={{ fontSize: "0.85rem" }}>{t(locale, "tripEngineDesc")}</p>
      </div>
    </div>
  );
}
