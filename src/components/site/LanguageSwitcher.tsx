"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, localeNames, type Locale } from "@/i18n/routing";

export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations("languageSwitcher");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function onChange(next: Locale) {
    const qs = searchParams.toString();
    router.push(pathname + (qs ? `?${qs}` : ""), { locale: next });
  }

  return (
    <label className={className}>
      <span className="sr-only">{t("label")}</span>
      <select
        value={locale}
        onChange={(e) => onChange(e.target.value as Locale)}
        aria-label={t("label")}
        className="h-8 rounded-full border border-espresso/15 bg-white/70 px-3 text-xs font-medium text-espresso/70 focus:border-accent-gold focus:outline-none"
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {localeNames[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
