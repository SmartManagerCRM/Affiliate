"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ExternalLink } from "lucide-react";
import { SignOutButton } from "@/components/admin/SignOutButton";

export function AdminProfileMenu({ name, role }: { name: string; role: string }) {
  const [open, setOpen] = useState(false);
  const initial = name.trim().charAt(0).toUpperCase() || "A";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="flex items-center gap-2.5 rounded-full py-1 pe-1.5 ps-1 hover:bg-beige/60"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-espresso text-sm font-semibold text-cream">
          {initial}
        </span>
        <span className="hidden text-start sm:block">
          <span className="block text-sm font-medium leading-tight text-espresso">{name}</span>
          <span className="block text-xs capitalize leading-tight text-espresso/45">{role}</span>
        </span>
        <ChevronDown className="hidden h-3.5 w-3.5 text-espresso/40 sm:block" strokeWidth={1.75} />
      </button>

      {open && (
        <div className="absolute end-0 top-12 z-50 w-52 rounded-2xl border border-espresso/10 bg-white p-1.5 shadow-[var(--shadow-card-hover)]">
          <div className="border-b border-espresso/8 px-3 py-2 sm:hidden">
            <p className="text-sm font-medium text-espresso">{name}</p>
            <p className="text-xs capitalize text-espresso/45">{role}</p>
          </div>
          <Link
            href="/"
            target="_blank"
            onMouseDown={(e) => e.preventDefault()}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-espresso/75 hover:bg-beige/60"
          >
            <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
            View Public Site
          </Link>
          <SignOutButton />
        </div>
      )}
    </div>
  );
}
