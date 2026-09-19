import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Verifies the current session belongs to a user listed in admin_users.
 * Row Level Security enforces this independently on every table, but
 * checking here lets us redirect to the login screen with a clean UX.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!adminRow) {
    redirect("/admin/login?error=not_authorized");
  }

  return { supabase, user, admin: adminRow };
}
