import { Field, TextInput, TextArea, Checkbox } from "@/components/admin/FormField";
import { Button, ButtonLink } from "@/components/ui/Button";
import type { Retailer } from "@/lib/types";

export function RetailerForm({
  retailer,
  action,
  error,
}: {
  retailer?: Retailer;
  action: (formData: FormData) => void;
  error?: string;
}) {
  return (
    <form action={action} className="flex max-w-2xl flex-col gap-5">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <Field label="Name" required>
        <TextInput name="name" defaultValue={retailer?.name} required />
      </Field>
      <Field label="Slug" hint="Leave blank to auto-generate.">
        <TextInput name="slug" defaultValue={retailer?.slug} />
      </Field>
      <Field label="Logo URL">
        <TextInput name="logo" defaultValue={retailer?.logo ?? ""} placeholder="https://…" />
      </Field>
      <Field label="Website">
        <TextInput name="website" defaultValue={retailer?.website ?? ""} placeholder="https://…" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Country" hint="e.g. Saudi Arabia">
          <TextInput name="country" defaultValue={retailer?.country ?? ""} />
        </Field>
        <Field label="Currency" hint="e.g. SAR">
          <TextInput name="currency" defaultValue={retailer?.currency ?? ""} />
        </Field>
      </div>
      <Field label="Description">
        <TextArea name="description" defaultValue={retailer?.description ?? ""} />
      </Field>
      <Checkbox name="active" label="Active" defaultChecked={retailer?.active ?? true} />

      <div className="mt-2 flex gap-3">
        <Button type="submit">{retailer ? "Save changes" : "Create retailer"}</Button>
        <ButtonLink href="/admin/retailers" variant="outline">
          Cancel
        </ButtonLink>
      </div>
    </form>
  );
}
