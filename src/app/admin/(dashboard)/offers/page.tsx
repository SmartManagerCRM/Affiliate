import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { PageHeader } from "@/components/admin/PageHeader";
import { Table, Th, Td, EmptyState } from "@/components/admin/Table";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatPrice } from "@/lib/format";

export default async function AdminOffersPage() {
  const { supabase } = await requireAdmin();
  const { data: offers } = await supabase
    .from("offers")
    .select("*, product:products(id, name), retailer:retailers(name), network:affiliate_networks(name)")
    .order("last_updated", { ascending: false })
    .limit(200);

  return (
    <div>
      <PageHeader
        title="Offers"
        description="All offers across every product. Open a product to add or edit its offers."
      />

      {offers && offers.length > 0 ? (
        <Table>
          <thead>
            <tr>
              <Th>Product</Th>
              <Th>Retailer</Th>
              <Th>Price</Th>
              <Th>Network</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {offers.map((o) => (
              <tr key={o.id}>
                <Td className="font-medium text-espresso">
                  {o.product ? (
                    <Link href={`/admin/products/${o.product.id}`} className="hover:text-accent-green">
                      {o.product.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </Td>
                <Td>{o.retailer?.name ?? "—"}</Td>
                <Td>{formatPrice(o.price, o.currency)}</Td>
                <Td>{o.network?.name ?? "—"}</Td>
                <Td>
                  <StatusBadge status={o.active ? "true" : "false"} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <EmptyState>No offers yet. Add offers from a product&apos;s edit page.</EmptyState>
      )}
    </div>
  );
}
