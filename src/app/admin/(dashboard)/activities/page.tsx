import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { PageHeader } from "@/components/admin/PageHeader";
import { Table, Th, Td, EmptyState } from "@/components/admin/Table";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ButtonLink } from "@/components/ui/Button";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { deleteActivity } from "@/actions/activities";

export default async function AdminActivitiesPage() {
  const { supabase } = await requireAdmin();
  const { data: activities } = await supabase
    .from("activities")
    .select("*")
    .order("sort_order", { ascending: true });

  return (
    <div>
      <PageHeader
        title="Activities"
        description="The top-level structure of the site — /cafe, /restaurant, etc."
        action={<ButtonLink href="/admin/activities/new">+ Add Activity</ButtonLink>}
      />

      {activities && activities.length > 0 ? (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Slug</Th>
              <Th>Sort</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {activities.map((a) => (
              <tr key={a.id}>
                <Td className="font-medium text-espresso">
                  {a.icon} {a.name}
                </Td>
                <Td>/{a.slug}</Td>
                <Td>{a.sort_order}</Td>
                <Td>
                  <StatusBadge status={a.active ? "true" : "false"} />
                </Td>
                <Td>
                  <div className="flex items-center gap-3">
                    <Link href={`/admin/activities/${a.id}`} className="text-sm font-medium text-accent-green">
                      Edit
                    </Link>
                    <form action={deleteActivity}>
                      <input type="hidden" name="id" value={a.id} />
                      <ConfirmSubmitButton
                        confirmMessage={`Delete "${a.name}"? This cannot be undone.`}
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
        <EmptyState>No activities yet. Create your first one to get started.</EmptyState>
      )}
    </div>
  );
}
