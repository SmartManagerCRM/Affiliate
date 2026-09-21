"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, ShoppingBag } from "lucide-react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";
import { Price } from "@/components/site/Price";
import { useCart } from "@/components/site/CartProvider";
import { addToCartAction } from "@/actions/cart";
import type { OfferPublic } from "@/lib/types";

const ADDED_DISPLAY_MS = 2500;

/**
 * Separate from OfferList (which keeps its own per-offer Buy Now buttons
 * completely unchanged) — this is purely the "choose which offer, then add
 * it to the cart" flow. A single-offer product skips the selection step
 * entirely: there's nothing ambiguous to choose. A product with no offers
 * renders nothing (matches OfferList's own empty state upstream).
 */
export function AddToCartPanel({ productId, offers }: { productId: string; offers: OfferPublic[] }) {
  const t = useTranslations("product");
  const { refresh } = useCart();
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(offers.length === 1 ? offers[0].id : null);
  const [isPending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  if (offers.length === 0) return null;

  function onAdd() {
    if (!selectedOfferId) return;
    setError(null);
    startTransition(async () => {
      const result = await addToCartAction({ productId, offerId: selectedOfferId as string });
      if (result.ok) {
        setAdded(true);
        refresh();
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setAdded(false), ADDED_DISPLAY_MS);
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-espresso/10 bg-white p-4 sm:p-5">
      {offers.length > 1 && (
        <>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-espresso/45">
            {t("selectRetailer")}
          </h3>
          <div className="mb-4 flex flex-col gap-2">
            {offers.map((offer) => {
              const isSelected = offer.id === selectedOfferId;
              return (
                <button
                  key={offer.id}
                  type="button"
                  onClick={() => setSelectedOfferId(offer.id)}
                  className={clsx(
                    "flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-start transition-colors",
                    isSelected ? "border-accent-green bg-accent-green/5" : "border-espresso/10 hover:border-espresso/20"
                  )}
                >
                  <span className="text-sm font-medium text-espresso">{offer.retailer_name}</span>
                  <span className="flex items-center gap-3">
                    <Price amount={offer.price ?? 0} currency={offer.currency ?? "USD"} compact className="text-sm font-semibold text-espresso" />
                    <span
                      className={clsx(
                        "rounded-full px-3 py-1 text-xs font-medium",
                        isSelected ? "bg-accent-green text-white" : "bg-beige text-espresso/60"
                      )}
                    >
                      {isSelected ? t("selected") : t("select")}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <Button onClick={onAdd} disabled={isPending || !selectedOfferId} variant={added ? "secondary" : "primary"} className="w-full">
        {added ? (
          <>
            <Check className="h-4 w-4" strokeWidth={2} />
            {t("added")}
          </>
        ) : (
          <>
            <ShoppingBag className="h-4 w-4" strokeWidth={1.75} />
            {offers.length > 1 ? t("addSelectedOfferToCart") : t("addToCart")}
          </>
        )}
      </Button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
