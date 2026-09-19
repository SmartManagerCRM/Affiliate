import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Cookie-free client for anonymous/public reads. Unlike the cookie-bound
 * client in server.ts, using this does NOT force Next.js to opt every page
 * that calls it out of static rendering/caching — which matters a lot here,
 * since the public site never shows different content per visitor.
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}
