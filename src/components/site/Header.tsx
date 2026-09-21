import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getActivities } from "@/lib/queries";
import { localizeActivity } from "@/lib/localize";
import type { Locale } from "@/i18n/routing";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/site/Logo";
import { MobileMenu } from "@/components/site/MobileMenu";
import { SearchBox } from "@/components/site/SearchBox";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { CurrencySwitcher } from "@/components/site/CurrencySwitcher";
import { CartLink } from "@/components/site/CartLink";

export async function Header() {
  const locale = (await getLocale()) as Locale;
  const activities = (await getActivities()).map((a) => localizeActivity(a, locale));

  return (
    <header className="sticky top-0 z-40 border-b border-espresso/10 bg-cream/90 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between gap-4 sm:h-20">
        <Logo />

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
          <div className="hidden items-center gap-2 md:flex">
            <LanguageSwitcher />
            <CurrencySwitcher />
          </div>
          <div className="hidden sm:block">
            <SearchBox compact />
          </div>
          <CartLink />
          <MobileMenu activities={activities} />
        </div>
      </Container>
    </header>
  );
}
