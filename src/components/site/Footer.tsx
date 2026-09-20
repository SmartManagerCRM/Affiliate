import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getActivities } from "@/lib/queries";
import { localizeActivity } from "@/lib/localize";
import type { Locale } from "@/i18n/routing";
import { Container } from "@/components/ui/Container";
import { Disclosure } from "@/components/site/Disclosure";
import { Logo } from "@/components/site/Logo";

export async function Footer() {
  const [rawActivities, t, locale] = await Promise.all([
    getActivities(),
    getTranslations("footer"),
    getLocale() as Promise<Locale>,
  ]);
  const activities = rawActivities.map((a) => localizeActivity(a, locale));

  return (
    <footer className="mt-24 border-t border-espresso/10 bg-beige/60">
      <Container className="py-14">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <Logo iconSize={32} />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-espresso/60">
              {t("tagline")}
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-espresso/45">
              {t("explore")}
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
              {t("selectedItems")}
            </h3>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link href="/search" className="text-sm text-espresso/70 hover:text-espresso">
                  {t("search")}
                </Link>
              </li>
              <li>
                <Link href="/#why" className="text-sm text-espresso/70 hover:text-espresso">
                  {t("whySelectedItems")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-espresso/45">
              {t("affiliateDisclosure")}
            </h3>
            <Disclosure className="mt-4 max-w-xs" />
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-espresso/10 pt-6 text-xs text-espresso/45 sm:flex-row sm:items-center sm:justify-between">
          <span>{t("rights", { year: new Date().getFullYear() })}</span>
          <span>{t("companion")}</span>
        </div>
      </Container>
    </footer>
  );
}
