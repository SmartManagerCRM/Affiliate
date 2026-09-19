import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { PageHeader } from "@/components/admin/PageHeader";
import { ActivityForm } from "@/components/admin/ActivityForm";
import { updateActivity } from "@/actions/activities";

export default async function EditActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { supabase } = await requireAdmin();

  const { data: activity } = await supabase.from("activities").select("*").eq("id", id).maybeSingle();
  if (!activity) notFound();

  return (
    <div>
      <PageHeader title={`Edit: ${activity.name}`} />
      <ActivityForm activity={activity} action={updateActivity.bind(null, id)} error={error} />
    </div>
  );
}
