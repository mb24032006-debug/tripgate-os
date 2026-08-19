import { prisma } from "./db";

// Looks up a managed default — never authoritative on an already-resolved line (a rate change here
// must not silently reprice a quote a customer already saw). Returns null when no managed rate
// exists for this exact pair, same as "unresolved" everywhere else in the FX handling.
export async function getManagedRate(fromCurrency: string, toCurrency: string): Promise<number | null> {
  if (fromCurrency === toCurrency) return 1;
  const row = await prisma.exchangeRate.findUnique({
    where: { fromCurrency_toCurrency: { fromCurrency, toCurrency } },
  });
  return row?.rate ?? null;
}
