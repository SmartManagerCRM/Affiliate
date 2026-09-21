"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { AdmitadAdapter } from "@/lib/productAutomation/adapters/admitad/admitadAdapter";
import {
  createAdmitadProgram,
  updateAdmitadProgram,
  deleteAdmitadProgram,
  upsertDiscoveredPrograms,
} from "@/lib/productAutomation/adapters/admitad/programsStore";

const BASE_PATH = "/admin/product-automation/admitad-programs";

function readForm(formData: FormData) {
  return {
    advertiserName: String(formData.get("advertiser_name") ?? "").trim(),
    country: String(formData.get("country") ?? "").trim() || null,
    feedId: String(formData.get("feed_id") ?? "").trim() || null,
    feedUrl: String(formData.get("feed_url") ?? "").trim() || null,
    feedFormat: String(formData.get("feed_format") ?? "csv").trim() || "csv",
    active: formData.get("active") === "on",
  };
}

export async function createAdmitadProgramAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const values = readForm(formData);
  if (!values.advertiserName) redirect(`${BASE_PATH}/new?error=${encodeURIComponent("Advertiser name is required.")}`);

  try {
    await createAdmitadProgram(supabase, values);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create the program.";
    redirect(`${BASE_PATH}/new?error=${encodeURIComponent(message)}`);
  }

  revalidatePath(BASE_PATH);
  redirect(`${BASE_PATH}?saved=1`);
}

export async function updateAdmitadProgramAction(id: string, formData: FormData) {
  const { supabase } = await requireAdmin();
  const values = readForm(formData);
  if (!values.advertiserName) redirect(`${BASE_PATH}/${id}?error=${encodeURIComponent("Advertiser name is required.")}`);

  try {
    await updateAdmitadProgram(supabase, id, values);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save the program.";
    redirect(`${BASE_PATH}/${id}?error=${encodeURIComponent(message)}`);
  }

  revalidatePath(BASE_PATH);
  redirect(`${BASE_PATH}?saved=1`);
}

export async function deleteAdmitadProgramAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  await deleteAdmitadProgram(supabase, id);
  revalidatePath(BASE_PATH);
}

export type DiscoverProgramsResult = {
  message: string;
};

/**
 * Server-side "Discover Programs": authenticates once with the account's
 * own Admitad credentials and asks Admitad's API for this account's
 * advertiser programs — never a per-program env var, never a browser-side
 * credential. See admitadAdapter.ts's discoverPrograms() for the honest
 * caveat that the exact endpoint/response shape is unverified without a
 * live Admitad account to test against; a wrong assumption there degrades
 * to "found nothing", so the manual "Add Program" form below always works
 * regardless.
 */
export async function discoverAdmitadProgramsAction(): Promise<DiscoverProgramsResult> {
  const { supabase } = await requireAdmin();

  try {
    const adapter = new AdmitadAdapter();
    const discovered = await adapter.discoverPrograms();
    const summary = await upsertDiscoveredPrograms(supabase, discovered);
    revalidatePath(BASE_PATH);
    return {
      message:
        summary.found === 0
          ? "Discovery ran but Admitad reported no advertiser programs for this account."
          : `Discovered ${summary.found} program(s): ${summary.created} new, ${summary.updated} refreshed.`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error.";
    return { message: `Discovery failed: ${message}` };
  }
}
