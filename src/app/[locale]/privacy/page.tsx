import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { PRIVACY_CONTACT_EMAIL } from "@/lib/constants";
import type { Locale } from "@/i18n/routing";

const SECTION_KEYS = [
  "intro",
  "info",
  "use",
  "cookies",
  "affiliate",
  "thirdParty",
  "retention",
  "choices",
  "children",
  "changes",
] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacy" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: "/privacy" },
  };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("privacy");

  return (
    <Container className="py-10 sm:py-14">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-serif-display text-3xl font-semibold text-espresso sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-espresso/50">{t("lastUpdated")}</p>

        <div className="mt-10 flex flex-col gap-8">
          {SECTION_KEYS.map((key) => (
            <section key={key}>
              <h2 className="font-serif-display text-lg font-semibold text-espresso">
                {t(`${key}Title`)}
              </h2>
              <div className="mt-2 whitespace-pre-line text-sm leading-relaxed text-espresso/70">
                {t(`${key}Body`)}
              </div>
            </section>
          ))}

          <section>
            <h2 className="font-serif-display text-lg font-semibold text-espresso">
              {t("contactTitle")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-espresso/70">
              {t("contactBody", { email: PRIVACY_CONTACT_EMAIL })}
            </p>
          </section>
        </div>
      </div>
    </Container>
  );
}
