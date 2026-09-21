import { requireAdmin } from "@/lib/supabase/admin-guard";
import { PageHeader } from "@/components/admin/PageHeader";
import { CjProgramForm } from "@/components/admin/CjProgramForm";
import { createCjProgramAction } from "@/actions/cjPrograms";

export default async function NewCjProgramPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  await requireAdmin();

  return (
    <div>
      <PageHeader
        title="Add CJ Advertiser"
        description="The manual fallback for an advertiser relationship discovery doesn't surface — stored here, never as an environment variable."
      />
      <CjProgramForm action={createCjProgramAction} error={error} />
    </div>
  );
}
