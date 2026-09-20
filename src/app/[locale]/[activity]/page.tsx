import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { ProductCard } from "@/components/site/ProductCard";
import { CategoryPills } from "@/components/site/CategoryPills";
import { FiltersBar } from "@/components/site/FiltersBar";
import { SortSelect } from "@/components/site/SortSelect";
import { placeholderImage } from "@/lib/image";
import {
  getActivityBySlug,
  getBrandsForActivity,
  getCategoriesForActivity,
  getProducts,
  getRetailersForProducts,
} from "@/lib/queries";
import type { Locale } from "@/i18n/routing";
import type { SortOption } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; activity: string }>;
}): Promise<Metadata> {
  const { locale, activity: slug } = await params;
  const activity = await getActivityBySlug(slug);
  if (!activity) return {};

  const t = await getTranslations({ locale, namespace: "activity" });
  const title = activity.seo_title || t("essentials", { name: activity.name });
  const description =
    activity.seo_description || t("defaultDescription", { name: activity.name });

  return {
    title,
    description,
    alternates: { canonical: `/${activity.slug}` },
    openGraph: { title, description, url: `/${activity.slug}` },
  };
}

export default async function ActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; activity: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, activity: activitySlug } = await params;
  setRequestLocale(locale as Locale);

  const t = await getTranslations("activity");
  const sp = await searchParams;
  const activity = await getActivityBySlug(activitySlug);
  if (!activity) notFound();

  const categorySlug = typeof sp.category === "string" ? sp.category : undefined;
  const sort = (typeof sp.sort === "string" ? sp.sort : "featured") as SortOption;

  const [categories, products, brands] = await Promise.all([
    getCategoriesForActivity(activity.id),
    getProducts({
      activitySlug: activity.slug,
      categorySlug,
      brandSlug: typeof sp.brand === "string" ? sp.brand : undefined,
      retailerSlug: typeof sp.retailer === "string" ? sp.retailer : undefined,
      country: typeof sp.country === "string" ? sp.country : undefined,
      availability: typeof sp.availability === "string" ? sp.availability : undefined,
      priceMin: sp.priceMin ? Number(sp.priceMin) : undefined,
      priceMax: sp.priceMax ? Number(sp.priceMax) : undefined,
      sort,
    }),
    getBrandsForActivity(activity.slug),
  ]);

  const retailers = await getRetailersForProducts(products.map((p) => p.id));
  const countries = Array.from(
    new Set(retailers.map((r) => r.country).filter((c): c is string => Boolean(c)))
  );

  const featured = products.filter((p) => p.featured).slice(0, 4);
  const heroImage =
    activity.hero_image ||
    placeholderImage(activity.slug, { title: activity.name, subtitle: "Selected Items", w: 1600, h: 700 });

  const basePath = `/${activity.slug}`;

  return (
    <>
      <section className="relative overflow-hidden border-b border-espresso/10">
        <div className="absolute inset-0">
          <Image src={heroImage} alt={activity.name} fill priority className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-espresso via-espresso/55 to-espresso/20" />
        </div>
        <Container className="relative py-16 sm:py-24">
          <span className="text-2xl">{activity.icon || "✦"}</span>
          <h1 className="mt-3 font-serif-display text-3xl font-semibold text-cream sm:text-5xl">
            {t("essentials", { name: activity.name })}
          </h1>
          <p className="mt-3 max-w-xl text-balance text-sm leading-relaxed text-cream/75 sm:text-base">
            {activity.description || t("defaultDescription", { name: activity.name })}
          </p>
        </Container>
      </section>

      <Container className="py-10 sm:py-14">
        <CategoryPills basePath={basePath} categories={categories} activeSlug={categorySlug} />

        {featured.length > 0 && !categorySlug && (
          <div className="mt-10">
            <h2 className="mb-5 font-serif-display text-2xl font-semibold text-espresso">
              {t("featuredPicks")}
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
              {featured.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-serif-display text-2xl font-semibold text-espresso">
            {categorySlug
              ? categories.find((c) => c.slug === categorySlug)?.name ?? t("allProducts")
              : t("allProducts")}
            <span className="ml-2 text-base font-normal text-espresso/40">
              ({products.length})
            </span>
          </h2>
          <div className="flex items-center gap-3">
            <FiltersBar basePath={basePath} brands={brands.map((b) => ({ value: b.slug, label: b.name }))} retailers={retailers.map((r) => ({ value: r.slug, label: r.name }))} countries={countries.map((c) => ({ value: c, label: c }))} />
            <SortSelect basePath={basePath} />
          </div>
        </div>

        {products.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border border-dashed border-espresso/15 p-12 text-center text-espresso/50">
            {t("noProducts")}
          </div>
        )}
      </Container>
    </>
  );
}
