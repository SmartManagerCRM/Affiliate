import type { MetadataRoute } from "next";
import { getActivities, getProducts } from "@/lib/queries";
import { SITE_URL } from "@/lib/constants";
import { locales, defaultLocale } from "@/i18n/routing";

function localizedUrl(path: string, locale: string) {
  const prefix = locale === defaultLocale ? "" : `/${locale}`;
  return `${SITE_URL}${prefix}${path}`;
}

function languageAlternates(path: string) {
  return Object.fromEntries(locales.map((locale) => [locale, localizedUrl(path, locale)]));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const activities = await getActivities();
  const products = await getProducts({});

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      changeFrequency: "weekly",
      priority: 1,
      alternates: { languages: languageAlternates("") },
    },
    {
      url: `${SITE_URL}/search`,
      changeFrequency: "monthly",
      priority: 0.3,
      alternates: { languages: languageAlternates("/search") },
    },
  ];

  const activityEntries: MetadataRoute.Sitemap = activities.map((a) => ({
    url: `${SITE_URL}/${a.slug}`,
    changeFrequency: "weekly",
    priority: 0.8,
    alternates: { languages: languageAlternates(`/${a.slug}`) },
  }));

  const productEntries: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE_URL}/product/${p.slug}`,
    lastModified: p.updated_at,
    changeFrequency: "weekly",
    priority: 0.6,
    alternates: { languages: languageAlternates(`/product/${p.slug}`) },
  }));

  return [...staticEntries, ...activityEntries, ...productEntries];
}
