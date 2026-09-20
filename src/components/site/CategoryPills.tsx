import { clsx } from "clsx";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Category } from "@/lib/types";

export function CategoryPills({
  basePath,
  categories,
  activeSlug,
}: {
  basePath: string;
  categories: Category[];
  activeSlug?: string;
}) {
  const t = useTranslations("categoryPills");

  if (categories.length === 0) return null;

  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
      <Link
        href={basePath}
        className={clsx(
          "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
          !activeSlug
            ? "border-espresso bg-espresso text-cream"
            : "border-espresso/15 bg-white text-espresso/70 hover:border-espresso/30"
        )}
      >
        {t("all")}
      </Link>
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`${basePath}?category=${category.slug}`}
          className={clsx(
            "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
            activeSlug === category.slug
              ? "border-espresso bg-espresso text-cream"
              : "border-espresso/15 bg-white text-espresso/70 hover:border-espresso/30"
          )}
        >
          {category.name}
        </Link>
      ))}
    </div>
  );
}
