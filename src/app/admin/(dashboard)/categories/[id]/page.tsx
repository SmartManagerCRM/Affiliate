import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { PageHeader } from "@/components/admin/PageHeader";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { updateCategory } from "@/actions/categories";

export default async function EditCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { supabase } = await requireAdmin();

  const [{ data: category }, { data: activities }] = await Promise.all([
    supabase.from("categories").select("*").eq("id", id).maybeSingle(),
    supabase.from("activities").select("*").order("sort_order"),
  ]);
  if (!category) notFound();

  return (
    <div>
      <PageHeader title={`Edit: ${category.name}`} />
      <CategoryForm
        category={category}
        activities={activities ?? []}
        action={updateCategory.bind(null, id)}
        error={error}
      />
    </div>
  );
}
