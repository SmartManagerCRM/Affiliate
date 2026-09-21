import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { mergeProductFields } from "../review/mergeProduct";
import { buildOfferUpdate, type OfferSyncFields } from "../review/offerSync";
import { resolveBrandId } from "../review/productWriters";
import { rehostImage } from "../review/imageHosting";
import type { NormalizedProduct } from "../types";

type SupabaseAdmin = Awaited<ReturnType<typeof createClient>>;

export type AutoUpdateSummary = {
  candidatesChecked: number;
  offersUpdated: number;
  offersSkippedManual: number;
  productsUpdated: number;
  errors: number;
};

const DEFAULT_BATCH_LIMIT = 200;

/** error_type values this engine writes to product_import_errors — kept as constants so the write and any later read/filter can't drift apart. */
export const AUTO_UPDATE_OFFER_ERROR = "auto_update_offer_failed";
export const AUTO_UPDATE_PRODUCT_ERROR = "auto_update_product_failed";
export const AUTO_UPDATE_ERROR_TYPES = [AUTO_UPDATE_OFFER_ERROR, AUTO_UPDATE_PRODUCT_ERROR] as const;

async function logAutoUpdateError(
  supabase: SupabaseAdmin,
  errorType: string,
  errorMessage: string,
  context: { candidateId: string; productId: string; offerId: string }
) {
  await supabase.from("product_import_errors").insert({
    sync_run_id: null,
    network_id: null,
    external_id: context.candidateId,
    error_type: errorType,
    error_message: errorMessage,
    raw_data: context as never,
  });
}

/**
 * Propagates fresh feed data to already-approved products/offers, without
 * ever requiring a human to click Approve again. This is the "Automatic
 * Product/Offer Updates" pipeline stage — it runs after every sync, over
 * every approved candidate whose staged row changed since it was last
 * propagated (product_import_sources.updated_at newer than the linked
 * offer's last_updated).
 *
 * Source-priority: an offer only gets refreshed while
 * offers.managed_by_automation is true. The moment a human edits an offer
 * directly (actions/offers.ts updateOffer), that flag flips to false and
 * this pass leaves it alone from then on — a manually-curated price is
 * never silently overwritten. Product-level fields go through the exact
 * same conservative gap-fill (mergeProductFields) Phase 6 approval uses:
 * only ever fills a field that is currently empty.
 *
 * "Mark unavailable rather than delete": when the feed reports
 * out_of_stock, the offer's `active` flag is set to false — the row (and
 * every affiliate_clicks row referencing it) is never touched by a
 * DELETE anywhere in this file. Recovery (back in stock) re-activates it
 * the same way, via the same buildOfferUpdate mapping.
 *
 * Known scope limit: this only reacts to a candidate that was actually
 * re-synced (its own row changed). A product that silently disappears
 * from the network's feed entirely (never re-seen at all) isn't detected
 * here — that needs a "last seen" sweep, which fits better once Phase 8
 * formalizes scheduled sync semantics.
 */
export async function autoUpdateApprovedProducts(
  supabase: SupabaseAdmin,
  options: { limit?: number } = {}
): Promise<AutoUpdateSummary> {
  const { data: candidates, error } = await supabase
    .from("product_import_sources")
    .select("id, product_id, offer_id, normalized_data, updated_at")
    .eq("approval_status", "approved")
    .not("product_id", "is", null)
    .not("offer_id", "is", null)
    .order("updated_at", { ascending: false })
    .limit(options.limit ?? DEFAULT_BATCH_LIMIT);

  if (error) throw new Error(error.message);

  let offersUpdated = 0;
  let offersSkippedManual = 0;
  let productsUpdated = 0;
  let errors = 0;

  for (const candidate of candidates ?? []) {
    const productId = candidate.product_id;
    const offerId = candidate.offer_id;
    if (!productId || !offerId) continue;

    const product = candidate.normalized_data as unknown as NormalizedProduct;
    const primaryOffer = product.offers?.[0];
    if (!primaryOffer) continue;

    const { data: offer } = await supabase
      .from("offers")
      .select("last_updated, managed_by_automation")
      .eq("id", offerId)
      .maybeSingle();
    if (!offer) continue;

    // Nothing changed since this offer was last synced — skip the write.
    if (new Date(candidate.updated_at).getTime() <= new Date(offer.last_updated).getTime()) continue;

    if (!offer.managed_by_automation) {
      offersSkippedManual += 1;
      continue;
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
    const { error: offerUpdateError } = await supabase
      .from("offers")
      .update(buildOfferUpdate(offerSyncFields))
      .eq("id", offerId);
    if (offerUpdateError) {
      errors += 1;
      await logAutoUpdateError(supabase, AUTO_UPDATE_OFFER_ERROR, offerUpdateError.message, {
        candidateId: candidate.id,
        productId,
        offerId,
      });
    } else {
      offersUpdated += 1;
    }

    const { data: existingProduct } = await supabase
      .from("products")
      .select("description, short_description, main_image, brand_id")
      .eq("id", productId)
      .maybeSingle();
    if (!existingProduct) continue;

    const brandId = existingProduct.brand_id ?? (await resolveBrandId(supabase, product.brand));
    // Only actually fetch/re-host the feed's image when it would be used —
    // mergeProductFields gap-fills mainImage alone, so there's no point
    // downloading it on every re-sync tick for a product that already has one.
    const candidateMainImage =
      !existingProduct.main_image && product.images[0]
        ? await rehostImage(supabase, product.images[0], candidate.id)
        : (product.images[0] ?? null);
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
        mainImage: candidateMainImage,
        brandId,
      }
    );

    if (Object.keys(fieldUpdate).length > 0) {
      const { error: productUpdateError } = await supabase
        .from("products")
        .update({
          ...(fieldUpdate.description !== undefined && { description: fieldUpdate.description }),
          ...(fieldUpdate.shortDescription !== undefined && { short_description: fieldUpdate.shortDescription }),
          ...(fieldUpdate.mainImage !== undefined && { main_image: fieldUpdate.mainImage }),
          ...(fieldUpdate.brandId !== undefined && { brand_id: fieldUpdate.brandId }),
        })
        .eq("id", productId);
      if (productUpdateError) {
        errors += 1;
        await logAutoUpdateError(supabase, AUTO_UPDATE_PRODUCT_ERROR, productUpdateError.message, {
          candidateId: candidate.id,
          productId,
          offerId,
        });
      } else {
        productsUpdated += 1;
      }
    }
  }

  return {
    candidatesChecked: (candidates ?? []).length,
    offersUpdated,
    offersSkippedManual,
    productsUpdated,
    errors,
  };
}
