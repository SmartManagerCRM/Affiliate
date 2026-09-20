import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { ProductGallery } from "@/components/site/ProductGallery";
import { OfferList } from "@/components/site/OfferList";
import { Disclosure } from "@/components/site/Disclosure";
import { ProductCard } from "@/components/site/ProductCard";
import { getProductBySlug, getProducts } from "@/lib/queries";
import { placeholderImage } from "@/lib/image";
import { formatPrice } from "@/lib/format";
import { SITE_URL } from "@/lib/constants";
import type { Locale } from "@/i18n/routing";

// No per-visitor data on this page, so it can be cached and revalidated in
// the background instead of hitting the database on every single request.
export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  const t = await getTranslations({ locale, namespace: "product" });
  const title = product.seo_title || product.name;
  const description =
    product.seo_description ||
    product.short_description ||
    t("metaFallbackDescription", { name: product.name });

  return {
    title,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title,
      description,
      url: `/product/${product.slug}`,
      images: product.main_image ? [product.main_image] : undefined,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale as Locale);

  const [t, tCard] = await Promise.all([
    getTranslations("product"),
    getTranslations("productCard"),
  ]);
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const images =
    product.images.length > 0
      ? product.images.map((i) => i.url)
      : [
          product.main_image ||
            placeholderImage(product.slug, {
              title: product.name,
              subtitle: product.brand?.name,
              w: 1000,
              h: 1000,
            }),
        ];

  const specs = Object.entries(
    (product.specifications as Record<string, string>) ?? {}
  );

  const relatedActivitySlug = product.categories[0]?.activity_id;
  const related = relatedActivitySlug
    ? (await getProducts({ sort: "featured" })).filter((p) => p.id !== product.id).slice(0, 4)
    : [];

  const cheapest = product.offers.length
    ? product.offers.reduce((min, o) => ((o.price ?? Infinity) < (min.price ?? Infinity) ? o : min))
    : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.short_description ?? product.description ?? undefined,
    brand: product.brand?.name ? { "@type": "Brand", name: product.brand.name } : undefined,
    image: images,
    url: `${SITE_URL}/product/${product.slug}`,
    offers:
      product.offers.length > 0
        ? {
            "@type": "AggregateOffer",
            lowPrice: cheapest?.price,
            priceCurrency: cheapest?.currency,
            offerCount: product.offers.length,
          }
        : undefined,
  };

  return (
    <Container className="py-10 sm:py-14">
      <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-espresso/45">
        <Link href="/" className="hover:text-espresso">
          {t("home")}
        </Link>
        {product.categories[0] && (
          <>
            <span>/</span>
            <span>{product.categories[0].name}</span>
          </>
        )}
        <span>/</span>
        <span className="text-espresso/70">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
        <ProductGallery images={images} productName={product.name} />

        <div className="flex flex-col">
          {product.brand?.name && (
            <span className="text-xs font-semibold uppercase tracking-widest text-espresso/40">
              {product.brand.name}
            </span>
          )}
          <h1 className="mt-2 font-serif-display text-3xl font-semibold leading-tight text-espresso sm:text-4xl">
            {product.name}
          </h1>

          <div className="mt-3 flex flex-wrap gap-2">
            {product.featured && <Badge tone="gold">{tCard("featured")}</Badge>}
            {product.categories.map((c) => (
              <Badge key={c.id} tone="neutral">
                {c.name}
              </Badge>
            ))}
          </div>

          {product.short_description && (
            <p className="mt-5 text-base leading-relaxed text-espresso/65">
              {product.short_description}
            </p>
          )}

          {cheapest && (
            <p className="mt-5 text-sm text-espresso/50">
              {t("offersFrom", { count: product.offers.length })}{" "}
              <span className="font-semibold text-espresso">
                {formatPrice(cheapest.price ?? 0, cheapest.currency ?? "USD")}
              </span>
            </p>
          )}

          <div className="mt-6">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-espresso/45">
              {t("availableOffers")}
            </h2>
            <OfferList offers={product.offers} />
          </div>

          {product.description && (
            <div className="mt-8">
              <h2 className="mb-2 font-serif-display text-lg font-semibold text-espresso">
                {t("aboutProduct")}
              </h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-espresso/65">
                {product.description}
              </p>
            </div>
          )}

          {specs.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 font-serif-display text-lg font-semibold text-espresso">
                {t("specifications")}
              </h2>
              <dl className="divide-y divide-espresso/10 rounded-2xl border border-espresso/10 bg-white">
                {specs.map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-4 px-4 py-3 text-sm">
                    <dt className="text-espresso/50">{key}</dt>
                    <dd className="text-right font-medium text-espresso">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <Disclosure className="mt-8" />
        </div>
      </div>

      {related.length > 0 && (
        <div className="mt-20">
          <h2 className="mb-6 font-serif-display text-2xl font-semibold text-espresso">
            {t("youMayAlsoLike")}
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </Container>
  );
}
