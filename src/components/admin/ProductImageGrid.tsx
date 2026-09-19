import Image from "next/image";
import { deleteProductImage } from "@/actions/images";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import type { ProductImage } from "@/lib/types";

export function ProductImageGrid({
  images,
  productId,
}: {
  images: ProductImage[];
  productId: string;
}) {
  if (images.length === 0) {
    return <p className="text-sm text-espresso/45">No images uploaded yet.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {images.map((image) => (
        <div key={image.id} className="group relative aspect-square overflow-hidden rounded-xl bg-beige">
          <Image src={image.url} alt={image.alt ?? ""} fill sizes="200px" className="object-cover" />
          <form action={deleteProductImage} className="absolute right-1.5 top-1.5">
            <input type="hidden" name="image_id" value={image.id} />
            <input type="hidden" name="product_id" value={productId} />
            <input type="hidden" name="url" value={image.url} />
            <ConfirmSubmitButton
              confirmMessage="Remove this image?"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-espresso/80 text-xs text-cream opacity-0 transition-opacity group-hover:opacity-100"
            >
              ✕
            </ConfirmSubmitButton>
          </form>
        </div>
      ))}
    </div>
  );
}
