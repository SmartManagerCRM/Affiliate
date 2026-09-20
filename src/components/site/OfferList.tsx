"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Price } from "@/components/site/Price";
import { discountPercent } from "@/lib/format";
import { ANY_CURRENCY } from "@/lib/currency";
import { useCurrency } from "@/components/site/CurrencyProvider";
import type { OfferPublic } from "@/lib/types";

export function OfferList({ offers }: { offers: OfferPublic[] }) {
  const t = useTranslations("offerList");
  const { currency } = useCurrency();

  const availabilityLabel: Record<string, string> = {
    in_stock: t("inStock"),
    limited: t("limitedAvailability"),
    out_of_stock: t("outOfStock"),
    preorder: t("preorder"),
  };

  if (offers.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-espresso/15 p-8 text-center text-sm text-espresso/50">
        {t("empty")}
      </div>
    );
  }

  const cheapestId = offers.reduce((min, o) =>
    (o.price ?? Infinity) < (min.price ?? Infinity) ? o : min
  ).id;

  // Never converts a price — only reorders so offers already in the
  // shopper's chosen currency surface first, and flags them visually.
  const sorted =
    currency === ANY_CURRENCY
      ? offers
      : [...offers].sort((a, b) => {
          const aMatch = a.currency === currency ? 0 : 1;
          const bMatch = b.currency === currency ? 0 : 1;
          return aMatch - bMatch;
        });

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((offer) => {
        const discount = discountPercent(offer.price ?? 0, offer.original_price);
        const isBestValue = offer.id === cheapestId && offers.length > 1;
        const matchesCurrency = currency !== ANY_CURRENCY && offer.currency === currency;

        return (
          <div
            key={offer.id}
            className={`flex flex-col gap-4 rounded-2xl border bg-white p-4 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:justify-between sm:p-5 ${
              matchesCurrency ? "border-accent-green/50 ring-1 ring-accent-green/30" : "border-espresso/10"
            }`}
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
                  {isBestValue && <Badge tone="green">{t("bestValue")}</Badge>}
                  {matchesCurrency && <Badge tone="gold">{t("matchesCurrency")}</Badge>}
                  {discount && <Badge tone="gold">-{discount}%</Badge>}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-espresso/50">
                  {offer.country && <span>{offer.country}</span>}
                  {offer.availability && (
                    <span>· {availabilityLabel[offer.availability] ?? offer.availability}</span>
                  )}
                  {offer.shipping_info && <span>· {offer.shipping_info}</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 sm:justify-end">
              <div className="flex flex-col items-end">
                {offer.original_price && offer.original_price > (offer.price ?? 0) && (
                  <Price
                    amount={offer.original_price}
                    currency={offer.currency ?? "USD"}
                    compact
                    className="text-xs text-espresso/40 line-through"
                  />
                )}
                <Price
                  amount={offer.price ?? 0}
                  currency={offer.currency ?? "USD"}
                  className="font-serif-display text-xl font-semibold text-espresso"
                />
              </div>
              <ButtonLink href={`/go/${offer.id}`} size="md">
                {t("buyNow")}
              </ButtonLink>
            </div>
          </div>
        );
      })}
    </div>
  );
}
