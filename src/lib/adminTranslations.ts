import { locales, defaultLocale, type Locale } from "@/i18n/routing";

/** Locales the admin can enter translations for — everything except the
 * default, since the default locale's copy lives in the plain English
 * columns rather than under `translations`. */
export const translatableLocales: Locale[] = locales.filter(
  (locale) => locale !== defaultLocale
);

/** Reads `translations.<locale>.<field>` inputs off a submitted admin form
 * into the `{ [locale]: { [field]: string } }` shape stored in the
 * `translations` jsonb column. Blank fields are omitted rather than stored
 * as empty strings, so the public site's fallback-to-English logic applies. */
export function readTranslationsFromForm(formData: FormData, fields: string[]) {
  const result: Partial<Record<Locale, Record<string, string>>> = {};
  for (const locale of translatableLocales) {
    const entry: Record<string, string> = {};
    for (const field of fields) {
      const value = String(formData.get(`translations.${locale}.${field}`) ?? "").trim();
      if (value) entry[field] = value;
    }
    if (Object.keys(entry).length > 0) result[locale] = entry;
  }
  return result;
}
