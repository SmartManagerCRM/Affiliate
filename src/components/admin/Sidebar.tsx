"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  Package,
  Workflow,
  ClipboardCheck,
  Layers,
  LayoutGrid,
  Store,
  Share2,
  Tag,
  Radar,
  MousePointerClick,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/product-automation", label: "Product Automation", icon: Workflow },
  { href: "/admin/product-candidates", label: "Product Candidates", icon: ClipboardCheck },
  { href: "/admin/activities", label: "Activities", icon: Layers },
  { href: "/admin/categories", label: "Categories", icon: LayoutGrid },
  { href: "/admin/retailers", label: "Retailers", icon: Store },
  { href: "/admin/networks", label: "Affiliate Networks", icon: Share2 },
  { href: "/admin/offers", label: "Offers", icon: Tag },
  { href: "/admin/traffic-sources", label: "Traffic Sources", icon: Radar },
  { href: "/admin/clicks", label: "Affiliate Clicks", icon: MousePointerClick },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function SidebarNav({
  onNavigate,
  collapsed = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const active =
          item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={clsx(
              "flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition-colors",
              collapsed ? "justify-center px-2.5" : "px-3",
              active
                ? "bg-white/10 text-white ring-1 ring-inset ring-accent-gold/40"
                : "text-white/55 hover:bg-white/5 hover:text-white/90"
            )}
          >
            <Icon className={clsx("h-4.5 w-4.5 shrink-0", active && "text-accent-gold")} strokeWidth={1.75} />
            {!collapsed && item.label}
          </Link>
        );
      })}
    </nav>
  );
}
