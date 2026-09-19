import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { ActivityCard } from "@/components/site/ActivityCard";
import { ProductCard } from "@/components/site/ProductCard";
import { Disclosure } from "@/components/site/Disclosure";
import { getActivities, getFeaturedProducts } from "@/lib/queries";
import { SITE_TAGLINE } from "@/lib/constants";

// No per-visitor data on this page, so it can be cached and revalidated in
// the background instead of hitting the database on every single request.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Selected Items — Smart Products Carefully Selected",
  description:
    "Discover equipment, products and essentials selected around the activities you love and the businesses you run. Compare offers from local and international retailers.",
  alternates: { canonical: "/" },
};

const VALUE_POINTS = [
  {
    title: "Carefully selected products",
    body: "Every product is chosen for real relevance to the activity — no clutter, no guesswork.",
  },
  {
    title: "Trusted retailers",
    body: "We work only with retailers and affiliate networks we can vouch for.",
  },
  {
    title: "Local & international offers",
    body: "Compare pricing from nearby and global retailers, shown in their own currency.",
  },
  {
    title: "Direct purchase from retailers",
    body: "Buy Now takes you straight to the retailer to complete your purchase — safely and directly.",
  },
];

export default async function HomePage() {
  const [activities, featured] = await Promise.all([
    getActivities(),
    getFeaturedProducts(8),
  ]);

  return (
    <>
      <section className="relative overflow-hidden border-b border-espresso/10 bg-gradient-to-b from-beige/70 to-cream">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent-gold/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-32 bottom-0 h-80 w-80 rounded-full bg-accent-green/10 blur-3xl"
          aria-hidden
        />
        <Container className="relative py-20 sm:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center rounded-full border border-espresso/15 bg-white/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-espresso/60">
              Selected Items
            </span>
            <h1 className="mt-6 text-balance font-serif-display text-4xl font-semibold leading-[1.1] text-espresso sm:text-6xl">
              Smart products.
              <br />
              <span className="italic text-accent-gold">Carefully selected</span> for
              your business.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-balance text-base leading-relaxed text-espresso/60 sm:text-lg">
              Discover equipment, products and essentials selected around the
              activities you love and the businesses you run.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ButtonLink href="#activities" size="lg">
                Explore Products
              </ButtonLink>
              <ButtonLink href="/search" size="lg" variant="outline">
                Search products
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      <section id="activities" className="py-16 sm:py-24">
        <Container>
          <div className="mb-10 flex flex-col items-start gap-3 sm:mb-12">
            <span className="text-xs font-semibold uppercase tracking-widest text-accent-green">
              {SITE_TAGLINE}
            </span>
            <h2 className="font-serif-display text-3xl font-semibold text-espresso sm:text-4xl">
              Explore by Activity
            </h2>
          </div>

          {activities.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {activities.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} />
              ))}
            </div>
          ) : (
            <p className="text-espresso/50">
              Activities will appear here once added from Admin.
            </p>
          )}
        </Container>
      </section>

      {featured.length > 0 && (
        <section className="bg-beige/50 py-16 sm:py-24">
          <Container>
            <div className="mb-10 flex flex-col items-start gap-3 sm:mb-12">
              <span className="text-xs font-semibold uppercase tracking-widest text-accent-green">
                Curated for you
              </span>
              <h2 className="font-serif-display text-3xl font-semibold text-espresso sm:text-4xl">
                Featured Picks
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
              Why us
            </span>
            <h2 className="font-serif-display text-3xl font-semibold text-espresso sm:text-4xl">
              Why Selected Items?
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALUE_POINTS.map((point) => (
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
