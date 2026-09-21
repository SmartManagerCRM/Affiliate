"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { Price } from "@/components/site/Price";
import { useCart } from "@/components/site/CartProvider";
import { updateCartItemQuantityAction, removeCartItemAction } from "@/actions/cart";
import { placeholderImage, isOptimizableImageSrc } from "@/lib/image";
import type { CartItemView } from "@/lib/types";

const MAX_QUANTITY = 99;

export function CartItemRow({ item }: { item: CartItemView }) {
  const t = useTranslations("cart");
  const router = useRouter();
  const { refresh: refreshCartBadge } = useCart();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const image =
    item.product_main_image ||
    placeholderImage(item.product_slug, { title: item.product_name });
  const price = item.is_available ? (item.current_price ?? item.price_at_add) : item.price_at_add;
  const currency = item.is_available ? (item.current_currency ?? item.currency_at_add) : item.currency_at_add;
  const subtotal = price * item.quantity;

  function changeQuantity(next: number) {
    if (next < 1 || next > MAX_QUANTITY) return;
    setError(null);
    startTransition(async () => {
      const result = await updateCartItemQuantityAction(item.cart_item_id, next);
      if (result.ok) router.refresh();
      else setError(result.message);
    });
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      const result = await removeCartItemAction(item.cart_item_id);
      if (result.ok) {
        router.refresh();
        refreshCartBadge();
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4 border-b border-espresso/8 py-5 sm:flex-row sm:items-center last:border-b-0">
      <div className="flex shrink-0 flex-col gap-2 sm:w-[38%]">
        <Link href={`/product/${item.product_slug}`} className="flex items-center gap-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-beige">
            <Image
              src={image}
              alt={item.product_name}
              fill
              unoptimized={!isOptimizableImageSrc(image)}
              className="object-cover"
            />
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-espresso">{item.product_name}</p>
            <p className="text-sm text-espresso/50">{item.retailer_name}</p>
            {!item.is_available && <p className="mt-0.5 text-xs font-medium text-red-600">{t("unavailable")}</p>}
          </div>
        </Link>
        {item.is_available && (
          <ButtonLink href={`/go/${item.offer_id}`} size="sm" variant="outline" className="self-start">
            {t("shopAtRetailer")}
          </ButtonLink>
        )}
      </div>

      <div className="flex flex-1 items-center justify-between gap-4 sm:justify-end">
        <Price amount={price} currency={currency} compact className="w-24 text-sm font-medium text-espresso sm:text-center" />

        {item.is_available ? (
          <div className="flex items-center gap-1 rounded-full border border-espresso/15">
            <button
              type="button"
              onClick={() => changeQuantity(item.quantity - 1)}
              disabled={isPending}
              aria-label="-"
              className="flex h-8 w-8 items-center justify-center rounded-full text-espresso/60 hover:bg-beige/70 disabled:opacity-40"
            >
              <Minus className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
            <span className="w-6 text-center text-sm font-medium text-espresso">{item.quantity}</span>
            <button
              type="button"
              onClick={() => changeQuantity(item.quantity + 1)}
              disabled={isPending || item.quantity >= MAX_QUANTITY}
              aria-label="+"
              className="flex h-8 w-8 items-center justify-center rounded-full text-espresso/60 hover:bg-beige/70 disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
        ) : (
          <span className="w-[88px]" />
        )}

        <Price amount={subtotal} currency={currency} compact className="w-24 text-end font-semibold text-espresso" />

        <button
          type="button"
          onClick={remove}
          disabled={isPending}
          aria-label={t("remove")}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-espresso/40 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
