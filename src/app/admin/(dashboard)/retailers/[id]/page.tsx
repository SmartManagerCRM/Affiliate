import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { PageHeader } from "@/components/admin/PageHeader";
import { RetailerForm } from "@/components/admin/RetailerForm";
import { updateRetailer } from "@/actions/retailers";

export default async function EditRetailerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { supabase } = await requireAdmin();
  const { data: retailer } = await supabase.from("retailers").select("*").eq("id", id).maybeSingle();
  if (!retailer) notFound();

  return (
    <div>
      <PageHeader title={`Edit: ${retailer.name}`} />
      <RetailerForm retailer={retailer} action={updateRetailer.bind(null, id)} error={error} />
    </div>
  );
}
