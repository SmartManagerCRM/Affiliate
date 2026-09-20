"use client";

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { ANY_CURRENCY, CURRENCY_CODES } from "@/lib/currency";

const STORAGE_KEY = "si_currency";

function isValidCurrency(value: string | null): value is string {
  return value !== null && (value === ANY_CURRENCY || CURRENCY_CODES.includes(value));
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isValidCurrency(stored) ? stored : ANY_CURRENCY;
  } catch {
    return ANY_CURRENCY;
  }
}

function getServerSnapshot() {
  return ANY_CURRENCY;
}

type CurrencyContextValue = {
  currency: string;
  setCurrency: (code: string) => void;
};

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: ANY_CURRENCY,
  setCurrency: () => {},
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const currency = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setCurrency = useCallback((next: string) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore — the selection still applies for the rest of this visit.
    }
    // The native "storage" event only fires in *other* tabs; dispatch one
    // here too so this tab's useSyncExternalStore subscribers re-read it.
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
  }, []);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
