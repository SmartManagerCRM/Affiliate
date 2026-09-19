"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/admin-guard";

const BUCKET = "product-images";

function storagePathFromPublicUrl(url: string) {
  const marker = `/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  return idx === -1 ? null : url.slice(idx + marker.length);
}

export async function uploadProductImage(productId: string, formData: FormData) {
  const { supabase } = await requireAdmin();
  const file = formData.get("file") as File | null;
  const alt = String(formData.get("alt") ?? "").trim() || null;

  if (!file || file.size === 0) {
    return { error: "Choose an image file to upload." };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "Only image files are allowed." };
  }

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${productId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) return { error: uploadError.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const { count } = await supabase
    .from("product_images")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);

  const { error: insertError } = await supabase
    .from("product_images")
    .insert({ product_id: productId, url: publicUrl, alt, sort_order: count ?? 0 });
  if (insertError) return { error: insertError.message };

  const { data: product } = await supabase
    .from("products")
    .select("main_image")
    .eq("id", productId)
    .single();
  if (product && !product.main_image) {
    await supabase.from("products").update({ main_image: publicUrl }).eq("id", productId);
  }

  revalidatePath(`/admin/products/${productId}`);
  return { error: null };
}

export async function deleteProductImage(formData: FormData) {
  const { supabase } = await requireAdmin();
  const imageId = String(formData.get("image_id"));
  const productId = String(formData.get("product_id"));
  const url = String(formData.get("url"));

  const path = storagePathFromPublicUrl(url);
  if (path) await supabase.storage.from(BUCKET).remove([path]);
  await supabase.from("product_images").delete().eq("id", imageId);

  revalidatePath(`/admin/products/${productId}`);
}
