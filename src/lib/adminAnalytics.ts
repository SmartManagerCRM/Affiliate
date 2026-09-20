import "server-only";
import { eachDay, percentChange, previousPeriod, type ResolvedRange } from "@/lib/dateRange";
import type { createClient } from "@/lib/supabase/server";

type SupabaseAdmin = Awaited<ReturnType<typeof createClient>>;

export type CatalogCounts = {
  totalProducts: number;
  activeProducts: number;
  totalOffers: number;
  activeRetailers: number;
  totalActivities: number;
};

export type ClicksSummary = {
  current: number;
  previous: number;
  /** null when there's no honest previous-period baseline to compare against. */
  percentChange: number | null;
};

export type ClicksByDay = { date: string; clicks: number };

export type TopProductRow = {
  productId: string;
  name: string;
  mainImage: string | null;
  clicks: number;
};

export type TopRetailerRow = {
  retailerId: string;
  name: string;
  logo: string | null;
  clicks: number;
};

export type ActivityShare = {
  activityId: string;
  name: string;
  count: number;
  percent: number;
};

export type RecentActivityEvent = {
  id: string;
  kind: "product" | "offer" | "retailer";
  action: "created" | "updated";
  label: string;
  timestamp: string;
};

export async function getCatalogCounts(supabase: SupabaseAdmin): Promise<CatalogCounts> {
  const [products, activeProducts, offers, activeRetailers, activities] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("products").select("*", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("offers").select("*", { count: "exact", head: true }),
    supabase.from("retailers").select("*", { count: "exact", head: true }).eq("active", true),
    supabase.from("activities").select("*", { count: "exact", head: true }),
  ]);

  return {
    totalProducts: products.count ?? 0,
    activeProducts: activeProducts.count ?? 0,
    totalOffers: offers.count ?? 0,
    activeRetailers: activeRetailers.count ?? 0,
    totalActivities: activities.count ?? 0,
  };
}

async function countNewInRange(
  supabase: SupabaseAdmin,
  table: "products" | "offers" | "retailers" | "activities",
  range: ResolvedRange
) {
  const { count } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .gte("created_at", range.from.toISOString())
    .lte("created_at", range.to.toISOString());
  return count ?? 0;
}

export async function getNewInPeriodCounts(supabase: SupabaseAdmin, range: ResolvedRange) {
  const [newProducts, newActiveProducts, newOffers, newRetailers, newActiveRetailers, newActivities] =
    await Promise.all([
      countNewInRange(supabase, "products", range),
      supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("status", "published")
        .gte("created_at", range.from.toISOString())
        .lte("created_at", range.to.toISOString())
        .then((r) => r.count ?? 0),
      countNewInRange(supabase, "offers", range),
      countNewInRange(supabase, "retailers", range),
      supabase
        .from("retailers")
        .select("*", { count: "exact", head: true })
        .eq("active", true)
        .gte("created_at", range.from.toISOString())
        .lte("created_at", range.to.toISOString())
        .then((r) => r.count ?? 0),
      countNewInRange(supabase, "activities", range),
    ]);
  return { newProducts, newActiveProducts, newOffers, newRetailers, newActiveRetailers, newActivities };
}

async function countClicksInWindow(supabase: SupabaseAdmin, from: Date, to: Date) {
  const { count } = await supabase
    .from("affiliate_clicks")
    .select("*", { count: "exact", head: true })
    .gte("created_at", from.toISOString())
    .lte("created_at", to.toISOString());
  return count ?? 0;
}

export async function getClicksSummary(
  supabase: SupabaseAdmin,
  range: ResolvedRange
): Promise<ClicksSummary> {
  const prev = previousPeriod(range);
  const [current, previous] = await Promise.all([
    countClicksInWindow(supabase, range.from, range.to),
    countClicksInWindow(supabase, prev.from, prev.to),
  ]);
  return { current, previous, percentChange: percentChange(current, previous) };
}

export async function getClicksByDay(
  supabase: SupabaseAdmin,
  range: ResolvedRange
): Promise<ClicksByDay[]> {
  const { data } = await supabase
    .from("affiliate_clicks")
    .select("created_at")
    .gte("created_at", range.from.toISOString())
    .lte("created_at", range.to.toISOString());

  const counts = new Map<string, number>();
  (data ?? []).forEach((row) => {
    const day = row.created_at.slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  });

  return eachDay(range.from, range.to).map((date) => ({ date, clicks: counts.get(date) ?? 0 }));
}

export async function getTopProducts(
  supabase: SupabaseAdmin,
  range: ResolvedRange,
  limit = 5
): Promise<TopProductRow[]> {
  const { data } = await supabase
    .from("affiliate_clicks")
    .select("product_id, product:products(id, name, main_image)")
    .not("product_id", "is", null)
    .gte("created_at", range.from.toISOString())
    .lte("created_at", range.to.toISOString())
    .limit(5000);

  const byProduct = new Map<string, TopProductRow>();
  (data ?? []).forEach((row) => {
    if (!row.product_id || !row.product) return;
    const existing = byProduct.get(row.product_id);
    if (existing) {
      existing.clicks += 1;
    } else {
      byProduct.set(row.product_id, {
        productId: row.product_id,
        name: row.product.name,
        mainImage: row.product.main_image,
        clicks: 1,
      });
    }
  });

  return Array.from(byProduct.values())
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, limit);
}

export async function getTopRetailers(
  supabase: SupabaseAdmin,
  range: ResolvedRange,
  limit = 5
): Promise<TopRetailerRow[]> {
  const { data } = await supabase
    .from("affiliate_clicks")
    .select("offer:offers(retailer:retailers(id, name, logo))")
    .not("offer_id", "is", null)
    .gte("created_at", range.from.toISOString())
    .lte("created_at", range.to.toISOString())
    .limit(5000);

  const byRetailer = new Map<string, TopRetailerRow>();
  (data ?? []).forEach((row) => {
    const retailer = row.offer?.retailer;
    if (!retailer) return;
    const existing = byRetailer.get(retailer.id);
    if (existing) {
      existing.clicks += 1;
    } else {
      byRetailer.set(retailer.id, {
        retailerId: retailer.id,
        name: retailer.name,
        logo: retailer.logo,
        clicks: 1,
      });
    }
  });

  return Array.from(byRetailer.values())
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, limit);
}

export type DeviceShare = { device: string; count: number; percent: number };

export async function getDeviceBreakdown(
  supabase: SupabaseAdmin,
  range: ResolvedRange
): Promise<DeviceShare[]> {
  const { data } = await supabase
    .from("affiliate_clicks")
    .select("device_type")
    .gte("created_at", range.from.toISOString())
    .lte("created_at", range.to.toISOString())
    .limit(5000);

  const rows = data ?? [];
  const total = rows.length;
  const counts = new Map<string, number>();
  rows.forEach((r) => {
    const key = r.device_type || "Unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([device, count]) => ({ device, count, percent: total > 0 ? (count / total) * 100 : 0 }))
    .sort((a, b) => b.count - a.count);
}

export async function getProductsByActivity(supabase: SupabaseAdmin): Promise<ActivityShare[]> {
  const { data } = await supabase
    .from("product_activities")
    .select("activity_id, activity:activities(id, name)")
    .limit(5000);

  const rows = data ?? [];
  const total = rows.length;
  const byActivity = new Map<string, { name: string; count: number }>();
  rows.forEach((row) => {
    if (!row.activity) return;
    const existing = byActivity.get(row.activity_id);
    if (existing) {
      existing.count += 1;
    } else {
      byActivity.set(row.activity_id, { name: row.activity.name, count: 1 });
    }
  });

  return Array.from(byActivity.entries())
    .map(([activityId, { name, count }]) => ({
      activityId,
      name,
      count,
      percent: total > 0 ? (count / total) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

export async function getRecentActivity(
  supabase: SupabaseAdmin,
  limit = 8
): Promise<RecentActivityEvent[]> {
  const [products, offers, retailers] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit),
    supabase
      .from("offers")
      .select("id, created_at, last_updated, product:products(name), retailer:retailers(name)")
      .order("last_updated", { ascending: false })
      .limit(limit),
    supabase
      .from("retailers")
      .select("id, name, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit),
  ]);

  const events: RecentActivityEvent[] = [];

  (products.data ?? []).forEach((p) => {
    const created = p.created_at === p.updated_at;
    events.push({
      id: `product-${p.id}`,
      kind: "product",
      action: created ? "created" : "updated",
      label: p.name,
      timestamp: p.updated_at,
    });
  });

  (offers.data ?? []).forEach((o) => {
    const created = o.created_at === o.last_updated;
    const label = [o.product?.name, o.retailer?.name].filter(Boolean).join(" – ");
    events.push({
      id: `offer-${o.id}`,
      kind: "offer",
      action: created ? "created" : "updated",
      label: label || "Offer",
      timestamp: o.last_updated ?? o.created_at,
    });
  });

  (retailers.data ?? []).forEach((r) => {
    const created = r.created_at === r.updated_at;
    events.push({
      id: `retailer-${r.id}`,
      kind: "retailer",
      action: created ? "created" : "updated",
      label: r.name,
      timestamp: r.updated_at,
    });
  });

  return events
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}
