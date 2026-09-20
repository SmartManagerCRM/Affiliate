"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { clsx } from "clsx";
import { useRouter } from "@/i18n/navigation";

export function SearchBox({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("searchBox");
  const router = useRouter();
  const [value, setValue] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    router.push(`/search?q=${encodeURIComponent(value.trim())}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className={clsx(
        "flex items-center gap-2 rounded-full border border-espresso/15 bg-white/70 px-4 transition-colors focus-within:border-accent-gold",
        compact ? "h-10 w-56" : "h-12 w-full"
      )}
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        className="h-4 w-4 shrink-0 text-espresso/40"
        aria-hidden
      >
        <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M18 18L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t("placeholder")}
        aria-label={t("ariaLabel")}
        className="w-full bg-transparent text-sm text-espresso placeholder:text-espresso/40 focus:outline-none"
      />
    </form>
  );
}
