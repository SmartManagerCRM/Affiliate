"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: "▦" },
  { href: "/admin/products", label: "Products", icon: "◈" },
  { href: "/admin/activities", label: "Activities", icon: "✦" },
  { href: "/admin/categories", label: "Categories", icon: "▤" },
  { href: "/admin/retailers", label: "Retailers", icon: "⬡" },
  { href: "/admin/networks", label: "Affiliate Networks", icon: "⛓" },
  { href: "/admin/offers", label: "Offers", icon: "☰" },
  { href: "/admin/traffic-sources", label: "Traffic Sources", icon: "↗" },
  { href: "/admin/clicks", label: "Affiliate Clicks", icon: "◎" },
  { href: "/admin/settings", label: "Settings", icon: "⚙" },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const active =
          item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={clsx(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-espresso text-cream"
                : "text-slate-300 hover:bg-white/5 hover:text-white"
            )}
          >
            <span className="w-4 text-center text-xs opacity-70">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
