import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { PageHeader } from "@/components/admin/PageHeader";
import { Table, Th, Td, EmptyState } from "@/components/admin/Table";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ButtonLink } from "@/components/ui/Button";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { deleteCategory } from "@/actions/categories";

export default async function AdminCategoriesPage() {
  const { supabase } = await requireAdmin();
  const { data: categories } = await supabase
    .from("categories")
    .select("*, activity:activities(name)")
    .order("sort_order", { ascending: true });

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Categories belong to an activity and drive product filtering."
        action={<ButtonLink href="/admin/categories/new">+ Add Category</ButtonLink>}
      />

      {categories && categories.length > 0 ? (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Activity</Th>
              <Th>Slug</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id}>
                <Td className="font-medium text-espresso">{c.name}</Td>
                <Td>{c.activity?.name ?? "—"}</Td>
                <Td>{c.slug}</Td>
                <Td>
                  <StatusBadge status={c.active ? "true" : "false"} />
                </Td>
                <Td>
                  <div className="flex items-center gap-3">
                    <Link href={`/admin/categories/${c.id}`} className="text-sm font-medium text-accent-green">
                      Edit
                    </Link>
                    <form action={deleteCategory}>
                      <input type="hidden" name="id" value={c.id} />
                      <ConfirmSubmitButton
                        confirmMessage={`Delete "${c.name}"?`}
                        className="text-sm font-medium text-red-600"
                      >
                        Delete
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <EmptyState>No categories yet.</EmptyState>
      )}
    </div>
  );
}
