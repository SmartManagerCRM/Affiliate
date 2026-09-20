"use client";

import { useState } from "react";
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
    <label className={className} title="The admin panel is English-only">
      <span className="sr-only">Language</span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        aria-label="Language"
        className="h-8 rounded-full border border-white/15 bg-white/5 px-3 text-xs font-medium text-white/70 focus:border-accent-gold focus:outline-none"
      >
        {locales.map((l) => (
          <option key={l} value={l} className="text-espresso">
            {localeNames[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
