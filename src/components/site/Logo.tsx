import Image from "next/image";
import { clsx } from "clsx";
import { Link } from "@/i18n/navigation";

export function Logo({
  href = "/",
  iconSize = 36,
  className,
  wordmarkClassName,
}: {
  href?: string;
  iconSize?: number;
  className?: string;
  wordmarkClassName?: string;
}) {
  return (
    <Link href={href} className={clsx("flex shrink-0 items-center gap-2", className)}>
      <Image
        src="/logo-icon.png"
        alt="Selected Items"
        width={iconSize}
        height={iconSize}
        priority
        className="shrink-0"
      />
      <span className={clsx("flex items-baseline gap-1", wordmarkClassName)}>
        <span className="font-serif-display text-xl font-semibold tracking-tight text-espresso sm:text-2xl">
          Selected
        </span>
        <span className="font-serif-display text-xl italic text-accent-gold sm:text-2xl">
          Items
        </span>
      </span>
    </Link>
  );
}
