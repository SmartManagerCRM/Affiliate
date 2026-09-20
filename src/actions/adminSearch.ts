"use server";

import { requireAdmin } from "@/lib/supabase/admin-guard";

export type AdminSearchResult = {
  id: string;
  type: "product" | "retailer" | "activity" | "category";
  title: string;
  subtitle?: string;
  href: string;
};

/** Live search across the catalog's own name columns — no fabricated
 * relevance scoring, just a straightforward name match per entity type. */
export async function searchAdmin(query: string): Promise<AdminSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const { supabase } = await requireAdmin();
  const like = `%${q}%`;

  const [products, retailers, activities, categories] = await Promise.all([
    supabase.from("products").select("id, name").ilike("name", like).limit(5),
    supabase.from("retailers").select("id, name").ilike("name", like).limit(5),
    supabase.from("activities").select("id, name").ilike("name", like).limit(5),
    supabase.from("categories").select("id, name").ilike("name", like).limit(5),
  ]);

  const results: AdminSearchResult[] = [];

  (products.data ?? []).forEach((p) =>
    results.push({
      id: p.id,
      type: "product",
      title: p.name,
      href: `/admin/products/${p.id}`,
    })
  );
  (retailers.data ?? []).forEach((r) =>
    results.push({
      id: r.id,
      type: "retailer",
      title: r.name,
      href: `/admin/retailers/${r.id}`,
    })
  );
  (activities.data ?? []).forEach((a) =>
    results.push({
      id: a.id,
      type: "activity",
      title: a.name,
      href: `/admin/activities/${a.id}`,
    })
  );
  (categories.data ?? []).forEach((c) =>
    results.push({
      id: c.id,
      type: "category",
      title: c.name,
      href: `/admin/categories/${c.id}`,
    })
  );

  return results.slice(0, 15);
}
