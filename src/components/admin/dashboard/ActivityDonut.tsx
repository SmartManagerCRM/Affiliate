"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Layers } from "lucide-react";
import type { ActivityShare } from "@/lib/adminAnalytics";

const COLORS = ["#3E2417", "#D78B3C", "#399B55", "#B89A78", "#8C6A52", "#E3C08A"];

export function ActivityDonut({ data, total }: { data: ActivityShare[]; total: number }) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-espresso/15 text-center">
        <Layers className="h-7 w-7 text-espresso/25" strokeWidth={1.5} />
        <p className="text-sm font-medium text-espresso/60">No products assigned yet</p>
        <p className="max-w-xs text-xs text-espresso/40">
          Link products to activities to see their distribution here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div className="relative h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="name"
              innerRadius={58}
              outerRadius={80}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((d, i) => (
                <Cell key={d.activityId} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-serif-display text-2xl font-semibold text-espresso">{total}</span>
          <span className="text-xs text-espresso/45">Products</span>
        </div>
      </div>

      <ul className="w-full flex-1 space-y-2.5">
        {data.map((d, i) => (
          <li key={d.activityId} className="flex items-center justify-between text-sm">
            <span className="flex min-w-0 items-center gap-2 text-espresso/75">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              <span className="truncate">{d.name}</span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="font-medium text-espresso">{d.count}</span>
              <span className="text-xs text-espresso/40">{Math.round(d.percent)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
