"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X, ExternalLink } from "lucide-react";
import { SidebarNav } from "@/components/admin/Sidebar";

export function AdminMobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-espresso/12 text-espresso/60 lg:hidden"
      >
        <Menu className="h-4.5 w-4.5" strokeWidth={1.75} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 flex h-full w-72 flex-col overflow-y-auto bg-[#241209] p-4">
            <div className="mb-6 flex items-center justify-between px-2 pt-1">
              <Link href="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2.5">
                <Image src="/logo-icon.png" alt="" width={30} height={30} />
                <span className="flex items-baseline gap-1">
                  <span className="font-serif-display text-base font-semibold text-white">Selected</span>
                  <span className="font-serif-display text-base italic text-accent-gold">Items</span>
                </span>
              </Link>
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="text-white/60">
                <X className="h-4.5 w-4.5" strokeWidth={1.75} />
              </button>
            </div>
            <SidebarNav onNavigate={() => setOpen(false)} />
            <div className="mt-auto rounded-2xl bg-white/5 p-4">
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
          </div>
        </div>
      )}
    </>
  );
}
