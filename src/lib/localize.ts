import type { Locale } from "@/i18n/routing";
import type { Activity, Category, ProductCardData, ProductWithMeta } from "@/lib/types";

type LocaleFields = Record<string, string | undefined>;
type Translations = Partial<Record<Locale, LocaleFields>>;

function pick(
  translations: unknown,
  locale: Locale,
  field: string,
  fallback: string | null
): string | null {
  const value = (translations as Translations | null)?.[locale]?.[field];
  return typeof value === "string" && value.trim() ? value : fallback;
}

/** Activity/category/product name & description fields come from the admin
 * in English; `translations` holds optional per-locale overrides entered
 * separately. Missing overrides fall back to the English column, never to
 * a blank or machine-translated string. */
export function localizeActivity<T extends Activity>(activity: T, locale: Locale): T {
  return {
    ...activity,
    name: pick(activity.translations, locale, "name", activity.name) ?? activity.name,
    description: pick(activity.translations, locale, "description", activity.description),
    seo_title: pick(activity.translations, locale, "seo_title", activity.seo_title),
    seo_description: pick(
      activity.translations,
      locale,
      "seo_description",
      activity.seo_description
    ),
  };
}

export function localizeCategory<T extends Category>(category: T, locale: Locale): T {
  return {
    ...category,
    name: pick(category.translations, locale, "name", category.name) ?? category.name,
    description: pick(category.translations, locale, "description", category.description),
  };
}

export function localizeProduct<T extends ProductCardData | ProductWithMeta>(
  product: T,
  locale: Locale
): T {
  return {
    ...product,
    name: pick(product.translations, locale, "name", product.name) ?? product.name,
    short_description: pick(
      product.translations,
      locale,
      "short_description",
      product.short_description
    ),
    description: pick(product.translations, locale, "description", product.description),
    seo_title: pick(product.translations, locale, "seo_title", product.seo_title),
    seo_description: pick(
      product.translations,
      locale,
      "seo_description",
      product.seo_description
    ),
  };
}
