import { clsx } from "clsx";
import { useTranslations } from "next-intl";

export function Disclosure({ className }: { className?: string }) {
  const t = useTranslations("disclosure");
  return (
    <p className={clsx("text-xs leading-relaxed text-espresso/45", className)}>
      {t("text")}
    </p>
  );
}
