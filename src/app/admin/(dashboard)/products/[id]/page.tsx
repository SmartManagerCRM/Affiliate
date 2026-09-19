import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { PageHeader } from "@/components/admin/PageHeader";
import { ProductBasicsForm } from "@/components/admin/ProductBasicsForm";
import { ProductImageGrid } from "@/components/admin/ProductImageGrid";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { ProductTaxonomyForm } from "@/components/admin/ProductTaxonomyForm";
import { OffersSection } from "@/components/admin/OffersSection";
import { updateProductBasics, updateProductTaxonomy } from "@/actions/products";

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id } = await params;
  const { error, saved } = await searchParams;
  const { supabase } = await requireAdmin();

  const [
    { data: product },
    { data: images },
    { data: activities },
    { data: categories },
    { data: productActivities },
    { data: productCategories },
    { data: offers },
    { data: retailers },
    { data: networks },
  ] = await Promise.all([
    supabase.from("products").select("*, brand:brands(name)").eq("id", id).maybeSingle(),
    supabase.from("product_images").select("*").eq("product_id", id).order("sort_order"),
    supabase.from("activities").select("*").order("sort_order"),
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("product_activities").select("activity_id").eq("product_id", id),
    supabase.from("product_categories").select("category_id").eq("product_id", id),
    supabase.from("offers").select("*, retailer:retailers(*), network:affiliate_networks(*)").eq("product_id", id).order("priority", { ascending: false }),
    supabase.from("retailers").select("*").eq("active", true).order("name"),
    supabase.from("affiliate_networks").select("*").eq("active", true).order("name"),
  ]);

  if (!product) notFound();

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={product.name}
        description="Manage this product's details, images, categories and offers."
        action={
          <Link href="/admin/products" className="text-sm font-medium text-espresso/60">
            ← Back to products
          </Link>
        }
      />

      {saved && (
        <p className="mb-4 rounded-lg bg-accent-green/10 px-3 py-2 text-sm text-accent-green-dark">
          Saved.
        </p>
      )}
      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <Section title="1. Basic Information">
        <ProductBasicsForm
          product={product}
          brandName={product.brand?.name}
          action={updateProductBasics.bind(null, id)}
        />
      </Section>

      <Section title="2. Images">
        <ProductImageGrid images={images ?? []} productId={id} />
        <div className="mt-4">
          <ImageUploader productId={id} />
        </div>
      </Section>

      <Section title="3. Activities & Categories">
        <ProductTaxonomyForm
          activities={activities ?? []}
          categories={categories ?? []}
          selectedActivityIds={(productActivities ?? []).map((r) => r.activity_id)}
          selectedCategoryIds={(productCategories ?? []).map((r) => r.category_id)}
          action={updateProductTaxonomy.bind(null, id)}
        />
      </Section>

      <Section title="4. Offers">
        <OffersSection
          productId={id}
          offers={offers ?? []}
          retailers={retailers ?? []}
          networks={networks ?? []}
        />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10 rounded-2xl border border-espresso/10 bg-white p-5 shadow-[var(--shadow-card)] sm:p-7">
      <h2 className="mb-5 font-serif-display text-lg font-semibold text-espresso">{title}</h2>
      {children}
    </div>
  );
}
