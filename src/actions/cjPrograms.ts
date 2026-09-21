"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { CjAdapter } from "@/lib/productAutomation/adapters/cj/cjAdapter";
import { createCjProgram, setCjProgramActive, deleteCjProgram, upsertDiscoveredCjPrograms } from "@/lib/productAutomation/adapters/cj/programsStore";

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
 * CJ Personal Access Token and asks CJ's Advertiser Lookup API which
 * advertisers this account has a relationship with — never a per-advertiser
 * env var, never a browser-side credential. See cjAdapter.ts's own caveat:
 * the exact endpoint/response shape is sourced from third-party docs, not
 * confirmed directly against developers.cj.com (blocked in this sandbox) —
 * a wrong assumption degrades to "found nothing" via defensive parsing,
 * and the manual "Add Program" form works regardless.
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
