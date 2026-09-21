"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { CjAdapter } from "@/lib/productAutomation/adapters/cj/cjAdapter";
import { createCjProgram, setCjProgramActive, deleteCjProgram, upsertDiscoveredCjPrograms } from "@/lib/productAutomation/adapters/cj/programsStore";
import { acquireSyncLock, releaseSyncLock } from "@/lib/productAutomation/scheduler/syncLock";
import { runCjPrograms } from "@/lib/productAutomation/scheduler/runScheduledSync";
import { SupabaseSyncStore } from "@/lib/productAutomation/supabaseSyncStore";

const BASE_PATH = "/admin/product-automation/cj-programs";

export async function createCjProgramAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const cjAdvertiserId = String(formData.get("cj_advertiser_id") ?? "").trim();
  const advertiserName = String(formData.get("advertiser_name") ?? "").trim();
  const programUrl = String(formData.get("program_url") ?? "").trim() || null;
  const active = formData.get("active") === "on";

  if (!cjAdvertiserId || !advertiserName) {
    redirect(`${BASE_PATH}/new?error=${encodeURIComponent("Advertiser ID and name are both required.")}`);
  }

  try {
    await createCjProgram(supabase, { cjAdvertiserId, advertiserName, programUrl, active });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create the program.";
    redirect(`${BASE_PATH}/new?error=${encodeURIComponent(message)}`);
  }

  revalidatePath(BASE_PATH);
  redirect(`${BASE_PATH}?saved=1`);
}

/** Toggles active on submit — `active` in the form is the CURRENT value (matches actions/offers.ts's toggleOfferActive convention), and this flips it. */
export async function toggleCjProgramActiveAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  const currentlyActive = formData.get("active") === "true";
  await setCjProgramActive(supabase, id, !currentlyActive);
  revalidatePath(BASE_PATH);
}

export async function deleteCjProgramAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  await deleteCjProgram(supabase, id);
  revalidatePath(BASE_PATH);
}

export type DiscoverCjProgramsResult = {
  message: string;
};

/**
 * Server-side "Discover Programs": authenticates with this account's own
 * CJ Personal Access Token and pages through CJ's Product Search GraphQL
 * API (products, filtered to partnerStatus: JOINED) to collect the distinct
 * advertisers this account has actually joined — never a per-advertiser env
 * var, never a browser-side credential. CJ's GraphQL API has no dedicated
 * "list my relationships" query, so this is the closest available
 * equivalent; see cjAdapter.ts's class-level doc comment for the full
 * citation trail and its trade-offs (large catalogs may need many pages). A
 * wrong assumption about response shape degrades to "found nothing" via
 * defensive parsing, and the manual "Add Program" form works regardless.
 */
export async function discoverCjProgramsAction(): Promise<DiscoverCjProgramsResult> {
  const { supabase } = await requireAdmin();

  try {
    const adapter = new CjAdapter();
    const discovered = await adapter.discoverPrograms();
    const summary = await upsertDiscoveredCjPrograms(supabase, discovered);
    revalidatePath(BASE_PATH);
    return {
      message:
        summary.found === 0
          ? "Discovery ran but CJ reported no advertiser relationships for this account."
          : `Discovered ${summary.found} advertiser(s): ${summary.created} new, ${summary.updated} refreshed. Select which to enable below.`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error.";
    return { message: `Discovery failed: ${message}` };
  }
}

export type SyncCjResult = {
  message: string;
};

/**
 * Server-side "Sync CJ": runs product synchronization for every active CJ
 * program, sharing the same runCjPrograms() path "Sync All" uses for CJ —
 * never a separate, less-careful implementation — but skips the pipeline's
 * classification/auto-update stages, since those are shared across every
 * network, not CJ-specific. Guarded by the same product_sync_lock mutex as
 * "Sync All" (syncLock.ts) so the two can never race the same catalog.
 */
export async function syncCjNetworkAction(): Promise<SyncCjResult> {
  const { supabase, admin } = await requireAdmin();

  const lock = await acquireSyncLock(supabase, { lockedBy: `admin:${admin.email}:cj` });
  if (!lock.acquired) {
    return { message: `Sync skipped: ${lock.reason}` };
  }

  try {
    const store = new SupabaseSyncStore(supabase);
    const outcome = await runCjPrograms(supabase, store, "CJ");

    revalidatePath("/admin/product-automation");
    revalidatePath("/admin/product-automation/history");
    revalidatePath(BASE_PATH);
    revalidatePath("/admin/products");
    revalidatePath("/admin/offers");

    return { message: outcome.message };
  } catch (err) {
    // Never let an unexpected failure escape as an uncaught Server Action
    // error — that crashes the whole page with a generic "server error"
    // instead of showing the admin what went wrong.
    const message = err instanceof Error ? err.message : "Unknown error.";
    return { message: `Sync failed: ${message}` };
  } finally {
    await releaseSyncLock(supabase);
  }
}
