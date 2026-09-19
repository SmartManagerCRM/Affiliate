import { PageHeader } from "@/components/admin/PageHeader";
import { RetailerForm } from "@/components/admin/RetailerForm";
import { createRetailer } from "@/actions/retailers";

export default async function NewRetailerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div>
      <PageHeader title="New Retailer" />
      <RetailerForm action={createRetailer} error={error} />
    </div>
  );
}
