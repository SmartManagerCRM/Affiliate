import { History, Package, Tag, Store, Plus, Pencil } from "lucide-react";
import { DashboardCard } from "@/components/admin/dashboard/DashboardCard";
import { formatRelativeTime } from "@/lib/relativeTime";
import type { RecentActivityEvent } from "@/lib/adminAnalytics";

const KIND_ICON = { product: Package, offer: Tag, retailer: Store } as const;
const KIND_LABEL = { product: "product", offer: "offer", retailer: "retailer" } as const;

export function RecentActivityCard({ events }: { events: RecentActivityEvent[] }) {
  return (
    <DashboardCard icon={History} title="Recent Activity">
      {events.length === 0 ? (
        <p className="py-6 text-center text-sm text-espresso/45">No recent activity</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {events.map((e) => {
            const KindIcon = KIND_ICON[e.kind];
            const ActionIcon = e.action === "created" ? Plus : Pencil;
            return (
              <li key={e.id} className="flex items-start gap-3 rounded-xl px-2 py-2">
                <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-beige/70 text-espresso/60">
                  <KindIcon className="h-4 w-4" strokeWidth={1.75} />
                  <span
                    className={
                      "absolute -bottom-0.5 -end-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-white " +
                      (e.action === "created" ? "bg-accent-green text-white" : "bg-accent-gold text-white")
                    }
                  >
                    <ActionIcon className="h-2 w-2" strokeWidth={3} />
                  </span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-espresso">
                    {e.action === "created" ? "New" : "Updated"} {KIND_LABEL[e.kind]}
                    {e.action === "created" ? " added" : ""}
                  </p>
                  <p className="truncate text-xs text-espresso/50">{e.label}</p>
                </div>
                <span className="shrink-0 whitespace-nowrap text-xs text-espresso/35">
                  {formatRelativeTime(e.timestamp)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardCard>
  );
}
