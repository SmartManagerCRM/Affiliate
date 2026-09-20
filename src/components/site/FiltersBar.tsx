"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { buildQueryString } from "@/lib/url";
import { Button, LocaleButtonLink } from "@/components/ui/Button";

type Option = { value: string; label: string };

export function FiltersBar({
  basePath,
  brands,
  retailers,
  countries,
}: {
  basePath: string;
  brands: Option[];
  retailers: Option[];
  countries: Option[];
}) {
  const t = useTranslations("filtersBar");
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = Object.fromEntries(searchParams.entries());
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    brand: current.brand ?? "",
    retailer: current.retailer ?? "",
    country: current.country ?? "",
    availability: current.availability ?? "",
    priceMin: current.priceMin ?? "",
    priceMax: current.priceMax ?? "",
  });

  const activeCount = ["brand", "retailer", "country", "availability", "priceMin", "priceMax"].filter(
    (k) => current[k]
  ).length;

  function apply() {
    const qs = buildQueryString(current, draft);
    router.push(`${basePath}${qs}`);
    setOpen(false);
  }

  function clear() {
    const cleared = {
      brand: undefined,
      retailer: undefined,
      country: undefined,
      availability: undefined,
      priceMin: undefined,
      priceMax: undefined,
    };
    setDraft({ brand: "", retailer: "", country: "", availability: "", priceMin: "", priceMax: "" });
    router.push(`${basePath}${buildQueryString(current, cleared)}`);
    setOpen(false);
  }

  const availabilityOptions = [
    { value: "in_stock", label: t("inStock") },
    { value: "limited", label: t("limited") },
    { value: "preorder", label: t("preorder") },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full border border-espresso/15 bg-white px-4 py-2 text-sm font-medium text-espresso hover:border-espresso/30"
      >
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
          <path
            d="M3 5h14M6 10h8M8.5 15h3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        {t("filters")}
        {activeCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-green text-[11px] font-semibold text-white">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-espresso/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-cream p-6 shadow-2xl sm:inset-y-0 sm:start-auto sm:end-0 sm:w-full sm:max-w-sm sm:rounded-t-none">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-serif-display text-xl font-semibold">{t("filters")}</h2>
              <button
                onClick={() => setOpen(false)}
                aria-label={t("closeFilters")}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-espresso/15"
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {brands.length > 0 && (
                <FilterGroup
                  label={t("brand")}
                  allLabel={t("all")}
                  value={draft.brand}
                  options={brands}
                  onChange={(v) => setDraft((d) => ({ ...d, brand: v }))}
                />
              )}
              {retailers.length > 0 && (
                <FilterGroup
                  label={t("retailer")}
                  allLabel={t("all")}
                  value={draft.retailer}
                  options={retailers}
                  onChange={(v) => setDraft((d) => ({ ...d, retailer: v }))}
                />
              )}
              {countries.length > 0 && (
                <FilterGroup
                  label={t("country")}
                  allLabel={t("all")}
                  value={draft.country}
                  options={countries}
                  onChange={(v) => setDraft((d) => ({ ...d, country: v }))}
                />
              )}
              <FilterGroup
                label={t("availability")}
                allLabel={t("all")}
                value={draft.availability}
                options={availabilityOptions}
                onChange={(v) => setDraft((d) => ({ ...d, availability: v }))}
              />

              <div>
                <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-espresso/45">
                  {t("priceRange")}
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    placeholder={t("min")}
                    value={draft.priceMin}
                    onChange={(e) => setDraft((d) => ({ ...d, priceMin: e.target.value }))}
                    className="w-full rounded-lg border border-espresso/15 bg-white px-3 py-2 text-sm focus:border-accent-gold focus:outline-none"
                  />
                  <span className="text-espresso/30">–</span>
                  <input
                    type="number"
                    min={0}
                    placeholder={t("max")}
                    value={draft.priceMax}
                    onChange={(e) => setDraft((d) => ({ ...d, priceMax: e.target.value }))}
                    className="w-full rounded-lg border border-espresso/15 bg-white px-3 py-2 text-sm focus:border-accent-gold focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={clear} type="button">
                {t("clearAll")}
              </Button>
              <Button className="flex-1" onClick={apply} type="button">
                {t("applyFilters")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FilterGroup({
  label,
  allLabel,
  value,
  options,
  onChange,
}: {
  label: string;
  allLabel: string;
  value: string;
  options: Option[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-espresso/45">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange("")}
          className={`rounded-full border px-3 py-1.5 text-sm ${
            value === "" ? "border-espresso bg-espresso text-cream" : "border-espresso/15 text-espresso/70"
          }`}
        >
          {allLabel}
        </button>
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              value === opt.value
                ? "border-espresso bg-espresso text-cream"
                : "border-espresso/15 text-espresso/70"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ClearFiltersLink({ basePath }: { basePath: string }) {
  const t = useTranslations("filtersBar");
  return (
    <LocaleButtonLink href={basePath} variant="ghost" size="sm">
      {t("clearFilters")}
    </LocaleButtonLink>
  );
}
