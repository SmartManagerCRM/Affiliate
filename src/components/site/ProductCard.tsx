import Image from "next/image";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink, LocaleButtonLink } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";
import { Price } from "@/components/site/Price";
import { placeholderImage, isOptimizableImageSrc } from "@/lib/image";
import type { ProductCardData } from "@/lib/types";

export function ProductCard({ product }: { product: ProductCardData }) {
  const t = useTranslations("productCard");
  const offers = product.offers ?? [];
  const cheapest = offers.length
    ? offers.reduce((min, o) => ((o.price ?? Infinity) < (min.price ?? Infinity) ? o : min))
    : null;
  const retailerCount = new Set(offers.map((o) => o.retailer_id)).size;
  const image =
    product.main_image ||
    placeholderImage(product.slug, { title: product.name, subtitle: product.brand?.name });

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)]">
      <Link href={`/product/${product.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-beige">
        <Image
          src={image}
          alt={product.name}
          fill
          unoptimized={!isOptimizableImageSrc(image)}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 40vw, 90vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute start-3 top-3 flex flex-wrap gap-1.5">
          {product.featured && <Badge tone="gold">{t("featured")}</Badge>}
          {retailerCount >= 2 && <Badge tone="green">{t("bestValue")}</Badge>}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
        {product.brand?.name && (
          <span className="text-[11px] font-semibold uppercase tracking-wide text-espresso/40">
            {product.brand.name}
          </span>
        )}
        <Link href={`/product/${product.slug}`}>
          <h3 className="font-serif-display text-lg font-semibold leading-snug text-espresso line-clamp-2">
            {product.name}
          </h3>
        </Link>
        {product.short_description && (
          <p className="line-clamp-2 text-sm leading-relaxed text-espresso/55">
            {product.short_description}
          </p>
        )}

        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <div className="flex flex-col">
            {cheapest ? (
              <>
                <span className="text-[11px] uppercase tracking-wide text-espresso/40">
                  {t("from")}
                </span>
                <Price
                  amount={cheapest.price ?? 0}
                  currency={cheapest.currency ?? "USD"}
                  compact
                  className="font-serif-display text-xl font-semibold text-espresso"
                />
              </>
            ) : (
              <span className="text-sm text-espresso/40">{t("comingSoon")}</span>
            )}
          </div>

          {cheapest && offers.length === 1 ? (
            <ButtonLink
              href={`/go/${cheapest.id}`}
              size="sm"
              className="shrink-0"
            >
              {t("buyNow")}
            </ButtonLink>
          ) : (
            <LocaleButtonLink
              href={`/product/${product.slug}`}
              size="sm"
              variant="outline"
              className="shrink-0"
            >
              {offers.length > 1 ? t("compare", { count: offers.length }) : t("view")}
            </LocaleButtonLink>
          )}
        </div>
      </div>
    </div>
  );
}
