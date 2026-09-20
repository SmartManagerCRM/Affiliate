/**
 * Pure decision logic for approving a staged candidate into a real
 * product. Kept separate from the Supabase orchestration (approveCandidate.ts)
 * so the actual merge policy — the part explicitly required to "never
 * overwrite better existing data with inferior data" — is unit-testable
 * without a database.
 */

export type ExistingProductFields = {
  description: string | null;
  shortDescription: string | null;
  mainImage: string | null;
  brandId: string | null;
};

export type IncomingProductFields = {
  description: string | null;
  shortDescription: string | null;
  mainImage: string | null;
  brandId: string | null;
};

export type ProductFieldUpdate = Partial<{
  description: string;
  shortDescription: string;
  mainImage: string;
  brandId: string;
}>;

/**
 * Conservative gap-filling merge: only ever fills a field that is
 * genuinely empty on the existing product, using the incoming candidate's
 * value. Never overwrites a non-empty existing value — there's no signal
 * here that incoming data is actually better, and an existing non-empty
 * value may be manually curated. Returns only the fields that actually
 * changed, so the caller can skip the update entirely when there's
 * nothing to fill.
 *
 * `name` is deliberately not a param here: products.name is NOT NULL and
 * is always treated as authoritative once a product exists — approving a
 * candidate never renames an existing product.
 */
export function mergeProductFields(
  existing: ExistingProductFields,
  incoming: IncomingProductFields
): ProductFieldUpdate {
  const update: ProductFieldUpdate = {};

  if (!existing.description?.trim() && incoming.description?.trim()) {
    update.description = incoming.description.trim();
  }
  if (!existing.shortDescription?.trim() && incoming.shortDescription?.trim()) {
    update.shortDescription = incoming.shortDescription.trim();
  }
  if (!existing.mainImage?.trim() && incoming.mainImage?.trim()) {
    update.mainImage = incoming.mainImage.trim();
  }
  if (!existing.brandId && incoming.brandId) {
    update.brandId = incoming.brandId;
  }

  return update;
}

/**
 * Which real product (if any) this approval should update rather than
 * duplicate. Priority: a product this exact candidate row was already
 * linked to (re-approving/re-editing) > a confident dedup match against a
 * real product > a dedup match against another candidate that has since
 * itself been approved into a real product (resolved by the caller, since
 * it requires a lookup).
 */
export function resolveTargetProductId(params: {
  ownProductId: string | null;
  dedupMatchProductId: string | null;
  siblingProductId: string | null;
}): string | null {
  return params.ownProductId ?? params.dedupMatchProductId ?? params.siblingProductId ?? null;
}
