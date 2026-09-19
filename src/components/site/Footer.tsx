import Link from "next/link";
import { getActivities } from "@/lib/queries";
import { Container } from "@/components/ui/Container";
import { Disclosure } from "@/components/site/Disclosure";
import { SITE_TAGLINE } from "@/lib/constants";

export async function Footer() {
  const activities = await getActivities();

  return (
    <footer className="mt-24 border-t border-espresso/10 bg-beige/60">
      <Container className="py-14">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-baseline gap-1">
              <span className="font-serif-display text-xl font-semibold text-espresso">
                Selected
              </span>
              <span className="font-serif-display text-xl italic text-accent-gold">
                Items
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-espresso/60">
              {SITE_TAGLINE}
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-espresso/45">
              Explore
            </h3>
            <ul className="mt-4 space-y-2.5">
              {activities.map((activity) => (
                <li key={activity.id}>
                  <Link
                    href={`/${activity.slug}`}
                    className="text-sm text-espresso/70 hover:text-espresso"
                  >
                    {activity.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-espresso/45">
              Selected Items
            </h3>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link href="/search" className="text-sm text-espresso/70 hover:text-espresso">
                  Search
                </Link>
              </li>
              <li>
                <Link href="/#why" className="text-sm text-espresso/70 hover:text-espresso">
                  Why Selected Items
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-espresso/45">
              Affiliate Disclosure
            </h3>
            <Disclosure className="mt-4 max-w-xs" />
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-espresso/10 pt-6 text-xs text-espresso/45 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Selected Items. All rights reserved.</span>
          <span>A curated product companion for businesses we build websites for.</span>
        </div>
      </Container>
    </footer>
  );
}
