/** Formats a price using the offer's own currency — never coerced to the viewer's locale currency. */
export function formatPrice(price: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      currencyDisplay: "code",
      maximumFractionDigits: price % 1 === 0 ? 0 : 2,
    })
      .format(price)
      .trim();
  } catch {
    return `${currency} ${price.toLocaleString("en-US")}`;
  }
}

export function formatPriceFrom(price: number, currency: string) {
  return `From ${formatPrice(price, currency)}`;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function discountPercent(price: number, originalPrice?: number | null) {
  if (!originalPrice || originalPrice <= price) return null;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}
