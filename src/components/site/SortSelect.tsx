"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { buildQueryString } from "@/lib/url";

const OPTIONS: { value: string; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "newest", label: "Newest" },
];

export function SortSelect({ basePath }: { basePath: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = Object.fromEntries(searchParams.entries());

  return (
    <label className="flex items-center gap-2 text-sm text-espresso/60">
      <span className="hidden sm:inline">Sort</span>
      <select
        value={current.sort ?? "featured"}
        onChange={(e) => {
          const qs = buildQueryString(current, { sort: e.target.value });
          router.push(`${basePath}${qs}`);
        }}
        className="rounded-full border border-espresso/15 bg-white px-3.5 py-2 text-sm text-espresso focus:border-accent-gold focus:outline-none"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
