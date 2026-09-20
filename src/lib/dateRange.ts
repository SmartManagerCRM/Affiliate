export type RangeKey = "today" | "7d" | "30d" | "month" | "custom";

export type ResolvedRange = {
  key: RangeKey;
  from: Date;
  to: Date;
  label: string;
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * Resolves the dashboard's `?range=` (+ optional `from`/`to` for "custom")
 * search params into a concrete date window. Runs server-side, so "now" is
 * the server's clock — the app has no client-timezone signal to use instead.
 */
export function resolveDateRange(searchParams: {
  range?: string;
  from?: string;
  to?: string;
}): ResolvedRange {
  const now = new Date();
  const key = (searchParams.range as RangeKey) || "30d";

  if (key === "custom" && searchParams.from && searchParams.to) {
    const from = new Date(`${searchParams.from}T00:00:00.000Z`);
    const to = new Date(`${searchParams.to}T23:59:59.999Z`);
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && from <= to) {
      return { key, from, to, label: `${searchParams.from} – ${searchParams.to}` };
    }
  }

  switch (key) {
    case "today":
      return { key, from: startOfDay(now), to: now, label: "Today" };
    case "7d": {
      const from = startOfDay(now);
      from.setDate(from.getDate() - 6);
      return { key, from, to: now, label: "Last 7 days" };
    }
    case "month":
      return {
        key,
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: now,
        label: "This month",
      };
    case "30d":
    default: {
      const from = startOfDay(now);
      from.setDate(from.getDate() - 29);
      return { key: "30d", from, to: now, label: "Last 30 days" };
    }
  }
}

/** The immediately-preceding window of the same length, for real
 * period-over-period comparisons — never a guessed or fabricated baseline. */
export function previousPeriod(range: ResolvedRange): { from: Date; to: Date } {
  const durationMs = range.to.getTime() - range.from.getTime();
  const to = new Date(range.from.getTime() - 1);
  const from = new Date(to.getTime() - durationMs);
  return { from, to };
}

/** Real percentage change, or null when there's no honest baseline to compare against. */
export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

export function eachDay(from: Date, to: Date): string[] {
  const days: string[] = [];
  const cursor = startOfDay(from);
  const end = startOfDay(to);
  while (cursor <= end) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}
