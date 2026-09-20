"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { MousePointerClick } from "lucide-react";
import type { ClicksByDay } from "@/lib/adminAnalytics";

function formatTick(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length || !label) return null;
  return (
    <div className="rounded-xl border border-espresso/10 bg-white px-3 py-2 text-xs shadow-[var(--shadow-card-hover)]">
      <p className="font-medium text-espresso">{formatTick(label)}</p>
      <p className="mt-0.5 text-espresso/60">
        {payload[0].value} click{payload[0].value === 1 ? "" : "s"}
      </p>
    </div>
  );
}

export function ClicksChart({ data }: { data: ClicksByDay[] }) {
  const hasClicks = data.some((d) => d.clicks > 0);

  if (!hasClicks) {
    return (
      <div className="flex h-[218px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-espresso/15 text-center">
        <MousePointerClick className="h-7 w-7 text-espresso/25" strokeWidth={1.5} />
        <p className="text-sm font-medium text-espresso/60">No affiliate clicks yet</p>
        <p className="max-w-xs text-xs text-espresso/40">
          Clicks will appear here once visitors interact with product offers.
        </p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={221}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="clicksFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D78B3C" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#D78B3C" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3E241714" />
        <XAxis
          dataKey="date"
          tickFormatter={formatTick}
          tick={{ fontSize: 11, fill: "#3E241788" }}
          axisLine={false}
          tickLine={false}
          minTickGap={28}
        />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#3E241788" }} axisLine={false} tickLine={false} width={28} />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="clicks"
          stroke="#3E2417"
          strokeWidth={2}
          fill="url(#clicksFill)"
          activeDot={{ r: 4, fill: "#D78B3C", stroke: "#3E2417", strokeWidth: 1.5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
