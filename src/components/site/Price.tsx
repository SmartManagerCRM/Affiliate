"use client";

import { formatPrice } from "@/lib/format";
import { useCurrency } from "@/components/site/CurrencyProvider";

/**
 * Shows a price in the shopper's chosen currency using live FX rates, with
 * the real offer price (what actually gets charged, at the retailer, in
 * its own currency) always shown alongside — converting silently would
 * make the estimate look like the real chargeable amount.
 */
export function Price({
  amount,
  currency,
  className,
  compact = false,
}: {
  amount: number;
  currency: string;
  className?: string;
  compact?: boolean;
}) {
  const { convert, currency: selected } = useCurrency();
  const converted = selected !== currency ? convert(amount, currency) : null;

  if (converted === null) {
    return <span className={className}>{formatPrice(amount, currency)}</span>;
  }

  return (
    <span className={className}>
      {formatPrice(converted, selected)}
      {!compact && (
        <span className="ms-1.5 text-[0.7em] font-normal text-espresso/40">
          ({formatPrice(amount, currency)})
        </span>
      )}
    </span>
  );
}
