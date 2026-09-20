"use client";

import { useState } from "react";
import { Globe, ChevronDown } from "lucide-react";
import { locales, localeNames, type Locale } from "@/i18n/routing";

/**
 * Admin content stays English-only (this is a single-operator panel, not a
 * multi-tenant app) — this switcher exists only so the header matches the
 * public site's header. Picking a language doesn't translate anything; it
 * just resets back to English, since there's nothing to switch it to.
 */
export function AdminLanguageSwitcher({ className }: { className?: string }) {
  const [locale, setLocale] = useState<Locale>("en");

  return (
    <label className={`relative ${className ?? ""}`} title="The admin panel is English-only">
      <span className="sr-only">Language</span>
      <Globe className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-espresso/40" strokeWidth={1.75} />
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        aria-label="Language"
        className="h-9 appearance-none rounded-full border border-espresso/12 bg-white ps-9 pe-8 text-sm font-medium text-espresso/70 focus:border-accent-gold/60 focus:outline-none"
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {localeNames[l]}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-espresso/40" strokeWidth={1.75} />
    </label>
  );
}
