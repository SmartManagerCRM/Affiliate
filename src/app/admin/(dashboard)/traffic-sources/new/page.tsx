import { requireAdmin } from "@/lib/supabase/admin-guard";
import { PageHeader } from "@/components/admin/PageHeader";
import { TrafficSourceForm } from "@/components/admin/TrafficSourceForm";
import { createTrafficSource } from "@/actions/trafficSources";

export default async function NewTrafficSourcePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { supabase } = await requireAdmin();
  const { data: activities } = await supabase.from("activities").select("*").order("sort_order");

  return (
    <div>
      <PageHeader title="New Traffic Source" />
      <TrafficSourceForm activities={activities ?? []} action={createTrafficSource} error={error} />
    </div>
  );
}
