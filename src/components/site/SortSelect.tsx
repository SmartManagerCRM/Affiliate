"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { buildQueryString } from "@/lib/url";

export function SortSelect({ basePath }: { basePath: string }) {
  const t = useTranslations("sortSelect");
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = Object.fromEntries(searchParams.entries());

  const options = [
    { value: "featured", label: t("featured") },
    { value: "price_asc", label: t("priceAsc") },
    { value: "price_desc", label: t("priceDesc") },
    { value: "newest", label: t("newest") },
  ];

  return (
    <label className="flex items-center gap-2 text-sm text-espresso/60">
      <span className="hidden sm:inline">{t("sort")}</span>
      <select
        value={current.sort ?? "featured"}
        onChange={(e) => {
          const qs = buildQueryString(current, { sort: e.target.value });
          router.push(`${basePath}${qs}`);
        }}
        className="rounded-full border border-espresso/15 bg-white px-3.5 py-2 text-sm text-espresso focus:border-accent-gold focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
