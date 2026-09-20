import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { SearchBox } from "@/components/site/SearchBox";
import { ProductCard } from "@/components/site/ProductCard";
import { searchProducts } from "@/lib/queries";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "search" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const t = await getTranslations("search");
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const results = query.length > 0 ? await searchProducts(query) : [];

  return (
    <Container className="py-10 sm:py-14">
      <div className="mx-auto max-w-xl text-center">
        <h1 className="font-serif-display text-3xl font-semibold text-espresso sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-espresso/55">{t("subtitle")}</p>
        <div className="mt-6">
          <SearchBox />
        </div>
      </div>

      {query.length > 0 && (
        <div className="mt-12">
          <p className="mb-6 text-sm text-espresso/50">
            {t("resultsFor", { count: results.length, query })}
          </p>
          {results.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
              {results.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-espresso/15 p-12 text-center text-espresso/50">
              {t("empty")}
            </div>
          )}
        </div>
      )}
    </Container>
  );
}
