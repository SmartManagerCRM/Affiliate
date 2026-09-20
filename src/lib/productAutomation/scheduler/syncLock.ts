import "server-only";
import type { createClient } from "@/lib/supabase/server";

type SupabaseAdmin = Awaited<ReturnType<typeof createClient>>;

export type AcquireLockResult = { acquired: true } | { acquired: false; reason: string };

const DEFAULT_STALE_AFTER_MINUTES = 30;

/** Pure (given `now`) staleness check, shared by acquireSyncLock and the
 * admin UI's "sync in progress" badge — kept out of the UI component body
 * so a raw `Date.now()` call never appears directly in render. */
export function isLockActive(lockedAt: string | null, staleAfterMinutes = DEFAULT_STALE_AFTER_MINUTES, now: Date = new Date()): boolean {
  if (!lockedAt) return false;
  return now.getTime() - new Date(lockedAt).getTime() < staleAfterMinutes * 60_000;
}

/**
 * Atomic mutex for the sync pipeline, backed by a single-row table rather
 * than a Postgres advisory lock: advisory locks are session-scoped and
 * don't reliably survive Supabase's pooled connections across separate
 * application calls, whereas this single `UPDATE ... WHERE ... RETURNING`
 * statement's row-level locking is safe under any pooling mode — only one
 * concurrent caller can ever have its WHERE clause still match.
 *
 * `staleAfterMinutes` exists so a crashed process that never reached its
 * `finally` release can't deadlock every future sync forever — after that
 * window, the lock is treated as abandoned and can be re-acquired.
 */
export async function acquireSyncLock(
  supabase: SupabaseAdmin,
  options: { lockedBy?: string; staleAfterMinutes?: number } = {}
): Promise<AcquireLockResult> {
  const staleAfterMinutes = options.staleAfterMinutes ?? DEFAULT_STALE_AFTER_MINUTES;
  const staleThreshold = new Date(Date.now() - staleAfterMinutes * 60_000).toISOString();

  const { data, error } = await supabase
    .from("product_sync_lock")
    .update({ locked_at: new Date().toISOString(), locked_by: options.lockedBy ?? "sync" })
    .eq("id", true)
    .or(`locked_at.is.null,locked_at.lt.${staleThreshold}`)
    .select("id")
    .maybeSingle();

  if (error) return { acquired: false, reason: error.message };
  if (!data) return { acquired: false, reason: "Another sync is already running." };
  return { acquired: true };
}

export async function releaseSyncLock(supabase: SupabaseAdmin): Promise<void> {
  await supabase.from("product_sync_lock").update({ locked_at: null, locked_by: null }).eq("id", true);
}
