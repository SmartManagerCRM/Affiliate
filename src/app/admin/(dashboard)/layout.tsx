import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
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
      <AdminSidebar />

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
