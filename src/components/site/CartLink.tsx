"use client";

import { useTranslations } from "next-intl";
import { ShoppingBag } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useCart } from "@/components/site/CartProvider";

export function CartLink() {
  const t = useTranslations("cart");
  const { count } = useCart();

  return (
    <Link
      href="/cart"
      aria-label={count > 0 ? t("cartCount", { count }) : t("openCart")}
      className="relative flex h-10 w-10 items-center justify-center rounded-full border border-espresso/15 text-espresso transition-colors hover:bg-beige/60"
    >
      <ShoppingBag className="h-4.5 w-4.5" strokeWidth={1.75} />
      {count > 0 && (
        <span className="absolute -end-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-accent-green px-1 text-[10px] font-semibold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
