"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { rtlLocales, type Locale } from "@/i18n/routing";

/**
 * The root layout sets <html lang/dir> on the server, but it's a shared
 * ancestor that doesn't re-render on a client-side locale switch (only the
 * [locale] segment below it does) — so without this, switching to Arabic
 * leaves the page dir="ltr" until a full reload. This syncs the DOM
 * attributes directly whenever the active locale changes.
 */
export function HtmlAttributes() {
  const locale = useLocale() as Locale;

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = rtlLocales.includes(locale) ? "rtl" : "ltr";
  }, [locale]);

  return null;
}
