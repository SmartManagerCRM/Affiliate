import { PageHeader } from "@/components/admin/PageHeader";
import { ProductBasicsForm } from "@/components/admin/ProductBasicsForm";
import { createProduct } from "@/actions/products";

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="New Product"
        description="Start with the basics — you can add images, offers and categories after creating it."
      />
      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <ProductBasicsForm action={createProduct} />
    </div>
  );
}
