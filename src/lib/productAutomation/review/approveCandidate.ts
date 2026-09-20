import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { mergeProductFields, resolveTargetProductId } from "./mergeProduct";
import { buildOfferUpdate, type OfferSyncFields } from "./offerSync";
import { resolveBrandId, resolveRetailerId, generateUniqueSlug, syncProductImages } from "./productWriters";
import type { NormalizedProduct } from "../types";

type SupabaseAdmin = Awaited<ReturnType<typeof createClient>>;

export type ApproveCandidateResult =
  | { status: "approved"; productId: string; offerId: string }
  | { status: "error"; message: string };

/**
 * Approves one staged candidate: creates a new product/offer, or — when
 * dedup linked this candidate to a real existing product (directly, or
 * via a sibling candidate that was itself approved first) — updates that
 * product instead of duplicating it. Product-field updates are
 * conservative gap-fills only (mergeProductFields). The offer is created
 * or refreshed from the candidate's data UNLESS a human has already taken
 * manual control of it (offers.managed_by_automation = false, set by
 * actions/offers.ts's updateOffer) — approval still links the candidate to
 * it, but never overwrites fields a human is now responsible for. Never
 * touches approval_status of any row but the one being approved (the
 * sibling lookup is read-only).
 */
export async function approveCandidate(
  supabase: SupabaseAdmin,
  candidateId: string,
  adminId: string
): Promise<ApproveCandidateResult> {
  const { data: candidate, error: fetchError } = await supabase
    .from("product_import_sources")
    .select(
      "id, network_id, product_id, normalized_data, dedup_match_product_id, dedup_match_source_id, classification_status, classification_activity_id, classification_category_ids"
    )
    .eq("id", candidateId)
    .single();

  if (fetchError || !candidate) {
    return { status: "error", message: fetchError?.message ?? "Candidate not found." };
  }

  const product = candidate.normalized_data as unknown as NormalizedProduct;
  const primaryOffer = product.offers[0];
  if (!product.name?.trim() || !primaryOffer) {
    return { status: "error", message: "Candidate is missing a name or an offer — cannot approve." };
  }

  let siblingProductId: string | null = null;
  if (!candidate.dedup_match_product_id && candidate.dedup_match_source_id) {
    const { data: sibling } = await supabase
      .from("product_import_sources")
      .select("product_id")
      .eq("id", candidate.dedup_match_source_id)
      .maybeSingle();
    siblingProductId = sibling?.product_id ?? null;
  }

  const targetProductId = resolveTargetProductId({
    ownProductId: candidate.product_id,
    dedupMatchProductId: candidate.dedup_match_product_id,
    siblingProductId,
  });

  const brandId = await resolveBrandId(supabase, product.brand);
  const retailerId = await resolveRetailerId(supabase, primaryOffer.retailerName);
  if (!retailerId) {
    return { status: "error", message: `Could not resolve a retailer for "${primaryOffer.retailerName}".` };
  }

  let productId: string;

  if (targetProductId) {
    const { data: existingProduct, error: existingError } = await supabase
      .from("products")
      .select("description, short_description, main_image, brand_id")
      .eq("id", targetProductId)
      .single();
    if (existingError || !existingProduct) {
      return { status: "error", message: existingError?.message ?? "The matched product no longer exists." };
    }

    const fieldUpdate = mergeProductFields(
      {
        description: existingProduct.description,
        shortDescription: existingProduct.short_description,
        mainImage: existingProduct.main_image,
        brandId: existingProduct.brand_id,
      },
      {
        description: product.description ?? null,
        shortDescription: product.shortDescription ?? null,
        mainImage: product.images[0] ?? null,
        brandId,
      }
    );

    if (Object.keys(fieldUpdate).length > 0) {
      const { error: updateError } = await supabase
        .from("products")
        .update({
          ...(fieldUpdate.description !== undefined && { description: fieldUpdate.description }),
          ...(fieldUpdate.shortDescription !== undefined && { short_description: fieldUpdate.shortDescription }),
          ...(fieldUpdate.mainImage !== undefined && { main_image: fieldUpdate.mainImage }),
          ...(fieldUpdate.brandId !== undefined && { brand_id: fieldUpdate.brandId }),
        })
        .eq("id", targetProductId);
      if (updateError) return { status: "error", message: updateError.message };
    }

    productId = targetProductId;
  } else {
    const slug = await generateUniqueSlug(supabase, product.name);
    const { data: created, error: createError } = await supabase
      .from("products")
      .insert({
        name: product.name,
        slug,
        brand_id: brandId,
        description: product.description ?? null,
        short_description: product.shortDescription ?? null,
        main_image: product.images[0] ?? null,
        specifications: {},
        tags: [],
        status: "published",
        featured: false,
      })
      .select("id")
      .single();
    if (createError || !created) {
      return { status: "error", message: createError?.message ?? "Failed to create the product." };
    }
    productId = created.id;
  }

  await syncProductImages(supabase, productId, product.images);

  // Activities/categories: add-only — never remove an existing link that
  // may have come from a human, or from another approved candidate.
  if (candidate.classification_status === "classified" && candidate.classification_activity_id) {
    const { data: existingLink } = await supabase
      .from("product_activities")
      .select("activity_id")
      .eq("product_id", productId)
      .eq("activity_id", candidate.classification_activity_id)
      .maybeSingle();
    if (!existingLink) {
      await supabase.from("product_activities").insert({
        product_id: productId,
        activity_id: candidate.classification_activity_id,
      });
    }
  }
  if (candidate.classification_status === "classified" && candidate.classification_category_ids.length > 0) {
    const { data: existingLinks } = await supabase
      .from("product_categories")
      .select("category_id")
      .eq("product_id", productId);
    const existingCategoryIds = new Set((existingLinks ?? []).map((l) => l.category_id));
    const newCategoryIds = candidate.classification_category_ids.filter((id) => !existingCategoryIds.has(id));
    if (newCategoryIds.length > 0) {
      await supabase
        .from("product_categories")
        .insert(newCategoryIds.map((category_id) => ({ product_id: productId, category_id })));
    }
  }

  const offerSyncFields: OfferSyncFields = {
    price: primaryOffer.price,
    originalPrice: primaryOffer.originalPrice ?? null,
    currency: primaryOffer.currency,
    affiliateUrl: primaryOffer.affiliateUrl,
    availability: primaryOffer.availability,
    country: primaryOffer.country ?? null,
    shippingInfo: primaryOffer.shippingInfo ?? null,
    commissionRate: primaryOffer.commissionRate ?? null,
  };

  const { data: existingOffer } = await supabase
    .from("offers")
    .select("id, managed_by_automation")
    .eq("product_id", productId)
    .eq("retailer_id", retailerId)
    .maybeSingle();

  let offerId: string;
  if (existingOffer) {
    offerId = existingOffer.id;
    // A human took manual control of this specific offer (actions/offers.ts
    // updateOffer) — approval still links the candidate to it below, but
    // never overwrites the fields they're now responsible for.
    if (existingOffer.managed_by_automation) {
      const { error: offerUpdateError } = await supabase
        .from("offers")
        .update(buildOfferUpdate(offerSyncFields))
        .eq("id", offerId);
      if (offerUpdateError) return { status: "error", message: offerUpdateError.message };
    }
  } else {
    const { data: createdOffer, error: offerCreateError } = await supabase
      .from("offers")
      .insert({
        product_id: productId,
        retailer_id: retailerId,
        affiliate_network_id: candidate.network_id,
        ...buildOfferUpdate(offerSyncFields),
        managed_by_automation: true,
      })
      .select("id")
      .single();
    if (offerCreateError || !createdOffer) {
      return { status: "error", message: offerCreateError?.message ?? "Failed to create the offer." };
    }
    offerId = createdOffer.id;
  }

  const { error: candidateUpdateError } = await supabase
    .from("product_import_sources")
    .update({
      product_id: productId,
      offer_id: offerId,
      approval_status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: adminId,
      rejection_reason: null,
    })
    .eq("id", candidateId);
  if (candidateUpdateError) return { status: "error", message: candidateUpdateError.message };

  return { status: "approved", productId, offerId };
}
