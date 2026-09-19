import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { PageHeader } from "@/components/admin/PageHeader";
import { TrafficSourceForm } from "@/components/admin/TrafficSourceForm";
import { updateTrafficSource } from "@/actions/trafficSources";

export default async function EditTrafficSourcePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { supabase } = await requireAdmin();

  const [{ data: trafficSource }, { data: activities }] = await Promise.all([
    supabase.from("traffic_sources").select("*").eq("id", id).maybeSingle(),
    supabase.from("activities").select("*").order("sort_order"),
  ]);
  if (!trafficSource) notFound();

  return (
    <div>
      <PageHeader title={`Edit: ${trafficSource.name}`} />
      <TrafficSourceForm
        trafficSource={trafficSource}
        activities={activities ?? []}
        action={updateTrafficSource.bind(null, id)}
        error={error}
      />
    </div>
  );
}
