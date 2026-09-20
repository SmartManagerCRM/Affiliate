"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Calendar, ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import type { RangeKey } from "@/lib/dateRange";

const PRESETS: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "month", label: "This month" },
];

export function DateRangePicker({ activeKey, label }: { activeKey: RangeKey; label: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(searchParams.get("from") ?? "");
  const [customTo, setCustomTo] = useState(searchParams.get("to") ?? "");

  function apply(params: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    router.push(`${pathname}?${next.toString()}`);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 items-center gap-2 rounded-full border border-espresso/15 bg-white px-4 text-sm font-medium text-espresso shadow-[var(--shadow-card)] hover:border-espresso/25"
      >
        <Calendar className="h-4 w-4 text-espresso/45" strokeWidth={1.75} />
        {label}
        <ChevronDown className="h-3.5 w-3.5 text-espresso/40" strokeWidth={1.75} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute end-0 top-12 z-50 w-64 rounded-2xl border border-espresso/10 bg-white p-2 shadow-[var(--shadow-card-hover)]">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => apply({ range: p.key, from: undefined, to: undefined })}
                className={clsx(
                  "block w-full rounded-lg px-3 py-2 text-start text-sm",
                  activeKey === p.key
                    ? "bg-espresso text-cream"
                    : "text-espresso/75 hover:bg-beige/60"
                )}
              >
                {p.label}
              </button>
            ))}
            <div className="mt-2 border-t border-espresso/10 pt-2">
              <p className="px-3 pb-1.5 text-xs font-medium text-espresso/45">Custom range</p>
              <div className="flex items-center gap-2 px-3">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-full rounded-lg border border-espresso/15 px-2 py-1.5 text-xs"
                />
                <span className="text-espresso/30">–</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-full rounded-lg border border-espresso/15 px-2 py-1.5 text-xs"
                />
              </div>
              <button
                type="button"
                disabled={!customFrom || !customTo}
                onClick={() => apply({ range: "custom", from: customFrom, to: customTo })}
                className="mt-2 w-full rounded-lg bg-accent-green px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
              >
                Apply
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
