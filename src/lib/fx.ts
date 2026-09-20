export type FxRates = {
  base: string;
  rates: Record<string, number>;
  fetchedAt: string;
};

/** Converts `amount` (in `from`) into `to` using rates quoted against a
 * single base currency. Returns null rather than an approximation when
 * either currency is missing from the rate table, so callers can fall back
 * to showing the real, unconverted price instead of a wrong number. */
export function convertAmount(
  amount: number,
  from: string,
  to: string,
  rates: FxRates | null
): number | null {
  if (from === to) return amount;
  if (!rates) return null;

  const fromRate = from === rates.base ? 1 : rates.rates[from];
  const toRate = to === rates.base ? 1 : rates.rates[to];
  if (!fromRate || !toRate) return null;

  return (amount / fromRate) * toRate;
}
