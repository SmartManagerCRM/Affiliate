"use client";

import { useActionState } from "react";
import { uploadProductImage } from "@/actions/images";
import { Button } from "@/components/ui/Button";

type State = { error: string | null };

export function ImageUploader({ productId }: { productId: string }) {
  const action = uploadProductImage.bind(null, productId);
  const [state, formAction, pending] = useActionState<State, FormData>(
    async (_prev, formData) => action(formData),
    { error: null }
  );

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-2xl border border-dashed border-espresso/20 bg-beige/40 p-4 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label className="mb-1.5 block text-xs font-medium text-espresso/60">Image file</label>
        <input
          type="file"
          name="file"
          accept="image/png,image/jpeg,image/webp,image/avif"
          required
          className="block w-full text-sm text-espresso file:mr-3 file:rounded-full file:border-0 file:bg-espresso file:px-3.5 file:py-1.5 file:text-xs file:font-medium file:text-cream"
        />
      </div>
      <div className="flex-1">
        <label className="mb-1.5 block text-xs font-medium text-espresso/60">Alt text</label>
        <input
          type="text"
          name="alt"
          placeholder="Descriptive alt text"
          className="w-full rounded-lg border border-espresso/15 bg-white px-3 py-2 text-sm focus:border-accent-gold focus:outline-none"
        />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Uploading…" : "Upload"}
      </Button>
      {state.error && <p className="text-sm text-red-600 sm:basis-full">{state.error}</p>}
    </form>
  );
}
