import { defineRouting } from "next-intl/routing";

export const locales = ["en", "fr", "ar"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  ar: "العربية",
};

export const rtlLocales: Locale[] = ["ar"];

export const routing = defineRouting({
  locales,
  defaultLocale,
  // English has no URL prefix (/cafe); other locales are prefixed (/fr/cafe, /ar/cafe).
  localePrefix: "as-needed",
});
