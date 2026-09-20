"use client";

import { useTranslations } from "next-intl";
import { ANY_CURRENCY, GLOBAL_CURRENCIES, MENA_CURRENCIES } from "@/lib/currency";
import { useCurrency } from "@/components/site/CurrencyProvider";

export function CurrencySwitcher({ className }: { className?: string }) {
  const t = useTranslations("currencySwitcher");
  const { currency, setCurrency } = useCurrency();

  return (
    <label className={className}>
      <span className="sr-only">{t("label")}</span>
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        aria-label={t("label")}
        className="h-8 rounded-full border border-espresso/15 bg-white/70 px-3 text-xs font-medium text-espresso/70 focus:border-accent-gold focus:outline-none"
      >
        <option value={ANY_CURRENCY}>{t("all")}</option>
        <optgroup label={t("mena")}>
          {MENA_CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} — {c.label}
            </option>
          ))}
        </optgroup>
        <optgroup label={t("global")}>
          {GLOBAL_CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} — {c.label}
            </option>
          ))}
        </optgroup>
      </select>
    </label>
  );
}
