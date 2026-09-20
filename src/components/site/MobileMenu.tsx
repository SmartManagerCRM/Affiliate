"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import type { Activity } from "@/lib/types";
import { Link } from "@/i18n/navigation";
import { SearchBox } from "@/components/site/SearchBox";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { CurrencySwitcher } from "@/components/site/CurrencySwitcher";

export function MobileMenu({ activities }: { activities: Activity[] }) {
  const t = useTranslations("mobileMenu");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t("openMenu")}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-espresso/15 text-espresso lg:hidden"
      >
        <svg viewBox="0 0 20 20" fill="none" className="h-4.5 w-4.5">
          <path
            d="M3 5h14M3 10h14M3 15h14"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <Link
        href="/search"
        aria-label={t("search")}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-espresso/15 text-espresso sm:hidden"
      >
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
          <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M18 18L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </Link>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-espresso/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute end-0 top-0 h-full w-[82%] max-w-sm animate-fade-up bg-cream p-6 shadow-2xl">
            <div className="mb-8 flex items-center justify-between">
              <span className="font-serif-display text-lg font-semibold">{t("menuTitle")}</span>
              <button
                onClick={() => setOpen(false)}
                aria-label={t("closeMenu")}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-espresso/15"
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                  <path
                    d="M5 5l10 10M15 5L5 15"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div className="mb-6 flex items-center gap-2 md:hidden">
              <LanguageSwitcher />
              <CurrencySwitcher />
            </div>

            <div className="mb-8">
              <SearchBox />
            </div>

            <nav className="flex flex-col gap-1">
              <span className="mb-2 text-xs font-semibold uppercase tracking-widest text-espresso/40">
                {t("exploreByActivity")}
              </span>
              {activities.map((activity) => (
                <Link
                  key={activity.id}
                  href={`/${activity.slug}`}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-3 text-base font-medium text-espresso hover:bg-beige"
                >
                  {activity.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
