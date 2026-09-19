import { OfferForm } from "@/components/admin/OfferForm";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { createOffer, deleteOffer, toggleOfferActive, updateOffer } from "@/actions/offers";
import { formatPrice } from "@/lib/format";
import type { AffiliateNetwork, Offer, Retailer } from "@/lib/types";

export function OffersSection({
  productId,
  offers,
  retailers,
  networks,
}: {
  productId: string;
  offers: (Offer & { retailer: Retailer | null; network: AffiliateNetwork | null })[];
  retailers: Retailer[];
  networks: AffiliateNetwork[];
}) {
  return (
    <div className="flex flex-col gap-4">
      {retailers.length === 0 && (
        <p className="rounded-lg bg-accent-gold/10 px-3 py-2 text-sm text-accent-gold-dark">
          Add a retailer first before creating offers.
        </p>
      )}

      {offers.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-espresso/10 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-beige/50 text-xs font-semibold uppercase tracking-wide text-espresso/50">
                <th className="px-4 py-3">Retailer</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Network</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((offer) => (
                <tr key={offer.id} className="border-t border-espresso/8">
                  <td className="px-4 py-3 font-medium text-espresso">{offer.retailer?.name ?? "—"}</td>
                  <td className="px-4 py-3">{formatPrice(offer.price, offer.currency)}</td>
                  <td className="px-4 py-3">{offer.network?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={offer.active ? "true" : "false"} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <details className="relative">
                        <summary className="cursor-pointer text-sm font-medium text-accent-green">
                          Edit
                        </summary>
                        <div className="mt-3 rounded-xl border border-espresso/10 bg-beige/30 p-4">
                          <OfferForm
                            offer={offer}
                            retailers={retailers}
                            networks={networks}
                            action={updateOffer.bind(null, offer.id, productId)}
                            submitLabel="Save offer"
                          />
                        </div>
                      </details>
                      <form action={toggleOfferActive}>
                        <input type="hidden" name="id" value={offer.id} />
                        <input type="hidden" name="product_id" value={productId} />
                        <input type="hidden" name="active" value={String(offer.active)} />
                        <button type="submit" className="text-sm font-medium text-espresso/60">
                          {offer.active ? "Deactivate" : "Activate"}
                        </button>
                      </form>
                      <form action={deleteOffer}>
                        <input type="hidden" name="id" value={offer.id} />
                        <input type="hidden" name="product_id" value={productId} />
                        <ConfirmSubmitButton
                          confirmMessage="Delete this offer?"
                          className="text-sm font-medium text-red-600"
                        >
                          Delete
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-espresso/45">No offers yet.</p>
      )}

      {retailers.length > 0 && (
        <details className="rounded-2xl border border-dashed border-espresso/20 bg-beige/30 p-4">
          <summary className="cursor-pointer text-sm font-medium text-espresso">+ Add Offer</summary>
          <div className="mt-4">
            <OfferForm
              retailers={retailers}
              networks={networks}
              action={createOffer.bind(null, productId)}
              submitLabel="Add offer"
            />
          </div>
        </details>
      )}
    </div>
  );
}
