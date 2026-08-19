import { prisma } from "@/lib/db";
import { computeQuoteTotal, formatMinor } from "@/lib/money";
import { acceptQuote, declineQuote } from "@/app/(staff)/quotes/actions";
import { notFound } from "next/navigation";
import { getLocale, localized, t } from "@/lib/i18n";
import SubmitButton from "@/app/(staff)/SubmitButton";

export const dynamic = "force-dynamic";

// The customer-facing surface — the one thing "Send quote" never actually produced before. Reuses
// the existing route tree (so it still sits inside the staff sidebar layout for now — a fully
// chrome-free public link is a follow-up route-group refactor, not done here) but shows nothing an
// agent sees: no net cost, no margin, no pricing method, no internal notes.
export default async function ClientQuoteViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: { trip: { include: { customer: true } } },
  });
  if (!quote) notFound();

  // A customer sent Budget and Premium never saw them side by side — accept/decline was a single
  // option per link with no way to compare. Every "sent" or "accepted" quote on the same trip is a
  // live option (accepting one auto-expires the rest — see acceptQuote — so this never shows a
  // choice that's no longer real). Falls back to this one quote's own status message when no live
  // option exists at all (rejected/expired/revised/draft).
  const liveQuotes = await prisma.quote.findMany({
    where: { tripId: quote.tripId, status: { in: ["sent", "accepted"] } },
    include: { lines: { include: { travelProduct: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div
        style={{
          background: "var(--color-primary-blue-deep)",
          color: "#fff",
          borderRadius: 12,
          padding: "22px 26px",
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/brand/tripgate-icon.png" alt="" style={{ height: 34, width: "auto", flexShrink: 0 }} />
          <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.6rem", fontWeight: 700 }}>
            TripGate
          </div>
        </div>
        <div style={{ opacity: 0.85, fontSize: "0.9rem", marginTop: 8 }}>
          {t(locale, "clientViewIntro")} {quote.trip.customer.name}
          {quote.trip.reference && <> · {quote.trip.reference}</>}
        </div>
      </div>

      {liveQuotes.length === 0 ? (
        <div className="card pad muted">
          {quote.status === "draft" && t(locale, "clientViewDraftNotice")}
          {quote.status === "expired" && t(locale, "expiredQuoteNote")}
          {(quote.status === "rejected" || quote.status === "revised") && t(locale, "clientViewDeclined")}
        </div>
      ) : (
        <>
          <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.3rem", marginBottom: 14 }}>
            {liveQuotes.length > 1 ? t(locale, "compareOptionsHeading") : t(locale, "clientViewGreeting")}
          </h1>
          <div style={{ display: "grid", gridTemplateColumns: liveQuotes.length > 1 ? "1fr 1fr" : "1fr", gap: 16, marginBottom: 20 }}>
            {liveQuotes.map((q) => {
              const total = computeQuoteTotal(q.lines, q.currency) ?? 0;
              const isAccepted = q.status === "accepted";
              return (
                <div key={q.id} className="card" style={isAccepted ? { borderColor: "var(--color-green)" } : undefined}>
                  <div className="pad" style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <div style={{ fontWeight: 700 }}>{q.label ?? t(locale, "clientViewGreeting")}</div>
                  </div>
                  {q.lines.map((line) => (
                    <div key={line.id} className="pad" style={{ borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{localized(locale, line.travelProduct.name, line.travelProduct.nameFr)}</div>
                        {line.travelProduct.shortDescription && (
                          <div className="muted" style={{ fontSize: "0.8rem", marginTop: 2 }}>
                            {localized(locale, line.travelProduct.shortDescription, line.travelProduct.shortDescriptionFr)}
                          </div>
                        )}
                        {line.quantity > 1 && <div className="muted" style={{ fontSize: "0.76rem", marginTop: 4 }}>× {line.quantity}</div>}
                      </div>
                      <div style={{ whiteSpace: "nowrap", fontWeight: 600 }}>
                        {formatMinor(line.sellingPriceMinor * line.quantity, line.currency ?? q.currency)}
                      </div>
                    </div>
                  ))}
                  <div className="pad">
                    <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-cormorant)", fontSize: "1.3rem", fontWeight: 700 }}>
                      <span>{t(locale, "clientViewTotal")}</span>
                      <span>{formatMinor(total, q.currency)}</span>
                    </div>
                    {q.validUntil && (
                      <div className="muted" style={{ fontSize: "0.76rem", marginTop: 6 }}>
                        {t(locale, "clientViewValidUntil")} {q.validUntil.toLocaleDateString()}
                      </div>
                    )}
                    {q.termsText && (
                      <div className="muted" style={{ fontSize: "0.76rem", marginTop: 8, whiteSpace: "pre-wrap" }}>{q.termsText}</div>
                    )}

                    {isAccepted ? (
                      <div style={{ marginTop: 12, color: "var(--color-green)", fontWeight: 600 }}>
                        ✓ {t(locale, "clientViewAccepted")}
                      </div>
                    ) : (
                      <div style={{ marginTop: 12 }}>
                        <form action={acceptQuote} style={{ marginBottom: 8 }}>
                          <input type="hidden" name="quoteId" value={q.id} />
                          <input type="hidden" name="returnTo" value={`/quotes/${q.id}/view`} />
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                            <label style={{ fontSize: "0.76rem" }}>
                              <div className="muted">{t(locale, "yourNameLabel")}</div>
                              <input type="text" name="acceptedByName" required style={{ width: 140 }} />
                            </label>
                          </div>
                          <label style={{ display: "flex", gap: 6, alignItems: "flex-start", fontSize: "0.76rem", marginTop: 8 }}>
                            <input type="checkbox" required style={{ marginTop: 2 }} />
                            <span>{t(locale, "consentLabel")}</span>
                          </label>
                          <div style={{ marginTop: 10 }}>
                            <SubmitButton pendingLabel={t(locale, "savingButton")}>{t(locale, "clientViewAccept")}</SubmitButton>
                          </div>
                        </form>
                        <form action={declineQuote}>
                          <input type="hidden" name="quoteId" value={q.id} />
                          <input type="hidden" name="returnTo" value={`/quotes/${q.id}/view`} />
                          <input type="hidden" name="actor" value="client" />
                          <SubmitButton className="btn" pendingLabel={t(locale, "savingButton")}>{t(locale, "clientViewDecline")}</SubmitButton>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <p className="muted" style={{ fontSize: "0.78rem", textAlign: "center" }}>{t(locale, "clientViewFooter")}</p>
    </div>
  );
}
