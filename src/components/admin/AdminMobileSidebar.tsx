"use client";

import { useState } from "react";
import { SidebarNav } from "@/components/admin/Sidebar";

export function AdminMobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-white lg:hidden"
      >
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
          <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 overflow-y-auto bg-[#241209] p-4">
            <div className="mb-6 flex items-center justify-between px-2">
              <span className="font-serif-display text-lg font-semibold text-white">Admin</span>
              <button onClick={() => setOpen(false)} className="text-white/60">
                ✕
              </button>
            </div>
            <SidebarNav onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
