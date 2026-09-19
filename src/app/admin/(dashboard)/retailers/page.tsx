import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { PageHeader } from "@/components/admin/PageHeader";
import { Table, Th, Td, EmptyState } from "@/components/admin/Table";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ButtonLink } from "@/components/ui/Button";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { deleteRetailer } from "@/actions/retailers";

export default async function AdminRetailersPage() {
  const { supabase } = await requireAdmin();
  const { data: retailers } = await supabase.from("retailers").select("*").order("name");

  return (
    <div>
      <PageHeader
        title="Retailers"
        description="Only add a retailer once a real advertiser/affiliate relationship exists."
        action={<ButtonLink href="/admin/retailers/new">+ Add Retailer</ButtonLink>}
      />

      {retailers && retailers.length > 0 ? (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Country</Th>
              <Th>Currency</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {retailers.map((r) => (
              <tr key={r.id}>
                <Td className="font-medium text-espresso">{r.name}</Td>
                <Td>{r.country ?? "—"}</Td>
                <Td>{r.currency ?? "—"}</Td>
                <Td>
                  <StatusBadge status={r.active ? "true" : "false"} />
                </Td>
                <Td>
                  <div className="flex items-center gap-3">
                    <Link href={`/admin/retailers/${r.id}`} className="text-sm font-medium text-accent-green">
                      Edit
                    </Link>
                    <form action={deleteRetailer}>
                      <input type="hidden" name="id" value={r.id} />
                      <ConfirmSubmitButton
                        confirmMessage={`Delete "${r.name}"? Offers from this retailer will also be removed.`}
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
        <EmptyState>No retailers yet.</EmptyState>
      )}
    </div>
  );
}
