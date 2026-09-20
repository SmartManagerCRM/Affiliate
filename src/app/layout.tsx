import type { Metadata } from "next";
import { Fraunces, Inter, Noto_Kufi_Arabic, Noto_Sans_Arabic } from "next/font/google";
import { getLocale } from "next-intl/server";
import "./globals.css";
import { ADMITAD_VERIFICATION_CONTENT, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/constants";
import { rtlLocales, type Locale } from "@/i18n/routing";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const notoKufiArabic = Noto_Kufi_Arabic({
  variable: "--font-noto-kufi-arabic",
  subsets: ["arabic"],
  weight: ["500", "600", "700"],
});

const notoSansArabic = Noto_Sans_Arabic({
  variable: "--font-noto-sans-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s — ${SITE_NAME}`,
  },
  description:
    "Discover equipment, products and essentials selected around the activities you love and the businesses you run. Compare offers from local and international retailers.",
  other: {
    "mitgo-verification": ADMITAD_VERIFICATION_CONTENT,
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description:
      "Smart products, carefully selected for your business and the customers you serve.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: "Smart products, carefully selected for your business.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Admin/go/placeholder routes render outside src/app/[locale], so they
  // never call setRequestLocale — getLocale() falls back to the default
  // locale for them, which is correct (admin stays English-only).
  const locale = (await getLocale()) as Locale;
  const dir = rtlLocales.includes(locale) ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      data-scroll-behavior="smooth"
      className={`${fraunces.variable} ${inter.variable} ${notoKufiArabic.variable} ${notoSansArabic.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-cream text-espresso">
        {children}
      </body>
    </html>
  );
}
