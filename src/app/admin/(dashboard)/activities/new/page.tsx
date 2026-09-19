import { PageHeader } from "@/components/admin/PageHeader";
import { ActivityForm } from "@/components/admin/ActivityForm";
import { createActivity } from "@/actions/activities";

export default async function NewActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div>
      <PageHeader title="New Activity" />
      <ActivityForm action={createActivity} error={error} />
    </div>
  );
}
