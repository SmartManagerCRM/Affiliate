"use client";

import { useCallback, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { clsx } from "clsx";
import { ExternalLink, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { SidebarNav } from "@/components/admin/Sidebar";

const STORAGE_KEY = "admin_sidebar_collapsed";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function getServerSnapshot() {
  return false;
}

export function AdminSidebar() {
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    const next = !getSnapshot();
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // Ignore — the toggle still works for the rest of this visit.
    }
    // The native "storage" event only fires in *other* tabs; dispatch one
    // here too so this tab's useSyncExternalStore subscriber re-reads it.
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
  }, []);

  return (
    <aside
      className={clsx(
        "hidden shrink-0 flex-col bg-[#241209] p-4 transition-[width] duration-200 lg:flex",
        collapsed ? "w-[76px]" : "w-[230px]"
      )}
    >
      <Link
        href="/admin"
        className={clsx(
          "mb-6 flex items-center pt-1",
          collapsed ? "justify-center px-0" : "gap-2.5 px-2"
        )}
      >
        <Image src="/logo-icon.png" alt="" width={32} height={32} className="shrink-0" />
        {!collapsed && (
          <span className="flex flex-col leading-tight">
            <span className="flex items-baseline gap-1">
              <span className="font-serif-display text-base font-semibold text-white">Selected</span>
              <span className="font-serif-display text-base italic text-accent-gold">Items</span>
            </span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-white/40">
              SmartManager
            </span>
          </span>
        )}
      </Link>

      <SidebarNav collapsed={collapsed} />

      <div className="mt-auto flex flex-col gap-2">
        {!collapsed && (
          <div className="rounded-2xl bg-white/5 p-4">
            <p className="font-serif-display text-sm font-medium leading-snug text-white">
              Smart products.
              <br />
              Better businesses.
            </p>
            <Link
              href="/"
              target="_blank"
              className="mt-3 flex items-center justify-center gap-1.5 rounded-full bg-accent-gold px-3 py-2 text-xs font-semibold text-espresso hover:bg-accent-gold/90"
            >
              View Public Site
              <ExternalLink className="h-3 w-3" strokeWidth={2.5} />
            </Link>
          </div>
        )}

        <button
          type="button"
          onClick={toggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex items-center justify-center gap-2 rounded-xl border border-white/10 py-2 text-xs font-medium text-white/50 hover:bg-white/5 hover:text-white/80"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" strokeWidth={1.75} />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4" strokeWidth={1.75} />
              Collapse
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
