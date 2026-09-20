import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { SidebarNav } from "@/components/admin/Sidebar";
import { AdminMobileSidebar } from "@/components/admin/AdminMobileSidebar";
import { AdminLanguageSwitcher } from "@/components/admin/AdminLanguageSwitcher";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { AdminProfileMenu } from "@/components/admin/AdminProfileMenu";
import { GlobalSearch } from "@/components/admin/GlobalSearch";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { admin } = await requireAdmin();
  const displayName = admin.full_name || admin.email;

  return (
    <div className="flex min-h-screen bg-[#F5F1EA]">
      <aside className="hidden w-64 shrink-0 flex-col bg-[#241209] p-4 lg:flex">
        <Link href="/admin" className="mb-6 flex items-center gap-2.5 px-2 pt-1">
          <Image src="/logo-icon.png" alt="" width={32} height={32} className="shrink-0" />
          <span className="flex flex-col leading-tight">
            <span className="flex items-baseline gap-1">
              <span className="font-serif-display text-base font-semibold text-white">Selected</span>
              <span className="font-serif-display text-base italic text-accent-gold">Items</span>
            </span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-white/40">
              SmartManager
            </span>
          </span>
        </Link>

        <SidebarNav />

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
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b border-espresso/8 bg-cream px-4 sm:px-6">
          <AdminMobileSidebar />
          <GlobalSearch />
          <div className="ms-auto flex items-center gap-2 sm:gap-3">
            <AdminLanguageSwitcher className="hidden sm:block" />
            <NotificationBell />
            <AdminProfileMenu name={displayName} role={admin.role} />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
