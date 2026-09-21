import { Field, TextInput, Select, Checkbox } from "@/components/admin/FormField";
import { Button, ButtonLink } from "@/components/ui/Button";
import type { AdmitadProgram } from "@/lib/productAutomation/adapters/admitad/programsStore";

const BASE_PATH = "/admin/product-automation/admitad-programs";

export function AdmitadProgramForm({
  program,
  action,
  error,
}: {
  program?: AdmitadProgram;
  action: (formData: FormData) => void;
  error?: string;
}) {
  return (
    <form action={action} className="flex max-w-2xl flex-col gap-5">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <Field label="Advertiser name" required>
        <TextInput name="advertiser_name" defaultValue={program?.advertiserName} required placeholder="Acme Store" />
      </Field>

      <Field label="Country" hint="ISO country code, e.g. AE, SA — optional.">
        <TextInput name="country" defaultValue={program?.country ?? ""} placeholder="AE" />
      </Field>

      <Field
        label="Feed URL"
        hint="This program's Product Feed export URL from Admitad. Required for this program to actually sync — stored here, never as a Hostinger environment variable."
      >
        <TextInput name="feed_url" defaultValue={program?.feedUrl ?? ""} placeholder="https://…" />
      </Field>

      <Field label="Feed ID" hint="Admitad's own feed identifier, if known — optional, for reference only.">
        <TextInput name="feed_id" defaultValue={program?.feedId ?? ""} />
      </Field>

      <Field label="Feed format">
        <Select name="feed_format" defaultValue={program?.feedFormat ?? "csv"}>
          <option value="csv">CSV</option>
          <option value="xml">XML (not yet parsed — sync will report an error until support is added)</option>
          <option value="json">JSON (not yet parsed — sync will report an error until support is added)</option>
        </Select>
      </Field>

      <Checkbox name="active" label="Active — include in every sync" defaultChecked={program?.active ?? true} />

      <div className="mt-2 flex gap-3">
        <Button type="submit">{program ? "Save changes" : "Add program"}</Button>
        <ButtonLink href={BASE_PATH} variant="outline">
          Cancel
        </ButtonLink>
      </div>
    </form>
  );
}
