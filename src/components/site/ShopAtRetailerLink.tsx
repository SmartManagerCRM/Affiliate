"use client";

import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/Button";

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

/**
 * A "Shop at Retailer" action: navigates to the existing, untouched
 * /go/[offerId] redirect (exactly like Buy Now) while best-effort logging a
 * cart_events retailer_shop_click analytics row. The click is a real <a
 * href> navigation — nothing here can delay or block it — so the logging
 * call uses fetch(..., { keepalive: true }) to survive the page unload that
 * follows in the same tick, rather than awaiting it first.
 */
export function ShopAtRetailerLink({
  href,
  offerId,
  productId,
  retailerId,
  metadata,
  variant,
  size,
  className,
  children,
}: {
  href: string;
  offerId: string;
  productId: string;
  retailerId: string;
  metadata?: Record<string, unknown>;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  function logClick() {
    try {
      fetch("/api/cart/shop-click", {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId, productId, retailerId, metadata }),
      }).catch(() => {});
    } catch {
      // Analytics-only — never block navigation to the retailer.
    }
  }

  return (
    <ButtonLink href={href} variant={variant} size={size} className={className} onClick={logClick}>
      {children}
    </ButtonLink>
  );
}
