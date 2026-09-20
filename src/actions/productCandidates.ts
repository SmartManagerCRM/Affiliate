"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { approveCandidate } from "@/lib/productAutomation/review/approveCandidate";
import { normalizeNameForMatch } from "@/lib/productAutomation/dedup";
import type { NormalizedProduct } from "@/lib/productAutomation/types";

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export async function approveCandidateAction(formData: FormData) {
  const { supabase, admin } = await requireAdmin();
  const id = String(formData.get("id"));
  const redirectTo = String(formData.get("redirect_to") ?? "/admin/product-candidates");

  const result = await approveCandidate(supabase, id, admin.id);

  revalidatePath("/admin/product-candidates");
  revalidatePath(`/admin/product-candidates/${id}`);
  revalidatePath("/admin/products");

  if (result.status === "error") {
    redirect(`${redirectTo}?error=${encodeURIComponent(result.message)}`);
  }
  redirect(`${redirectTo}?saved=1`);
}

export async function approveCandidatesAction(formData: FormData) {
  const { supabase, admin } = await requireAdmin();
  const ids = formData.getAll("ids").map(String);

  let approved = 0;
  let failed = 0;
  for (const id of ids) {
    const result = await approveCandidate(supabase, id, admin.id);
    if (result.status === "approved") approved += 1;
    else failed += 1;
  }

  revalidatePath("/admin/product-candidates");
  revalidatePath("/admin/products");

  const message = ids.length === 0 ? "No candidates selected." : `Approved ${approved} of ${ids.length}${failed > 0 ? ` (${failed} failed)` : ""}.`;
  redirect(`/admin/product-candidates?saved=${encodeURIComponent(message)}`);
}

export async function rejectCandidateAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  const reason = String(formData.get("reason") ?? "").trim() || null;
  const redirectTo = String(formData.get("redirect_to") ?? "/admin/product-candidates");

  const { error } = await supabase
    .from("product_import_sources")
    .update({ approval_status: "rejected", rejection_reason: reason })
    .eq("id", id);

  revalidatePath("/admin/product-candidates");
  revalidatePath(`/admin/product-candidates/${id}`);

  if (error) redirect(`${redirectTo}?error=${encodeURIComponent(error.message)}`);
  redirect(`${redirectTo}?saved=1`);
}

export async function rejectCandidatesAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const ids = formData.getAll("ids").map(String);

  if (ids.length === 0) {
    redirect(`/admin/product-candidates?error=${encodeURIComponent("No candidates selected.")}`);
  }

  const { error } = await supabase.from("product_import_sources").update({ approval_status: "rejected" }).in("id", ids);

  revalidatePath("/admin/product-candidates");

  if (error) redirect(`/admin/product-candidates?error=${encodeURIComponent(error.message)}`);
  redirect(`/admin/product-candidates?saved=${encodeURIComponent(`Rejected ${ids.length} candidate(s).`)}`);
}

export async function flagCandidateForReviewAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  const redirectTo = String(formData.get("redirect_to") ?? "/admin/product-candidates");

  const { error } = await supabase
    .from("product_import_sources")
    .update({ approval_status: "needs_review" })
    .eq("id", id);

  revalidatePath("/admin/product-candidates");
  revalidatePath(`/admin/product-candidates/${id}`);

  if (error) redirect(`${redirectTo}?error=${encodeURIComponent(error.message)}`);
  redirect(`${redirectTo}?saved=1`);
}

export async function resetCandidateToPendingAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  const redirectTo = String(formData.get("redirect_to") ?? "/admin/product-candidates");

  const { error } = await supabase
    .from("product_import_sources")
    .update({ approval_status: "pending", rejection_reason: null })
    .eq("id", id);

  revalidatePath("/admin/product-candidates");
  revalidatePath(`/admin/product-candidates/${id}`);

  if (error) redirect(`${redirectTo}?error=${encodeURIComponent(error.message)}`);
  redirect(`${redirectTo}?saved=1`);
}

/**
 * Lets an admin correct the staged candidate before approval — name,
 * brand, description, price/currency/affiliate URL, and the classification
 * assignment. Writes back to the staging row only; never touches a real
 * product/offer (that only happens on Approve), and deliberately does not
 * re-run dedup/classification/scoring against the edited values — this is
 * a manual correction, not a re-import.
 */
export async function updateCandidateDetails(candidateId: string, formData: FormData) {
  const { supabase } = await requireAdmin();

  const { data: row, error: fetchError } = await supabase
    .from("product_import_sources")
    .select("normalized_data")
    .eq("id", candidateId)
    .single();
  if (fetchError || !row) {
    redirect(`/admin/product-candidates/${candidateId}?error=${encodeURIComponent("Candidate not found.")}`);
  }

  const name = String(formData.get("name") ?? "").trim();
  const brand = String(formData.get("brand") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const price = Number(formData.get("price") ?? 0);
  const currency = String(formData.get("currency") ?? "").trim().toUpperCase();
  const affiliateUrl = String(formData.get("affiliate_url") ?? "").trim();
  const activityId = String(formData.get("classification_activity_id") ?? "").trim();
  const categoryIds = formData.getAll("classification_category_ids").map(String);

  if (!name) redirect(`/admin/product-candidates/${candidateId}?error=${encodeURIComponent("Name is required.")}`);
  if (!price || price <= 0) {
    redirect(`/admin/product-candidates/${candidateId}?error=${encodeURIComponent("Price must be greater than 0.")}`);
  }
  if (!currency) {
    redirect(`/admin/product-candidates/${candidateId}?error=${encodeURIComponent("Currency is required.")}`);
  }
  if (!isValidUrl(affiliateUrl)) {
    redirect(
      `/admin/product-candidates/${candidateId}?error=${encodeURIComponent("Affiliate URL must be a valid http(s) link.")}`
    );
  }

  const existing = row!.normalized_data as unknown as NormalizedProduct;
  const updatedProduct: NormalizedProduct = {
    ...existing,
    name,
    brand: brand || null,
    description: description || null,
    offers: existing.offers.length > 0 ? [{ ...existing.offers[0], price, currency, affiliateUrl }, ...existing.offers.slice(1)] : existing.offers,
  };

  const { error } = await supabase
    .from("product_import_sources")
    .update({
      normalized_data: updatedProduct as never,
      normalized_name: normalizeNameForMatch(name),
      brand: brand ? brand.toLowerCase() : null,
      classification_activity_id: activityId || null,
      classification_category_ids: categoryIds,
    })
    .eq("id", candidateId);

  if (error) redirect(`/admin/product-candidates/${candidateId}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(`/admin/product-candidates/${candidateId}`);
  revalidatePath("/admin/product-candidates");
  redirect(`/admin/product-candidates/${candidateId}?saved=1`);
}
