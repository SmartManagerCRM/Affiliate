import "server-only";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import type {
  Activity,
  Brand,
  Category,
  OfferPublic,
  ProductCardData,
  ProductFilters,
  ProductWithMeta,
  Retailer,
} from "@/lib/types";

export const getActivities = cache(async (): Promise<Activity[]> => {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("activities")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  return data ?? [];
});

export const getActivityBySlug = cache(
  async (slug: string): Promise<Activity | null> => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("activities")
      .select("*")
      .eq("slug", slug)
      .eq("active", true)
      .maybeSingle();
    return data;
  }
);

export const getCategoriesForActivity = cache(
  async (activityId: string): Promise<Category[]> => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("categories")
      .select("*")
      .eq("activity_id", activityId)
      .eq("active", true)
      .order("sort_order", { ascending: true });
    return data ?? [];
  }
);

async function attachOffers(
  products: (ProductCardData & { [key: string]: unknown })[]
): Promise<ProductCardData[]> {
  const supabase = createPublicClient();
  const ids = products.map((p) => p.id);
  if (ids.length === 0) return products as ProductCardData[];

  const { data: offers } = await supabase
    .from("offers_public")
    .select("*")
    .in("product_id", ids)
    .order("priority", { ascending: false })
    .order("price", { ascending: true });

  const byProduct = new Map<string, OfferPublic[]>();
  (offers ?? []).forEach((offer) => {
    if (!offer.product_id) return;
    const list = byProduct.get(offer.product_id) ?? [];
    list.push(offer);
    byProduct.set(offer.product_id, list);
  });

  return products.map((p) => ({
    ...(p as ProductCardData),
    offers: byProduct.get(p.id) ?? [],
  }));
}

export const getFeaturedProducts = cache(
  async (limit = 8): Promise<ProductCardData[]> => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("products")
      .select("*, brand:brands(*)")
      .eq("status", "published")
      .eq("featured", true)
      .order("updated_at", { ascending: false })
      .limit(limit);

    return attachOffers((data ?? []) as ProductCardData[]);
  }
);

export async function getProducts(
  filters: ProductFilters
): Promise<ProductCardData[]> {
  const supabase = createPublicClient();

  let productIdsFromCategory: string[] | null = null;
  if (filters.categorySlug && filters.activitySlug) {
    const activity = await getActivityBySlug(filters.activitySlug);
    if (!activity) return [];
    const { data: category } = await supabase
      .from("categories")
      .select("id")
      .eq("activity_id", activity.id)
      .eq("slug", filters.categorySlug)
      .maybeSingle();
    if (!category) return [];
    const { data: rows } = await supabase
      .from("product_categories")
      .select("product_id")
      .eq("category_id", category.id);
    productIdsFromCategory = (rows ?? []).map((r) => r.product_id);
    if (productIdsFromCategory.length === 0) return [];
  }

  let productIdsFromActivity: string[] | null = null;
  if (filters.activitySlug && !filters.categorySlug) {
    const activity = await getActivityBySlug(filters.activitySlug);
    if (!activity) return [];
    const { data: rows } = await supabase
      .from("product_activities")
      .select("product_id")
      .eq("activity_id", activity.id);
    productIdsFromActivity = (rows ?? []).map((r) => r.product_id);
    if (productIdsFromActivity.length === 0) return [];
  }

  let query = supabase
    .from("products")
    .select("*, brand:brands(*)")
    .eq("status", "published");

  const idFilter = productIdsFromCategory ?? productIdsFromActivity;
  if (idFilter) query = query.in("id", idFilter);

  if (filters.brandSlug) {
    const { data: brand } = await supabase
      .from("brands")
      .select("id")
      .eq("slug", filters.brandSlug)
      .maybeSingle();
    if (!brand) return [];
    query = query.eq("brand_id", brand.id);
  }

  switch (filters.sort) {
    case "newest":
      query = query.order("created_at", { ascending: false });
      break;
    case "featured":
    default:
      query = query
        .order("featured", { ascending: false })
        .order("updated_at", { ascending: false });
      break;
  }

  const { data } = await query;
  let products = await attachOffers((data ?? []) as ProductCardData[]);

  if (filters.retailerSlug) {
    products = products.filter((p) =>
      p.offers.some((o) => o.retailer_slug === filters.retailerSlug)
    );
  }
  if (filters.country) {
    products = products.filter((p) =>
      p.offers.some((o) => o.country === filters.country)
    );
  }
  if (filters.availability) {
    products = products.filter((p) =>
      p.offers.some((o) => o.availability === filters.availability)
    );
  }
  if (typeof filters.priceMin === "number") {
    products = products.filter((p) =>
      p.offers.some((o) => (o.price ?? 0) >= (filters.priceMin ?? 0))
    );
  }
  if (typeof filters.priceMax === "number") {
    products = products.filter((p) =>
      p.offers.some((o) => (o.price ?? Infinity) <= (filters.priceMax ?? Infinity))
    );
  }

  const minPrice = (p: ProductCardData) =>
    p.offers.length ? Math.min(...p.offers.map((o) => o.price ?? Infinity)) : Infinity;

  if (filters.sort === "price_asc") {
    products = [...products].sort((a, b) => minPrice(a) - minPrice(b));
  } else if (filters.sort === "price_desc") {
    products = [...products].sort((a, b) => minPrice(b) - minPrice(a));
  }

  return products;
}

export const getProductBySlug = cache(
  async (slug: string): Promise<ProductWithMeta | null> => {
    const supabase = createPublicClient();
    const { data: product } = await supabase
      .from("products")
      .select("*, brand:brands(*)")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (!product) return null;

    const [{ data: images }, { data: offers }, { data: categoryLinks }] =
      await Promise.all([
        supabase
          .from("product_images")
          .select("*")
          .eq("product_id", product.id)
          .order("sort_order", { ascending: true }),
        supabase
          .from("offers_public")
          .select("*")
          .eq("product_id", product.id)
          .order("priority", { ascending: false })
          .order("price", { ascending: true }),
        supabase
          .from("product_categories")
          .select("category:categories(*)")
          .eq("product_id", product.id),
      ]);

    const categories = (categoryLinks ?? [])
      .map((row) => row.category)
      .filter((c): c is Category => Boolean(c));

    return {
      ...(product as ProductWithMeta),
      images: images ?? [],
      offers: offers ?? [],
      categories,
    };
  }
);

export async function searchProducts(searchQuery: string, limit = 20) {
  const supabase = createPublicClient();
  const { data } = await supabase.rpc("search_products", {
    p_query: searchQuery,
    p_limit: limit,
  });
  const products = (data ?? []) as ProductCardData[];
  return attachOffers(products.map((p) => ({ ...p, brand: null, offers: [] })));
}

export async function getRetailersForProducts(
  productIds: string[]
): Promise<Retailer[]> {
  if (productIds.length === 0) return [];
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("offers_public")
    .select("retailer_id, retailer_name, retailer_slug, retailer_logo, retailer_country")
    .in("product_id", productIds);

  const seen = new Map<string, Retailer>();
  (data ?? []).forEach((o) => {
    if (!o.retailer_id || seen.has(o.retailer_id)) return;
    seen.set(o.retailer_id, {
      id: o.retailer_id,
      name: o.retailer_name ?? "",
      slug: o.retailer_slug ?? "",
      logo: o.retailer_logo,
      country: o.retailer_country,
      website: null,
      currency: null,
      active: true,
      description: null,
      created_at: "",
      updated_at: "",
    });
  });
  return Array.from(seen.values());
}

export const getBrandsForActivity = cache(
  async (activitySlug: string): Promise<Brand[]> => {
    const supabase = createPublicClient();
    const activity = await getActivityBySlug(activitySlug);
    if (!activity) return [];
    const { data: rows } = await supabase
      .from("product_activities")
      .select("product_id")
      .eq("activity_id", activity.id);
    const ids = (rows ?? []).map((r) => r.product_id);
    if (ids.length === 0) return [];
    const { data } = await supabase
      .from("products")
      .select("brand:brands(*)")
      .in("id", ids)
      .not("brand_id", "is", null);
    const seen = new Map<string, Brand>();
    (data ?? []).forEach((row) => {
      const brand = row.brand as Brand | null;
      if (brand) seen.set(brand.id, brand);
    });
    return Array.from(seen.values());
  }
);

export const getSiteSetting = cache(
  async <T = unknown>(key: string): Promise<T | null> => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    return (data?.value as T) ?? null;
  }
);
