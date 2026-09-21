"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { clearCartAction } from "@/actions/cart";
import { useCart } from "@/components/site/CartProvider";

export function ClearCartButton() {
  const t = useTranslations("cart");
  const router = useRouter();
  const { refresh: refreshCartBadge } = useCart();
  const [isPending, startTransition] = useTransition();

  function onClick() {
    if (!window.confirm(t("clearCartConfirm"))) return;
    startTransition(async () => {
      const result = await clearCartAction();
      if (result.ok) {
        router.refresh();
        refreshCartBadge();
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      className="text-sm font-medium text-espresso/50 underline-offset-2 hover:text-red-600 hover:underline disabled:opacity-50"
    >
      {t("clearCart")}
    </button>
  );
}
