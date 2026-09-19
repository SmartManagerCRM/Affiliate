import Link from "next/link";
import { getActivities } from "@/lib/queries";
import { Container } from "@/components/ui/Container";
import { MobileMenu } from "@/components/site/MobileMenu";
import { SearchBox } from "@/components/site/SearchBox";

export async function Header() {
  const activities = await getActivities();

  return (
    <header className="sticky top-0 z-40 border-b border-espresso/10 bg-cream/90 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between gap-4 sm:h-20">
        <Link href="/" className="flex shrink-0 items-baseline gap-1">
          <span className="font-serif-display text-xl font-semibold tracking-tight text-espresso sm:text-2xl">
            Selected
          </span>
          <span className="font-serif-display text-xl italic text-accent-gold sm:text-2xl">
            Items
          </span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {activities.map((activity) => (
            <Link
              key={activity.id}
              href={`/${activity.slug}`}
              className="text-sm font-medium text-espresso/75 transition-colors hover:text-espresso"
            >
              {activity.name}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:block">
            <SearchBox compact />
          </div>
          <MobileMenu activities={activities} />
        </div>
      </Container>
    </header>
  );
}
