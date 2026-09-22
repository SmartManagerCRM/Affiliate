import { ShoppingCart, Trash2, MousePointerClick, type LucideIcon } from "lucide-react";
import { DashboardCard } from "@/components/admin/dashboard/DashboardCard";
import { TrendBadge } from "@/components/admin/dashboard/KpiCard";
import type { CartEventCount, CartEventsSummary } from "@/lib/adminAnalytics";

function Stat({ icon: Icon, label, stat }: { icon: LucideIcon; label: string; stat: CartEventCount }) {
  return (
    <div className="flex flex-1 flex-col gap-1.5 rounded-xl border border-espresso/8 p-4">
      <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-espresso/45">
        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
        {label}
      </span>
      <span className="font-serif-display text-2xl font-semibold text-espresso">{stat.current}</span>
      <span className="flex items-center gap-1.5 text-xs">
        <TrendBadge percent={stat.percentChange} neutralLabel="No previous-period data" />
        <span className="text-espresso/40">vs previous period</span>
      </span>
    </div>
  );
}

/** Real cart_events counts only — never a purchase, conversion, or sale figure. */
export function CartActivityCard({ summary }: { summary: CartEventsSummary }) {
  return (
    <DashboardCard
      icon={ShoppingCart}
      title="Cart Activity"
      subtitle="Add to Cart, remove, and Shop click events this period — Selected Items never processes a purchase, so this isn't sales data."
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <Stat icon={ShoppingCart} label="Cart Adds" stat={summary.cartAdds} />
        <Stat icon={Trash2} label="Cart Removes" stat={summary.cartRemoves} />
        <Stat icon={MousePointerClick} label="Shop Clicks" stat={summary.shopClicks} />
      </div>
    </DashboardCard>
  );
}
