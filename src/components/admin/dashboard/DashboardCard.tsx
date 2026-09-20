import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function DashboardCard({
  icon: Icon,
  title,
  subtitle,
  viewAllHref,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  viewAllHref?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-espresso/8 bg-white p-5 shadow-[var(--shadow-card)] sm:p-6 ${className ?? ""}`}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-gold/15 text-accent-gold-dark">
            <Icon className="h-4.5 w-4.5" strokeWidth={1.75} />
          </span>
          <div>
            <h2 className="font-serif-display text-base font-semibold text-espresso sm:text-lg">
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 text-xs text-espresso/45">{subtitle}</p>}
          </div>
        </div>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="flex shrink-0 items-center gap-1 text-xs font-medium text-accent-green-dark hover:underline"
          >
            View all
            <ArrowRight className="h-3 w-3" strokeWidth={2} />
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}
