import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { SidebarNav } from "@/components/admin/Sidebar";
import { AdminMobileSidebar } from "@/components/admin/AdminMobileSidebar";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { AdminLanguageSwitcher } from "@/components/admin/AdminLanguageSwitcher";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { admin } = await requireAdmin();

  return (
    <div className="flex min-h-screen bg-[#F5F1EA]">
      <aside className="hidden w-64 shrink-0 flex-col bg-[#241209] p-4 lg:flex">
        <Link href="/admin" className="mb-8 flex items-center gap-2 px-2">
          <Image src="/logo-icon.png" alt="" width={28} height={28} />
          <span className="flex items-baseline gap-1">
            <span className="font-serif-display text-lg font-semibold text-white">Selected</span>
            <span className="font-serif-display text-lg italic text-accent-gold">Items</span>
          </span>
        </Link>
        <SidebarNav />
        <div className="mt-auto pt-6">
          <Link
            href="/"
            target="_blank"
            className="block rounded-lg px-3 py-2 text-xs text-slate-400 hover:text-white"
          >
            View public site ↗
          </Link>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-3 bg-[#2E160A] px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <AdminMobileSidebar />
            <span className="text-sm font-medium text-white/90">
              {admin.full_name || admin.email}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <AdminLanguageSwitcher />
            <SignOutButton />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
