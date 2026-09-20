import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { LocaleButtonLink } from "@/components/ui/Button";
import { ActivityCard } from "@/components/site/ActivityCard";
import { ProductCard } from "@/components/site/ProductCard";
import { Disclosure } from "@/components/site/Disclosure";
import { getActivities, getFeaturedProducts } from "@/lib/queries";
import { localizeActivity, localizeProduct } from "@/lib/localize";
import type { Locale } from "@/i18n/routing";

// No per-visitor data on this page, so it can be cached and revalidated in
// the background instead of hitting the database on every single request.
export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: "/" },
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const [t, rawActivities, rawFeatured] = await Promise.all([
    getTranslations("home"),
    getActivities(),
    getFeaturedProducts(8),
  ]);
  const activities = rawActivities.map((a) => localizeActivity(a, locale as Locale));
  const featured = rawFeatured.map((p) => localizeProduct(p, locale as Locale));

  const valuePoints = [
    { title: t("valueCuratedTitle"), body: t("valueCuratedBody") },
    { title: t("valueTrustedTitle"), body: t("valueTrustedBody") },
    { title: t("valueOffersTitle"), body: t("valueOffersBody") },
    { title: t("valueDirectTitle"), body: t("valueDirectBody") },
  ];

  return (
    <>
      <section className="relative overflow-hidden border-b border-espresso/10 bg-gradient-to-b from-beige/70 to-cream">
        <div
          className="pointer-events-none absolute -end-24 -top-24 h-96 w-96 rounded-full bg-accent-gold/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -start-32 bottom-0 h-80 w-80 rounded-full bg-accent-green/10 blur-3xl"
          aria-hidden
        />
        <Container className="relative py-20 sm:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center rounded-full border border-espresso/15 bg-white/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-espresso/60">
              {t("badge")}
            </span>
            <h1 className="mt-6 text-balance font-serif-display text-4xl font-semibold leading-[1.1] text-espresso sm:text-6xl">
              {t("heroLine1")}
              <br />
              <span className="italic text-accent-gold">{t("heroEmphasis")}</span>{" "}
              {t("heroLine2")}
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-balance text-base leading-relaxed text-espresso/60 sm:text-lg">
              {t("heroSubtitle")}
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <LocaleButtonLink href="#activities" size="lg">
                {t("exploreProducts")}
              </LocaleButtonLink>
              <LocaleButtonLink href="/search" size="lg" variant="outline">
                {t("searchProducts")}
              </LocaleButtonLink>
            </div>
          </div>
        </Container>
      </section>

      <section id="activities" className="py-16 sm:py-24">
        <Container>
          <div className="mb-10 flex flex-col items-start gap-3 sm:mb-12">
            <span className="text-xs font-semibold uppercase tracking-widest text-accent-green">
              {t("activitiesEyebrow")}
            </span>
            <h2 className="font-serif-display text-3xl font-semibold text-espresso sm:text-4xl">
              {t("activitiesTitle")}
            </h2>
          </div>

          {activities.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {activities.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} />
              ))}
            </div>
          ) : (
            <p className="text-espresso/50">{t("activitiesEmpty")}</p>
          )}
        </Container>
      </section>

      {featured.length > 0 && (
        <section className="bg-beige/50 py-16 sm:py-24">
          <Container>
            <div className="mb-10 flex flex-col items-start gap-3 sm:mb-12">
              <span className="text-xs font-semibold uppercase tracking-widest text-accent-green">
                {t("featuredEyebrow")}
              </span>
              <h2 className="font-serif-display text-3xl font-semibold text-espresso sm:text-4xl">
                {t("featuredTitle")}
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
              {featured.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </Container>
        </section>
      )}

      <section id="why" className="py-16 sm:py-24">
        <Container>
          <div className="mb-10 flex flex-col items-start gap-3 sm:mb-12">
            <span className="text-xs font-semibold uppercase tracking-widest text-accent-green">
              {t("whyEyebrow")}
            </span>
            <h2 className="font-serif-display text-3xl font-semibold text-espresso sm:text-4xl">
              {t("whyTitle")}
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {valuePoints.map((point) => (
              <div
                key={point.title}
                className="rounded-2xl border border-espresso/10 bg-white p-6 shadow-[var(--shadow-card)]"
              >
                <h3 className="font-serif-display text-lg font-semibold text-espresso">
                  {point.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-espresso/55">
                  {point.body}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-2xl border border-espresso/10 bg-beige/60 p-6">
            <Disclosure />
          </div>
        </Container>
      </section>
    </>
  );
}
