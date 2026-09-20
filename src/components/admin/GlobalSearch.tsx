"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Package, Store, Layers, LayoutGrid } from "lucide-react";
import { searchAdmin, type AdminSearchResult } from "@/actions/adminSearch";

const ICONS = {
  product: Package,
  retailer: Store,
  activity: Layers,
  category: LayoutGrid,
} as const;

export function GlobalSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const timeout = setTimeout(() => {
      startTransition(async () => {
        const data = await searchAdmin(q);
        setResults(data);
      });
    }, 200);
    return () => clearTimeout(timeout);
  }, [query]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <div className="relative min-w-0 flex-1 sm:max-w-sm">
      <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-espresso/35" />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search products, retailers, activities…"
        className="h-10 w-full rounded-full border border-espresso/12 bg-beige/40 ps-10 pe-14 text-sm text-espresso placeholder:text-espresso/40 focus:border-accent-gold/60 focus:bg-white focus:outline-none"
      />
      <kbd className="pointer-events-none absolute end-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-espresso/15 bg-white px-1.5 py-0.5 text-[10px] font-medium text-espresso/40 sm:block">
        Ctrl K
      </kbd>

      {open && query.trim().length >= 2 && (
        <div className="absolute start-0 top-12 z-50 w-full overflow-hidden rounded-2xl border border-espresso/10 bg-white shadow-[var(--shadow-card-hover)]">
          {isPending && results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-espresso/45">Searching…</p>
          ) : results.length > 0 ? (
            <ul className="max-h-80 overflow-y-auto py-1.5">
              {results.map((r) => {
                const Icon = ICONS[r.type];
                return (
                  <li key={`${r.type}-${r.id}`}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => go(r.href)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-start text-sm hover:bg-beige/50"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-espresso/40" strokeWidth={1.75} />
                      <span className="flex-1 truncate text-espresso">{r.title}</span>
                      <span className="text-xs capitalize text-espresso/35">{r.type}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-4 py-3 text-sm text-espresso/45">No matches for &ldquo;{query}&rdquo;</p>
          )}
        </div>
      )}
    </div>
  );
}
