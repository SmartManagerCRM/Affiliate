import Link from "next/link";
import { clsx } from "clsx";
import { ArrowUp, ArrowDown, type LucideIcon } from "lucide-react";

const TONE_CLASSES = {
  espresso: "bg-espresso/10 text-espresso",
  green: "bg-accent-green/12 text-accent-green-dark",
  gold: "bg-accent-gold/15 text-accent-gold-dark",
} as const;

export function KpiCard({
  icon: Icon,
  label,
  value,
  href,
  tone = "gold",
  children,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  href: string;
  tone?: keyof typeof TONE_CLASSES;
  children?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-espresso/8 bg-white p-5 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)]"
    >
      <span className={clsx("flex h-10 w-10 items-center justify-center rounded-xl", TONE_CLASSES[tone])}>
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <p className="mt-4 font-serif-display text-3xl font-semibold text-espresso">{value}</p>
      <p className="mt-1 text-sm text-espresso/50">{label}</p>
      {children && <div className="mt-3 text-xs">{children}</div>}
    </Link>
  );
}

/** Only ever renders a percentage that was actually calculated from two
 * real periods — the neutral label covers every other case. */
export function TrendBadge({
  percent,
  neutralLabel,
}: {
  percent: number | null;
  neutralLabel: string;
}) {
  if (percent === null) {
    return <span className="text-espresso/40">{neutralLabel}</span>;
  }
  const rounded = Math.round(percent);
  const positive = rounded >= 0;
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 font-semibold",
        positive ? "text-accent-green-dark" : "text-red-600"
      )}
    >
      {positive ? (
        <ArrowUp className="h-3 w-3" strokeWidth={2.5} />
      ) : (
        <ArrowDown className="h-3 w-3" strokeWidth={2.5} />
      )}
      {Math.abs(rounded)}%
    </span>
  );
}

export function NewInPeriodNote({ count, noun }: { count: number; noun: string }) {
  if (count > 0) {
    return <span className="font-semibold text-accent-green-dark">+{count} this period</span>;
  }
  return <span className="text-espresso/40">No new {noun} this period</span>;
}
