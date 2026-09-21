import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { AdmitadProgramForm } from "@/components/admin/AdmitadProgramForm";
import { getAdmitadProgram } from "@/lib/productAutomation/adapters/admitad/programsStore";
import { updateAdmitadProgramAction } from "@/actions/admitadPrograms";

export default async function EditAdmitadProgramPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { supabase } = await requireAdmin();

  const program = await getAdmitadProgram(supabase, id);
  if (!program) notFound();

  return (
    <div>
      <PageHeader title={`Edit: ${program.advertiserName}`} />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {program.admitadProgramId && <Badge tone="neutral">Admitad ID: {program.admitadProgramId}</Badge>}
        {program.discoveredAt ? <Badge tone="green">Discovered</Badge> : <Badge tone="gold">Added manually</Badge>}
        {program.lastSyncStatus && (
          <Badge tone={program.lastSyncStatus === "completed" ? "green" : "red"}>
            Last sync: {program.lastSyncStatus} {program.lastSyncedAt ? `(${new Date(program.lastSyncedAt).toLocaleString()})` : ""}
          </Badge>
        )}
      </div>
      {program.lastSyncStatus === "failed" && program.lastSyncError && (
        <p className="mb-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{program.lastSyncError}</p>
      )}

      <AdmitadProgramForm program={program} action={updateAdmitadProgramAction.bind(null, id)} error={error} />
    </div>
  );
}
