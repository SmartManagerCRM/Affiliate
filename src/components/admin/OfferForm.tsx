import { Field, TextInput, Select, Checkbox } from "@/components/admin/FormField";
import { Button } from "@/components/ui/Button";
import type { AffiliateNetwork, Offer, Retailer } from "@/lib/types";

export function OfferForm({
  offer,
  retailers,
  networks,
  action,
  submitLabel,
}: {
  offer?: Offer;
  retailers: Retailer[];
  networks: AffiliateNetwork[];
  action: (formData: FormData) => void;
  submitLabel: string;
}) {
  return (
    <form action={action} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="Retailer" required>
        <Select name="retailer_id" defaultValue={offer?.retailer_id} required>
          <option value="">Select retailer…</option>
          {retailers.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Affiliate network">
        <Select name="affiliate_network_id" defaultValue={offer?.affiliate_network_id ?? ""}>
          <option value="">None</option>
          {networks.map((n) => (
            <option key={n.id} value={n.id}>
              {n.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Country">
        <TextInput name="country" defaultValue={offer?.country ?? ""} placeholder="Saudi Arabia" />
      </Field>

      <Field label="Price" required>
        <TextInput type="number" step="0.01" min="0" name="price" defaultValue={offer?.price} required />
      </Field>
      <Field label="Original price" hint="Optional, to show a discount.">
        <TextInput type="number" step="0.01" min="0" name="original_price" defaultValue={offer?.original_price ?? ""} />
      </Field>
      <Field label="Currency" required>
        <TextInput name="currency" defaultValue={offer?.currency} placeholder="SAR" required maxLength={3} />
      </Field>

      <Field label="Affiliate URL" required>
        <TextInput
          type="url"
          name="affiliate_url"
          defaultValue={offer?.affiliate_url}
          placeholder="https://retailer.com/product?aff=…"
          required
        />
      </Field>
      <Field label="Availability">
        <Select name="availability" defaultValue={offer?.availability ?? "in_stock"}>
          <option value="in_stock">In stock</option>
          <option value="limited">Limited</option>
          <option value="out_of_stock">Out of stock</option>
          <option value="preorder">Preorder</option>
        </Select>
      </Field>
      <Field label="Shipping info">
        <TextInput name="shipping_info" defaultValue={offer?.shipping_info ?? ""} placeholder="Free shipping" />
      </Field>

      <Field label="Commission rate %" hint="Internal only — never shown publicly.">
        <TextInput type="number" step="0.01" min="0" name="commission_rate" defaultValue={offer?.commission_rate ?? ""} />
      </Field>
      <Field label="Priority" hint="Higher shows first when multiple offers tie on price.">
        <TextInput type="number" name="priority" defaultValue={offer?.priority ?? 0} />
      </Field>
      <div className="flex items-end pb-2.5">
        <Checkbox name="active" label="Active" defaultChecked={offer?.active ?? true} />
      </div>

      <div className="sm:col-span-2 lg:col-span-3">
        <Button type="submit" size="sm">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
