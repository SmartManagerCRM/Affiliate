import { requireAdmin } from "@/lib/supabase/admin-guard";
import { PageHeader } from "@/components/admin/PageHeader";
import { AdmitadProgramForm } from "@/components/admin/AdmitadProgramForm";
import { createAdmitadProgramAction } from "@/actions/admitadPrograms";

export default async function NewAdmitadProgramPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  await requireAdmin();

  return (
    <div>
      <PageHeader
        title="Add Admitad Program"
        description="The manual fallback for a program/feed Admitad's API doesn't expose — stored here, never as an environment variable."
      />
      <AdmitadProgramForm action={createAdmitadProgramAction} error={error} />
    </div>
  );
}
