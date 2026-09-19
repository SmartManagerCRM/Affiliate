import { requireAdmin } from "@/lib/supabase/admin-guard";
import { PageHeader } from "@/components/admin/PageHeader";
import { Field, TextInput, TextArea } from "@/components/admin/FormField";
import { Button } from "@/components/ui/Button";
import { updateSettings } from "@/actions/settings";
import { AFFILIATE_DISCLOSURE, SITE_NAME, SITE_TAGLINE } from "@/lib/constants";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  const { supabase, admin } = await requireAdmin();
  const { data: rows } = await supabase.from("site_settings").select("key, value");
  const settings = Object.fromEntries((rows ?? []).map((r) => [r.key, r.value as string]));

  return (
    <div className="max-w-xl">
      <PageHeader title="Settings" description="Site-wide content settings." />

      {saved && (
        <p className="mb-4 rounded-lg bg-accent-green/10 px-3 py-2 text-sm text-accent-green-dark">
          Settings saved.
        </p>
      )}

      <form action={updateSettings} className="flex flex-col gap-5">
        <Field label="Site name">
          <TextInput name="site_name" defaultValue={settings.site_name ?? SITE_NAME} />
        </Field>
        <Field label="Tagline">
          <TextInput name="tagline" defaultValue={settings.tagline ?? SITE_TAGLINE} />
        </Field>
        <Field label="Affiliate disclosure">
          <TextArea
            name="affiliate_disclosure"
            defaultValue={settings.affiliate_disclosure ?? AFFILIATE_DISCLOSURE}
          />
        </Field>
        <Field label="Contact email">
          <TextInput type="email" name="contact_email" defaultValue={settings.contact_email ?? ""} />
        </Field>
        <div>
          <Button type="submit">Save settings</Button>
        </div>
      </form>

      <div className="mt-10 rounded-2xl border border-espresso/10 bg-beige/40 p-5">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-espresso/45">
          Signed in as
        </h2>
        <p className="text-sm text-espresso">{admin.full_name || admin.email}</p>
        <p className="text-xs text-espresso/50">{admin.email} · {admin.role}</p>
      </div>
    </div>
  );
}
