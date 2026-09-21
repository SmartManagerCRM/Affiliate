import type { Metadata } from "next";
import Image from "next/image";
import { ShoppingBag } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { ButtonLink, LocaleButtonLink } from "@/components/ui/Button";
import { CartItemRow } from "@/components/site/CartItemRow";
import { ClearCartButton } from "@/components/site/ClearCartButton";
import { getCartSessionToken } from "@/lib/cart/session";
import { getCartItems } from "@/lib/cart/store";
import { getActivities } from "@/lib/queries";
import { localizeActivity } from "@/lib/localize";
import {
  groupCartItemsByRetailer,
  getRetailerCartStrategy,
  firstShoppableItem,
} from "@/lib/cart/groupByRetailer";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "cart" });
  return { title: t("metaTitle") };
}

export default async function CartPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("cart");

  const token = await getCartSessionToken();
  const items = token ? await getCartItems(token) : [];

  if (items.length === 0) {
    const activities = (await getActivities()).map((a) => localizeActivity(a, locale as Locale));
    return (
      <Container className="flex flex-col items-center py-20 text-center sm:py-28">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-beige">
          <ShoppingBag className="h-7 w-7 text-espresso/40" strokeWidth={1.5} />
        </div>
        <h1 className="font-serif-display text-2xl font-semibold text-espresso sm:text-3xl">
          {t("emptyTitle")}
        </h1>
        <p className="mt-2 max-w-sm text-sm text-espresso/55">{t("emptySubtitle")}</p>

        {activities.length > 0 && (
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {activities.map((activity) => (
              <LocaleButtonLink key={activity.id} href={`/${activity.slug}`} variant="outline">
                {t("exploreActivity", { name: activity.name })}
              </LocaleButtonLink>
            ))}
          </div>
        )}
      </Container>
    );
  }

  return (
    <Container className="py-10 sm:py-14">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif-display text-2xl font-semibold text-espresso sm:text-3xl">
            {t("pageTitle")}
          </h1>
          <p className="mt-1 text-sm text-espresso/50">{t("itemCount", { count: items.length })}</p>
        </div>
        <ClearCartButton />
      </div>

      <div className="hidden grid-cols-[38%_1fr_auto_1fr_auto] gap-4 border-b border-espresso/10 pb-3 text-xs font-semibold uppercase tracking-widest text-espresso/40 sm:grid">
        <span>{t("product")}</span>
        <span className="text-center">{t("price")}</span>
        <span className="text-center">{t("quantity")}</span>
        <span className="text-end">{t("subtotal")}</span>
        <span />
      </div>

      <div className="flex flex-col gap-6">
        {groupCartItemsByRetailer(items).map((group) => {
          const strategy = getRetailerCartStrategy(group);
          const shopTarget = firstShoppableItem(group);
          return (
            <div key={group.retailerId} className="rounded-2xl border border-espresso/10 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-espresso/8 px-4 py-3.5 sm:px-5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-beige">
                    {group.retailerLogo ? (
                      <Image
                        src={group.retailerLogo}
                        alt={group.retailerName}
                        width={28}
                        height={28}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="text-xs font-semibold text-espresso/60">
                        {group.retailerName.charAt(0)}
                      </span>
                    )}
                  </div>
                  <span className="font-medium text-espresso">{group.retailerName}</span>
                  <span className="text-sm text-espresso/40">{t("itemCount", { count: group.items.length })}</span>
                </div>
                {group.items.length > 1 && shopTarget && (
                  <ButtonLink href={`/go/${shopTarget.offer_id}`} size="sm">
                    {t("shopNItemsAt", { count: group.items.length, retailer: group.retailerName })}
                  </ButtonLink>
                )}
              </div>

              <div className="px-4 sm:px-5">
                {group.items.map((item) => (
                  <CartItemRow key={item.cart_item_id} item={item} />
                ))}
              </div>

              {strategy === "individual" && group.items.length > 1 && (
                <p className="border-t border-espresso/8 px-4 py-3 text-xs text-espresso/50 sm:px-5">
                  {t("individualNotice")}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-espresso/40">{t("priceDisclaimer")}</p>
    </Container>
  );
}
