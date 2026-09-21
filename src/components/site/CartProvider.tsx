"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type CartContextValue = {
  /** Number of distinct line items (offers) in the cart — not total quantity. */
  count: number;
  /** Re-fetches the live count. Call after any successful add/remove so the header badge stays correct regardless of which component made the change. */
  refresh: () => void;
};

const CartContext = createContext<CartContextValue>({
  count: 0,
  refresh: () => {},
});

export function CartProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    fetch("/api/cart/summary")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { count?: number } | null) => {
        if (data && typeof data.count === "number") setCount(data.count);
      })
      .catch(() => {
        // Badge just keeps its last known value — never blocks the page.
      });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return <CartContext.Provider value={{ count, refresh }}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
