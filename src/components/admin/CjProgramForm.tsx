import { Field, TextInput, Checkbox } from "@/components/admin/FormField";
import { Button, ButtonLink } from "@/components/ui/Button";

const BASE_PATH = "/admin/product-automation/cj-programs";

export function CjProgramForm({
  action,
  error,
}: {
  action: (formData: FormData) => void;
  error?: string;
}) {
  return (
    <form action={action} className="flex max-w-2xl flex-col gap-5">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <Field label="CJ Advertiser ID" required hint="The numeric advertiser id (AID) from your CJ account.">
        <TextInput name="cj_advertiser_id" required placeholder="1234567" />
      </Field>

      <Field label="Advertiser name" required>
        <TextInput name="advertiser_name" required placeholder="Acme Store" />
      </Field>

      <Field label="Program URL" hint="Optional — the advertiser's affiliate program page.">
        <TextInput name="program_url" placeholder="https://…" />
      </Field>

      <Checkbox name="active" label="Enabled" defaultChecked={false} />

      <div className="mt-2 flex gap-3">
        <Button type="submit">Add advertiser</Button>
        <ButtonLink href={BASE_PATH} variant="outline">
          Cancel
        </ButtonLink>
      </div>
    </form>
  );
}
