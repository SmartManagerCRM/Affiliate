import { PageHeader } from "@/components/admin/PageHeader";
import { NetworkForm } from "@/components/admin/NetworkForm";
import { createNetwork } from "@/actions/networks";

export default async function NewNetworkPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div>
      <PageHeader title="New Affiliate Network" />
      <NetworkForm action={createNetwork} error={error} />
    </div>
  );
}
