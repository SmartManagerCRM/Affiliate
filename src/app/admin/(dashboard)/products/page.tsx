import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { PageHeader } from "@/components/admin/PageHeader";
import { Table, Th, Td, EmptyState } from "@/components/admin/Table";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { deleteProduct } from "@/actions/products";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const { supabase } = await requireAdmin();

  let query = supabase
    .from("products")
    .select("*, brand:brands(name)")
    .order("updated_at", { ascending: false });
  if (q) query = query.ilike("name", `%${q}%`);

  const { data: products } = await query;

  return (
    <div>
      <PageHeader
        title="Products"
        description="Create and manage the product catalog."
        action={<ButtonLink href="/admin/products/new">+ Add Product</ButtonLink>}
      />

      <form className="mb-4 max-w-xs">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search products…"
          className="w-full rounded-full border border-espresso/15 bg-white px-4 py-2 text-sm focus:border-accent-gold focus:outline-none"
        />
      </form>

      {products && products.length > 0 ? (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Brand</Th>
              <Th>Status</Th>
              <Th>Featured</Th>
              <Th>Updated</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <Td className="font-medium text-espresso">
                  {p.name}
                  {p.is_demo && (
                    <span className="ml-2">
                      <Badge tone="neutral">Demo</Badge>
                    </span>
                  )}
                </Td>
                <Td>{p.brand?.name ?? "—"}</Td>
                <Td>
                  <StatusBadge status={p.status} />
                </Td>
                <Td>{p.featured ? "Yes" : "—"}</Td>
                <Td>{new Date(p.updated_at).toLocaleDateString()}</Td>
                <Td>
                  <div className="flex items-center gap-3">
                    <Link href={`/admin/products/${p.id}`} className="text-sm font-medium text-accent-green">
                      Edit
                    </Link>
                    <form action={deleteProduct}>
                      <input type="hidden" name="id" value={p.id} />
                      <ConfirmSubmitButton
                        confirmMessage={`Delete "${p.name}"? This removes its images and offers.`}
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
        <EmptyState>No products yet. Add your first product to get started.</EmptyState>
      )}
    </div>
  );
}
