import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { SearchBox } from "@/components/site/SearchBox";
import { ProductCard } from "@/components/site/ProductCard";
import { searchProducts } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Search",
  description: "Search Selected Items for products by name, brand, category or activity.",
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const results = query.length > 0 ? await searchProducts(query) : [];

  return (
    <Container className="py-10 sm:py-14">
      <div className="mx-auto max-w-xl text-center">
        <h1 className="font-serif-display text-3xl font-semibold text-espresso sm:text-4xl">
          Search Products
        </h1>
        <p className="mt-2 text-espresso/55">
          Search by product name, brand, category or activity.
        </p>
        <div className="mt-6">
          <SearchBox />
        </div>
      </div>

      {query.length > 0 && (
        <div className="mt-12">
          <p className="mb-6 text-sm text-espresso/50">
            {results.length} result{results.length === 1 ? "" : "s"} for &ldquo;{query}&rdquo;
          </p>
          {results.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
              {results.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-espresso/15 p-12 text-center text-espresso/50">
              No products found. Try a different search term.
            </div>
          )}
        </div>
      )}
    </Container>
  );
}
