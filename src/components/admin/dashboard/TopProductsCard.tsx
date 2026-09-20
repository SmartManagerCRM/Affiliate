import Image from "next/image";
import Link from "next/link";
import { Package, MousePointerClick } from "lucide-react";
import { DashboardCard } from "@/components/admin/dashboard/DashboardCard";
import type { TopProductRow } from "@/lib/adminAnalytics";

export function TopProductsCard({ rows }: { rows: TopProductRow[] }) {
  return (
    <DashboardCard
      icon={MousePointerClick}
      title="Top Products"
      subtitle="Most clicked products this period"
      viewAllHref="/admin/products"
    >
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-espresso/45">No product clicks yet.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {rows.map((r) => (
            <li key={r.productId}>
              <Link
                href={`/admin/products/${r.productId}`}
                className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-beige/50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-beige">
                  {r.mainImage ? (
                    <Image src={r.mainImage} alt="" width={40} height={40} className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-4.5 w-4.5 text-espresso/30" strokeWidth={1.75} />
                  )}
                </div>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-espresso">{r.name}</span>
                <span className="shrink-0 text-sm font-semibold text-espresso">
                  {r.clicks}
                  <span className="ms-1 text-xs font-normal text-espresso/40">
                    click{r.clicks === 1 ? "" : "s"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}
