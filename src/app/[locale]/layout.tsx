import type { ReactNode } from "react";
import { hasLocale } from "next-intl";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { CurrencyProvider } from "@/components/site/CurrencyProvider";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale as Locale);

  return (
    <NextIntlClientProvider>
      <CurrencyProvider>
        <Header />
        {children}
        <Footer />
      </CurrencyProvider>
    </NextIntlClientProvider>
  );
}
