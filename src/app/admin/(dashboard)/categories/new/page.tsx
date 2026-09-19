import { requireAdmin } from "@/lib/supabase/admin-guard";
import { PageHeader } from "@/components/admin/PageHeader";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { createCategory } from "@/actions/categories";

export default async function NewCategoryPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { supabase } = await requireAdmin();
  const { data: activities } = await supabase.from("activities").select("*").order("sort_order");

  return (
    <div>
      <PageHeader title="New Category" />
      <CategoryForm activities={activities ?? []} action={createCategory} error={error} />
    </div>
  );
}
