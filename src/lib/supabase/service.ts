import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Service-role client — bypasses Row Level Security entirely. There is no
 * admin browser session for a server-to-server trigger (the scheduled
 * sync cron endpoint), so this is the only way that path can read/write
 * the same tables an authenticated admin normally would through RLS.
 *
 * NEVER import this outside a trusted server-to-server context (the cron
 * route). Never expose SUPABASE_SERVICE_ROLE_KEY to the client — it isn't
 * prefixed NEXT_PUBLIC_, so Next.js already refuses to bundle it into
 * client code, but keep this file itself out of anything client-reachable
 * too.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured — the scheduled sync endpoint cannot run without it.");
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
