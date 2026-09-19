import { Field, TextInput, TextArea, Checkbox } from "@/components/admin/FormField";
import { Button, ButtonLink } from "@/components/ui/Button";
import type { Activity } from "@/lib/types";

export function ActivityForm({
  activity,
  action,
  error,
}: {
  activity?: Activity;
  action: (formData: FormData) => void;
  error?: string;
}) {
  return (
    <form action={action} className="flex max-w-2xl flex-col gap-5">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <Field label="Name" required>
        <TextInput name="name" defaultValue={activity?.name} required />
      </Field>
      <Field label="Slug" hint="Clean ASCII URL slug, e.g. cafe, restaurant, salon-spa. Leave blank to auto-generate.">
        <TextInput name="slug" defaultValue={activity?.slug} placeholder="cafe" />
      </Field>
      <Field label="Description">
        <TextArea name="description" defaultValue={activity?.description ?? ""} />
      </Field>
      <Field label="Icon" hint="A single emoji or short glyph, e.g. ☕">
        <TextInput name="icon" defaultValue={activity?.icon ?? ""} />
      </Field>
      <Field label="Sort order">
        <TextInput type="number" name="sort_order" defaultValue={activity?.sort_order ?? 0} />
      </Field>
      <Field label="SEO Title">
        <TextInput name="seo_title" defaultValue={activity?.seo_title ?? ""} />
      </Field>
      <Field label="SEO Description">
        <TextArea name="seo_description" defaultValue={activity?.seo_description ?? ""} />
      </Field>
      <Checkbox name="active" label="Active (visible on public site)" defaultChecked={activity?.active ?? true} />

      <div className="mt-2 flex gap-3">
        <Button type="submit">{activity ? "Save changes" : "Create activity"}</Button>
        <ButtonLink href="/admin/activities" variant="outline">
          Cancel
        </ButtonLink>
      </div>
    </form>
  );
}
