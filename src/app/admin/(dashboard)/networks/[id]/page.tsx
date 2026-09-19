import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { PageHeader } from "@/components/admin/PageHeader";
import { NetworkForm } from "@/components/admin/NetworkForm";
import { updateNetwork } from "@/actions/networks";

export default async function EditNetworkPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { supabase } = await requireAdmin();
  const { data: network } = await supabase.from("affiliate_networks").select("*").eq("id", id).maybeSingle();
  if (!network) notFound();

  return (
    <div>
      <PageHeader title={`Edit: ${network.name}`} />
      <NetworkForm network={network} action={updateNetwork.bind(null, id)} error={error} />
    </div>
  );
}
