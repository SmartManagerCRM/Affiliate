import { Field, TextInput, TextArea, Select, Checkbox } from "@/components/admin/FormField";
import { TranslationFields } from "@/components/admin/TranslationFields";
import { Button, ButtonLink } from "@/components/ui/Button";
import type { Activity, Category } from "@/lib/types";

export function CategoryForm({
  category,
  activities,
  action,
  error,
}: {
  category?: Category;
  activities: Activity[];
  action: (formData: FormData) => void;
  error?: string;
}) {
  return (
    <form action={action} className="flex max-w-2xl flex-col gap-5">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <Field label="Activity" required>
        <Select name="activity_id" defaultValue={category?.activity_id} required>
          <option value="">Select an activity…</option>
          {activities.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Name" required>
        <TextInput name="name" defaultValue={category?.name} required />
      </Field>
      <Field label="Slug" hint="Leave blank to auto-generate from name.">
        <TextInput name="slug" defaultValue={category?.slug} />
      </Field>
      <Field label="Description">
        <TextArea name="description" defaultValue={category?.description ?? ""} />
      </Field>
      <Field label="Sort order">
        <TextInput type="number" name="sort_order" defaultValue={category?.sort_order ?? 0} />
      </Field>
      <Checkbox name="active" label="Active (visible on public site)" defaultChecked={category?.active ?? true} />

      <TranslationFields
        translations={category?.translations}
        fields={[
          { name: "name", label: "Name" },
          { name: "description", label: "Description", multiline: true },
        ]}
      />

      <div className="mt-2 flex gap-3">
        <Button type="submit">{category ? "Save changes" : "Create category"}</Button>
        <ButtonLink href="/admin/categories" variant="outline">
          Cancel
        </ButtonLink>
      </div>
    </form>
  );
}
