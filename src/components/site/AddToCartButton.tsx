"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, ShoppingBag } from "lucide-react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/components/site/CartProvider";
import { addToCartAction } from "@/actions/cart";

const ADDED_DISPLAY_MS = 2000;

export function AddToCartButton({
  productId,
  offerId,
  size = "sm",
  variant = "outline",
  className,
}: {
  productId: string;
  offerId: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "ghost" | "outline";
  className?: string;
}) {
  const t = useTranslations("productCard");
  const { refresh } = useCart();
  const [isPending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const result = await addToCartAction({ productId, offerId });
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
    <div className="flex flex-col items-end gap-1">
      <Button
        onClick={onClick}
        disabled={isPending}
        size={size}
        variant={added ? "secondary" : variant}
        className={clsx("shrink-0", className)}
      >
        {added ? (
          <>
            <Check className="h-3.5 w-3.5" strokeWidth={2} />
            {t("added")}
          </>
        ) : (
          <>
            <ShoppingBag className="h-3.5 w-3.5" strokeWidth={1.75} />
            {t("addToCart")}
          </>
        )}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
