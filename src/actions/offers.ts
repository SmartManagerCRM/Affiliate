"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/admin-guard";

function readOfferForm(formData: FormData) {
  return {
    product_id: String(formData.get("product_id") ?? ""),
    retailer_id: String(formData.get("retailer_id") ?? ""),
    affiliate_network_id: String(formData.get("affiliate_network_id") ?? "") || null,
    country: String(formData.get("country") ?? "").trim() || null,
    price: Number(formData.get("price") ?? 0),
    original_price: formData.get("original_price")
      ? Number(formData.get("original_price"))
      : null,
    currency: String(formData.get("currency") ?? "").trim().toUpperCase(),
    affiliate_url: String(formData.get("affiliate_url") ?? "").trim(),
    availability: String(formData.get("availability") ?? "in_stock"),
    shipping_info: String(formData.get("shipping_info") ?? "").trim() || null,
    commission_rate: formData.get("commission_rate")
      ? Number(formData.get("commission_rate"))
      : null,
    priority: Number(formData.get("priority") ?? 0),
    active: formData.get("active") === "on",
  };
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export async function createOffer(productId: string, formData: FormData) {
  const { supabase } = await requireAdmin();
  const values = readOfferForm(formData);

  if (!values.retailer_id || !values.currency || !values.price) {
    redirect(`/admin/products/${productId}?error=Retailer, price and currency are required`);
  }
  if (!isValidUrl(values.affiliate_url)) {
    redirect(`/admin/products/${productId}?error=Affiliate URL must be a valid http(s) link`);
  }

  const { error } = await supabase.from("offers").insert({ ...values, product_id: productId });
  if (error) redirect(`/admin/products/${productId}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/offers");
  revalidatePath("/");
  redirect(`/admin/products/${productId}?saved=1`);
}

export async function updateOffer(id: string, productId: string, formData: FormData) {
  const { supabase } = await requireAdmin();
  const values = readOfferForm(formData);

  if (!values.retailer_id || !values.currency || !values.price) {
    redirect(`/admin/products/${productId}?error=Retailer, price and currency are required`);
  }
  if (!isValidUrl(values.affiliate_url)) {
    redirect(`/admin/products/${productId}?error=Affiliate URL must be a valid http(s) link`);
  }

  const { error } = await supabase
    .from("offers")
    .update({ ...values, last_updated: new Date().toISOString() })
    .eq("id", id);
  if (error) redirect(`/admin/products/${productId}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/offers");
  revalidatePath("/");
  redirect(`/admin/products/${productId}?saved=1`);
}

export async function deleteOffer(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  const productId = String(formData.get("product_id"));
  await supabase.from("offers").delete().eq("id", id);
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/offers");
  revalidatePath("/");
}

export async function toggleOfferActive(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  const productId = String(formData.get("product_id"));
  const active = formData.get("active") === "true";
  await supabase.from("offers").update({ active: !active }).eq("id", id);
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/offers");
  revalidatePath("/");
}
