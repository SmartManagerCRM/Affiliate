import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { runScheduledSync } from "@/lib/productAutomation/scheduler/runScheduledSync";
import { isSyncDue } from "@/lib/productAutomation/scheduler/schedule";
import { DEFAULT_IMPORT_CONFIG, type ImportConfig } from "@/lib/productAutomation/importConfig";

/**
 * Server-to-server trigger for the scheduled sync (Phase 8). Call this on
 * whatever cadence your external scheduler supports — it's safe to call
 * often (e.g. hourly): it only actually runs a sync once the admin's
 * configured interval has elapsed since the last completed one, so the
 * real schedule lives entirely in the app (Import configuration ->
 * "Sync interval"), not in this endpoint's own call frequency.
 *
 * Auth: a Bearer token matching CRON_SECRET. This is the exact header
 * Vercel Cron sends automatically when CRON_SECRET is set as an env var,
 * but any external scheduler can be configured to send the same header —
 * nothing here is Vercel-specific beyond that convention.
 *
 * Calls the exact same runScheduledSync() the admin's "Sync Now" button
 * calls — never a separate, less-careful scheduled-only implementation.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let supabase;
  try {
    supabase = createServiceClient();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Service client is not configured.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const { data: configRow } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "product_automation_config")
    .maybeSingle();
  const config: ImportConfig = { ...DEFAULT_IMPORT_CONFIG, ...((configRow?.value as Partial<ImportConfig>) ?? {}) };

  const { data: lastRun } = await supabase
    .from("product_sync_runs")
    .select("completed_at")
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!isSyncDue(lastRun?.completed_at ?? null, config.syncIntervalHours)) {
    return NextResponse.json({ ranSync: false, message: `Not due yet (interval: ${config.syncIntervalHours}h).` });
  }

  const result = await runScheduledSync(supabase, { lockedBy: "cron" });
  return NextResponse.json({ ranSync: true, ...result });
}
