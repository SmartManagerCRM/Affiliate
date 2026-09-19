import { Field, TextInput, TextArea, Select, Checkbox } from "@/components/admin/FormField";
import { Button, ButtonLink } from "@/components/ui/Button";
import { SITE_URL } from "@/lib/constants";
import type { Activity, TrafficSource } from "@/lib/types";

export function TrafficSourceForm({
  trafficSource,
  activities,
  action,
  error,
}: {
  trafficSource?: TrafficSource;
  activities: Activity[];
  action: (formData: FormData) => void;
  error?: string;
}) {
  return (
    <form action={action} className="flex max-w-2xl flex-col gap-5">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <Field label="Client / site name" required>
        <TextInput name="name" defaultValue={trafficSource?.name} required placeholder="Bean & Bite" />
      </Field>
      <Field
        label="Tracking code"
        hint={`Used as ?ref=<code>. Leave blank to auto-generate. Example: ${SITE_URL}/cafe?ref=beanandbite`}
      >
        <TextInput name="tracking_code" defaultValue={trafficSource?.tracking_code} placeholder="beanandbite" />
      </Field>
      <Field label="Primary activity">
        <Select name="activity_id" defaultValue={trafficSource?.activity_id ?? ""}>
          <option value="">None</option>
          {activities.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Client website">
        <TextInput name="website" defaultValue={trafficSource?.website ?? ""} placeholder="https://…" />
      </Field>
      <Field label="Notes">
        <TextArea name="notes" defaultValue={trafficSource?.notes ?? ""} />
      </Field>
      <Checkbox name="active" label="Active" defaultChecked={trafficSource?.active ?? true} />

      <div className="mt-2 flex gap-3">
        <Button type="submit">{trafficSource ? "Save changes" : "Create traffic source"}</Button>
        <ButtonLink href="/admin/traffic-sources" variant="outline">
          Cancel
        </ButtonLink>
      </div>
    </form>
  );
}
