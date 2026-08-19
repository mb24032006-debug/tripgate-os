// Money is always stored as *Minor units (cents) in an Int — see prisma/schema.prisma's header
// comment. This is the one place that turns it back into a display string.
export function formatMinor(amountMinor: number | null | undefined, currency: string = "MAD") {
  if (amountMinor == null) return "—";
  return `${currency} ${(amountMinor / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}

// A line's currency may differ from its Quote's (e.g. a Moods Travel hotel priced in USD sitting
// on a MAD quote). Returns null when unresolved — the caller must treat that as "cannot blend into
// a total," never silently reinterpret the native amount as the quote's currency. This is the one
// place that math happens, shared between the Quote Builder's live display and sendQuote's frozen
// snapshot, so the two can never drift apart the way the original global-markup total once did.
export function resolvedLineTotalMinor(line: {
  sellingPriceMinor: number;
  quantity: number;
  currency: string | null;
  fxRateToQuoteCurrency: number | null;
}, quoteCurrency: string): number | null {
  const native = line.sellingPriceMinor * line.quantity;
  const lineCurrency = line.currency ?? quoteCurrency;
  if (lineCurrency === quoteCurrency) return native;
  if (line.fxRateToQuoteCurrency != null) return Math.round(native * line.fxRateToQuoteCurrency);
  return null;
}

export function resolvedLineNetMinor(line: {
  netCostMinor: number;
  quantity: number;
  currency: string | null;
  fxRateToQuoteCurrency: number | null;
}, quoteCurrency: string): number | null {
  const native = line.netCostMinor * line.quantity;
  const lineCurrency = line.currency ?? quoteCurrency;
  if (lineCurrency === quoteCurrency) return native;
  if (line.fxRateToQuoteCurrency != null) return Math.round(native * line.fxRateToQuoteCurrency);
  return null;
}

// The ONE quote-total function — every screen that shows a quote's total (the Quote Builder, the
// Quotes list, a Trip's quote table, the Dashboard's pipeline value, sendQuote's frozen snapshot)
// must call this instead of re-deriving its own sum. Before this existed, three of those five call
// sites summed sellingPriceMinor directly — skipping quantity, skipping FX conversion, or both —
// so the same quote read a different total on every screen (off by 4x-12x wherever quantity > 1).
// Returns null when any line is unresolved (mismatched currency, no FX rate set yet): callers must
// show that as "can't total this yet," never as 0 or as a partial sum.
export function computeQuoteTotal(
  lines: {
    sellingPriceMinor: number;
    quantity: number;
    currency: string | null;
    fxRateToQuoteCurrency: number | null;
  }[],
  quoteCurrency: string
): number | null {
  let total = 0;
  for (const line of lines) {
    const resolved = resolvedLineTotalMinor(line, quoteCurrency);
    if (resolved == null) return null;
    total += resolved;
  }
  return total;
}

// Same shape as computeQuoteTotal but for net cost — the other half every margin figure needs.
export function computeQuoteNetTotal(
  lines: {
    netCostMinor: number;
    quantity: number;
    currency: string | null;
    fxRateToQuoteCurrency: number | null;
  }[],
  quoteCurrency: string
): number | null {
  let total = 0;
  for (const line of lines) {
    const resolved = resolvedLineNetMinor(line, quoteCurrency);
    if (resolved == null) return null;
    total += resolved;
  }
  return total;
}
