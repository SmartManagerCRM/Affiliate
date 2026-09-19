import { Field, TextInput, TextArea, Checkbox } from "@/components/admin/FormField";
import { Button, ButtonLink } from "@/components/ui/Button";
import type { AffiliateNetwork } from "@/lib/types";

export function NetworkForm({
  network,
  action,
  error,
}: {
  network?: AffiliateNetwork;
  action: (formData: FormData) => void;
  error?: string;
}) {
  return (
    <form action={action} className="flex max-w-xl flex-col gap-5">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <Field label="Name" required>
        <TextInput name="name" defaultValue={network?.name} required />
      </Field>
      <Field label="Notes">
        <TextArea name="notes" defaultValue={network?.notes ?? ""} />
      </Field>
      <Checkbox name="active" label="Active" defaultChecked={network?.active ?? true} />
      <div className="mt-2 flex gap-3">
        <Button type="submit">{network ? "Save changes" : "Create network"}</Button>
        <ButtonLink href="/admin/networks" variant="outline">
          Cancel
        </ButtonLink>
      </div>
    </form>
  );
}
