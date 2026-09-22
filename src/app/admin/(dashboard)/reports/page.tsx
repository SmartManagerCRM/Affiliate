import { MousePointerClick } from "lucide-react";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { resolveDateRange } from "@/lib/dateRange";
import {
  getClicksByDay,
  getClicksSummary,
  getDeviceBreakdown,
  getTopProducts,
  getTopRetailers,
  getCartEventsSummary,
  getTopCartAddProducts,
  getTopShopClickRetailers,
} from "@/lib/adminAnalytics";
import { DateRangePicker } from "@/components/admin/DateRangePicker";
import { DashboardCard } from "@/components/admin/dashboard/DashboardCard";
import { ClicksChart } from "@/components/admin/dashboard/ClicksChart";
import { TopProductsCard } from "@/components/admin/dashboard/TopProductsCard";
import { TopRetailersCard } from "@/components/admin/dashboard/TopRetailersCard";
import { DeviceBreakdownCard } from "@/components/admin/dashboard/DeviceBreakdownCard";
import { CartActivityCard } from "@/components/admin/dashboard/CartActivityCard";
import { TopCartProductsCard } from "@/components/admin/dashboard/TopCartProductsCard";
import { TopCartRetailersCard } from "@/components/admin/dashboard/TopCartRetailersCard";
import { TrendBadge } from "@/components/admin/dashboard/KpiCard";

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const range = resolveDateRange(sp);

  const [
    clicks,
    clicksByDay,
    devices,
    topProducts,
    topRetailers,
    cartEvents,
    topCartProducts,
    topShopClickRetailers,
  ] = await Promise.all([
    getClicksSummary(supabase, range),
    getClicksByDay(supabase, range),
    getDeviceBreakdown(supabase, range),
    getTopProducts(supabase, range, 15),
    getTopRetailers(supabase, range, 15),
    getCartEventsSummary(supabase, range),
    getTopCartAddProducts(supabase, range, 15),
    getTopShopClickRetailers(supabase, range, 15),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif-display text-2xl font-semibold text-espresso sm:text-3xl">Reports</h1>
          <p className="mt-1 text-sm text-espresso/55">
            A closer look at affiliate performance for the selected period.
          </p>
        </div>
        <DateRangePicker activeKey={range.key} label={range.label} />
      </div>

      <DashboardCard
        icon={MousePointerClick}
        title="Affiliate Clicks"
        subtitle={`${clicks.current} click${clicks.current === 1 ? "" : "s"} in this period`}
      >
        <div className="mb-4 flex items-center gap-1.5 text-sm">
          <TrendBadge percent={clicks.percentChange} neutralLabel="No previous-period data" />
          <span className="text-espresso/45">vs previous period ({clicks.previous} clicks)</span>
        </div>
        <ClicksChart data={clicksByDay} />
      </DashboardCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <TopProductsCard rows={topProducts} />
        <TopRetailersCard rows={topRetailers} />
        <DeviceBreakdownCard data={devices} />
      </div>

      <CartActivityCard summary={cartEvents} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TopCartProductsCard rows={topCartProducts} />
        <TopCartRetailersCard rows={topShopClickRetailers} />
      </div>
    </div>
  );
}
