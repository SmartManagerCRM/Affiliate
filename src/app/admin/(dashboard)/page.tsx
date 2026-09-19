import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { PageHeader } from "@/components/admin/PageHeader";

export default async function AdminDashboardPage() {
  const { supabase } = await requireAdmin();

  const [
    { count: totalProducts },
    { count: activeProducts },
    { count: totalOffers },
    { count: activeRetailers },
    { count: activities },
    { count: affiliateClicks },
  ] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("products").select("*", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("offers").select("*", { count: "exact", head: true }),
    supabase.from("retailers").select("*", { count: "exact", head: true }).eq("active", true),
    supabase.from("activities").select("*", { count: "exact", head: true }),
    supabase.from("affiliate_clicks").select("*", { count: "exact", head: true }),
  ]);

  const { data: topProductsRaw } = await supabase
    .from("affiliate_clicks")
    .select("product_id, product:products(name)")
    .not("product_id", "is", null)
    .limit(500);

  const { data: topSourcesRaw } = await supabase
    .from("affiliate_clicks")
    .select("traffic_source_id, traffic_source:traffic_sources(name)")
    .not("traffic_source_id", "is", null)
    .limit(500);

  const topProducts = tally(
    (topProductsRaw ?? []).map((r) => ({ id: r.product_id, name: r.product?.name }))
  );
  const topSources = tally(
    (topSourcesRaw ?? []).map((r) => ({ id: r.traffic_source_id, name: r.traffic_source?.name }))
  );

  const stats = [
    { label: "Total Products", value: totalProducts ?? 0, href: "/admin/products" },
    { label: "Active Products", value: activeProducts ?? 0, href: "/admin/products" },
    { label: "Total Offers", value: totalOffers ?? 0, href: "/admin/offers" },
    { label: "Active Retailers", value: activeRetailers ?? 0, href: "/admin/retailers" },
    { label: "Activities", value: activities ?? 0, href: "/admin/activities" },
    { label: "Affiliate Clicks", value: affiliateClicks ?? 0, href: "/admin/clicks" },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" description="A live snapshot of the catalog and activity." />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-2xl border border-espresso/10 bg-white p-5 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)]"
          >
            <p className="text-2xl font-semibold text-espresso">{s.value}</p>
            <p className="mt-1 text-xs text-espresso/50">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RankingCard title="Top Products" rows={topProducts} emptyLabel="No data yet" />
        <RankingCard title="Top Traffic Sources" rows={topSources} emptyLabel="No data yet" />
      </div>
    </div>
  );
}

function tally(rows: { id: string | null; name: string | undefined }[]) {
  const counts = new Map<string, { name: string; count: number }>();
  rows.forEach(({ id, name }) => {
    if (!id) return;
    const entry = counts.get(id) ?? { name: name ?? "Unknown", count: 0 };
    entry.count += 1;
    counts.set(id, entry);
  });
  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function RankingCard({
  title,
  rows,
  emptyLabel,
}: {
  title: string;
  rows: { name: string; count: number }[];
  emptyLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-espresso/10 bg-white p-5 shadow-[var(--shadow-card)]">
      <h2 className="mb-4 font-serif-display text-lg font-semibold text-espresso">{title}</h2>
      {rows.length > 0 ? (
        <ul className="flex flex-col gap-2.5">
          {rows.map((r) => (
            <li key={r.name} className="flex items-center justify-between text-sm">
              <span className="text-espresso/75">{r.name}</span>
              <span className="font-medium text-espresso">{r.count}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-espresso/45">{emptyLabel}</p>
      )}
    </div>
  );
}
