import Image from "next/image";
import { ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatPrice, discountPercent } from "@/lib/format";
import type { OfferPublic } from "@/lib/types";

const AVAILABILITY_LABEL: Record<string, string> = {
  in_stock: "In stock",
  limited: "Limited availability",
  out_of_stock: "Out of stock",
  preorder: "Preorder",
};

export function OfferList({ offers }: { offers: OfferPublic[] }) {
  if (offers.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-espresso/15 p-8 text-center text-sm text-espresso/50">
        No offers are currently available for this product.
      </div>
    );
  }

  const cheapestId = offers.reduce((min, o) =>
    (o.price ?? Infinity) < (min.price ?? Infinity) ? o : min
  ).id;

  return (
    <div className="flex flex-col gap-3">
      {offers.map((offer) => {
        const discount = discountPercent(offer.price ?? 0, offer.original_price);
        const isBestValue = offer.id === cheapestId && offers.length > 1;

        return (
          <div
            key={offer.id}
            className="flex flex-col gap-4 rounded-2xl border border-espresso/10 bg-white p-4 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:justify-between sm:p-5"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-beige">
                {offer.retailer_logo ? (
                  <Image
                    src={offer.retailer_logo}
                    alt={offer.retailer_name ?? "Retailer"}
                    width={48}
                    height={48}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="font-serif-display text-lg font-semibold text-espresso/60">
                    {(offer.retailer_name ?? "R").charAt(0)}
                  </span>
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-espresso">{offer.retailer_name}</span>
                  {isBestValue && <Badge tone="green">Best Value</Badge>}
                  {discount && <Badge tone="gold">-{discount}%</Badge>}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-espresso/50">
                  {offer.country && <span>{offer.country}</span>}
                  {offer.availability && (
                    <span>· {AVAILABILITY_LABEL[offer.availability] ?? offer.availability}</span>
                  )}
                  {offer.shipping_info && <span>· {offer.shipping_info}</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 sm:justify-end">
              <div className="flex flex-col items-end">
                {offer.original_price && offer.original_price > (offer.price ?? 0) && (
                  <span className="text-xs text-espresso/40 line-through">
                    {formatPrice(offer.original_price, offer.currency ?? "USD")}
                  </span>
                )}
                <span className="font-serif-display text-xl font-semibold text-espresso">
                  {formatPrice(offer.price ?? 0, offer.currency ?? "USD")}
                </span>
              </div>
              <ButtonLink href={`/go/${offer.id}`} size="md">
                Buy Now
              </ButtonLink>
            </div>
          </div>
        );
      })}
    </div>
  );
}
