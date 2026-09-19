import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { PageHeader } from "@/components/admin/PageHeader";
import { Table, Th, Td, EmptyState } from "@/components/admin/Table";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ButtonLink } from "@/components/ui/Button";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { deleteNetwork } from "@/actions/networks";

export default async function AdminNetworksPage() {
  const { supabase } = await requireAdmin();
  const { data: networks } = await supabase.from("affiliate_networks").select("*").order("name");

  return (
    <div>
      <PageHeader
        title="Affiliate Networks"
        description="Networks referenced by offers, e.g. Admitad, CJ."
        action={<ButtonLink href="/admin/networks/new">+ Add Network</ButtonLink>}
      />

      {networks && networks.length > 0 ? (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Notes</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {networks.map((n) => (
              <tr key={n.id}>
                <Td className="font-medium text-espresso">{n.name}</Td>
                <Td>{n.notes ?? "—"}</Td>
                <Td>
                  <StatusBadge status={n.active ? "true" : "false"} />
                </Td>
                <Td>
                  <div className="flex items-center gap-3">
                    <Link href={`/admin/networks/${n.id}`} className="text-sm font-medium text-accent-green">
                      Edit
                    </Link>
                    <form action={deleteNetwork}>
                      <input type="hidden" name="id" value={n.id} />
                      <ConfirmSubmitButton
                        confirmMessage={`Delete "${n.name}"?`}
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
        <EmptyState>No affiliate networks yet.</EmptyState>
      )}
    </div>
  );
}
