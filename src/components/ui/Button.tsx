import { clsx } from "clsx";
import NextLink from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link as LocaleLink } from "@/i18n/navigation";

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent-green text-white hover:bg-accent-green-dark shadow-sm hover:shadow-md active:scale-[0.98]",
  secondary:
    "bg-espresso text-cream hover:bg-brown shadow-sm hover:shadow-md active:scale-[0.98]",
  outline:
    "border border-espresso/15 text-espresso bg-white hover:border-espresso/30 hover:bg-beige/60",
  ghost: "text-espresso hover:bg-beige/70",
};

const sizes: Record<Size, string> = {
  sm: "text-sm px-3.5 py-1.5",
  md: "text-sm px-5 py-2.5",
  lg: "text-base px-7 py-3.5",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={clsx(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Plain next/link — safe everywhere, including the admin panel and /go
 * links, since it never assumes it's rendering inside the localized
 * src/app/[locale] route tree (next-intl's Link throws if it isn't).
 */
export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: CommonProps & { href: string; target?: string; rel?: string }) {
  return (
    <NextLink
      href={href}
      className={clsx(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </NextLink>
  );
}

/**
 * Locale-aware variant for internal public-site navigation only (product
 * listing/detail links, search, filters) — adds the current locale's URL
 * prefix. Never use this outside src/app/[locale] (admin, /go, /placeholder).
 */
export function LocaleButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: CommonProps & { href: string; target?: string; rel?: string }) {
  return (
    <LocaleLink
      href={href}
      className={clsx(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </LocaleLink>
  );
}
