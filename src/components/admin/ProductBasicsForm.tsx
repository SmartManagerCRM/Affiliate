import { Field, TextInput, TextArea, Select, Checkbox } from "@/components/admin/FormField";
import { Button } from "@/components/ui/Button";
import type { Product } from "@/lib/types";

export function ProductBasicsForm({
  product,
  brandName,
  action,
}: {
  product?: Product;
  brandName?: string;
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Product name" required>
          <TextInput name="name" defaultValue={product?.name} required />
        </Field>
        <Field label="Brand" hint="Type a brand name — created automatically if new.">
          <TextInput name="brand_name" defaultValue={brandName} />
        </Field>
      </div>

      <Field label="Slug" hint="Leave blank to auto-generate from name.">
        <TextInput name="slug" defaultValue={product?.slug} />
      </Field>

      <Field label="Short description" hint="Shown on product cards.">
        <TextArea name="short_description" defaultValue={product?.short_description ?? ""} maxLength={200} />
      </Field>

      <Field label="Full description">
        <TextArea
          name="description"
          defaultValue={product?.description ?? ""}
          className="min-h-40"
        />
      </Field>

      <Field label="Tags" hint="Comma-separated, e.g. espresso, compact, home">
        <TextInput name="tags" defaultValue={product?.tags?.join(", ") ?? ""} />
      </Field>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Status" required>
          <Select name="status" defaultValue={product?.status ?? "draft"}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="inactive">Inactive</option>
          </Select>
        </Field>
        <div className="flex items-end pb-2.5">
          <Checkbox name="featured" label="Featured product" defaultChecked={product?.featured ?? false} />
        </div>
      </div>

      <div className="rounded-2xl border border-espresso/10 bg-beige/40 p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-espresso/45">SEO</h3>
        <div className="flex flex-col gap-4">
          <Field label="SEO title">
            <TextInput name="seo_title" defaultValue={product?.seo_title ?? ""} />
          </Field>
          <Field label="SEO description">
            <TextArea name="seo_description" defaultValue={product?.seo_description ?? ""} />
          </Field>
        </div>
      </div>

      <div>
        <Button type="submit">{product ? "Save changes" : "Create product"}</Button>
      </div>
    </form>
  );
}
