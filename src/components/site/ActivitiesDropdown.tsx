"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import type { Activity } from "@/lib/types";

export function ActivitiesDropdown({ activities }: { activities: Activity[] }) {
  const t = useTranslations("header");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const selected = activities.find((activity) => pathname === `/${activity.slug}`) ?? null;

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (activities.length === 0) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-1.5 text-sm font-medium text-espresso/75 transition-colors hover:text-espresso"
      >
        {selected ? selected.name : t("chooseActivity")}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          strokeWidth={2}
        />
      </button>

      {open && (
        <div className="absolute start-0 top-full z-50 mt-3 w-64 rounded-2xl border border-espresso/10 bg-white p-2 shadow-[var(--shadow-card-hover)]">
          {activities.map((activity) => {
            const isSelected = activity.id === selected?.id;
            return (
              <Link
                key={activity.id}
                href={`/${activity.slug}`}
                onClick={() => setOpen(false)}
                aria-current={isSelected ? "page" : undefined}
                className={`flex items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors hover:bg-beige hover:text-espresso ${
                  isSelected ? "bg-beige text-espresso" : "text-espresso/80"
                }`}
              >
                {activity.name}
                {isSelected && <Check className="h-4 w-4 shrink-0 text-accent-green-dark" strokeWidth={2} />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
