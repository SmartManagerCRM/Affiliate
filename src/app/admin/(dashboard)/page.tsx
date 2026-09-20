import { Package, CheckCircle2, Tag, Store, Layers, MousePointerClick } from "lucide-react";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { resolveDateRange } from "@/lib/dateRange";
import {
  getCatalogCounts,
  getNewInPeriodCounts,
  getClicksSummary,
  getClicksByDay,
  getTopProducts,
  getTopRetailers,
  getProductsByActivity,
  getRecentActivity,
} from "@/lib/adminAnalytics";
import { DateRangePicker } from "@/components/admin/DateRangePicker";
import { KpiCard, TrendBadge, NewInPeriodNote } from "@/components/admin/dashboard/KpiCard";
import { DashboardCard } from "@/components/admin/dashboard/DashboardCard";
import { ClicksChart } from "@/components/admin/dashboard/ClicksChart";
import { ActivityDonut } from "@/components/admin/dashboard/ActivityDonut";
import { TopProductsCard } from "@/components/admin/dashboard/TopProductsCard";
import { TopRetailersCard } from "@/components/admin/dashboard/TopRetailersCard";
import { RecentActivityCard } from "@/components/admin/dashboard/RecentActivityCard";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const { supabase, admin } = await requireAdmin();
  const sp = await searchParams;
  const range = resolveDateRange(sp);

  const [catalog, newInPeriod, clicks, clicksByDay, topProducts, topRetailers, activityShare, recent] =
    await Promise.all([
      getCatalogCounts(supabase),
      getNewInPeriodCounts(supabase, range),
      getClicksSummary(supabase, range),
      getClicksByDay(supabase, range),
      getTopProducts(supabase, range),
      getTopRetailers(supabase, range),
      getProductsByActivity(supabase),
      getRecentActivity(supabase),
    ]);

  const firstName = (admin.full_name || admin.email).split(/[\s@]/)[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif-display text-2xl font-semibold text-espresso sm:text-3xl">
            Welcome back, {firstName}!
          </h1>
          <p className="mt-1 text-sm text-espresso/55">
            Here&apos;s what&apos;s happening with your Selected Items platform.
          </p>
        </div>
        <DateRangePicker activeKey={range.key} label={range.label} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard icon={Package} label="Total Products" value={catalog.totalProducts} href="/admin/products" tone="espresso">
          <NewInPeriodNote count={newInPeriod.newProducts} noun="products" />
        </KpiCard>
        <KpiCard icon={CheckCircle2} label="Active Products" value={catalog.activeProducts} href="/admin/products" tone="green">
          <NewInPeriodNote count={newInPeriod.newActiveProducts} noun="active products" />
        </KpiCard>
        <KpiCard icon={Tag} label="Total Offers" value={catalog.totalOffers} href="/admin/offers" tone="gold">
          <NewInPeriodNote count={newInPeriod.newOffers} noun="offers" />
        </KpiCard>
        <KpiCard icon={Store} label="Active Retailers" value={catalog.activeRetailers} href="/admin/retailers" tone="espresso">
          <NewInPeriodNote count={newInPeriod.newActiveRetailers} noun="retailers" />
        </KpiCard>
        <KpiCard icon={Layers} label="Activities" value={catalog.totalActivities} href="/admin/activities" tone="gold">
          <NewInPeriodNote count={newInPeriod.newActivities} noun="activities" />
        </KpiCard>
        <KpiCard icon={MousePointerClick} label="Affiliate Clicks" value={clicks.current} href="/admin/clicks" tone="green">
          <span className="inline-flex items-center gap-1.5">
            <TrendBadge percent={clicks.percentChange} neutralLabel="No previous-period data" />
            <span className="text-espresso/40">vs previous period</span>
          </span>
        </KpiCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DashboardCard
          icon={MousePointerClick}
          title="Affiliate Clicks"
          subtitle="Daily affiliate clicks over the selected period"
        >
          <ClicksChart data={clicksByDay} />
        </DashboardCard>

        <DashboardCard icon={Layers} title="Products by Activity" subtitle="Distribution of products across activities">
          <ActivityDonut data={activityShare} total={catalog.totalProducts} />
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <TopProductsCard rows={topProducts} />
        <TopRetailersCard rows={topRetailers} />
        <RecentActivityCard events={recent} />
      </div>
    </div>
  );
}
