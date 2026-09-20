import { Smartphone, Monitor, Tablet, HelpCircle } from "lucide-react";
import { DashboardCard } from "@/components/admin/dashboard/DashboardCard";
import type { DeviceShare } from "@/lib/adminAnalytics";

const DEVICE_ICON: Record<string, typeof Monitor> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

export function DeviceBreakdownCard({ data }: { data: DeviceShare[] }) {
  return (
    <DashboardCard icon={Monitor} title="Clicks by Device" subtitle="Share of affiliate clicks per device type">
      {data.length === 0 ? (
        <p className="py-6 text-center text-sm text-espresso/45">No affiliate clicks yet.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {data.map((d) => {
            const Icon = DEVICE_ICON[d.device.toLowerCase()] ?? HelpCircle;
            return (
              <li key={d.device}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 capitalize text-espresso/75">
                    <Icon className="h-4 w-4 text-espresso/40" strokeWidth={1.75} />
                    {d.device}
                  </span>
                  <span className="font-medium text-espresso">
                    {d.count} <span className="text-xs font-normal text-espresso/40">({Math.round(d.percent)}%)</span>
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-beige/70">
                  <div className="h-full rounded-full bg-accent-gold" style={{ width: `${d.percent}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardCard>
  );
}
