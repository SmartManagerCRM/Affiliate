import { requireAdmin } from "@/lib/supabase/admin-guard";
import { PageHeader } from "@/components/admin/PageHeader";
import { Table, Th, Td, EmptyState } from "@/components/admin/Table";

export default async function AdminClicksPage() {
  const { supabase } = await requireAdmin();
  const { data: clicks } = await supabase
    .from("affiliate_clicks")
    .select(
      "*, product:products(name), offer:offers(retailer:retailers(name)), traffic_source:traffic_sources(name)"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <PageHeader
        title="Affiliate Clicks"
        description="The most recent Buy Now events, most recent first."
      />

      {clicks && clicks.length > 0 ? (
        <Table>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Product</Th>
              <Th>Retailer</Th>
              <Th>Traffic Source</Th>
              <Th>Device</Th>
            </tr>
          </thead>
          <tbody>
            {clicks.map((c) => (
              <tr key={c.id}>
                <Td>{new Date(c.created_at).toLocaleString()}</Td>
                <Td className="font-medium text-espresso">{c.product?.name ?? "—"}</Td>
                <Td>{c.offer?.retailer?.name ?? "—"}</Td>
                <Td>{c.traffic_source?.name ?? "Direct"}</Td>
                <Td>{c.device_type ?? "—"}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <EmptyState>No affiliate clicks yet. They will appear here as visitors use Buy Now.</EmptyState>
      )}
    </div>
  );
}
