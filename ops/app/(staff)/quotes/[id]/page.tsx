import { prisma } from "@/lib/db";
import { computeQuoteTotal, formatMinor, resolvedLineNetMinor, resolvedLineTotalMinor } from "@/lib/money";
import {
  addQuoteLine,
  removeQuoteLine,
  updateQuoteLine,
  setLineFxRate,
  sendQuote,
  acceptQuote,
  declineQuote,
  reviseQuote,
  duplicateQuote,
  cancelBooking,
  updateQuoteTerms,
} from "../actions";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getLocale, localized, statusLabel, t } from "@/lib/i18n";
import SubmitButton from "../../SubmitButton";

export const dynamic = "force-dynamic";

export default async function QuoteBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      trip: { include: { customer: true, requirement: true } },
      // Two lines both default to sortOrder 0 — without a secondary key, ties have no guaranteed
      // stable order and lines can visibly reshuffle between reloads.
      lines: { include: { travelProduct: true, provider: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    },
  });
  if (!quote) notFound();

  const isDraft = quote.status === "draft";
  const successor = quote.status === "revised" ? await prisma.quote.findFirst({ where: { supersedesQuoteId: quote.id } }) : null;

  const products = await prisma.travelProduct.findMany({
    where: { status: "active" },
    include: { category: true, provider: true },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  });

  // Never assume a line's currency matches the Quote's — a USD-denominated Moods Travel line must
  // not be silently summed into a MAD total. A line "resolves" once its currency matches the
  // Quote's, or once an agent has set an explicit FX rate on it — that rate is the one remedy for
  // what used to be a permanent dead end.
  const lineCurrency = (l: (typeof quote.lines)[number]) => l.currency ?? quote.currency;
  const isResolved = (l: (typeof quote.lines)[number]) => lineCurrency(l) === quote.currency || l.fxRateToQuoteCurrency != null;
  const canBlendTotal = quote.lines.every(isResolved);

  const netTotal = canBlendTotal ? quote.lines.reduce((s, l) => s + (resolvedLineNetMinor(l, quote.currency) ?? 0), 0) : 0;
  // The one shared total function (lib/money.ts) — same call as the Quotes list, the Trip's quote
  // table, and the Dashboard's pipeline value, so this screen can never show a different number
  // than any of those do for the same quote.
  const sellingTotal = computeQuoteTotal(quote.lines, quote.currency) ?? 0;
  const margin = sellingTotal - netTotal;
  const internalCount = quote.lines.filter((l) => l.sourceKindCache === "internal").length;
  const externalCount = quote.lines.filter((l) => l.sourceKindCache === "external").length;

  const distinctCurrencies = Array.from(new Set(quote.lines.map(lineCurrency)));
  const subtotalsByCurrency = distinctCurrencies.map((cur) => {
    const lines = quote.lines.filter((l) => lineCurrency(l) === cur);
    return {
      currency: cur,
      net: lines.reduce((s, l) => s + l.netCostMinor * l.quantity, 0),
      selling: lines.reduce((s, l) => s + l.sellingPriceMinor * l.quantity, 0),
    };
  });

  const byCategory = new Map<string, { label: string; items: typeof products }>();
  for (const p of products) {
    const key = p.category.id;
    const entry = byCategory.get(key) ?? { label: localized(locale, p.category.name, p.category.nameFr), items: [] };
    entry.items.push(p);
    byCategory.set(key, entry);
  }

  const clientViewPath = `/quotes/${quote.id}/view`;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "1.5rem" }}>
            {t(locale, "quoteForPrefix")} {quote.trip.customer.name}
            {quote.label && <span className="muted" style={{ fontWeight: 400, fontSize: "1rem" }}> — {quote.label}</span>}
            <span className="muted" style={{ fontWeight: 400, fontSize: "0.85rem" }}> · v{quote.version}</span>
          </h1>
          <p className="muted" style={{ marginTop: 4 }}>
            {quote.trip.reference && <>{quote.trip.reference} · </>}
            {t(locale, "statusPrefix")}: <b>{statusLabel(locale, quote.status)}</b> · {quote.trip.customer.email} ·{" "}
            <Link href={`/trips/${quote.tripId}`} style={{ textDecoration: "underline" }}>{t(locale, "viewTripLink")}</Link>
          </p>
          {quote.trip.requirement && (
            <p className="muted" style={{ marginTop: 2, fontSize: "0.8rem" }}>
              {t(locale, "requirementsPrefix")}: {quote.trip.requirement.destinations ? JSON.parse(quote.trip.requirement.destinations).join(", ") : "—"}
              {quote.trip.requirement.travelerCount ? ` · ${quote.trip.requirement.travelerCount} ${t(locale, "travelersSuffix")}` : ""}
              {quote.trip.requirement.tripLengthDays ? ` · ${quote.trip.requirement.tripLengthDays} ${t(locale, "daysSuffix")}` : ""}
              {quote.trip.requirement.accommodationCategory ? ` · ${quote.trip.requirement.accommodationCategory}` : ""}
            </p>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          {isDraft && quote.lines.length > 0 && canBlendTotal && (
            <form action={sendQuote} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <input type="hidden" name="quoteId" value={quote.id} />
              <label style={{ fontSize: "0.72rem" }}>
                <div className="muted">{t(locale, "validUntilLabel")}</div>
                <input type="date" name="validUntil" />
              </label>
              <SubmitButton pendingLabel={t(locale, "savingButton")}>{t(locale, "sendQuoteButton")}</SubmitButton>
            </form>
          )}
          {isDraft && quote.lines.length > 0 && !canBlendTotal && (
            <span className="muted" style={{ fontSize: "0.82rem" }}>{t(locale, "resolveMismatchFirst")}</span>
          )}

          {quote.status === "sent" && (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <form action={acceptQuote} style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
                <input type="hidden" name="quoteId" value={quote.id} />
                <input type="hidden" name="returnTo" value={`/quotes/${quote.id}`} />
                <label style={{ fontSize: "0.72rem" }}>
                  <div className="muted">{t(locale, "confirmedByPhoneLabel")}</div>
                  <input type="text" name="acceptedByName" defaultValue={quote.trip.customer.name} required style={{ width: 130 }} />
                </label>
                <SubmitButton pendingLabel={t(locale, "savingButton")}>{t(locale, "acceptQuoteButton")}</SubmitButton>
              </form>
              <form action={declineQuote} style={{ display: "flex", gap: 6 }}>
                <input type="hidden" name="quoteId" value={quote.id} />
                <input type="hidden" name="returnTo" value={`/quotes/${quote.id}`} />
                <input type="hidden" name="actor" value="agent" />
                <input type="text" name="reason" placeholder={t(locale, "declineReasonLabel")} style={{ width: 140 }} />
                <SubmitButton className="btn" pendingLabel={t(locale, "savingButton")}>{t(locale, "declineQuoteButton")}</SubmitButton>
              </form>
              <form action={reviseQuote}>
                <input type="hidden" name="quoteId" value={quote.id} />
                <SubmitButton className="btn" pendingLabel={t(locale, "savingButton")}>{t(locale, "reviseQuoteButton")}</SubmitButton>
              </form>
            </div>
          )}
          {(quote.status === "rejected" || quote.status === "expired") && (
            <form action={reviseQuote}>
              <input type="hidden" name="quoteId" value={quote.id} />
              <SubmitButton className="btn" pendingLabel={t(locale, "savingButton")}>{t(locale, "reviseQuoteButton")}</SubmitButton>
            </form>
          )}
          {quote.status === "accepted" && (
            <form action={cancelBooking} style={{ display: "flex", gap: 6 }}>
              <input type="hidden" name="quoteId" value={quote.id} />
              <input type="text" name="reason" placeholder={t(locale, "cancelBookingReasonLabel")} style={{ width: 150 }} />
              <SubmitButton className="btn" pendingLabel={t(locale, "savingButton")}>{t(locale, "cancelBookingButton")}</SubmitButton>
            </form>
          )}

          <form action={duplicateQuote} style={{ display: "flex", gap: 6 }}>
            <input type="hidden" name="quoteId" value={quote.id} />
            <input type="text" name="label" placeholder={t(locale, "duplicateLabelPlaceholder")} style={{ width: 150 }} />
            <SubmitButton className="btn" pendingLabel={t(locale, "savingButton")}>{t(locale, "duplicateQuoteButton")}</SubmitButton>
          </form>
        </div>
      </div>

      {!isDraft && (
        <div className="card pad" style={{ marginBottom: 16, fontSize: "0.85rem" }}>
          {quote.status === "sent" && (
            <span>
              {t(locale, "quoteLockedNote")}
              {quote.sentAt && <> · {t(locale, "sentAtPrefix")} {quote.sentAt.toLocaleString()}</>}
              {quote.validUntil && <> · {t(locale, "validUntilLabel")}: {quote.validUntil.toLocaleDateString()}</>}
            </span>
          )}
          {quote.status === "accepted" && (
            <span>
              ✓ {t(locale, "quoteAcceptedNote")}
              {quote.acceptedByName && (
                <> · {t(locale, "acceptedByPrefix")} {quote.acceptedByName}{quote.acceptedAt && <> {t(locale, "onDatePrefix")} {quote.acceptedAt.toLocaleString()}</>}</>
              )}
            </span>
          )}
          {quote.status === "rejected" && (
            <span>
              {quote.declinedBy === "agent" ? t(locale, "declinedByAgentNote") : t(locale, "quoteRejectedNote")}
              {quote.notes ? ` — "${quote.notes}"` : ""}
            </span>
          )}
          {quote.status === "revised" && (
            <span>
              {t(locale, "quoteRevisedNote")}{" "}
              {successor && <Link href={`/quotes/${successor.id}`} style={{ textDecoration: "underline" }}>{t(locale, "viewNewerVersion")}</Link>}
            </span>
          )}
          {quote.status === "expired" && <span>{t(locale, "expiredQuoteNote")}</span>}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 18, alignItems: "start" }}>
        <div className="card">
          <div className="pad" style={{ borderBottom: "1px solid var(--color-border)", fontSize: "0.85rem" }}>
            {t(locale, "lineHintText")}
          </div>
          {quote.lines.map((line) => {
            const lineNetNative = line.netCostMinor * line.quantity;
            const lineSellNative = line.sellingPriceMinor * line.quantity;
            const lineMarginNative = lineSellNative - lineNetNative;
            const cur = lineCurrency(line);
            const mismatched = cur !== quote.currency;
            const resolved = isResolved(line);
            const convertedSelling = resolvedLineTotalMinor(line, quote.currency);
            // Keyed on the mutable fields, not just line.id: a Server Action that changes quantity
            // in place (e.g. re-adding the same product) revalidates the RSC tree without a full
            // page reload, and React only applies an <input defaultValue> on initial mount — same
            // key means same DOM node means the new value never appears until a manual reload.
            // Changing the key forces a remount exactly when the underlying numbers actually change.
            const lineKey = `${line.id}-${line.quantity}-${line.netCostMinor}-${line.sellingPriceMinor}-${line.fxRateToQuoteCurrency}`;
            return (
              <div key={lineKey} className="pad" style={{ borderBottom: "1px solid var(--color-border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{localized(locale, line.travelProduct.name, line.travelProduct.nameFr)}</div>
                    <span className={`badge ${line.sourceKindCache === "internal" ? "int" : "ext"}`}>
                      {statusLabel(locale, line.sourceKindCache)}
                    </span>
                    {mismatched && (
                      <span className="muted" style={{ fontSize: "0.72rem", marginLeft: 8 }}>
                        ⚠ {t(locale, "mismatchInlineNote", { cur, quoteCur: quote.currency })}
                        {resolved && convertedSelling != null && (
                          <> · {t(locale, "convertedLabel")}: {formatMinor(convertedSelling, quote.currency)}</>
                        )}
                      </span>
                    )}
                  </div>
                  {isDraft && (
                    <form action={removeQuoteLine}>
                      <input type="hidden" name="lineId" value={line.id} />
                      <input type="hidden" name="quoteId" value={quote.id} />
                      <button className="btn" type="submit" title={t(locale, "removeButton")}>{t(locale, "removeButton")}</button>
                    </form>
                  )}
                </div>

                {isDraft ? (
                  <>
                    <form action={updateQuoteLine} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
                      <input type="hidden" name="lineId" value={line.id} />
                      <input type="hidden" name="quoteId" value={quote.id} />
                      <label style={{ fontSize: "0.78rem" }}>
                        <div className="muted">{t(locale, "netCostLabel")} ({cur})</div>
                        <input type="number" name="netCost" defaultValue={line.netCostMinor / 100} step="0.01" style={{ width: 90 }} />
                      </label>
                      <label style={{ fontSize: "0.78rem" }}>
                        <div className="muted">{t(locale, "sellingPriceLabel")} ({cur})</div>
                        <input type="number" name="sellingPrice" defaultValue={line.sellingPriceMinor / 100} step="0.01" style={{ width: 90 }} />
                      </label>
                      <label style={{ fontSize: "0.78rem" }}>
                        <div className="muted">{t(locale, "quantityLabel")}</div>
                        <input type="number" name="quantity" defaultValue={line.quantity} min={1} step="1" style={{ width: 60 }} />
                      </label>
                      <div style={{ fontSize: "0.78rem" }}>
                        <div className="muted">{t(locale, "lineTotalLabel")}</div>
                        <div>{formatMinor(lineSellNative, cur)}</div>
                      </div>
                      <div style={{ fontSize: "0.78rem" }}>
                        <div className="muted">{t(locale, "marginLabel")}</div>
                        <div style={{ fontWeight: 700, color: lineMarginNative < 0 ? "var(--color-danger)" : "var(--color-green)" }}>
                          {lineMarginNative < 0 && "⚠ "}{formatMinor(lineMarginNative, cur)}
                        </div>
                      </div>
                      <SubmitButton className="btn" pendingLabel={t(locale, "savingButton")}>{t(locale, "updateButton")}</SubmitButton>
                    </form>
                    {mismatched && (
                      <form action={setLineFxRate} style={{ display: "flex", gap: 8, alignItems: "flex-end", marginTop: 8 }}>
                        <input type="hidden" name="lineId" value={line.id} />
                        <input type="hidden" name="quoteId" value={quote.id} />
                        <label style={{ fontSize: "0.75rem" }}>
                          <div className="muted">{t(locale, "fxRateLabel", { cur: quote.currency })}</div>
                          <input
                            type="number"
                            name="fxRate"
                            defaultValue={line.fxRateToQuoteCurrency ?? ""}
                            step="0.0001"
                            min="0"
                            placeholder="e.g. 10.05"
                            style={{ width: 100 }}
                          />
                        </label>
                        <SubmitButton className="btn" pendingLabel={t(locale, "savingButton")}>{t(locale, "setRateButton")}</SubmitButton>
                      </form>
                    )}
                  </>
                ) : (
                  <div style={{ display: "flex", gap: 16, fontSize: "0.8rem" }} className="muted">
                    <span>{t(locale, "quantityLabel")}: {line.quantity}</span>
                    <span>{t(locale, "lineTotalLabel")}: {formatMinor(lineSellNative, cur)}</span>
                    <span style={{ color: lineMarginNative < 0 ? "var(--color-danger)" : undefined }}>
                      {t(locale, "marginLabel")}: {formatMinor(lineMarginNative, cur)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
          {quote.lines.length === 0 && <div className="pad muted">{t(locale, "noLinesYet")}</div>}
        </div>

        <div>
          <div className="card pad" style={{ marginBottom: 16 }}>
            <h3 style={{ marginBottom: 10, fontSize: "1rem" }}>{t(locale, "pricingHeading")}</h3>
            {canBlendTotal ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                  <span className="muted">{t(locale, "netCostLabel")}</span>
                  <span>{formatMinor(netTotal, quote.currency)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid var(--color-border)", marginTop: 6, fontFamily: "var(--font-cormorant)", fontSize: "1.3rem", fontWeight: 700 }}>
                  <span>{t(locale, "clientTotalLabel")}</span>
                  <span>{formatMinor(sellingTotal, quote.currency)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                  <span className="muted">{t(locale, "marginLabel")}</span>
                  <span style={{ color: margin < 0 ? "var(--color-danger)" : "var(--color-green)", fontWeight: 700 }}>
                    {margin < 0 && "⚠ "}{formatMinor(margin, quote.currency)}
                  </span>
                </div>
              </>
            ) : (
              <div>
                <p style={{ fontSize: "0.82rem", color: "var(--color-ext)", marginBottom: 10 }}>
                  ⚠ {t(locale, "mixedCurrencyWarning", { cur: quote.currency })}
                </p>
                {subtotalsByCurrency.map((s) => (
                  <div key={s.currency} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "0.9rem" }}>
                    <span className="muted">{t(locale, "subtotalLabel")} ({s.currency})</span>
                    <span style={{ fontWeight: 700 }}>{formatMinor(s.selling, s.currency)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="muted" style={{ fontSize: "0.78rem", marginTop: 6 }}>
              {quote.lines.length} {t(locale, "productsWord")} · {internalCount} {t(locale, "internalWord")} · {externalCount} {t(locale, "externalWord")}
            </div>
            {quote.sentSnapshotTotalMinor != null && (
              <div className="muted" style={{ fontSize: "0.78rem", marginTop: 6 }}>
                {t(locale, "frozenAtSend")}: {formatMinor(quote.sentSnapshotTotalMinor, quote.currency)}
              </div>
            )}
          </div>

          {isDraft && (
            <div className="card pad" style={{ marginBottom: 16 }}>
              <form action={updateQuoteTerms}>
                <input type="hidden" name="quoteId" value={quote.id} />
                <label style={{ fontSize: "0.8rem" }}>
                  <div className="muted" style={{ marginBottom: 4 }}>{t(locale, "termsLabel")}</div>
                  <textarea name="termsText" rows={3} style={{ width: "100%", fontSize: "0.85rem" }} defaultValue={quote.termsText ?? ""} />
                </label>
                <div style={{ marginTop: 8 }}>
                  <SubmitButton className="btn" pendingLabel={t(locale, "savingButton")}>{t(locale, "saveButton")}</SubmitButton>
                </div>
              </form>
            </div>
          )}

          {!isDraft && (
            <div className="card pad" style={{ marginBottom: 16 }}>
              <h4 style={{ marginBottom: 8, fontSize: "0.9rem" }}>{t(locale, "clientLinkHeading")}</h4>
              <p className="muted" style={{ fontSize: "0.78rem", marginBottom: 8 }}>{t(locale, "clientLinkHint")}</p>
              <Link href={clientViewPath} className="btn" style={{ display: "inline-block", marginBottom: 8 }}>
                {t(locale, "openClientView")}
              </Link>
              <div>
                <code style={{ fontSize: "0.72rem", wordBreak: "break-all" }}>{clientViewPath}</code>
              </div>
            </div>
          )}

          {isDraft && (
            <div className="card pad">
              <h4 style={{ marginBottom: 10, fontSize: "0.9rem" }}>{t(locale, "addProductHeading")}</h4>
              <div style={{ maxHeight: 420, overflowY: "auto" }}>
                {Array.from(byCategory.entries()).map(([categoryId, { label, items }]) => (
                  <div key={categoryId} style={{ marginBottom: 10 }}>
                    <div className="muted" style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>
                      {label}
                    </div>
                    {items.map((p) => {
                      const boundAdd = async () => {
                        "use server";
                        await addQuoteLine(quote.id, p.id);
                      };
                      return (
                        <form key={p.id} action={boundAdd} style={{ marginBottom: 4 }}>
                          <button
                            className="btn"
                            type="submit"
                            style={{ width: "100%", justifyContent: "space-between", textAlign: "left" }}
                          >
                            <span>{localized(locale, p.name, p.nameFr)}</span>
                            <span className={`badge ${p.provider.sourceKind === "internal" ? "int" : "ext"}`}>
                              {statusLabel(locale, p.provider.sourceKind)}
                            </span>
                          </button>
                        </form>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
