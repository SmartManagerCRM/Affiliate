"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { ANY_CURRENCY, CURRENCY_CODES } from "@/lib/currency";
import { convertAmount, type FxRates } from "@/lib/fx";

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
  /** Converts `amount` (in `fromCurrency`) into the selected currency.
   * Returns null when there's no selection, rates haven't loaded yet, or
   * either currency is unsupported — callers should fall back to the real,
   * unconverted price rather than show nothing. */
  convert: (amount: number, fromCurrency: string) => number | null;
  ratesUpdatedAt: string | null;
};

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: ANY_CURRENCY,
  setCurrency: () => {},
  convert: () => null,
  ratesUpdatedAt: null,
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const currency = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [rates, setRates] = useState<FxRates | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/fx-rates")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: FxRates | null) => {
        if (!cancelled && data?.rates) setRates(data);
      })
      .catch(() => {
        // Rates just stay null — prices fall back to their real, unconverted values.
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const convert = useCallback(
    (amount: number, fromCurrency: string) => {
      if (currency === ANY_CURRENCY) return null;
      return convertAmount(amount, fromCurrency, currency, rates);
    },
    [currency, rates]
  );

  return (
    <CurrencyContext.Provider
      value={{ currency, setCurrency, convert, ratesUpdatedAt: rates?.fetchedAt ?? null }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
